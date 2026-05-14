# Firebase Firestore Structure

This app mirrors Supabase data into Firebase Firestore for backup and fallback reads.

## Collections

### `vendors`

Each document ID matches the Supabase UUID for the vendor.

```
vendors/
  {vendor_id}/
    id:           string   — UUID (matches Supabase)
    name:         string   — Vendor name
    gstin:        string   — 15-char GST Identification Number (uppercase)
    created_at:   string   — ISO 8601 timestamp
    updated_at:   string   — ISO 8601 timestamp
```

### `ledger_entries`

Each document ID matches the Supabase UUID for the entry.

```
ledger_entries/
  {entry_id}/
    id:                   string   — UUID (matches Supabase)
    vendor_id:            string   — References vendors/{vendor_id}
    type:                 string   — "invoice" | "payment"
    date:                 string   — ISO date "YYYY-MM-DD"
    amount:               number   — Positive decimal
    doc_number:           string   — Invoice/Receipt number
    notes:                string   — Optional description
    is_system_generated:  boolean  — true for nil-balance write-off entries
    created_at:           string   — ISO 8601 timestamp
    updated_at:           string   — ISO 8601 timestamp
```

## Security Rules (Firebase Console)

For a private single-user app with no authentication, use these permissive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> Note: These rules allow unrestricted access. Since this app has no login and is
> accessed locally/privately, this is acceptable. If you ever expose the app
> publicly, add authentication and restrict rules accordingly.

## Indexes

Firestore requires composite indexes for queries with multiple `orderBy` or
`where` + `orderBy` combinations. If you see an index error in the console:
1. Click the link in the error message — it opens the Firebase Console with the
   index pre-filled.
2. Click "Create Index".

Required indexes:
- `ledger_entries`: `vendor_id` (ASC) + `date` (ASC) + `created_at` (ASC)
- `ledger_entries`: `date` (DESC) + `created_at` (DESC)

## Setup Steps

1. Go to https://console.firebase.google.com
2. Create a new project (or use an existing one)
3. Enable **Cloud Firestore** (in production mode or test mode)
4. Go to Project Settings → General → Your apps → Add a Web App
5. Copy the `firebaseConfig` values into your `.env.local` file
6. Apply security rules above in Firebase Console → Firestore → Rules
