import { createClient } from "@supabase/supabase-js";

// Server-only client using the service-role key. Bypasses RLS so the admin
// dashboard can read waitlist rows that the anon role intentionally cannot
// SELECT. Never import this from a client component or route reachable
// without auth.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      "Supabase admin client missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}
