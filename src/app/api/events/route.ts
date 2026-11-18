import { eventRequestSchema } from "@/lib/analytics/events";
import { handler, readBody } from "@/lib/server/http";
import { log } from "@/lib/server/request-id";
import { getStore } from "@/lib/server/store";

/**
 * Records one anonymous usage event. No session is needed, so a page closing mid-flow can still send it.
 * A storage failure is only logged: analytics must not turn into error reports.
 */
export const POST = handler(async (request) => {
  const event = await readBody(request, eventRequestSchema);
  await getStore()
    .addEvent(event)
    .catch((error) => log.error("Recording an event failed", error));
  return { body: { ok: true } };
});
