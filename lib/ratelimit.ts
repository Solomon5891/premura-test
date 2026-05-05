import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let cached: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (cached) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  cached = new Ratelimit({
    redis: new Redis({ url, token }),
    // 10 signups per IP per hour. Generous enough that a sales team signing
    // up after a webinar (NAT'd IP) won't trip it; tight enough to stop bots.
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "premura:waitlist",
  });
  return cached;
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri;
  return "anonymous";
}

export async function checkRateLimit(
  identifier: string
): Promise<{ ok: boolean; reset?: number }> {
  const rl = getRatelimit();
  if (!rl) return { ok: true };
  try {
    const result = await rl.limit(identifier);
    return { ok: result.success, reset: result.reset };
  } catch {
    // Fail open — an Upstash outage must not block legitimate signups.
    // Turnstile is the primary bot defense; rate limit is belt-and-braces.
    return { ok: true };
  }
}
