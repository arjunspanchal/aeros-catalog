-- Logistics Rate Calculator (Delhivery domestic B2B) — 2026-08-01
--
-- Source of truth: Delhivery Addendum cum Amendment Agreement dated 31/01/2026
-- (effective 01/01/2026) with Boson Machines (OPC) Pvt Ltd — Annexure II.
-- The 9x9 zone matrix already lives in delhivery_zone_rates (status: live).
-- This migration adds what the addendum defines beyond that matrix, plus the
-- calculator's own persistence (vendor origin pincodes, saved delivery
-- addresses, quote log).

-- 1) Lane-based rates: special destinations priced by NAME (state / city),
--    overriding the zone matrix. CONFIRMED from Annexure II "Lane-based
--    Charges" tables.
create table if not exists delhivery_lane_rates (
  origin_zone text not null,
  dest_name   text not null,   -- state, or city override (e.g. 'Guwahati')
  rate_per_kg numeric(8,2) not null,
  primary key (origin_zone, dest_name)
);

insert into delhivery_lane_rates (origin_zone, dest_name, rate_per_kg) values
  -- Manipur / Meghalaya / Mizoram / Nagaland / Tripura / Sikkim / Assam /
  -- Arunachal Pradesh share the same ladder in the annexure.
  ('N1','Manipur',18),('N2','Manipur',18),('E','Manipur',14),('NE','Manipur',10),
  ('W1','Manipur',19),('W2','Manipur',24.35),('S1','Manipur',19),('S2','Manipur',19),('Central','Manipur',19),
  ('N1','Meghalaya',18),('N2','Meghalaya',18),('E','Meghalaya',14),('NE','Meghalaya',10),
  ('W1','Meghalaya',19),('W2','Meghalaya',24.35),('S1','Meghalaya',19),('S2','Meghalaya',19),('Central','Meghalaya',19),
  ('N1','Mizoram',18),('N2','Mizoram',18),('E','Mizoram',14),('NE','Mizoram',10),
  ('W1','Mizoram',19),('W2','Mizoram',24.35),('S1','Mizoram',19),('S2','Mizoram',19),('Central','Mizoram',19),
  ('N1','Nagaland',18),('N2','Nagaland',18),('E','Nagaland',14),('NE','Nagaland',10),
  ('W1','Nagaland',19),('W2','Nagaland',24.35),('S1','Nagaland',19),('S2','Nagaland',19),('Central','Nagaland',19),
  ('N1','Tripura',18),('N2','Tripura',18),('E','Tripura',14),('NE','Tripura',10),
  ('W1','Tripura',19),('W2','Tripura',24.35),('S1','Tripura',19),('S2','Tripura',19),('Central','Tripura',19),
  ('N1','Sikkim',18),('N2','Sikkim',18),('E','Sikkim',14),('NE','Sikkim',10),
  ('W1','Sikkim',19),('W2','Sikkim',24.35),('S1','Sikkim',19),('S2','Sikkim',19),('Central','Sikkim',19),
  ('N1','Assam',18),('N2','Assam',18),('E','Assam',14),('NE','Assam',10),
  ('W1','Assam',19),('W2','Assam',24.35),('S1','Assam',19),('S2','Assam',19),('Central','Assam',19),
  ('N1','Arunachal Pradesh',18),('N2','Arunachal Pradesh',18),('E','Arunachal Pradesh',14),('NE','Arunachal Pradesh',10),
  ('W1','Arunachal Pradesh',19),('W2','Arunachal Pradesh',24.35),('S1','Arunachal Pradesh',19),('S2','Arunachal Pradesh',19),('Central','Arunachal Pradesh',19),
  -- Guwahati city gets a cheaper ladder than the rest of Assam.
  ('N1','Guwahati',17),('N2','Guwahati',17),('E','Guwahati',8),('NE','Guwahati',6),
  ('W1','Guwahati',17),('W2','Guwahati',17),('S1','Guwahati',17),('S2','Guwahati',17),('Central','Guwahati',17),
  ('N1','Ladakh',55),('N2','Ladakh',55),('E','Ladakh',59),('NE','Ladakh',60),
  ('W1','Ladakh',57.95),('W2','Ladakh',59.74),('S1','Ladakh',59.80),('S2','Ladakh',61),('Central','Ladakh',58),
  ('N1','Himachal Pradesh',10),('N2','Himachal Pradesh',10),('E','Himachal Pradesh',14),('NE','Himachal Pradesh',15),
  ('W1','Himachal Pradesh',12.50),('W2','Himachal Pradesh',14),('S1','Himachal Pradesh',14.50),('S2','Himachal Pradesh',16),('Central','Himachal Pradesh',13),
  ('N1','Jammu & Kashmir',10),('N2','Jammu & Kashmir',10),('E','Jammu & Kashmir',14),('NE','Jammu & Kashmir',15),
  ('W1','Jammu & Kashmir',12.95),('W2','Jammu & Kashmir',14.74),('S1','Jammu & Kashmir',14.80),('S2','Jammu & Kashmir',16),('Central','Jammu & Kashmir',13)
