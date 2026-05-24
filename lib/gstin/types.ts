export type GstinCategory = 'customer' | 'party';

export const GSTIN_CATEGORY_ORDER: GstinCategory[] = ['customer', 'party'];

export const GSTIN_CATEGORY_LABELS: Record<GstinCategory, string> = {
  customer: 'Customer',
  party: 'Party',
};

export interface GstinRow {
  id: string;
  category: GstinCategory;
  name: string;
  gstin: string;
}

export interface GstinDirectory {
  customer: GstinRow[];
  party: GstinRow[];
}

export interface GstinRowPayload {
  name: string;
  gstin: string;
}

export function gstinRowKey(category: GstinCategory, id: string): string {
  return `${category}:${id}`;
}

/** Which GSTIN directory sections to include in a PDF export. */
export type GstinDirectoryPdfScope = 'customer' | 'party' | 'both';

export const GSTIN_DIRECTORY_PDF_SCOPES: GstinDirectoryPdfScope[] = [
  'customer',
  'party',
  'both',
];

export function countGstinDirectoryRows(
  directory: GstinDirectory,
  scope: GstinDirectoryPdfScope
): number {
  if (scope === 'customer') return directory.customer.length;
  if (scope === 'party') return directory.party.length;
  return directory.customer.length + directory.party.length;
}

/** PDF scope choices that apply for the current customer/party counts. */
export function gstinDirectoryPdfScopesForCounts(
  customerCount: number,
  partyCount: number
): GstinDirectoryPdfScope[] {
  const hasCustomer = customerCount > 0;
  const hasParty = partyCount > 0;
  if (hasCustomer && hasParty) return ['customer', 'party', 'both'];
  if (hasCustomer) return ['customer'];
  if (hasParty) return ['party'];
  return [];
}

export function defaultGstinDirectoryPdfScope(
  customerCount: number,
  partyCount: number
): GstinDirectoryPdfScope {
  const scopes = gstinDirectoryPdfScopesForCounts(customerCount, partyCount);
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
