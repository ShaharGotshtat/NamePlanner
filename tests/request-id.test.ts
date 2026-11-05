import { afterEach, describe, expect, it, vi } from "vitest";
import { withErrorId } from "@/lib/client/api";
import { handler, HttpError } from "@/lib/server/http";
import { currentRequestId, newRequestId } from "@/lib/server/request-id";

const request = () => new Request("http://localhost/api/test", { method: "POST" });

describe("request IDs", () => {
  afterEach(() => vi.restoreAllMocks());

  it("are 8 unambiguous characters", () => {
    expect(newRequestId()).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
  });

  it("are returned in the error body and header, and logged with the error", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handler(async () => {
      throw new Error("boom");
    })(request());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.errorId).toBe(response.headers.get("x-request-id"));
    expect(logged.mock.calls[0][0]).toBe(`[req ${body.errorId}]`);
  });

  it("keep the status of an HttpError", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await handler(async () => {
      throw new HttpError(400, "Invalid request");
    })(request());
    expect(response.status).toBe(400);
    expect((await response.json()).errorId).toMatch(/^\w{8}$/);
  });

  it("are available to the route while it runs", async () => {
    const response = await handler(async () => ({ body: { seen: currentRequestId() } }))(request());
    expect((await response.json()).seen).toBe(response.headers.get("x-request-id"));
  });

  it("are appended to user messages only when known", () => {
    expect(withErrorId("משהו השתבש.", "ABCD2345")).toBe("משהו השתבש. (קוד תקלה: ABCD2345)");
    expect(withErrorId("משהו השתבש.", null)).toBe("משהו השתבש.");
  });
});
