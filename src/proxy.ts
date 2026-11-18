import { NextResponse, type NextRequest } from "next/server";

/**
 * The dashboard asks for a password (HTTP basic auth, any user name) set in ADMIN_PASSWORD.
 * Without it the dashboard does not exist.
 */
export function proxy(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return new NextResponse(null, { status: 404 });

  const header = request.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  const given = scheme === "Basic" && encoded ? atob(encoded).split(":").slice(1).join(":") : "";
  if (safeEqual(given, password)) return NextResponse.next();

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Name Planner dashboard", charset="UTF-8"' },
  });
}

function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
