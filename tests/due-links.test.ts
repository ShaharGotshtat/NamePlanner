import { describe, expect, it } from "vitest";
import { deriveFromDueDate } from "@/lib/due-date";
import { dueDateFit, dueDateNotice, matchContext } from "@/lib/engine/requirements";
import { dueChipLabel, linkCode } from "@/lib/links";
import type { NameEntry } from "@/lib/types";
import { byName, request } from "./fixtures";

const withLinks = (links: string[]): NameEntry => ({ ...byName("הדס"), tags: { ...byName("הדס").tags, links } });
const pesachDate = "2027-04-22"; // Nisan 15, 5787

describe("link codes", () => {
  it("reads Hebrew links, with or without gershayim, and codes", () => {
    expect(linkCode("ט״ו בשבט")).toBe("tubishvat");
    expect(linkCode('ט"ו בשבט')).toBe("tubishvat");
    expect(linkCode("pesach")).toBe("pesach");
    expect(linkCode("משהו אחר")).toBeNull();
  });
});

describe("due date links", () => {
  it("names the real holiday and season on the chip", () => {
    expect(dueChipLabel(deriveFromDueDate(pesachDate))).toBe("קשור לפסח או לאביב");
  });

  it("counts holidays up to two weeks from the date", () => {
    const twoWeeksBefore = deriveFromDueDate("2027-04-10");
    expect(twoWeeksBefore.links).toContain("pesach");
    expect(twoWeeksBefore.links).toContain("nisan");
  });

  it("is met for a Pesach name, partly for a name linked to another holiday, not met for none", () => {
    const ctx = matchContext(request({ dueDerived: deriveFromDueDate(pesachDate) }));
    expect(dueDateFit(withLinks(["פסח"]), ctx)?.fit).toBe("met");
    expect(dueDateFit(withLinks(["סוכות"]), ctx)).toEqual({ fit: "partly", detail: "סוכות, לא פסח" });
    expect(dueDateFit(withLinks([]), ctx)?.fit).toBe("not_met");
  });

  it("still works with a due date saved before links were sent", () => {
    const { links: _, ...old } = deriveFromDueDate(pesachDate);
    expect(dueDateFit(withLinks(["פסח"]), matchContext(request({ dueDerived: old })))?.fit).toBe("met");
  });

  it("says plainly when few names fit the due date", () => {
    const req = request({ dueDerived: deriveFromDueDate(pesachDate), chips: { dueDateLink: "want" } });
    expect(dueDateNotice([withLinks(["פסח"]), withLinks([])], req)).toBe("יש לנו רק שם אחד שקשור לפסח או לאביב.");
    expect(dueDateNotice([withLinks(["פסח"])], { ...req, chips: {} })).toBeNull();
  });
});
