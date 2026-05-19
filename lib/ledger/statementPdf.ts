import PDFDocument from 'pdfkit';
import { assertPdfkitFontsAvailable } from '@/lib/pdfkitSetup';
import { LedgerEntryWithBalance, LedgerSummary } from '@/lib/types';
import { formatDate, formatINRForPdf } from '@/lib/validation';
import { ledgerStatementPdfFilename } from '@/lib/ledgerWorkspaceUtils';

export interface LedgerStatementPdfInput {
  vendorName: string;
  vendorIdentifier: string;
  identifierLabel: string;
  entries: LedgerEntryWithBalance[];
  summary: LedgerSummary;
  fromDate: string | null;
  toDate: string | null;
  rangeLabel: string;
}

const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ROW_HEIGHT = 16;
const HEADER_ROW_HEIGHT = 18;

function dateRangeLabel(fromDate: string | null, toDate: string | null): string {
  if (fromDate || toDate) {
    return `${fromDate ? formatDate(fromDate) : 'Beginning'} — ${toDate ? formatDate(toDate) : 'Today'}`;
  }
  return 'All dates';
}

function closingBalanceNote(closing: number): string {
  if (closing > 0) return ' (Amount payable to vendor)';
  if (closing < 0) return ' (Amount receivable from vendor)';
  return ' (Nil balance)';
}

export async function ledgerStatementToPdf(
  input: LedgerStatementPdfInput
): Promise<{ buffer: Buffer; downloadName: string }> {
  const {
    vendorName,
    vendorIdentifier,
    identifierLabel,
    entries,
    summary,
    fromDate,
    toDate,
    rangeLabel,
  } = input;

  const downloadName = ledgerStatementPdfFilename(vendorName, rangeLabel);
  const periodLabel = dateRangeLabel(fromDate, toDate);
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

  function ensureSpace(needed: number) {
    const bottom = doc.page.height - MARGIN;
    if (y + needed > bottom) {
      doc.addPage();
      y = MARGIN;
    }
  }

  doc.font('Helvetica-Bold').fontSize(18).text('Account statement', MARGIN, y);
  y += 28;

  doc.font('Helvetica-Bold').fontSize(12).text(vendorName, MARGIN, y, { width: CONTENT_WIDTH * 0.55 });
  doc.font('Helvetica').fontSize(9).fillColor('#555555');
  doc.text('Period:', MARGIN + CONTENT_WIDTH * 0.55, y, { width: CONTENT_WIDTH * 0.45, align: 'right' });
  y += 14;
  doc.font('Helvetica').fontSize(9).fillColor('#333333');
  doc.text(`${identifierLabel}: ${vendorIdentifier || '—'}`, MARGIN, y, { width: CONTENT_WIDTH * 0.55 });
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
  doc.text(periodLabel, MARGIN + CONTENT_WIDTH * 0.55, y, {
    width: CONTENT_WIDTH * 0.45,
    align: 'right',
  });
  y += 24;

  const cardW = (CONTENT_WIDTH - 12) / 4;
  const summaryItems = [
    { label: 'Opening', value: formatINRForPdf(summary.opening_balance) },
    { label: 'Invoiced', value: formatINRForPdf(summary.total_invoiced) },
    { label: 'Paid', value: formatINRForPdf(summary.total_paid) },
    { label: 'Closing', value: formatINRForPdf(summary.closing_balance) },
  ];

  ensureSpace(52);
  summaryItems.forEach((item, i) => {
    const x = MARGIN + i * (cardW + 4);
    doc.rect(x, y, cardW, 44).strokeColor('#cccccc').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7).fillColor('#666666').text(item.label.toUpperCase(), x + 6, y + 6, {
      width: cardW - 12,
    });
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(item.value, x + 6, y + 20, {
      width: cardW - 12,
    });
  });
  y += 56;

  const colWidths = [
    CONTENT_WIDTH * 0.12,
    CONTENT_WIDTH * 0.1,
    CONTENT_WIDTH * 0.18,
    CONTENT_WIDTH * 0.22,
    CONTENT_WIDTH * 0.19,
    CONTENT_WIDTH * 0.19,
  ];
  const headers = ['Date', 'Type', 'Reference no', 'Notes', 'Amount', 'Balance'];

  function drawTableHeader() {
    ensureSpace(HEADER_ROW_HEIGHT + 4);
    let x = MARGIN;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
    headers.forEach((h, i) => {
      const align = i >= 4 ? 'right' : 'left';
      doc.text(h, x + 2, y, { width: colWidths[i]! - 4, align });
      x += colWidths[i]!;
    });
    y += HEADER_ROW_HEIGHT;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).strokeColor('#333333').lineWidth(0.5).stroke();
    y += 4;
  }

  drawTableHeader();

  for (const entry of entries) {
    ensureSpace(ROW_HEIGHT + 4);
    const notes = entry.is_system_generated ? 'Write-off' : entry.notes || '—';
    const cells = [
      formatDate(entry.date),
      entry.type.toUpperCase(),
      entry.doc_number,
      notes,
      formatINRForPdf(entry.amount),
      formatINRForPdf(entry.running_balance),
    ];

    let x = MARGIN;
    const rowY = y;
    let maxCellHeight = ROW_HEIGHT;

    cells.forEach((cell, i) => {
      const align = i >= 4 ? 'right' : 'left';
      const font = i === 5 ? 'Helvetica-Bold' : 'Helvetica';
      const color =
        i === 5
          ? entry.running_balance > 0
            ? '#92400e'
            : entry.running_balance < 0
              ? '#14532d'
              : '#000000'
          : '#000000';
      doc.font(font).fontSize(8).fillColor(color);
      const h = doc.heightOfString(cell, { width: colWidths[i]! - 4, align });
      maxCellHeight = Math.max(maxCellHeight, h);
      doc.text(cell, x + 2, rowY, { width: colWidths[i]! - 4, align });
      x += colWidths[i]!;
    });

    y += maxCellHeight + 4;
  }

  y += 12;
  ensureSpace(60);
  doc.font('Helvetica').fontSize(9).fillColor('#000000');
  doc.text(
    `Closing Balance: ${formatINRForPdf(summary.closing_balance)}${closingBalanceNote(summary.closing_balance)}`,
    MARGIN,
    y,
    { width: CONTENT_WIDTH }
  );
  y += 16;
  doc.font('Helvetica').fontSize(8).fillColor('#333333').text(`Generated on: ${generatedAt}`, MARGIN, y);
  y += 12;
  doc.font('Helvetica').fontSize(7).fillColor('#999999').text(
    'This is a system-generated statement. Please verify with original documents.',
    MARGIN,
    y,
    { width: CONTENT_WIDTH }
  );

  doc.end();
  const buffer = await endPromise;
  return { buffer, downloadName };
}
