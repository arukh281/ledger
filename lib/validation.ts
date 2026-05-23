// 2-digit state + 5-letter PAN alpha + 4-digit PAN num + 1 PAN alpha + 1 entity num + Z + 1 checksum
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGSTIN(gstin: string): { valid: boolean; error?: string } {
  const normalized = gstin.trim().toUpperCase();
  if (!normalized) return { valid: false, error: 'GSTIN is required' };
  if (normalized.length !== 15) return { valid: false, error: 'GSTIN must be exactly 15 characters' };
  if (!GSTIN_REGEX.test(normalized)) {
    return { valid: false, error: 'Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)' };
  }
  return { valid: true };
}

export function normalizeGSTIN(gstin: string): string {
  return gstin.trim().toUpperCase();
}

export function validateAmount(value: string | number): { valid: boolean; error?: string } {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num <= 0) return { valid: false, error: 'Amount must be a positive number' };
  if (num > 999999999) return { valid: false, error: 'Amount too large' };
  return { valid: true };
}

export function validateDocNumber(value: string): { valid: boolean; error?: string } {
  if (!value.trim()) return { valid: false, error: 'Invoice / Receipt number is required' };
  return { valid: true };
}

export function validateInvoiceNo(value: string): { valid: boolean; error?: string } {
  if (!value.trim()) return { valid: false, error: 'Invoice number is required' };
  return { valid: true };
}

export function validateVendorName(value: string): { valid: boolean; error?: string } {
  if (!value.trim()) return { valid: false, error: 'Vendor name is required' };
  if (value.trim().length < 2) return { valid: false, error: 'Name must be at least 2 characters' };
  return { valid: true };
}

/** Secondary vendors: ref is free text (any value, including empty). */
export function normalizeRef(ref: string): string {
  return ref.trim();
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** ISO first day of calendar month (month is 1–12). */
export function firstDayOfMonthIso(year: number, month1to12: number): string {
  const m = String(month1to12).padStart(2, '0');
  return `${year}-${m}-01`;
}

/** ISO last day of calendar month (month is 1–12). */
export function lastDayOfMonthIso(year: number, month1to12: number): string {
  const d = new Date(year, month1to12, 0);
  const m = String(month1to12).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${m}-${day}`;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** WinAnsi-safe currency for PDFKit (Helvetica lacks the ₹ glyph U+20B9). */
export function formatINRForPdf(amount: number): string {
  const amountPart = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `Rs. ${amountPart}`;
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}
