-- Run this in the Supabase SQL editor.
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
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  anonymous_id text,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid,
  properties jsonb,
  created_at timestamptz not null default now()
);

create table if not exists waitlist_stats (
  id int primary key default 1,
  total_signups int not null default 0,
  updated_at timestamptz not null default now(),
  constraint waitlist_stats_single_row check (id = 1)
);

insert into waitlist_stats (id, total_signups)
values (1, 0)
on conflict (id) do nothing;

-- Keep the public counter in sync via trigger so we never have to expose
-- waitlist rows to anon for Realtime to work.
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

-- RLS
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
alter publication supabase_realtime add table waitlist_stats;
