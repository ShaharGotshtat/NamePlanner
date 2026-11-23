import { describe, expect, it, vi } from "vitest";
import { evaluate, matchContext, mergeRequirements, requirementLabel } from "@/lib/engine/requirements";
import { signProfile, verifiedProfile } from "@/lib/server/token";
import type { NameEntry, NameNote, ParsedProfile, TextRequirement } from "@/lib/types";
import { byName, names, request } from "./fixtures";

vi.mock("@/lib/server/llm", () => ({ MODELS: { parse: "m", pick: "m" }, structuredCall: vi.fn() }));
const { structuredCall } = await import("@/lib/server/llm");
const { noteKey, parsePreferences } = await import("@/lib/server/ai");

/** A name almost nobody got, like לירם with no babies in 2024. */
const rare: NameEntry = {
  ...byName("נועה"),
  id: 9001,
  nameHe: "לירם",
  meaningHe: "",
  stats: [{ year: 2024, count: 3, rank: 900 }],
};
const common = byName("נועה");
const catalog = [...names, rare];

const answer = (requirements: object[], notesSummary = "") => ({ flagged: false, summary: "הבנו: מעט", notesSummary, requirements });
const parse = (nameNotes: NameNote[], texts: string[] = []) =>
  parsePreferences({ texts, nameNotes, namesWeLike: [], family: [] }, catalog);

describe("notes on voted names", () => {
  it("reach the model with the vote and the name's facts", async () => {
    vi.mocked(structuredCall).mockResolvedValueOnce(answer([]));
    await parse([{ nameId: rare.id, verdict: "no", note: "זה שם מומצא" }]);
    const prompt = vi.mocked(structuredCall).mock.calls.at(-1)![0].prompt;
    expect(prompt).toContain("לירם | vote: No | note: זה שם מומצא");
    expect(prompt).toContain("3 babies in 2024, rank 900");
    expect(prompt).toContain("popularity=rare/veryRare");
  });

  it("keep the direction the model read from the note, whatever the vote", async () => {
    vi.mocked(structuredCall).mockResolvedValueOnce(
      answer([{ label: "שמות שקשורים לטבע", kind: "avoid", facet: "meaningCategory", values: ["nature"], level: "want", fromNotes: ["נועה"] }]),
    );
    const result = await parse([{ nameId: common.id, verdict: "interesting", note: "למרות שבדרך כלל לא אוהבת שמות של טבע" }]);
    expect(result).toMatchObject({ profile: { requirements: [{ kind: "avoid", values: ["nature"], fromNotes: ["נועה"] }] } });
  });

  it("drop note names that were not noted", async () => {
    vi.mocked(structuredCall).mockResolvedValueOnce(
      answer([{ label: "שמות נדירים מאוד", kind: "avoid", facet: "popularity", values: ["veryRare"], level: "want", fromNotes: ["לירם", "יוסי"] }]),
    );
    const result = await parse([{ nameId: rare.id, verdict: "no", note: "זה שם מומצא" }]);
    expect((result as { profile: ParsedProfile }).profile.requirements[0].fromNotes).toEqual(["לירם"]);
  });

  it("become one requirement when two notes say the same thing", async () => {
    const dagan = { ...rare, id: 9002, nameHe: "דגן" };
    catalog.push(dagan);
    vi.mocked(structuredCall).mockResolvedValueOnce(
      answer(
        [
          { label: "שם שנשמע מומצא", kind: "avoid", facet: "popularity", values: ["veryRare"], level: "want", fromNotes: ["לירם"] },
          { label: "שם שנשמע כמו המצאה", kind: "avoid", facet: "popularity", values: ["veryRare"], level: "want", fromNotes: ["דגן", "שם שלא דורג"] },
        ],
        "מההערות הבנו: בלי שמות נדירים מאוד (לירם, דגן).",
      ),
    );
    const result = await parse([
      { nameId: rare.id, verdict: "no", note: "זה שם מומצא" },
      { nameId: dagan.id, verdict: "no", note: "נשמע כמו המצאה" },
    ]);
    expect(result).toEqual({
      flagged: false,
      profile: {
        summary: "הבנו: מעט",
        notesSummary: "מההערות הבנו: בלי שמות נדירים מאוד (לירם, דגן).",
        notesRead: [expect.any(String), expect.any(String)],
        requirements: [
          { id: "text-0", label: "שם שנשמע מומצא", kind: "avoid", facet: "popularity", values: ["veryRare"], level: "want", fromNotes: ["לירם", "דגן"] },
        ],
      },
    });
  });
});

