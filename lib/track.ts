import { getSupabaseBrowser } from "./supabase-browser";
import { getOrCreateAnonId } from "./attribution";

export type EventName =
  | "page_view"
  | "form_focus"
  | "form_field_blur"
  | "form_submit_attempt"
  | "form_validation_error"
  | "waitlist_signup_client";

export async function track(
  event_name: EventName,
  properties: Record<string, unknown> = {}
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const supabase = getSupabaseBrowser();
    await supabase.from("events").insert({
      event_name,
      properties: {
        ...properties,
        anonymous_id: getOrCreateAnonId(),
        path: window.location.pathname,
      },
    });
  } catch {
    // Analytics must never break the UX. Swallow.
  }
}
