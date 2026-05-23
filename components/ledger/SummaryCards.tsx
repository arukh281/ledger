import { LedgerSummary } from '@/lib/types';
import { formatINR } from '@/lib/validation';

interface Props {
  summary: LedgerSummary;
}

interface StatCardProps {
  label: string;
  value: string;
  printClass?: string;
}

function StatCard({ label, value, printClass = '' }: StatCardProps) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 print-summary-card ${printClass}`}
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <p className="text-xs font-medium m-0 mb-1 text-muted">{label}</p>
      <p className="text-base font-semibold font-mono tabular-nums m-0">{value}</p>
    </div>
  );
}

export function SummaryCards({ summary }: Props) {
  const { opening_balance, total_invoiced, total_paid, closing_balance } = summary;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 print-summary-grid">
      <StatCard label="Opening" value={formatINR(opening_balance)} />
      <StatCard label="Invoiced" value={formatINR(total_invoiced)} />
      <StatCard label="Paid" value={formatINR(total_paid)} />
      <StatCard label="Closing" value={formatINR(closing_balance)} />
    </div>
  );
}
