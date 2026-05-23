import PDFDocument from 'pdfkit';
import { assertPdfkitFontsAvailable } from '@/lib/pdfkitSetup';
import { computeInvoiceTotals, amountForGstColumn } from '@/lib/invoice/calculations';
import { INVOICE_SELLER } from '@/lib/invoice/seller';
import type { GstRate, InvoiceWithLines, TaxMode } from '@/lib/invoice/types';

const MARGIN = 44;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;
/** Reserved band at bottom of page (inside PDFKit margins) for footer line + text. */
const FOOTER_ZONE = 26;

const C = {
  black: '#111827',
  gray: '#4b5563',
  light: '#9ca3af',
  line: '#d1d5db',
  head: '#1e293b',
  headText: '#ffffff',
  zebra: '#f9fafb',
  box: '#f8fafc',
};

function formatPdfDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  return d
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    .toUpperCase();
}

function fmt(n: number, dashZero = true): string {
  if (dashZero && n === 0) return '–';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function hasShipTo(inv: InvoiceWithLines): boolean {
  return Boolean(inv.ship_to_company?.trim() || inv.ship_to_address?.trim());
}

function resolveTaxMode(invoice: InvoiceWithLines): TaxMode {
  return invoice.tax_mode === 'cgst_sgst' ? 'cgst_sgst' : 'igst';
}

export function invoicePdfFilename(invoiceNo: string): string {
  const safe = invoiceNo.replace(/[^\w.-]+/g, '_').slice(0, 40);
  return `invoice-${safe || 'draft'}.pdf`;
}

export async function invoiceToPdf(
  invoice: InvoiceWithLines
): Promise<{ buffer: Buffer; downloadName: string }> {
  const downloadName = invoicePdfFilename(invoice.invoice_no);
  const taxMode = resolveTaxMode(invoice);
  const totals = computeInvoiceTotals(invoice.line_items, taxMode);
  const showShip = hasShipTo(invoice);
  const show5 = totals.subtotal_5 > 0;
  const show18 = totals.subtotal_18 > 0;

  assertPdfkitFontsAvailable();
  const doc = new PDFDocument({ size: 'A4', margin: MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  let y = MARGIN;
  let tableHeaderFn: (() => void) | null = null;

  /** Max Y for body content — footer is stamped above the bottom margin. */
  const pageBottom = () => PAGE_H - MARGIN - FOOTER_ZONE;
  const footerLineY = PAGE_H - MARGIN - 18;
  const footerTextY = PAGE_H - MARGIN - 8;

  function hr(yPos: number, weight = 0.5) {
    doc
      .moveTo(MARGIN, yPos)
      .lineTo(MARGIN + CONTENT_W, yPos)
      .strokeColor(C.line)
      .lineWidth(weight)
      .stroke();
  }

  function ensureSpace(needed: number, onNewPage?: () => void) {
    if (y + needed > pageBottom()) {
      doc.addPage();
      y = MARGIN;
      onNewPage?.();
    }
  }

  const taxColW = show5 && show18 ? 72 : 88;
  const fixedW = 36 + 52 + 44 + 52 + (show5 ? taxColW : 0) + (show18 ? taxColW : 0);
  const descW = CONTENT_W - fixedW;

  const colList = [
    { key: 'sno', w: 36, label: 'S. NO', align: 'left' as const },
    { key: 'desc', w: descW, label: 'DESCRIPTION', align: 'left' as const },
    { key: 'hsn', w: 52, label: 'HSN CODE', align: 'left' as const },
    { key: 'qty', w: 44, label: 'QTY', align: 'right' as const },
    { key: 'rate', w: 52, label: 'RATE', align: 'right' as const },
  ];
  if (show5) colList.push({ key: 't5', w: taxColW, label: '5% AMT', align: 'right' as const });
  if (show18) colList.push({ key: 't18', w: taxColW, label: '18% AMT', align: 'right' as const });

  const tableW = CONTENT_W;
  const labelColW = 36 + descW + 52 + 44 + 52;

  function colX(index: number): number {
    let x = MARGIN;
    for (let i = 0; i < index; i++) x += colList[i]!.w;
    return x;
  }

  function drawRowBorder(top: number, height: number, fill?: string) {
    if (fill) doc.rect(MARGIN, top, tableW, height).fill(fill);
    doc.rect(MARGIN, top, tableW, height).strokeColor(C.line).lineWidth(0.5).stroke();
    let x = MARGIN;
    for (let i = 0; i < colList.length - 1; i++) {
      x += colList[i]!.w;
      doc.moveTo(x, top).lineTo(x, top + height).strokeColor(C.line).lineWidth(0.5).stroke();
    }
  }

  function drawTableHeader() {
    const h = 18;
    const top = y;
    doc.rect(MARGIN, top, tableW, h).fill(C.head);
    let x = MARGIN;
    colList.forEach(col => {
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor(C.headText)
        .text(col.label, x + 4, top + 5, { width: col.w - 8, align: col.align });
      x += col.w;
    });
    doc.rect(MARGIN, top, tableW, h).strokeColor(C.head).lineWidth(0.5).stroke();
    y = top + h;
  }

  tableHeaderFn = drawTableHeader;

  function drawTaxCols(row: { v5?: string; v18?: string }, top: number, h: number, bold = false) {
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(7.5)
      .fillColor(C.black);
    let taxIdx = colList.findIndex(c => c.key === 't5');
    if (show5 && row.v5 !== undefined && taxIdx >= 0) {
      doc.text(row.v5, colX(taxIdx) + 4, top + 5, {
        width: colList[taxIdx]!.w - 8,
        align: 'right',
      });
    }
    taxIdx = colList.findIndex(c => c.key === 't18');
    if (show18 && row.v18 !== undefined && taxIdx >= 0) {
      doc.text(row.v18, colX(taxIdx) + 4, top + 5, {
        width: colList[taxIdx]!.w - 8,
        align: 'right',
      });
    }
  }

  // ── Header (compact) ──
  doc.font('Helvetica-Bold').fontSize(15).fillColor(C.black);
  doc.text(INVOICE_SELLER.name, MARGIN, y, { width: CONTENT_W * 0.55 });
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.head);
  doc.text('TAX INVOICE', MARGIN + CONTENT_W * 0.55, y + 1, {
    width: CONTENT_W * 0.45,
    align: 'right',
  });
  y += 18;

  const metaX = MARGIN + CONTENT_W * 0.55;
  const metaW = CONTENT_W * 0.45;
  doc.font('Helvetica').fontSize(7.5).fillColor(C.gray);
  doc.text(INVOICE_SELLER.addressLine1, MARGIN, y, { width: CONTENT_W * 0.55 });
  doc.text(`DATE: ${formatPdfDate(invoice.invoice_date)}`, metaX, y, { width: metaW, align: 'right' });
  y += 10;
  doc.text(`${INVOICE_SELLER.city} · PIN ${INVOICE_SELLER.pin}`, MARGIN, y, { width: CONTENT_W * 0.55 });
  doc.text(`INVOICE NO: ${invoice.invoice_no}`, metaX, y, { width: metaW, align: 'right' });
  y += 10;
  doc.text(`Mob ${INVOICE_SELLER.mobile} · ${INVOICE_SELLER.email}`, MARGIN, y, {
    width: CONTENT_W * 0.55,
  });
  y += 10;
  doc.text(`GSTIN: ${INVOICE_SELLER.gstin}`, MARGIN, y);
  doc.text(
    taxMode === 'igst' ? 'Supply: Inter-state (IGST)' : 'Supply: Intra-state (CGST+SGST)',
    metaX,
    y,
    { width: metaW, align: 'right' }
  );
  y += 12;
  hr(y);
  y += 10;

  // ── Bill / Ship (dynamic height) ──
  const partyW = showShip ? (CONTENT_W - 10) / 2 : CONTENT_W;

  function drawPartyBox(
    x: number,
    title: string,
    company: string,
    address: string,
    extras: string[]
  ): number {
    const innerW = partyW - 16;
    let contentH = 14 + 12;
    contentH += doc.heightOfString(company || '—', { width: innerW });
    contentH += doc.heightOfString(address || '—', { width: innerW }) + 4;
    extras.forEach(line => {
      contentH += doc.heightOfString(line, { width: innerW }) + 2;
    });
    const boxH = Math.max(48, contentH + 12);

    doc.rect(x, y, partyW, boxH).fill(C.box).strokeColor(C.line).lineWidth(0.5).stroke();
    let py = y + 8;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.head).text(title, x + 8, py);
    py += 12;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.black).text(company || '—', x + 8, py, {
      width: innerW,
    });
    py += 11;
    doc.font('Helvetica').fontSize(7.5).fillColor(C.gray).text(address || '—', x + 8, py, {
      width: innerW,
    });
    py += doc.heightOfString(address || '—', { width: innerW }) + 3;
    extras.forEach(line => {
      doc.font('Helvetica').fontSize(7.5).fillColor(C.gray).text(line, x + 8, py, { width: innerW });
      py += 9;
    });
    return boxH;
  }

  const billExtras: string[] = [];
  if (invoice.bill_to_pin) billExtras.push(`PIN: ${invoice.bill_to_pin}`);
  if (invoice.bill_to_po?.trim()) billExtras.push(`PO: ${invoice.bill_to_po}`);
  if (invoice.bill_to_gstin) billExtras.push(`GSTIN: ${invoice.bill_to_gstin}`);

  const billH = drawPartyBox(MARGIN, 'BILL TO', invoice.bill_to_company, invoice.bill_to_address, billExtras);
  const shipH = showShip
    ? drawPartyBox(
        MARGIN + partyW + 10,
        'SHIP TO',
        invoice.ship_to_company,
        invoice.ship_to_address,
        []
      )
    : 0;

  y += Math.max(billH, shipH) + 10;

  // ── Line items ──
  drawTableHeader();

  invoice.line_items.forEach((line, idx) => {
    const { col5, col18 } = amountForGstColumn(line.line_amount, line.gst_rate as GstRate);
    const rowH = 17;
    ensureSpace(rowH + 2, () => tableHeaderFn?.());

    const top = y;
    if (idx % 2 === 1) drawRowBorder(top, rowH, C.zebra);
    else drawRowBorder(top, rowH);

    const values: Record<string, string> = {
      sno: line.serial_no,
      desc: line.description,
      hsn: line.hsn_code || '–',
      qty: fmt(line.quantity, false),
      rate: fmt(line.rate, false),
      t5: fmt(col5),
      t18: fmt(col18),
    };

    colList.forEach((col, i) => {
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(C.black)
        .text(values[col.key] ?? '', colX(i) + 4, top + 4, {
          width: col.w - 8,
          align: col.align,
          lineBreak: false,
        });
    });
    y += rowH;
  });

  y += 4;

  // ── Totals ──
  type TotalRow = { label: string; v5?: string; v18?: string; bold?: boolean };

  const totalRows: TotalRow[] = [
    {
      label: 'Subtotal (before tax)',
      v5: fmt(totals.subtotal_5),
      v18: fmt(totals.subtotal_18),
      bold: true,
    },
  ];

  if (taxMode === 'igst') {
    totalRows.push({ label: 'IGST rate', v5: '5%', v18: '18%' });
    totalRows.push({
      label: 'IGST amount',
      v5: fmt(totals.igst_5),
      v18: fmt(totals.igst_18),
    });
  } else {
    totalRows.push({ label: 'CGST rate', v5: '2.5%', v18: '9%' });
    totalRows.push({
      label: 'CGST amount',
      v5: fmt(totals.cgst_5),
      v18: fmt(totals.cgst_18),
    });
    totalRows.push({ label: 'SGST rate', v5: '2.5%', v18: '9%' });
    totalRows.push({
      label: 'SGST amount',
      v5: fmt(totals.sgst_5),
      v18: fmt(totals.sgst_18),
    });
  }

  totalRows.push({
    label: 'Total (incl. tax)',
    v5: fmt(totals.total_after_tax_5),
    v18: fmt(totals.total_after_tax_18),
    bold: true,
  });

  const totalsBlockH = totalRows.length * 18 + 6;
  ensureSpace(totalsBlockH + 8);

  totalRows.forEach(row => {
    const h = 17;
    const top = y;
    doc
      .rect(MARGIN, top, tableW, h)
      .fill(row.bold ? C.box : '#ffffff')
      .strokeColor(C.line)
      .lineWidth(0.5)
      .stroke();
    doc
      .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(7.5)
      .fillColor(C.black)
      .text(row.label, MARGIN + 6, top + 4, { width: labelColW - 12, align: 'right' });
    drawTaxCols(row, top, h, row.bold);
    y += h;
  });

  y += 4;
  const grandH = 22;
  ensureSpace(grandH + 8);
  doc.rect(MARGIN, y, tableW, grandH).fill(C.head);
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor(C.headText)
    .text('GRAND TOTAL', MARGIN + 8, y + 6, { width: labelColW - 16, align: 'right' });
  const taxStartIdx = colList.findIndex(c => c.key === 't5' || c.key === 't18');
  const grandX = taxStartIdx >= 0 ? colX(taxStartIdx) : MARGIN + labelColW;
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(C.headText)
    .text(`Rs. ${fmt(totals.grand_total, false)}`, grandX, y + 5, {
      width: tableW - (grandX - MARGIN) - 8,
      align: 'right',
    });
  y += grandH + 8;

  const wordsH = Math.max(22, doc.heightOfString(invoice.amount_in_words, { width: tableW - 16 }) + 14);
  ensureSpace(wordsH + 8);
  doc.rect(MARGIN, y, tableW, wordsH).fill(C.box).strokeColor(C.line).lineWidth(0.5).stroke();
  doc.font('Helvetica-Bold').fontSize(7).fillColor(C.gray).text('Amount in words', MARGIN + 8, y + 4);
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(C.black)
    .text(invoice.amount_in_words, MARGIN + 8, y + 13, { width: tableW - 16 });
  y += wordsH + 6;

  if (invoice.transport_detail?.trim()) {
    ensureSpace(14);
    doc.font('Helvetica').fontSize(7.5).fillColor(C.gray).text('Transport:', MARGIN, y);
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(C.black)
      .text(invoice.transport_detail, MARGIN + 48, y);
    y += 14;
  }

  // ── Signature (flows after content, no forced page break) ──
  const sigW = CONTENT_W * 0.4;
  const sigX = MARGIN + CONTENT_W - sigW;
  const stampH = 52;
  const sigLabelsH = 28;
  const sigBlockH = stampH + sigLabelsH + 8;

  if (y + sigBlockH > pageBottom()) {
    doc.addPage();
    y = MARGIN;
  }

  y += 6;
  const sigTop = y;
  doc
    .rect(sigX, sigTop, sigW, stampH)
    .dash(3, { space: 2 })
    .strokeColor(C.line)
    .lineWidth(0.5)
    .stroke()
    .undash();
  doc
    .font('Helvetica')
    .fontSize(7)
    .fillColor(C.light)
    .text('Stamp & signature', sigX, sigTop + stampH / 2 - 3, { width: sigW, align: 'center' });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(C.gray)
    .text(`For ${INVOICE_SELLER.name}`, sigX, sigTop + stampH + 8, { width: sigW, align: 'right' });
  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor(C.black)
    .text('Authorised Signatory', sigX, sigTop + stampH + 18, { width: sigW, align: 'right' });
  y = sigTop + sigBlockH;

  // ── Footers (must stay inside margins or PDFKit adds a blank page) ──
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  const footerLabel = `${INVOICE_SELLER.name}  ·  GSTIN ${INVOICE_SELLER.gstin}`;

  for (let i = 0; i < totalPages; i++) {
    const pageIndex = range.start + i;
    doc.switchToPage(pageIndex);
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc.save();
    doc
      .moveTo(MARGIN, footerLineY)
      .lineTo(MARGIN + CONTENT_W, footerLineY)
      .strokeColor(C.line)
      .lineWidth(0.5)
      .stroke();
    doc.font('Helvetica').fontSize(6.5).fillColor(C.light);
    doc.text(`${footerLabel}  ·  Page ${i + 1} of ${totalPages}`, MARGIN, footerTextY, {
      width: CONTENT_W,
      align: 'center',
      lineBreak: false,
    });
    doc.restore();

    doc.page.margins.bottom = savedBottom;
  }

  doc.end();
  const pdfBuffer = await bufferPromise;
  return { buffer: pdfBuffer, downloadName };
}
