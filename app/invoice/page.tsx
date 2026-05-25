'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FileText, Plus, Trash2 } from 'lucide-react';
import {
  actionDeleteInvoice,
  actionGetInvoice,
  actionListInvoices,
  actionRestoreInvoice,
} from '@/app/actions/invoice';
import type { InvoiceListItem, InvoiceWithLines } from '@/lib/invoice/types';
import { formatDate, formatINR } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog';
import { useDeleteWithUndo } from '@/components/undo/UndoProvider';

function toListItem(inv: InvoiceWithLines): InvoiceListItem {
  return {
    id: inv.id,
    invoice_no: inv.invoice_no,
    invoice_date: inv.invoice_date,
    bill_to_company: inv.bill_to_company,
    grand_total: inv.grand_total,
  };
}

function sortInvoices(items: InvoiceListItem[]): InvoiceListItem[] {
  return [...items].sort((a, b) => {
    const byDate = b.invoice_date.localeCompare(a.invoice_date);
    if (byDate !== 0) return byDate;
    return b.invoice_no.localeCompare(a.invoice_no);
  });
}

export default function InvoiceListPage() {
  const registerDeleteUndo = useDeleteWithUndo();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    void actionListInvoices().then(res => {
      if (!active) return;
      if (res.success) {
        setInvoices(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleDelete() {
    if (!deleteTarget) return;
    const snapshot = deleteTarget;
    setDeleting(true);

    const fullRes = await actionGetInvoice(snapshot.id);
    if (!fullRes.success) {
      setDeleting(false);
      toast.error(fullRes.error);
      return;
    }

    const res = await actionDeleteInvoice(snapshot.id);
    setDeleting(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }

    setInvoices(prev => prev.filter(inv => inv.id !== snapshot.id));
    setDeleteTarget(null);

    const full = fullRes.data;
    registerDeleteUndo(`Invoice #${snapshot.invoice_no}`, async () => {
      const restore = await actionRestoreInvoice(full);
      if (!restore.success) throw new Error(restore.error);
      setInvoices(prev => sortInvoices([...prev, toListItem(restore.data)]));
    });
  }

  return (
    <div className="page max-w-3xl">
      <header className="page-header page-header--row">
        <div>
          <h1 className="m-0">Invoices</h1>
          <p className="m-0 mt-1.5 text-sm text-muted leading-snug">
            Create and download GST invoices for Moradabad House.
          </p>
        </div>
        <Link href="/invoice/new" className="shrink-0">
          <Button className="w-full sm:w-auto">
            <Plus size={16} />
            New invoice
          </Button>
        </Link>
      </header>

      {loading && (
        <div className="flex flex-col gap-2" aria-hidden>
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="flex items-center gap-4 py-3.5 animate-pulse">
              <div className="flex-1 min-w-0">
                <div className="h-4 w-24 rounded-full bg-[oklch(92%_0.008_250)]" />
                <div className="mt-2 h-3 w-40 max-w-full rounded-full bg-[oklch(92%_0.008_250)]" />
                <div className="mt-2 h-3 w-20 rounded-full bg-[oklch(92%_0.008_250)]" />
              </div>
              <div className="hidden sm:block w-24 shrink-0">
                <div className="ml-auto h-3 w-10 rounded-full bg-[oklch(92%_0.008_250)]" />
                <div className="mt-2 ml-auto h-4 w-20 rounded-full bg-[oklch(92%_0.008_250)]" />
              </div>
              <div className="h-10 w-10 shrink-0 rounded-md bg-[oklch(92%_0.008_250)]" />
            </Card>
          ))}
        </div>
      )}

      {error && (
        <p className="m-0 text-sm font-medium text-red-600 rounded-lg bg-red-50 px-4 py-3">
          {error}
        </p>
      )}

      {!loading && !error && invoices.length === 0 && (
        <div
          className="rounded-xl border border-dashed px-6 py-12 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <FileText className="mx-auto text-muted opacity-40" size={40} strokeWidth={1.25} />
          <p className="m-0 mt-4 text-base font-medium">No invoices yet</p>
          <p className="m-0 mt-1 text-sm text-muted">
            Start with your first invoice. You can save a draft and download the PDF anytime.
          </p>
          <Link href="/invoice/new" className="inline-block mt-6 no-underline">
            <Button>
              <Plus size={16} />
              Create invoice
            </Button>
          </Link>
        </div>
      )}

      {!loading && !error && invoices.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col gap-2">
          {invoices.map(inv => (
            <li key={inv.id} className="[content-visibility:auto] [contain-intrinsic-size:5.5rem]">
              <Card className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 py-3.5">
                <Link
                  href={`/invoice/${inv.id}`}
                  className="flex-1 min-w-0 text-left no-underline rounded-md transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  <p className="m-0 font-semibold tabular-nums text-sm">#{inv.invoice_no}</p>
                  <p className="m-0 mt-0.5 text-sm text-muted truncate">
                    {inv.bill_to_company || 'No company name'}
                  </p>
                  <p className="m-0 mt-1 text-xs text-muted">{formatDate(inv.invoice_date)}</p>
                </Link>
                <div className="shrink-0 text-right sm:min-w-[6.5rem]">
                  <p className="text-xs m-0 text-muted">Total</p>
                  <p className="text-sm font-semibold font-mono tabular-nums m-0 mt-0.5">
                    {formatINR(inv.grand_total)}
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => setDeleteTarget(inv)}
                  aria-label={`Delete invoice #${inv.invoice_no}`}
                  className="shrink-0 self-center px-3"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete invoice"
        onConfirm={handleDelete}
        loading={deleting}
      >
        {deleteTarget ? (
          <>
            Remove invoice{' '}
            <span className="font-medium text-slate-900">#{deleteTarget.invoice_no}</span>
            {deleteTarget.bill_to_company ? ` (${deleteTarget.bill_to_company})` : ''}?
          </>
        ) : null}
      </ConfirmDeleteDialog>
    </div>
  );
}
