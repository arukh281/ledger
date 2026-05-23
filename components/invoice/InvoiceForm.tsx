'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  actionCreateInvoice,
  actionUpdateInvoice,
} from '@/app/actions/invoice';
import type { GstRate, InvoiceFormPayload, InvoiceWithLines, TaxMode } from '@/lib/invoice/types';
import { todayISO, validateInvoiceNo } from '@/lib/validation';
import { Card } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/invoice/CollapsibleSection';
import { InvoiceFormActions } from '@/components/invoice/InvoiceFormActions';
import { InvoiceLineItems } from '@/components/invoice/InvoiceLineItems';
import { InvoiceTotalsSummary } from '@/components/invoice/InvoiceTotalsSummary';
import { SellerStrip } from '@/components/invoice/SellerStrip';
import { TaxModeChoice } from '@/components/invoice/TaxModeChoice';

function parseFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return 'invoice.pdf';
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
  if (!match?.[1]) return 'invoice.pdf';
  try {
    return decodeURIComponent(match[1].replace(/['"]/g, ''));
  } catch {
    return match[1].replace(/['"]/g, '') || 'invoice.pdf';
  }
}

function emptyLine(serial: string) {
  return {
    serial_no: serial,
    description: '',
    hsn_code: '',
    quantity: 1,
    rate: 0,
    gst_rate: 5 as GstRate,
  };
}

function invoiceToFormState(invoice: InvoiceWithLines): InvoiceFormPayload {
  return {
    invoice_no: invoice.invoice_no,
    invoice_date: invoice.invoice_date,
    bill_to_company: invoice.bill_to_company,
    bill_to_address: invoice.bill_to_address,
    bill_to_pin: invoice.bill_to_pin,
    bill_to_po: invoice.bill_to_po,
    bill_to_gstin: invoice.bill_to_gstin,
    ship_to_company: invoice.ship_to_company,
    ship_to_address: invoice.ship_to_address,
    transport_detail: invoice.transport_detail,
    tax_mode: invoice.tax_mode === 'cgst_sgst' ? 'cgst_sgst' : 'igst',
    line_items: invoice.line_items.map(line => ({
      serial_no: line.serial_no,
      description: line.description,
      hsn_code: line.hsn_code,
      quantity: line.quantity,
      rate: line.rate,
      gst_rate: line.gst_rate as GstRate,
    })),
  };
}

function hasShipTo(data?: InvoiceWithLines | InvoiceFormPayload): boolean {
  if (!data) return false;
  return Boolean(data.ship_to_company?.trim() || data.ship_to_address?.trim());
}

interface InvoiceFormProps {
  invoiceId?: string;
  initial?: InvoiceWithLines;
}

export function InvoiceForm({ invoiceId, initial }: InvoiceFormProps) {
  const isEdit = Boolean(invoiceId);

  const [form, setForm] = useState<InvoiceFormPayload>(() =>
    initial
      ? invoiceToFormState(initial)
      : {
          invoice_no: '',
          invoice_date: todayISO(),
          bill_to_company: '',
          bill_to_address: '',
          bill_to_pin: '',
          bill_to_po: '',
          bill_to_gstin: '',
          ship_to_company: '',
          ship_to_address: '',
          transport_detail: '',
          tax_mode: 'igst' as TaxMode,
          line_items: [emptyLine('1.01')],
        }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savedId, setSavedId] = useState(invoiceId ?? '');

  const poDefaultOpen = Boolean(initial?.bill_to_po?.trim());
  const shipDefaultOpen = hasShipTo(initial);
  const transportDefaultOpen = Boolean(initial?.transport_detail?.trim());

  function setField<K extends keyof InvoiceFormPayload>(key: K, value: InvoiceFormPayload[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: '' }));
  }

  function setLine(index: number, patch: Partial<InvoiceFormPayload['line_items'][0]>) {
    setForm(f => {
      const lines = [...f.line_items];
      lines[index] = { ...lines[index]!, ...patch };
      return { ...f, line_items: lines };
    });
  }

  function addLine() {
    const next = form.line_items.length + 1;
    const serial = `1.${String(next).padStart(2, '0')}`;
    setForm(f => ({ ...f, line_items: [...f.line_items, emptyLine(serial)] }));
  }

  function removeLine(index: number) {
    if (form.line_items.length <= 1) return;
    setForm(f => ({ ...f, line_items: f.line_items.filter((_, i) => i !== index) }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const noCheck = validateInvoiceNo(form.invoice_no);
    if (!noCheck.valid) errs.invoice_no = noCheck.error!;
    if (!form.invoice_date) errs.invoice_date = 'Date is required';
    if (!form.bill_to_company.trim()) errs.bill_to_company = 'Company name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function persistInvoice(): Promise<string | null> {
    const id = savedId || invoiceId;
    const res =
      id && (isEdit || savedId)
        ? await actionUpdateInvoice(id, form)
        : await actionCreateInvoice(form);

    if (!res.success) {
      toast.error(res.error);
      return null;
    }

    setSavedId(res.data.id);
    if (!isEdit && !invoiceId) {
      window.history.replaceState(null, '', `/invoice/${res.data.id}`);
    }
    return res.data.id;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const id = await persistInvoice();
      if (id) toast.success(isEdit ? 'Invoice updated.' : 'Invoice saved.');
    } finally {
      setSaving(false);
    }
  }

  function triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  async function handleDownload() {
    if (!validate()) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/invoice/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: form,
          id: savedId || invoiceId || undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? 'PDF download failed.');
        return;
      }

      const newId = res.headers.get('X-Invoice-Id');
      if (newId) {
        setSavedId(newId);
        if (!isEdit && !invoiceId) {
          window.history.replaceState(null, '', `/invoice/${newId}`);
        }
      }

      const blob = await res.blob();
      if (blob.size === 0 || blob.type.includes('json')) {
        toast.error('PDF download failed — server returned an invalid file.');
        return;
      }
      const name = parseFilename(res.headers.get('Content-Disposition'));
      triggerBlobDownload(blob, name);
      toast.success('Saved and downloaded.');
    } catch {
      toast.error('PDF download failed.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <SellerStrip />

      <div className="mt-4 flex flex-col gap-4 min-w-0">
          <Card className="p-4 sm:p-5 shadow-sm ring-1 ring-slate-200/60">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="inv-no">
                    Invoice no. <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="inv-no"
                    type="text"
                    value={form.invoice_no}
                    onChange={e => setField('invoice_no', e.target.value)}
                    placeholder="3872"
                  />
                  {errors.invoice_no && (
                    <p className="mt-1 text-xs font-medium text-red-600">{errors.invoice_no}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="inv-date">
                    Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="inv-date"
                    type="date"
                    value={form.invoice_date}
                    onChange={e => setField('invoice_date', e.target.value)}
                  />
                  {errors.invoice_date && (
                    <p className="mt-1 text-xs font-medium text-red-600">{errors.invoice_date}</p>
                  )}
                </div>
              </div>

              <hr className="m-0 border-0 border-t border-slate-100" />

              <div className="flex flex-col gap-3">
                <h2 className="m-0 text-sm font-semibold text-slate-900">Bill to</h2>
                <div>
                  <label htmlFor="bill-company">
                    Company <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="bill-company"
                    value={form.bill_to_company}
                    onChange={e => setField('bill_to_company', e.target.value)}
                  />
                  {errors.bill_to_company && (
                    <p className="mt-1 text-xs font-medium text-red-600">{errors.bill_to_company}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="bill-address">Address</label>
                  <textarea
                    id="bill-address"
                    rows={2}
                    value={form.bill_to_address}
                    onChange={e => setField('bill_to_address', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="bill-pin">PIN</label>
                    <input
                      id="bill-pin"
                      value={form.bill_to_pin}
                      onChange={e => setField('bill_to_pin', e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="bill-gstin">GSTIN</label>
                    <input
                      id="bill-gstin"
                      value={form.bill_to_gstin}
                      onChange={e => setField('bill_to_gstin', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <hr className="m-0 border-0 border-t border-slate-100" />

              <div>
                <h2 className="m-0 mb-2 text-sm font-semibold text-slate-900">Line items</h2>
                <InvoiceLineItems
                  lines={form.line_items}
                  onChange={setLine}
                  onAdd={addLine}
                  onRemove={removeLine}
                />
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            <p className="m-0 text-xs font-medium text-slate-500">Optional</p>
            <CollapsibleSection title="Purchase order" optional defaultOpen={poDefaultOpen}>
              <div>
                <label htmlFor="bill-po">PO number</label>
                <input
                  id="bill-po"
                  value={form.bill_to_po}
                  onChange={e => setField('bill_to_po', e.target.value)}
                  placeholder="Leave blank if none"
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Ship to (different address)" optional defaultOpen={shipDefaultOpen}>
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="ship-company">Company</label>
                  <input
                    id="ship-company"
                    value={form.ship_to_company}
                    onChange={e => setField('ship_to_company', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="ship-address">Address</label>
                  <textarea
                    id="ship-address"
                    rows={2}
                    value={form.ship_to_address}
                    onChange={e => setField('ship_to_address', e.target.value)}
                  />
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Transport" optional defaultOpen={transportDefaultOpen}>
              <div>
                <label htmlFor="transport">Vehicle or transport note</label>
                <input
                  id="transport"
                  value={form.transport_detail}
                  onChange={e => setField('transport_detail', e.target.value)}
                  placeholder="e.g. UK17ER3756"
                />
              </div>
            </CollapsibleSection>
          </div>

        <Card className="p-4 sm:p-5 shadow-sm border-amber-200/60 bg-gradient-to-b from-white to-amber-50/30">
          <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-amber-900/60">
            Total
          </h2>
          <div className="mt-4">
            <label className="mb-1.5">Tax type</label>
            <TaxModeChoice
              value={form.tax_mode}
              onChange={mode => setField('tax_mode', mode)}
            />
          </div>
          <div className="mt-4">
            <InvoiceTotalsSummary lineItems={form.line_items} taxMode={form.tax_mode} />
          </div>
          <div className="mt-5 pt-5 border-t border-slate-100">
            <InvoiceFormActions
              isEdit={isEdit}
              saving={saving}
              downloading={downloading}
              onDownload={handleDownload}
            />
          </div>
        </Card>
      </div>
    </form>
  );
}
