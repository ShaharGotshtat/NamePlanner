import { z } from "zod";
import { handler, HttpError, readBody } from "@/lib/server/http";
import { budgetLeft } from "@/lib/server/spend";
import { newSession } from "@/lib/server/token";
import { verifyTurnstile } from "@/lib/server/turnstile";

const sessionRequest = z.object({ turnstileToken: z.string().max(4096).optional() });

export const POST = handler(async (request) => {
  const { turnstileToken } = await readBody(request, sessionRequest);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await verifyTurnstile(turnstileToken, ip))) throw new HttpError(403, "Bot check failed");
  return { body: { open: await budgetLeft() }, session: newSession() };
});
