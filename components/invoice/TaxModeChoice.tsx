'use client';

import type { TaxMode } from '@/lib/invoice/types';
import { SegmentedChoice } from '@/components/ui/SegmentedChoice';

interface TaxModeChoiceProps {
  value: TaxMode;
  onChange: (value: TaxMode) => void;
}

export function TaxModeChoice({ value, onChange }: TaxModeChoiceProps) {
  return (
    <SegmentedChoice
      name="Tax type"
      value={value}
      onChange={onChange}
      options={[
        { value: 'igst', label: 'IGST' },
        { value: 'cgst_sgst', label: 'CGST + SGST' },
      ]}
    />
  );
}
