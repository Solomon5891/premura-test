"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";
import { track } from "@/lib/track";

export default function PageViewTracker() {
  useEffect(() => {
    const attr = captureAttribution();
    track("page_view", {
      first_utm_source: attr.first.utm_source,
      first_utm_medium: attr.first.utm_medium,
      first_utm_campaign: attr.first.utm_campaign,
      utm_source: attr.last.utm_source,
      utm_medium: attr.last.utm_medium,
      utm_campaign: attr.last.utm_campaign,
      gclid: attr.last.gclid,
      fbclid: attr.last.fbclid,
      li_fat_id: attr.last.li_fat_id,
      referrer: attr.last.referrer,
      landing_page: attr.last.landing_page,
    });
  }, []);

  return null;
}
