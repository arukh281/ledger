'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  panelMaxWidthClass?: string;
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="absolute inset-0 bg-[oklch(17%_0.025_250/0.45)]" onClick={onClose} aria-hidden />
      <div
        className={`relative z-10 w-full max-h-[min(92dvh,100%)] flex flex-col ${panelMaxWidthClass} rounded-t-xl sm:rounded-lg border shadow-xl overflow-hidden`}
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 id="dialog-title" className="text-base font-semibold m-0">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="icon-btn shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className={['px-4 py-4 overflow-y-auto overscroll-contain min-h-0', bodyClassName].filter(Boolean).join(' ')}>
          {children}
        </div>

        {actions && (
          <div
            className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-4 py-3 border-t shrink-0"
            style={{ borderColor: 'var(--border)', background: 'oklch(97% 0.008 250 / 0.5)' }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
