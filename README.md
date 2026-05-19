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
