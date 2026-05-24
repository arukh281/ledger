'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { LedgerEntry, LedgerScope } from '@/lib/types';
import { computeLedger } from '@/lib/ledgerMath';
import {
  formatDate,
  firstDayOfMonthIso,
  lastDayOfMonthIso,
  validateVendorName,
} from '@/lib/validation';
import { getWorkspaceMeta } from '@/lib/workspaceConfig';
import { getWorkspaceActions } from '@/lib/workspaceActions';
import {
  buildFinancialYearOptions,
  buildYearOptions,
  CALENDAR_MONTHS,
  currentIndianFinancialYearStartYear,
  filterVendors,
  financialYearBounds,
  financialYearRangeLabel,
  PeriodMode,
  toVendorShape,
  WorkspaceVendorRow,
} from '@/lib/ledgerWorkspaceUtils';
import { VendorListPanel, VendorFormState } from '@/components/ledger/VendorListPanel';
import { LedgerDetailPanel } from '@/components/ledger/LedgerDetailPanel';
import { LedgerScopeSwitcher } from '@/components/ledger/LedgerScopeSwitcher';
import { useDeleteWithUndo } from '@/components/undo/UndoProvider';
import { actionRestoreVendor } from '@/app/actions/ledger';
import { actionRestoreSecondaryVendor } from '@/app/actions/secondaryLedger';

const emptyVendorForm: VendorFormState = { name: '', identifier: '' };

interface LedgerWorkspaceProps {
  scope: LedgerScope;
}