on conflict (origin_zone, dest_name) do update set rate_per_kg = excluded.rate_per_kg;

-- 2) State -> Delhivery zone map. The addendum does NOT define zone
--    membership, so these assignments are ASSUMED (standard Delhivery B2B
--    zoning) pending confirmation — mirror of cortex status discipline.
--    Maharashtra is confirmed W2 by the contract itself (origin "W2 Mumbai").
create table if not exists delhivery_zone_map (
  state  text primary key,
  zone   text not null,
  status text not null default 'assumed'   -- 'confirmed' | 'assumed'
);

insert into delhivery_zone_map (state, zone, status) values
  ('Delhi','N1','assumed'),('Haryana','N1','assumed'),('Punjab','N1','assumed'),('Chandigarh','N1','assumed'),
  ('Uttar Pradesh','N2','assumed'),('Uttarakhand','N2','assumed'),('Rajasthan','N2','assumed'),
  ('Himachal Pradesh','N2','assumed'),('Jammu & Kashmir','N2','assumed'),('Ladakh','N2','assumed'),
  ('West Bengal','E','assumed'),('Bihar','E','assumed'),('Jharkhand','E','assumed'),('Odisha','E','assumed'),
  ('Assam','NE','assumed'),('Sikkim','NE','assumed'),('Arunachal Pradesh','NE','assumed'),('Manipur','NE','assumed'),
  ('Meghalaya','NE','assumed'),('Mizoram','NE','assumed'),('Nagaland','NE','assumed'),('Tripura','NE','assumed'),
  ('Gujarat','W1','assumed'),('Dadra & Nagar Haveli','W1','assumed'),('Daman & Diu','W1','assumed'),
  ('Maharashtra','W2','confirmed'),('Goa','W2','assumed'),
  ('Karnataka','S1','assumed'),('Tamil Nadu','S1','assumed'),('Puducherry','S1','assumed'),
  ('Kerala','S2','assumed'),('Andhra Pradesh','S2','assumed'),('Telangana','S2','assumed'),
  ('Madhya Pradesh','Central','assumed'),('Chhattisgarh','Central','assumed')
on conflict (state) do nothing;

-- 3) Addendum overheads not yet in pricing_config.
alter table pricing_config
  add column if not exists handling_threshold_kg numeric default 400,
  add column if not exists handling_rate_per_kg  numeric default 3,
  add column if not exists oda_flat_inr          numeric default 1500;

-- 4) Vendor origin pincode (typed once, reused for every quote).
alter table vendors add column if not exists pincode text;

-- 5) Saved delivery addresses.
create table if not exists logistics_addresses (
  id           uuid primary key default gen_random_uuid(),
  label        text not null,             -- "Zepto Hoskote WH"
  contact_name text,
  phone        text,
  address_line text,
  city         text,
  state        text,
  pincode      text not null,
  is_oda       boolean not null default false,  -- ODA flag remembered per address
  notes        text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

-- 6) Quote log — every computed shipment quote, for later reconciliation
--    against Delhivery's fortnightly invoices.
create table if not exists logistics_quotes (
  id             uuid primary key default gen_random_uuid(),
  origin_kind    text not null,            -- 'warehouse' | 'vendor'
  vendor_id      uuid references vendors(id),
  origin_label   text,
  origin_pincode text not null,
  address_id     uuid references logistics_addresses(id),
  dest_label     text,
  dest_pincode   text not null,
  lines          jsonb not null,           -- [{sku,name,qty,cases,actual_kg,vol_kg}]
  declared_value numeric,
  breakdown      jsonb not null,           -- itemised charges + zone/lane used
  chargeable_kg  numeric not null,
  total_ex_gst   numeric not null,
  gst_inr        numeric not null,
  total_inr      numeric not null,
  created_by     text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_logistics_quotes_created on logistics_quotes (created_at desc);
