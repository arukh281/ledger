# Vendor Ledger App

A digital vendor account ledger built with Next.js — designed for ease of use with large text, high contrast, and minimal steps to complete any action.

## Features

- **Primary ledger** — vendors with GSTIN; vendor list → open ledger via book icon
- **Secondary ledger** — separate book with free-text `ref` per vendor (run `supabase/secondary-schema.sql`)
- **Paytm** — CSV upload → statement PDF (ported from legacy Python tool)
- **Transaction logging** — invoice and payment entries, running balance, period filters
- **Write-off** — one-click balance nil adjustment
- **Print** — printable vendor statement
- **Dual storage** — Supabase primary + Firebase mirror; reads fall back to Firebase if Supabase fails

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase and Firebase project credentials.

**Supabase setup:**
1. Create a free project at https://app.supabase.com
2. Go to SQL Editor and run `supabase/schema.sql`, then `supabase/secondary-schema.sql` if using Secondary
3. Copy the Project URL and anon key from Project Settings → API

**Weekly check (Free tier keep-alive + app test):** Free Supabase projects pause after 7 days without API activity. `.github/workflows/supabase-keepalive.yml` runs **lint, build, and a Supabase ping** every **Monday and Thursday at 09:00 UTC**, and emails you the result. Add repository secrets in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|--------|
| `SUPABASE_URL` | Your Project URL (same as `NEXT_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_ANON_KEY` | Your anon public key (same as `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `MAIL_SERVER` | SMTP host (e.g. `smtp.gmail.com`) |
| `MAIL_PORT` | `587` for Gmail. Use `465` only if you set `MAIL_SECURE=1` |
| `MAIL_USERNAME` | SMTP login / sender email |
| `MAIL_PASSWORD` | Gmail app password (16 chars, no spaces) |
| `MAIL_TO` | Your email for pass/fail notifications |
| `MAIL_FROM` | *(optional)* From header; defaults to `MAIL_USERNAME` |
| `MAIL_SECURE` | *(optional)* Set to `1` only for port **465** |
| `APP_URL` | *(optional)* Deployed URL; also checks `GET /primary` |

Use the **HTTPS Project URL** (`https://xxxx.supabase.co`) — not the `postgres://` database string. Re-copy both Supabase values from Project Settings → API if you see HTTP 401.

Run manually from **Actions → Weekly check → Run workflow**, or locally: `npm test` (with Supabase env vars set).

**Firebase setup:**
1. Create a free project at https://console.firebase.google.com
2. Enable Cloud Firestore (start in test/production mode)
3. Register a Web App and copy the `firebaseConfig` values
4. See `docs/firebase-structure.md` for detailed collection layout and security rules

### 3. Run the development server

```bash
npm run dev
```

Open http://localhost:3000

---

## Pages

| Page | URL | Purpose |
|------|-----|---------|
| Primary | `/primary` | Vendor list → ledger (GSTIN vendors, existing data) |
| Secondary | `/secondary` | Vendor list → ledger (separate book, free-text ref) |
| Paytm | `/paytm` | CSV upload → statement PDF |

---

## Data Storage

```
Write path:   UI action → Server Action → Supabase (primary) + Firebase (mirror)
              Success only when BOTH writes complete.

Read path:    Client → Supabase client SDK
              If Supabase fails → Firebase Firestore (fallback)
```

See `docs/firebase-structure.md` for the Firestore schema.

---

## Ledger Balance Logic

| Entry Type | Effect on Balance |
|------------|-------------------|
| Invoice    | + (we owe vendor more) |
| Payment    | − (we paid the vendor) |

- **Closing Balance** = Opening Balance + Total Invoiced − Total Paid
- **Positive** closing balance = amount still owed to vendor
- **Negative** closing balance = vendor owes us a refund

---

## Nil Balance

The **Nil Balance** button on the ledger page writes off the current closing balance to ₹0 by posting a balancing entry:

- Positive balance → posts a **Payment** for that amount
- Negative balance → posts an **Invoice** for that amount
- Entry is labelled `Balance Write-off` with doc number `NIL-<timestamp>`

---

## Print Account

Click **Print Account** on the vendor ledger page. The browser print dialog opens showing a clean, printer-friendly statement that includes:

- Vendor name and GSTIN
- Selected date range
- Summary cards (Opening, Invoiced, Paid, Closing)
- Full transaction table with running balance
- Print date footer

All UI controls and navigation are hidden in print output.

---

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Supabase** (`@supabase/supabase-js`)
- **Firebase** (`firebase` JS SDK v12)
- **react-hot-toast** for notifications
- **lucide-react** for icons
