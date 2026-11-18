import { eventRequestSchema } from "@/lib/analytics/events";
import { handler, readBody } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

/** Records one anonymous usage event. No session is needed, so a page closing mid-flow can still send it. */
export const POST = handler(async (request) => {
  await getStore().addEvent(await readBody(request, eventRequestSchema));
  return { body: { ok: true } };
});
