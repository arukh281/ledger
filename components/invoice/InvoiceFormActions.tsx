'use client';

import { Download, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface InvoiceFormActionsProps {
  isEdit: boolean;
  saving: boolean;
  downloading: boolean;
  onDownload: () => void;
  className?: string;
  showHint?: boolean;
  grandTotalLabel?: string;
  layout?: 'stacked' | 'bar';
}

export function InvoiceFormActions({
  isEdit,
  saving,
  downloading,
  onDownload,
  className = '',
  showHint = true,
  grandTotalLabel,
  layout = 'stacked',
}: InvoiceFormActionsProps) {
  const buttons =
    layout === 'bar' ? (
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          loading={downloading}
          onClick={onDownload}
          fullWidth
          className="!bg-amber-900 hover:!bg-amber-950 !border-amber-900 text-sm"
        >
          <Download size={16} />
          PDF
        </Button>
        <Button type="submit" variant="outline" loading={saving} fullWidth className="text-sm">
          <Save size={16} />
          Save
        </Button>
      </div>
    ) : (
      <>
        <Button
          type="button"
          loading={downloading}
          onClick={onDownload}
          fullWidth
          className="!bg-amber-900 hover:!bg-amber-950 !border-amber-900"
        >
          <Download size={16} />
          Download PDF
        </Button>
        <Button type="submit" variant="outline" loading={saving} fullWidth>
          <Save size={16} />
          {isEdit ? 'Save changes' : 'Save draft'}
        </Button>
      </>
    );

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {grandTotalLabel ? (
        <div className="flex items-baseline justify-between gap-2 pb-0.5">
          <span className="text-sm text-slate-600">Grand total</span>
          <span className="text-lg font-bold tabular-nums text-slate-900">{grandTotalLabel}</span>
        </div>
      ) : null}
      {buttons}
      {showHint ? (
        <p className="m-0 text-xs text-slate-500 leading-snug text-center">
          Download saves the invoice and opens the PDF on your device.
        </p>
      ) : null}
    </div>
  );
}
