'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { actionGetInvoice } from '@/app/actions/invoice';
import type { InvoiceWithLines } from '@/lib/invoice/types';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';

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
    return <p className="text-sm text-slate-500">Loading invoice…</p>;
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
