/**
 * GSTIN directory — aggregates customer firms and party ledger vendors.
 */

import {
  getVendors,
} from '@/lib/repository';
import type { GstinCategory, GstinDirectory, GstinRow, GstinRowPayload } from '@/lib/gstin/types';
import {
  createGstinCustomer,
  deleteGstinCustomer,
  listGstinCustomers,
  restoreGstinCustomer,
  updateGstinCustomer,
  validateGstinCustomerPayload,
} from '@/lib/gstin/customerRepository';
import { ActionResult } from '@/lib/types';

function sortByName(rows: GstinRow[]): GstinRow[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

const PARTY_READ_ONLY_ERROR =
  'Party vendors are managed in the Party ledger. Open /party to add, edit, or delete them.';

export async function listGstinDirectory(): Promise<ActionResult<GstinDirectory>> {
  try {
    const [customerRes, partyVendors] = await Promise.all([listGstinCustomers(), getVendors()]);

    if (!customerRes.success) return customerRes;

    const party: GstinRow[] = partyVendors.map(v => ({
      id: v.id,
      category: 'party',
      name: v.name,
      gstin: v.gstin,
    }));

    return {
      success: true,
      data: {
        customer: customerRes.data,
        party: sortByName(party),
      },
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function createGstinRow(
  category: GstinCategory,
  payload: GstinRowPayload
): Promise<ActionResult<GstinRow>> {
  if (category === 'customer') return createGstinCustomer(payload);
  return { success: false, error: PARTY_READ_ONLY_ERROR };
}

export async function updateGstinRow(
  category: GstinCategory,
  id: string,
  payload: GstinRowPayload
): Promise<ActionResult<GstinRow>> {
  if (category === 'customer') return updateGstinCustomer(id, payload);
  return { success: false, error: PARTY_READ_ONLY_ERROR };
}

export async function deleteGstinRow(
  category: GstinCategory,
  id: string
): Promise<ActionResult<undefined>> {
  if (category === 'customer') {
    const res = await deleteGstinCustomer(id);
    if (!res.success) return res;
    return { success: true, data: undefined };
  }
  return { success: false, error: PARTY_READ_ONLY_ERROR };
}

export async function restoreGstinRow(row: GstinRow): Promise<ActionResult<GstinRow>> {
  if (row.category === 'customer') return restoreGstinCustomer(row);
  return { success: false, error: PARTY_READ_ONLY_ERROR };
}

export function validateGstinRowPayload(
  category: GstinCategory,
  payload: GstinRowPayload
): string | null {
  if (category === 'customer') return validateGstinCustomerPayload(payload);
  return PARTY_READ_ONLY_ERROR;
}
