'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Pencil } from 'lucide-react';
import { LedgerEntryWithBalance } from '@/lib/types';
import { formatINR, formatDate } from '@/lib/validation';
import { TypeBadge } from '@/components/ui/Badge';
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog';
import { useDeleteWithUndo } from '@/components/undo/UndoProvider';
import type { LedgerScope } from '@/lib/types';
import { actionDeleteEntry, actionRestoreEntry } from '@/app/actions/ledger';
import { actionRestoreSecondaryEntry } from '@/app/actions/secondaryLedger';
import { ActionResult } from '@/lib/types';

interface LedgerTableProps {
  entries: LedgerEntryWithBalance[];
  onRefresh: () => void;
  showVendorName?: boolean;
  vendorNames?: Record<string, string>;
  onEditEntry?: (entry: LedgerEntryWithBalance) => void;
  onDeleteEntry?: (id: string) => Promise<ActionResult>;
  ledgerScope?: LedgerScope;
}

export function LedgerTable({
  entries,
  onRefresh,
  showVendorName = false,
  vendorNames = {},
  onEditEntry,
  onDeleteEntry = actionDeleteEntry,
  ledgerScope = 'party',
}: LedgerTableProps) {
  const registerDeleteUndo = useDeleteWithUndo();
  const [deleteTarget, setDeleteTarget] = useState<LedgerEntryWithBalance | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    const snapshot = deleteTarget;
    setDeleting(true);
    try {
      const res = await onDeleteEntry(snapshot.id);
      if (res.success) {
        setDeleteTarget(null);
        onRefresh();
        registerDeleteUndo('Line removed', async () => {
          const restore =
            ledgerScope === 'secondary'
              ? await actionRestoreSecondaryEntry(snapshot)
              : await actionRestoreEntry(snapshot);
          if (!restore.success) throw new Error(restore.error);
          onRefresh();
        });
      } else {
        toast.error(res.error);
      }
    } finally {
      setDeleting(false);
    }
  }

  if (entries.length === 0) {
    return <div className="empty-state">No lines in this range.</div>;
  }

  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {showVendorName && <th>Vendor</th>}
              <th>Date</th>
              <th>Type</th>
              <th className="hidden md:table-cell">Reference no</th>
              <th className="hidden lg:table-cell w-0 max-w-[10rem]">Notes</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Balance</th>
              <th className="text-center no-print w-[5.5rem] sm:w-[4.5rem]" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => {
              const isNil = entry.is_system_generated;
              const balanceClass =
                entry.running_balance > 0
                  ? 'text-balance-due'
                  : entry.running_balance < 0
                    ? 'text-balance-credit'
                    : '';

              return (
                <tr key={entry.id} className={isNil ? 'row-nil' : ''}>
                  {showVendorName && (
                    <td className="font-medium whitespace-nowrap">
                      {vendorNames[entry.vendor_id] ?? entry.vendor_id}
                    </td>
                  )}
                  <td className="whitespace-nowrap">{formatDate(entry.date)}</td>
                  <td>
                    <TypeBadge type={entry.type} />
                  </td>
                  <td className="hidden md:table-cell font-mono tabular-nums">{entry.doc_number}</td>
                  <td className="hidden lg:table-cell max-w-[10rem] w-0 align-top">
                    {isNil ? (
                      <span className="font-medium text-muted">Write-off</span>
                    ) : (
                      <span className="truncate block">{entry.notes || '—'}</span>
                    )}
                  </td>
                  <td className="text-right font-mono tabular-nums font-medium">
                    {formatINR(entry.amount)}
                  </td>
                  <td className={`text-right font-mono tabular-nums font-semibold ${balanceClass}`}>
                    {formatINR(entry.running_balance)}
                  </td>
                  <td className="text-center no-print">
                    <div className="flex items-center justify-center gap-0.5">
                      {onEditEntry && !isNil && (
                        <button
                          type="button"
                          onClick={() => onEditEntry(entry)}
                          aria-label="Edit entry"
                          className="icon-btn"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(entry)}
                        aria-label="Delete entry"
                        className="icon-btn icon-btn--danger"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete line"
        onConfirm={handleDelete}
        loading={deleting}
      >
        {deleteTarget ? (
          <>
            Remove this ledger line ({formatDate(deleteTarget.date)} · {deleteTarget.type} ·{' '}
            {formatINR(deleteTarget.amount)} · {deleteTarget.doc_number})?
          </>
        ) : null}
      </ConfirmDeleteDialog>
    </>
  );
}
