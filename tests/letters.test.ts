import { describe, expect, it, vi } from "vitest";
import { pickDiverse, rankCandidates } from "@/lib/engine/round";
import { normalizeLetters } from "@/lib/engine/requirements";
import { normalizeHebrew } from "@/lib/names/features";
import type { NameEntry, ParsedProfile, TextRequirement } from "@/lib/types";
import { byName, names, request } from "./fixtures";

vi.mock("@/lib/server/llm", () => ({ MODELS: { parse: "m", pick: "m" }, structuredCall: vi.fn() }));
const { structuredCall } = await import("@/lib/server/llm");
const { parsePreferences } = await import("@/lib/server/ai");

const letters = (facet: "starting" | "ending", values: string[], kind: "want" | "avoid" = "want"): ParsedProfile => ({
  summary: "הבנו",
  requirements: [{ id: "t", label: "אותיות", kind, facet, values } as TextRequirement],
});

/** Sample names plus ones the sample lacks: a ס name, a ג׳ name and one that ends in a final letter. */
const extra = (id: number, nameHe: string): NameEntry => ({ ...byName("נועה"), id, nameHe });
const pool = [...names, extra(9001, "סתיו"), extra(9002, "ג׳וליה"), extra(9003, "גלי"), extra(9004, "שני")];

const shown = (profile: ParsedProfile, babySex: "girl" | "boy" | "unknown" = "girl") =>
  rankCandidates(pool, request({ babySex, profile })).map((c) => c.entry.nameHe);

describe("letter wishes are hard filters", () => {
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

  it("treats ג׳ as its own letter", () => {
    expect(shown(letters("starting", ["ג"]))).toContain("גלי");
    expect(shown(letters("starting", ["ג"]))).not.toContain("ג׳וליה");
    expect(shown(letters("starting", ["ג׳"]))).toEqual(["ג׳וליה"]);
  });

  it("drops names with the letter for an avoid wish", () => {
    const out = shown(letters("starting", ["נ"], "avoid"));
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((n) => n.startsWith("נ"))).toBe(false);
  });

  it("keeps the letter wish as an explanation line, not a scored want", () => {
    const [top] = rankCandidates(pool, request({ profile: letters("starting", ["נ"]) }));
    expect(top.evaluation.lines).toContainEqual({ requirement: "אותיות", fit: "met", detail: "מתאים" });
    expect(top.evaluation.wantsTotal).toBe(0);
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
        { label: "מתחיל ב-נ או ס", kind: "want", facet: "starting", values: ["נ׳", "ס", "ס׳", "x"] },
        { label: "סיומת", kind: "want", facet: "ending", values: ["?"] },
      ],
    });
    const result = await parsePreferences({ texts: ["שמות שמתחילים רק ב-נ׳ או ס׳"], namesWeLike: [], family: [] });
    expect(result).toEqual({
      flagged: false,
      profile: {
        summary: "הבנו: שמות שמתחילים ב-נ או ב-ס",
        requirements: [{ id: "text-0", label: "מתחיל ב-נ או ס", kind: "want", facet: "starting", values: ["נ", "ס"] }],
      },
    });
  });
});
