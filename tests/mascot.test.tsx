import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Mascot, THINKING_MOODS, ThinkingMascot } from "@/components/Mascot";

describe("Mascot", () => {
  it.each(THINKING_MOODS)("draws the %s thinking sun with its own label", (mood) => {
    const svg = renderToStaticMarkup(<Mascot mood={mood} />);
    expect(svg).toMatch(/aria-label="[^"]+"/);
    expect(svg).not.toContain("undefined");
  });

  it("picks one of the thinking suns at random", () => {
    const labels = THINKING_MOODS.map((mood) => renderToStaticMarkup(<Mascot mood={mood} />).match(/aria-label="([^"]+)"/)![1]);
    const label = renderToStaticMarkup(<ThinkingMascot />).match(/aria-label="([^"]+)"/)![1];
    expect(labels).toContain(label);
  });
});
