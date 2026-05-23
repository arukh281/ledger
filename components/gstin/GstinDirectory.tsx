'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, IdCard, Plus } from 'lucide-react';
import {
  actionCreateGstinRow,
  actionDeleteGstinRow,
  actionListGstinDirectory,
  actionRestoreGstinRow,
  actionUpdateGstinRow,
} from '@/app/actions/gstin';
import {
  GSTIN_CATEGORY_ORDER,
  GSTIN_DIRECTORY_PDF_SCOPES,
  countGstinDirectoryRows,
  type GstinCategory,
  type GstinDirectory,
  type GstinDirectoryPdfScope,
  type GstinRow,
  gstinRowKey,
} from '@/lib/gstin/types';
import { GstinCategorySection } from '@/components/gstin/GstinCategorySection';
import { CollapsibleSection } from '@/components/invoice/CollapsibleSection';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog';
import { Dialog } from '@/components/ui/Dialog';
import { SearchField } from '@/components/ui/SearchField';
import { useDeleteWithUndo } from '@/components/undo/UndoProvider';

const emptyDirectory = (): GstinDirectory => ({
  customer: [],
  primary: [],
});

const PDF_SCOPE_LABELS: Record<GstinDirectoryPdfScope, string> = {
  customer: 'Customer',
  primary: 'Primary',
  both: 'Both',
};

const PDF_SCOPE_DESCRIPTIONS: Record<GstinDirectoryPdfScope, string> = {
  customer: 'Customers you manage in this directory',
  primary: 'Primary vendors synced from the ledger',
  both: 'Customer and primary sections in one PDF',
};

const PDF_SCOPE_EMPTY_MESSAGES: Record<GstinDirectoryPdfScope, string> = {
  customer: 'No customer firms to download.',
  primary: 'No primary firms to download.',
  both: 'Nothing to download.',
};

const compactInput = '!min-h-[2rem] !py-1.5 !px-2.5 !text-sm';

function parsePdfFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return 'gstin-directory.pdf';
  const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i);
  if (!match?.[1]) return 'gstin-directory.pdf';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1].replace(/['"]/g, '') || 'gstin-directory.pdf';
  }
}

function sortRows(rows: GstinRow[]): GstinRow[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

function filterRows(rows: GstinRow[], query: string): GstinRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    row => row.name.toLowerCase().includes(q) || row.gstin.toLowerCase().includes(q)
  );
}

function upsertRow(directory: GstinDirectory, row: GstinRow): GstinDirectory {
  const list = sortRows([...directory[row.category].filter(r => r.id !== row.id), row]);
  return { ...directory, [row.category]: list };
}

function removeRow(directory: GstinDirectory, category: GstinCategory, id: string): GstinDirectory {
  return {
    ...directory,
    [category]: directory[category].filter(r => r.id !== id),
  };
}

