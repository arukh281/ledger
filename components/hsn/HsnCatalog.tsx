'use client';

import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Download, Hash, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  actionCreateHsnCatalogItem,
  actionDeleteHsnCatalogItem,
  actionListHsnCatalog,
  actionRestoreHsnCatalogItem,
  actionUpdateHsnCatalogItem,
} from '@/app/actions/hsn';
import {
  HSN_GST_RATES,
  type HsnCatalogItem,
  type HsnGstRate,
  formatHsnGst,
  formatHsnGstDisplay,
} from '@/lib/hsn/types';
import { CollapsibleSection } from '@/components/invoice/CollapsibleSection';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog';
import { SearchField } from '@/components/ui/SearchField';
import { useDeleteWithUndo } from '@/components/undo/UndoProvider';

function parsePdfFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return 'hsn-catalog.pdf';
  const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i);
  if (!match?.[1]) return 'hsn-catalog.pdf';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1].replace(/['"]/g, '') || 'hsn-catalog.pdf';
  }
}

const compactInput = '!min-h-[2rem] !py-1.5 !px-2.5 !text-sm';
/** Extra right padding so the custom chevron does not cover the value (global select uses ~2.25rem). */
const gstSelectClass =
  '!min-h-[2rem] !py-1.5 !pl-2.5 !pr-8 !text-sm !w-full !min-w-[4.75rem] tabular-nums text-right';

function GstRateSelect({
  value,
  onChange,
  className = '',
  'aria-label': ariaLabel,
}: {
  value: HsnGstRate | null;
  onChange: (rate: HsnGstRate | null) => void;
  className?: string;
  'aria-label': string;
}) {
  return (
    <select
      value={value === null ? '' : String(value)}
      onChange={e => {
        const v = e.target.value;
        onChange(v === '' ? null : (Number(v) as HsnGstRate));
      }}
      aria-label={ariaLabel}
      className={`${gstSelectClass} ${className}`.trim()}
    >
      <option value="">—</option>
      {HSN_GST_RATES.map(rate => (
        <option key={rate} value={rate}>
          {formatHsnGst(rate)}
        </option>
      ))}
    </select>
  );
}

