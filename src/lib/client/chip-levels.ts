import { isFilterChip, type ChipDefinition } from "@/lib/engine/chips";
import type { ChipId, ChipLevel } from "@/lib/types";
import type { AppState } from "./state";

/** At this many musts the parent is warned that few names may be left. */
export const MANY_MUSTS = 3;

/** A tap moves a chip off → רצוי → חובה → off. An opt-out chip has only off and חובה. */
export function nextLevel(id: ChipId, level: ChipLevel | undefined): ChipLevel | undefined {
  if (isFilterChip(id)) return level ? undefined : "must";
  if (!level) return "want";
  return level === "want" ? "must" : undefined;
}

/** Why a chip can't be used yet, or null when the data it needs is there. */
export function missingData(chip: ChipDefinition, s: AppState): string | null {
  switch (chip.id) {
    case "fitsSiblings":
      return s.family.some((f) => f.relation === "sibling") ? null : "אין אחים ברשימה";
    case "flowsWithSurname":
      return s.surname.trim() ? null : "צריך שם משפחה";
    case "dueDateLink":
      return s.dueDerived ? null : "צריך תאריך לידה";
    default:
      return null;
  }
}
