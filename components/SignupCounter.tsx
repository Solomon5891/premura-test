"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function SignupCounter({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    supabase
      .from("waitlist_stats")
      .select("total_signups")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data?.total_signups != null) setCount(data.total_signups);
      });

    const channel = supabase
      .channel("waitlist-stats")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "waitlist_stats", filter: "id=eq.1" },
        (payload) => {
          const next = (payload.new as { total_signups?: number }).total_signups;
          if (typeof next === "number") setCount(next);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <span>
        <span className="font-semibold text-white">{count.toLocaleString()}</span>{" "}
        teams already on the waitlist
      </span>
    </div>
  );
}
