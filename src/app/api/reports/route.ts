import { checkFeedback, cleanFeedbackText, cleanLine, countsAsAbuse, linkCount } from "@/lib/server/feedback";
import { handler, HttpError, readBody, readSession } from "@/lib/server/http";
import { log } from "@/lib/server/request-id";
import { reportRequestSchema } from "@/lib/server/schemas";
import { getStore } from "@/lib/server/store";
import { freeTextAllowed, LIMITS } from "@/lib/server/token";

const MIN_FORM_TIME_MS = 3000;
const HOUR_MS = 60 * 60 * 1000;
/** Reports waiting for the daily email. Past this, a flood from many sessions cannot fill the table or the inbox. */
const MAX_PENDING_REPORTS = 200;

export const POST = handler(async (request) => {
  const session = readSession(request);
  const input = await readBody(request, reportRequestSchema);
  const accepted = { body: { ok: true }, session };

  const message = cleanFeedbackText(input.message);
  const looksLikeBot = !!input.website || input.elapsedMs < MIN_FORM_TIME_MS || !message;
  // A session that already sent offensive text or attacks is answered as usual, but nothing is kept.
  if (looksLikeBot || !freeTextAllowed(session)) return accepted;

  const now = Date.now();
  session.reports = session.reports.filter((t) => now - t < HOUR_MS);
  if (session.reports.length >= LIMITS.reportsPerHour) throw new HttpError(429, "Too many reports");
  session.reports.push(now);

  const store = getStore();
  if ((await store.countReports()) >= MAX_PENDING_REPORTS) {
    log.warn("report dropped: too many reports wait for the daily email");
    return accepted;
  }

  const { flag, checked } = await checkFeedback(message);
  if (countsAsAbuse(flag)) session.flags++;
  if (flag) log.warn(`report marked ${flag}`);

  await store.addReport({
    type: input.type,
    message,
    context: {
      screen: input.screen,
      appVersion: input.appVersion,
      device: cleanLine(input.device, 200),
      nameId: input.nameId,
      nameHe: input.nameHe ? cleanLine(input.nameHe, 60) : undefined,
      hasLinks: linkCount(message) > 0,
      flag,
      checked,
    },
    createdAt: new Date(now),
  });
  return accepted;
});
