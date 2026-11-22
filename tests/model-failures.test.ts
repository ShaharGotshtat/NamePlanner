import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status = 529;
  }
  class Anthropic {
    static APIError = APIError;
    messages = { create };
  }
  return { default: Anthropic };
});
vi.mock("@/lib/server/spend", () => ({ budgetLeft: async () => true, recordSpend: async () => {} }));

const { structuredCall } = await import("@/lib/server/llm");
const { resetErrorReportingForTests } = await import("@/lib/server/github-errors");
const { handler, HttpError } = await import("@/lib/server/http");

const schema = z.object({ summary: z.string() });
const call = { model: "claude-haiku-5-5" as const, system: "s", prompt: "p", schema, maxTokens: 100 };
const answer = (text: string, stop_reason = "end_turn") => ({
  content: [{ type: "text", text }],
  stop_reason,
  usage: { input_tokens: 10, output_tokens: 10 },
});

function mockGitHub() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    const method = init?.method ?? "GET";
    return new Response(JSON.stringify(method === "GET" ? [] : { number: 7 }), { status: method === "POST" ? 201 : 200 });
  });
}
const createdIssue = (fetchMock: ReturnType<typeof mockGitHub>) => {
  const post = fetchMock.mock.calls.find(([url, init]) => init?.method === "POST" && String(url).endsWith("/issues"));
  return post ? JSON.parse(post[1]!.body as string) : null;
};

describe("model calls", () => {
  beforeEach(() => {
    resetErrorReportingForTests();
    create.mockReset();
    vi.stubEnv("ANTHROPIC_API_KEY", "key");
    vi.stubEnv("GITHUB_NAME_PLANNER_ISSUES_TOKEN", "token");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("retry a cut-off answer with more room instead of failing the request", async () => {
    mockGitHub();
    create.mockResolvedValueOnce(answer('{"summ', "max_tokens")).mockResolvedValueOnce(answer('{"summary":"ok"}'));
    await expect(structuredCall(call)).resolves.toEqual({ summary: "ok" });
    expect(create.mock.calls[1][0].max_tokens).toBe(200);
  });

  it("return null and file an issue when the answer stays unparseable", async () => {
    const fetchMock = mockGitHub();
    create.mockResolvedValue(answer("not json"));
    await expect(structuredCall(call)).resolves.toBeNull();
    expect(create).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => expect(createdIssue(fetchMock)?.title).toMatch(/^Model call failed: claude-haiku-5-5 unparseable output/));
  });
});

describe("rejected requests", () => {
  beforeEach(() => {
    resetErrorReportingForTests();
    vi.stubEnv("GITHUB_NAME_PLANNER_ISSUES_TOKEN", "token");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("file an issue for a 400 the user sees with its code", async () => {
    const fetchMock = mockGitHub();
    const response = await handler(async () => {
      throw new HttpError(400, "Invalid request");
    })(new Request("http://localhost/api/preferences", { method: "POST" }));
    expect(response.status).toBe(400);
    await vi.waitFor(() => expect(createdIssue(fetchMock)?.title).toMatch(/^Request rejected with 400 in \/api\/preferences/));
  });

  it("do not file a 401, which the browser retries with a new session", async () => {
    const fetchMock = mockGitHub();
    await handler(async () => {
      throw new HttpError(401, "Missing or expired session");
    })(new Request("http://localhost/api/preferences", { method: "POST" }));
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
