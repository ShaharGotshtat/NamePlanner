import { describe, expect, it } from "vitest";
import { decodeToken, encodeToken, LIMITS, newSession } from "@/lib/server/token";

describe("session token", () => {
  it("round-trips the limit counters", () => {
    const session = { ...newSession(), calls: 4, flags: 1 };
    expect(decodeToken(encodeToken(session))).toEqual(session);
  });

  it("rejects a token whose counters were changed", () => {
    const [payload, signature] = encodeToken({ ...newSession(), calls: 19 }).split(".");
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, "base64url").toString()), calls: 0 })).toString("base64url");
    expect(decodeToken(`${forged}.${signature}`)).toBeNull();
  });

  it("expires after a day", () => {
    const session = newSession(0);
    expect(decodeToken(encodeToken(session), LIMITS.sessionTtlMs + 1)).toBeNull();
  });
});
