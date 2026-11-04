import { MODEL_CANDIDATES, pickDiverse, rankCandidates, ROUND_SIZE, standardReason, toSuggestion } from "@/lib/engine/round";
import { pickWithModel } from "@/lib/server/ai";
import { handler, readBody, readSession } from "@/lib/server/http";
import { getNames } from "@/lib/server/names";
import { roundRequestSchema } from "@/lib/server/schemas";
import { canCallModel } from "@/lib/server/token";

export const POST = handler(async (request) => {
  const session = readSession(request);
  const req = await readBody(request, roundRequestSchema);
  const names = await getNames();
  const ranked = rankCandidates(names, req);

  let reasons: Map<number, string> | null = null;
  if (ranked.length && canCallModel(session)) {
    session.calls++;
    reasons = await pickWithModel(ranked.slice(0, MODEL_CANDIDATES), req, names);
  }

  const chosen = ranked.filter((c) => reasons?.has(c.entry.id));
  for (const c of pickDiverse(ranked, req.babySex)) {
    if (chosen.length < ROUND_SIZE && !chosen.includes(c)) chosen.push(c);
  }

  const suggestions = chosen.map((c) => toSuggestion(c, reasons?.get(c.entry.id) ?? standardReason(c)));
  return { body: { suggestions }, session };
});
