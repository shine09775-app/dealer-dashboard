-- Supabase / PostgreSQL schema for Dealer Dashboard
-- Run this file in Supabase SQL Editor.

begin;

set search_path = public;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'dashboard_event_type') then
    create type public.dashboard_event_type as enum (
      'SITE_PENDING',
      'QUOTE_SENT',
      'ADD_PRODUCT',
      'BOOKING_REQUEST',
      'BOOKING_CONFIRMED',
      'INVOICE_CREATED',
      'PAYMENT_PENDING',
      'PAYMENT_CONFIRMED',
      'DISPATCH_LIVE',
      'CUSTOMER_ACTION',
      'POUR_REMINDER'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'dashboard_severity') then
    create type public.dashboard_severity as enum ('ALERT', 'WARN', 'INFO');
  end if;
end $$;

create table if not exists public.dealers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  company_name text not null,
  app_title text not null default 'Dealer Daily Activity Dashboard',
  portal_subtitle text not null default 'Activity Dashboard "ร้านผู้แทนจำหน่าย"',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dealer_members (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  unique (dealer_id, user_id)
);

create table if not exists public.dealer_settings (
  dealer_id uuid primary key references public.dealers(id) on delete cascade,
  login_username text not null default 'dealer01',
  -- Keep as hash when used in production.
  login_password_hash text not null default '1234',
  page_size integer not null default 25 check (page_size between 5 and 200),
  initial_event_count integer not null default 60 check (initial_event_count between 10 and 500),
  refresh_new_event_min integer not null default 0 check (refresh_new_event_min between 0 and 50),
  refresh_new_event_max integer not null default 3 check (refresh_new_event_max between 0 and 50),
  default_auto_refresh_seconds integer not null default 30 check (default_auto_refresh_seconds between 0 and 3600),
  auto_refresh_options integer[] not null default array[0,15,30,60,300],
  show_changed_only_default boolean not null default false,
  enabled_event_types public.dashboard_event_type[] not null default array[
    'SITE_PENDING',
    'QUOTE_SENT',
    'ADD_PRODUCT',
    'BOOKING_REQUEST',
    'BOOKING_CONFIRMED',
    'INVOICE_CREATED',
    'PAYMENT_PENDING',
    'PAYMENT_CONFIRMED',
    'DISPATCH_LIVE',
    'CUSTOMER_ACTION',
    'POUR_REMINDER'
  ]::public.dashboard_event_type[],
  provinces text[] not null default '{}'::text[],
  customers text[] not null default '{}'::text[],
  products text[] not null default '{}'::text[],
  plants text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  event_code text unique,
  occurred_at timestamptz not null,
  event_type public.dashboard_event_type not null,
  severity public.dashboard_severity not null,
  is_new boolean not null default false,
  is_changed boolean not null default false,

  customer_line_name text,
  customer_phone text,

  site_code text,
  site_project_name text,
  site_province text,
  site_map_url text,

  quote_no text,
  quote_items_summary text,
  quote_customer_price numeric(14,2),
  quote_dealer_price numeric(14,2),
  quote_margin numeric(14,2),

  booking_id text,
  booking_pour_datetime timestamptz,
  booking_product text,
  booking_qty_m3 numeric(10,2),
  booking_truck_type text,
  booking_plant text,

  invoice_no text,
  invoice_total numeric(14,2),
  invoice_status text,

  status_current_state text,
  status_previous_state text,
  key_detail text,

  is_done boolean not null default false,
  done_by text,
  done_at timestamptz,

  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_pour_jobs (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  pour_date date,
  pour_start_time time,
  booking_no text,
  po_status text,
  agency text,
  contractor text,
  product_code text,
  booked_qty numeric(10,2) not null default 0,
  confirmed_qty numeric(10,2) not null default 0,
  poured_qty numeric(10,2) not null default 0,
  pending_qty numeric(10,2) not null default 0,
  pump text,
  discount_text text,
  booked_by text,
  po_approve_note text,
  payment_term text,
  booking_status text,
  booking_date date,
  tracking_order_no text,
  tracking_url text generated always as (
    case
      when nullif(trim(tracking_order_no), '') is not null
        then 'https://bluenet.scg.com/sda/#/dp-list?orderNo=' || trim(tracking_order_no)
      else null
    end
  ) stored,
  source_file_name text,
  source_row_no integer,
  raw_row jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigserial primary key,
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  event_id uuid references public.activity_events(id) on delete set null,
  action text not null,
  summary text,
  actor_name text,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_events_dealer_occurred
  on public.activity_events (dealer_id, occurred_at desc);
create index if not exists idx_activity_events_type
  on public.activity_events (event_type);
create index if not exists idx_activity_events_severity
  on public.activity_events (severity);
create index if not exists idx_activity_events_booking
  on public.activity_events (booking_id);
create index if not exists idx_activity_events_site
  on public.activity_events (site_code);

create index if not exists idx_daily_pour_jobs_dealer_date
  on public.daily_pour_jobs (dealer_id, pour_date desc);
create index if not exists idx_daily_pour_jobs_agency
  on public.daily_pour_jobs (agency);
create index if not exists idx_daily_pour_jobs_tracking_order_no
  on public.daily_pour_jobs (tracking_order_no);
create unique index if not exists uq_daily_pour_jobs_dedup
  on public.daily_pour_jobs (
    dealer_id,
    coalesce(pour_date, '1900-01-01'::date),
    coalesce(booking_no, ''),
    coalesce(product_code, ''),
    coalesce(source_row_no, 0)
  );

create index if not exists idx_audit_logs_dealer_created
  on public.audit_logs (dealer_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_dealers_updated_at on public.dealers;
create trigger trg_dealers_updated_at
before update on public.dealers
for each row execute function public.set_updated_at();

drop trigger if exists trg_dealer_settings_updated_at on public.dealer_settings;
create trigger trg_dealer_settings_updated_at
before update on public.dealer_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_activity_events_updated_at on public.activity_events;
create trigger trg_activity_events_updated_at
before update on public.activity_events
for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_pour_jobs_updated_at on public.daily_pour_jobs;
create trigger trg_daily_pour_jobs_updated_at
before update on public.daily_pour_jobs
for each row execute function public.set_updated_at();

alter table public.dealers enable row level security;
alter table public.dealer_members enable row level security;
alter table public.dealer_settings enable row level security;
alter table public.activity_events enable row level security;
alter table public.daily_pour_jobs enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists dealers_select_member on public.dealers;
create policy dealers_select_member
on public.dealers
for select
using (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = dealers.id
      and m.user_id = auth.uid()
  )
);

drop policy if exists dealers_update_admin on public.dealers;
create policy dealers_update_admin
on public.dealers
for update
using (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = dealers.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = dealers.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

drop policy if exists dealer_members_select_own on public.dealer_members;
create policy dealer_members_select_own
on public.dealer_members
for select
using (user_id = auth.uid());

drop policy if exists dealer_settings_rw_member on public.dealer_settings;
create policy dealer_settings_rw_member
on public.dealer_settings
for all
using (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = dealer_settings.dealer_id
      and m.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = dealer_settings.dealer_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

drop policy if exists activity_events_select_member on public.activity_events;
create policy activity_events_select_member
on public.activity_events
for select
using (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = activity_events.dealer_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists activity_events_insert_operator on public.activity_events;
create policy activity_events_insert_operator
on public.activity_events
for insert
with check (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = activity_events.dealer_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'operator')
  )
);

drop policy if exists activity_events_update_admin on public.activity_events;
create policy activity_events_update_admin
on public.activity_events
for update
using (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = activity_events.dealer_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = activity_events.dealer_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

drop policy if exists daily_pour_jobs_select_member on public.daily_pour_jobs;
create policy daily_pour_jobs_select_member
on public.daily_pour_jobs
for select
using (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = daily_pour_jobs.dealer_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists daily_pour_jobs_insert_operator on public.daily_pour_jobs;
create policy daily_pour_jobs_insert_operator
on public.daily_pour_jobs
for insert
with check (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = daily_pour_jobs.dealer_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'operator')
  )
);

drop policy if exists daily_pour_jobs_update_admin on public.daily_pour_jobs;
create policy daily_pour_jobs_update_admin
on public.daily_pour_jobs
for update
using (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = daily_pour_jobs.dealer_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = daily_pour_jobs.dealer_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

drop policy if exists audit_logs_select_member on public.audit_logs;
create policy audit_logs_select_member
on public.audit_logs
for select
using (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = audit_logs.dealer_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists audit_logs_insert_operator on public.audit_logs;
create policy audit_logs_insert_operator
on public.audit_logs
for insert
with check (
  exists (
    select 1
    from public.dealer_members m
    where m.dealer_id = audit_logs.dealer_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'operator')
  )
);

-- Seed default dealer profile used in current UI.
insert into public.dealers (code, company_name, app_title, portal_subtitle)
values (
  'nawachai-material-trading',
  'บ.นวชัย แมททีเรียล เทรดดิ้ง จก.',
  'Dealer Daily Activity Dashboard',
  'Activity Dashboard "ร้านผู้แทนจำหน่าย"'
)
on conflict (code) do update set
  company_name = excluded.company_name,
  app_title = excluded.app_title,
  portal_subtitle = excluded.portal_subtitle,
  updated_at = now();

insert into public.dealer_settings (
  dealer_id,
  login_username,
  login_password_hash,
  page_size,
  initial_event_count,
  refresh_new_event_min,
  refresh_new_event_max,
  default_auto_refresh_seconds,
  auto_refresh_options,
  show_changed_only_default
)
select
  d.id,
  'dealer01',
  '1234',
  25,
  60,
  0,
  3,
  30,
  array[0,15,30,60,300],
  false
from public.dealers d
where d.code = 'nawachai-material-trading'
on conflict (dealer_id) do nothing;

commit;

