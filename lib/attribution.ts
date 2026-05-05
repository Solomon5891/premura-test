const ANON_KEY = "premura_anon_id";
const FIRST_KEY = "premura_first_attribution";

export type TouchAttribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  fbclid: string | null;
  li_fat_id: string | null;
  referrer: string | null;
  landing_page: string | null;
};

export type Attribution = {
  anonymous_id: string;
  first: TouchAttribution;
  first_seen_at: string | null;
  last: TouchAttribution;
};

function emptyTouch(): TouchAttribution {
  return {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_term: null,
    utm_content: null,
    gclid: null,
    fbclid: null,
    li_fat_id: null,
    referrer: null,
    landing_page: null,
  };
}

function readCurrentTouch(): TouchAttribution {
  const params = new URLSearchParams(window.location.search);
  const get = (k: string) => params.get(k);
  return {
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    utm_term: get("utm_term"),
    utm_content: get("utm_content"),
    gclid: get("gclid"),
    fbclid: get("fbclid"),
    li_fat_id: get("li_fat_id"),
    referrer: document.referrer || null,
    landing_page:
      window.location.pathname + (window.location.search || "") || null,
  };
}

export function getOrCreateAnonId(): string {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(ANON_KEY);
  if (existing) return existing;
  const fresh =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(ANON_KEY, fresh);
  return fresh;
}

export function captureAttribution(): Attribution {
  if (typeof window === "undefined") {
    return {
      anonymous_id: "",
      first: emptyTouch(),
      first_seen_at: null,
      last: emptyTouch(),
    };
  }

  const anonymous_id = getOrCreateAnonId();
  const last = readCurrentTouch();

  let first: TouchAttribution;
  let first_seen_at: string;

  const stored = window.localStorage.getItem(FIRST_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as {
        touch: TouchAttribution;
        at: string;
      };
      first = parsed.touch;
      first_seen_at = parsed.at;
    } catch {
      first = last;
      first_seen_at = new Date().toISOString();
      window.localStorage.setItem(
        FIRST_KEY,
        JSON.stringify({ touch: first, at: first_seen_at })
      );
    }
  } else {
    first = last;
    first_seen_at = new Date().toISOString();
    window.localStorage.setItem(
      FIRST_KEY,
      JSON.stringify({ touch: first, at: first_seen_at })
    );
  }

  return { anonymous_id, first, first_seen_at, last };
}

export function flattenForApi(attr: Attribution) {
  return {
    anonymous_id: attr.anonymous_id,
    utm_source: attr.last.utm_source,
    utm_medium: attr.last.utm_medium,
    utm_campaign: attr.last.utm_campaign,
    utm_term: attr.last.utm_term,
    utm_content: attr.last.utm_content,
    gclid: attr.last.gclid,
    fbclid: attr.last.fbclid,
    li_fat_id: attr.last.li_fat_id,
    referrer: attr.last.referrer,
    landing_page: attr.last.landing_page,
    first_utm_source: attr.first.utm_source,
    first_utm_medium: attr.first.utm_medium,
    first_utm_campaign: attr.first.utm_campaign,
    first_utm_term: attr.first.utm_term,
    first_utm_content: attr.first.utm_content,
    first_gclid: attr.first.gclid,
    first_fbclid: attr.first.fbclid,
    first_li_fat_id: attr.first.li_fat_id,
    first_referrer: attr.first.referrer,
    first_landing_page: attr.first.landing_page,
    first_seen_at: attr.first_seen_at,
  };
}
