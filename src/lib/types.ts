export type BabySex = "boy" | "girl" | "unknown";
export type NameSex = "boy" | "girl" | "unisex";

export type MeaningCategory =
  | "nature"
  | "light"
  | "strength"
  | "joy"
  | "faith"
  | "love"
  | "beauty"
  | "peace"
  | "wisdom"
  | "gift"
  | "royalty"
  | "life"
  /** The name is known as the name of a biblical figure. A word that only appears in the Tanakh does not count. */
  | "biblical"
  /**
   * The name describes its bearer (תמיר, יפה, בלה, אהובה) or is a character trait or feeling word
   * (תום, עוז, שמחה). A possessive form (רוני: "my joy") or another abstract noun (שלום, הדר) does not count.
   */
  | "trait";

export type Origin = "hebrew" | "aramaic" | "arabic" | "greek" | "latin" | "persian" | "yiddish" | "english" | "other";
export type Style = "traditional" | "classic" | "modern";

/**
 * How a name feels, 1 to 5 on each axis. Era is computed from CBS data; reach and religious are
 * scored once offline by a model (data/name-style.tsv) and checked by a person.
 * Only used to compare names with each other: never shown to parents and never used to filter.
 */
export interface StyleAxes {
  /** From the share-weighted average birth year: 1 before 1975, 2 1975-1989, 3 the 1990s, 4 the 2000s, 5 from 2010 (src/lib/names/era.ts). */
  era: number;
  /** 1 very hard to say abroad, 3 sayable but awkward, 5 an international name with the same sound. */
  reach: number;
  /** Who mostly gives the name today: 1 mainly Haredi families, 3 every community, 5 mainly secular families. */
  religious: number;
}

export interface YearStat {
  year: number;
  count: number;
  rank: number;
}

export interface NameEntry {
  id: number;
  nameHe: string;
  niqqud: string;
  translit: string[];
  /** Share of babies given the name who were boys, 0 to 1 (CBS). */
  sexRatio: number;
  meaningHe: string;
  origin: Origin;
  /** The full origin as shown on the card, for example "תנ״ך; טבע (צמח)". */
  originHe?: string;
  biblicalRef: string | null;
  /** Other Hebrew spellings parents use. */
  variants?: string[];
  tags: {
    meaningCategories: MeaningCategory[];
    hebrewWord: boolean;
    style: Style;
    englishFriendly: boolean;
    singleSpelling: boolean;
    /** Hebrew months, holidays, seasons or zodiac signs the name is tied to. */
    links: string[];
  };
  stats: YearStat[];
  /** Missing until the scores are loaded; comparisons then fall back to the coarse style tag. */
  styleAxes?: StyleAxes;
}

export type Relation = "sibling" | "cousin" | "parent" | "grandparent" | "other";

export interface FamilyName {
  name: string;
  relation: Relation;
}

export type ChipId =
  | "noUnisex"
  | "englishFriendly"
  | "oneSpelling"
  | "clearMeaning"
  | "notTop20"
  | "fitsSiblings"
  | "flowsWithSurname"
  | "grandparentFriendly"
  | "dueDateLink";

export type ChipLevel = "want" | "must";
export type ChipSelection = Partial<Record<ChipId, ChipLevel>>;

/** Values worked out on the device from the due date. The date itself never leaves the device. */
export interface DueDerived {
  hebrewMonth: string;
  holiday: string | null;
  zodiac: string;
  season: string;
}

export type Facet = "meaningCategory" | "origin" | "style" | "length" | "ending" | "popularity";

/** One free-text wish, parsed into something the ranking can check against the name data. */
export interface TextRequirement {
  id: string;
  label: string;
  kind: "want" | "avoid";
  facet: Facet;
  values: string[];
}

export interface ParsedProfile {
  summary: string;
  requirements: TextRequirement[];
  /** Server signature: a profile the client changed or made up is ignored. */
  sig?: string;
}

export type Verdict = "no" | "unsure" | "interesting" | "taken";

export interface Rating {
  nameId: number;
  verdict: Verdict;
  note?: string;
}

export type Fit = "met" | "partly" | "not_met";

export interface ExplanationLine {
  requirement: string;
  fit: Fit;
  detail: string;
}

export interface Suggestion {
  name: NameEntry;
  sex: NameSex;
  reason: string;
  explanation: ExplanationLine[];
}

export interface RoundRequest {
  babySex: BabySex;
  dueDerived: DueDerived | null;
  surname: string;
  family: FamilyName[];
  chips: ChipSelection;
  profile: ParsedProfile | null;
  namesWeLike: string[];
  declined: string[];
  ratings: Rating[];
  shownIds: number[];
}
