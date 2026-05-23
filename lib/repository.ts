/**
 * Repository layer — all data access goes through here.
 *
 * WRITE strategy: Write to Supabase (primary) AND Firebase (mirror) in parallel.
 *   Returns success only when BOTH writes succeed.
 *
 * READ strategy: Try Supabase first. If Supabase is unreachable/errors, fall back to Firebase.
 */

import { Vendor, LedgerEntry, ActionResult } from './types';
import type { LedgerEntryBalanceSlice } from './ledgerMath';
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

// ─── Firestore collection names ───────────────────────────────────────────────
const COL_VENDORS = 'vendors';
const COL_ENTRIES = 'ledger_entries';

/** When DISABLE_FIREBASE_MIRROR=1, reads must not silently hit broken Firestore. */
function blockFirebaseFallbackOrThrow(supabaseFailure: string | null): void {
  if (!isFirebaseMirrorDisabled()) return;
  if (supabaseFailure) {
    throw new Error(formatSupabaseDbError(supabaseFailure));
  }
  throw new Error(
    'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or remove DISABLE_FIREBASE_MIRROR=1 from .env and fix Firebase.'
  );
}

// ─── Vendor: Reads ────────────────────────────────────────────────────────────

export async function getVendors(): Promise<Vendor[]> {
  let supabaseFail: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('vendors')
        .select('*')
        .order('name');
      if (!error && data) return data as Vendor[];
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
    return snap.docs.map(d => d.data() as Vendor);
  } catch (e) {
    throw new Error(
      supabaseFail
        ? `Supabase failed (${supabaseFail}) and Firebase failed (${String(e)}).`
        : String(e)
    );
  }
}

// ─── Vendor: Writes ───────────────────────────────────────────────────────────

