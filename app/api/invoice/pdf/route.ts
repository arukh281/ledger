import { createInvoice, getInvoiceById, updateInvoice } from '@/lib/invoiceRepository';
import { invoiceToPdf } from '@/lib/invoice/invoicePdf';
import type { InvoiceFormPayload } from '@/lib/invoice/types';
import {
  normalizeInvoicePayload,
  validateInvoicePayload,
} from '@/lib/invoice/validatePayload';

export const runtime = 'nodejs';

type PdfBody =
  | { invoiceId: string }
  | { payload: InvoiceFormPayload; id?: string };

function isFormPayload(v: unknown): v is InvoiceFormPayload {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return typeof p.invoice_no === 'string' && Array.isArray(p.line_items);
}

function parseBody(body: unknown): PdfBody | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.invoiceId === 'string' && b.invoiceId.length > 0) {
    return { invoiceId: b.invoiceId };
  }
  if (isFormPayload(b.payload)) {
    return {
      payload: b.payload,
      id: typeof b.id === 'string' && b.id.length > 0 ? b.id : undefined,
    };
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const parsed = parseBody(await request.json());
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if ('invoiceId' in parsed) {
      const result = await getInvoiceById(parsed.invoiceId);
      if (!result.success) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: result.error === 'Invoice not found.' ? 404 : 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const { buffer, downloadName } = await invoiceToPdf(result.data);
      return pdfResponse(buffer, downloadName, result.data.id);
    }

    const normalized = normalizeInvoicePayload(parsed.payload);
    const validationError = validateInvoicePayload(normalized);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const saveResult = parsed.id
      ? await updateInvoice(parsed.id, normalized)
      : await createInvoice(normalized);

    if (!saveResult.success) {
      return new Response(JSON.stringify({ error: saveResult.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const invoiceId = saveResult.data.id;
    const { buffer, downloadName } = await invoiceToPdf(saveResult.data);

    return pdfResponse(buffer, downloadName, invoiceId);
  } catch (e) {
    console.error('Invoice PDF failed:', e);
    return new Response(JSON.stringify({ error: 'PDF generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function pdfResponse(buffer: Buffer, downloadName: string, invoiceId: string) {
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadName)}"`,
      'X-Invoice-Id': invoiceId,
      'Cache-Control': 'no-store',
    },
  });
}