export function HsnCatalog() {
  const registerDeleteUndo = useDeleteWithUndo();
  const [items, setItems] = useState<HsnCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [itemName, setItemName] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [gstRate, setGstRate] = useState<HsnGstRate | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState('');
  const [editHsn, setEditHsn] = useState('');
  const [editGst, setEditGst] = useState<HsnGstRate | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HsnCatalogItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deferredQuery = useDeferredValue(query);

  async function loadCatalog() {
    const res = await actionListHsnCatalog();
    if (res.success) {
      setItems(res.data);
      setError(null);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    actionListHsnCatalog().then(res => {
      if (!active) return;
      if (res.success) {
        setItems(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      row =>
        row.item.toLowerCase().includes(q) ||
        row.hsn.includes(q) ||
        (row.gst_rate !== null && String(row.gst_rate).includes(q))
    );
  }, [items, deferredQuery]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await actionCreateHsnCatalogItem({
      item: itemName,
      hsn: hsnCode,
      gst_rate: gstRate,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success('Item added');
    setItemName('');
    setHsnCode('');
    setGstRate(null);
    setItems(prev => [...prev, res.data].sort((a, b) => a.item.localeCompare(b.item)));
  }

  function startEdit(row: HsnCatalogItem) {
    setEditingId(row.id);
    setEditItem(row.item);
    setEditHsn(row.hsn);
    setEditGst(row.gst_rate);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditItem('');
    setEditHsn('');
    setEditGst(null);
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true);
    const res = await actionUpdateHsnCatalogItem(id, {
      item: editItem,
      hsn: editHsn,
      gst_rate: editGst,
    });
    setSavingEdit(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success('Item updated');
    setItems(prev =>
      prev
        .map(row => (row.id === id ? res.data : row))
        .sort((a, b) => a.item.localeCompare(b.item))
    );
    cancelEdit();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const snapshot = deleteTarget;
    setDeleting(true);
    const res = await actionDeleteHsnCatalogItem(snapshot.id);
    setDeleting(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    if (editingId === snapshot.id) cancelEdit();
    setItems(prev => prev.filter(row => row.id !== snapshot.id));
    setDeleteTarget(null);
    registerDeleteUndo('Item deleted', async () => {
      const restore = await actionRestoreHsnCatalogItem(snapshot);
      if (!restore.success) throw new Error(restore.error);
      setItems(prev => [...prev, restore.data].sort((a, b) => a.item.localeCompare(b.item)));
    });
  }

  async function handleDownload() {
    const rows = query.trim() ? filtered : items;
    if (rows.length === 0) {
      toast.error('Nothing to download.');
      return;
    }
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/hsn/catalog-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: rows.map(row => ({
            item: row.item,
            hsn: row.hsn,
            gst_rate: row.gst_rate,
          })),
          filtered: Boolean(query.trim()),
        }),
      });
      if (!res.ok) {
        toast.error('Could not generate PDF.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = parsePdfFilename(res.headers.get('Content-Disposition'));
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${rows.length} items`);
    } catch {
      toast.error('Could not download PDF.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="page max-w-3xl">
      <header className="page-header page-header--row">
        <div>
          <h1 className="m-0">HSN catalog</h1>
          <p className="m-0 mt-1.5 text-sm text-muted leading-snug">
            Look up, add, edit, or delete HSN codes and GST % by item name.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 w-full sm:w-auto"
          disabled={loading || items.length === 0}
          loading={downloading}
          onClick={() => void handleDownload()}
        >
          <Download size={16} />
          Download PDF
        </Button>
      </header>

      <CollapsibleSection title="Add item" defaultOpen={false} compact>
        <form onSubmit={handleAdd} className="pt-0.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_6rem_auto] sm:items-center">
            <input
              type="text"
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="Item name"
              required
              aria-label="Item name"
              className={compactInput}
            />
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{4,8}"
              value={hsnCode}
              onChange={e => setHsnCode(e.target.value.replace(/\D/g, ''))}
              placeholder="HSN"
              required
              maxLength={8}
              aria-label="HSN code"
              className={`${compactInput} tabular-nums`}
            />
            <GstRateSelect
              value={gstRate}
              onChange={setGstRate}
              aria-label="GST rate"
            />
            <Button
              type="submit"
              loading={saving}
              className="w-full sm:w-auto !min-h-[2rem] !py-1.5 !px-3 !text-xs"
            >
              <Plus size={14} />
              Add
            </Button>
          </div>
        </form>
      </CollapsibleSection>

      <Card className="!p-3">
        <SearchField
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by item, HSN, or GST…"
          aria-label="Search HSN catalog"
        />
      </Card>

      {loading && <p className="m-0 text-sm text-muted">Loading catalog…</p>}

      {error && (
        <p className="m-0 text-sm font-medium text-red-600 rounded-lg bg-red-50 px-4 py-3">
          {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <Hash className="mx-auto text-slate-300" size={40} strokeWidth={1.25} />
          <p className="m-0 mt-4 text-base font-medium text-slate-800">No items yet</p>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Add your first item above, or run{' '}
            <code className="text-xs">supabase/hsn-schema.sql</code> (or{' '}
            <code className="text-xs">hsn-gst-rate.sql</code> if the table already exists).
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                <th className="py-2.5 px-4 font-semibold text-slate-700">Item</th>
                <th className="py-2.5 px-4 font-semibold text-slate-700 w-24">HSN</th>
                <th className="py-2.5 px-4 font-semibold text-slate-700 w-[5.5rem] min-w-[5.5rem] text-right">
                  GST
                </th>
                <th className="py-2.5 px-2 font-semibold text-slate-700 w-[4.5rem]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-slate-500">
                    No matches for &ldquo;{query.trim()}&rdquo;
                  </td>
                </tr>
              ) : (
                filtered.map(row => {
                  const isEditing = editingId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-100 last:border-0 ${isEditing ? 'bg-amber-50/40' : ''}`}
                    >
                      <td className="py-2 px-4 text-slate-900">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editItem}
                            onChange={e => setEditItem(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') void handleSaveEdit(row.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            aria-label="Edit item name"
                            className={`${compactInput} w-full`}
                            autoFocus
                          />
                        ) : (
                          row.item
                        )}
                      </td>
                      <td className="py-2 px-4 tabular-nums font-medium text-slate-800">
                        {isEditing ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={editHsn}
                            onChange={e => setEditHsn(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={e => {
                              if (e.key === 'Enter') void handleSaveEdit(row.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            aria-label="Edit HSN code"
                            maxLength={8}
                            className={`${compactInput} w-full tabular-nums`}
                          />
                        ) : (
                          row.hsn
                        )}
                      </td>
                      <td className="py-2 px-2 sm:px-3 tabular-nums text-slate-800 text-right w-[5.5rem] min-w-[5.5rem]">
                        {isEditing ? (
                          <GstRateSelect
                            value={editGst}
                            onChange={setEditGst}
                            aria-label="Edit GST rate"
                          />
                        ) : (
                          <span className="inline-block pr-1">{formatHsnGstDisplay(row.gst_rate)}</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-0.5">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleSaveEdit(row.id)}
                                disabled={savingEdit}
                                className="p-1.5 rounded-md text-emerald-700 hover:bg-emerald-50 border-0 bg-transparent cursor-pointer disabled:opacity-50"
                                aria-label="Save changes"
                                title="Save"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={savingEdit}
                                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 border-0 bg-transparent cursor-pointer disabled:opacity-50"
                                aria-label="Cancel edit"
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(row)}
                                disabled={editingId !== null}
                                className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 border-0 bg-transparent cursor-pointer disabled:opacity-40"
                                aria-label={`Edit ${row.item}`}
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(row)}
                                disabled={editingId !== null}
                                className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 border-0 bg-transparent cursor-pointer disabled:opacity-40"
                                aria-label={`Delete ${row.item}`}
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {query.trim() && filtered.length > 0 && (
            <p className="m-0 px-4 py-2 text-xs text-slate-500 border-t border-slate-100">
              {filtered.length} of {items.length} items
            </p>
          )}
        </div>
      )}

      {!loading && error && (
        <Button variant="outline" onClick={() => { setLoading(true); void loadCatalog(); }}>
          Retry
        </Button>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete item"
        onConfirm={handleDelete}
        loading={deleting}
      >
        {deleteTarget ? (
          <>
            Remove <span className="font-medium text-slate-900">{deleteTarget.item}</span> · HSN{' '}
            {deleteTarget.hsn} · {formatHsnGstDisplay(deleteTarget.gst_rate)}?
          </>
        ) : null}
      </ConfirmDeleteDialog>
    </div>
  );
}
