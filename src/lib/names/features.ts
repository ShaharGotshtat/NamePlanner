const FINAL_FORMS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

export interface NameFeatures {
  letters: number;
  syllables: number;
  ending: string;
  gutturals: number;
}

export const stripNiqqud = (text: string) => text.replace(/[֑-ׇ]/g, "");

export function normalizeHebrew(text: string): string {
  return stripNiqqud(text)
    .trim()
    .replace(/[ךםןףץ]/g, (c) => FINAL_FORMS[c]);
}

/** Each vowel is a syllable, except closing diphthongs (Avigail, Itai) and a consonant y (Maya, Itay). */
export function countSyllables(latin: string): number {
  const nuclei = latin.toLowerCase().match(/[aeo]i(?![aeiou])|[aeiou]|(?<![aeiou])y(?![aeiou])/g);
  return Math.max(1, nuclei?.length ?? 1);
}

export function computeFeatures(nameHe: string, latin?: string): NameFeatures {
  const letters = normalizeHebrew(nameHe).replace(/[^א-ת]/g, "");
  return {
    letters: letters.length,
    syllables: latin ? countSyllables(latin) : Math.ceil(letters.length / 2),
    ending: letters.at(-1) ?? "",
    gutturals: (letters.match(/[חע]/g) ?? []).length,
  };
}
