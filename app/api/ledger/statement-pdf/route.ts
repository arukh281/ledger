import { ledgerStatementToPdf } from '@/lib/ledger/statementPdf';
import { LedgerEntryWithBalance, LedgerSummary } from '@/lib/types';

export const runtime = 'nodejs';

interface StatementPdfBody {
  vendorName: string;
  vendorIdentifier: string;
  identifierLabel: string;
  entries: LedgerEntryWithBalance[];
  summary: LedgerSummary;
  fromDate: string | null;
  toDate: string | null;
  rangeLabel: string;
}

function isValidBody(body: unknown): body is StatementPdfBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.vendorName === 'string' &&
    typeof b.vendorIdentifier === 'string' &&
    typeof b.identifierLabel === 'string' &&
    Array.isArray(b.entries) &&
    b.summary !== null &&
    typeof b.summary === 'object' &&
    typeof b.rangeLabel === 'string' &&
    (b.fromDate === null || typeof b.fromDate === 'string') &&
    (b.toDate === null || typeof b.toDate === 'string')
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isValidBody(body)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { buffer, downloadName } = await ledgerStatementToPdf(body);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadName)}"`,
      },
    });
  } catch (e) {
    console.error('Ledger statement PDF failed:', e);
    return new Response(JSON.stringify({ error: 'PDF generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
