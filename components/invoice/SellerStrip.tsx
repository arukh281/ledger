import { Building2 } from 'lucide-react';
import { INVOICE_SELLER } from '@/lib/invoice/seller';

export function SellerStrip() {
  return (
    <div
      className="rounded-xl px-4 py-3.5 flex gap-3 items-start shadow-sm"
      style={{
        background: 'linear-gradient(135deg, var(--invoice-bg) 0%, #fffef8 100%)',
        border: '1px solid var(--invoice-border)',
        color: 'var(--invoice-text)',
      }}
    >
      <span
        className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg"
        style={{ background: 'rgba(251, 191, 36, 0.25)' }}
        aria-hidden
      >
        <Building2 size={18} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="m-0 font-semibold text-[0.9375rem] tracking-tight">{INVOICE_SELLER.name}</p>
        <p className="m-0 mt-1 text-xs leading-relaxed opacity-90">
          {INVOICE_SELLER.addressLine1}, {INVOICE_SELLER.city}
        </p>
        <p className="m-0 mt-0.5 text-xs font-medium tabular-nums opacity-80">
          GSTIN {INVOICE_SELLER.gstin}
        </p>
      </div>
    </div>
  );
}
