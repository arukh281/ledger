# Acceptance Test Checklist

Use this checklist to verify the app is working correctly after setup.

## Prerequisites
- [ ] `.env.local` is created with valid Supabase and Firebase credentials
- [ ] Supabase schema (`supabase/schema.sql`) has been executed in the SQL Editor
- [ ] Secondary schema (`supabase/secondary-schema.sql`) has been executed if using Secondary
- [ ] Firebase Firestore has been created and rules allow read/write
- [ ] App is running: `npm run dev` → http://localhost:3000 (home service picker)

---

## 0. Home

- [ ] Open `/` — five service cards: Paytm, Ledger, Invoice, HSN, GSTIN
- [ ] Each card navigates to the correct module

---

## 1. Party — Vendor CRUD

### Add Vendor
- [ ] Navigate to **Ledger** (`/party`) or open Party from home
- [ ] Click **Add vendor**
- [ ] Enter a valid name and GSTIN (e.g. `29ABCDE1234F1Z5`)
- [ ] Save — confirm success toast
- [ ] Vendor appears in the list

### GSTIN Validation
- [ ] Try adding a vendor with GSTIN `INVALID` — confirm error message
- [ ] Try adding a vendor with blank GSTIN — confirm error message
- [ ] Try adding a vendor with an already-used GSTIN — confirm uniqueness error

### Edit / Delete Vendor
- [ ] Click **Edit** (pencil) — change name and save
- [ ] Click **Delete** — confirm dialog and removal

### Open Ledger
- [ ] Click **ledger** icon (book) on a vendor — ledger view opens
- [ ] Clicking vendor name does **not** open ledger

---

## 2. Party — Entries

- [ ] Add invoice and payment entries
- [ ] Edit and delete entries
- [ ] Period filters (All / Month / Custom) work
- [ ] Write-off zeros balance when needed
- [ ] Print produces statement PDF

---

## 3. Secondary

- [ ] Navigate to **Secondary** (from Ledger scope switcher or `/secondary`)
- [ ] Add vendor with name + free-text **Ref**
- [ ] Open ledger via book icon, add entries

---

## 4. Paytm

- [ ] Navigate to **Paytm**
- [ ] Upload CSV with `Transaction_Date` and `Amount` columns
- [ ] PDF downloads with expected filename pattern

---

## 5. Invoice, HSN, GSTIN

- [ ] **Invoice** — list, create at `/invoice/new`, download PDF
- [ ] **HSN** — catalog CRUD, search, PDF export
- [ ] **GSTIN** — customer firms editable; party section read-only from ledger

---

## 6. Navigation

- [ ] Navbar shows Paytm, Ledger, Invoice, HSN, GSTIN on service pages
- [ ] **Tally** in navbar returns to home `/`
- [ ] `/primary` redirects to `/party`
- [ ] `/ledger` and `/vendors` are not available (404)
