'use client';

import { Undo2 } from 'lucide-react';
import { useUndo } from '@/components/undo/UndoProvider';

/** Floating undo control — appears after a delete registers undo. */
export function GlobalUndoButton() {
  const { canUndo, undoLabel, undoing, performUndo } = useUndo();

  if (!canUndo && !undoing) return null;

  return (
    <div
      className="no-print fixed z-40 flex flex-col items-start gap-2 pointer-events-none"
      style={{
        bottom: 'max(5.5rem, calc(1.25rem + env(safe-area-inset-bottom)))',
        left: 'max(1rem, env(safe-area-inset-left))',
      }}
    >
      {undoLabel ? (
        <p
          className="pointer-events-none m-0 max-w-[min(16rem,calc(100vw-2rem))] truncate rounded-md px-2.5 py-1 text-xs font-medium shadow-sm"
          style={{
            background: 'var(--surface)',
            color: 'var(--text-muted)',
            boxShadow: 'var(--shadow-surface)',
          }}
          title={undoLabel}
        >
          {undoLabel}
        </p>
      ) : null}
      <button
        type="button"
        disabled={undoing}
        onClick={() => void performUndo()}
        title={undoLabel ? `Undo: ${undoLabel}` : 'Undo last delete'}
        className={[
          'pointer-events-auto flex items-center gap-2 rounded-full border-0 px-4 py-2.5 font-semibold shadow-lg transition-all cursor-pointer',
          'text-[0.8125rem] min-h-[2.75rem]',
          undoing ? 'opacity-80 cursor-wait' : 'hover:brightness-110 active:scale-[0.98]',
        ].join(' ')}
        style={{
          background: 'var(--nav-bg)',
          color: 'var(--nav-active)',
          boxShadow:
            '0 4px 14px rgba(12, 20, 36, 0.2), 0 0 0 1px rgba(12, 20, 36, 0.08)',
        }}
      >
        <Undo2
          size={18}
          strokeWidth={2}
          className={undoing ? 'animate-spin' : undefined}
          aria-hidden
        />
        <span>{undoing ? 'Restoring…' : 'Undo'}</span>
      </button>
    </div>
  );
}
