import { describe, expect, it, vi } from "vitest";
import { pickDiverse, rankCandidates, roundSizeFor, toSuggestion } from "@/lib/engine/round";
import { normalizeLetters } from "@/lib/engine/requirements";
import { normalizeHebrew } from "@/lib/names/features";
import type { NameEntry, ParsedProfile, TextRequirement } from "@/lib/types";
import { byName, names, request } from "./fixtures";

vi.mock("@/lib/server/llm", () => ({ MODELS: { parse: "m", pick: "m" }, structuredCall: vi.fn() }));
const { structuredCall } = await import("@/lib/server/llm");
const { parsePreferences } = await import("@/lib/server/ai");

const letters = (
  facet: "starting" | "ending",
  values: string[],
  kind: "want" | "avoid" = "want",
  level: "must" | "want" = "must",
): ParsedProfile => ({
  summary: "הבנו",
  requirements: [{ id: "t", label: "אותיות", kind, facet, values, level } as TextRequirement],
});

/** Sample names plus ones the sample lacks: a ס name, a ג׳ name and one that ends in a final letter. */
const extra = (id: number, nameHe: string): NameEntry => ({ ...byName("נועה"), id, nameHe });
const tom: NameEntry = { ...extra(9005, "תום"), variants: ["טום"] };
const pool = [...names, extra(9001, "סתיו"), extra(9002, "ג׳וליה"), extra(9003, "גלי"), extra(9004, "שני"), tom];

const shown = (profile: ParsedProfile, babySex: "girl" | "boy" | "unknown" = "girl") =>
  rankCandidates(pool, request({ babySex, profile })).map((c) => c.entry.nameHe);

describe("strict letter wishes are hard filters", () => {
  it("shows only names starting with one of the letters", () => {
    for (const sex of ["girl", "boy", "unknown"] as const) {
      const out = shown(letters("starting", ["נ", "ס"]), sex);
      expect(out.length).toBeGreaterThan(0);
      for (const n of out) expect(["נ", "ס"]).toContain(n[0]);
    }
    expect(shown(letters("starting", ["נ", "ס"]))).toContain("סתיו");
  });

  it("shows fewer names, never off-letter ones, when too few match", () => {
    const ranked = rankCandidates(pool, request({ babySex: "unknown", profile: letters("starting", ["ס"]) }));
    expect(ranked.map((c) => c.entry.nameHe)).toEqual(["סתיו"]);
    expect(pickDiverse(ranked, "unknown").map((c) => c.entry.nameHe)).toEqual(["סתיו"]);
    expect(shown(letters("starting", ["ץ"]))).toEqual([]);
  });

  it("folds final letters on both sides", () => {
    const out = shown(letters("ending", ["ן"]), "boy");
    expect(out).toContain("מתן");
    for (const n of out) expect(normalizeHebrew(n).at(-1)).toBe("נ");
  });

  it("lets a plain ג cover ג׳, and ג׳ only ג׳ names", () => {
    expect(shown(letters("starting", ["ג"]))).toEqual(expect.arrayContaining(["גלי", "ג׳וליה"]));
    expect(shown(letters("starting", ["ג׳"]))).toEqual(["ג׳וליה"]);
  });

  it("matches another spelling and shows it", () => {
    const ranked = rankCandidates(pool, request({ profile: letters("starting", ["ט"]) }));
    const tomCandidate = ranked.find((c) => c.entry.id === tom.id)!;
    expect(tomCandidate.evaluation.spelling).toBe("טום");
    expect(toSuggestion(tomCandidate, "").name.nameHe).toBe("טום");
    const plain = rankCandidates(pool, request({ profile: letters("starting", ["ת"]) })).find((c) => c.entry.id === tom.id)!;
    expect(toSuggestion(plain, "").name.nameHe).toBe("תום");
    expect(toSuggestion(plain, "").name.niqqud).toBe(tom.niqqud);
  });

  it("drops names with the letter for an avoid wish", () => {
    const out = shown(letters("starting", ["נ"], "avoid"));
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((n) => n.startsWith("נ"))).toBe(false);
  });

  it("keeps a strict wish as a Must explanation line, not a scored want", () => {
    const [top] = rankCandidates(pool, request({ profile: letters("starting", ["נ"]) }));
    expect(top.evaluation.lines).toContainEqual({ requirement: "אותיות (חובה)", fit: "met", detail: "מתאים" });
    expect(top.evaluation.wantsTotal).toBe(0);
  });
});

