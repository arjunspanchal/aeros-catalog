-- Customer delivery addresses belong to the CLIENTS master — Arjun's rule:
-- vendors live in `vendors`, customers in `clients`; no calculator-private
-- address lists. Replaces logistics_addresses from the same-day logistics
-- calculator migration (created empty, dropped here).
--
-- Data seeding done alongside (via MCP): client 'Wow Momo Foods Private
-- Limited' + its 20 city warehouse ship-to addresses (from Jul-2026 PO scans,
-- with per-state GSTINs), and Brewbay's abCoffee Bangalore warehouse (560095).

create table if not exists client_addresses (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references clients(id),
  label        text not null,
  contact_name text,
  phone        text,
  address_line text,
  city         text,
  state        text,
  pincode      text not null,
  gstin        text,
  is_oda       boolean not null default false,
  source       text,
  notes        text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists idx_client_addresses_client on client_addresses (client_id);

alter table logistics_quotes drop constraint if exists logistics_quotes_address_id_fkey;
alter table logistics_quotes
  add constraint logistics_quotes_address_id_fkey
  foreign key (address_id) references client_addresses(id);

drop table if exists logistics_addresses;
