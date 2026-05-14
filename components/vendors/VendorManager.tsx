'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import {
  actionGetVendors,
  actionCreateVendor,
  actionUpdateVendor,
  actionDeleteVendor,
} from '@/app/actions/ledger';
import { Vendor } from '@/lib/types';
import { validateGSTIN, normalizeGSTIN, validateVendorName } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Card } from '@/components/ui/Card';

interface FormState {
  name: string;
  gstin: string;
}

const emptyForm: FormState = { name: '', gstin: '' };

export function VendorManager() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add / Edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vendor | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const reloadVendors = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    actionGetVendors().then(res => {
      if (!active) return;
      if (res.success) setVendors(res.data);
      else toast.error(`Could not load vendors: ${res.error}`);
      setLoading(false);
    });
    return () => { active = false; };
  }, [refreshKey]);

  function openAdd() {
    setEditTarget(null);
    setForm(emptyForm);
    setErrors({});
    setFormOpen(true);
  }

  function openEdit(vendor: Vendor) {
    setEditTarget(vendor);
    setForm({ name: vendor.name, gstin: vendor.gstin });
    setErrors({});
    setFormOpen(true);
  }

  function validate(): boolean {
    const errs: Partial<FormState> = {};
    const nameCheck = validateVendorName(form.name);
    if (!nameCheck.valid) errs.name = nameCheck.error;
    const gstinCheck = validateGSTIN(form.gstin);
    if (!gstinCheck.valid) errs.gstin = gstinCheck.error;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = editTarget
        ? await actionUpdateVendor(editTarget.id, form.name, form.gstin)
        : await actionCreateVendor(form.name, form.gstin);

      if (res.success) {
        toast.success(editTarget ? 'Updated.' : 'Added.');
        setFormOpen(false);
        reloadVendors();
      } else {
        toast.error(res.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await actionDeleteVendor(deleteTarget.id);
      if (res.success) {
        toast.success('Removed.');
        setDeleteTarget(null);
        reloadVendors();
      } else {
        toast.error(res.error);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="m-0">Vendors</h1>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus size={16} />
          Add
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading…
        </div>
      ) : vendors.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="m-0 text-sm font-medium text-slate-800">No vendors</p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {vendors.map(v => (
            <Card key={v.id} className="flex items-center gap-4 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate m-0 text-slate-900">{v.name}</p>
                <p className="font-mono text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {v.gstin}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button variant="outline" onClick={() => openEdit(v)} aria-label={`Edit ${v.name}`} className="px-3">
                  <Pencil size={16} />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button variant="danger" onClick={() => setDeleteTarget(v)} aria-label={`Delete ${v.name}`} className="px-3">
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? 'Edit vendor' : 'New vendor'}
        actions={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              <X size={16} /> Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              <Save size={16} /> {editTarget ? 'Save' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="vendor-name">Name</label>
            <input
              id="vendor-name"
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Legal name"
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm font-medium text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="vendor-gstin">GSTIN</label>
            <input
              id="vendor-gstin"
              type="text"
              value={form.gstin}
              onChange={e =>
                setForm(f => ({ ...f, gstin: normalizeGSTIN(e.target.value) }))
              }
              placeholder="15 characters"
              maxLength={15}
              className="font-mono"
            />
            {errors.gstin && (
              <p className="mt-1 text-sm font-medium text-red-600">{errors.gstin}</p>
            )}
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete vendor"
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              <X size={16} /> Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              <Trash2 size={16} /> Delete
            </Button>
          </>
        }
      >
        <p className="m-0 text-sm text-slate-700">
          Remove <span className="font-medium text-slate-900">{deleteTarget?.name}</span> and all ledger lines for this vendor?
        </p>
      </Dialog>
    </div>
  );
}
