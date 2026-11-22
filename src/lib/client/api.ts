import { APP_VERSION } from "@/lib/constants";
import { reportError, track } from "./journey";
import type { ParsedProfile, RoundRequest, Suggestion } from "@/lib/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly errorId: string | null,
  ) {
    super(`Request failed with ${status}${errorId ? ` (${errorId})` : ""}`);
  }
}

/** The ID the server logged for a failed request, if the request reached the server. */
export const errorIdOf = (error: unknown) => (error instanceof ApiError ? error.errorId : null);

/** Appends the error ID so a user can quote it in a report and we can find it in the logs. */
export const withErrorId = (message: string, errorId: string | null | undefined) =>
  errorId ? `${message} (קוד תקלה: ${errorId})` : message;

type WithToken<T> = T & { token: string };

async function post<T>(path: string, body: unknown, token: string | null, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const errorId = body?.errorId ?? response.headers.get("x-request-id");
    track(`api ${path} ${response.status}${errorId ? ` (${errorId})` : ""}`);
    // Every failure the user can see with its code goes to the issues repo. 401 is retried with a new session.
    if (response.status !== 401) {
      reportError({ kind: "server", message: `${path} ${response.status}`, errorId, path, status: response.status });
    }
    throw new ApiError(response.status, errorId);
  }
  track(`api ${path} ${response.status}`);
  return response.json();
}

export const startSession = () => post<WithToken<{ open: boolean }>>("/api/session", {}, null);

// Each response carries the session token with updated counters. Requests that use the token run one at a
// time, and a caller holding a token that a later response replaced sends the newest one instead, so two
// requests never start from the same counters.
const replacedBy = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();

const newestToken = (token: string | null) => {
  while (token && replacedBy.has(token)) token = replacedBy.get(token)!;
  return token;
};

/** Calls an endpoint that needs a session, starting a new one if the token is missing or expired. */
function withSession<T>(path: string, body: unknown, token: string | null, signal?: AbortSignal): Promise<WithToken<T>> {
  const run = async () => {
    signal?.throwIfAborted();
    const sent = newestToken(token);
    let result: WithToken<T>;
    try {
      result = await post<WithToken<T>>(path, body, sent ?? (await startSession()).token, signal);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      result = await post<WithToken<T>>(path, body, (await startSession()).token, signal);
    }
    if (sent && result.token !== sent) replacedBy.set(sent, result.token);
    return result;
  };
  const result = queue.then(run, run);
  queue = result.catch(() => {});
  return result;
}

export type PreferencesStatus = "ok" | "flagged" | "disabled" | "unavailable";

export interface PreferencesInput {
  chips: RoundRequest["chips"];
  texts: string[];
  namesWeLike: string[];
  family: RoundRequest["family"];
}

export const checkPreferences = (input: PreferencesInput, token: string | null) =>
  withSession<{ status: PreferencesStatus; profile?: ParsedProfile | null; errorId?: string }>("/api/preferences", input, token);

export const fetchRound = (req: RoundRequest, token: string | null, signal?: AbortSignal) =>
  withSession<{ suggestions: Suggestion[] }>("/api/rounds", req, token, signal);

export const fetchOurPick = (req: RoundRequest, token: string | null) =>
  withSession<{ suggestion: Suggestion | null }>("/api/our-pick", req, token);

export interface ReportInput {
  type: "error" | "suggestion" | "other";
  message: string;
  screen: string;
  nameId?: number;
  nameHe?: string;
  website: string;
  elapsedMs: number;
}

export const sendReport = (input: ReportInput, token: string | null) =>
  withSession<{ ok: boolean }>(
    "/api/reports",
    { ...input, appVersion: APP_VERSION, device: `${navigator.userAgent.slice(0, 150)} ${innerWidth}x${innerHeight}` },
    token,
  );
