import { chooseOurPick, standardReason, toSuggestion } from "@/lib/engine/round";
import { ourPickReason } from "@/lib/server/ai";
import { handler, readBody, readSession } from "@/lib/server/http";
import { getNames } from "@/lib/server/names";
import { roundRequestSchema } from "@/lib/server/schemas";
import { canCallModel } from "@/lib/server/token";

export const POST = handler(async (request) => {
  const session = readSession(request);
  const req = await readBody(request, roundRequestSchema);
  const pick = chooseOurPick(await getNames(), req);
  if (!pick) return { body: { suggestion: null }, session };

  let reason: string | null = null;
  if (canCallModel(session)) {
    session.calls++;
    reason = await ourPickReason(pick);
  }
  return { body: { suggestion: toSuggestion(pick, reason ?? standardReason(pick)) }, session };
});
