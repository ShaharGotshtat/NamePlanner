import { describe, expect, it } from "vitest";
import { buildMessage } from "@/components/screens/ExportList";
import { summaryTitle } from "@/components/screens/Summary";
import type { Suggestion } from "@/lib/types";
import { byName } from "./fixtures";

const suggestion = (nameHe: string) => ({ name: byName(nameHe), reason: "" }) as unknown as Suggestion;

describe("summary title", () => {
  it("counts Not sure names as names to consider, not as a miss", () => {
    expect(summaryTitle(0, 2)).toBe("יש 2 שמות לשקול");
    expect(summaryTitle(0, 1)).toBe("יש שם אחד לשקול");
    expect(summaryTitle(1, 2)).toBe("שם אחד שאהבתם, ועוד 2 לשקול");
    expect(summaryTitle(2, 0)).toBe("2 שמות שאהבתם");
  });
});

describe("export message", () => {
  const [tamar, noa, shira] = ["תמר", "נועה", "שירה"].map(suggestion);

  it("lists liked names, then Not sure names", () => {
    const text = buildMessage([tamar], [noa, shira], null, "https://x");
    expect(text.indexOf("תמר")).toBeLessThan(text.indexOf("ואולי גם:"));
    expect(text.indexOf("ואולי גם:")).toBeLessThan(text.indexOf("נועה"));
  });

  it("can lead with a Not sure name as the first choice, listed once", () => {
    const text = buildMessage([tamar], [noa], noa, "https://x");
    expect(text.startsWith("הבחירה הראשונה שלנו: נועה")).toBe(true);
    expect(text.match(/• נועה/g)).toBeNull();
    expect(text).not.toContain("ואולי גם:");
  });

  it("with only Not sure names, lists them as names being considered", () => {
    const text = buildMessage([], [noa, shira], null, "https://x");
    expect(text.startsWith("שמות שאנחנו שוקלים:")).toBe(true);
  });
});
