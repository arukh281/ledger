import PDFDocument from 'pdfkit';
import { assertPdfkitFontsAvailable } from '@/lib/pdfkitSetup';
import {
  GSTIN_CATEGORY_LABELS,
  GSTIN_CATEGORY_ORDER,
  countGstinDirectoryRows,
  type GstinCategory,
  type GstinDirectory,
  type GstinDirectoryPdfScope,
  type GstinRow,
} from '@/lib/gstin/types';

export interface GstinDirectoryPdfInput {
  directory: GstinDirectory;
  scope: GstinDirectoryPdfScope;
  filtered?: boolean;
}

const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ROW_HEIGHT = 14;
const HEADER_ROW_HEIGHT = 18;
const SECTION_GAP = 20;
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

export function gstinDirectoryPdfFilename(
  scope: GstinDirectoryPdfScope,
  filtered: boolean
): string {
  const base =
    scope === 'customer'
      ? 'gstin-customers'
      : scope === 'primary'
        ? 'gstin-primary'
        : 'gstin-directory';
  return filtered ? `${base}-filtered.pdf` : `${base}.pdf`;
}

function categoriesForScope(scope: GstinDirectoryPdfScope): GstinCategory[] {
  if (scope === 'customer') return ['customer'];
  if (scope === 'primary') return ['primary'];
  return GSTIN_CATEGORY_ORDER;
}

export async function gstinDirectoryToPdf(
  input: GstinDirectoryPdfInput
): Promise<{ buffer: Buffer; downloadName: string }> {
  const { directory, scope, filtered = false } = input;
  const downloadName = gstinDirectoryPdfFilename(scope, filtered);
  const total = countGstinDirectoryRows(directory, scope);
  const categories = categoriesForScope(scope);

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

  const colWidths = [CONTENT_WIDTH * 0.55, CONTENT_WIDTH * 0.45];
  const headers = ['Firm name', 'GSTIN'];

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

  function ensureSpace(needed: number, redrawHeader?: () => void) {
    const bottom = doc.page.height - MARGIN;
    if (y + needed > bottom) {
      doc.addPage();
      y = MARGIN;
      redrawHeader?.();
    }
  }

  function drawTableHeader() {
    const top = y;
    doc.rect(MARGIN, top, CONTENT_WIDTH, HEADER_ROW_HEIGHT).fill(C.head);
    headers.forEach((header, i) => {
      const align = i === 1 ? 'right' : 'left';
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

  function drawRows(rows: GstinRow[]) {
    let rowIndex = 0;
    for (const row of rows) {
      const cells = [row.name, row.gstin];
      let maxCellHeight = ROW_HEIGHT;

      cells.forEach((cell, i) => {
        const align = i === 1 ? 'right' : 'left';
        const font = i === 1 ? 'Helvetica-Bold' : 'Helvetica';
        doc.font(font).fontSize(8);
        const h = doc.heightOfString(cell, { width: colWidths[i]! - CELL_PAD * 2, align });
        maxCellHeight = Math.max(maxCellHeight, h);
      });

      const rowHeight = maxCellHeight + CELL_PAD * 2;
      ensureSpace(rowHeight, drawTableHeader);
      const top = y;

      if (rowIndex % 2 === 1) drawRowBorder(top, rowHeight, C.zebra);
      else drawRowBorder(top, rowHeight);

      cells.forEach((cell, i) => {
        const align = i === 1 ? 'right' : 'left';
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
  }

  doc.font('Helvetica-Bold').fontSize(18).fillColor(C.black).text('GSTIN directory', MARGIN, y);
  y += 26;

  doc.font('Helvetica').fontSize(9).fillColor(C.gray);
  const sectionLabel =
    scope === 'customer'
      ? 'Customers'
      : scope === 'primary'
        ? 'Primary'
        : 'Customer & primary';
  const scopeLabel = filtered ? `Filtered · ${sectionLabel}` : sectionLabel;
  doc.text(`${scopeLabel} · ${total} firm${total === 1 ? '' : 's'}`, MARGIN, y);
  y += 22;

  categories.forEach((category: GstinCategory, index) => {
    const rows = directory[category];
    ensureSpace(36);
    if (index > 0) y += SECTION_GAP;

    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.black);
    doc.text(GSTIN_CATEGORY_LABELS[category], MARGIN, y);
    y += 16;

    if (rows.length === 0) {
      doc.font('Helvetica').fontSize(8).fillColor(C.light);
      doc.text('No firms in this category.', MARGIN, y);
      y += 14;
      return;
    }

    drawTableHeader();
    drawRows(rows);
  });

  y += 16;
  ensureSpace(24);
  doc.font('Helvetica').fontSize(8).fillColor(C.light).text(`Generated on ${generatedAt}`, MARGIN, y);

  doc.end();
  const buffer = await endPromise;
  return { buffer, downloadName };
}
