import type { DueDerived } from "./types";

const HEBREW_MONTHS: Record<string, string> = {
  Tishri: "תשרי",
  Heshvan: "חשוון",
  Kislev: "כסלו",
  Tevet: "טבת",
  Shevat: "שבט",
  "Adar I": "אדר",
  Adar: "אדר",
  "Adar II": "אדר",
  Nisan: "ניסן",
  Iyar: "אייר",
  Sivan: "סיוון",
  Tamuz: "תמוז",
  Av: "אב",
  Elul: "אלול",
};

/** [month as ICU names it, first day, last day, holiday]. Purim falls in Adar II in a leap year. */
const HOLIDAYS: [string, number, number, string][] = [
  ["Tishri", 1, 2, "ראש השנה"],
  ["Tishri", 10, 10, "יום כיפור"],
  ["Tishri", 15, 22, "סוכות"],
  ["Kislev", 25, 30, "חנוכה"],
  ["Tevet", 1, 2, "חנוכה"],
  ["Shevat", 15, 15, "ט״ו בשבט"],
  ["Adar", 14, 15, "פורים"],
  ["Adar II", 14, 15, "פורים"],
  ["Nisan", 15, 21, "פסח"],
  ["Iyar", 18, 18, "ל״ג בעומר"],
  ["Sivan", 6, 6, "שבועות"],
  ["Av", 15, 15, "ט״ו באב"],
];

/** First day of each sign, in calendar order. */
const ZODIAC: [month: number, day: number, sign: string][] = [
  [1, 20, "דלי"],
  [2, 19, "דגים"],
  [3, 21, "טלה"],
  [4, 20, "שור"],
  [5, 21, "תאומים"],
  [6, 21, "סרטן"],
  [7, 23, "אריה"],
  [8, 23, "בתולה"],
  [9, 23, "מאזניים"],
  [10, 23, "עקרב"],
  [11, 22, "קשת"],
  [12, 22, "גדי"],
];

const SEASONS = ["חורף", "חורף", "אביב", "אביב", "אביב", "קיץ", "קיץ", "קיץ", "סתיו", "סתיו", "סתיו", "חורף"];

const HOLIDAY_WINDOW_DAYS = 7;
const DAY_MS = 86_400_000;

const hebrewParts = new Intl.DateTimeFormat("en-u-ca-hebrew", { day: "numeric", month: "long", timeZone: "UTC" });

function hebrewDate(date: Date): { month: string; day: number } {
  const parts = hebrewParts.formatToParts(date);
  return {
    month: parts.find((p) => p.type === "month")!.value,
    day: Number(parts.find((p) => p.type === "day")!.value),
  };
}

function holidayOn(date: Date): string | null {
  const { month, day } = hebrewDate(date);
  return HOLIDAYS.find(([m, from, to]) => m === month && day >= from && day <= to)?.[3] ?? null;
}

function nearestHoliday(date: Date): string | null {
  for (let offset = 0; offset <= HOLIDAY_WINDOW_DAYS; offset++) {
    const holiday = holidayOn(new Date(date.getTime() + offset * DAY_MS)) ?? holidayOn(new Date(date.getTime() - offset * DAY_MS));
    if (holiday) return holiday;
  }
  return null;
}

function zodiacSign(month: number, day: number): string {
  const started = ZODIAC.filter(([m, d]) => m < month || (m === month && day >= d));
  return (started.at(-1) ?? ZODIAC.at(-1)!)[2];
}

/** Runs on the device: the date stays there, only these values are sent to the server. */
export function deriveFromDueDate(isoDate: string): DueDerived {
  const date = new Date(`${isoDate}T12:00:00Z`);
  const month = date.getUTCMonth() + 1;
  return {
    hebrewMonth: HEBREW_MONTHS[hebrewDate(date).month],
    holiday: nearestHoliday(date),
    zodiac: zodiacSign(month, date.getUTCDate()),
    season: SEASONS[month - 1],
  };
}
