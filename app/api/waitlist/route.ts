import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

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
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  anonymous_id?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

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

  const supabase = getSupabaseServer();

  const { data: inserted, error: insertErr } = await supabase
    .from("waitlist")
    .insert({
      full_name,
      work_email,
      company,
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      referrer: body.referrer ?? null,
      anonymous_id: body.anonymous_id ?? null,
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

  await supabase.from("events").insert({
    event_name: "waitlist_signup",
    user_id: inserted.id,
    properties: {
      work_email,
      company,
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      referrer: body.referrer ?? null,
      anonymous_id: body.anonymous_id ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
