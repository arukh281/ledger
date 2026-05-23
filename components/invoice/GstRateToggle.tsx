'use client';

import type { GstRate } from '@/lib/invoice/types';
import { SegmentedChoice } from '@/components/ui/SegmentedChoice';

const GST_OPTIONS = [
  { value: '5' as const, label: '5%' },
  { value: '18' as const, label: '18%' },
];

interface GstRateToggleProps {
  value: GstRate;
  onChange: (value: GstRate) => void;
  className?: string;
  compact?: boolean;
}

export function GstRateToggle({ value, onChange, className, compact }: GstRateToggleProps) {
  return (
    <SegmentedChoice
      name="GST rate"
      compact={compact}
      className={className ?? (compact ? 'min-w-[5.5rem]' : 'min-w-[7rem]')}
      options={GST_OPTIONS}
      value={String(value) as '5' | '18'}
      onChange={v => onChange(Number(v) as GstRate)}
    />
  );
}
