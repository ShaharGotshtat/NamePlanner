import { parsePreferences } from "@/lib/server/ai";
import { handler, readBody, readSession } from "@/lib/server/http";
import { currentRequestId, log } from "@/lib/server/request-id";
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
  // The text can't be parsed, but the flow goes on with the chips, so the user sees a notice with the request ID.
  const unavailable = { body: { status: "unavailable", errorId: currentRequestId() }, session };
  if (!canCallModel(session)) {
    log.warn("preferences unavailable: session call limit reached");
    return unavailable;
  }

  session.calls++;
  const result = await parsePreferences({ ...input, texts });
  if (!result) return unavailable;
  if (result.flagged) {
    session.flags++;
    return { body: { status: freeTextAllowed(session) ? "flagged" : "disabled" }, session };
  }
  return { body: { status: "ok", profile: texts.length || input.namesWeLike.length ? result.profile : null }, session };
});
