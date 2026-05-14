'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** If provided, renders action buttons below children */
  actions?: ReactNode;
  /** Max width utility for the panel (default max-w-md) */
  panelMaxWidthClass?: string;
  /** Extra classes on the scrollable body wrapper */
  bodyClassName?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  panelMaxWidthClass = 'max-w-md',
  bodyClassName,
}: DialogProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`relative z-10 w-full ${panelMaxWidthClass} rounded-lg border border-slate-200 shadow-xl bg-white`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-slate-200"
        >
          <h2 id="dialog-title" className="text-base font-semibold m-0 text-slate-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={['px-4 py-4', bodyClassName].filter(Boolean).join(' ')}>{children}</div>

        {/* Footer */}
        {actions && (
          <div
            className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50/80"
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
