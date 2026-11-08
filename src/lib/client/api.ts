import { turnstileToken } from "./turnstile";
import { APP_VERSION } from "@/lib/constants";
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

async function post<T>(path: string, body: unknown, token: string | null): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { "x-session-token": token } : {}) },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.errorId ?? response.headers.get("x-request-id"));
  }
  return response.json();
}

export const startSession = async () =>
  post<WithToken<{ open: boolean }>>("/api/session", { turnstileToken: await turnstileToken() }, null);

/** Calls an endpoint that needs a session, starting a new one if the token is missing or expired. */
async function withSession<T>(path: string, body: unknown, token: string | null): Promise<WithToken<T>> {
  try {
    return await post<WithToken<T>>(path, body, token ?? (await startSession()).token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    return post<WithToken<T>>(path, body, (await startSession()).token);
  }
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

export const fetchRound = (req: RoundRequest, token: string | null) =>
  withSession<{ suggestions: Suggestion[] }>("/api/rounds", req, token);

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
