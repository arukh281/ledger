'use client';

import { ReactNode } from 'react';
import { GlobalUndoButton } from '@/components/undo/GlobalUndoButton';
import { UndoProvider } from '@/components/undo/UndoProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UndoProvider>
      {children}
      <GlobalUndoButton />
    </UndoProvider>
  );
}