export function GstinDirectory() {
  const registerDeleteUndo = useDeleteWithUndo();
  const [directory, setDirectory] = useState<GstinDirectory>(emptyDirectory);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [addName, setAddName] = useState('');
  const [addGstin, setAddGstin] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editGstin, setEditGstin] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GstinRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadScope, setDownloadScope] = useState<GstinDirectoryPdfScope>('both');

  async function loadDirectory() {
    const res = await actionListGstinDirectory();
    if (res.success) {
      setDirectory(res.data);
      setError(null);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    actionListGstinDirectory().then(res => {
      if (!active) return;
      if (res.success) {
        setDirectory(res.data);
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

  const filtered = useMemo(
    () => ({
      customer: filterRows(directory.customer, query),
      primary: filterRows(directory.primary, query),
    }),
    [directory, query]
  );

  const totalCount = directory.customer.length + directory.primary.length;

  const filteredCount = filtered.customer.length + filtered.primary.length;

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await actionCreateGstinRow('customer', { name: addName, gstin: addGstin });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success('Customer added');
    setAddName('');
    setAddGstin('');
    setDirectory(prev => upsertRow(prev, res.data));
  }

  function startEdit(row: GstinRow) {
    if (row.category === 'primary') return;
    setEditingKey(gstinRowKey(row.category, row.id));
    setEditName(row.name);
    setEditGstin(row.gstin);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditName('');
    setEditGstin('');
  }

  async function handleSaveEdit(row: GstinRow) {
    if (row.category === 'primary') return;
    setSavingEdit(true);
    const res = await actionUpdateGstinRow(row.category, row.id, {
      name: editName,
      gstin: editGstin,
    });
    setSavingEdit(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success('Firm updated');
    setDirectory(prev => upsertRow(prev, res.data));
    cancelEdit();
  }

  function requestDelete(row: GstinRow) {
    if (row.category === 'primary') return;
    setDeleteTarget(row);
  }

  async function handleDelete() {
    if (!deleteTarget || deleteTarget.category === 'primary') return;
    const snapshot = deleteTarget;
    setDeleting(true);
    const res = await actionDeleteGstinRow(snapshot.category, snapshot.id);
    setDeleting(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    if (editingKey === gstinRowKey(snapshot.category, snapshot.id)) cancelEdit();
    setDirectory(prev => removeRow(prev, snapshot.category, snapshot.id));
    setDeleteTarget(null);

    registerDeleteUndo('Firm removed', async () => {
      const restore = await actionRestoreGstinRow(snapshot);
      if (!restore.success) throw new Error(restore.error);
      setDirectory(prev => upsertRow(prev, restore.data));
    });
  }

  function openDownloadDialog() {
    setDownloadScope('both');
    setDownloadDialogOpen(true);
  }

  async function handleDownload(scope: GstinDirectoryPdfScope) {
    const dir = query.trim() ? filtered : directory;
    const count = countGstinDirectoryRows(dir, scope);
    if (count === 0) {
      toast.error(PDF_SCOPE_EMPTY_MESSAGES[scope]);
      return;
    }
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/gstin/directory-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directory: dir,
          scope,
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
      setDownloadDialogOpen(false);
      toast.success(`Downloaded ${count} firm${count === 1 ? '' : 's'}`);
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
          <h1 className="m-0">GSTIN directory</h1>
          <p className="m-0 mt-1.5 text-sm text-muted leading-snug">
            Customers you manage here; primary vendors are synced from the Primary ledger
            (view only).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 w-full sm:w-auto"
          disabled={loading || totalCount === 0}
          onClick={openDownloadDialog}
        >
          <Download size={16} />
          Download PDF
        </Button>
      </header>

      <CollapsibleSection title="Add customer" defaultOpen={false} compact>
        <form onSubmit={handleAdd} className="pt-0.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
            <input
              type="text"
              value={addName}
              onChange={e => setAddName(e.target.value)}
              placeholder="Firm name"
              required
              aria-label="Firm name"
              className={compactInput}
            />
            <input
              type="text"
              value={addGstin}
              onChange={e => setAddGstin(e.target.value.toUpperCase())}
              placeholder="GSTIN"
              required
              maxLength={15}
              aria-label="GSTIN"
              className={`${compactInput} font-mono`}
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
          placeholder="Search by firm name or GSTIN…"
          aria-label="Search GSTIN directory"
        />
      </Card>

      {loading && <p className="m-0 text-sm text-muted">Loading directory…</p>}

      {error && (
        <p className="m-0 text-sm font-medium text-red-600 rounded-lg bg-red-50 px-4 py-3">
          {error}
        </p>
      )}

      {!loading && !error && totalCount === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <IdCard className="mx-auto text-slate-300" size={40} strokeWidth={1.25} />
          <p className="m-0 mt-4 text-base font-medium text-slate-800">No firms yet</p>
        </div>
      )}

      {!loading && !error && totalCount > 0 && (
        <div className="flex flex-col gap-8">
          {GSTIN_CATEGORY_ORDER.map(category => (
            <GstinCategorySection
              key={category}
              category={category}
              rows={filtered[category]}
              gstinLabel="GSTIN"
              editingKey={editingKey}
              editName={editName}
              editGstin={editGstin}
              savingEdit={savingEdit}
              onEditNameChange={setEditName}
              onEditGstinChange={setEditGstin}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSaveEdit={row => void handleSaveEdit(row)}
              onDelete={requestDelete}
            />
          ))}
          {query.trim() && filteredCount > 0 && (
            <p className="m-0 text-xs text-slate-500">
              Showing {filteredCount} of {totalCount} firms
            </p>
          )}
          {query.trim() && filteredCount === 0 && (
            <p className="m-0 text-sm text-center text-slate-500 py-4">
              No matches for &ldquo;{query.trim()}&rdquo;
            </p>
          )}
        </div>
      )}

      {!loading && error && (
        <Button variant="outline" onClick={() => { setLoading(true); void loadDirectory(); }}>
          Retry
        </Button>
      )}

      <Dialog
        open={downloadDialogOpen}
        onClose={() => setDownloadDialogOpen(false)}
        title="Download PDF"
        actions={
          <>
            <Button variant="ghost" onClick={() => setDownloadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleDownload(downloadScope)}
              loading={downloading}
            >
              <Download size={16} />
              Download
            </Button>
          </>
        }
      >
        <p className="m-0 text-sm text-muted">Which sections should this PDF include?</p>
        <fieldset className="m-0 mt-3 flex flex-col gap-2 border-0 p-0">
          <legend className="sr-only">PDF sections to include</legend>
          {GSTIN_DIRECTORY_PDF_SCOPES.map(scope => {
            const dir = query.trim() ? filtered : directory;
            const rowCount = countGstinDirectoryRows(dir, scope);
            const selected = downloadScope === scope;
            return (
              <label
                key={scope}
                className={[
                  'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                  selected
                    ? 'border-[var(--primary)] bg-blue-50/60'
                    : 'border-slate-200 hover:border-slate-300',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="gstin-pdf-scope"
                  value={scope}
                  checked={selected}
                  onChange={() => setDownloadScope(scope)}
                  className="mt-1 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">
                    {PDF_SCOPE_LABELS[scope]}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {PDF_SCOPE_DESCRIPTIONS[scope]}
                    {query.trim() ? ` · ${rowCount} matching` : ` · ${rowCount} firm${rowCount === 1 ? '' : 's'}`}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete firm"
        onConfirm={handleDelete}
        loading={deleting}
      >
        {deleteTarget ? (
          <>
            Remove <span className="font-medium text-slate-900">{deleteTarget.name}</span> (
            {deleteTarget.gstin})?
          </>
        ) : null}
      </ConfirmDeleteDialog>
    </div>
  );
}
