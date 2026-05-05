// Provider-agnostic enrichment shim. Apollo is the default provider.
// Silent no-op when APOLLO_API_KEY is unset (dev) — caller still works.
// 3-second timeout — a slow enrichment must never block the user response.

export type EnrichmentResult = {
  provider: string;
  company_name: string | null;
  industry: string | null;
  employee_count: number | null;
  annual_revenue: number | null;
  country: string | null;
  linkedin_url: string | null;
};

type ApolloOrg = {
  name?: string;
  industry?: string;
  estimated_num_employees?: number;
  annual_revenue?: number;
  country?: string;
  linkedin_url?: string;
};

const APOLLO_URL = "https://api.apollo.io/api/v1/organizations/enrich";
const TIMEOUT_MS = 3000;

const PERSONAL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

export function extractDomainFromEmail(email: string): string | null {
  const at = email.indexOf("@");
  if (at < 0) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return null;
  if (PERSONAL_DOMAINS.has(domain)) return null;
  return domain;
}

export async function enrichByDomain(
  domain: string | null
): Promise<EnrichmentResult | null> {
  if (!domain) return null;
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(APOLLO_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ domain }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { organization?: ApolloOrg };
    const o = json.organization;
    if (!o) return null;
    return {
      provider: "apollo",
      company_name: o.name ?? null,
      industry: o.industry ?? null,
      employee_count:
        typeof o.estimated_num_employees === "number"
          ? o.estimated_num_employees
          : null,
      annual_revenue:
        typeof o.annual_revenue === "number" ? o.annual_revenue : null,
      country: o.country ?? null,
      linkedin_url: o.linkedin_url ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
