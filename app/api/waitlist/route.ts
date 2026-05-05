import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { notifySlackSignup } from "@/lib/slack";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { enrichByDomain, extractDomainFromEmail } from "@/lib/enrich";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

type Body = {
  full_name?: string;
  work_email?: string;
  company?: string;
  anonymous_id?: string;
  turnstile_token?: string | null;

  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  li_fat_id?: string | null;
  referrer?: string | null;
  landing_page?: string | null;

  first_utm_source?: string | null;
  first_utm_medium?: string | null;
  first_utm_campaign?: string | null;
  first_utm_term?: string | null;
  first_utm_content?: string | null;
  first_gclid?: string | null;
  first_fbclid?: string | null;
  first_li_fat_id?: string | null;
  first_referrer?: string | null;
  first_landing_page?: string | null;
  first_seen_at?: string | null;
};

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "li_fat_id",
  "referrer",
  "landing_page",
  "first_utm_source",
  "first_utm_medium",
  "first_utm_campaign",
  "first_utm_term",
  "first_utm_content",
  "first_gclid",
  "first_fbclid",
  "first_li_fat_id",
  "first_referrer",
  "first_landing_page",
  "first_seen_at",
] as const;

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // 1) Rate limit
  const rl = await checkRateLimit(ip);
  if (!rl.ok) {
    const retryAfter = rl.reset
      ? Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))
      : 3600;
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "retry-after": String(retryAfter) } }
    );
  }

  // 2) Parse
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 3) Turnstile
  const turnstile = await verifyTurnstileToken(body.turnstile_token, ip);
  if (!turnstile.ok) {
    const supabase = getSupabaseServer();
    await supabase.from("events").insert({
      event_name: "signup_blocked",
      properties: {
        reason: "turnstile_failed",
        error_code: turnstile.reason ?? "unknown",
      },
    });
    return NextResponse.json(
      { error: "Verification failed. Please refresh and try again." },
      { status: 403 }
    );
  }

  // 4) Field validation
  const full_name = body.full_name?.trim() ?? "";
  const work_email = body.work_email?.trim().toLowerCase() ?? "";
  const company = body.company?.trim() ?? "";

  if (full_name.length < 2) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (!EMAIL_RE.test(work_email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  const domain = work_email.split("@")[1];
  if (FREE_EMAIL_DOMAINS.has(domain)) {
    return NextResponse.json(
      { error: "Please use your work email (not a personal address)." },
      { status: 400 }
    );
  }
  if (company.length < 2) {
    return NextResponse.json({ error: "Please enter your company." }, { status: 400 });
  }

  // 5) Enrichment by work-email domain. Silent no-op if APOLLO_API_KEY unset.
  //    We block the response on this (3s max) so the Slack notification arrives
  //    enriched — sales sees Enterprise tier inline rather than waiting on a
  //    follow-up update.
  const enrichment = await enrichByDomain(extractDomainFromEmail(work_email));

  const attribution: Record<string, string | null> = {};
  for (const key of ATTRIBUTION_KEYS) {
    attribution[key] = body[key] ?? null;
  }

  const supabase = getSupabaseServer();

  // 6) Insert
  const { data: inserted, error: insertErr } = await supabase
    .from("waitlist")
    .insert({
      full_name,
      work_email,
      company,
      anonymous_id: body.anonymous_id ?? null,
      ...attribution,
      enriched_company_name: enrichment?.company_name ?? null,
      enriched_industry: enrichment?.industry ?? null,
      enriched_employee_count: enrichment?.employee_count ?? null,
      enriched_annual_revenue: enrichment?.annual_revenue ?? null,
      enriched_country: enrichment?.country ?? null,
      enriched_linkedin_url: enrichment?.linkedin_url ?? null,
      enrichment_provider: enrichment?.provider ?? null,
      enriched_at: enrichment ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json(
        { error: "You're already on the list." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Could not save signup." }, { status: 500 });
  }

  // 7) Analytics + ops notification, in parallel.
  await Promise.allSettled([
    supabase.from("events").insert({
      event_name: "waitlist_signup",
      user_id: inserted.id,
      properties: {
        work_email,
        company,
        anonymous_id: body.anonymous_id ?? null,
        ...attribution,
        enrichment: enrichment ?? null,
      },
    }),
    notifySlackSignup({
      full_name,
      work_email,
      company,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      first_utm_source: attribution.first_utm_source,
      first_utm_medium: attribution.first_utm_medium,
      first_utm_campaign: attribution.first_utm_campaign,
      referrer: attribution.referrer,
      enrichment: enrichment
        ? {
            company_name: enrichment.company_name,
            industry: enrichment.industry,
            employee_count: enrichment.employee_count,
            country: enrichment.country,
            linkedin_url: enrichment.linkedin_url,
          }
        : null,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
