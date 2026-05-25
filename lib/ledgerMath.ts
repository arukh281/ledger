import { LedgerEntry, LedgerEntryWithBalance, LedgerSummary } from './types';

/**
 * Contribution of an entry to the running balance:
 *   invoice = +amount (we owe the vendor more)
 *   payment = -amount (we paid the vendor)
 */
export function entryContribution(entry: Pick<LedgerEntry, 'type' | 'amount'>): number {
  return entry.type === 'invoice' ? entry.amount : -entry.amount;
}

/**
 * Compute ledger data for a vendor within an optional date range.
 *
 * @param allEntries  All entries for the vendor, sorted by date ASC then created_at ASC.
 * @param fromDate    ISO date string "YYYY-MM-DD" — start of filter range (inclusive). Null = no lower bound.
 * @param toDate      ISO date string "YYYY-MM-DD" — end of filter range (inclusive). Null = no upper bound.
 * @returns           Entries in range with running_balance, and a summary object.
 */
export function computeLedger(
  allEntries: LedgerEntry[],
  fromDate: string | null,
  toDate: string | null
): { entries: LedgerEntryWithBalance[]; summary: LedgerSummary } {
  let opening_balance = 0;
  let running_balance = 0;
  let total_invoiced = 0;
  let total_paid = 0;
  const entries: LedgerEntryWithBalance[] = [];

  for (const entry of allEntries) {
    const contribution = entryContribution(entry);
    const beforeFrom = fromDate ? entry.date < fromDate : false;
    const afterTo = toDate ? entry.date > toDate : false;

    if (beforeFrom) {
      opening_balance += contribution;
      continue;
    }

    if (afterTo) {
      continue;
    }

    if (entries.length === 0) {
      running_balance = opening_balance;
    }

    running_balance += contribution;
    entries.push({ ...entry, running_balance });

    if (entry.type === 'invoice') {
      total_invoiced += entry.amount;
    } else {
      total_paid += entry.amount;
    }
  }

  const closing_balance = entries.length === 0 ? opening_balance : running_balance;

  return {
    entries,
    summary: { opening_balance, total_invoiced, total_paid, closing_balance },
  };
}

/**
 * Compute the current closing balance for a vendor (no date filter).
 * Positive = we owe the vendor, Negative = vendor owes us.
 */
export function computeClosingBalance(allEntries: LedgerEntry[]): number {
  return allEntries.reduce((acc, e) => acc + entryContribution(e), 0);
}

export type LedgerEntryBalanceSlice = Pick<LedgerEntry, 'vendor_id' | 'type' | 'amount'>;

/** Sum closing balance per vendor from entry slices (one query for all vendors). */
export function computeClosingBalancesByVendor(
  entries: LedgerEntryBalanceSlice[]
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const e of entries) {
    balances[e.vendor_id] = (balances[e.vendor_id] ?? 0) + entryContribution(e);
  }
  return balances;
}
