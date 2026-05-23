'use client';

import { Download, PlusCircle, ArrowLeft } from 'lucide-react';
import {
  LedgerEntry,
  LedgerEntryWithBalance,
  LedgerSummary,
  Vendor,
} from '@/lib/types';
import { WorkspaceMeta } from '@/lib/workspaceConfig';
import {
  WorkspaceVendorRow,
  PeriodMode,
  CALENDAR_MONTHS,
  FINANCIAL_YEAR_MODE_LABEL,
  FinancialYearOption,
} from '@/lib/ledgerWorkspaceUtils';
import { todayISO } from '@/lib/validation';
import { WorkspaceActions } from '@/lib/workspaceActions';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { SummaryCards } from '@/components/ledger/SummaryCards';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { NilBalanceButton } from '@/components/ledger/NilBalanceButton';
import { EntryForm } from '@/components/forms/EntryForm';

interface LedgerDetailPanelProps {
  config: WorkspaceMeta;
  actions: WorkspaceActions;
  vendor: WorkspaceVendorRow;
  vendorsForForm: Vendor[];
  onBack: () => void;
  onDownload: () => void;
  downloading: boolean;
  closingBalance: number;
  entriesLoading: boolean;
  filteredEntries: LedgerEntryWithBalance[];
  summary: LedgerSummary;
  periodMode: PeriodMode;
  onPeriodModeChange: (mode: PeriodMode) => void;
  calendarMonth: number;
  onCalendarMonthChange: (month: number) => void;
  calendarYear: number;
  onCalendarYearChange: (year: number) => void;
  yearOptions: number[];
  financialYearOptions: FinancialYearOption[];
  financialYearStart: number;
  onFinancialYearStartChange: (startYear: number) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  hasFilter: boolean;
  onClearFilters: () => void;
  showAddEntry: boolean;
  editEntry: LedgerEntry | null;
  onCloseEntryDialog: () => void;
  onOpenAddEntry: () => void;
  onEditEntry: (entry: LedgerEntryWithBalance) => void;
  onRefreshEntries: () => void;
}

export function LedgerDetailPanel({
  config,
  actions,
  vendor,
  vendorsForForm,
  onBack,
  onDownload,
  downloading,
  closingBalance,
  entriesLoading,
  filteredEntries,
  summary,
  periodMode,
  onPeriodModeChange,
  calendarMonth,
  onCalendarMonthChange,
  calendarYear,
  onCalendarYearChange,
  yearOptions,
  financialYearOptions,
  financialYearStart,
  onFinancialYearStartChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  hasFilter,
  onClearFilters,
  showAddEntry,
  editEntry,
  onCloseEntryDialog,
  onOpenAddEntry,
  onEditEntry,
  onRefreshEntries,
}: LedgerDetailPanelProps) {
  return (
    <>
      <div className="flex items-center gap-3 no-print">
        <Button variant="ghost" onClick={onBack} className="shrink-0 !px-2">
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Vendors</span>
        </Button>
        <h1 className="m-0 text-lg">Ledger</h1>
      </div>

      <div className="page-header page-header--row no-print">
        <div>
          <h2 className="m-0 text-base font-semibold">{vendor.name}</h2>
          <p className="font-mono text-xs m-0 mt-0.5 text-muted">
            {config.identifierLabel}: {vendor.identifier || '—'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="outline" onClick={onOpenAddEntry}>
            <PlusCircle size={16} />
            Entry
          </Button>
          <NilBalanceButton
            vendorId={vendor.id}
            vendorName={vendor.name}
            closingBalance={closingBalance}
            onSuccess={onRefreshEntries}
            onNilBalance={actions.nilBalance}
          />
          <Button variant="outline" onClick={onDownload} disabled={downloading}>
            <Download size={16} />
            {downloading ? 'Downloading…' : 'Download'}
          </Button>
        </div>
      </div>

      <Dialog
        open={showAddEntry || editEntry !== null}
        onClose={onCloseEntryDialog}
        title={editEntry ? 'Edit entry' : 'New entry'}
        panelMaxWidthClass="max-w-2xl"
        bodyClassName="max-h-[85vh] overflow-y-auto overscroll-contain"
      >
        <EntryForm
          key={editEntry?.id ?? 'new-entry'}
          vendors={vendorsForForm}
          preselectedVendorId={vendor.id}
          entryToEdit={editEntry}
          onCreateEntry={actions.createEntry}
          onUpdateEntry={actions.updateEntry}
          onSuccess={() => {
            onRefreshEntries();
            onCloseEntryDialog();
          }}
        />
      </Dialog>

      <Card className="no-print">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block">Period</label>
            <div className="segmented segmented--fill" role="group" aria-label="Ledger period">
              {(
                [
                  { mode: 'all' as const, label: 'All dates' },
                  { mode: 'financial_year' as const, label: FINANCIAL_YEAR_MODE_LABEL },
                  { mode: 'month' as const, label: 'Month' },
                  { mode: 'custom' as const, label: 'Custom' },
                ] as const
              ).map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onPeriodModeChange(mode)}
                  className={['segmented-btn', periodMode === mode ? 'segmented-btn--active' : ''].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {periodMode === 'financial_year' && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-auto sm:min-w-[10rem] sm:max-w-[14rem]">
                <label htmlFor="ledger-fy">Financial year</label>
                <select
                  id="ledger-fy"
                  value={financialYearStart}
                  onChange={e => onFinancialYearStartChange(Number(e.target.value))}
                >
                  {financialYearOptions.map(fy => (
                    <option key={fy.startYear} value={fy.startYear}>
                      {fy.shortLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {periodMode === 'month' && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-auto sm:min-w-[9rem] sm:max-w-[12rem]">
                <label htmlFor="ledger-month">Month</label>
                <select
                  id="ledger-month"
                  value={calendarMonth}
                  onChange={e => onCalendarMonthChange(Number(e.target.value))}
                >
                  {CALENDAR_MONTHS.map(m => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-auto sm:min-w-[6rem] sm:max-w-[8rem]">
                <label htmlFor="ledger-year">Year</label>
                <select
                  id="ledger-year"
                  value={calendarYear}
                  onChange={e => onCalendarYearChange(Number(e.target.value))}
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {periodMode === 'custom' && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-auto sm:min-w-[9rem] sm:max-w-[11rem]">
                <label htmlFor="from-date">From</label>
                <input
                  id="from-date"
                  type="date"
                  value={fromDate}
                  max={toDate || todayISO()}
                  onChange={e => onFromDateChange(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-auto sm:min-w-[9rem] sm:max-w-[11rem]">
                <label htmlFor="to-date">To</label>
                <input
                  id="to-date"
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={todayISO()}
                  onChange={e => onToDateChange(e.target.value)}
                />
              </div>
            </div>
          )}

          {hasFilter && (
            <div>
              <Button variant="ghost" onClick={onClearFilters} className="shrink-0">
                <ArrowLeft size={16} />
                Reset
              </Button>
            </div>
          )}
        </div>
      </Card>

      {entriesLoading ? (
        <p className="m-0 text-sm text-muted">Loading…</p>
      ) : (
        <div className="no-print">
          <SummaryCards summary={summary} />
          <LedgerTable
            entries={filteredEntries}
            onRefresh={onRefreshEntries}
            onEditEntry={onEditEntry}
            onDeleteEntry={actions.deleteEntry}
            ledgerScope={config.scope}
          />
        </div>
      )}
    </>
  );
}