export function LedgerWorkspace({ scope }: LedgerWorkspaceProps) {
  const registerDeleteUndo = useDeleteWithUndo();
  const config = getWorkspaceMeta(scope);
  const actions = useMemo(() => getWorkspaceActions(scope), [scope]);

  const [vendors, setVendors] = useState<WorkspaceVendorRow[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorSearch, setVendorSearch] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [allEntries, setAllEntries] = useState<LedgerEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null);

  const [periodMode, setPeriodMode] = useState<PeriodMode>('all');
  const [financialYearStart, setFinancialYearStart] = useState(
    () => currentIndianFinancialYearStartYear()
  );
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entriesKey, setEntriesKey] = useState(0);
  const [downloading, setDownloading] = useState(false);

  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [vendorEditTarget, setVendorEditTarget] = useState<WorkspaceVendorRow | null>(null);
  const [vendorForm, setVendorForm] = useState<VendorFormState>(emptyVendorForm);
  const [vendorFormErrors, setVendorFormErrors] = useState<Partial<VendorFormState>>({});
  const [vendorSaving, setVendorSaving] = useState(false);
  const [vendorDeleteTarget, setVendorDeleteTarget] = useState<WorkspaceVendorRow | null>(null);
  const [vendorDeleting, setVendorDeleting] = useState(false);

  const reloadVendors = useCallback(() => setRefreshKey(k => k + 1), []);
  const refreshEntries = useCallback(() => setEntriesKey(k => k + 1), []);

  useEffect(() => {
    let active = true;
    setVendorsLoading(true);
    actions
      .loadVendors()
      .then(data => {
        if (active) setVendors(data);
      })
      .catch(e => {
        if (active) toast.error(`Could not load vendors: ${String(e)}`);
      })
      .finally(() => {
        if (active) setVendorsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [actions, refreshKey]);

  useEffect(() => {
    if (!selectedVendorId) {
      setAllEntries([]);
      return;
    }
    let active = true;
    setEntriesLoading(true);
    actions.getEntriesByVendor(selectedVendorId).then(res => {
      if (!active) return;
      if (res.success) setAllEntries(res.data);
      else toast.error(res.error);
      setEntriesLoading(false);
    });
    return () => {
      active = false;
    };
  }, [selectedVendorId, entriesKey, actions]);

  const filteredVendors = useMemo(
    () => filterVendors(vendors, vendorSearch),
    [vendors, vendorSearch]
  );

  const selectedVendor = vendors.find(v => v.id === selectedVendorId) ?? null;

  const yearOptions = useMemo(() => buildYearOptions(allEntries), [allEntries]);
  const financialYearOptions = useMemo(
    () => buildFinancialYearOptions(allEntries),
    [allEntries]
  );

  useEffect(() => {
    if (yearOptions.length === 0) return;
    if (!yearOptions.includes(calendarYear)) {
      setCalendarYear(yearOptions[0]!);
    }
  }, [yearOptions, calendarYear]);

  useEffect(() => {
    if (financialYearOptions.length === 0) return;
    if (!financialYearOptions.some(o => o.startYear === financialYearStart)) {
      setFinancialYearStart(financialYearOptions[0]!.startYear);
    }
  }, [financialYearOptions, financialYearStart]);

  const effectiveRange = useMemo(() => {
    if (periodMode === 'all') {
      return { from: null as string | null, to: null as string | null };
    }
    if (periodMode === 'financial_year') {
      const fy = financialYearOptions.find(o => o.startYear === financialYearStart);
      if (fy) return { from: fy.from, to: fy.to };
      const { from, to } = financialYearBounds(financialYearStart);
      return { from, to };
    }
    if (periodMode === 'month') {
      return {
        from: firstDayOfMonthIso(calendarYear, calendarMonth),
        to: lastDayOfMonthIso(calendarYear, calendarMonth),
      };
    }
    return { from: fromDate || null, to: toDate || null };
  }, [periodMode, financialYearStart, financialYearOptions, calendarYear, calendarMonth, fromDate, toDate]);

  const { entries: filteredEntries, summary } = computeLedger(
    allEntries,
    effectiveRange.from,
    effectiveRange.to
  );

  const fullLedger = useMemo(() => computeLedger(allEntries, null, null), [allEntries]);

  const rangeLabel = useMemo(() => {
    if (periodMode === 'all') return 'All dates';
    if (periodMode === 'financial_year') return financialYearRangeLabel(financialYearStart);
    if (periodMode === 'month') {
      const label = CALENDAR_MONTHS.find(m => m.value === calendarMonth)?.label ?? '';
      return `${label} ${calendarYear}`;
    }
    if (!fromDate && !toDate) return 'All dates';
    return `${fromDate ? formatDate(fromDate) : 'Beginning'} to ${toDate ? formatDate(toDate) : 'Today'}`;
  }, [periodMode, financialYearStart, calendarMonth, calendarYear, fromDate, toDate]);

  async function handleDownload() {
    if (!selectedVendor || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/ledger/statement-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: selectedVendor.name,
          vendorIdentifier: selectedVendor.identifier,
          identifierLabel: config.identifierLabel,
          entries: filteredEntries,
          summary,
          fromDate: effectiveRange.from,
          toDate: effectiveRange.to,
          rangeLabel,
        }),
      });
      if (!res.ok) {
        toast.error('Could not generate PDF.');
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i);
      const filename = match?.[1]
        ? decodeURIComponent(match[1])
        : `${selectedVendor.name} and ${rangeLabel}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download statement.');
    } finally {
      setDownloading(false);
    }
  }

  function clearFilters() {
    setPeriodMode('all');
    setFromDate('');
    setToDate('');
    const now = new Date();
    setCalendarMonth(now.getMonth() + 1);
    setCalendarYear(now.getFullYear());
    setFinancialYearStart(currentIndianFinancialYearStartYear());
  }

  const hasFilter = periodMode !== 'all' || Boolean(fromDate || toDate);

  function setPeriodModeAndSync(mode: PeriodMode) {
    setPeriodMode(mode);
    if (mode === 'month') {
      setFromDate('');
      setToDate('');
    }
    if (mode === 'custom') {
      setFromDate(firstDayOfMonthIso(calendarYear, calendarMonth));
      setToDate(lastDayOfMonthIso(calendarYear, calendarMonth));
    }
    if (mode === 'financial_year') {
      setFromDate('');
      setToDate('');
      setFinancialYearStart(currentIndianFinancialYearStartYear());
    }
    if (mode === 'all') {
      setFromDate('');
      setToDate('');
    }
  }

  function openVendorAdd() {
    setVendorEditTarget(null);
    setVendorForm(emptyVendorForm);
    setVendorFormErrors({});
    setVendorFormOpen(true);
  }

  function openVendorEdit(v: WorkspaceVendorRow) {
    setVendorEditTarget(v);
    setVendorForm({ name: v.name, identifier: v.identifier });
    setVendorFormErrors({});
    setVendorFormOpen(true);
  }

  function validateVendorForm(): boolean {
    const errs: Partial<VendorFormState> = {};
    const nameCheck = validateVendorName(vendorForm.name);
    if (!nameCheck.valid) errs.name = nameCheck.error;
    const idCheck = config.validateIdentifier(vendorForm.identifier);
    if (!idCheck.valid) errs.identifier = idCheck.error;
    setVendorFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleVendorSave() {
    if (!validateVendorForm()) return;
    setVendorSaving(true);
    try {
      const identifier = config.normalizeIdentifier(vendorForm.identifier);
      const res = vendorEditTarget
        ? await actions.updateVendor(vendorEditTarget.id, vendorForm.name, identifier)
        : await actions.createVendor(vendorForm.name, identifier);
      if (res.success) {
        toast.success(vendorEditTarget ? 'Updated.' : 'Added.');
        setVendorFormOpen(false);
        reloadVendors();
      } else {
        toast.error(res.error);
      }
    } finally {
      setVendorSaving(false);
    }
  }

  async function handleVendorDelete() {
    if (!vendorDeleteTarget) return;
    const snapshot = vendorDeleteTarget;
    setVendorDeleting(true);
    try {
      const entriesRes = await actions.getEntriesByVendor(snapshot.id);
      const entries = entriesRes.success ? entriesRes.data : [];

      const res = await actions.deleteVendor(snapshot.id);
      if (res.success) {
        if (selectedVendorId === snapshot.id) {
          setSelectedVendorId('');
        }
        setVendorDeleteTarget(null);
        reloadVendors();
        registerDeleteUndo('Vendor removed', async () => {
          const restore =
            scope === 'party'
              ? await actionRestoreVendor(
                  { id: snapshot.id, name: snapshot.name, gstin: snapshot.identifier },
                  entries
                )
              : await actionRestoreSecondaryVendor(
                  { id: snapshot.id, name: snapshot.name, ref: snapshot.identifier },
                  entries
                );
          if (!restore.success) throw new Error(restore.error);
          reloadVendors();
        });
      } else {
        toast.error(res.error);
      }
    } finally {
      setVendorDeleting(false);
    }
  }

  function selectVendor(id: string) {
    setSelectedVendorId(id);
    setPeriodMode('all');
    setFromDate('');
    setToDate('');
    const now = new Date();
    setCalendarMonth(now.getMonth() + 1);
    setCalendarYear(now.getFullYear());
    setFinancialYearStart(currentIndianFinancialYearStartYear());
    setShowAddEntry(false);
    setEditEntry(null);
  }

  if (!selectedVendorId) {
    return (
      <div className="page max-w-3xl">
        <LedgerScopeSwitcher scope={scope} className="no-print" />
        <VendorListPanel
        config={config}
        vendors={vendors}
        filteredVendors={filteredVendors}
        vendorsLoading={vendorsLoading}
        vendorSearch={vendorSearch}
        onVendorSearchChange={setVendorSearch}
        onOpenAdd={openVendorAdd}
        onSelectVendor={selectVendor}
        onOpenEdit={openVendorEdit}
        vendorFormOpen={vendorFormOpen}
        onCloseVendorForm={() => setVendorFormOpen(false)}
        vendorEditTarget={vendorEditTarget}
        vendorForm={vendorForm}
        onVendorFormChange={setVendorForm}
        vendorFormErrors={vendorFormErrors}
        vendorSaving={vendorSaving}
        onVendorSave={handleVendorSave}
        vendorDeleteTarget={vendorDeleteTarget}
        onCloseDeleteDialog={() => setVendorDeleteTarget(null)}
        vendorDeleting={vendorDeleting}
        onVendorDelete={handleVendorDelete}
        onSetDeleteTarget={setVendorDeleteTarget}
      />
      </div>
    );
  }

  if (!selectedVendor) {
    return null;
  }

  return (
    <div className="page max-w-3xl">
      <LedgerScopeSwitcher scope={scope} className="no-print" />
      <LedgerDetailPanel
      config={config}
      actions={actions}
      vendor={selectedVendor}
      vendorsForForm={toVendorShape(vendors)}
      onBack={() => {
        setSelectedVendorId('');
        setShowAddEntry(false);
        setEditEntry(null);
        reloadVendors();
      }}
      onDownload={handleDownload}
      downloading={downloading}
      closingBalance={fullLedger.summary.closing_balance}
      entriesLoading={entriesLoading}
      filteredEntries={filteredEntries}
      summary={summary}
      periodMode={periodMode}
      onPeriodModeChange={setPeriodModeAndSync}
      calendarMonth={calendarMonth}
      onCalendarMonthChange={setCalendarMonth}
      calendarYear={calendarYear}
      onCalendarYearChange={setCalendarYear}
      yearOptions={yearOptions}
      financialYearOptions={financialYearOptions}
      financialYearStart={financialYearStart}
      onFinancialYearStartChange={setFinancialYearStart}
      fromDate={fromDate}
      onFromDateChange={setFromDate}
      toDate={toDate}
      onToDateChange={setToDate}
      hasFilter={hasFilter}
      onClearFilters={clearFilters}
      showAddEntry={showAddEntry}
      editEntry={editEntry}
      onCloseEntryDialog={() => {
        setShowAddEntry(false);
        setEditEntry(null);
      }}
      onOpenAddEntry={() => {
        setEditEntry(null);
        setShowAddEntry(true);
      }}
      onEditEntry={e => setEditEntry(e)}
      onRefreshEntries={refreshEntries}
    />
    </div>
  );
}
