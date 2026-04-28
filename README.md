# Aeros Clearance Stock Catalog

A minimal, fast, public-facing catalog for Aeros clearance packaging inventory. Pulls from Airtable, hosted on Vercel.

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Airtable REST API (server-side fetch, revalidated every 60 seconds)

## Local development

```bash
npm install
cp .env.example .env.local
# Paste your Airtable Personal Access Token into .env.local
npm run dev
```

Open http://localhost:3000

## Environment variables

Airtable access uses **six scoped PATs**, one per base. Mint each at https://airtable.com/create/tokens and pin the listed base — a leak (or rotation) of any one only affects that base. Mirrors `.env.example`.

| Variable | Required | Description |
|---|---|---|
| `AIRTABLE_PAT_CLEARANCE` | ✅ | `data.records:read+write` on `appRMQ2om6bffGVBS` (Clearance) |
| `AIRTABLE_PAT_PRODUCTS` | ✅ | `data.records:read+write` on `appZuFJJTEf7TL0IQ` (Products Master) — admin can edit products via `/catalog/manage` |
| `AIRTABLE_PAT_PAPER_RM` | ✅ | `data.records:read+write` on `appSllndIZszJSCma` (Paper RM) — admin patches Base Rate / Discount via `/factoryos/admin/master-papers` |
| `AIRTABLE_PAT_ORDERS` | ✅ | `data.records:read+write` on `appDEhKCVRAsYjSX2` (Orders / FactoryOS); add `schema.bases:read+write` if you run `scripts/provision-orders-schema.js` |
| `AIRTABLE_PAT_HR` | ❌ | Placeholder — wired up in 1.3 when HR tables move out of Orders. Mint with empty scope for now or skip until then. |
| `AIRTABLE_PAT_CALCULATOR` | ✅ | `data.records:read+write` on `appWO53wnIZKdKRlq` (Calculator) — catalog calc + rate-cards + the legacy `aeros-paper-bag-calculator` app |
| `AIRTABLE_TOKEN` | ⚠️ deprecated | Legacy single-base PAT. Helpers fall back to this if a scoped PAT above is unset. Remove after 1.2 cutover (when `git grep AIRTABLE_TOKEN lib/ scripts/` is clean). |
| `AIRTABLE_BASE_ID` | ✅ | Clearance base ID (`appRMQ2om6bffGVBS`) |
| `AIRTABLE_TABLE_ID` | ✅ | Clearance Inventory table ID |
| `AIRTABLE_VIEW` | ❌ | Optional view name to fetch from (e.g., `Public Catalog`) |

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to https://vercel.com/new
3. Import the GitHub repo
4. Add the environment variables above (from `.env.example`)
5. Click Deploy

## Updating the catalog

Edit your inventory in Airtable. Changes appear on the live site within 60 seconds — no redeploy needed.

To force an immediate refresh, redeploy from the Vercel dashboard.

## Paper Bag Rate Calculator (`/calculator`)

The `/calculator/*` routes host an internal rate calculator for Aeros paper bags,
protected by an HMAC session cookie. Admins log in with a master password; clients
log in with an email + OTP and see a margin-adjusted rate. Quotes and client profiles
are stored in a separate Airtable base.

Additional env vars (see `.env.example`):

- `AIRTABLE_CALC_BASE_ID` — Airtable base ID for the calculator (separate from the catalog base)
- `AIRTABLE_BAG_SPECS_TABLE`, `AIRTABLE_QUOTES_TABLE`, `AIRTABLE_CLIENTS_TABLE`, `AIRTABLE_OTP_TABLE`
- `ADMIN_PASSWORD` — master password for admin login
- `SESSION_SECRET` — HMAC secret for session cookies (min 16 chars)
- `RESEND_API_KEY`, `OTP_FROM_EMAIL` — Resend email for OTP delivery (dev logs to console if unset)
- `DEFAULT_CLIENT_MARGIN` — default margin % for new clients (default 15)
