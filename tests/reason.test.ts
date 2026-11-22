import { describe, expect, it } from "vitest";
import { REASON_MAX, shortReason } from "@/lib/engine/round";

describe("shortReason", () => {
  it("keeps a short reason as it is, without a final period", () => {
    expect(shortReason("מארבעת המינים, קצר ונעים.")).toBe("מארבעת המינים, קצר ונעים");
  });

  it("keeps the first clause of a long reason", () => {
    const text = "שם קצר מארבעת המינים, שמתאים מאוד לחג הסוכות ונשמע טוב עם שם המשפחה";
    expect(shortReason(text)).toBe("שם קצר מארבעת המינים");
  });

  it("cuts a long reason without clauses at a word boundary", () => {
    const text = "שם עברי קצר ועדין שמתאים מאוד לחג הסוכות ונשמע טוב עם שם המשפחה";
    const short = shortReason(text);
    expect(short.length).toBeLessThanOrEqual(REASON_MAX);
    expect(text.startsWith(short)).toBe(true);
    expect(text[short.length]).toBe(" ");
  });
});
