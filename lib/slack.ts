// Posts a signup notification to a Slack Incoming Webhook.
// Silent no-op when SLACK_WEBHOOK_URL isn't set, so local dev doesn't error.
// 2-second timeout — Slack outages must never block the user's response.

import { tierFromEmployeeCount, tierLabel } from "./leadtier";

export type EnrichmentSummary = {
  company_name: string | null;
  industry: string | null;
  employee_count: number | null;
  country: string | null;
  linkedin_url: string | null;
};

export type SignupNotification = {
  full_name: string;
  work_email: string;
  company: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  first_utm_source: string | null;
  first_utm_medium: string | null;
  first_utm_campaign: string | null;
  referrer: string | null;
  enrichment?: EnrichmentSummary | null;
};

const SLACK_TIMEOUT_MS = 2000;

const fmt = (v: string | null | undefined) =>
  v && v.trim().length > 0 ? v : "—";

const fmtCount = (n: number | null | undefined) =>
  typeof n === "number" ? n.toLocaleString() : "—";

export async function notifySlackSignup(signup: SignupNotification): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return;

  const lastTouch = `${fmt(signup.utm_source)} / ${fmt(signup.utm_medium)} / ${fmt(signup.utm_campaign)}`;
  const firstTouch = `${fmt(signup.first_utm_source)} / ${fmt(signup.first_utm_medium)} / ${fmt(signup.first_utm_campaign)}`;

  const enr = signup.enrichment;
  const tier = enr ? tierFromEmployeeCount(enr.employee_count) : null;
  const headerText =
    tier && tier !== "unknown"
      ? `New waitlist signup — ${tierLabel(tier)}`
      : "New waitlist signup";

  const blocks: unknown[] = [
    {
      type: "header",
      text: { type: "plain_text", text: headerText },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Name*\n${signup.full_name}` },
        { type: "mrkdwn", text: `*Company*\n${signup.company}` },
        { type: "mrkdwn", text: `*Work email*\n${signup.work_email}` },
        { type: "mrkdwn", text: `*Referrer*\n${fmt(signup.referrer)}` },
      ],
    },
  ];

  if (enr) {
    blocks.push({
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Industry*\n${fmt(enr.industry)}` },
        { type: "mrkdwn", text: `*Employees*\n${fmtCount(enr.employee_count)}` },
        { type: "mrkdwn", text: `*Country*\n${fmt(enr.country)}` },
        {
          type: "mrkdwn",
          text: `*LinkedIn*\n${
            enr.linkedin_url ? `<${enr.linkedin_url}|View>` : "—"
          }`,
        },
      ],
    });
  }

  blocks.push({
    type: "section",
    fields: [
      {
        type: "mrkdwn",
        text: `*Last-touch (source / medium / campaign)*\n${lastTouch}`,
      },
      {
        type: "mrkdwn",
        text: `*First-touch (source / medium / campaign)*\n${firstTouch}`,
      },
    ],
  });

  const payload = {
    text: `${headerText}: ${signup.full_name} (${signup.company})`,
    blocks,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch {
    // Swallow: Slack outage must never fail the signup.
  } finally {
    clearTimeout(timer);
  }
}
