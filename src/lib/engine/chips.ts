import type { ChipId } from "@/lib/types";

export interface ChipDefinition {
  id: ChipId;
  label: string;
  /** An opt-out: always a hard rule, so it has no Want/Must level and adds no line to the card. */
  filter?: boolean;
}

export const CHIPS: ChipDefinition[] = [
  { id: "englishFriendly", label: "קל באנגלית" },
  { id: "oneSpelling", label: "כתיב אחד ברור" },
  { id: "clearMeaning", label: "משמעות עברית ברורה" },
  // The id predates the median rule; kept so saved sessions and analytics still read.
  { id: "notTop20", label: "שם לא נפוץ" },
  { id: "fitsSiblings", label: "מתאים לשמות האחים והאחיות" },
  { id: "flowsWithSurname", label: "זורם עם שם המשפחה" },
  { id: "grandparentFriendly", label: "יתקבל יפה אצל סבא וסבתא" },
  { id: "dueDateLink", label: "קשור לחג, לעונה או למזל" },
  { id: "noUnisex", label: "ללא שמות יוניסקס", filter: true },
];

export const chipLabel = (id: ChipId) => CHIPS.find((c) => c.id === id)?.label ?? id;

export const isFilterChip = (id: ChipId) => !!CHIPS.find((c) => c.id === id)?.filter;

export const CHIP_IDS = CHIPS.map((c) => c.id) as [ChipId, ...ChipId[]];
