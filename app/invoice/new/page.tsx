import Link from 'next/link';
import { InvoiceForm } from '@/components/invoice/InvoiceForm';

export default function NewInvoicePage() {
  return (
    <div className="max-w-5xl">
      <header className="mb-6 lg:mb-8">
        <Link
          href="/invoice"
          className="text-sm text-slate-500 no-underline hover:text-slate-800"
        >
          ← All invoices
        </Link>
        <h1 className="m-0 mt-2">New invoice</h1>
        <p className="m-0 mt-1.5 text-sm text-slate-600">
          Fill in the buyer and items, then tap Download PDF when ready.
        </p>
      </header>
      <InvoiceForm />
    </div>
  );
}
