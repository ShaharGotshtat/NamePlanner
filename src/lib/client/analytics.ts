import type { AppEvent } from "@/lib/analytics/events";

/**
 * Sends anonymous usage events for the dashboard. There is no lasting device or user id:
 * - a daily id is replaced at midnight Israel time, so unique users can be counted per day but not linked across days;
 * - a random run id ties together the steps of one search. It is replaced on Start over and after a day without use.
 */
const DAILY_KEY = "nameplanner:daily";
const RUN_KEY = "nameplanner:run";
const RUN_TTL_MS = 24 * 60 * 60 * 1000;

let memoryRun: { id: string; at: number } | null = null;
let memoryDaily: { id: string; day: string } | null = null;

const israelDay = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

function dailyId(): string {
  const day = israelDay();
  let saved = memoryDaily;
  try {
    saved = JSON.parse(localStorage.getItem(DAILY_KEY) ?? "null") ?? memoryDaily;
  } catch {}
  if (saved?.day === day) return saved.id;
  memoryDaily = { id: crypto.randomUUID(), day };
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(memoryDaily));
  } catch {}
  return memoryDaily.id;
}

function readRun(): { id: string; at: number } | null {
  try {
    const saved = localStorage.getItem(RUN_KEY);
    return saved ? JSON.parse(saved) : memoryRun;
  } catch {
    return memoryRun;
  }
}

function saveRun(run: { id: string; at: number }) {
  memoryRun = run;
  try {
    localStorage.setItem(RUN_KEY, JSON.stringify(run));
  } catch {
    // Storage blocked (private mode): the run lasts for this page load.
  }
}

function currentRun(now = Date.now()): string {
  const run = readRun();
  const id = run && now - run.at < RUN_TTL_MS ? run.id : crypto.randomUUID();
  saveRun({ id, at: now });
  return id;
}

/** Starts a new run: called on Start over. */
export const newRun = () => saveRun({ id: crypto.randomUUID(), at: Date.now() });

/** Deleting all data also clears the analytics ids. */
export function forgetAnalytics() {
  try {
    localStorage.removeItem(DAILY_KEY);
    localStorage.removeItem(RUN_KEY);
  } catch {}
  memoryRun = null;
  memoryDaily = null;
}

export function trackEvent(event: AppEvent) {
  try {
    const body = JSON.stringify({ daily: dailyId(), run: currentRun(), event });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/events", blob)) {
      void fetch("/api/events", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  } catch {
    // Analytics never breaks the app.
  }
}
