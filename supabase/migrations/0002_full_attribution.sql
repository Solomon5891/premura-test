-- 0002: Wider attribution surface + first-touch tracking + events index.
-- Idempotent. Run only if you previously applied the original schema.sql.

alter table waitlist add column if not exists utm_term text;
alter table waitlist add column if not exists utm_content text;
alter table waitlist add column if not exists gclid text;
alter table waitlist add column if not exists fbclid text;
alter table waitlist add column if not exists li_fat_id text;
alter table waitlist add column if not exists landing_page text;

alter table waitlist add column if not exists first_utm_source text;
alter table waitlist add column if not exists first_utm_medium text;
alter table waitlist add column if not exists first_utm_campaign text;
alter table waitlist add column if not exists first_utm_term text;
alter table waitlist add column if not exists first_utm_content text;
alter table waitlist add column if not exists first_gclid text;
alter table waitlist add column if not exists first_fbclid text;
alter table waitlist add column if not exists first_li_fat_id text;
alter table waitlist add column if not exists first_referrer text;
alter table waitlist add column if not exists first_landing_page text;
alter table waitlist add column if not exists first_seen_at timestamptz;

create index if not exists events_event_name_created_at_idx
  on events (event_name, created_at desc);
