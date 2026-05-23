'use server';

import {
  createInvoice,
  deleteInvoice,
  getInvoiceById,
  listInvoices,
  restoreInvoice,
  updateInvoice,
} from '@/lib/invoiceRepository';
import type { InvoiceFormPayload } from '@/lib/invoice/types';
import { ActionResult } from '@/lib/types';
import {
  normalizeInvoicePayload,
  validateInvoicePayload,
} from '@/lib/invoice/validatePayload';
import type { InvoiceListItem, InvoiceWithLines } from '@/lib/invoice/types';

export async function actionListInvoices(): Promise<ActionResult<InvoiceListItem[]>> {
  return listInvoices();
}

export async function actionGetInvoice(id: string): Promise<ActionResult<InvoiceWithLines>> {
  if (!id) return { success: false, error: 'Invoice ID is required' };
  return getInvoiceById(id);
}

export async function actionCreateInvoice(
  payload: InvoiceFormPayload
): Promise<ActionResult<InvoiceWithLines>> {
  const err = validateInvoicePayload(payload);
  if (err) return { success: false, error: err };
  return createInvoice(normalizeInvoicePayload(payload));
}

export async function actionUpdateInvoice(
  id: string,
  payload: InvoiceFormPayload
): Promise<ActionResult<InvoiceWithLines>> {
  if (!id) return { success: false, error: 'Invoice ID is required' };
  const err = validateInvoicePayload(payload);
  if (err) return { success: false, error: err };
  return updateInvoice(id, normalizeInvoicePayload(payload));
}

export async function actionDeleteInvoice(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Invoice ID is required' };
  return deleteInvoice(id);
}

export async function actionRestoreInvoice(
  invoice: InvoiceWithLines
): Promise<ActionResult<InvoiceWithLines>> {
  return restoreInvoice(invoice);
}
