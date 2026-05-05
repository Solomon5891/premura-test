-- Run this in the Supabase SQL editor. Idempotent — safe to re-run.
-- Tables: waitlist (domain), events (analytics), waitlist_stats (public counter).
-- RLS posture: anon can INSERT into waitlist+events, anon can SELECT only the
-- aggregate counter. Emails are never readable by anon — Realtime fires off
-- waitlist_stats instead of waitlist.

create extension if not exists "pgcrypto";

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  work_email text not null unique,
  company text not null,

  -- last-touch attribution (the visit that converted)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  gclid text,
  fbclid text,
  li_fat_id text,
  referrer text,
  landing_page text,

  -- first-touch attribution (the visit that brought them in)
  first_utm_source text,
  first_utm_medium text,
  first_utm_campaign text,
  first_utm_term text,
  first_utm_content text,
  first_gclid text,
  first_fbclid text,
  first_li_fat_id text,
  first_referrer text,
  first_landing_page text,
  first_seen_at timestamptz,

  anonymous_id text,
  created_at timestamptz not null default now()
);

-- Catch-up for tables that already existed before the wider attribution surface.
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

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid,
  properties jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_event_name_created_at_idx
  on events (event_name, created_at desc);

create table if not exists waitlist_stats (
  id int primary key default 1,
  total_signups int not null default 0,
  updated_at timestamptz not null default now(),
  constraint waitlist_stats_single_row check (id = 1)
);

insert into waitlist_stats (id, total_signups)
values (1, 0)
on conflict (id) do nothing;

create or replace function bump_waitlist_count()
returns trigger
language plpgsql
as $$
begin
  update waitlist_stats
  set total_signups = total_signups + 1,
      updated_at = now()
  where id = 1;
  return new;
end;
$$;

drop trigger if exists waitlist_increment on waitlist;
create trigger waitlist_increment
after insert on waitlist
for each row execute function bump_waitlist_count();

alter table waitlist enable row level security;
alter table events enable row level security;
alter table waitlist_stats enable row level security;

drop policy if exists "anon insert waitlist" on waitlist;
create policy "anon insert waitlist" on waitlist
  for insert to anon with check (true);

drop policy if exists "anon insert events" on events;
create policy "anon insert events" on events
  for insert to anon with check (true);

drop policy if exists "anon read stats" on waitlist_stats;
create policy "anon read stats" on waitlist_stats
  for select to anon using (true);

-- Realtime: only publish the aggregate row, never the PII table.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'waitlist_stats'
  ) then
    alter publication supabase_realtime add table waitlist_stats;
  end if;
end $$;