describe("notes read in an earlier check", () => {
  const rareNote: NameNote = { nameId: rare.id, verdict: "no", note: "זה שם מומצא" };
  const commonNote: NameNote = { nameId: common.id, verdict: "no", note: "פופולרי מדי" };
  const previous: ParsedProfile = {
    summary: "",
    notesSummary: "מההערות הבנו: בלי שמות נדירים מאוד (לירם).",
    notesRead: [noteKey(rareNote)],
    requirements: [{ id: "text-0", label: "שמות נדירים מאוד", kind: "avoid", facet: "popularity", values: ["veryRare"], level: "want", fromNotes: ["לירם"] }],
  };
  const withPrevious = (nameNotes: NameNote[]) => parsePreferences({ texts: [], nameNotes, namesWeLike: [], family: [], previous }, catalog);

  it("keep their reading, and only the new notes are read", async () => {
    vi.mocked(structuredCall).mockResolvedValueOnce(
      answer([
        // The model reads the earlier note again, differently: ignored.
        { label: "שמות מודרניים", kind: "avoid", facet: "style", values: ["modern"], level: "want", fromNotes: ["לירם"] },
        { label: "שמות נפוצים", kind: "avoid", facet: "popularity", values: ["common"], level: "want", fromNotes: ["נועה"] },
      ]),
    );
    const result = await withPrevious([rareNote, commonNote]);
    const prompt = vi.mocked(structuredCall).mock.calls.at(-1)![0].prompt;
    expect(prompt).toMatch(/already read[^]*לירם \| vote: No[^]*Earlier reading[^]*New notes[^]*נועה \| vote: No/);
    expect((result as { profile: ParsedProfile }).profile.requirements.map((r) => [r.values[0], r.fromNotes])).toEqual([
      ["veryRare", ["לירם"]],
      ["common", ["נועה"]],
    ]);
    expect((result as { profile: ParsedProfile }).profile.notesRead).toEqual([noteKey(rareNote), noteKey(commonNote)]);
  });

  it("are all read again once one of them was edited", async () => {
    vi.mocked(structuredCall).mockResolvedValueOnce(
      answer([{ label: "שמות מודרניים", kind: "avoid", facet: "style", values: ["modern"], level: "want", fromNotes: ["לירם"] }]),
    );
    const result = await withPrevious([{ ...rareNote, note: "לא אוהבת את הצליל" }]);
    expect(vi.mocked(structuredCall).mock.calls.at(-1)![0].prompt).not.toContain("already read");
    expect((result as { profile: ParsedProfile }).profile.requirements.map((r) => r.values[0])).toEqual(["modern"]);
  });
});

describe("merging requirements", () => {
  const fromText: Omit<TextRequirement, "id"> = { label: "שמות נדירים מאוד", kind: "avoid", facet: "popularity", values: ["veryRare"], level: "want" };
  const fromNote = { ...fromText, label: "שם מומצא", fromNotes: ["לירם"] };

  it("keeps a free-text line as one, with the stricter level", () => {
    expect(mergeRequirements([fromNote, { ...fromText, level: "must" }])).toEqual([{ ...fromText, level: "must" }]);
  });

  it("keeps a want and an avoid of the same thing apart", () => {
    expect(mergeRequirements([fromText, { ...fromText, kind: "want" }])).toHaveLength(2);
  });
});

describe("how a requirement reads on the card", () => {
  const base: TextRequirement = { id: "text-0", label: "שמות נדירים מאוד", kind: "avoid", facet: "popularity", values: ["veryRare"] };

  it("says an avoid is an avoid, once", () => {
    expect(requirementLabel(base)).toBe("בלי שמות נדירים מאוד");
    expect(requirementLabel({ ...base, label: "בלי שמות תנכיים" })).toBe("בלי שמות תנכיים");
    expect(requirementLabel({ ...base, kind: "want", label: "שם קצר" })).toBe("שם קצר");
  });

  it("names the notes it came from, and marks a must", () => {
    expect(requirementLabel({ ...base, fromNotes: ["לירם"] })).toBe("בלי שמות נדירים מאוד (מההערה על לירם)");
    expect(requirementLabel({ ...base, fromNotes: ["לירם", "דגן", "גל"], level: "must" })).toBe(
      "בלי שמות נדירים מאוד (מההערות על לירם, דגן ועוד) (חובה)",
    );
  });

  it("is what the card shows", () => {
    const profile: ParsedProfile = { summary: "", requirements: [{ ...base, fromNotes: ["לירם"] }] };
    const { lines } = evaluate(common, request({ profile }), matchContext(request()));
    expect(lines).toContainEqual({ requirement: "בלי שמות נדירים מאוד (מההערה על לירם)", fit: "met", detail: "מתאים" });
  });
});

describe("the signed profile", () => {
  it("covers the note fields, and still accepts profiles signed before them", () => {
    const profile: ParsedProfile = {
      summary: "הבנו",
      notesSummary: "מההערות הבנו: בלי שמות נדירים מאוד",
      notesRead: ["abc"],
      requirements: [{ id: "text-0", label: "שמות נדירים מאוד", kind: "avoid", facet: "popularity", values: ["veryRare"], fromNotes: ["לירם"] }],
    };
    const signed = JSON.parse(JSON.stringify(signProfile(profile)));
    expect(verifiedProfile(signed)).toEqual(signed);
    expect(verifiedProfile({ ...signed, notesSummary: "אחר" })).toBeNull();
    expect(verifiedProfile({ ...signed, notesRead: ["xyz"] })).toBeNull();
    expect(verifiedProfile({ ...signed, requirements: [{ ...signed.requirements[0], fromNotes: ["נועה"] }] })).toBeNull();

    const old = signProfile({ summary: "הבנו", requirements: [{ ...profile.requirements[0], fromNotes: undefined }] });
    expect(verifiedProfile(JSON.parse(JSON.stringify(old)))).not.toBeNull();
  });
});
