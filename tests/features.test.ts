import { describe, expect, it } from "vitest";
import { countSyllables } from "@/lib/names/features";

describe("countSyllables", () => {
  it.each([
    ["Ariel", 3],
    ["Avigail", 3],
    ["Itai", 2],
    ["Itay", 2],
    ["Maya", 2],
    ["Guy", 1],
    ["Yehonatan", 4],
  ])("%s has %i syllables", (name, expected) => {
    expect(countSyllables(name)).toBe(expected);
  });
});
