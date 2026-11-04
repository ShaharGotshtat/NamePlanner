import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/** Limit counters for one session. Signed so the client cannot change them; holds no names or preferences. */
export interface SessionClaims {
  sid: string;
  iat: number;
  calls: number;
  flags: number;
  reports: number[];
}

export const LIMITS = {
  callsPerSession: 20,
  flagsBeforeFreeTextOff: 2,
  reportsPerHour: 5,
  sessionTtlMs: 24 * 60 * 60 * 1000,
};

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
  return "dev-only-session-secret";
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function newSession(now = Date.now()): SessionClaims {
  return { sid: randomUUID(), iat: now, calls: 0, flags: 0, reports: [] };
}

export function encodeToken(claims: SessionClaims): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeToken(token: string | null, now = Date.now()): SessionClaims | null {
  const [payload, signature] = token?.split(".") ?? [];
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionClaims;
  return now - claims.iat > LIMITS.sessionTtlMs ? null : claims;
}

export const canCallModel = (c: SessionClaims) => c.calls < LIMITS.callsPerSession;
export const freeTextAllowed = (c: SessionClaims) => c.flags < LIMITS.flagsBeforeFreeTextOff;
