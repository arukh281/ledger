'use server';

import {
  createVendor,
  updateVendor,
  deleteVendor,
  createEntry,
  updateEntry,
  deleteEntry,
  getEntriesByVendor,
  getVendors,
  getVendorById,
  getRecentEntries,
} from '@/lib/repository';
import { computeClosingBalance } from '@/lib/ledgerMath';
import {
  validateGSTIN,
  validateAmount,
  validateDocNumber,
  validateVendorName,
  normalizeGSTIN,
  todayISO,
} from '@/lib/validation';
import { ActionResult, Vendor, LedgerEntry } from '@/lib/types';

// ─── Vendor Actions ───────────────────────────────────────────────────────────

export async function actionCreateVendor(
  name: string,
  gstin: string
): Promise<ActionResult<Vendor>> {
  const nameCheck = validateVendorName(name);
  if (!nameCheck.valid) return { success: false, error: nameCheck.error! };

  const gstinCheck = validateGSTIN(gstin);
  if (!gstinCheck.valid) return { success: false, error: gstinCheck.error! };

  return createVendor({ name: name.trim(), gstin: normalizeGSTIN(gstin) });
}

export async function actionUpdateVendor(
  id: string,
  name: string,
  gstin: string
): Promise<ActionResult<Vendor>> {
  if (!id) return { success: false, error: 'Vendor ID is required' };

  const nameCheck = validateVendorName(name);
  if (!nameCheck.valid) return { success: false, error: nameCheck.error! };

  const gstinCheck = validateGSTIN(gstin);
  if (!gstinCheck.valid) return { success: false, error: gstinCheck.error! };

  return updateVendor(id, { name: name.trim(), gstin: normalizeGSTIN(gstin) });
}

export async function actionDeleteVendor(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Vendor ID is required' };
  return deleteVendor(id);
}

export async function actionGetVendors(): Promise<ActionResult<Vendor[]>> {
  try {
    const vendors = await getVendors();
    return { success: true, data: vendors };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function actionGetVendorById(id: string): Promise<ActionResult<Vendor>> {
  try {
    const vendor = await getVendorById(id);
    if (!vendor) return { success: false, error: 'Vendor not found' };
    return { success: true, data: vendor };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Entry Actions ────────────────────────────────────────────────────────────

export async function actionCreateEntry(
  vendorId: string,
  type: 'invoice' | 'payment',
  date: string,
  amount: string,
  docNumber: string,
  notes: string
): Promise<ActionResult<LedgerEntry>> {
  if (!vendorId) return { success: false, error: 'Vendor is required' };
  if (!type) return { success: false, error: 'Entry type is required' };
  if (!date) return { success: false, error: 'Date is required' };

  const amountCheck = validateAmount(amount);
  if (!amountCheck.valid) return { success: false, error: amountCheck.error! };

  const docCheck = validateDocNumber(docNumber);
  if (!docCheck.valid) return { success: false, error: docCheck.error! };

  return createEntry({
    vendor_id: vendorId,
    type,
    date,
    amount: parseFloat(amount),
    doc_number: docNumber.trim(),
    notes: notes.trim(),
    is_system_generated: false,
  });
}

export async function actionUpdateEntry(
  entryId: string,
  type: 'invoice' | 'payment',
  date: string,
  amount: string,
  docNumber: string,
  notes: string
): Promise<ActionResult<LedgerEntry>> {
  if (!entryId) return { success: false, error: 'Entry is required' };
  if (!type) return { success: false, error: 'Entry type is required' };
  if (!date) return { success: false, error: 'Date is required' };

  const amountCheck = validateAmount(amount);
  if (!amountCheck.valid) return { success: false, error: amountCheck.error! };

  const docCheck = validateDocNumber(docNumber);
  if (!docCheck.valid) return { success: false, error: docCheck.error! };

  return updateEntry(entryId, {
    type,
    date,
    amount: parseFloat(amount),
    doc_number: docNumber.trim(),
    notes: notes.trim(),
  });
}

export async function actionDeleteEntry(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Entry ID is required' };
  return deleteEntry(id);
}

export async function actionGetEntriesByVendor(
  vendorId: string
): Promise<ActionResult<LedgerEntry[]>> {
  try {
    const entries = await getEntriesByVendor(vendorId);
    return { success: true, data: entries };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function actionGetRecentEntries(
  limit = 10
): Promise<ActionResult<LedgerEntry[]>> {
  try {
    const entries = await getRecentEntries(limit);
    return { success: true, data: entries };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// ─── Nil Balance Action ───────────────────────────────────────────────────────

export async function actionNilBalance(
  vendorId: string
): Promise<ActionResult<LedgerEntry>> {
  if (!vendorId) return { success: false, error: 'Vendor ID is required' };

  // 1. Fetch all entries for this vendor
  const allEntries = await getEntriesByVendor(vendorId);

  // 2. Compute current closing balance
  const closingBalance = computeClosingBalance(allEntries);

  if (closingBalance === 0) {
    return { success: false, error: 'Balance is already ₹0 — no adjustment needed.' };
  }

  // 3. Determine balancing entry type and amount
  //    Positive balance (we owe vendor) → post a Payment to cancel it
  //    Negative balance (vendor owes us) → post an Invoice to cancel it
  const type: 'invoice' | 'payment' = closingBalance > 0 ? 'payment' : 'invoice';
  const amount = Math.abs(closingBalance);
  const docNumber = `NIL-${Date.now()}`;
  const today = todayISO();

  return createEntry({
    vendor_id: vendorId,
    type,
    date: today,
    amount,
    doc_number: docNumber,
    notes: '{balance nil}',
    is_system_generated: true,
  });
}
