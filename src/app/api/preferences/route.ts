import { parsePreferences } from "@/lib/server/ai";
import { modelFailureOccurrence, sendInBackground } from "@/lib/server/github-errors";
import { handler, readBody, readSession } from "@/lib/server/http";
import { currentRequestId, log } from "@/lib/server/request-id";
import { getNames } from "@/lib/server/names";
import { preferencesRequestSchema } from "@/lib/server/schemas";
import { canCallModel, freeTextAllowed, signProfile } from "@/lib/server/token";

export const POST = handler(async (request) => {
  const session = readSession(request);
  const input = await readBody(request, preferencesRequestSchema);
  const texts = input.texts.filter(Boolean);
  const hasText = texts.length > 0 || input.nameNotes.length > 0;

  if (!freeTextAllowed(session)) return { body: { status: "disabled" }, session };
  if (!hasText && !input.namesWeLike.length && !input.family.length) {
    return { body: { status: "ok", profile: null }, session };
  }
  // The text can't be parsed, but the flow goes on with the chips, so the user sees a notice with the request ID.
  const unavailable = { body: { status: "unavailable", errorId: currentRequestId() }, session };
  if (!canCallModel(session)) {
    log.warn("preferences unavailable: session call limit reached");
    sendInBackground(
      modelFailureOccurrence("preferences", "session call limit reached", "Free text not parsed. The user sees a notice with this error ID.", currentRequestId()),
    );
    return unavailable;
  }

  session.calls++;
  const result = await parsePreferences({ ...input, texts }, input.nameNotes.length ? await getNames() : []);
  if (!result) return unavailable;
  if (result.flagged) {
    session.flags++;
    return { body: { status: freeTextAllowed(session) ? "flagged" : "disabled" }, session };
  }
  return { body: { status: "ok", profile: hasText || input.namesWeLike.length ? signProfile(result.profile) : null }, session };
});
