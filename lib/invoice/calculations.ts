import type { GstRate, InvoiceLineItemInput, TaxMode } from './types';

export interface ComputedLineItem extends InvoiceLineItemInput {
  line_amount: number;
}

export interface InvoiceTotals {
  subtotal_5: number;
  subtotal_18: number;
  igst_5: number;
  igst_18: number;
  cgst_5: number;
  sgst_5: number;
  cgst_18: number;
  sgst_18: number;
  total_after_tax_5: number;
  total_after_tax_18: number;
  grand_total: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeLineAmount(quantity: number, rate: number): number {
  return round2(quantity * rate);
}

export function computeLineItems(lines: InvoiceLineItemInput[]): ComputedLineItem[] {
  return lines.map(line => ({
    ...line,
    line_amount: computeLineAmount(line.quantity, line.rate),
  }));
}

/** Total GST rate for a line (5% or 18%). */
function bucketTaxRate(gstRate: GstRate): number {
  return gstRate / 100;
}

export function computeInvoiceTotals(
  lines: InvoiceLineItemInput[],
  taxMode: TaxMode = 'igst'
): InvoiceTotals {
  const computed = computeLineItems(lines);

  let subtotal_5 = 0;
  let subtotal_18 = 0;

  for (const line of computed) {
    if (line.gst_rate === 5) {
      subtotal_5 += line.line_amount;
    } else {
      subtotal_18 += line.line_amount;
    }
  }

  subtotal_5 = round2(subtotal_5);
  subtotal_18 = round2(subtotal_18);

  const tax5 = round2(subtotal_5 * bucketTaxRate(5));
  const tax18 = round2(subtotal_18 * bucketTaxRate(18));

  let igst_5 = 0;
  let igst_18 = 0;
  let cgst_5 = 0;
  let sgst_5 = 0;
  let cgst_18 = 0;
  let sgst_18 = 0;

  if (taxMode === 'igst') {
    igst_5 = tax5;
    igst_18 = tax18;
  } else {
    cgst_5 = round2(tax5 / 2);
    sgst_5 = round2(tax5 - cgst_5);
    cgst_18 = round2(tax18 / 2);
    sgst_18 = round2(tax18 - cgst_18);
  }

  const total_after_tax_5 = round2(subtotal_5 + tax5);
  const total_after_tax_18 = round2(subtotal_18 + tax18);
  const grand_total = round2(total_after_tax_5 + total_after_tax_18);

  return {
    subtotal_5,
    subtotal_18,
    igst_5,
    igst_18,
    cgst_5,
    sgst_5,
    cgst_18,
    sgst_18,
    total_after_tax_5,
    total_after_tax_18,
    grand_total,
  };
}

export function amountForGstColumn(lineAmount: number, gstRate: GstRate): { col5: number; col18: number } {
  if (gstRate === 5) return { col5: lineAmount, col18: 0 };
  return { col5: 0, col18: lineAmount };
}

export function splitTaxAmount(totalTax: number): { cgst: number; sgst: number } {
  const cgst = round2(totalTax / 2);
  return { cgst, sgst: round2(totalTax - cgst) };
}
