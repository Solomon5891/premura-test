create table waitlist (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null unique,
  company text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  created_at timestamptz default now()
);
alter table waitlist enable row level security;
create policy "Enable insert for everyone" on waitlist for insert with check (true);
