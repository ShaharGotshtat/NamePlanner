import { APP_VERSION } from "@/lib/constants";

/**
 * The last steps of this visit, kept in memory only. They leave the browser only inside an error report,
 * so the team can see what led to the error.
 */
const MAX_STEPS = 100;
const MAX_TEXT = 200;

export interface JourneyStep {
  at: string;
  what: string;
}

let steps: JourneyStep[] = [];
let screen = "unknown";

export const setScreen = (step: string) => {
  screen = step;
  track(`screen: ${step}`);
};

const clip = (text: string) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text);

export function track(what: string) {
  steps.push({ at: new Date().toISOString(), what: clip(what) });
  if (steps.length > MAX_STEPS) steps = steps.slice(-MAX_STEPS);
}

export const journey = () => [...steps];

export const clearJourney = () => {
  steps = [];
  reportsSent = 0;
  reportedErrorIds.clear();
};

// The exact due date never leaves the browser, names that could identify the family are left out (see the terms),
// and the session token is a secret.
// The step is tracked by setScreen, and the rest are large derived values that add noise.
const SKIPPED_KEYS = new Set(["token", "checkedInput", "rounds", "step"]);
const IDENTIFYING_KEYS = new Set(["dueDate", "surname", "family"]);

const isEmpty = (value: unknown) => value === "" || value == null || (Array.isArray(value) && value.length === 0);

/** One line per changed field of a state update, e.g. `freeText = "שם קצר"`. */
export function describeChange(patch: Record<string, unknown>): string[] {
  return Object.entries(patch).flatMap(([key, value]) => {
    if (IDENTIFYING_KEYS.has(key)) return [`${key} = ${isEmpty(value) ? "(empty)" : "(set)"}`];
    if (SKIPPED_KEYS.has(key)) return [];
    if (key === "ratings" && value && typeof value === "object") return [`ratings: ${Object.keys(value).length} rated`];
    return [`${key} = ${JSON.stringify(value) ?? "undefined"}`];
  });
}

/** The label of the button or link a tap landed on, if any. */
export function describeTap(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const control = target.closest("button, a, [role=button], input[type=checkbox], input[type=radio], label");
  if (!control) return null;
  const label = control.getAttribute("aria-label") || control.textContent?.trim() || control.tagName.toLowerCase();
  return `tap: ${label.replace(/\s+/g, " ")}`;
}

/** Tracks taps and reports errors that nothing caught. Returns a cleanup function. */
export function watchPage(): () => void {
  const onTap = (event: MouseEvent) => {
    const tap = describeTap(event.target);
    if (tap) track(tap);
  };
  // "Script error." comes from other sites' scripts (extensions, embeds) and carries no details.
  const onError = (event: ErrorEvent) =>
    event.message !== "Script error." &&
    reportError({ kind: "client", message: event.message || String(event.error), stack: event.error?.stack });
  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    reportError({ kind: "client", message: reason instanceof Error ? reason.message : String(reason), stack: reason?.stack });
  };
  addEventListener("click", onTap, { capture: true });
  addEventListener("error", onError);
  addEventListener("unhandledrejection", onRejection);
  return () => {
    removeEventListener("click", onTap, { capture: true });
    removeEventListener("error", onError);
    removeEventListener("unhandledrejection", onRejection);
  };
}

export interface ErrorReport {
  kind: "server" | "client";
  message: string;
  stack?: string;
  errorId?: string;
  path?: string;
  status?: number;
  screen: string;
  appVersion: string;
  device: string;
  journey: JourneyStep[];
}

const MAX_REPORTS_PER_VISIT = 5;
let reportsSent = 0;
const reportedErrorIds = new Set<string>();

/** Sends the error with the journey that led to it. Never throws: reporting must not break the app. */
export function reportError(report: Omit<ErrorReport, "screen" | "appVersion" | "device" | "journey">) {
  if (reportsSent >= MAX_REPORTS_PER_VISIT) return;
  if (report.errorId) {
    if (reportedErrorIds.has(report.errorId)) return;
    reportedErrorIds.add(report.errorId);
  }
  reportsSent++;
  const body: ErrorReport = {
    ...report,
    message: report.message.slice(0, 500),
    stack: report.stack?.slice(0, 4000),
    screen,
    appVersion: APP_VERSION,
    device: `${navigator.userAgent.slice(0, 150)} ${innerWidth}x${innerHeight}`,
    journey: journey(),
  };
  fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(
    () => {},
  );
}
