import { NextResponse } from "next/server";
import type { z } from "zod";
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

/** Wraps a route handler: maps HttpError to its status and attaches the updated session token. */
export function handler(run: (request: Request) => Promise<{ body: object; session?: SessionClaims }>) {
  return async (request: Request) => {
    try {
      const { body, session } = await run(request);
      return NextResponse.json(session ? { ...body, token: encodeToken(session) } : body);
    } catch (error) {
      if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
      console.error(error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  };
}
