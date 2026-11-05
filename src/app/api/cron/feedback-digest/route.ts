import { NextResponse } from "next/server";
import { APP_NAME_EN } from "@/lib/constants";
import { sendOwnerEmail } from "@/lib/server/email";
import { getStore, type Report } from "@/lib/server/store";

const TYPE_LABELS: Record<Report["type"], string> = { error: "דיווח על טעות", suggestion: "הצעה", other: "משוב אחר" };

function formatReport(r: Report, index: number): string {
  const c = r.context;
  return [
    `${index + 1}. ${TYPE_LABELS[r.type]}${c.hasLinks ? " (מכיל קישור)" : ""}`,
    `מסך: ${c.screen} | גרסה: ${c.appVersion} | מכשיר: ${c.device}`,
    c.nameHe ? `שם: ${c.nameHe} (${c.nameId})` : null,
    `נשלח: ${r.createdAt.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}`,
    r.message,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Daily batch: emails all held reports to the owners, then they are gone from the server. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = getStore();
  const reports = await store.takeReports();
  if (!reports.length) return NextResponse.json({ sent: 0 });

  const restore = () => Promise.all(reports.map((r) => store.addReport(r)));
  try {
    const sent = await sendOwnerEmail(`${APP_NAME_EN}: ${reports.length} דיווחים חדשים`, reports.map(formatReport).join("\n\n---\n\n"));
    if (!sent) await restore();
    return NextResponse.json({ sent: sent ? reports.length : 0 });
  } catch (error) {
    await restore();
    throw error;
  }
}
