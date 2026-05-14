'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Scale } from 'lucide-react';
import { actionNilBalance } from '@/app/actions/ledger';
import { formatINR } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface Props {
  vendorId: string;
  vendorName: string;
  closingBalance: number;
  onSuccess: () => void;
}

export function NilBalanceButton({ vendorId, vendorName, closingBalance, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isZero = closingBalance === 0;

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await actionNilBalance(vendorId);
      if (res.success) {
        toast.success('Balance cleared.');
        setOpen(false);
        onSuccess();
      } else {
        toast.error(res.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={isZero}
        title={isZero ? 'Already zero' : 'Post write-off to zero'}
      >
        <Scale size={16} />
        Write-off
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Write-off balance"
        actions={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} loading={loading}>
              <Scale size={16} />
              Confirm
            </Button>
          </>
        }
      >
        <p className="m-0 text-sm text-slate-600">
          <span className="font-medium text-slate-900">{vendorName}</span>
          {' · '}Closing{' '}
          <span className="font-mono font-medium tabular-nums">{formatINR(closingBalance)}</span>
        </p>
        <p className="mt-2 m-0 text-xs" style={{ color: 'var(--text-muted)' }}>
          {closingBalance > 0
            ? 'Posts a payment for the outstanding amount.'
            : 'Posts an invoice for the credit balance.'}
        </p>
      </Dialog>
    </>
  );
}
