import { LedgerEntry, Vendor } from './types';

export interface WorkspaceVendorRow {
  id: string;
  name: string;
  identifier: string;
}

export type PeriodMode = 'all' | 'month' | 'custom' | 'financial_year';

export const FINANCIAL_YEAR_MODE_LABEL = 'Financial year';

export interface FinancialYearOption {
  startYear: number;
  from: string;
  to: string;
  label: string;
  shortLabel: string;
}

/** Indian FY: Apr 1 – Mar 31. Returns the calendar year FY starts in (e.g. 2025 for FY 2025–26). */
export function indianFinancialYearStartYearForDate(isoDate: string): number {
  const [y, m] = isoDate.split('-').map(Number);
  if (Number.isNaN(y) || Number.isNaN(m)) return new Date().getFullYear();
  return m >= 4 ? y : y - 1;
}

export function currentIndianFinancialYearStartYear(): number {
  return indianFinancialYearStartYearForDate(new Date().toISOString().slice(0, 10));
}

export function financialYearBounds(startYear: number): { from: string; to: string } {
  return {
    from: `${startYear}-04-01`,
    to: `${startYear + 1}-03-31`,
  };
}

export function formatFinancialYearShortLabel(startYear: number): string {
  const end = (startYear + 1) % 100;
  return `${String(startYear % 100).padStart(2, '0')}-${String(end).padStart(2, '0')}`;
}

export function formatFinancialYearLabel(startYear: number): string {
  const end = (startYear + 1) % 100;
  return `FY ${startYear}–${String(end).padStart(2, '0')}`;
}

export function buildFinancialYearOptions(allEntries: LedgerEntry[]): FinancialYearOption[] {
  const currentFy = currentIndianFinancialYearStartYear();
  let minStart = currentFy - 5;
  for (const e of allEntries) {
    const fy = indianFinancialYearStartYearForDate(e.date);
    if (!Number.isNaN(fy)) minStart = Math.min(minStart, fy);
  }
  const out: FinancialYearOption[] = [];
  for (let y = currentFy; y >= minStart; y--) {
    const { from, to } = financialYearBounds(y);
    out.push({
      startYear: y,
      from,
      to,
      label: formatFinancialYearLabel(y),
      shortLabel: formatFinancialYearShortLabel(y),
    });
  }
  return out;
}

export const CALENDAR_MONTHS: { value: number; label: string }[] = [
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

export function sanitizeForFilename(value: string): string {
  return value
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

export function ledgerStatementDocumentTitle(vendorName: string, rangeLabel: string): string {
  return `${sanitizeForFilename(vendorName)} and ${sanitizeForFilename(rangeLabel)}`;
}

export function ledgerStatementPdfFilename(vendorName: string, rangeLabel: string): string {
  return `${ledgerStatementDocumentTitle(vendorName, rangeLabel)}.pdf`;
}

export function financialYearRangeLabel(startYear: number): string {
  return formatFinancialYearLabel(startYear);
}

export function buildYearOptions(allEntries: LedgerEntry[]): number[] {
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

export function filterVendors(list: WorkspaceVendorRow[], query: string): WorkspaceVendorRow[] {
  const q = query.trim().toLowerCase();
  const t = q.replace(/\s/g, '');
  const filtered =
    q === ''
      ? [...list]
      : list.filter(
          v =>
            v.name.toLowerCase().includes(q) ||
            v.identifier.toLowerCase().includes(t)
        );
  filtered.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return filtered;
}

export function toVendorShape(rows: WorkspaceVendorRow[]): Vendor[] {
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    gstin: r.identifier,
    created_at: '',
    updated_at: '',
  }));
}
