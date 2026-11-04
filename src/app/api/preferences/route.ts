import { parsePreferences } from "@/lib/server/ai";
import { handler, readBody, readSession } from "@/lib/server/http";
import { preferencesRequestSchema } from "@/lib/server/schemas";
import { canCallModel, freeTextAllowed } from "@/lib/server/token";

export const POST = handler(async (request) => {
  const session = readSession(request);
  const input = await readBody(request, preferencesRequestSchema);
  const texts = input.texts.filter(Boolean);

  if (!freeTextAllowed(session)) return { body: { status: "disabled" }, session };
  if (!texts.length && !input.namesWeLike.length && !input.family.length) {
    return { body: { status: "ok", profile: null }, session };
  }
  if (!canCallModel(session)) return { body: { status: "unavailable" }, session };

  session.calls++;
  const result = await parsePreferences({ ...input, texts });
  if (!result) return { body: { status: "unavailable" }, session };
  if (result.flagged) {
    session.flags++;
    return { body: { status: freeTextAllowed(session) ? "flagged" : "disabled" }, session };
  }
  return { body: { status: "ok", profile: texts.length || input.namesWeLike.length ? result.profile : null }, session };
});
