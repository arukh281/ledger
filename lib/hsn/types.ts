/** Common GST slabs for catalog lookup (percent, not decimal). */
export const HSN_GST_RATES = [0, 5, 12, 18, 28] as const;

export type HsnGstRate = (typeof HSN_GST_RATES)[number];

export interface HsnCatalogItem {
  id: string;
  item: string;
  hsn: string;
  gst_rate: HsnGstRate | null;
  created_at: string;
  updated_at: string;
}

export interface HsnCatalogPayload {
  item: string;
  hsn: string;
  gst_rate: HsnGstRate | null;
}

export function formatHsnGst(rate: HsnGstRate): string {
  return `${rate}%`;
}

/** Display GST in table/PDF; use em dash when rate is unknown. */
export function formatHsnGstDisplay(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || !isHsnGstRate(rate)) return '—';
  return formatHsnGst(rate);
}

export function isHsnGstRate(value: number): value is HsnGstRate {
  return (HSN_GST_RATES as readonly number[]).includes(value);
}
