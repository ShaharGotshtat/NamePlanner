import { z } from "zod";
import type { BabySex, ChipId, FamilyName, NameEntry, ParsedProfile, RoundRequest, TextRequirement } from "@/lib/types";
import { chipLabel } from "@/lib/engine/chips";
import { normalizeThemeRequirement } from "@/lib/engine/requirements";
import { popularity } from "@/lib/names/catalog";
import { ROUND_SIZE, type Candidate } from "@/lib/engine/round";
import { MODELS, structuredCall } from "./llm";
import { OUR_PICK_SYSTEM, PREFERENCES_SYSTEM, ROUND_SYSTEM } from "./prompts";
import { FACETS, LENGTHS, MEANING_CATEGORIES, ORIGINS, STYLES } from "./schemas";

const ALLOWED_VALUES: Record<TextRequirement["facet"], readonly string[] | null> = {
  meaningCategory: MEANING_CATEGORIES,
  origin: ORIGINS,
  style: STYLES,
  length: LENGTHS,
  ending: null,
};

const preferencesOutput = z.object({
  flagged: z.boolean(),
  summary: z.string(),
  requirements: z.array(
    z.object({
      label: z.string(),
      kind: z.enum(["want", "avoid"]),
      facet: z.enum(FACETS),
      values: z.array(z.string()),
    }),
  ),
});

export interface PreferencesInput {
  texts: string[];
  namesWeLike: string[];
  family: FamilyName[];
}

export type PreferencesResult = { flagged: true } | { flagged: false; profile: ParsedProfile };

/** Checks the free text and family names, then parses the wishes. Flagged input goes no further. */
export async function parsePreferences(input: PreferencesInput): Promise<PreferencesResult | null> {
  const prompt = `<parent_input>
Wishes and notes:
${input.texts.map((t) => `- ${t}`).join("\n") || "(none)"}

Names we like (style references):
${input.namesWeLike.join(", ") || "(none)"}

Family names (check these too):
${input.family.map((f) => f.name).join(", ") || "(none)"}
</parent_input>`;

  const output = await structuredCall({
    model: MODELS.parse,
    system: PREFERENCES_SYSTEM,
    prompt,
    schema: preferencesOutput,
    maxTokens: 2000,
  });
  if (!output) return null;
  if (output.flagged) return { flagged: true };

  const requirements = output.requirements
    .map(normalizeThemeRequirement)
    .map((r, i) => {
      const allowed = ALLOWED_VALUES[r.facet];
      const values = r.values.filter((v) => !allowed || allowed.includes(v)).slice(0, 12);
      return { ...r, id: `text-${i}`, label: r.label.slice(0, 120), values };
    })
    .filter((r) => r.values.length > 0)
    .slice(0, 20);

  return { flagged: false, profile: { summary: output.summary.slice(0, 300), requirements } };
}

const roundOutput = z.object({
  picks: z.array(z.object({ id: z.number().int(), reason: z.string() })),
});

function describeCandidate(c: Candidate): string {
  const { latest, trend } = popularity(c.entry);
  const fits = c.evaluation.lines.map((l) => `${l.requirement}: ${l.fit}`).join("; ");
  return `id=${c.entry.id} | ${c.entry.nameHe} | ${c.sex} | meaning: ${c.entry.meaningHe} | origin: ${c.entry.origin} | themes: ${c.entry.tags.meaningCategories.join(", ") || "none"} | style: ${c.entry.tags.style} | rank ${latest.rank} in ${latest.year}, ${trend} | ${fits || "no requirements"}`;
}

const SEX_INSTRUCTION: Record<BabySex, string> = {
  boy: "The baby is a boy.",
  girl: "The baby is a girl.",
  unknown: "The baby's sex is not known yet: pick exactly one boy name, one girl name and one unisex name.",
};

/** Lets the model choose among the ranked candidates. Ids outside the list are dropped. */
export async function pickWithModel(
  candidates: Candidate[],
  req: RoundRequest,
  names: NameEntry[],
): Promise<Map<number, string> | null> {
  const nameById = new Map(names.map((n) => [n.id, n.nameHe]));
  const ratedNames = req.ratings
    .filter((r) => r.verdict !== "taken")
    .map((r) => `${nameById.get(r.nameId) ?? r.nameId}: ${r.verdict}`);

  const chips = Object.entries(req.chips).map(([id, level]) => `${chipLabel(id as ChipId)} (${level})`);
  const prompt = `${SEX_INSTRUCTION[req.babySex]}
Pick ${ROUND_SIZE} names.

Parent's chips: ${chips.join(", ") || "none"}
Parent's free-text wishes as understood: ${req.profile?.summary ?? "none"}
Sibling names: ${req.family.filter((f) => f.relation === "sibling").map((f) => f.name).join(", ") || "none"}
Verdicts so far: ${ratedNames.join(", ") || "none"}

Candidates, best first by our ranking:
${candidates.map(describeCandidate).join("\n")}`;

  const output = await structuredCall({ model: MODELS.pick, system: ROUND_SYSTEM, prompt, schema: roundOutput, maxTokens: 4000 });
  if (!output) return null;
  const candidateIds = new Set(candidates.map((c) => c.entry.id));
  const valid = output.picks.filter((p) => candidateIds.has(p.id)).slice(0, ROUND_SIZE);
  return new Map(valid.map((p) => [p.id, p.reason.slice(0, 200)]));
}

const ourPickOutput = z.object({ reason: z.string() });

export async function ourPickReason(c: Candidate): Promise<string | null> {
  const prompt = `The name: ${describeCandidate(c)}
Biblical source: ${c.entry.biblicalRef ?? "none"}`;
  const output = await structuredCall({ model: MODELS.pick, system: OUR_PICK_SYSTEM, prompt, schema: ourPickOutput, maxTokens: 2000 });
  return output?.reason.slice(0, 500) ?? null;
}
