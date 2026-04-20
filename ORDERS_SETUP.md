# Orders module — setup

The Orders module is a multi-role order lifecycle tracker. Customers see their jobs, account managers and the factory manager update stages, and admin (you) manages everything.

This file tells you what to set up in Airtable + env before the module works.

---

## 1. Create a new Airtable base

Name it something like `Aeros Orders`. Create the six tables below with the exact field names (the code references these by name — typos will break things).

### Table: `Clients`

| Field | Type | Notes |
| --- | --- | --- |
| Name | Single line text | **Primary field**. e.g. "Brewbay", "Hackensack" |
| Code | Single line text | Short code, e.g. "BREW", "HACK" (optional) |
| Contact Person | Single line text | |
| Contact Email | Email | |
| Contact Phone | Phone number | |
| Created | Created time | Auto |

### Table: `Users`

| Field | Type | Notes |
| --- | --- | --- |
| Email | Email | **Primary field**. Lowercase. |
| Name | Single line text | Display name, e.g. "Vinay", "Arjun Sir" |
| Role | Single select | Options: `admin`, `account_manager`, `factory_manager`, `customer` |
| Client | Link to `Clients` | Required for role=customer. For account_manager, defines which client(s) they own. Allow linking to multiple records. |
| Active | Checkbox | Inactive users can't log in. |
| Created | Created time | Auto |

> Seed yourself: add your email with role `admin`. Add Vinay with role `account_manager`, linked to Brewbay. Add the factory manager with role `factory_manager`. Customer logins per client get role `customer`.

### Table: `Jobs`

Mirrors the columns in `TPC Factory Order Management.xlsx` → `Main` sheet.

| Field | Type | Notes |
| --- | --- | --- |
| J# | Single line text | **Primary field**. 7-digit ID (YYMM + seq), e.g. `2601001` |
| Client | Link to `Clients` | Required |
| Brand | Single line text | e.g. "aB Coffee", "Halal Guys" |
| Customer Manager | Link to `Users` | The assigned account manager |
| Category | Single select | Options: `Paper Bag`, `Paper Cups`, `Food Box`, `Tub`, `Other` |
| Item | Single line text | e.g. "250 ml DW Paper Cup" |
| City | Single line text | Destination city (for multi-city POs) |
| Qty | Number | Integer |
| Order Date | Date | DOO |
| Expected Dispatch Date | Date | |
| Stage | Single select | Options in this order: `RM Pending`, `Under Printing`, `In Conversion`, `Packing`, `Ready for Dispatch`, `Dispatched` |
| Internal Status | Single line text | Free-text detail, visible to FM/AM only — e.g. "Forming plates pending" |
| PO Number | Single line text | Group multiple Jobs under one customer PO |
| RM Type | Single line text | Rolls / Sheets |
| RM Supplier | Single line text | |
| Paper Type | Single line text | |
| GSM | Number | |
| Printing Vendor | Single line text | |
| Action Points | Long text | Open action items |
| Notes | Long text | Customer-safe notes |
| Created | Created time | Auto |
| Last Updated | Last modified time | Auto |

### Table: `Job Status Updates`

Timeline of every stage change.

| Field | Type | Notes |
| --- | --- | --- |
| ID | Autonumber | **Primary field** |
| Job | Link to `Jobs` | |
| Stage | Single select | Same 6 options as Jobs.Stage |
| Updated By Email | Email | We store email (not a link) so the row survives if a user is deleted |
| Updated By Name | Single line text | |
| Note | Long text | |
| Created | Created time | Auto |

### Table: `POs` (optional — only if you want to group Jobs)

| Field | Type | Notes |
| --- | --- | --- |
| PO Number | Single line text | **Primary field** |
| Client | Link to `Clients` | |
| Order Date | Date | |
| Notes | Long text | |

> For v1 this is optional — Jobs already have a `PO Number` text field that achieves grouping.

### Table: `OTP Codes`

| Field | Type | Notes |
| --- | --- | --- |
| Email | Email | **Primary field** |
| Code | Single line text | 6-digit |
| Expires At | Date (with time) | ISO |
| Used | Checkbox | |
| Created | Created time | Auto |

> If you already have an `OTP Codes` table in the Calculator base, we intentionally use a **separate one** in this base so sessions don't cross modules.

---

## 2. Environment variables

Add these to `.env.local` (for dev) and Vercel Environment Variables (for prod).

```bash
# --- Orders module ---
# A separate Airtable base for orders data. Reuses AIRTABLE_TOKEN.
AIRTABLE_ORDERS_BASE_ID=appXXXXXXXXXXXXXX

# Table names (defaults shown — override only if you named them differently)
AIRTABLE_ORDERS_CLIENTS_TABLE=Clients
AIRTABLE_ORDERS_USERS_TABLE=Users
AIRTABLE_ORDERS_JOBS_TABLE=Jobs
AIRTABLE_ORDERS_UPDATES_TABLE=Job Status Updates
AIRTABLE_ORDERS_OTP_TABLE=OTP Codes

# Admin password for /orders admin login. Set to something strong.
ORDERS_ADMIN_PASSWORD=change-me
```

`AIRTABLE_TOKEN`, `SESSION_SECRET`, `RESEND_API_KEY`, and `OTP_FROM_EMAIL` are reused from the calculator setup — no need to duplicate.

> Your Airtable token needs the new base added to its scopes. Go to https://airtable.com/create/tokens, edit your existing PAT, add the new base under "Access", and resave.

---

## 3. Seed data from the existing spreadsheet

After you've created the base and set env vars, run:

```bash
# From the aeros-catalog directory
node scripts/import-orders-seed.js "/Users/arjunpanchal/Downloads/TPC Factory Order Management.xlsx"
```

This:
- Creates a Client record for every unique "Customer Name" in the Main sheet.
- Creates a Job record for every row (preserving J#, Brand, Item, Qty, etc.).
- Maps the FM's detailed status text to our 6-stage model (best-effort).
- Stores the original internal status text in `Internal Status` so nothing is lost.

Run it once on an empty base. Re-running will create duplicates — delete the records first if you need to re-seed.

---

## 4. First login

1. Visit `/orders` — redirects you to `/orders/login`.
2. Click "Admin" → enter `ORDERS_ADMIN_PASSWORD`.
3. From the admin page, invite users: fill their email + role + (if customer) their Client. They log in by entering their email on the "Customer / Manager" tab; we email them a 6-digit code.
