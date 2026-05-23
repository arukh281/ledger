'use client';

import { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  /** Shown below the description. Defaults to undo hint when omitted. */
  hint?: 'undo' | 'permanent' | null;
}

export function ConfirmDeleteDialog({
  open,
  onClose,
  title,
  children,
  onConfirm,
  loading = false,
  hint = 'undo',
}: ConfirmDeleteDialogProps) {
  const hintText =
    hint === 'permanent'
      ? 'This cannot be undone.'
      : hint === 'undo'
        ? 'You can bring it back with Undo.'
        : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void onConfirm()} loading={loading}>
            <Trash2 size={16} />
            Delete
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <div className="text-sm text-muted">{children}</div>
        {hintText ? <p className="m-0 text-xs text-muted">{hintText}</p> : null}
      </div>
    </Dialog>
  );
}
