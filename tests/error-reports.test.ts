import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeChange } from "@/lib/client/journey";
import {
  clientReportOccurrence,
  codeBlock,
  resetErrorReportingForTests,
  sendToGitHub,
  serverErrorOccurrence,
} from "@/lib/server/github-errors";
import { handler } from "@/lib/server/http";
import type { ErrorReportRequest } from "@/lib/server/schemas";

const report: ErrorReportRequest = {
  kind: "server",
  message: "/api/rounds 500",
  errorId: "ABCD2345",
  path: "/api/rounds",
  status: 500,
  screen: "rounds",
  appVersion: "0.1.0",
  device: "test",
  journey: [{ at: "2026-11-08T10:00:00.000Z", what: 'freeText = "@someone ```"' }],
};

const occurrence = { fingerprint: "server /api/rounds 500", title: "Server error in /api/rounds", comment: "details" };

function mockGitHub(openIssues: { number: number; title: string }[] = []) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const method = init?.method ?? "GET";
    const body = method === "GET" ? openIssues : { number: 7 };
    return new Response(JSON.stringify(body), { status: method === "POST" ? 201 : 200 });
  });
}

const calls = (fetchMock: ReturnType<typeof mockGitHub>) =>
  fetchMock.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${String(url).replace("https://api.github.com/repos/team/errors", "")}`);

describe("journey", () => {
  it("keeps typed input but not the exact due date or the session token", () => {
    expect(describeChange({ freeText: "קצר", dueDate: "2027-03-01", token: "secret", ratings: { 1: {}, 2: {} } })).toEqual([
      'freeText = "קצר"',
      "dueDate = (set)",
      "ratings: 2 rated",
    ]);
  });
});

describe("error issues", () => {
  beforeEach(() => {
    resetErrorReportingForTests();
    vi.stubEnv("GITHUB_ISSUES_TOKEN", "token");
    vi.stubEnv("GITHUB_ISSUES_REPO", "team/errors");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("open one issue per kind of error and comment on it after that", async () => {
    const fetchMock = mockGitHub();
    await sendToGitHub(occurrence);
    await sendToGitHub(occurrence);
    expect(calls(fetchMock)).toEqual(["GET /issues?state=open&per_page=100", "POST /issues", "POST /issues/7/comments"]);
  });

  it("comment on an issue that is already open", async () => {
    const tagged = serverErrorOccurrence("/api/rounds", "ABCD2345", new Error("boom"));
    const fetchMock = mockGitHub([]);
    await sendToGitHub(tagged);
    const title = JSON.parse(fetchMock.mock.calls[1][1]!.body as string).title as string;

    resetErrorReportingForTests();
    const second = mockGitHub([{ number: 3, title }]);
    await sendToGitHub(clientReportOccurrence(report));
    expect(calls(second).slice(-1)).toEqual(["POST /issues/3/comments"]);
  });

  it("stop after the daily cap for one issue", async () => {
    const fetchMock = mockGitHub();
    for (let i = 0; i < 15; i++) await sendToGitHub(occurrence);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(10);
  });

  it("go to the team's issues repo unless another one is set", async () => {
    vi.stubEnv("GITHUB_ISSUES_REPO", "");
    const fetchMock = mockGitHub();
    await sendToGitHub(occurrence);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/repos/ShaharGotshtat/name-planner-issues/issues");
  });

  it("do nothing without a token", async () => {
    vi.unstubAllEnvs();
    const fetchMock = mockGitHub();
    await sendToGitHub(occurrence);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("are filed when a route fails with a server error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = mockGitHub();
    await handler(async () => {
      throw new Error("boom");
    })(new Request("http://localhost/api/rounds", { method: "POST" }));
    await vi.waitFor(() => expect(calls(fetchMock)).toContain("POST /issues"));
    const created = JSON.parse(fetchMock.mock.calls[1][1]!.body as string);
    expect(created.title).toMatch(/^Server error in \/api\/rounds \[fp:[0-9a-f]{10}\]$/);
    expect(created.body).toContain("Error: boom");
  });

  it("put the user's text inside code blocks, so mentions and backticks stay inert", () => {
    const { comment } = clientReportOccurrence(report);
    expect(comment).toContain("````text\n");
    expect(comment).toMatch(/````text\n\d\d:\d\d:\d\d {2}freeText = "@someone ```"\n````/);
  });
});

describe("codeBlock", () => {
  it("uses a fence longer than any backtick run in the text", () => {
    expect(codeBlock("a ```` b")).toBe("`````text\na ```` b\n`````");
  });
});