describe("preferred wishes only add to the score", () => {
  it("ranks matching names first and keeps the rest", () => {
    const out = shown(letters("starting", ["נ"], "want", "want"));
    expect(out[0].startsWith("נ")).toBe(true);
    expect(out.some((n) => !n.startsWith("נ"))).toBe(true);
  });

  it("applies to any facet, not only letters", () => {
    const nature = (level: "must" | "want"): ParsedProfile => ({
      summary: "הבנו",
      requirements: [{ id: "t", label: "טבע", kind: "want", facet: "meaningCategory", values: ["nature"], level }],
    });
    const strict = rankCandidates(names, request({ profile: nature("must") }));
    expect(strict.every((c) => c.entry.tags.meaningCategories.includes("nature"))).toBe(true);
    expect(strict[0].evaluation.wantsTotal).toBe(0);
    const [loose] = rankCandidates(names, request({ profile: nature("want") }));
    expect(loose.evaluation.wantsTotal).toBe(1);
    expect(loose.evaluation.lines).toContainEqual({ requirement: "טבע", fit: "met", detail: "מתאים" });
  });
});

describe("round size", () => {
  it("is 4 when the Musts leave at least 12 names", () => {
    expect(roundSizeFor(pool, request({ babySex: "unknown" }))).toBe(4);
  });

  it("spreads fewer than 12 names over the 3 rounds", () => {
    const req = request({ babySex: "unknown", profile: letters("starting", ["נ", "ס"]) });
    const count = rankCandidates(pool, req).length;
    expect(count).toBeLessThan(12);
    expect(roundSizeFor(pool, req)).toBe(Math.ceil(count / 3));
    expect(pickDiverse(rankCandidates(pool, req), "unknown", roundSizeFor(pool, req))).toHaveLength(Math.ceil(count / 3));
  });

  it("does not shrink as names get shown", () => {
    const req = request({ babySex: "unknown", profile: letters("starting", ["נ", "ס"]) });
    const shownIds = rankCandidates(pool, req).slice(0, 3).map((c) => c.entry.id);
    expect(roundSizeFor(pool, { ...req, shownIds })).toBe(roundSizeFor(pool, req));
  });
});

describe("normalizeLetters", () => {
  it("cleans the ways a letter gets written", () => {
    expect(normalizeLetters("נ׳")).toBe("נ");
    expect(normalizeLetters("ב-ס")).toBe("בס");
    expect(normalizeLetters("'ס'")).toBe("ס");
    expect(normalizeLetters("ן")).toBe("נ");
    expect(normalizeLetters("ג'")).toBe("ג׳");
    expect(normalizeLetters("צ’")).toBe("צ׳");
    expect(normalizeLetters("N")).toBe("");
  });
});

describe("parsing a letter wish", () => {
  it("keeps clean letter values and drops values with no Hebrew letter", async () => {
    vi.mocked(structuredCall).mockResolvedValueOnce({
      flagged: false,
      summary: "הבנו: שמות שמתחילים ב-נ או ב-ס",
      requirements: [
        { label: "מתחיל ב-נ או ס", kind: "want", facet: "starting", values: ["נ׳", "ס", "ס׳", "x"], level: "must" },
        { label: "סיומת", kind: "want", facet: "ending", values: ["?"], level: "want" },
      ],
    });
    const result = await parsePreferences({ texts: ["שמות שמתחילים רק ב-נ׳ או ס׳"], namesWeLike: [], family: [] });
    expect(result).toEqual({
      flagged: false,
      profile: {
        summary: "הבנו: שמות שמתחילים ב-נ או ב-ס",
        requirements: [{ id: "text-0", label: "מתחיל ב-נ או ס", kind: "want", facet: "starting", values: ["נ", "ס"], level: "must" }],
      },
    });
  });
});
