import { LedgerEntry, LedgerEntryWithBalance, LedgerSummary } from './types';

/**
 * Contribution of an entry to the running balance:
 *   invoice = +amount (we owe the vendor more)
 *   payment = -amount (we paid the vendor)
 */
export function entryContribution(entry: LedgerEntry): number {
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
  // Split: entries before the range (for opening balance) vs. entries in range
  const beforeRange: LedgerEntry[] = [];
  const inRange: LedgerEntry[] = [];

  for (const e of allEntries) {
    const beforeFrom = fromDate ? e.date < fromDate : false;
    const afterTo = toDate ? e.date > toDate : false;

    if (beforeFrom) {
      beforeRange.push(e);
    } else if (!afterTo) {
      inRange.push(e);
    }
    // entries after toDate are just ignored
  }

  // Opening balance = sum of all contributions before the `from` date
  const opening_balance = beforeRange.reduce(
    (acc, e) => acc + entryContribution(e),
    0
  );

  // Compute running balance for entries in range
  let running = opening_balance;
  const entries: LedgerEntryWithBalance[] = inRange.map(e => {
    running += entryContribution(e);
    return { ...e, running_balance: running };
  });

  const total_invoiced = inRange
    .filter(e => e.type === 'invoice')
    .reduce((acc, e) => acc + e.amount, 0);

  const total_paid = inRange
    .filter(e => e.type === 'payment')
    .reduce((acc, e) => acc + e.amount, 0);

  const closing_balance = opening_balance + total_invoiced - total_paid;

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
