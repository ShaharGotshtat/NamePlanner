import type { BabySex } from "@/lib/types";

/**
 * The start button needs only the baby's sex. The daily-budget check (`open`) blocks it only once it
 * answers "full": while it is still loading (null) the parent can start, because a slow first request,
 * such as right after the app restarts, must not leave a prefilled form with a disabled button.
 */
export const canStart = (babySex: BabySex | null, open: boolean | null): boolean => babySex !== null && open !== false;
