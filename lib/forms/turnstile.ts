/**
 * Cloudflare Turnstile, checked on the server (developers.cloudflare.com/turnstile/get-started/server-side-validation).
 * Tokens are single-use, last 5 minutes and are at most 2,048 characters.
 */
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type Opts = { secret: string | undefined; fetch?: typeof fetch };

export async function verifyTurnstile(token: string, ip: string | null, { secret, fetch: f = fetch }: Opts): Promise<boolean> {
  // ponytail: no secret configured (dev, CI) → skipped; the honeypot and rate limit still apply.
  if (!secret) return true;
  if (!token || token.length > 2048) return false;
  try {
    const res = await f(SITEVERIFY, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5000),
    });
    const body = (await res.json()) as { success?: unknown };
    return body.success === true;
  } catch {
    return false;
  }
}
