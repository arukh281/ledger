'use client';

import { computeInvoiceTotals } from '@/lib/invoice/calculations';
import type { InvoiceLineItemInput, TaxMode } from '@/lib/invoice/types';
import { amountInWords } from '@/lib/invoice/amountInWords';
import { formatINR } from '@/lib/validation';

interface InvoiceTotalsSummaryProps {
  lineItems: InvoiceLineItemInput[];
  taxMode: TaxMode;
  /** Sidebar layout: hide duplicate grand-total block and shorten helper text. */
  compact?: boolean;
}

export function InvoiceTotalsSummary({
  lineItems,
  taxMode,
  compact = false,
}: InvoiceTotalsSummaryProps) {
  const totals = computeInvoiceTotals(lineItems, taxMode);
  const show5 = totals.subtotal_5 > 0;
  const show18 = totals.subtotal_18 > 0;
  const words = amountInWords(totals.grand_total);
  const isIgst = taxMode === 'igst';

  function taxRows(): Array<{ label: string; v5?: string; v18?: string }> {
    if (isIgst) {
      return [
        { label: 'IGST', v5: formatINR(totals.igst_5), v18: formatINR(totals.igst_18) },
      ];
    }
    return [
      {
        label: 'CGST',
        v5: show5 ? formatINR(totals.cgst_5) : undefined,
        v18: show18 ? formatINR(totals.cgst_18) : undefined,
      },
      {
        label: 'SGST',
        v5: show5 ? formatINR(totals.sgst_5) : undefined,
        v18: show18 ? formatINR(totals.sgst_18) : undefined,
      },
    ];
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="py-2.5 px-3 font-semibold text-slate-700 w-[40%]" />
              {show5 && (
                <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">@ 5% GST</th>
              )}
              {show18 && (
                <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">@ 18% GST</th>
              )}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-200">
              <td className="py-2 px-3 text-slate-600">Taxable value</td>
              {show5 && (
                <td className="py-2 px-3 text-right tabular-nums font-medium">
                  {formatINR(totals.subtotal_5)}
                </td>
              )}
              {show18 && (
                <td className="py-2 px-3 text-right tabular-nums font-medium">
                  {formatINR(totals.subtotal_18)}
                </td>
              )}
            </tr>
            {taxRows().map(row => (
              <tr key={row.label} className="border-t border-slate-200 bg-slate-50/50">
                <td className="py-2 px-3 text-slate-600">{row.label}</td>
                {show5 && (
                  <td className="py-2 px-3 text-right tabular-nums font-medium">{row.v5 ?? '—'}</td>
                )}
                {show18 && (
                  <td className="py-2 px-3 text-right tabular-nums font-medium">{row.v18 ?? '—'}</td>
                )}
              </tr>
            ))}
            <tr className="border-t border-slate-200">
              <td className="py-2 px-3 text-slate-600 font-medium">Total (incl. tax)</td>
              {show5 && (
                <td className="py-2 px-3 text-right tabular-nums font-semibold">
                  {formatINR(totals.total_after_tax_5)}
                </td>
              )}
              {show18 && (
                <td className="py-2 px-3 text-right tabular-nums font-semibold">
                  {formatINR(totals.total_after_tax_18)}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      <div
        className={`rounded-lg px-4 py-3 flex flex-col gap-1 ${
          compact ? '' : 'sm:flex-row sm:items-center sm:justify-between sm:gap-2'
        }`}
        style={{ background: 'var(--invoice-bg)', border: '1px solid var(--invoice-border)' }}
      >
        <span
          className={`font-medium ${compact ? 'text-xs uppercase tracking-wide' : 'text-sm'}`}
          style={{ color: 'var(--invoice-text)' }}
        >
          Grand total
        </span>
        <span
          className={`font-bold tabular-nums ${compact ? 'text-2xl' : 'text-xl'}`}
          style={{ color: 'var(--invoice-text)' }}
        >
          {formatINR(totals.grand_total)}
        </span>
      </div>

      {totals.grand_total > 0 && (
        <p className="m-0 text-xs text-slate-500 italic leading-relaxed">{words}</p>
      )}
    </div>
  );
}
