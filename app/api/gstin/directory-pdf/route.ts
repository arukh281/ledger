import { gstinDirectoryToPdf } from '@/lib/gstin/gstinDirectoryPdf';
import {
  GSTIN_DIRECTORY_PDF_SCOPES,
  countGstinDirectoryRows,
  type GstinDirectory,
  type GstinDirectoryPdfScope,
} from '@/lib/gstin/types';

export const runtime = 'nodejs';

interface DirectoryPdfBody {
  directory: GstinDirectory;
  scope: GstinDirectoryPdfScope;
  filtered?: boolean;
}

function isGstinRow(row: unknown): row is { name: string; gstin: string; id: string; category: string } {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.name === 'string' &&
    typeof r.gstin === 'string' &&
    typeof r.id === 'string' &&
    typeof r.category === 'string'
  );
}

function isValidBody(body: unknown): body is DirectoryPdfBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (b.filtered !== undefined && typeof b.filtered !== 'boolean') return false;
  if (
    typeof b.scope !== 'string' ||
    !GSTIN_DIRECTORY_PDF_SCOPES.includes(b.scope as GstinDirectoryPdfScope)
  ) {
    return false;
  }
  const dir = b.directory;
  if (!dir || typeof dir !== 'object') return false;
  const d = dir as Record<string, unknown>;
  return (
    Array.isArray(d.customer) &&
    Array.isArray(d.primary) &&
    d.customer.every(isGstinRow) &&
    d.primary.every(isGstinRow)
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

    const total = countGstinDirectoryRows(body.directory, body.scope);

    if (total === 0) {
      return new Response(JSON.stringify({ error: 'No rows to export' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { buffer, downloadName } = await gstinDirectoryToPdf({
      directory: body.directory,
      scope: body.scope,
      filtered: body.filtered,
    });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadName)}"`,
      },
    });
  } catch (e) {
    console.error('GSTIN directory PDF failed:', e);
    return new Response(JSON.stringify({ error: 'PDF generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
