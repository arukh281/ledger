/**
 * Secondary ledger repository — separate tables from primary book.
 * Same Supabase + Firebase mirror strategy as lib/repository.ts.
 */

import { SecondaryVendor, LedgerEntry, ActionResult } from './types';
import { formatSupabaseDbError } from './supabaseErrors';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { getFirestoreDb } from './firebase';
import { isFirebaseMirrorDisabled } from './flags';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import type { CreateEntryPayload, UpdateEntryPayload } from './repository';

const COL_VENDORS = 'secondary_vendors';
const COL_ENTRIES = 'secondary_ledger_entries';

function blockFirebaseFallbackOrThrow(supabaseFailure: string | null): void {
  if (!isFirebaseMirrorDisabled()) return;
  if (supabaseFailure) {
    throw new Error(formatSupabaseDbError(supabaseFailure));
  }
  throw new Error(
    'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or remove DISABLE_FIREBASE_MIRROR=1 from .env and fix Firebase.'
  );
}

export async function getSecondaryVendors(): Promise<SecondaryVendor[]> {
  let supabaseFail: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('secondary_vendors')
        .select('*')
        .order('name');
      if (!error && data) return data as SecondaryVendor[];
      supabaseFail = error?.message ?? 'Unknown Supabase error';
      console.warn('Supabase read failed, falling back to Firebase:', supabaseFail);
    } catch (e) {
      supabaseFail = String(e);
      console.warn('Supabase unreachable, falling back to Firebase:', e);
    }
  }
  blockFirebaseFallbackOrThrow(supabaseFail);
  try {
    const db = getFirestoreDb();
    const snap = await getDocs(query(collection(db, COL_VENDORS), orderBy('name')));
    return snap.docs.map(d => d.data() as SecondaryVendor);
  } catch (e) {
    throw new Error(
      supabaseFail
        ? `Supabase failed (${supabaseFail}) and Firebase failed (${String(e)}).`
        : String(e)
    );
  }
}

export async function createSecondaryVendor(
  payload: Pick<SecondaryVendor, 'name' | 'ref'>
): Promise<ActionResult<SecondaryVendor>> {
  try {
    const sb = getSupabase();
    const { data: sbData, error: sbErr } = await sb
      .from('secondary_vendors')
      .insert({ name: payload.name, ref: payload.ref })
      .select()
      .single();

    if (sbErr) return { success: false, error: formatSupabaseDbError(sbErr.message) };

    const vendor = sbData as SecondaryVendor;

    if (!isFirebaseMirrorDisabled()) {
      try {
        const db = getFirestoreDb();
        await setDoc(doc(db, COL_VENDORS, vendor.id), vendor);
      } catch (fbErr) {
        console.error('Firebase mirror write failed (secondary vendor create):', fbErr);
        return {
          success: false,
          error: 'Saved to main database but backup sync failed. Please try again.',
        };
      }
    }

    return { success: true, data: vendor };
  } catch (e) {
    return { success: false, error: `Unexpected error: ${String(e)}` };
  }
}

export async function updateSecondaryVendor(
  id: string,
  payload: Pick<SecondaryVendor, 'name' | 'ref'>
): Promise<ActionResult<SecondaryVendor>> {
  try {
    const sb = getSupabase();
    const { data: sbData, error: sbErr } = await sb
      .from('secondary_vendors')
      .update({ name: payload.name, ref: payload.ref })
      .eq('id', id)
      .select()
      .single();

    if (sbErr) return { success: false, error: formatSupabaseDbError(sbErr.message) };

    const vendor = sbData as SecondaryVendor;

    if (!isFirebaseMirrorDisabled()) {
      try {
        const db = getFirestoreDb();
        await setDoc(doc(db, COL_VENDORS, id), vendor);
      } catch (fbErr) {
        console.error('Firebase mirror write failed (secondary vendor update):', fbErr);
        return {
          success: false,
          error: 'Updated in main database but backup sync failed. Please try again.',
        };
      }
    }

    return { success: true, data: vendor };
  } catch (e) {
    return { success: false, error: `Unexpected error: ${String(e)}` };
  }
}

export async function deleteSecondaryVendor(id: string): Promise<ActionResult> {
  try {
    const sb = getSupabase();
    const { error: sbErr } = await sb.from('secondary_vendors').delete().eq('id', id);
    if (sbErr) return { success: false, error: formatSupabaseDbError(sbErr.message) };

    if (!isFirebaseMirrorDisabled()) {
      try {
        const db = getFirestoreDb();
        await deleteDoc(doc(db, COL_VENDORS, id));
        const entriesSnap = await getDocs(
          query(collection(db, COL_ENTRIES), where('vendor_id', '==', id))
        );
        await Promise.all(entriesSnap.docs.map(d => deleteDoc(d.ref)));
      } catch (fbErr) {
        console.error('Firebase mirror write failed (secondary vendor delete):', fbErr);
        return {
          success: false,
          error: 'Deleted from main database but backup sync failed.',
        };
      }
    }

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: `Unexpected error: ${String(e)}` };
  }
}

