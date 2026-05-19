export type EntryType = 'invoice' | 'payment';

export type LedgerScope = 'primary' | 'secondary';

export interface Vendor {
  id: string;
  name: string;
  gstin: string;
  created_at: string;
  updated_at: string;
}

export interface SecondaryVendor {
  id: string;
  name: string;
  ref: string;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  vendor_id: string;
  type: EntryType;
  date: string; // YYYY-MM-DD
  amount: number;
  doc_number: string;
  notes: string;
  is_system_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntryWithBalance extends LedgerEntry {
  running_balance: number;
}

export interface LedgerSummary {
  opening_balance: number;
  total_invoiced: number;
  total_paid: number;
  closing_balance: number;
}

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
