import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { tierFromEmployeeCount, tierLabel } from "@/lib/leadtier";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type WaitlistRow = {
  id: string;
  full_name: string | null;
  work_email: string;
  company: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  enriched_industry: string | null;
  enriched_employee_count: number | null;
  created_at: string;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function countBy<T>(rows: T[], key: (r: T) => string): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminPage() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("waitlist")
    .select(
      "id, full_name, work_email, company, utm_source, utm_medium, utm_campaign, referrer, enriched_industry, enriched_employee_count, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-4 rounded border border-red-900 bg-red-950/50 p-4 text-red-200">
          Could not load waitlist: {error.message}
        </p>
      </main>
    );
  }

  const rows = (data ?? []) as WaitlistRow[];
  const now = Date.now();
  const total = rows.length;
  const last24h = rows.filter(
    (r) => now - new Date(r.created_at).getTime() < DAY
  ).length;
  const last7d = rows.filter(
    (r) => now - new Date(r.created_at).getTime() < 7 * DAY
  ).length;

  const sourceCounts = countBy(rows, (r) => r.utm_source ?? "(direct)");
  const mediumCounts = countBy(rows, (r) => r.utm_medium ?? "(none)");
  const campaignCounts = countBy(rows, (r) => r.utm_campaign ?? "(none)");
  const tierCounts = countBy(rows, (r) =>
    tierLabel(tierFromEmployeeCount(r.enriched_employee_count))
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Waitlist admin
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Live data from <code className="text-neutral-300">waitlist</code>.
              Read via service-role key.
            </p>
          </div>
          <div className="text-xs text-neutral-500">
            Loaded {fmtDate(new Date().toISOString())}
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Kpi label="Total signups" value={total} />
          <Kpi label="Last 24 hours" value={last24h} />
          <Kpi label="Last 7 days" value={last7d} />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Breakdown title="Source" rows={sourceCounts} total={total} />
          <Breakdown title="Medium" rows={mediumCounts} total={total} />
          <Breakdown title="Campaign" rows={campaignCounts} total={total} />
          <Breakdown title="Lead tier" rows={tierCounts} total={total} />
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Recent signups</h2>
          <div className="overflow-x-auto rounded-lg border border-neutral-800">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-900 text-left text-neutral-400">
                <tr>
                  <Th>When</Th>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Company</Th>
                  <Th>Source / Medium / Campaign</Th>
                  <Th>Industry</Th>
                  <Th>Employees</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {rows.slice(0, 100).map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-900/60">
                    <Td className="whitespace-nowrap text-neutral-400">
                      {fmtDate(r.created_at)}
                    </Td>
                    <Td>{r.full_name ?? "—"}</Td>
                    <Td className="font-mono text-xs text-neutral-300">
                      {r.work_email}
                    </Td>
                    <Td>{r.company ?? "—"}</Td>
                    <Td className="text-neutral-400">
                      {r.utm_source ?? "(direct)"} /{" "}
                      {r.utm_medium ?? "—"} /{" "}
                      {r.utm_campaign ?? "—"}
                    </Td>
                    <Td>{r.enriched_industry ?? "—"}</Td>
                    <Td>{r.enriched_employee_count ?? "—"}</Td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-neutral-500"
                    >
                      No signups yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {rows.length > 100 && (
            <p className="mt-2 text-xs text-neutral-500">
              Showing 100 most recent of {rows.length}.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  total,
}: {
  title: string;
  rows: Array<[string, number]>;
  total: number;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-5">
      <h3 className="mb-3 text-sm font-semibold text-neutral-300">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No data.</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 8).map(([label, count]) => {
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <li key={label} className="text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-neutral-200">{label}</span>
                  <span className="tabular-nums text-neutral-400">
                    {count}{" "}
                    <span className="text-xs text-neutral-600">
                      ({pct.toFixed(0)}%)
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-neutral-800">
                  <div
                    className="h-full bg-neutral-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-xs font-medium uppercase tracking-wide">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 ${className}`}>{children}</td>;
}
