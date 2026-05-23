/**
 * HSN catalog repository — Supabase only.
 */

import { formatSupabaseDbError } from '@/lib/supabaseErrors';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  HSN_GST_RATES,
  type HsnCatalogItem,
  type HsnCatalogPayload,
  type HsnGstRate,
  isHsnGstRate,
} from '@/lib/hsn/types';
import { ActionResult } from '@/lib/types';

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  return getSupabase();
}

function normalizePayload(payload: HsnCatalogPayload): HsnCatalogPayload {
  return {
    item: payload.item.trim(),
    hsn: payload.hsn.trim().replace(/\s/g, ''),
    gst_rate: payload.gst_rate,
  };
}

function parseGstRate(value: unknown): HsnGstRate | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return isHsnGstRate(n) ? n : null;
}

export function validateHsnPayload(payload: HsnCatalogPayload): string | null {
  const { item, hsn, gst_rate } = normalizePayload(payload);
  if (!item) return 'Item name is required.';
  if (!hsn) return 'HSN code is required.';
  if (!/^\d{4,8}$/.test(hsn)) return 'HSN must be 4–8 digits.';
  if (gst_rate !== null && !isHsnGstRate(gst_rate)) {
    return `GST must be — or one of: ${HSN_GST_RATES.map(r => `${r}%`).join(', ')}.`;
  }
  return null;
}

function mapRow(row: Record<string, unknown>): HsnCatalogItem {
  const gst = parseGstRate(row.gst_rate);
  return {
    id: String(row.id),
    item: String(row.item),
    hsn: String(row.hsn),
    gst_rate: gst,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function duplicateItemError(code: string | undefined): boolean {
  return code === '23505';
}

export async function listHsnCatalog(): Promise<ActionResult<HsnCatalogItem[]>> {
  try {
    const sb = requireSupabase();
    const { data, error } = await sb.from('hsn_catalog').select('*').order('item');
    if (error) return { success: false, error: formatSupabaseDbError(error.message) };
    return { success: true, data: (data ?? []).map(row => mapRow(row as Record<string, unknown>)) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function createHsnCatalogItem(
  payload: HsnCatalogPayload
): Promise<ActionResult<HsnCatalogItem>> {
  const err = validateHsnPayload(payload);
  if (err) return { success: false, error: err };

  const normalized = normalizePayload(payload);

  try {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('hsn_catalog')
      .insert(normalized)
      .select()
      .single();

    if (error) {
      if (duplicateItemError(error.code)) {
        return { success: false, error: 'An item with this name already exists.' };
      }
      return { success: false, error: formatSupabaseDbError(error.message) };
    }

    return { success: true, data: mapRow(data as Record<string, unknown>) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function updateHsnCatalogItem(
  id: string,
  payload: HsnCatalogPayload
): Promise<ActionResult<HsnCatalogItem>> {
  if (!id) return { success: false, error: 'Item ID is required.' };

  const err = validateHsnPayload(payload);
  if (err) return { success: false, error: err };

  const normalized = normalizePayload(payload);

  try {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('hsn_catalog')
      .update(normalized)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (duplicateItemError(error.code)) {
        return { success: false, error: 'An item with this name already exists.' };
      }
      return { success: false, error: formatSupabaseDbError(error.message) };
    }

    if (!data) return { success: false, error: 'Item not found.' };

    return { success: true, data: mapRow(data as Record<string, unknown>) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function restoreHsnCatalogItem(item: HsnCatalogItem): Promise<ActionResult<HsnCatalogItem>> {
  try {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from('hsn_catalog')
      .insert({
        id: item.id,
        item: item.item,
        hsn: item.hsn,
        gst_rate: item.gst_rate,
      })
      .select()
      .single();

    if (error) {
      if (duplicateItemError(error.code)) {
        return { success: false, error: 'Item already exists — cannot restore.' };
      }
      return { success: false, error: formatSupabaseDbError(error.message) };
    }

    return { success: true, data: mapRow(data as Record<string, unknown>) };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function deleteHsnCatalogItem(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'Item ID is required.' };

  try {
    const sb = requireSupabase();
    const { error } = await sb.from('hsn_catalog').delete().eq('id', id);
    if (error) return { success: false, error: formatSupabaseDbError(error.message) };
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
