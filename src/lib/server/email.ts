/** Sends a plain-text email through Resend. Returns false when email is not configured. */
export async function sendOwnerEmail(subject: string, text: string): Promise<boolean> {
  const { RESEND_API_KEY, EMAIL_FROM, OWNER_EMAILS } = process.env;
  if (!RESEND_API_KEY || !EMAIL_FROM || !OWNER_EMAILS) {
    console.warn(`Email not configured, skipped: ${subject}`);
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to: OWNER_EMAILS.split(",").map((e) => e.trim()), subject, text }),
  });
  if (!response.ok) throw new Error(`Email failed with ${response.status}: ${await response.text()}`);
  return true;
}
