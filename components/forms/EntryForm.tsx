'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, IndianRupee } from 'lucide-react';
import { actionCreateEntry, actionUpdateEntry } from '@/app/actions/ledger';
import { Vendor, EntryType, LedgerEntry } from '@/lib/types';
import { validateAmount, validateDocNumber, todayISO } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { VendorCombobox } from '@/components/forms/VendorCombobox';

interface EntryFormProps {
  vendors: Vendor[];
  onSuccess?: () => void;
  preselectedVendorId?: string;
  /** When set, saves update this entry instead of creating a new one */
  entryToEdit?: LedgerEntry | null;
}

interface FormState {
  vendorId: string;
  type: EntryType;
  date: string;
  amount: string;
  docNumber: string;
  notes: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

export function EntryForm({ vendors, onSuccess, preselectedVendorId, entryToEdit }: EntryFormProps) {
  const isEdit = Boolean(entryToEdit);

  const [form, setForm] = useState<FormState>(() =>
    entryToEdit
      ? {
          vendorId: entryToEdit.vendor_id,
          type: entryToEdit.type,
          date: entryToEdit.date,
          amount: String(entryToEdit.amount),
          docNumber: entryToEdit.doc_number,
          notes: entryToEdit.notes,
        }
      : {
          vendorId: preselectedVendorId ?? '',
          type: 'invoice',
          date: todayISO(),
          amount: '',
          docNumber: '',
          notes: '',
        }
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [vendorFieldKey, setVendorFieldKey] = useState(0);

  useEffect(() => {
    if (!preselectedVendorId || isEdit) return;
    setForm(f => ({ ...f, vendorId: preselectedVendorId }));
  }, [preselectedVendorId, isEdit]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.vendorId) errs.vendorId = 'Choose a vendor from the list';
    const amtCheck = validateAmount(form.amount);
    if (!amtCheck.valid) errs.amount = amtCheck.error;
    const docCheck = validateDocNumber(form.docNumber);
    if (!docCheck.valid) errs.docNumber = docCheck.error;
    if (!form.date) errs.date = 'Date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (entryToEdit) {
        const res = await actionUpdateEntry(
          entryToEdit.id,
          form.type,
          form.date,
          form.amount,
          form.docNumber,
          form.notes
        );
        if (res.success) {
          toast.success('Updated.');
          setErrors({});
          onSuccess?.();
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await actionCreateEntry(
          form.vendorId,
          form.type,
          form.date,
          form.amount,
          form.docNumber,
          form.notes
        );
        if (res.success) {
          toast.success('Saved.');
          setForm({
            vendorId: preselectedVendorId ?? '',
            type: 'invoice',
            date: todayISO(),
            amount: '',
            docNumber: '',
            notes: '',
          });
          if (!preselectedVendorId) setVendorFieldKey(k => k + 1);
          setErrors({});
          onSuccess?.();
        } else {
          toast.error(res.error);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  const lockedVendor = Boolean(preselectedVendorId) || isEdit;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-3">
        <VendorCombobox
          key={vendorFieldKey}
          inputId="ef-vendor"
          vendors={vendors}
          value={form.vendorId}
          onChange={id => set('vendorId', id)}
          disabled={lockedVendor}
          error={errors.vendorId}
        />

        <div>
          <label>Type</label>
          <div className="flex gap-1 mt-1 p-1 rounded-md bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => set('type', 'invoice')}
              className={[
                'flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
                form.type === 'invoice'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent',
              ].join(' ')}
            >
              Invoice
            </button>
            <button
              type="button"
              onClick={() => set('type', 'payment')}
              className={[
                'flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
                form.type === 'payment'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent',
              ].join(' ')}
            >
              Payment
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ef-date">Date</label>
            <input
              id="ef-date"
              type="date"
              value={form.date}
              onChange={e => set('date', e.target.value)}
              max={todayISO()}
            />
            {errors.date && (
              <p className="mt-1 text-sm font-medium text-red-600">{errors.date}</p>
            )}
          </div>
          <div>
            <label htmlFor="ef-amount">Amount (₹)</label>
            <div
              className="flex min-h-[2.5rem] w-full items-stretch overflow-hidden rounded-md border bg-white transition-[border-color,box-shadow] focus-within:border-[var(--primary)] focus-within:shadow-[0_0_0_2px_rgba(30,64,175,0.12)]"
              style={{ borderColor: 'var(--border)' }}
            >
              <span
                className="flex w-10 shrink-0 items-center justify-center border-r text-slate-400 select-none"
                style={{ borderColor: 'var(--border)' }}
                aria-hidden
              >
                <IndianRupee size={17} strokeWidth={1.75} />
              </span>
              <input
                id="ef-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0.00"
                className="input-infix"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm font-medium text-red-600">{errors.amount}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="ef-doc">
            {form.type === 'invoice' ? 'Invoice no.' : 'Receipt no.'}
          </label>
          <input
            id="ef-doc"
            type="text"
            value={form.docNumber}
            onChange={e => set('docNumber', e.target.value)}
            placeholder={form.type === 'invoice' ? 'INV-…' : 'REC-…'}
          />
          {errors.docNumber && (
            <p className="mt-1 text-sm font-medium text-red-600">{errors.docNumber}</p>
          )}
        </div>

        <div>
          <label htmlFor="ef-notes">Notes</label>
          <textarea
            id="ef-notes"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Optional"
            rows={2}
            style={{ resize: 'vertical' }}
          />
        </div>

        <Button type="submit" loading={saving} fullWidth>
          <Save size={16} />
          {isEdit ? 'Save changes' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
