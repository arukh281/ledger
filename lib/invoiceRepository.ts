/**
 * Invoice repository — Supabase only (no Firebase mirror).
 */

import { formatSupabaseDbError } from '@/lib/supabaseErrors';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { ActionResult } from '@/lib/types';
import { amountInWords } from '@/lib/invoice/amountInWords';
import { computeInvoiceTotals, computeLineItems } from '@/lib/invoice/calculations';
import type {
  Invoice,
  InvoiceFormPayload,
  InvoiceListItem,
  InvoiceLineItem,
  InvoiceWithLines,
} from '@/lib/invoice/types';

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  return getSupabase();
}

function duplicateInvoiceError(code: string | undefined): boolean {
  return code === '23505';
}

function buildHeaderRow(payload: InvoiceFormPayload) {
  const totals = computeInvoiceTotals(payload.line_items, payload.tax_mode);
  const tax5 =
    payload.tax_mode === 'igst' ? totals.igst_5 : totals.cgst_5 + totals.sgst_5;
  const tax18 =
    payload.tax_mode === 'igst' ? totals.igst_18 : totals.cgst_18 + totals.sgst_18;

  return {
    invoice_no: payload.invoice_no.trim(),
    invoice_date: payload.invoice_date,
    bill_to_company: payload.bill_to_company.trim(),
    bill_to_address: payload.bill_to_address.trim(),
    bill_to_pin: payload.bill_to_pin.trim(),
    bill_to_po: payload.bill_to_po.trim(),
    bill_to_gstin: payload.bill_to_gstin.trim().toUpperCase(),
    ship_to_company: payload.ship_to_company.trim(),
    ship_to_address: payload.ship_to_address.trim(),
    transport_detail: payload.transport_detail.trim(),
    tax_mode: payload.tax_mode,
    subtotal_5: totals.subtotal_5,
    subtotal_18: totals.subtotal_18,
    igst_5: tax5,
    igst_18: tax18,
    total_after_tax_5: totals.total_after_tax_5,
    total_after_tax_18: totals.total_after_tax_18,
    grand_total: totals.grand_total,
    amount_in_words: amountInWords(totals.grand_total),
  };
}

function buildLineRows(invoiceId: string, payload: InvoiceFormPayload) {
  const computed = computeLineItems(payload.line_items);
  return computed.map((line, index) => ({
    invoice_id: invoiceId,
    serial_no: line.serial_no.trim(),
    description: line.description.trim(),
    hsn_code: line.hsn_code.trim(),
    quantity: line.quantity,
    rate: line.rate,
    gst_rate: line.gst_rate,
    line_amount: line.line_amount,
    sort_order: index,
  }));
}

/** Build full invoice for PDF/response without an extra SELECT round-trip. */
function assembleInvoiceWithLines(
  invoice: Invoice,
  lineRows: Array<InvoiceLineItem & { id?: string }>
): InvoiceWithLines {
  return {
    ...invoice,
    line_items: lineRows.map(row => ({
      id: row.id ?? '',
      invoice_id: invoice.id,
      serial_no: row.serial_no,
      description: row.description,
      hsn_code: row.hsn_code,
      quantity: row.quantity,
      rate: row.rate,
      gst_rate: row.gst_rate,
      line_amount: row.line_amount,
      sort_order: row.sort_order,
      created_at: row.created_at ?? new Date().toISOString(),
    })),
  };
}

