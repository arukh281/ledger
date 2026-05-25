'use client';

import { Undo2 } from 'lucide-react';
import { useUndo } from '@/components/undo/UndoProvider';

/** Floating undo control — appears after a delete registers undo. */
export function GlobalUndoButton() {
  const { canUndo, undoLabel, undoing, performUndo } = useUndo();

  if (!canUndo && !undoing) return null;

  return (
    <div
      className="no-print fixed inset-x-0 z-40 px-4 sm:px-5 pointer-events-none"
      style={{
        bottom: 'max(1rem, calc(0.75rem + env(safe-area-inset-bottom)))',
      }}
    >
      <div className="mx-auto flex max-w-5xl justify-start">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={undoing}
            onClick={() => void performUndo()}
            title={undoLabel ? `Undo: ${undoLabel}` : 'Undo last delete'}
            className={[
              'pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full border px-3 py-2 font-semibold transition-all cursor-pointer',
              'text-xs min-h-[2.5rem] shadow-[var(--shadow-surface)]',
              undoing
                ? 'opacity-80 cursor-wait'
                : 'hover:bg-[oklch(97%_0.008_250)] active:scale-[0.98]',
            ].join(' ')}
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <Undo2
              size={16}
              strokeWidth={2}
              className={undoing ? 'animate-spin' : undefined}
              aria-hidden
            />
            <span className="hidden sm:inline">{undoing ? 'Restoring...' : 'Undo'}</span>
            <span className="sr-only sm:hidden">{undoing ? 'Restoring...' : 'Undo'}</span>
          </button>
          {undoLabel ? (
            <p
              className="pointer-events-none hidden sm:block m-0 max-w-[12rem] truncate rounded-full border px-3 py-1.5 text-[0.6875rem] font-medium"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
                boxShadow: 'var(--shadow-surface)',
              }}
              title={undoLabel}
            >
              {undoLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
