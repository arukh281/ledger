'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Printer, PlusCircle, ArrowLeft } from 'lucide-react';
import { actionGetVendors, actionGetEntriesByVendor } from '@/app/actions/ledger';
import { Vendor, LedgerEntry } from '@/lib/types';
import { computeLedger } from '@/lib/ledgerMath';
import { todayISO, formatDate, firstDayOfMonthIso, lastDayOfMonthIso } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { SummaryCards } from '@/components/ledger/SummaryCards';
import { LedgerTable } from '@/components/ledger/LedgerTable';
import { NilBalanceButton } from '@/components/ledger/NilBalanceButton';
import { PrintableLedger } from '@/components/ledger/PrintableLedger';
import { EntryForm } from '@/components/forms/EntryForm';
import { VendorCombobox } from '@/components/forms/VendorCombobox';

type PeriodMode = 'all' | 'month' | 'custom';

const CALENDAR_MONTHS: { value: number; label: string }[] = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function buildYearOptions(allEntries: LedgerEntry[]): number[] {
  const yEnd = new Date().getFullYear() + 1;
  let yStart = 2018;
  for (const e of allEntries) {
    const y = parseInt(e.date.slice(0, 4), 10);
    if (!Number.isNaN(y)) yStart = Math.min(yStart, y);
  }
  const out: number[] = [];
  for (let y = yEnd; y >= yStart; y--) out.push(y);
  return out;
}