export async function listInvoices(): Promise<ActionResult<InvoiceListItem[]>> {
  try {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('invoices')
      .select('id, invoice_no, invoice_date, bill_to_company, grand_total')
      .order('invoice_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: formatSupabaseDbError(error.message) };
    return { success: true, data: (data ?? []) as InvoiceListItem[] };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function getInvoiceById(id: string): Promise<ActionResult<InvoiceWithLines>> {
  try {
    const sb = requireSupabase();
    const { data: invoice, error: invErr } = await sb.from('invoices').select('*').eq('id', id).single();

    if (invErr) {
      if (invErr.code === 'PGRST116') {
        return { success: false, error: 'Invoice not found.' };
      }
      return { success: false, error: formatSupabaseDbError(invErr.message) };
    }

    const { data: lines, error: linesErr } = await sb
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order');

    if (linesErr) return { success: false, error: formatSupabaseDbError(linesErr.message) };

    return {
      success: true,
      data: {
        ...(invoice as Invoice),
        line_items: (lines ?? []) as InvoiceLineItem[],
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function createInvoice(payload: InvoiceFormPayload): Promise<ActionResult<InvoiceWithLines>> {
  try {
    const sb = requireSupabase();
    const header = buildHeaderRow(payload);

    const { data: invoice, error: invErr } = await sb.from('invoices').insert(header).select().single();

    if (invErr) {
      if (duplicateInvoiceError(invErr.code)) {
        return { success: false, error: 'An invoice with this number already exists.' };
      }
      return { success: false, error: formatSupabaseDbError(invErr.message) };
    }

    const lineRows = buildLineRows(invoice.id, payload);
    const { data: insertedLines, error: linesErr } = await sb
      .from('invoice_line_items')
      .insert(lineRows)
      .select();

    if (linesErr) {
      await sb.from('invoices').delete().eq('id', invoice.id);
      return { success: false, error: formatSupabaseDbError(linesErr.message) };
    }

    return {
      success: true,
      data: assembleInvoiceWithLines(invoice as Invoice, (insertedLines ?? []) as InvoiceLineItem[]),
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateInvoice(
  id: string,
  payload: InvoiceFormPayload
): Promise<ActionResult<InvoiceWithLines>> {
  try {
    const sb = requireSupabase();
    const header = buildHeaderRow(payload);

    const { data: invoice, error: invErr } = await sb
      .from('invoices')
      .update(header)
      .eq('id', id)
      .select()
      .single();

    if (invErr) {
      if (duplicateInvoiceError(invErr.code)) {
        return { success: false, error: 'An invoice with this number already exists.' };
      }
      return { success: false, error: formatSupabaseDbError(invErr.message) };
    }

    const { error: delErr } = await sb.from('invoice_line_items').delete().eq('invoice_id', id);
    if (delErr) return { success: false, error: formatSupabaseDbError(delErr.message) };

    const lineRows = buildLineRows(id, payload);
    const { data: insertedLines, error: linesErr } = await sb
      .from('invoice_line_items')
      .insert(lineRows)
      .select();
    if (linesErr) return { success: false, error: formatSupabaseDbError(linesErr.message) };

    return {
      success: true,
      data: assembleInvoiceWithLines(invoice as Invoice, (insertedLines ?? []) as InvoiceLineItem[]),
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  try {
    const sb = requireSupabase();
    const { error } = await sb.from('invoices').delete().eq('id', id);
    if (error) return { success: false, error: formatSupabaseDbError(error.message) };
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function restoreInvoice(
  invoice: InvoiceWithLines
): Promise<ActionResult<InvoiceWithLines>> {
  try {
    const sb = requireSupabase();
    const { line_items, ...header } = invoice;

    const { data: restored, error: invErr } = await sb
      .from('invoices')
      .insert({
        id: header.id,
        invoice_no: header.invoice_no,
        invoice_date: header.invoice_date,
        bill_to_company: header.bill_to_company,
        bill_to_address: header.bill_to_address,
        bill_to_pin: header.bill_to_pin,
        bill_to_po: header.bill_to_po,
        bill_to_gstin: header.bill_to_gstin,
        ship_to_company: header.ship_to_company,
        ship_to_address: header.ship_to_address,
        transport_detail: header.transport_detail,
        tax_mode: header.tax_mode,
        subtotal_5: header.subtotal_5,
        subtotal_18: header.subtotal_18,
        igst_5: header.igst_5,
        igst_18: header.igst_18,
        total_after_tax_5: header.total_after_tax_5,
        total_after_tax_18: header.total_after_tax_18,
        grand_total: header.grand_total,
        amount_in_words: header.amount_in_words,
        created_at: header.created_at,
        updated_at: header.updated_at,
      })
      .select()
      .single();

    if (invErr) {
      if (duplicateInvoiceError(invErr.code)) {
        return { success: false, error: 'Invoice already exists — cannot restore.' };
      }
      return { success: false, error: formatSupabaseDbError(invErr.message) };
    }

    const lineRows = line_items.map(line => ({
      id: line.id,
      invoice_id: header.id,
      serial_no: line.serial_no,
      description: line.description,
      hsn_code: line.hsn_code,
      quantity: line.quantity,
      rate: line.rate,
      gst_rate: line.gst_rate,
      line_amount: line.line_amount,
      sort_order: line.sort_order,
      created_at: line.created_at,
    }));

    const { data: insertedLines, error: linesErr } = await sb
      .from('invoice_line_items')
      .insert(lineRows)
      .select();

    if (linesErr) {
      await sb.from('invoices').delete().eq('id', header.id);
      return { success: false, error: formatSupabaseDbError(linesErr.message) };
    }

    return {
      success: true,
      data: assembleInvoiceWithLines(restored as Invoice, (insertedLines ?? []) as InvoiceLineItem[]),
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
