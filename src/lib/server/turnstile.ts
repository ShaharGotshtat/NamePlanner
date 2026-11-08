import { log } from "./request-id";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** On when the secret is set. Without it (local dev, tests) every new session is allowed. */
export const turnstileEnabled = () => !!process.env.TURNSTILE_SECRET_KEY;

/** Checks a Cloudflare Turnstile token, so a script cannot open sessions in bulk and spend the daily budget. */
export async function verifyTurnstile(token: string | undefined, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!result.success) log.warn(`turnstile rejected: ${result["error-codes"]?.join(", ") ?? response.status}`);
    return result.success === true;
  } catch (error) {
    // Fail closed: a session without a check could spend the budget.
    log.error("turnstile check failed", error);
    return false;
  }
}
