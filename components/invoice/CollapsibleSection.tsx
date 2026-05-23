'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  optional?: boolean;
  defaultOpen?: boolean;
  compact?: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  optional = false,
  defaultOpen = false,
  compact = false,
  children,
  className = '',
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'w-full flex items-center justify-between gap-2 text-left bg-white hover:bg-slate-50/90 transition-colors border-0 cursor-pointer',
          compact ? 'px-3 py-2 min-h-0' : 'px-4 py-3.5 min-h-[3rem] gap-3',
        ].join(' ')}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span
            className={
              compact
                ? 'font-medium text-xs text-slate-800'
                : 'font-semibold text-sm text-slate-900'
            }
          >
            {title}
          </span>
          {optional && (
            <span className="text-xs font-medium text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/80">
              Optional
            </span>
          )}
        </span>
        <ChevronDown
          size={compact ? 16 : 18}
          className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          className={
            compact
              ? 'px-3 pb-3 pt-0.5 border-t border-slate-100'
              : 'px-4 pb-4 pt-1 border-t border-slate-100'
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}