export async function createVendor(
  payload: Pick<Vendor, 'name' | 'gstin'>
): Promise<ActionResult<Vendor>> {
  try {
    // 1. Write to Supabase
    const sb = getSupabase();
    const { data: sbData, error: sbErr } = await sb
      .from('vendors')
      .insert({ name: payload.name, gstin: payload.gstin })
      .select()
      .single();

    if (sbErr) {
      if (sbErr.code === '23505') {
        return { success: false, error: 'A vendor with this GSTIN already exists.' };
      }
      return { success: false, error: formatSupabaseDbError(sbErr.message) };
    }

    const vendor = sbData as Vendor;

    // 2. Mirror to Firebase (optional when DISABLE_FIREBASE_MIRROR=1)
    if (!isFirebaseMirrorDisabled()) {
      try {
        const db = getFirestoreDb();
        await setDoc(doc(db, COL_VENDORS, vendor.id), vendor);
      } catch (fbErr) {
        console.error('Firebase mirror write failed (vendor create):', fbErr);
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

export async function updateVendor(
  id: string,
  payload: Pick<Vendor, 'name' | 'gstin'>
): Promise<ActionResult<Vendor>> {
  try {
    const sb = getSupabase();
    const { data: sbData, error: sbErr } = await sb
      .from('vendors')
      .update({ name: payload.name, gstin: payload.gstin })
      .eq('id', id)
      .select()
      .single();

    if (sbErr) {
      if (sbErr.code === '23505') {
        return { success: false, error: 'Another vendor with this GSTIN already exists.' };
      }
      return { success: false, error: formatSupabaseDbError(sbErr.message) };
    }

    const vendor = sbData as Vendor;

    if (!isFirebaseMirrorDisabled()) {
      try {
        const db = getFirestoreDb();
        await setDoc(doc(db, COL_VENDORS, id), vendor);
      } catch (fbErr) {
        console.error('Firebase mirror write failed (vendor update):', fbErr);
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

export async function deleteVendor(id: string): Promise<ActionResult> {
  try {
    const sb = getSupabase();
    const { error: sbErr } = await sb.from('vendors').delete().eq('id', id);
    if (sbErr) return { success: false, error: formatSupabaseDbError(sbErr.message) };

    if (!isFirebaseMirrorDisabled()) {
      try {
        const db = getFirestoreDb();
        await deleteDoc(doc(db, COL_VENDORS, id));
        // Also delete all entries for this vendor from Firebase
        const entriesSnap = await getDocs(
          query(collection(db, COL_ENTRIES), where('vendor_id', '==', id))
        );
        await Promise.all(entriesSnap.docs.map(d => deleteDoc(d.ref)));
      } catch (fbErr) {
        console.error('Firebase mirror write failed (vendor delete):', fbErr);
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

// ─── Ledger Entries: Reads ────────────────────────────────────────────────────

export async function getEntriesByVendor(vendorId: string): Promise<LedgerEntry[]> {
  let supabaseFail: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('ledger_entries')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });
      if (!error && data) return data as LedgerEntry[];
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

/** All entries (minimal fields) for vendor list balances. */
export async function getAllLedgerEntryBalances(): Promise<LedgerEntryBalanceSlice[]> {
  let supabaseFail: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('ledger_entries')
        .select('vendor_id, type, amount');
      if (!error && data) return data as LedgerEntryBalanceSlice[];
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
    const snap = await getDocs(collection(db, COL_ENTRIES));
    return snap.docs.map(d => {
      const row = d.data() as LedgerEntry;
      return { vendor_id: row.vendor_id, type: row.type, amount: row.amount };
    });
  } catch (e) {
    throw new Error(
      supabaseFail
        ? `Supabase failed (${supabaseFail}) and Firebase failed (${String(e)}).`
        : String(e)
    );
  }
}

// ─── Ledger Entries: Writes ───────────────────────────────────────────────────

export interface CreateEntryPayload {
  vendor_id: string;
  type: 'invoice' | 'payment';
  date: string;
  amount: number;
  doc_number: string;
  notes: string;
  is_system_generated?: boolean;
}

export async function createEntry(
  payload: CreateEntryPayload
): Promise<ActionResult<LedgerEntry>> {
  try {
    const sb = getSupabase();
    const { data: sbData, error: sbErr } = await sb
      .from('ledger_entries')
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
        console.error('Firebase mirror write failed (entry create):', fbErr);
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

export interface UpdateEntryPayload {
  type: 'invoice' | 'payment';
  date: string;
  amount: number;
  doc_number: string;
  notes: string;
}

export async function updateEntry(
  id: string,
  payload: UpdateEntryPayload
): Promise<ActionResult<LedgerEntry>> {
  try {
    const sb = getSupabase();
    const { data: existing, error: fetchErr } = await sb
      .from('ledger_entries')
      .select('id, is_system_generated')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) return { success: false, error: formatSupabaseDbError(fetchErr.message) };
    if (!existing) return { success: false, error: 'Entry not found.' };
    if (existing.is_system_generated) {
      return { success: false, error: 'Write-off lines cannot be edited.' };
    }

    const { data: sbData, error: sbErr } = await sb
      .from('ledger_entries')
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
        console.error('Firebase mirror write failed (entry update):', fbErr);
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

export async function restoreEntry(entry: LedgerEntry): Promise<ActionResult<LedgerEntry>> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('ledger_entries')
      .insert({
        id: entry.id,
        vendor_id: entry.vendor_id,
        type: entry.type,
        date: entry.date,
        amount: entry.amount,
        doc_number: entry.doc_number,
        notes: entry.notes,
        is_system_generated: entry.is_system_generated,
      })
      .select()
      .single();

    if (error) return { success: false, error: formatSupabaseDbError(error.message) };

    const restored = data as LedgerEntry;

    if (!isFirebaseMirrorDisabled()) {
      try {
        const db = getFirestoreDb();
        await setDoc(doc(db, COL_ENTRIES, restored.id), restored);
      } catch (fbErr) {
        console.error('Firebase mirror write failed (entry restore):', fbErr);
        return {
          success: false,
          error: 'Restored in main database but backup sync failed.',
        };
      }
    }

    return { success: true, data: restored };
  } catch (e) {
    return { success: false, error: `Unexpected error: ${String(e)}` };
  }
}

export async function restoreVendor(
  vendor: Pick<Vendor, 'id' | 'name' | 'gstin'>,
  entries: LedgerEntry[]
): Promise<ActionResult> {
  try {
    const sb = getSupabase();
    const { error: vendorErr } = await sb.from('vendors').insert({
      id: vendor.id,
      name: vendor.name,
      gstin: vendor.gstin,
    });
    if (vendorErr) return { success: false, error: formatSupabaseDbError(vendorErr.message) };

    for (const entry of entries) {
      const { error: entryErr } = await sb.from('ledger_entries').insert({
        id: entry.id,
        vendor_id: entry.vendor_id,
        type: entry.type,
        date: entry.date,
        amount: entry.amount,
        doc_number: entry.doc_number,
        notes: entry.notes,
        is_system_generated: entry.is_system_generated,
      });
      if (entryErr) return { success: false, error: formatSupabaseDbError(entryErr.message) };
    }

    if (!isFirebaseMirrorDisabled()) {
      try {
        const db = getFirestoreDb();
        await setDoc(doc(db, COL_VENDORS, vendor.id), {
          ...vendor,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        for (const entry of entries) {
          await setDoc(doc(db, COL_ENTRIES, entry.id), entry);
        }
      } catch (fbErr) {
        console.error('Firebase mirror write failed (vendor restore):', fbErr);
        return {
          success: false,
          error: 'Restored in main database but backup sync failed.',
        };
      }
    }

    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: `Unexpected error: ${String(e)}` };
  }
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  try {
    const sb = getSupabase();
    const { error: sbErr } = await sb.from('ledger_entries').delete().eq('id', id);
    if (sbErr) return { success: false, error: formatSupabaseDbError(sbErr.message) };

    if (!isFirebaseMirrorDisabled()) {
      try {
        const db = getFirestoreDb();
        await deleteDoc(doc(db, COL_ENTRIES, id));
      } catch (fbErr) {
        console.error('Firebase mirror write failed (entry delete):', fbErr);
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
