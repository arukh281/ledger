'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { actionGetInvoice } from '@/app/actions/invoice';
import type { InvoiceWithLines } from '@/lib/invoice/types';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';
import { Card } from '@/components/ui/Card';

export default function EditInvoicePage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [invoice, setInvoice] = useState<InvoiceWithLines | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let active = true;
    actionGetInvoice(id).then(res => {
      if (!active) return;
      if (res.success) {
        setInvoice(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl flex flex-col gap-4" aria-hidden>
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-28 rounded-full bg-[oklch(92%_0.008_250)]" />
          <div className="h-7 w-40 rounded-full bg-[oklch(92%_0.008_250)]" />
          <div className="h-4 w-64 max-w-full rounded-full bg-[oklch(92%_0.008_250)]" />
        </div>
        <Card className="animate-pulse">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-11 rounded-lg bg-[oklch(92%_0.008_250)]" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-lg">
        <Link href="/invoice" className="text-sm text-slate-500 no-underline hover:text-slate-800">
          ← All invoices
        </Link>
        <p className="mt-4 text-red-600">{error ?? 'Invoice not found.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <header className="mb-6 lg:mb-8">
        <Link
          href="/invoice"
          className="text-sm text-slate-500 no-underline hover:text-slate-800"
        >
          ← All invoices
        </Link>
        <h1 className="m-0 mt-2">Invoice #{invoice.invoice_no}</h1>
        <p className="m-0 mt-1.5 text-sm text-slate-600">
          Edit details below, then download an updated PDF.
        </p>
      </header>
      <InvoiceForm invoiceId={id} initial={invoice} />
    </div>
  );
}
