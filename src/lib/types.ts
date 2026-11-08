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
  | "biblical";

export type Origin = "hebrew" | "aramaic" | "arabic" | "greek" | "latin" | "persian" | "yiddish" | "english" | "other";
export type Style = "traditional" | "classic" | "modern";

/**
 * How a name feels, scored once offline by a model (data/name-style.tsv), 1 to 5 on each axis.
 * Only used to compare names with each other: never shown to parents and never used to filter.
 */
export interface StyleAxes {
  /** 1 grandparents' generation, 2 parents' generation or long-standing traditional, 3 timeless, 4 contemporary, 5 newest wave. */
  era: number;
  /** 1 hard to say or unknown outside Israel, 3 easy to say but unfamiliar abroad, 5 works abroad as it is. */
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
  | "unisex"
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
