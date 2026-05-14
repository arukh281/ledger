# Acceptance Test Checklist

Use this checklist to verify the app is working correctly after setup.

## Prerequisites
- [ ] `.env.local` is created with valid Supabase and Firebase credentials
- [ ] Supabase schema (`supabase/schema.sql`) has been executed in the SQL Editor
- [ ] Firebase Firestore has been created and rules allow read/write
- [ ] App is running: `npm run dev` → http://localhost:3000

---

## 1. Vendor CRUD

### Add Vendor
- [ ] Navigate to **Manage Vendors**
- [ ] Click **Add Vendor**
- [ ] Enter a valid name and GSTIN (e.g. `29ABCDE1234F1Z5`)
- [ ] Click **Add Vendor** — confirm success toast appears
- [ ] Vendor appears in the list

### GSTIN Validation
- [ ] Try adding a vendor with GSTIN `INVALID` — confirm error message
- [ ] Try adding a vendor with blank GSTIN — confirm error message
- [ ] Try adding a vendor with an already-used GSTIN — confirm uniqueness error

### Edit Vendor
- [ ] Click **Edit** on an existing vendor
- [ ] Change the name and save — confirm success toast and updated name in list

### Delete Vendor
- [ ] Click **Delete** on a vendor
- [ ] Confirm the dialog warns about permanent deletion
- [ ] Click **Yes, Delete** — confirm success toast
- [ ] Vendor disappears from list

---

## 2. Entry Creation

- [ ] Go to **Dashboard**
- [ ] Select a vendor from the dropdown
- [ ] Toggle to **Invoice**, fill in amount, doc number, date — save
- [ ] Confirm success toast and entry appears in Recent Transactions

- [ ] Create a **Payment** entry the same way
- [ ] Confirm the payment appears with a different badge colour

- [ ] Leave vendor blank and submit — confirm validation error
- [ ] Leave amount blank and submit — confirm validation error
- [ ] Leave doc number blank and submit — confirm validation error

---

## 3. Vendor Ledger View

- [ ] Go to **Vendor Ledger**, select a vendor
- [ ] Confirm summary cards show correct values:
  - Opening Balance = 0 (no filter)
  - Total Invoiced = sum of invoice entries
  - Total Paid = sum of payment entries
  - Closing Balance = Total Invoiced − Total Paid

### Running Balance
- [ ] Confirm each row's balance is cumulative and correct:
  - After first invoice: balance = invoice amount
  - After first payment: balance = invoice amount − payment amount
  - Continues correctly for subsequent entries

### Date Range Filter
- [ ] Set a **From Date** that excludes the first entry
- [ ] Confirm Opening Balance changes to reflect pre-range entries
- [ ] Set a **To Date** that excludes the last entry
- [ ] Confirm only entries within the range are shown

---

## 4. Nil Balance

### Positive Balance (we owe vendor)
- [ ] Create enough invoice entries so closing balance is positive
- [ ] Click **Nil Balance**
- [ ] Confirm dialog shows current balance and says "A Payment entry will be posted"
- [ ] Click **Yes, Write Off**
- [ ] Confirm a new Payment row appears with `NIL-{timestamp}` doc number and `Balance Write-off` label
- [ ] Confirm closing balance is now ₹0.00

### Negative Balance (vendor owes us)
- [ ] Create a payment larger than total invoices (or delete invoices)
- [ ] Click **Nil Balance** — confirm dialog says "An Invoice entry will be posted"
- [ ] Click **Yes, Write Off** — confirm closing balance becomes ₹0.00

### Zero Balance
- [ ] When balance is ₹0, confirm **Nil Balance** button is disabled

---

## 5. Print Account

- [ ] On a vendor ledger with entries, click **Print Account**
- [ ] Browser print dialog appears
- [ ] Print preview shows:
  - [ ] Vendor name and GSTIN at top
  - [ ] Date range period
  - [ ] 4 summary cards (Opening, Invoiced, Paid, Closing)
  - [ ] Full transaction table
  - [ ] Footer with print date
  - [ ] No navigation bar, no buttons, no filter controls visible

---

## 6. Dual Storage

### Supabase Down (Fallback Read)
- [ ] Temporarily set `NEXT_PUBLIC_SUPABASE_URL` to an invalid URL in `.env.local`
- [ ] Restart the dev server
- [ ] Load the app — data should load from Firebase (fallback)
- [ ] Restore the correct Supabase URL

### Dual Write Confirmation
- [ ] Add an entry — verify it appears in both:
  - Supabase: `ledger_entries` table (check via Supabase Table Editor)
  - Firebase: `ledger_entries` collection (check via Firebase Console → Firestore)

---

## 7. UX / Accessibility

- [ ] All text is readable at 100% zoom without horizontal scroll
- [ ] All buttons are at least 48px tall and easy to tap
- [ ] Confirmation dialogs appear before all delete and nil-balance actions
- [ ] Success/error toasts are visible and auto-dismiss
- [ ] App is usable on a mobile screen (portrait orientation)
