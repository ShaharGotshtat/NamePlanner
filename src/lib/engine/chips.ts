import type { ChipId } from "@/lib/types";

export interface ChipDefinition {
  id: ChipId;
  label: string;
  needsDueDate?: boolean;
  /** An opt-out: always a hard rule, so it has no Want/Must level and adds no line to the card. */
  filter?: boolean;
}

export const CHIPS: ChipDefinition[] = [
  { id: "englishFriendly", label: "קל באנגלית" },
  { id: "oneSpelling", label: "כתיב אחד ברור" },
  { id: "clearMeaning", label: "משמעות עברית ברורה" },
  { id: "notTop20", label: "לא בטופ 20 בשנתיים האחרונות" },
  { id: "fitsSiblings", label: "מתאים לשמות האחים והאחיות" },
  { id: "flowsWithSurname", label: "זורם עם שם המשפחה" },
  { id: "grandparentFriendly", label: "יתקבל יפה אצל סבא וסבתא" },
  { id: "dueDateLink", label: "קשור לחג, לעונה או למזל", needsDueDate: true },
  { id: "noUnisex", label: "בלי שמות יוניסקס", filter: true },
];

export const chipLabel = (id: ChipId) => CHIPS.find((c) => c.id === id)?.label ?? id;

export const isFilterChip = (id: ChipId) => !!CHIPS.find((c) => c.id === id)?.filter;

export const CHIP_IDS = CHIPS.map((c) => c.id) as [ChipId, ...ChipId[]];
