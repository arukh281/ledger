import { ActionResult } from '@/lib/types';

export type GstRate = 5 | 18;

/** Inter-state: IGST only. Intra-state: CGST + SGST (each half of the GST rate). */
export type TaxMode = 'igst' | 'cgst_sgst';

export interface InvoiceLineItemInput {
  serial_no: string;
  description: string;
  hsn_code: string;
  quantity: number;
  rate: number;
  gst_rate: GstRate;
}

export interface InvoiceLineItem extends InvoiceLineItemInput {
  id: string;
  invoice_id: string;
  line_amount: number;
  sort_order: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_no: string;
  invoice_date: string;
  bill_to_company: string;
  bill_to_address: string;
  bill_to_pin: string;
  bill_to_po: string;
  bill_to_gstin: string;
  ship_to_company: string;
  ship_to_address: string;
  transport_detail: string;
  tax_mode: TaxMode;
  subtotal_5: number;
  subtotal_18: number;
  igst_5: number;
  igst_18: number;
  total_after_tax_5: number;
  total_after_tax_18: number;
  grand_total: number;
  amount_in_words: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceListItem {
  id: string;
  invoice_no: string;
  invoice_date: string;
  bill_to_company: string;
  grand_total: number;
}

export interface InvoiceWithLines extends Invoice {
  line_items: InvoiceLineItem[];
}

export interface InvoiceFormPayload {
  invoice_no: string;
  invoice_date: string;
  bill_to_company: string;
  bill_to_address: string;
  bill_to_pin: string;
  bill_to_po: string;
  bill_to_gstin: string;
  ship_to_company: string;
  ship_to_address: string;
  transport_detail: string;
  tax_mode: TaxMode;
  line_items: InvoiceLineItemInput[];
}

export type InvoiceActionResult<T = void> = ActionResult<T>;
