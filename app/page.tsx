import { Suspense } from "react";
import WaitlistForm from "@/components/WaitlistForm";
import SignupCounter from "@/components/SignupCounter";
import PageViewTracker from "@/components/PageViewTracker";
import { getSupabaseServer } from "@/lib/supabase-server";

export const revalidate = 0;

async function getInitialCount(): Promise<number> {
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from("waitlist_stats")
      .select("total_signups")
      .eq("id", 1)
      .single();
    return data?.total_signups ?? 0;
  } catch {
    return 0;
  }
}

export default async function Page() {
  const initial = await getInitialCount();

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.15),_transparent_60%),_radial-gradient(ellipse_at_bottom,_rgba(168,85,247,0.12),_transparent_60%)] bg-neutral-950 text-white">
      <PageViewTracker />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="text-sm font-semibold tracking-wide text-white/80">
            Premura
          </div>
          <Suspense fallback={null}>
            <SignupCounter initial={initial} />
          </Suspense>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-300/80">
              Private beta · B2B
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Revenue attribution your CFO can actually defend.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/70">
              Premura unifies pipeline, ad spend, and product usage into a single
              source of truth — so you can stop arguing about which channel
              closed the deal.
            </p>
            <ul className="mt-8 space-y-2 text-sm text-white/60">
              <li>· Multi-touch attribution across paid, organic, and outbound</li>
              <li>· Native Salesforce + HubSpot + Segment connectors</li>
              <li>· Audit-grade exports for finance and board reporting</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur md:p-8">
            <h2 className="text-xl font-semibold">Get early access</h2>
            <p className="mt-1 text-sm text-white/60">
              Limited to 50 design partners this quarter.
            </p>
            <div className="mt-6">
              <WaitlistForm />
            </div>
            <p className="mt-4 text-xs text-white/40">
              We'll only email you about Premura. Unsubscribe anytime.
            </p>
          </div>
        </section>

        <footer className="mt-auto pt-10 text-xs text-white/40">
          © {new Date().getFullYear()} Premura. All rights reserved.
        </footer>
      </div>
    </main>
  );
}
