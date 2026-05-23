'use client';

import { Plus, Pencil, Trash2, Save, X, BookOpen } from 'lucide-react';
import { WorkspaceMeta } from '@/lib/workspaceConfig';
import { WorkspaceVendorRow } from '@/lib/ledgerWorkspaceUtils';
import { formatINR } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog';
import { Dialog } from '@/components/ui/Dialog';
import { SearchField } from '@/components/ui/SearchField';

export interface VendorFormState {
  name: string;
  identifier: string;
}

interface VendorListPanelProps {
  config: WorkspaceMeta;
  vendors: WorkspaceVendorRow[];
  filteredVendors: WorkspaceVendorRow[];
  vendorsLoading: boolean;
  vendorSearch: string;
  onVendorSearchChange: (value: string) => void;
  onOpenAdd: () => void;
  onSelectVendor: (id: string) => void;
  onOpenEdit: (vendor: WorkspaceVendorRow) => void;
  vendorFormOpen: boolean;
  onCloseVendorForm: () => void;
  vendorEditTarget: WorkspaceVendorRow | null;
  vendorForm: VendorFormState;
  onVendorFormChange: (form: VendorFormState) => void;
  vendorFormErrors: Partial<VendorFormState>;
  vendorSaving: boolean;
  onVendorSave: () => void;
  vendorDeleteTarget: WorkspaceVendorRow | null;
  onCloseDeleteDialog: () => void;
  vendorDeleting: boolean;
  onVendorDelete: () => void;
  onSetDeleteTarget: (vendor: WorkspaceVendorRow) => void;
}

function balanceTone(balance: number): string {
  if (balance > 0) return 'text-balance-due';
  if (balance < 0) return 'text-balance-credit';
  return 'text-muted';
}

export function VendorListPanel({
  config,
  vendors,
  filteredVendors,
  vendorsLoading,
  vendorSearch,
  onVendorSearchChange,
  onOpenAdd,
  onSelectVendor,
  onOpenEdit,
  vendorFormOpen,
  onCloseVendorForm,
  vendorEditTarget,
  vendorForm,
  onVendorFormChange,
  vendorFormErrors,
  vendorSaving,
  onVendorSave,
  vendorDeleteTarget,
  onCloseDeleteDialog,
  vendorDeleting,
  onVendorDelete,
  onSetDeleteTarget,
}: VendorListPanelProps) {
  return (
    <>
      <div className="page-header page-header--row">
        <h1 className="m-0">Ledger</h1>
        <Button onClick={onOpenAdd} className="gap-1.5 shrink-0">
          <Plus size={16} />
          Add vendor
        </Button>
      </div>

      <Card className="!p-3">
        <SearchField
          value={vendorSearch}
          onChange={e => onVendorSearchChange(e.target.value)}
          placeholder={`Search name or ${config.identifierLabel.toLowerCase()}…`}
          aria-label="Search vendors"
        />
      </Card>

      {vendorsLoading ? (
        <p className="m-0 text-sm text-center py-10 text-muted">Loading…</p>
      ) : filteredVendors.length === 0 ? (
        <Card>
          <div className="empty-state !py-8">
            <p className="m-0 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {vendors.length === 0 ? 'No vendors yet' : 'No matches'}
            </p>
            {vendors.length === 0 && (
              <Button variant="outline" onClick={onOpenAdd} className="mt-4 gap-1.5">
                <Plus size={16} />
                Add vendor
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredVendors.map(v => (
            <Card key={v.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate m-0">{v.name}</p>
                <p className="font-mono text-xs m-0 mt-0.5 truncate text-muted">
                  {config.identifierLabel}: {v.identifier || '—'}
                </p>
              </div>
              <div className="shrink-0 text-right sm:min-w-[6.5rem]">
                <p className="text-xs m-0 text-muted">Balance</p>
                <p
                  className={`text-sm font-semibold font-mono tabular-nums m-0 mt-0.5 ${balanceTone(v.closingBalance)}`}
                >
                  {formatINR(v.closingBalance)}
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0 justify-end sm:ml-0">
                <Button
                  variant="outline"
                  onClick={() => onSelectVendor(v.id)}
                  aria-label={`Open ledger for ${v.name}`}
                  className="px-3"
                  title="Open ledger"
                >
                  <BookOpen size={16} />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenEdit(v)}
                  aria-label={`Edit ${v.name}`}
                  className="px-3"
                >
                  <Pencil size={16} />
                </Button>
                <Button
                  variant="danger"
                  onClick={() => onSetDeleteTarget(v)}
                  aria-label={`Delete ${v.name}`}
                  className="px-3"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={vendorFormOpen}
        onClose={onCloseVendorForm}
        title={vendorEditTarget ? 'Edit vendor' : 'New vendor'}
        actions={
          <>
            <Button variant="ghost" onClick={onCloseVendorForm}>
              <X size={16} /> Cancel
            </Button>
            <Button onClick={onVendorSave} loading={vendorSaving}>
              <Save size={16} /> {vendorEditTarget ? 'Save' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="ws-vendor-name">Name</label>
            <input
              id="ws-vendor-name"
              type="text"
              value={vendorForm.name}
              onChange={e => onVendorFormChange({ ...vendorForm, name: e.target.value })}
              placeholder="Legal name"
              autoFocus
            />
            {vendorFormErrors.name && (
              <p className="mt-1 text-sm font-medium text-red-600">{vendorFormErrors.name}</p>
            )}
          </div>
          <div>
            <label htmlFor="ws-vendor-id">{config.identifierLabel}</label>
            <input
              id="ws-vendor-id"
              type="text"
              value={vendorForm.identifier}
              onChange={e =>
                onVendorFormChange({
                  ...vendorForm,
                  identifier: config.normalizeIdentifier(e.target.value),
                })
              }
              placeholder={config.identifierPlaceholder}
              maxLength={config.identifierMaxLength}
              className={config.identifierInputClassName}
            />
            {vendorFormErrors.identifier && (
              <p className="mt-1 text-sm font-medium text-red-600">
                {vendorFormErrors.identifier}
              </p>
            )}
          </div>
        </div>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!vendorDeleteTarget}
        onClose={onCloseDeleteDialog}
        title="Delete vendor"
        onConfirm={onVendorDelete}
        loading={vendorDeleting}
      >
        {vendorDeleteTarget ? (
          <>
            Remove <span className="font-medium text-slate-900">{vendorDeleteTarget.name}</span> and
            all ledger lines for this vendor?
          </>
        ) : null}
      </ConfirmDeleteDialog>
    </>
  );
}
