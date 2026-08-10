-- Clients ↔ Zoho Books link + names reworked to Zoho's spelling.
--
-- The FactoryOS clients directory used informal names ("Zepto", "DIPL",
-- "Tapri Coffee"). Matched 03-Aug-2026 against Zoho Books customer contacts
-- (org 60004253439, ~1,660 contacts): 24 of 63 rows linked, renamed to the
-- exact Zoho contact name, and given the Zoho GSTIN. The old informal name
-- moved into `code` (previously unused) wherever it differed — pickers render
-- "name (code)", so the team still sees/searches "Zepto".
--
-- Notable resolutions:
--   Zepto            → Zepto Limited
--   DIPL AND DILP    → DEVHARSH INFOTECH PVT LTD (DILP was a typo duplicate;
--                      both rows link to the same Zoho contact — hence the
--                      index below is NON-unique, unlike vendors)
--   Ettarra          → ETTARRA VANDALS
--   ITC              → ITC Limited
--   Tapri Coffee     → TAPRI
--   Faredoon's       → NEW GRAND HIGH CLASS BAKERY (Faredoon's)
--   Saif Food        → SAIF FOOD PACKS
--   Magnus           → Magnus Textile (Arjun confirmed)
--   Taj              → Roots Corporation Limited (Ginger Hotels / IHCL —
--                      Arjun identified it; same PAN as the vendor-side
--                      ROOTS CORPORATION LIMITED entry)
--
-- Left unlinked (38): internal rows (Aeros, Self ×2, Tpc, TPC Stock, Kate101,
-- shreya), person-named walk-ins (Akshay, Burhan, Sathvik ×2, Samruddhi Mote,
-- Lal Masand …), and brands with no Zoho customer yet (BARTIN'S ×2, Brioche
-- Doree, Maverick / Maverick & Farmer, THIRD WAVE COFFEE, Hamleys, Superyum,
-- Seoul, Waarsa, Tarrai Ragi Chips, Hackensack, Identity Digital, JUUZBOT,
-- James Martin, Essay B, Bombay Brassiere, Dipack … etc.).
--
-- The monthly `zoho-vendor-sync` scheduled task refreshes name + gst_no for
-- LINKED rows only; clients is a curated directory, never a full Zoho mirror.
--
-- Idempotent: safe to re-run (the rename/backfill lives in ops history).

alter table public.clients
  add column if not exists zoho_contact_id text,
  add column if not exists gst_no text;

create index if not exists clients_zoho_contact_idx
  on public.clients (zoho_contact_id) where zoho_contact_id is not null;
