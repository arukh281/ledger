import { hsnCatalogToPdf, type HsnCatalogPdfRow } from '@/lib/hsn/hsnCatalogPdf';

export const runtime = 'nodejs';

interface CatalogPdfBody {
  items: HsnCatalogPdfRow[];
  filtered?: boolean;
}

function isValidBody(body: unknown): body is CatalogPdfBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b.items) || b.items.length === 0) return false;
  if (b.filtered !== undefined && typeof b.filtered !== 'boolean') return false;
  return b.items.every(
    row =>
      row &&
      typeof row === 'object' &&
      typeof (row as HsnCatalogPdfRow).item === 'string' &&
      typeof (row as HsnCatalogPdfRow).hsn === 'string' &&
      ((row as HsnCatalogPdfRow).gst_rate === null ||
        typeof (row as HsnCatalogPdfRow).gst_rate === 'number')
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

    const { buffer, downloadName } = await hsnCatalogToPdf({
      items: body.items.map(row => ({
        item: row.item.trim(),
        hsn: row.hsn.trim(),
        gst_rate: row.gst_rate,
      })),
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
    console.error('HSN catalog PDF failed:', e);
    return new Response(JSON.stringify({ error: 'PDF generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
