import {
  actionCreateVendor,
  actionUpdateVendor,
  actionDeleteVendor,
  actionGetVendors,
  actionGetEntriesByVendor,
  actionCreateEntry,
  actionUpdateEntry,
  actionDeleteEntry,
  actionNilBalance,
} from '@/app/actions/ledger';
import {
  actionCreateSecondaryVendor,
  actionUpdateSecondaryVendor,
  actionDeleteSecondaryVendor,
  actionGetSecondaryVendors,
  actionGetSecondaryEntriesByVendor,
  actionCreateSecondaryEntry,
  actionUpdateSecondaryEntry,
  actionDeleteSecondaryEntry,
  actionSecondaryNilBalance,
} from '@/app/actions/secondaryLedger';
import { ActionResult, EntryType, LedgerEntry, LedgerScope } from './types';
import { WorkspaceVendorRow } from './ledgerWorkspaceUtils';

export interface WorkspaceActions {
  loadVendors: () => Promise<WorkspaceVendorRow[]>;
  createVendor: (name: string, identifier: string) => Promise<ActionResult<unknown>>;
  updateVendor: (id: string, name: string, identifier: string) => Promise<ActionResult<unknown>>;
  deleteVendor: (id: string) => Promise<ActionResult>;
  getEntriesByVendor: (vendorId: string) => Promise<ActionResult<LedgerEntry[]>>;
  createEntry: (
    vendorId: string,
    type: EntryType,
    date: string,
    amount: string,
    docNumber: string,
    notes: string
  ) => Promise<ActionResult<LedgerEntry>>;
  updateEntry: (
    entryId: string,
    type: EntryType,
    date: string,
    amount: string,
    docNumber: string,
    notes: string
  ) => Promise<ActionResult<LedgerEntry>>;
  deleteEntry: (id: string) => Promise<ActionResult>;
  nilBalance: (vendorId: string) => Promise<ActionResult<LedgerEntry>>;
}

export function getWorkspaceActions(scope: LedgerScope): WorkspaceActions {
  if (scope === 'primary') {
    return {
      loadVendors: async () => {
        const res = await actionGetVendors();
        if (!res.success) throw new Error(res.error);
        return res.data.map(v => ({ id: v.id, name: v.name, identifier: v.gstin }));
      },
      createVendor: actionCreateVendor,
      updateVendor: actionUpdateVendor,
      deleteVendor: actionDeleteVendor,
      getEntriesByVendor: actionGetEntriesByVendor,
      createEntry: actionCreateEntry,
      updateEntry: actionUpdateEntry,
      deleteEntry: actionDeleteEntry,
      nilBalance: actionNilBalance,
    };
  }

  return {
    loadVendors: async () => {
      const res = await actionGetSecondaryVendors();
      if (!res.success) throw new Error(res.error);
      return res.data.map(v => ({ id: v.id, name: v.name, identifier: v.ref }));
    },
    createVendor: actionCreateSecondaryVendor,
    updateVendor: actionUpdateSecondaryVendor,
    deleteVendor: actionDeleteSecondaryVendor,
    getEntriesByVendor: actionGetSecondaryEntriesByVendor,
    createEntry: actionCreateSecondaryEntry,
    updateEntry: actionUpdateSecondaryEntry,
    deleteEntry: actionDeleteSecondaryEntry,
    nilBalance: actionSecondaryNilBalance,
  };
}
