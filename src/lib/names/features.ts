const FINAL_FORMS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

export interface NameFeatures {
  letters: number;
  syllables: number;
  ending: string;
  gutturals: number;
  /** 1 soft (vowels, l, m, n, y) to 5 hard (stops, ts, ch). */
  sound: number;
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

const HARD_LATIN = /tz|ts|ch|kh|[kqtpbdgcx]/g;
const MEDIUM_LATIN = /sh|[szfvrj]/g;
const HARD_HEBREW = /[בגדטכקפצתח]/g;
const MEDIUM_HEBREW = /[זסשר]/g;
/** In a Hebrew spelling about 40% of the sounds are unwritten vowels. */
const HEBREW_VOWEL_SHARE = 0.6;

const toScale = (hardness: number) => Math.min(5, Math.max(1, Math.round(1 + hardness * 8)));

/** How hard a name sounds, from its Latin spelling when there is one, else from the Hebrew letters. */
export function soundHardness(nameHe: string, latin?: string): number {
  if (latin) {
    const text = latin.toLowerCase().replace(/[^a-z]/g, "");
    if (!text.length) return 1;
    const hard = text.match(HARD_LATIN)?.length ?? 0;
    const medium = text.replace(HARD_LATIN, "").match(MEDIUM_LATIN)?.length ?? 0;
    return toScale((hard + medium / 2) / text.length);
  }
  const letters = normalizeHebrew(nameHe).replace(/[^א-ת]/g, "");
  if (!letters.length) return 1;
  const hard = letters.match(HARD_HEBREW)?.length ?? 0;
  const medium = letters.match(MEDIUM_HEBREW)?.length ?? 0;
  return toScale(((hard + medium / 2) / letters.length) * HEBREW_VOWEL_SHARE);
}

export function computeFeatures(nameHe: string, latin?: string): NameFeatures {
  const letters = normalizeHebrew(nameHe).replace(/[^א-ת]/g, "");
  return {
    letters: letters.length,
    syllables: latin ? countSyllables(latin) : Math.ceil(letters.length / 2),
    ending: letters.at(-1) ?? "",
    gutturals: (letters.match(/[חע]/g) ?? []).length,
    sound: soundHardness(nameHe, latin),
  };
}
