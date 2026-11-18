import { MODEL_CANDIDATES, pickDiverse, rankCandidates, ROUND_SIZE, standardReason, toSuggestion } from "@/lib/engine/round";
import { SERVER_ID } from "@/lib/analytics/events";
import { pickWithModel } from "@/lib/server/ai";
import { handler, readBody, readSession } from "@/lib/server/http";
import { getNames } from "@/lib/server/names";
import { log } from "@/lib/server/request-id";
import { roundRequestSchema } from "@/lib/server/schemas";
import { getStore } from "@/lib/server/store";
import { canCallModel, verifiedProfile } from "@/lib/server/token";

export const POST = handler(async (request) => {
  const session = readSession(request);
  const body = await readBody(request, roundRequestSchema);
  const req = { ...body, profile: verifiedProfile(body.profile) };
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

  // Counts rounds served without the model (budget, session limit or model failure) for the dashboard.
  await getStore()
    .addEvent({ daily: SERVER_ID, run: SERVER_ID, event: { name: "round_served", props: { llm: !!reasons?.size } } })
    .catch((error) => log.error("Recording a round failed", error));

  const suggestions = chosen.map((c) => toSuggestion(c, reasons?.get(c.entry.id) ?? standardReason(c)));
  return { body: { suggestions }, session };
});
