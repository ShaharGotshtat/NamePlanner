import { NextResponse } from "next/server";
import { sendOwnerEmail } from "@/lib/server/email";
import { digestBody, digestSubject } from "@/lib/server/feedback-digest";
import { getStore } from "@/lib/server/store";

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
    const sent = await sendOwnerEmail(digestSubject(reports), digestBody(reports));
    if (!sent) await restore();
    return NextResponse.json({ sent: sent ? reports.length : 0 });
  } catch (error) {
    await restore();
    throw error;
  }
}
