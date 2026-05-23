import type { GstRate, InvoiceFormPayload, InvoiceLineItemInput } from '@/lib/invoice/types';
import {
  validateAmount,
  validateGSTIN,
  validateInvoiceNo,
  normalizeGSTIN,
} from '@/lib/validation';

function validateLineItems(lines: InvoiceLineItemInput[]): string | null {
  if (!lines.length) return 'Add at least one line item.';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const row = i + 1;
    if (!line.description.trim()) return `Line ${row}: description is required.`;
    const qtyCheck = validateAmount(line.quantity);
    if (!qtyCheck.valid) return `Line ${row}: ${qtyCheck.error}`;
    const rateCheck = validateAmount(line.rate);
    if (!rateCheck.valid) return `Line ${row}: ${rateCheck.error}`;
    if (line.gst_rate !== 5 && line.gst_rate !== 18) {
      return `Line ${row}: GST rate must be 5% or 18%.`;
    }
  }
  return null;
}

export function validateInvoicePayload(payload: InvoiceFormPayload): string | null {
  const noCheck = validateInvoiceNo(payload.invoice_no);
  if (!noCheck.valid) return noCheck.error!;
  if (!payload.invoice_date) return 'Date is required.';
  if (!payload.bill_to_company.trim()) return 'Bill To company name is required.';

  if (payload.bill_to_gstin.trim()) {
    const gstinCheck = validateGSTIN(payload.bill_to_gstin);
    if (!gstinCheck.valid) return gstinCheck.error!;
  }

  return validateLineItems(payload.line_items);
}

export function normalizeInvoicePayload(payload: InvoiceFormPayload): InvoiceFormPayload {
  const tax_mode = payload.tax_mode === 'cgst_sgst' ? 'cgst_sgst' : 'igst';
  return {
    ...payload,
    invoice_no: payload.invoice_no.trim(),
    tax_mode,
    bill_to_gstin: payload.bill_to_gstin.trim() ? normalizeGSTIN(payload.bill_to_gstin) : '',
    line_items: payload.line_items.map(line => ({
      ...line,
      gst_rate: line.gst_rate as GstRate,
      quantity: Number(line.quantity),
      rate: Number(line.rate),
    })),
  };
}
