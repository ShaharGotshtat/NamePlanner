import type { ChipId } from "@/lib/types";

export interface ChipDefinition {
  id: ChipId;
  label: string;
  needsDueDate?: boolean;
}

export const CHIPS: ChipDefinition[] = [
  { id: "unisex", label: "יוניסקס" },
  { id: "englishFriendly", label: "קל לדוברי אנגלית" },
  { id: "oneSpelling", label: "כתיב אחד ברור" },
  { id: "clearMeaning", label: "משמעות עברית ברורה" },
  { id: "notTop20", label: "לא בטופ 20 בשנתיים האחרונות" },
  { id: "fitsSiblings", label: "מתאים לשמות האחים" },
  { id: "flowsWithSurname", label: "זורם עם שם המשפחה" },
  { id: "grandparentFriendly", label: "יתקבל יפה אצל סבא וסבתא" },
  { id: "dueDateLink", label: "קשור לחג, לעונה או למזל", needsDueDate: true },
];

export const chipLabel = (id: ChipId) => CHIPS.find((c) => c.id === id)?.label ?? id;

export const CHIP_IDS = CHIPS.map((c) => c.id) as [ChipId, ...ChipId[]];
