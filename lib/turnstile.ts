// Verifies a Cloudflare Turnstile token server-side.
// Fails CLOSED on any verification error — a Turnstile outage must not let
// bots through, even at the cost of false negatives during the outage.

type VerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
};

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 3000;

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string
): Promise<{ ok: boolean; reason?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true }; // not configured (dev) — allow

  if (!token) return { ok: false, reason: "missing_token" };

  const body = new URLSearchParams();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp && remoteIp !== "anonymous") body.append("remoteip", remoteIp);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: controller.signal,
    });
    const json = (await res.json()) as VerifyResponse;
    if (json.success) return { ok: true };
    return { ok: false, reason: (json["error-codes"] ?? ["unknown"]).join(",") };
  } catch {
    return { ok: false, reason: "verify_failed" };
  } finally {
    clearTimeout(timer);
  }
}
