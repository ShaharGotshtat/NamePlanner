import { describe, expect, it } from "vitest";
import { rankCandidates } from "@/lib/engine/round";
import { checkText, normalizeThemeRequirement } from "@/lib/engine/requirements";
import type { NameEntry, TextRequirement } from "@/lib/types";
import { byName, names, request } from "./fixtures";

// Test-only entry: its word appears in the Tanakh, but it is not tagged biblical.
// Stats are copied from another name; only the origin and tags matter here.
const tchelet: NameEntry = {
  ...byName("שקד"),
  id: 9001,
  nameHe: "תכלת",
  niqqud: "תְּכֵלֶת",
  translit: ["Tchelet"],
  meaningHe: "צבע כחול",
  origin: "hebrew",
  biblicalRef: "שמות כ״ה, ד׳",
  tags: { ...byName("שקד").tags, meaningCategories: ["nature"] },
};
const withTchelet = [...names, tchelet];

const biblical = (kind: "want" | "avoid"): TextRequirement => ({
  id: "t1",
  label: kind === "want" ? "שם תנ״כי" : "לא תנ״כי",
  kind,
  facet: "meaningCategory",
  values: ["biblical"],
});

describe("theme wishes use tags, not origin", () => {
  it("a biblical wish does not bring a name whose word only appears in the Tanakh", () => {
    expect(checkText(biblical("want"), tchelet).fit).toBe("not_met");
    expect(checkText(biblical("want"), byName("רות")).fit).toBe("met");
  });

  it("a not-biblical wish can bring a name whose word appears in the Tanakh", () => {
    expect(checkText(biblical("avoid"), tchelet).fit).toBe("met");
    expect(checkText(biblical("avoid"), byName("שרה")).fit).toBe("not_met");
  });

  it("a biblical wish leaves תכלת out of the candidates, a not-biblical wish keeps it in", () => {
    const want = rankCandidates(withTchelet, request({ profile: { summary: "", requirements: [biblical("want")] } }));
    expect(want.length).toBeGreaterThan(0);
    expect(want.every((c) => c.entry.tags.meaningCategories.includes("biblical"))).toBe(true);
    expect(want.map((c) => c.entry.id)).not.toContain(tchelet.id);

    const avoid = rankCandidates(withTchelet, request({ profile: { summary: "", requirements: [biblical("avoid")] } }));
    expect(avoid.map((c) => c.entry.id)).toContain(tchelet.id);
    expect(avoid.every((c) => !c.entry.tags.meaningCategories.includes("biblical"))).toBe(true);
  });

  it("moves a biblical wish the model mapped to origin onto the biblical tag", () => {
    const fixed = normalizeThemeRequirement({ label: "לא שם מהתנ״ך", kind: "avoid", facet: "origin", values: ["hebrew"] });
    expect(fixed).toMatchObject({ facet: "meaningCategory", values: ["biblical"], kind: "avoid" });
    expect(checkText({ ...fixed, id: "t1" }, tchelet).fit).toBe("met");
  });

  it("leaves language and other theme wishes alone", () => {
    const hebrew = { label: "שם עברי", kind: "want" as const, facet: "origin" as const, values: ["hebrew"] };
    expect(normalizeThemeRequirement(hebrew)).toEqual(hebrew);
  });

  it("every name tagged biblical has a biblical source, but a source alone is not the tag", () => {
    for (const n of names.filter((n) => n.tags.meaningCategories.includes("biblical"))) expect(n.biblicalRef).not.toBeNull();
    expect(names.some((n) => n.biblicalRef && !n.tags.meaningCategories.includes("biblical"))).toBe(true);
  });
});
