import { normalizeHebrew } from "@/lib/names/features";

/** Common names that start with ו, so a leading ו in them is not read as "and". */
const VAV_NAMES = new Set(
  ["ורד", "ורדה", "ורדית", "ויקטוריה", "ויקטור", "ולרי", "ולריה", "ויויאן", "ולנטינה", "ונסה", "ויטה", "וליד", "ואדים", "ולדימיר", "וסים", "ויליאם", "ויולט", "ויולטה", "וניה", "ויה"].map(normalizeHebrew),
);

/** Explicit separators: commas (Latin, Arabic, Hebrew geresh-free), semicolons, slashes, pipes, newlines, bullets and the like. */
const SEPARATORS = /[,،;\n\r/|\\&+•·*()[\]{}<>"״]+/;
const LIST_MARKERS = /^\s*(?:[-–—]|\d+[.)]?)\s*/;

/** Reads a typed or pasted list of names in any common format: "דני, מיכל", "דני ומיכל", one per line, "1. דני". */
export function parseNameList(input: string): string[] {
  const segments = input
    .split(SEPARATORS)
    .map((s) => s.replace(LIST_MARKERS, "").trim())
    .filter(Boolean);
  const hasExplicitSeparator = segments.length > 1;

  const names: string[] = [];
  for (const segment of segments) {
    const words = segment.split(/\s+/).filter((w) => w !== "ו" && w.toLowerCase() !== "and");
    // Keep a multi-word name ("בת אל") whole only when the parent used explicit separators
    // and nothing inside the segment looks like "and" ("דני ומיכל").
    const splitWords = !hasExplicitSeparator || words.slice(1).some(startsWithAnd) || segment.split(/\s+/).length !== words.length;
    const parts = splitWords ? words : [words.join(" ")];
    for (const part of parts) {
      const name = names.length > 0 ? stripAnd(part) : part;
      const cleaned = name.replace(/^[-–—.'׳]+|[-–—.'׳]+$/g, "").replace(/\d+/g, "").trim();
      if (cleaned) names.push(cleaned);
    }
  }

  const seen = new Set<string>();
  return names.filter((n) => {
    const key = normalizeHebrew(n).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function startsWithAnd(word: string): boolean {
  return stripAnd(word) !== word;
}

function stripAnd(word: string): string {
  if (!word.startsWith("ו") || word.length < 3) return word;
  if (VAV_NAMES.has(normalizeHebrew(word))) return word;
  // "וּ" or "ו" before a name: drop the vav and any niqqud on it.
  return word.slice(1).replace(/^[֑-ׇ]+/, "");
}
