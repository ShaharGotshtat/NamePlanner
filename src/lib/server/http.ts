import { NextResponse } from "next/server";
import type { z } from "zod";
import { log, newRequestId, REQUEST_ID_HEADER, withRequestId } from "./request-id";
import { decodeToken, encodeToken, type SessionClaims } from "./token";

export const TOKEN_HEADER = "x-session-token";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function readBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new HttpError(400, "Invalid request");
  return parsed.data;
}

export function readSession(request: Request): SessionClaims {
  const claims = decodeToken(request.headers.get(TOKEN_HEADER));
  if (!claims) throw new HttpError(401, "Missing or expired session");
  return claims;
}

/**
 * Wraps a route handler: maps HttpError to its status and attaches the updated session token.
 * Every response carries a request ID header, and every error body carries the same ID as errorId.
 */
export function handler(run: (request: Request) => Promise<{ body: object; session?: SessionClaims }>) {
  return (request: Request) => {
    const requestId = newRequestId();
    const headers = { [REQUEST_ID_HEADER]: requestId };
    const fail = (status: number, error: string) =>
      NextResponse.json({ error, errorId: requestId }, { status, headers });

    return withRequestId(requestId, async () => {
      try {
        const { body, session } = await run(request);
        return NextResponse.json(session ? { ...body, token: encodeToken(session) } : body, { headers });
      } catch (error) {
        const path = new URL(request.url).pathname;
        if (error instanceof HttpError) {
          log.warn(`${path} ${error.status}: ${error.message}`);
          return fail(error.status, error.message);
        }
        log.error(`${path} 500`, error);
        return fail(500, "Server error");
      }
    });
  };
}
