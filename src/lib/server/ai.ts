import { createHash } from "node:crypto";
import { z } from "zod";
import type { BabySex, ChipId, FamilyName, NameEntry, NameNote, ParsedProfile, RoundRequest, TextRequirement } from "@/lib/types";
import { chipLabel } from "@/lib/engine/chips";
import { checkText, isLetterFacet, mergeRequirements, normalizeLetters, normalizeThemeRequirement } from "@/lib/engine/requirements";
import { popularity } from "@/lib/names/catalog";
import { commonness } from "@/lib/names/commonness";
import { noPatternsFor, ROUND_SIZE, shortReason, type Candidate } from "@/lib/engine/round";
import { MODELS, structuredCall } from "./llm";
import { log } from "./request-id";
import { asData, asOutput, looksLikeName, OUR_PICK_SYSTEM, PREFERENCES_SYSTEM, ROUND_SYSTEM } from "./prompts";
import { FACETS, LENGTHS, MEANING_CATEGORIES, ORIGINS, POPULARITY, STYLES } from "./schemas";

const ALLOWED_VALUES: Record<TextRequirement["facet"], readonly string[] | null> = {
  meaningCategory: MEANING_CATEGORIES,
  origin: ORIGINS,
  style: STYLES,
  length: LENGTHS,
  starting: null,
  ending: null,
  popularity: POPULARITY,
};

const requirementOutput = z.object({
  label: z.string(),
  kind: z.enum(["want", "avoid"]),
  facet: z.enum(FACETS),
  values: z.array(z.string()),
  level: z.enum(["must", "want"]),
  /** The names whose notes the requirement came from; empty when it came from the free text. */
  fromNotes: z.array(z.string()).default([]),
});

/** The format the model is asked for. */
const preferencesOutput = z.object({
  flagged: z.boolean(),
  summary: z.string(),
  notesSummary: z.string().default(""),
  requirements: z.array(requirementOutput),
});

/**
 * How the answer is read: the model sometimes invents a facet outside the list (issue #2 in the issues repo).
 * Such a requirement is dropped and the rest of the answer is kept, instead of failing the whole parse.
 */
export const preferencesAnswer = preferencesOutput.extend({
  requirements: z.array(z.unknown()).transform((items) =>
    items.flatMap((item) => {
      const parsed = requirementOutput.safeParse(item);
      if (!parsed.success) log.warn("Dropped a free-text requirement the model gave in an unknown shape", JSON.stringify(item).slice(0, 300));
      return parsed.success ? [parsed.data] : [];
    }),
  ),
});

export interface PreferencesInput {
  texts: string[];
  /** Notes on voted names, with the vote. Read together with the name's facts and with each other. */
  nameNotes?: NameNote[];
  namesWeLike: string[];
  family: FamilyName[];
  /** The profile from the last check, already verified. Its reading of earlier notes is kept as it was. */
  previous?: ParsedProfile | null;
}

export type PreferencesResult = { flagged: true } | { flagged: false; profile: ParsedProfile };

const VERDICT_WORDS: Record<NameNote["verdict"], string> = { no: "No", unsure: "Not sure", interesting: "Interesting" };
/** The facet values a note can lead to, checked on the noted name, so the model maps a note only to facts the name has. */
const NOTE_FACETS = ["meaningCategory", "origin", "style", "length", "popularity"] as const;

function facetsOf(entry: NameEntry): string {
  return NOTE_FACETS.map((facet) => {
    const values = (ALLOWED_VALUES[facet] ?? []).filter(
      (value) => checkText({ id: "", label: "", kind: "want", facet, values: [value] }, entry).fit === "met",
    );
    return `${facet}=${values.join("/") || "none"}`;
  }).join(", ");
}

function describeNote(n: NameNote, entry: NameEntry): string {
  const latest = entry.stats.at(-1);
  const count = latest ? `${latest.count} babies in ${latest.year}, rank ${latest.rank}` : "no birth data";
  return `- ${asData(entry.nameHe, 30)} | vote: ${VERDICT_WORDS[n.verdict]} | note: ${asData(n.note, 300)} | meaning: ${asData(entry.meaningHe ?? "", 80)} | ${count} | ${facetsOf(entry)}`;
}

/** A short id for a note as it was read: the same name, vote and text give the same key. */
export const noteKey = (n: NameNote) => createHash("sha256").update(`${n.nameId}|${n.verdict}|${n.note}`).digest("base64url").slice(0, 12);

type NoteOnName = { note: NameNote; entry: NameEntry; key: string };

/**
 * A short id for the wishes, liked names and family as read. A name added from "Taken in our family"
 * (relation "other") is left out: it comes from the name list, so there is nothing new to read in it.
 */
export const wishesKey = (input: PreferencesInput) =>
  createHash("sha256")
    .update(JSON.stringify([input.texts, input.namesWeLike, input.family.filter((f) => f.relation !== "other").map((f) => [f.name, f.relation])]))
    .digest("base64url")
    .slice(0, 12);

