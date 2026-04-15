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

| Variable | Required | Description |
|---|---|---|
| `AIRTABLE_TOKEN` | ✅ | Personal Access Token from https://airtable.com/create/tokens with `data.records:read` scope |
| `AIRTABLE_BASE_ID` | ✅ | Airtable base ID (for Aeros Clearance Stock: `appRMQ2om6bffGVBS`) |
| `AIRTABLE_TABLE_ID` | ✅ | Table ID (for Inventory: `tblZTt0xRzTrFkgc0`) |
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
