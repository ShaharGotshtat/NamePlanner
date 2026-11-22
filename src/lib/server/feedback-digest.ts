import { APP_NAME_EN } from "@/lib/constants";
import { defangLinks } from "./feedback";
import type { FeedbackFlag, Report } from "./store";

const TYPE_LABELS: Record<Report["type"], string> = { error: "דיווח על טעות", suggestion: "הצעה", other: "משוב אחר" };
const FLAG_LABELS: Record<FeedbackFlag, string> = {
  offensive: "תוכן פוגעני או גס",
  attack: "ניסיון פריצה או הזרקה",
  spam: "ספאם",
};

function formatReport(r: Report, index: number): string {
  const c = r.context;
  return [
    `${index + 1}. ${TYPE_LABELS[r.type]}${c.hasLinks ? " (מכיל קישור)" : ""}${c.checked === false ? " (לא נבדק אוטומטית)" : ""}`,
    c.flag ? `סומן: ${FLAG_LABELS[c.flag]}` : null,
    `מסך: ${c.screen} | גרסה: ${c.appVersion} | מכשיר: ${c.device}`,
    c.nameHe ? `שם: ${c.nameHe} (${c.nameId})` : null,
    `נשלח: ${r.createdAt.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}`,
    // Plain-text email, so nothing renders; links are defanged so none is opened by mistake.
    defangLinks(r.message),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Clean reports first; marked ones in their own section at the end, so they never mix with real feedback. */
export function digestBody(reports: Report[]): string {
  const clean = reports.filter((r) => !r.context.flag);
  const flagged = reports.filter((r) => r.context.flag);
  const sections = [clean.map(formatReport).join("\n\n---\n\n")];
  if (flagged.length) {
    sections.push(
      `===== סומנו אוטומטית (${flagged.length}). נשמרו לבדיקה, אין צורך לפעול =====`,
      flagged.map(formatReport).join("\n\n---\n\n"),
    );
  }
  return sections.filter(Boolean).join("\n\n");
}

export function digestSubject(reports: Report[]): string {
  const flagged = reports.filter((r) => r.context.flag).length;
  const clean = reports.length - flagged;
  return `${APP_NAME_EN}: ${clean} דיווחים חדשים${flagged ? ` (+${flagged} סומנו)` : ""}`;
}
