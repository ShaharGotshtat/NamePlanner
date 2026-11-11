import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LevelPicker } from "@/components/LevelPicker";
import type { ChipLevel } from "@/lib/types";

const render = (level: ChipLevel) => renderToStaticMarkup(<LevelPicker label="יוניסקס" level={level} onChange={() => {}} />);
const checked = (html: string) => [...html.matchAll(/aria-checked="true"[^>]*>([^<]+)</g)].map((m) => m[1]);

describe("LevelPicker", () => {
  it("shows both levels whichever is picked", () => {
    for (const level of ["want", "must"] as const) {
      const html = render(level);
      expect(html).toContain("רצוי");
      expect(html).toContain("חובה");
    }
  });

  it("marks only the current level as checked", () => {
    expect(checked(render("want"))).toEqual(["רצוי"]);
    expect(checked(render("must"))).toEqual(["חובה"]);
  });

  it("is a labelled radio group", () => {
    const html = render("want");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="יוניסקס"');
    expect(html.match(/role="radio"/g)).toHaveLength(2);
  });
});
