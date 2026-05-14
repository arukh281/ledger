/**
 * PrintableLedger — renders a hidden-on-screen, visible-in-print ledger report.
 * Triggered via window.print() from the parent.
 */

import { Vendor, LedgerEntryWithBalance, LedgerSummary } from '@/lib/types';
import { formatINR, formatDate } from '@/lib/validation';

interface PrintableLedgerProps {
  vendor: Vendor;
  entries: LedgerEntryWithBalance[];
  summary: LedgerSummary;
  fromDate: string | null;
  toDate: string | null;
}

export function PrintableLedger({
  vendor,
  entries,
  summary,
  fromDate,
  toDate,
}: PrintableLedgerProps) {
  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const dateRange =
    fromDate || toDate
      ? `${fromDate ? formatDate(fromDate) : 'Beginning'} — ${toDate ? formatDate(toDate) : 'Today'}`
      : 'All dates';

  return (
    <div className="print-only print-page" aria-hidden="true">
      {/* Header */}
      <div className="print-header">
        <h1 style={{ fontSize: '19pt', margin: 0 }}>Account statement</h1>
        <table style={{ width: '100%', maxWidth: '100%', marginTop: '8pt', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td
                style={{
                  width: '50%',
                  verticalAlign: 'top',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  paddingRight: '6pt',
                  boxSizing: 'border-box',
                }}
              >
                <strong style={{ fontSize: '13pt' }}>{vendor.name}</strong>
                <br />
                <span style={{ fontFamily: 'monospace', fontSize: '9pt' }}>
                  GSTIN: {vendor.gstin}
                </span>
              </td>
              <td
                style={{
                  width: '50%',
                  verticalAlign: 'top',
                  textAlign: 'right',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  paddingLeft: '6pt',
                  boxSizing: 'border-box',
                }}
              >
                <span style={{ fontSize: '9pt', color: '#555' }}>Period:</span>
                <br />
                <strong style={{ fontSize: '10pt' }}>{dateRange}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="print-summary-grid">
        {[
          { label: 'Opening', value: formatINR(summary.opening_balance) },
          { label: 'Invoiced', value: formatINR(summary.total_invoiced) },
          { label: 'Paid', value: formatINR(summary.total_paid) },
          { label: 'Closing', value: formatINR(summary.closing_balance) },
        ].map(({ label, value }) => (
          <div key={label} className="print-summary-card">
            <div style={{ fontSize: '7pt', color: '#666', textTransform: 'uppercase', marginBottom: '2pt' }}>
              {label}
            </div>
            <div style={{ fontSize: '11pt', fontWeight: 700, fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Transactions Table — colgroup caps Notes width (matches on-screen ledger intent) */}
      <table className="print-table" style={{ width: '100%', maxWidth: '100%' }}>
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '22%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '19%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Reference no</th>
            <th>Notes</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
            <th style={{ textAlign: 'right' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(entry => (
            <tr key={entry.id}>
              <td>{formatDate(entry.date)}</td>
              <td style={{ fontWeight: 700, textTransform: 'uppercase' }}>{entry.type}</td>
              <td style={{ fontFamily: 'monospace' }}>{entry.doc_number}</td>
              <td>{entry.is_system_generated ? 'Write-off' : entry.notes || '—'}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatINR(entry.amount)}</td>
              <td
                style={{
                  textAlign: 'right',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color:
                    entry.running_balance > 0
                      ? '#92400e'
                      : entry.running_balance < 0
                      ? '#14532d'
                      : '#000',
                }}
              >
                {formatINR(entry.running_balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div className="print-footer">
        <p>
          Closing Balance:{' '}
          <strong style={{ fontFamily: 'monospace' }}>
            {formatINR(summary.closing_balance)}
          </strong>
          {summary.closing_balance > 0 && ' (Amount payable to vendor)'}
          {summary.closing_balance < 0 && ' (Amount receivable from vendor)'}
          {summary.closing_balance === 0 && ' (Nil balance)'}
        </p>
        <p style={{ marginTop: '4pt' }}>Printed on: {printDate}</p>
        <p style={{ marginTop: '2pt', fontSize: '7pt', color: '#999' }}>
          This is a system-generated statement. Please verify with original documents.
        </p>
      </div>
    </div>
  );
}