const NOTES_OPENING = "מההערות הבנו:";

/** The earlier notes line with the new part added; when too long, the earliest sentences give way. */
function joinNotesSummary(earlier: string, added: string): string {
  const part = asOutput(added.replace(NOTES_OPENING, ""), 300);
  if (!part) return earlier;
  let sentences = earlier.replace(NOTES_OPENING, "").split(/(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean);
  const line = () => [NOTES_OPENING, ...sentences, part].join(" ");
  while (sentences.length && line().length > 300) sentences = sentences.slice(1);
  return asOutput(line(), 300);
}

/**
 * Notes the previous profile already read keep their reading, so a check after the next round does not
 * read the same note differently. Only when every note it read is still there unchanged: after a note was
 * edited or removed, everything is read again.
 */
function earlierReading(notes: NoteOnName[], previous: ParsedProfile | null | undefined) {
  const read = new Set(previous?.notesRead ?? []);
  const keys = new Set(notes.map((n) => n.key));
  if (!previous || !read.size || ![...read].every((k) => keys.has(k))) return null;
  return {
    oldNames: new Set(notes.filter((n) => read.has(n.key)).map((n) => n.entry.nameHe)),
    requirements: previous.requirements.filter((r) => r.fromNotes?.length),
    summary: previous.notesSummary ?? "",
  };
}

/** Checks the free text and family names, then parses the wishes. Flagged input goes no further. */
export async function parsePreferences(input: PreferencesInput, names: NameEntry[] = []): Promise<PreferencesResult | null> {
  const byId = new Map(names.map((n) => [n.id, n]));
  const notes: NoteOnName[] = (input.nameNotes ?? []).flatMap((n) => {
    const entry = byId.get(n.nameId);
    return entry ? [{ note: n, entry, key: noteKey(n) }] : [];
  });
  const notedNames = new Set(notes.map(({ entry }) => entry.nameHe));
  const earlier = earlierReading(notes, input.previous);
  const wishes = wishesKey(input);
  // Only notes were added since the last check: its reading of the wishes is kept, and the model
  // reads just the new notes. A shorter answer is a shorter wait before the next round.
  const notesOnly =
    !!input.previous && input.previous.wishesRead === wishes && notes.length > 0 && (!!earlier || !input.previous.notesRead?.length);
  const isOld = (n: NoteOnName) => !!earlier?.oldNames.has(n.entry.nameHe);
  const list = (items: NoteOnName[]) => items.map(({ note, entry }) => describeNote(note, entry)).join("\n") || "(none)";

  const notesSection = earlier
    ? `Notes on voted names already read (context only, their requirements are kept as they are):
${list(notes.filter(isOld))}

Earlier reading of those notes: ${asData(earlier.summary, 300) || "(none)"}

New notes on voted names (name | vote | note | facts about the name):
${list(notes.filter((n) => !isOld(n)))}`
    : `Notes on voted names (name | vote | note | facts about the name):
${list(notes)}`;

  const onlyNewNotes = notesOnly
    ? `
The wishes, names and family below were already read, and their requirements are kept: they are context only. Read only the new notes on voted names: return requirements only for them, each with fromNotes. Leave summary empty. In notesSummary write only what the new notes led to, without the opening words "${NOTES_OPENING}": it is added to the earlier reading.
`
    : "";

  const prompt = `${onlyNewNotes}<parent_input>
Wishes and notes:
${input.texts.map((t) => `- ${asData(t)}`).join("\n") || "(none)"}

${notesSection}

Names we like (style references):
${input.namesWeLike.map((n) => asData(n, 60)).join(", ") || "(none)"}

Family names (check these too):
${input.family.map((f) => asData(f.name, 60)).join(", ") || "(none)"}
</parent_input>`;

  const output = await structuredCall({
    model: MODELS.parse,
    system: PREFERENCES_SYSTEM,
    prompt,
    schema: preferencesAnswer,
    format: preferencesOutput,
    maxTokens: 2000,
  });
  if (!output) return null;
  if (output.flagged) return { flagged: true };

  const cleaned = output.requirements.map(normalizeThemeRequirement).flatMap((r) => {
    const { fromNotes: given, ...rest } = r;
    const allowed = ALLOWED_VALUES[r.facet];
    const values = isLetterFacet(r.facet)
      ? [...new Set(r.values.map(normalizeLetters).filter(Boolean))]
      : r.values.filter((v) => !allowed || allowed.includes(v)).map((v) => asData(v, 20));
    const fromNotes = [...new Set((given ?? []).map((n) => n.trim()).filter((n) => notedNames.has(n)))];
    if (!values.length) return [];
    // A reading of only earlier notes is not taken again: their earlier requirements stand.
    if (earlier && fromNotes.length && fromNotes.every((n) => earlier.oldNames.has(n))) return [];
    return [{ ...rest, label: asOutput(r.label, 120), values: values.slice(0, 12), ...(fromNotes.length ? { fromNotes: fromNotes.slice(0, 8) } : {}) }];
  });
  const fromWishes = notesOnly
    ? input.previous!.requirements.filter((r) => !r.fromNotes?.length).map(({ id: _, ...r }) => r)
    : cleaned.filter((r) => !r.fromNotes);
  const kept = (earlier?.requirements ?? []).map(({ id: _, ...r }) => r);
  const requirements = mergeRequirements([...fromWishes, ...kept, ...cleaned.filter((r) => r.fromNotes)])
    .slice(0, 20)
    .map((r, i) => ({ ...r, id: `text-${i}` }));

  const notesSummary = !notes.length
    ? ""
    : notesOnly
      ? joinNotesSummary(earlier?.summary ?? "", output.notesSummary)
      : asOutput(output.notesSummary, 300);
  const notesRead = notes.map((n) => n.key).slice(-60);
  return {
    flagged: false,
    profile: {
      summary: notesOnly ? input.previous!.summary : asOutput(output.summary, 300),
      requirements,
      ...(notesSummary ? { notesSummary } : {}),
      ...(notesRead.length ? { notesRead } : {}),
      wishesRead: wishes,
    },
  };
}

const roundOutput = z.object({
  picks: z.array(z.object({ id: z.number().int(), reason: z.string() })),
});

function describeCandidate(c: Candidate): string {
  const { latest, trend } = popularity(c.entry);
  const fits = c.evaluation.lines.map((l) => `${asData(l.requirement, 120)}: ${l.fit}`).join("; ");
  return `id=${c.entry.id} | ${c.evaluation.spelling} | ${c.sex} | meaning: ${c.entry.meaningHe} | origin: ${c.entry.origin} | themes: ${c.entry.tags.meaningCategories.join(", ") || "none"} | style: ${c.entry.tags.style} | popularity: ${commonness(c.entry)} (rank ${latest.rank} in ${latest.year}, ${trend}) | ${fits || "no requirements"}`;
}

function sexInstruction(babySex: BabySex, noUnisex: boolean): string {
  if (babySex === "boy") return "The baby is a boy.";
  if (babySex === "girl") return "The baby is a girl.";
  return noUnisex
    ? "The baby's sex is not known yet: pick at least one boy name and one girl name. The parent asked for no unisex names."
    : "The baby's sex is not known yet: pick at least one boy name, one girl name and one unisex name; the fourth name may be of any sex.";
}

/** Lets the model choose among the ranked candidates. Ids outside the list are dropped. */
export async function pickWithModel(
  candidates: Candidate[],
  req: RoundRequest,
  names: NameEntry[],
  size = ROUND_SIZE,
): Promise<Map<number, string> | null> {
  const nameById = new Map(names.map((n) => [n.id, n.nameHe]));
  const ratedNames = req.ratings
    .filter((r) => r.verdict !== "taken")
    .map((r) => `${nameById.get(r.nameId) ?? r.nameId}: ${r.verdict}`);
  const patterns = noPatternsFor(names, req).map((p) => `${p.label} (${p.count} names)`);

  const chips = Object.entries(req.chips).map(([id, level]) => `${chipLabel(id as ChipId)} (${level})`);
  const prompt = `${sexInstruction(req.babySex, !!req.chips.noUnisex)}
Pick ${size} names.

Parent's chips: ${chips.join(", ") || "none"}
<parent_input>
Parent's free-text wishes as understood: ${req.profile ? asData(req.profile.summary, 300) : "none"}
Sibling names: ${req.family.filter((f) => f.relation === "sibling" && looksLikeName(f.name)).map((f) => asData(f.name, 60)).join(", ") || "none"}
</parent_input>
Verdicts so far: ${ratedNames.join(", ") || "none"}
What the No names have in common, and no Interesting name has: ${patterns.join(", ") || "nothing yet"}

Candidates, best first by our ranking:
${candidates.map(describeCandidate).join("\n")}`;

  const output = await structuredCall({ model: MODELS.pick, system: ROUND_SYSTEM, prompt, schema: roundOutput, maxTokens: 4000 });
  if (!output) return null;
  const candidateIds = new Set(candidates.map((c) => c.entry.id));
  const valid = output.picks.filter((p) => candidateIds.has(p.id)).slice(0, size);
  return new Map(valid.map((p) => [p.id, shortReason(asOutput(p.reason, 200))]));
}

const ourPickOutput = z.object({ reason: z.string() });

export async function ourPickReason(c: Candidate): Promise<string | null> {
  const prompt = `The name: ${describeCandidate(c)}
Biblical source: ${c.entry.biblicalRef ?? "none"}`;
  const output = await structuredCall({ model: MODELS.pick, system: OUR_PICK_SYSTEM, prompt, schema: ourPickOutput, maxTokens: 2000 });
  return output ? asOutput(output.reason, 500) : null;
}
