import { describe, expect, it } from "vitest";
import { chooseOurPick, pickDiverse, rankCandidates } from "@/lib/engine/round";
import { nameSex } from "@/lib/names/catalog";
import { byName, names, request } from "./fixtures";

describe("rankCandidates", () => {
  it("never suggests a close family name, a shown name, or a name of the wrong sex", () => {
    const req = request({
      babySex: "boy",
      family: [{ name: "דוד", relation: "grandparent" }],
      shownIds: [byName("יוסף").id],
    });
    const ids = rankCandidates(names, req).map((c) => c.entry.nameHe);
    expect(ids).not.toContain("דוד");
    expect(ids).not.toContain("יוסף");
    expect(ids).not.toContain("תמר");
  });

  it("never suggests a name declined in an earlier search, even under a new id", () => {
    const ids = rankCandidates(names, request({ babySex: "girl", declined: ["תמר"] })).map((c) => c.entry.nameHe);
    expect(ids).not.toContain("תמר");
  });

  it("drops every name that misses a Must chip", () => {
    const ranked = rankCandidates(names, request({ chips: { notTop20: "must", englishFriendly: "must" } }));
    expect(ranked.length).toBeGreaterThan(0);
    for (const c of ranked) {
      expect(c.entry.tags.englishFriendly).toBe(true);
      expect(c.entry.stats.slice(-2).every((s) => s.rank > 20)).toBe(true);
    }
  });

  it("explains each requirement with met, partly or not met", () => {
    const [top] = rankCandidates(names, request({ chips: { unisex: "want", grandparentFriendly: "want" } }));
    expect(top.evaluation.lines.map((l) => l.requirement)).toEqual(["יוניסקס", "יתקבל יפה אצל סבא וסבתא"]);
  });

  it("checks free-text requirements against the name data", () => {
    const profile = {
      summary: "הבנו: משמעות שקשורה לטבע",
      requirements: [{ id: "t1", label: "משמעות מהטבע", kind: "want" as const, facet: "meaningCategory" as const, values: ["nature"] }],
    };
    const ranked = rankCandidates(names, request({ profile }));
    expect(ranked.every((c) => c.entry.tags.meaningCategories.includes("nature"))).toBe(true);
  });

  it("pushes names like a No down and names like an Interesting up", () => {
    const base = rankCandidates(names, request()).map((c) => c.entry.nameHe);
    const liked = byName("אלה");
    const after = rankCandidates(names, request({ ratings: [{ nameId: liked.id, verdict: "interesting" }], shownIds: [liked.id] }));
    const top = after[0];
    expect(top.likedMatch).toBe("אלה");
    expect(base.indexOf(top.entry.nameHe)).toBeGreaterThan(0);
  });
});

describe("pickDiverse", () => {
  it("mixes one boy, one girl and one unisex name when the sex is not known", () => {
    const picked = pickDiverse(rankCandidates(names, request({ babySex: "unknown" })), "unknown");
    expect(picked.map((c) => nameSex(c.entry)).sort()).toEqual(["boy", "girl", "unisex"]);
  });

  it("returns three different names", () => {
    const picked = pickDiverse(rankCandidates(names, request()), "girl");
    expect(new Set(picked.map((c) => c.entry.id)).size).toBe(3);
  });
});

describe("chooseOurPick", () => {
  it("prefers a Not sure name and never picks a name marked No", () => {
    const [a, b, c] = ["תמר", "נועה", "שירה"].map(byName);
    const req = request({
      shownIds: [a.id, b.id, c.id],
      ratings: [
        { nameId: a.id, verdict: "no" },
        { nameId: b.id, verdict: "unsure" },
        { nameId: c.id, verdict: "no" },
      ],
    });
    expect(chooseOurPick(names, req)?.entry.nameHe).toBe("נועה");
  });

  it("returns null when every shown name was rejected", () => {
    const a = byName("תמר");
    expect(chooseOurPick(names, request({ shownIds: [a.id], ratings: [{ nameId: a.id, verdict: "no" }] }))).toBeNull();
  });
});
