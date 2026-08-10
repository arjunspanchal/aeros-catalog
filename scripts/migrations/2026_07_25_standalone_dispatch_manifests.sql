-- Standalone Dispatch Manifest generator.
--
-- The manifest calculator was reachable only from inside a vehicle dispatch,
-- and a dispatch forces a single customer — so a truck carrying invoices for
-- several customers had no valid owner and couldn't be built. This makes the
-- manifest a first-class object of its own: pick the vehicle, add invoices
-- (each with its own consignee), add box types, get weight/CBM/vehicle. No
-- freight economics, no single-customer header.
--
-- Invoices and lines are REUSED, not duplicated: each row belongs to EITHER a
-- vehicle dispatch OR a standalone manifest, enforced by a one-owner check.
-- Every pure helper (manifestTotals, groupByInvoice) works unchanged because
-- it only ever sees line/invoice shapes, never the owner.
--
-- Idempotent-ish: the ALTERs are guarded; safe to re-run on an empty install.

create extension if not exists pgcrypto;

create sequence if not exists dispatch_manifest_seq start 1 increment 1;

create table if not exists public.dispatch_manifests (
  id uuid primary key default gen_random_uuid(),
  manifest_no text unique not null
    default ('MF-' || to_char(now(),'YY') || '-' || lpad(nextval('dispatch_manifest_seq')::text, 5, '0')),
  manifest_date date not null default current_date,
  reference text,            -- free label, e.g. "Zepto + HoB Pune run"
  vehicle_size text,
  vehicle_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  deleted_at timestamptz
);

create index if not exists dispatch_manifests_date_idx
  on public.dispatch_manifests (manifest_date desc) where deleted_at is null;

alter table public.dispatch_manifests enable row level security;

create or replace function public.touch_dispatch_manifest_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end$$;

drop trigger if exists trg_dispatch_manifest_updated_at on public.dispatch_manifests;
create trigger trg_dispatch_manifest_updated_at
before update on public.dispatch_manifests
for each row execute function public.touch_dispatch_manifest_updated_at();

-- Invoices + lines can belong to a dispatch OR a manifest — exactly one.
alter table public.vehicle_dispatch_invoices
  add column if not exists manifest_id uuid references public.dispatch_manifests(id) on delete cascade,
  alter column dispatch_id drop not null;

alter table public.vehicle_dispatch_lines
  add column if not exists manifest_id uuid references public.dispatch_manifests(id) on delete cascade,
  alter column dispatch_id drop not null;

alter table public.vehicle_dispatch_invoices
  drop constraint if exists vehicle_dispatch_invoices_one_owner;
alter table public.vehicle_dispatch_invoices
  add constraint vehicle_dispatch_invoices_one_owner
  check (num_nonnulls(dispatch_id, manifest_id) = 1);

alter table public.vehicle_dispatch_lines
  drop constraint if exists vehicle_dispatch_lines_one_owner;
alter table public.vehicle_dispatch_lines
  add constraint vehicle_dispatch_lines_one_owner
  check (num_nonnulls(dispatch_id, manifest_id) = 1);

create index if not exists vehicle_dispatch_invoices_manifest_idx
  on public.vehicle_dispatch_invoices (manifest_id, seq);
create index if not exists vehicle_dispatch_lines_manifest_idx
  on public.vehicle_dispatch_lines (manifest_id, sr_no);

-- History roll-up for the standalone manifest list, mirroring the dispatch one.
create or replace view public.v_dispatch_manifests
with (security_invoker = true) as
select
  m.id                        as manifest_id,
  m.manifest_no,
  m.manifest_date,
  m.reference,
  m.vehicle_size,
  m.vehicle_number,
  m.created_by,
  m.created_at,
  inv.invoice_count,
  inv.invoice_numbers,
  inv.consignees,
  count(l.id)                                                     as line_count,
  coalesce(sum(l.box_count), 0)                                   as total_boxes,
  coalesce(sum(l.box_count * coalesce(l.units_per_case, 0)), 0)   as total_pcs,
  round(coalesce(sum(l.box_count * l.kg_per_box), 0), 2)          as total_kg,
  round(coalesce(sum(l.box_count * l.cbm_per_box), 0), 3)         as total_cbm,
  count(*) filter (where l.kg_per_box is null and l.box_count > 0)  as missing_kg,
  count(*) filter (where l.cbm_per_box is null and l.box_count > 0) as missing_cbm,
  count(*) filter (where l.invoice_id is null and l.box_count > 0)  as unassigned_lines
from public.dispatch_manifests m
left join public.vehicle_dispatch_lines l on l.manifest_id = m.id
left join lateral (
  select count(*) as invoice_count,
         string_agg(i.invoice_no, ', ' order by i.seq)  as invoice_numbers,
         string_agg(distinct i.customer_name, ', ')      as consignees
  from public.vehicle_dispatch_invoices i
  where i.manifest_id = m.id
) inv on true
where m.deleted_at is null
group by m.id, inv.invoice_count, inv.invoice_numbers, inv.consignees;
