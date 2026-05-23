export type GstinCategory = 'customer' | 'primary';

export const GSTIN_CATEGORY_ORDER: GstinCategory[] = ['customer', 'primary'];

export const GSTIN_CATEGORY_LABELS: Record<GstinCategory, string> = {
  customer: 'Customer',
  primary: 'Primary',
};

export interface GstinRow {
  id: string;
  category: GstinCategory;
  name: string;
  gstin: string;
}

export interface GstinDirectory {
  customer: GstinRow[];
  primary: GstinRow[];
}

export interface GstinRowPayload {
  name: string;
  gstin: string;
}

export function gstinRowKey(category: GstinCategory, id: string): string {
  return `${category}:${id}`;
}

/** Which GSTIN directory sections to include in a PDF export. */
export type GstinDirectoryPdfScope = 'customer' | 'primary' | 'both';

export const GSTIN_DIRECTORY_PDF_SCOPES: GstinDirectoryPdfScope[] = [
  'customer',
  'primary',
  'both',
];

export function countGstinDirectoryRows(
  directory: GstinDirectory,
  scope: GstinDirectoryPdfScope
): number {
  if (scope === 'customer') return directory.customer.length;
  if (scope === 'primary') return directory.primary.length;
  return directory.customer.length + directory.primary.length;
}

/** PDF scope choices that apply for the current customer/primary counts. */
export function gstinDirectoryPdfScopesForCounts(
  customerCount: number,
  primaryCount: number
): GstinDirectoryPdfScope[] {
  const hasCustomer = customerCount > 0;
  const hasPrimary = primaryCount > 0;
  if (hasCustomer && hasPrimary) return ['customer', 'primary', 'both'];
  if (hasCustomer) return ['customer'];
  if (hasPrimary) return ['primary'];
  return [];
}

export function defaultGstinDirectoryPdfScope(
  customerCount: number,
  primaryCount: number
): GstinDirectoryPdfScope {
  const scopes = gstinDirectoryPdfScopesForCounts(customerCount, primaryCount);
  if (scopes.includes('both')) return 'both';
  return scopes[0] ?? 'both';
}

export function parseGstinRowKey(key: string): { category: GstinCategory; id: string } | null {
  const sep = key.indexOf(':');
  if (sep <= 0) return null;
  const category = key.slice(0, sep) as GstinCategory;
  if (!GSTIN_CATEGORY_ORDER.includes(category)) return null;
  return { category, id: key.slice(sep + 1) };
}