export async function getSecondaryEntriesByVendor(vendorId: string): Promise<LedgerEntry[]> {
  let supabaseFail: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('secondary_ledger_entries')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });
      if (!error && data) return data as LedgerEntry[];
      supabaseFail = error?.message ?? 'Unknown Supabase error';
    } catch (e) {
      supabaseFail = String(e);
    }
  }
  blockFirebaseFallbackOrThrow(supabaseFail);
  try {
    const db = getFirestoreDb();
    const snap = await getDocs(
      query(
        collection(db, COL_ENTRIES),
        where('vendor_id', '==', vendorId),
        orderBy('date'),
        orderBy('created_at')
      )
    );
    return snap.docs.map(d => d.data() as LedgerEntry);
  } catch (e) {
    throw new Error(
      supabaseFail
        ? `Supabase failed (${supabaseFail}) and Firebase failed (${String(e)}).`
        : String(e)
    );
  }
}

export async function createSecondaryEntry(
  payload: CreateEntryPayload
): Promise<ActionResult<LedgerEntry>> {
  try {
    const sb = getSupabase();
    const { data: sbData, error: sbErr } = await sb
      .from('secondary_ledger_entries')
      .insert({
        vendor_id: payload.vendor_id,
        type: payload.type,
        date: payload.date,
        amount: payload.amount,
        doc_number: payload.doc_number,
        notes: payload.notes ?? '',
        is_system_generated: payload.is_system_generated ?? false,
      })
      .select()
      .single();

    if (sbErr) return { success: false, error: formatSupabaseDbError(sbErr.message) };

    const entry = sbData as LedgerEntry;

    if (!isFirebaseMirrorDisabled()) {
      try {
        const db = getFirestoreDb();
        await setDoc(doc(db, COL_ENTRIES, entry.id), entry);
      } catch (fbErr) {
        console.error('Firebase mirror write failed (secondary entry create):', fbErr);
        return {
          success: false,
          error: 'Saved to main database but backup sync failed. Please try again.',
        };
      }
    }

    return { success: true, data: entry };
  } catch (e) {
    return { success: false, error: `Unexpected error: ${String(e)}` };
  }
}

export async function updateSecondaryEntry(
  id: string,
  payload: UpdateEntryPayload
): Promise<ActionResult<LedgerEntry>> {
  try {
    const sb = getSupabase();
    const { data: existing, error: fetchErr } = await sb
      .from('secondary_ledger_entries')
      .select('id, is_system_generated')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) return { success: false, error: formatSupabaseDbError(fetchErr.message) };
    if (!existing) return { success: false, error: 'Entry not found.' };
    if (existing.is_system_generated) {
      return { success: false, error: 'Write-off lines cannot be edited.' };
    }

    const { data: sbData, error: sbErr } = await sb
      .from('secondary_ledger_entries')
      .update({
        type: payload.type,
        date: payload.date,
        amount: payload.amount,
        doc_number: payload.doc_number,
        notes: payload.notes ?? '',
      })
      .eq('id', id)
      .select()
      .single();

    if (sbErr) return { success: false, error: formatSupabaseDbError(sbErr.message) };

    const entry = sbData as LedgerEntry;

    if (!isFirebaseMirrorDisabled()) {
      try {
        const db = getFirestoreDb();
        await setDoc(doc(db, COL_ENTRIES, entry.id), entry);
      } catch (fbErr) {
        console.error('Firebase mirror write failed (secondary entry update):', fbErr);
        return {
          success: false,
          error: 'Saved to main database but backup sync failed. Please try again.',
        };
      }
    }

    return { success: true, data: entry };
  } catch (e) {
    return { success: false, error: `Unexpected error: ${String(e)}` };
  }
}

export async function deleteSecondaryEntry(id: string): Promise<ActionResult> {
  try {
    const sb = getSupabase();
    const { error: sbErr } = await sb.from('secondary_ledger_entries').delete().eq('id', id);
    if (sbErr) return { success: false, error: formatSupabaseDbError(sbErr.message) };

    if (!isFirebaseMirrorDisabled()) {
      try {
        const db = getFirestoreDb();
        await deleteDoc(doc(db, COL_ENTRIES, id));
      } catch (fbErr) {
        console.error('Firebase mirror write failed (secondary entry delete):', fbErr);
        return {
          success: false,
          error: 'Deleted from main database but backup sync failed.',
        };
      }
    }

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: `Unexpected error: ${String(e)}` };
  }
}
