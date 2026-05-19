import { parse } from 'csv-parse/sync';
import PDFDocument from 'pdfkit';
import { assertPdfkitFontsAvailable } from '@/lib/pdfkitSetup';

const INCH = 72;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

interface DayGroup {
  date: string;
  amounts: number[];
  total: number;
}

function formatAmount(amount: number): string {
  if (amount === Math.trunc(amount)) return String(Math.trunc(amount));
  return String(amount);
}

/** Strip UTF-8 BOM and surrounding quotes from CSV cell values. */
function normalizeCell(value: string): string {
  let s = value.replace(/^\uFEFF/, '').trim();
  while (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function columnKey(record: Record<string, string>, name: string): string | undefined {
  const target = name.toLowerCase();
  const key = Object.keys(record).find(k => normalizeCell(k).toLowerCase() === target);
  return key;
}

function parseCsvRows(csvText: string): { date: string; amount: number }[] {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    throw new ValueError('CSV file must contain Transaction_Date and Amount columns');
  }

  const dateKey = columnKey(records[0]!, 'Transaction_Date');
  const amountKey = columnKey(records[0]!, 'Amount');
  if (!dateKey || !amountKey) {
    throw new ValueError("CSV file must contain 'Transaction_Date' and 'Amount' columns");
  }

  const rows: { date: string; amount: number }[] = [];
  for (const row of records) {
    const rawDate = row[dateKey];
    const rawAmount = row[amountKey];
    if (rawDate === undefined || rawAmount === undefined) continue;

    const parsed = new Date(normalizeCell(rawDate));
    if (Number.isNaN(parsed.getTime())) {
      throw new ValueError('Invalid Transaction_Date');
    }
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const date = `${day}/${month}`;

    const amount = Number(normalizeCell(rawAmount));
    if (Number.isNaN(amount)) {
      throw new ValueError('Invalid Amount');
    }

    rows.push({ date, amount });
  }

  return rows;
}

function groupByDate(rows: { date: string; amount: number }[]): DayGroup[] {
  const map = new Map<string, number[]>();
  for (const row of rows) {
    const list = map.get(row.date) ?? [];
    list.push(row.amount);
    map.set(row.date, list);
  }

  const dates = [...map.keys()].sort();
  return dates.map(date => {
    const amounts = map.get(date)!;
    const total = amounts.reduce((a, b) => a + b, 0);
    return { date, amounts, total };
  });
}

function buildDownloadName(grouped: DayGroup[]): string {
  const first = grouped[0]!.date.replace('/', '-');
  const last = grouped[grouped.length - 1]!.date.replace('/', '-');
  return `(${first})-(${last}).pdf`;
}

class ValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValueError';
  }
}

export async function csvToPdf(csvText: string): Promise<{ buffer: Buffer; downloadName: string }> {
  const rows = parseCsvRows(csvText);
  const grouped = groupByDate(rows);
  if (grouped.length === 0) {
    throw new ValueError("CSV file must contain 'Transaction_Date' and 'Amount' columns");
  }

  const downloadName = buildDownloadName(grouped);

  const colWidth = (PAGE_WIDTH - INCH) / 8;
  const xStart = 0.5 * INCH;
  const yStartFromBottom = PAGE_HEIGHT - 0.5 * INCH;
  const bottomMargin = 0.5 * INCH;

  let colIndex = 0;

  assertPdfkitFontsAvailable();
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const endPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  function fromBottom(yFromBottom: number): number {
    return PAGE_HEIGHT - yFromBottom;
  }

  function newPageIfNeeded() {
    doc.addPage({ size: 'A4', margin: 0 });
    colIndex = 0;
  }

  for (const row of grouped) {
    if (colIndex >= 8) {
      newPageIfNeeded();
    }

    let xPosition = xStart + colIndex * colWidth;
    let yFromBottom = yStartFromBottom;

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text(row.date, xPosition, fromBottom(yFromBottom), { lineBreak: false });
    yFromBottom -= 0.25 * INCH;

    doc.font('Helvetica').fontSize(7);
    const amounts = row.amounts;
    for (let i = 0; i < amounts.length; i++) {
      const amount = amounts[i]!;
      doc.text(formatAmount(amount), xPosition + 10, fromBottom(yFromBottom), {
        lineBreak: false,
      });
      yFromBottom -= 0.2 * INCH;

      if (yFromBottom < bottomMargin) {
        colIndex += 1;
        if (colIndex >= 8) {
          newPageIfNeeded();
        }
        xPosition = xStart + colIndex * colWidth;
        yFromBottom = yStartFromBottom;
        if (i !== amounts.length - 1) {
          doc.font('Helvetica').fontSize(7);
        } else {
          doc.font('Helvetica-Bold').fontSize(9);
          doc.text(row.date, xPosition, fromBottom(yFromBottom), { lineBreak: false });
          yFromBottom -= 0.25 * INCH;
          doc.font('Helvetica').fontSize(7);
        }
      }
    }

    doc.font('Helvetica-Bold').fontSize(7);
    doc.text(formatAmount(row.total), xPosition + 10, fromBottom(yFromBottom), {
      lineBreak: false,
    });
    yFromBottom -= 0.35 * INCH;
    colIndex += 1;
  }

  doc.end();
  const buffer = await endPromise;
  return { buffer, downloadName };
}

export { ValueError as PaytmCsvError };
