-- Vendors ↔ Zoho Books link.
--
-- The shared vendors directory (27 rows) now carries the Zoho Books contact id
-- and GSTIN for each vendor that exists in Zoho (org 60004253439, Boson
-- Machines OPC Pvt Ltd). Matched 03-Aug-2026 by normalized-name fuzzy match,
-- then hand-confirmed; email/phone were backfilled from Zoho only where ours
-- were NULL (COALESCE — Zoho never overwrites a locally-entered value).
--
-- 24/27 matched. Deliberately left unlinked:
--   * Omkar Print (Printing)  — Zoho has OMKAR PAPER AND BOARDS and Omkar
--     Plastic Industries; neither is clearly the same printer.
--   * Lucky Offset (Printing) — Zoho has LUCKY PRINTS & PACK / LUCKY PAPER
--     BOX / LUCKY WOODEN PUNCH MAKER; ambiguous.
--   * Hanyong (Overseas Supplier) — Chinese supplier, not in Zoho Books.
--
-- Notable resolved aliases (name in our DB ≠ name in Zoho):
--   Blueline            → NEW BLUELINE OFFSET
--   Creative Ink        → CREATIVVE INK (their spelling)
--   Eva Paper Craft     → EVA PAPERS CRAFTS
--   Sahil Fashion       → SAHIL FASHION PRIVATE LIMITED
--   Jayant Printery     → Jayant Printery LLP
--   Papierus            → Papierus Packaging and Paper Pvt Ltd
--   Lorven Automobiles  → Lorven Global Automotives (pincode 563129 Kolar +
--                         GSTIN 29… Karnataka confirmed it)
--
-- The unique partial index means a Zoho contact can back at most one vendor
-- row — a duplicate link is a data error, not a feature.
--
-- Idempotent: safe to re-run (backfill lives in ops history, not here).

alter table public.vendors
  add column if not exists zoho_contact_id text,
  add column if not exists gst_no text;

create unique index if not exists vendors_zoho_contact_idx
  on public.vendors (zoho_contact_id) where zoho_contact_id is not null;
