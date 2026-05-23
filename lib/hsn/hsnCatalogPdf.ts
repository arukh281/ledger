import PDFDocument from 'pdfkit';
import { formatHsnGstDisplay } from '@/lib/hsn/types';
import { assertPdfkitFontsAvailable } from '@/lib/pdfkitSetup';

export interface HsnCatalogPdfRow {
  item: string;
  hsn: string;
  gst_rate: number | null;
}

export interface HsnCatalogPdfInput {
  items: HsnCatalogPdfRow[];
  filtered?: boolean;
}

const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ROW_HEIGHT = 14;
const HEADER_ROW_HEIGHT = 18;
const CELL_PAD = 4;

const C = {
  black: '#111827',
  gray: '#555555',
  light: '#666666',
  line: '#d1d5db',
  head: '#1e293b',
  headText: '#ffffff',
  zebra: '#f9fafb',
};

export function hsnCatalogPdfFilename(filtered: boolean): string {
  const date = new Date().toISOString().slice(0, 10);
  return filtered ? `hsn-catalog-${date}-filtered.pdf` : `hsn-catalog-${date}.pdf`;
}

export async function hsnCatalogToPdf(
  input: HsnCatalogPdfInput
): Promise<{ buffer: Buffer; downloadName: string }> {
  const { items, filtered = false } = input;
  const downloadName = hsnCatalogPdfFilename(filtered);

  const generatedAt = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  assertPdfkitFontsAvailable();
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const endPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  let y = MARGIN;

  const colWidths = [CONTENT_WIDTH * 0.62, CONTENT_WIDTH * 0.22, CONTENT_WIDTH * 0.16];
  const headers = ['Item', 'HSN', 'GST'];

  function colX(index: number): number {
    let x = MARGIN;
    for (let i = 0; i < index; i++) x += colWidths[i]!;
    return x;
  }

  function drawRowBorder(top: number, height: number, fill?: string) {
    if (fill) doc.rect(MARGIN, top, CONTENT_WIDTH, height).fill(fill);
    doc.rect(MARGIN, top, CONTENT_WIDTH, height).strokeColor(C.line).lineWidth(0.5).stroke();
    let x = MARGIN;
    for (let i = 0; i < headers.length - 1; i++) {
      x += colWidths[i]!;
      doc.moveTo(x, top).lineTo(x, top + height).strokeColor(C.line).lineWidth(0.5).stroke();
    }
  }

  function ensureSpace(needed: number) {
    const bottom = doc.page.height - MARGIN;
    if (y + needed > bottom) {
      doc.addPage();
      y = MARGIN;
      drawTableHeader();
    }
  }

  function drawTableHeader() {
    const top = y;
    doc.rect(MARGIN, top, CONTENT_WIDTH, HEADER_ROW_HEIGHT).fill(C.head);
    headers.forEach((header, i) => {
      const align = i === 0 ? 'left' : 'right';
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(C.headText)
        .text(header, colX(i) + CELL_PAD, top + 5, {
          width: colWidths[i]! - CELL_PAD * 2,
          align,
        });
    });
    doc.rect(MARGIN, top, CONTENT_WIDTH, HEADER_ROW_HEIGHT).strokeColor(C.head).lineWidth(0.5).stroke();
    y = top + HEADER_ROW_HEIGHT;
  }

  doc.font('Helvetica-Bold').fontSize(18).fillColor(C.black).text('HSN catalog', MARGIN, y);
  y += 26;

  doc.font('Helvetica').fontSize(9).fillColor(C.gray);
  const scopeLabel = filtered ? 'Filtered list' : 'Full catalog';
  doc.text(`${scopeLabel} · ${items.length} item${items.length === 1 ? '' : 's'}`, MARGIN, y);
  y += 22;

  drawTableHeader();

  let rowIndex = 0;
  for (const row of items) {
    const cells = [row.item, row.hsn, formatHsnGstDisplay(row.gst_rate)];
    let maxCellHeight = ROW_HEIGHT;

    cells.forEach((cell, i) => {
      const align = i === 0 ? 'left' : 'right';
      const font = i === 1 ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(font).fontSize(8);
      const h = doc.heightOfString(cell, { width: colWidths[i]! - CELL_PAD * 2, align });
      maxCellHeight = Math.max(maxCellHeight, h);
    });

    const rowHeight = maxCellHeight + CELL_PAD * 2;
    ensureSpace(rowHeight);
    const top = y;

    if (rowIndex % 2 === 1) drawRowBorder(top, rowHeight, C.zebra);
    else drawRowBorder(top, rowHeight);

    cells.forEach((cell, i) => {
      const align = i === 0 ? 'left' : 'right';
      const font = i === 1 ? 'Helvetica-Bold' : 'Helvetica';
      doc
        .font(font)
        .fontSize(8)
        .fillColor(C.black)
        .text(cell, colX(i) + CELL_PAD, top + CELL_PAD, {
          width: colWidths[i]! - CELL_PAD * 2,
          align,
        });
    });

    y += rowHeight;
    rowIndex += 1;
  }

  y += 16;
  ensureSpace(24);
  doc.font('Helvetica').fontSize(8).fillColor(C.light).text(`Generated on ${generatedAt}`, MARGIN, y);

  doc.end();
  const buffer = await endPromise;
  return { buffer, downloadName };
}
