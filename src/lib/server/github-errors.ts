import { createHash } from "node:crypto";
import { after } from "next/server";
import { log } from "./request-id";
import type { ErrorReportRequest } from "./schemas";

/**
 * Turns errors into GitHub issues in a private repo, so everyone on the team can read them without access to
 * the hosting account. One open issue per kind of error; each new occurrence is a comment on it.
 */

const API = "https://api.github.com";
const DAILY_WRITE_LIMIT = 50;
const DAILY_WRITES_PER_ISSUE = 10;

interface Occurrence {
  /** Same fingerprint, same issue. */
  fingerprint: string;
  title: string;
  comment: string;
}

const DEFAULT_REPO = "ShaharGotshtat/name-planner-issues";

const config = () => {
  const token = process.env.GITHUB_NAME_PLANNER_ISSUES_TOKEN;
  return token ? { token, repo: process.env.GITHUB_ISSUES_REPO || DEFAULT_REPO } : null;
};

export const errorReportingEnabled = () => config() !== null;

/** Per server instance. Enough to stop a loop or a flood from filling the repo. */
const counts = { day: "", total: 0, perIssue: new Map<string, number>() };
const issueNumbers = new Map<string, number>();

function allowWrite(fingerprint: string, now = new Date()): boolean {
  const day = now.toISOString().slice(0, 10);
  if (counts.day !== day) Object.assign(counts, { day, total: 0, perIssue: new Map() });
  const forIssue = counts.perIssue.get(fingerprint) ?? 0;
  if (counts.total >= DAILY_WRITE_LIMIT || forIssue >= DAILY_WRITES_PER_ISSUE) return false;
  counts.total++;
  counts.perIssue.set(fingerprint, forIssue + 1);
  return true;
}

export const resetErrorReportingForTests = () => {
  Object.assign(counts, { day: "", total: 0, perIssue: new Map() });
  issueNumbers.clear();
};

const marker = (fingerprint: string) => `[fp:${createHash("sha256").update(fingerprint).digest("hex").slice(0, 10)}]`;

async function github<T>(token: string, path: string, init?: { method: string; body: object }): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: init ? JSON.stringify(init.body) : undefined,
  });
  if (!response.ok) throw new Error(`GitHub ${init?.method ?? "GET"} ${path} failed with ${response.status}`);
  return response.json() as Promise<T>;
}

async function findOpenIssue(token: string, repo: string, tag: string): Promise<number | null> {
  const cached = issueNumbers.get(tag);
  if (cached) return cached;
  const issues = await github<{ number: number; title: string; pull_request?: unknown }[]>(
    token,
    `/repos/${repo}/issues?state=open&per_page=100`,
  );
  const found = issues.find((issue) => !issue.pull_request && issue.title.endsWith(tag));
  if (found) issueNumbers.set(tag, found.number);
  return found?.number ?? null;
}

/** Opens or comments on the issue for this kind of error. Never throws: a failed report is only logged. */
export async function sendToGitHub({ fingerprint, title, comment }: Occurrence): Promise<void> {
  const settings = config();
  if (!settings || !allowWrite(fingerprint)) return;
  const { token, repo } = settings;
  const tag = marker(fingerprint);
  try {
    const existing = await findOpenIssue(token, repo, tag);
    if (existing) {
      try {
        await github(token, `/repos/${repo}/issues/${existing}/comments`, { method: "POST", body: { body: comment } });
        return;
      } catch {
        // The issue may have been closed or deleted since it was cached: open a new one.
        issueNumbers.delete(tag);
      }
    }
    const created = await github<{ number: number }>(token, `/repos/${repo}/issues`, {
      method: "POST",
      body: { title: `${noMentions(title).slice(0, 200)} ${tag}`, body: comment },
    });
    issueNumbers.set(tag, created.number);
  } catch (error) {
    log.warn("Error report to GitHub failed", error);
  }
}

/** Runs after the response is sent when inside a request, so reporting never slows the user down. */
export function sendInBackground(occurrence: Occurrence) {
  if (!errorReportingEnabled()) return;
  try {
    after(() => sendToGitHub(occurrence));
  } catch {
    void sendToGitHub(occurrence);
  }
}

/** Mentions in a title or outside code blocks would notify GitHub users. */
const noMentions = (text: string) => text.replace(/@/g, "@​");

/** A fenced block that the content cannot close early. */
export const codeBlock = (text: string) => {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}text\n${text}\n${fence}`;
};

const israelTime = (date: Date) => date.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
const clock = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "--:--:--" : date.toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour12: false });
};

export const serverErrorFingerprint = (path: string, status: number) => `server ${path} ${status}`;

export function serverErrorOccurrence(path: string, errorId: string, error: unknown, now = new Date()): Occurrence {
  const details = error instanceof Error ? (error.stack ?? `${error.name}: ${error.message}`) : String(error);
  return {
    fingerprint: serverErrorFingerprint(path, 500),
    title: `Server error in ${path}`,
    comment: [
      `### Server log · error ID \`${errorId}\``,
      `${israelTime(now)} · \`${path}\` returned 500`,
      codeBlock(details.slice(0, 6000)),
      "The browser's journey for this error ID follows in its own comment when the user's browser sends it.",
    ].join("\n\n"),
  };
}

export function clientReportOccurrence(report: ErrorReportRequest, now = new Date()): Occurrence {
  const isServer = report.kind === "server" && report.path && report.status;
  const firstLine = report.message.split("\n")[0].slice(0, 120);
  const journey = report.journey.map((step) => `${clock(step.at)}  ${step.what}`).join("\n") || "(empty)";
  return {
    fingerprint: isServer ? serverErrorFingerprint(report.path!, report.status!) : `client ${firstLine}`,
    title: isServer ? `Server error in ${report.path}` : `Browser error: ${firstLine}`,
    comment: [
      `### ${isServer ? "Browser journey" : "Browser error"}${report.errorId ? ` · error ID \`${report.errorId}\`` : ""}`,
      `${israelTime(now)} · screen \`${report.screen}\` · version ${report.appVersion}`,
      codeBlock(`Device: ${report.device}`),
      isServer ? null : codeBlock(report.stack || report.message),
      `**Last ${report.journey.length} steps**, oldest first`,
      codeBlock(journey),
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
