'use server';

import {
  createSecondaryVendor,
  updateSecondaryVendor,
  deleteSecondaryVendor,
  createSecondaryEntry,
  updateSecondaryEntry,
  deleteSecondaryEntry,
  getSecondaryEntriesByVendor,
  getSecondaryVendors,
  getAllSecondaryLedgerEntryBalances,
  restoreSecondaryEntry,
  restoreSecondaryVendor,
} from '@/lib/secondaryRepository';
import { computeClosingBalance, computeClosingBalancesByVendor } from '@/lib/ledgerMath';
import {
  validateAmount,
  validateDocNumber,
  validateVendorName,
  normalizeRef,
  todayISO,
} from '@/lib/validation';
import { ActionResult, SecondaryVendor, LedgerEntry } from '@/lib/types';

export async function actionGetSecondaryVendors(): Promise<ActionResult<SecondaryVendor[]>> {
  try {
    const vendors = await getSecondaryVendors();
    return { success: true, data: vendors };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function actionGetSecondaryVendorClosingBalances(): Promise<
  ActionResult<Record<string, number>>
> {
  try {
    const entries = await getAllSecondaryLedgerEntryBalances();
    return { success: true, data: computeClosingBalancesByVendor(entries) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function actionCreateSecondaryVendor(
  name: string,
  ref: string
): Promise<ActionResult<SecondaryVendor>> {
  const nameCheck = validateVendorName(name);
  if (!nameCheck.valid) return { success: false, error: nameCheck.error! };

  return createSecondaryVendor({ name: name.trim(), ref: normalizeRef(ref) });
}

export async function actionUpdateSecondaryVendor(
  id: string,
  name: string,
  ref: string
): Promise<ActionResult<SecondaryVendor>> {
  if (!id) return { success: false, error: 'Vendor ID is required' };

  const nameCheck = validateVendorName(name);
  if (!nameCheck.valid) return { success: false, error: nameCheck.error! };

  return updateSecondaryVendor(id, { name: name.trim(), ref: normalizeRef(ref) });
}

export async function actionDeleteSecondaryVendor(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Vendor ID is required' };
  return deleteSecondaryVendor(id);
}

export async function actionRestoreSecondaryVendor(
  vendor: Pick<SecondaryVendor, 'id' | 'name' | 'ref'>,
  entries: LedgerEntry[]
): Promise<ActionResult> {
  return restoreSecondaryVendor(vendor, entries);
}

export async function actionGetSecondaryEntriesByVendor(
  vendorId: string
): Promise<ActionResult<LedgerEntry[]>> {
  try {
    const entries = await getSecondaryEntriesByVendor(vendorId);
    return { success: true, data: entries };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function actionCreateSecondaryEntry(
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

  return createSecondaryEntry({
    vendor_id: vendorId,
    type,
    date,
    amount: parseFloat(amount),
    doc_number: docNumber.trim(),
    notes: notes.trim(),
    is_system_generated: false,
  });
}

export async function actionUpdateSecondaryEntry(
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

  return updateSecondaryEntry(entryId, {
    type,
    date,
    amount: parseFloat(amount),
    doc_number: docNumber.trim(),
    notes: notes.trim(),
  });
}

export async function actionDeleteSecondaryEntry(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Entry ID is required' };
  return deleteSecondaryEntry(id);
}

export async function actionRestoreSecondaryEntry(
  entry: LedgerEntry
): Promise<ActionResult<LedgerEntry>> {
  return restoreSecondaryEntry(entry);
}

export async function actionSecondaryNilBalance(
  vendorId: string
): Promise<ActionResult<LedgerEntry>> {
  if (!vendorId) return { success: false, error: 'Vendor ID is required' };

  const allEntries = await getSecondaryEntriesByVendor(vendorId);
  const closingBalance = computeClosingBalance(allEntries);

  if (closingBalance === 0) {
    return { success: false, error: 'Balance is already ₹0 — no adjustment needed.' };
  }

  const type: 'invoice' | 'payment' = closingBalance > 0 ? 'payment' : 'invoice';
  const amount = Math.abs(closingBalance);
  const docNumber = `NIL-${Date.now()}`;
  const today = todayISO();

  return createSecondaryEntry({
    vendor_id: vendorId,
    type,
    date: today,
    amount,
    doc_number: docNumber,
    notes: '{balance nil}',
    is_system_generated: true,
  });
}