export default function LedgerPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [allEntries, setAllEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null);

  const [periodMode, setPeriodMode] = useState<PeriodMode>('all');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [entriesKey, setEntriesKey] = useState(0);
  const refreshEntries = useCallback(() => setEntriesKey(k => k + 1), []);

  useEffect(() => {
    let active = true;
    setVendorsLoading(true);
    actionGetVendors().then(res => {
      if (!active) return;
      if (res.success) setVendors(res.data);
      setVendorsLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedVendorId) { setAllEntries([]); return; }
    let active = true;
    setLoading(true);
    actionGetEntriesByVendor(selectedVendorId).then(res => {
      if (!active) return;
      if (res.success) setAllEntries(res.data);
      setLoading(false);
    });
    return () => { active = false; };
  }, [selectedVendorId, entriesKey]);

  const yearOptions = useMemo(() => buildYearOptions(allEntries), [allEntries]);

  useEffect(() => {
    if (yearOptions.length === 0) return;
    if (!yearOptions.includes(calendarYear)) {
      setCalendarYear(yearOptions[0]!);
    }
  }, [yearOptions, calendarYear]);

  const effectiveRange = useMemo(() => {
    if (periodMode === 'all') {
      return { from: null as string | null, to: null as string | null };
    }
    if (periodMode === 'month') {
      return {
        from: firstDayOfMonthIso(calendarYear, calendarMonth),
        to: lastDayOfMonthIso(calendarYear, calendarMonth),
      };
    }
    return { from: fromDate || null, to: toDate || null };
  }, [periodMode, calendarYear, calendarMonth, fromDate, toDate]);

  const { entries: filteredEntries, summary } = computeLedger(
    allEntries,
    effectiveRange.from,
    effectiveRange.to
  );

  const fullLedger = useMemo(() => computeLedger(allEntries, null, null), [allEntries]);

  const selectedVendor = vendors.find(v => v.id === selectedVendorId) ?? null;

  const rangeLabelForPrint = useMemo(() => {
    if (periodMode === 'all') return 'All dates';
    if (periodMode === 'month') {
      const label = CALENDAR_MONTHS.find(m => m.value === calendarMonth)?.label ?? '';
      return `${label} ${calendarYear}`;
    }
    if (!fromDate && !toDate) return 'All dates';
    return `${fromDate ? formatDate(fromDate) : 'Beginning'} to ${toDate ? formatDate(toDate) : 'Today'}`;
  }, [periodMode, calendarMonth, calendarYear, fromDate, toDate]);

  function handlePrint() {
    if (!selectedVendor) return;

    const previousTitle = document.title;
    const rangeLabel = rangeLabelForPrint;

    function sanitizeForFilename(value: string): string {
      return value
        .replace(/[/\\:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
    }

    document.title = `${sanitizeForFilename(selectedVendor.name)} - ${sanitizeForFilename(rangeLabel)}`;

    function restoreTitle() {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
      window.clearTimeout(fallbackTimer);
    }

    window.addEventListener('afterprint', restoreTitle);
    const fallbackTimer = window.setTimeout(restoreTitle, 5000);
    window.print();
  }

  function clearFilters() {
    setPeriodMode('all');
    setFromDate('');
    setToDate('');
    const now = new Date();
    setCalendarMonth(now.getMonth() + 1);
    setCalendarYear(now.getFullYear());
  }

  const hasFilter =
    periodMode !== 'all' || Boolean(fromDate || toDate);

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
    if (mode === 'all') {
      setFromDate('');
      setToDate('');
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="m-0">Ledger</h1>

      <Card>
        {vendorsLoading ? (
          <p className="m-0 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : vendors.length === 0 ? (
          <p className="m-0 text-sm" style={{ color: 'var(--text-muted)' }}>
            <a href="/vendors" className="text-slate-900 font-medium underline-offset-2 hover:underline">
              Add a vendor
            </a>
          </p>
        ) : (
          <VendorCombobox
            inputId="ledger-vendor"
            vendors={vendors}
            value={selectedVendorId}
            onChange={id => {
              setSelectedVendorId(id);
              setPeriodMode('all');
              setFromDate('');
              setToDate('');
              const now = new Date();
              setCalendarMonth(now.getMonth() + 1);
              setCalendarYear(now.getFullYear());
              setShowAddEntry(false);
              setEditEntry(null);
            }}
          />
        )}
      </Card>

      {selectedVendor && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            <div>
              <h2 className="m-0 text-base font-semibold">{selectedVendor.name}</h2>
              <p className="font-mono text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {selectedVendor.gstin}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditEntry(null);
                  setShowAddEntry(true);
                }}
              >
                <PlusCircle size={16} />
                Entry
              </Button>
              <NilBalanceButton
                vendorId={selectedVendor.id}
                vendorName={selectedVendor.name}
                closingBalance={fullLedger.summary.closing_balance}
                onSuccess={() => refreshEntries()}
              />
              <Button variant="outline" onClick={handlePrint}>
                <Printer size={16} />
                Print
              </Button>
            </div>
          </div>

          <Dialog
            open={showAddEntry || editEntry !== null}
            onClose={() => {
              setShowAddEntry(false);
              setEditEntry(null);
            }}
            title={editEntry ? 'Edit entry' : 'New entry'}
            panelMaxWidthClass="max-w-2xl"
            bodyClassName="max-h-[85vh] overflow-y-auto overscroll-contain"
          >
            <EntryForm
              key={editEntry?.id ?? 'new-entry'}
              vendors={vendors}
              preselectedVendorId={selectedVendorId}
              entryToEdit={editEntry}
              onSuccess={() => {
                refreshEntries();
                setShowAddEntry(false);
                setEditEntry(null);
              }}
            />
          </Dialog>

          <Card className="no-print">
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block">Period</label>
                <div
                  className="inline-flex rounded-lg border p-0.5 gap-0.5"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                  role="group"
                  aria-label="Ledger period"
                >
                  {(
                    [
                      { mode: 'all' as const, label: 'All dates' },
                      { mode: 'month' as const, label: 'Month' },
                      { mode: 'custom' as const, label: 'Custom' },
                    ] as const
                  ).map(({ mode, label }) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPeriodModeAndSync(mode)}
                      className={[
                        'px-3 py-1.5 text-sm font-medium rounded-md border transition-colors',
                        periodMode === mode
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-transparent text-slate-700 border-transparent hover:bg-slate-100',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {periodMode === 'month' && (
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[140px]">
                    <label htmlFor="ledger-month">Month</label>
                    <select
                      id="ledger-month"
                      value={calendarMonth}
                      onChange={e => setCalendarMonth(Number(e.target.value))}
                    >
                      {CALENDAR_MONTHS.map(m => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[100px]">
                    <label htmlFor="ledger-year">Year</label>
                    <select
                      id="ledger-year"
                      value={calendarYear}
                      onChange={e => setCalendarYear(Number(e.target.value))}
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
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[140px]">
                    <label htmlFor="from-date">From</label>
                    <input
                      id="from-date"
                      type="date"
                      value={fromDate}
                      max={toDate || todayISO()}
                      onChange={e => setFromDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label htmlFor="to-date">To</label>
                    <input
                      id="to-date"
                      type="date"
                      value={toDate}
                      min={fromDate}
                      max={todayISO()}
                      onChange={e => setToDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {hasFilter && (
                <div>
                  <Button variant="ghost" onClick={clearFilters} className="shrink-0">
                    <ArrowLeft size={16} />
                    Reset
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {loading ? (
            <p className="m-0 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : (
            <div className="no-print">
              <SummaryCards summary={summary} />
              <LedgerTable
                entries={filteredEntries}
                onRefresh={() => refreshEntries()}
                onEditEntry={e => setEditEntry(e)}
              />
            </div>
          )}

          <PrintableLedger
            vendor={selectedVendor}
            entries={filteredEntries}
            summary={summary}
            fromDate={effectiveRange.from}
            toDate={effectiveRange.to}
          />
        </>
      )}

      {!selectedVendorId && !vendorsLoading && vendors.length > 0 && (
        <p className="m-0 text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>
          Select a vendor to open the account.
        </p>
      )}
    </div>
  );
}
