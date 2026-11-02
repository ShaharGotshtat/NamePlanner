import { handler, HttpError, readBody, readSession } from "@/lib/server/http";
import { reportRequestSchema } from "@/lib/server/schemas";
import { getStore } from "@/lib/server/store";
import { LIMITS } from "@/lib/server/token";

const MIN_FORM_TIME_MS = 3000;
const HOUR_MS = 60 * 60 * 1000;

export const POST = handler(async (request) => {
  const session = readSession(request);
  const input = await readBody(request, reportRequestSchema);

  const looksLikeBot = !!input.website || input.elapsedMs < MIN_FORM_TIME_MS;
  if (looksLikeBot) return { body: { ok: true }, session };

  const now = Date.now();
  session.reports = session.reports.filter((t) => now - t < HOUR_MS);
  if (session.reports.length >= LIMITS.reportsPerHour) throw new HttpError(429, "Too many reports");
  session.reports.push(now);

  await getStore().addReport({
    type: input.type,
    message: input.message,
    context: {
      screen: input.screen,
      appVersion: input.appVersion,
      device: input.device,
      nameId: input.nameId,
      nameHe: input.nameHe,
      hasLinks: /https?:\/\/|www\./i.test(input.message),
    },
    createdAt: new Date(now),
  });
  return { body: { ok: true }, session };
});
