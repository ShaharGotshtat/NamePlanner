import { clientReportOccurrence, errorReportingEnabled, sendToGitHub } from "@/lib/server/github-errors";
import { handler, readBody } from "@/lib/server/http";
import { errorReportRequestSchema } from "@/lib/server/schemas";

/** Receives an error from the browser with the steps that led to it, and files it as a GitHub issue. */
export const POST = handler(async (request) => {
  const report = await readBody(request, errorReportRequestSchema);
  if (errorReportingEnabled()) await sendToGitHub(clientReportOccurrence(report));
  return { body: { ok: true } };
});
