import type { DueDerived } from "./types";

/**
 * Fixed codes for what a name can be linked to: holidays, Hebrew months, seasons and zodiac signs.
 * The build writes these codes into names.json from the Hebrew in name-content.tsv; linkCode reads either form.
 */
export const LINKS = {
  rosh_hashana: "ראש השנה",
  yom_kippur: "יום כיפור",
  sukkot: "סוכות",
  hanukkah: "חנוכה",
  tubishvat: "ט״ו בשבט",
  purim: "פורים",
  pesach: "פסח",
  lag_baomer: "ל״ג בעומר",
  shavuot: "שבועות",
  tubeav: "ט״ו באב",
  tishrei: "תשרי",
  heshvan: "חשוון",
  kislev: "כסלו",
  tevet: "טבת",
  shevat: "שבט",
  adar: "אדר",
  nisan: "ניסן",
  iyar: "אייר",
  sivan: "סיוון",
  tamuz: "תמוז",
  av: "אב",
  elul: "אלול",
  spring: "אביב",
  summer: "קיץ",
  autumn: "סתיו",
  winter: "חורף",
  aries: "טלה",
  taurus: "שור",
  gemini: "תאומים",
  cancer: "סרטן",
  leo: "אריה",
  virgo: "בתולה",
  libra: "מאזניים",
  scorpio: "עקרב",
  sagittarius: "קשת",
  capricorn: "גדי",
  aquarius: "דלי",
  pisces: "דגים",
} as const;

export type LinkCode = keyof typeof LINKS;

const unquote = (text: string) => text.trim().replace(/["״׳']/g, "");
const BY_HEBREW = new Map(Object.entries(LINKS).map(([code, he]) => [unquote(he), code as LinkCode]));

/** The code for a link written as a code or in Hebrew (with or without gershayim). */
export function linkCode(value: string): LinkCode | null {
  if (value in LINKS) return value as LinkCode;
  return BY_HEBREW.get(unquote(value)) ?? null;
}

export const linkCodes = (values: (string | null | undefined)[]) =>
  [...new Set(values.map((v) => (v ? linkCode(v) : null)).filter((c): c is LinkCode => !!c))];

export const linkLabel = (code: LinkCode) => LINKS[code];

/** What the due date is mainly known for: its holiday, or else its Hebrew month. */
export const dueHeadline = (due: DueDerived) => due.holiday ?? `חודש ${due.hebrewMonth}`;

/** The due date chip names the real values, for example "קשור לפסח או לאביב". */
export const dueChipLabel = (due: DueDerived) => `קשור ל${dueHeadline(due)} או ל${due.season}`;
