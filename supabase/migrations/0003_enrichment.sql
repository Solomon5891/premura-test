-- 0003: Email-domain enrichment columns (company size + industry + revenue + LinkedIn).
-- Stored raw; lead tier is computed at read time so GTM can re-tune without migrations.
-- Idempotent.

alter table waitlist add column if not exists enriched_company_name text;
alter table waitlist add column if not exists enriched_industry text;
alter table waitlist add column if not exists enriched_employee_count int;
alter table waitlist add column if not exists enriched_annual_revenue bigint;
alter table waitlist add column if not exists enriched_country text;
alter table waitlist add column if not exists enriched_linkedin_url text;
alter table waitlist add column if not exists enrichment_provider text;
alter table waitlist add column if not exists enriched_at timestamptz;

-- Useful index for sales prioritization queries (Enterprise/Mid-market filters).
create index if not exists waitlist_enriched_employee_count_idx
  on waitlist (enriched_employee_count desc nulls last);
