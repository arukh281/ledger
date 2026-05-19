'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Pencil } from 'lucide-react';
import { LedgerEntryWithBalance } from '@/lib/types';
import { formatINR, formatDate } from '@/lib/validation';
import { TypeBadge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { actionDeleteEntry } from '@/app/actions/ledger';
import { ActionResult } from '@/lib/types';

interface LedgerTableProps {
  entries: LedgerEntryWithBalance[];
  onRefresh: () => void;
  showVendorName?: boolean;
  vendorNames?: Record<string, string>;
  onEditEntry?: (entry: LedgerEntryWithBalance) => void;
  onDeleteEntry?: (id: string) => Promise<ActionResult>;
}

export function LedgerTable({
  entries,
  onRefresh,
  showVendorName = false,
  vendorNames = {},
  onEditEntry,
  onDeleteEntry = actionDeleteEntry,
}: LedgerTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<LedgerEntryWithBalance | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await onDeleteEntry(deleteTarget.id);
      if (res.success) {
        toast.success('Removed.');
        setDeleteTarget(null);
        onRefresh();
      } else {
        toast.error(res.error);
      }
    } finally {
      setDeleting(false);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        No lines in this range.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {showVendorName && (
                <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 uppercase tracking-wide">Vendor</th>
              )}
              <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 uppercase tracking-wide">Date</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 uppercase tracking-wide">Type</th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 uppercase tracking-wide">
                Reference no
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-medium text-slate-600 uppercase tracking-wide w-0 max-w-[10rem]">Notes</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-slate-600 uppercase tracking-wide">Amount</th>
              <th className="px-3 py-2.5 text-right text-xs font-medium text-slate-600 uppercase tracking-wide">Balance</th>
              <th className="px-3 py-2.5 text-center text-xs font-medium text-slate-600 uppercase tracking-wide no-print w-[4.5rem]"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              const isNil = entry.is_system_generated;
              const rowBg = isNil
                ? '#f1f5f9'
                : idx % 2 === 0
                ? '#ffffff'
                : '#f8fafc';

              return (
                <tr
                  key={entry.id}
                  style={{ background: rowBg }}
                  className={isNil ? 'row-nil' : ''}
                >
                  {showVendorName && (
                    <td className="px-3 py-2.5 text-sm font-medium">
                      {vendorNames[entry.vendor_id] ?? entry.vendor_id}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-sm whitespace-nowrap">
                    {formatDate(entry.date)}
                  </td>
                  <td className="px-3 py-2.5 text-sm">
                    <TypeBadge type={entry.type} />
                  </td>
                  <td className="px-3 py-2.5 text-sm font-mono tabular-nums">
                    {entry.doc_number}
                  </td>
                  <td className="px-3 py-2.5 text-sm max-w-[10rem] w-0 align-top">
                    {isNil ? (
                      <span className="text-slate-600 font-medium">Write-off</span>
                    ) : (
                      <span className="truncate block">{entry.notes || '—'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-right font-mono tabular-nums font-medium">
                    {formatINR(entry.amount)}
                  </td>
                  <td
                    className="px-3 py-2.5 text-sm text-right font-mono tabular-nums font-semibold"
                    style={{
                      color:
                        entry.running_balance > 0
                          ? '#92400e'
                          : entry.running_balance < 0
                          ? '#166534'
                          : 'var(--text-primary)',
                    }}
                  >
                    {formatINR(entry.running_balance)}
                  </td>
                  <td className="px-3 py-2.5 text-center no-print">
                    <div className="flex items-center justify-center gap-0.5">
                      {onEditEntry && !isNil && (
                        <button
                          type="button"
                          onClick={() => onEditEntry(entry)}
                          aria-label="Edit entry"
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(entry)}
                        aria-label="Delete entry"
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete line"
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              <Trash2 size={16} /> Delete
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="m-0 text-sm text-slate-600">
            {formatDate(deleteTarget.date)} · {deleteTarget.type} · {formatINR(deleteTarget.amount)} · {deleteTarget.doc_number}
          </p>
        )}
      </Dialog>
    </>
  );
}
