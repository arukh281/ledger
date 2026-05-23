/**
 * GSTIN directory — customer firms (Supabase only).
 */

import { formatSupabaseDbError } from '@/lib/supabaseErrors';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { GstinRow, GstinRowPayload } from '@/lib/gstin/types';
import { ActionResult } from '@/lib/types';
import { normalizeGSTIN, validateGSTIN, validateVendorName } from '@/lib/validation';

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  return getSupabase();
}

function duplicateGstinError(code: string | undefined): boolean {
  return code === '23505';
}

export function validateGstinCustomerPayload(payload: GstinRowPayload): string | null {
  const nameCheck = validateVendorName(payload.name);
  if (!nameCheck.valid) return nameCheck.error!;
  const gstinCheck = validateGSTIN(payload.gstin);
  if (!gstinCheck.valid) return gstinCheck.error!;
  return null;
}

function mapCustomer(row: Record<string, unknown>): GstinRow {
  return {
    id: String(row.id),
    category: 'customer',
    name: String(row.name),
    gstin: String(row.gstin),
  };
}

export async function listGstinCustomers(): Promise<ActionResult<GstinRow[]>> {
  try {
    const sb = requireSupabase();
    const { data, error } = await sb.from('gstin_customers').select('*').order('name');
    if (error) return { success: false, error: formatSupabaseDbError(error.message) };
    return {
      success: true,
      data: (data ?? []).map(r => mapCustomer(r as Record<string, unknown>)),
    };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function createGstinCustomer(
  payload: GstinRowPayload
): Promise<ActionResult<GstinRow>> {
  const err = validateGstinCustomerPayload(payload);
  if (err) return { success: false, error: err };

  try {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('gstin_customers')
      .insert({
        name: payload.name.trim(),
        gstin: normalizeGSTIN(payload.gstin),
      })
      .select()
      .single();

    if (error) {
      if (duplicateGstinError(error.code)) {
        return { success: false, error: 'A customer with this GSTIN already exists.' };
      }
      return { success: false, error: formatSupabaseDbError(error.message) };
    }

    return { success: true, data: mapCustomer(data as Record<string, unknown>) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateGstinCustomer(
  id: string,
  payload: GstinRowPayload
): Promise<ActionResult<GstinRow>> {
  if (!id) return { success: false, error: 'Customer ID is required.' };
  const err = validateGstinCustomerPayload(payload);
  if (err) return { success: false, error: err };

  try {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('gstin_customers')
      .update({
        name: payload.name.trim(),
        gstin: normalizeGSTIN(payload.gstin),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (duplicateGstinError(error.code)) {
        return { success: false, error: 'A customer with this GSTIN already exists.' };
      }
      return { success: false, error: formatSupabaseDbError(error.message) };
    }

    if (!data) return { success: false, error: 'Customer not found.' };
    return { success: true, data: mapCustomer(data as Record<string, unknown>) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteGstinCustomer(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Customer ID is required.' };
  try {
    const sb = requireSupabase();
    const { error } = await sb.from('gstin_customers').delete().eq('id', id);
    if (error) return { success: false, error: formatSupabaseDbError(error.message) };
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function restoreGstinCustomer(row: GstinRow): Promise<ActionResult<GstinRow>> {
  try {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('gstin_customers')
      .insert({
        id: row.id,
        name: row.name,
        gstin: row.gstin,
      })
      .select()
      .single();

    if (error) {
      if (duplicateGstinError(error.code)) {
        return { success: false, error: 'Customer already exists — cannot restore.' };
      }
      return { success: false, error: formatSupabaseDbError(error.message) };
    }

    return { success: true, data: mapCustomer(data as Record<string, unknown>) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
