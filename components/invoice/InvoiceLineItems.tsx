'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { InvoiceLineItemInput } from '@/lib/invoice/types';
import { formatINR } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { GstRateToggle } from '@/components/invoice/GstRateToggle';

interface InvoiceLineItemsProps {
  lines: InvoiceLineItemInput[];
  onChange: (index: number, patch: Partial<InvoiceLineItemInput>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

const cellInput =
  '!min-h-[2rem] !py-1.5 !px-2 !text-sm rounded-md w-full';

export function InvoiceLineItems({ lines, onChange, onAdd, onRemove }: InvoiceLineItemsProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-xs text-slate-500 md:hidden">
        Swipe sideways to see all columns.
      </p>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[38rem] text-sm border-collapse table-fixed invoice-line-table">
            <colgroup>
              <col className="w-[3.25rem]" />
              <col className="w-[6.5rem]" />
              <col className="w-[3.5rem]" />
              <col className="w-[3.75rem]" />
              <col className="w-[4.75rem]" />
              <col className="w-[6.25rem]" />
              <col className="w-[4.75rem]" />
              <col className="w-[2.25rem]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200">
                <th className="py-2 px-2 font-semibold text-xs">No.</th>
                <th className="py-2 px-2 font-semibold text-xs">Description</th>
                <th className="py-2 px-2 font-semibold text-xs">HSN</th>
                <th className="py-2 px-2 font-semibold text-xs">Qty</th>
                <th className="py-2 px-2 font-semibold text-xs">Rate</th>
                <th className="py-2 px-2 font-semibold text-xs">GST</th>
                <th className="py-2 px-2 font-semibold text-xs text-right">Amount</th>
                <th className="py-2 px-1" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const amount = Math.round(line.quantity * line.rate * 100) / 100;
                return (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5 px-2 align-middle">
                      <input
                        className={cellInput}
                        value={line.serial_no}
                        onChange={e => onChange(i, { serial_no: e.target.value })}
                        aria-label={`Row ${i + 1} serial number`}
                      />
                    </td>
                    <td className="py-1.5 px-2 align-middle">
                      <input
                        className={`${cellInput} truncate`}
                        value={line.description}
                        onChange={e => onChange(i, { description: e.target.value })}
                        aria-label={`Row ${i + 1} description`}
                      />
                    </td>
                    <td className="py-1.5 px-2 align-middle">
                      <input
                        className={cellInput}
                        value={line.hsn_code}
                        onChange={e => onChange(i, { hsn_code: e.target.value })}
                        aria-label={`Row ${i + 1} HSN`}
                      />
                    </td>
                    <td className="py-1.5 px-2 align-middle">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        className={`${cellInput} no-spinner`}
                        value={line.quantity || ''}
                        onChange={e =>
                          onChange(i, { quantity: parseFloat(e.target.value) || 0 })
                        }
                        aria-label={`Row ${i + 1} quantity`}
                      />
                    </td>
                    <td className="py-1.5 px-2 align-middle">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`${cellInput} no-spinner`}
                        value={line.rate || ''}
                        onChange={e => onChange(i, { rate: parseFloat(e.target.value) || 0 })}
                        aria-label={`Row ${i + 1} rate`}
                      />
                    </td>
                    <td className="py-1.5 px-2 align-middle">
                      <GstRateToggle
                        compact
                        value={line.gst_rate}
                        onChange={rate => onChange(i, { gst_rate: rate })}
                        className="w-full"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-sm font-medium text-slate-800 align-middle whitespace-nowrap">
                      {formatINR(amount)}
                    </td>
                    <td className="py-1.5 px-1 align-middle">
                      <button
                        type="button"
                        onClick={() => onRemove(i)}
                        disabled={lines.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded"
                        aria-label={`Remove row ${i + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Button type="button" variant="outline" onClick={onAdd} className="w-full sm:w-auto self-start text-sm">
        <Plus size={15} />
        Add row
      </Button>
    </div>
  );
}
