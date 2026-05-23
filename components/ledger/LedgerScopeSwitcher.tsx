'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LedgerScope } from '@/lib/types';
import { SegmentedChoice } from '@/components/ui/SegmentedChoice';

const SCOPE_OPTIONS = [
  { value: 'primary' as const, label: 'Primary' },
  { value: 'secondary' as const, label: 'Secondary' },
];

interface LedgerScopeSwitcherProps {
  scope: LedgerScope;
  className?: string;
}

export function LedgerScopeSwitcher({ scope, className = '' }: LedgerScopeSwitcherProps) {
  const router = useRouter();
  const [pendingScope, setPendingScope] = useState<LedgerScope | null>(null);
  const displayScope = pendingScope ?? scope;

  useEffect(() => {
    setPendingScope(null);
  }, [scope]);

  function onChange(next: LedgerScope) {
    if (next === scope) return;
    setPendingScope(next);
    router.push(next === 'primary' ? '/primary' : '/secondary');
  }

  return (
    <SegmentedChoice
      name="Ledger book"
      options={SCOPE_OPTIONS}
      value={displayScope}
      onChange={onChange}
      className={className}
      compact
    />
  );
}
