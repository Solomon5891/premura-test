const ANON_KEY = "premura_anon_id";

export type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  anonymous_id: string;
};

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
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      referrer: null,
      anonymous_id: "",
    };
  }
  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || null;
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    referrer,
    anonymous_id: getOrCreateAnonId(),
  };
}
