import { EntryType } from '@/lib/types';

export function TypeBadge({ type }: { type: EntryType }) {
  if (type === 'invoice') {
    return <span className="badge-invoice">Invoice</span>;
  }
  return <span className="badge-payment">Payment</span>;
}
