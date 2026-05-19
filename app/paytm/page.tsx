'use client';

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function parseFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return 'file.pdf';
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
  if (!match?.[1]) return 'file.pdf';
  try {
    return decodeURIComponent(match[1].replace(/['"]/g, ''));
  } catch {
    return match[1].replace(/['"]/g, '') || 'file.pdf';
  }
}

export default function PaytmPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please choose a CSV file.');
      return;
    }

    setConverting(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/paytm/csv-to-pdf', { method: 'POST', body: fd });

      if (!res.ok) {
        if (res.status === 400) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(body?.error ?? "CSV must include 'Transaction_Date' and 'Amount' columns.");
        } else {
          setError('Conversion failed. Try again.');
        }
        return;
      }

      const blob = await res.blob();
      const name = parseFilename(res.headers.get('Content-Disposition'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Conversion failed. Check your connection and try again.');
    } finally {
      setConverting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="m-0">Paytm</h1>
        <p className="m-0 mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Upload a Paytm CSV to download the statement PDF.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-4 items-start">
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            id="paytm-csv"
            disabled={converting}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button
            type="button"
            loading={converting}
            onClick={() => inputRef.current?.click()}
            className="gap-2"
          >
            <Upload size={16} />
            {converting ? 'Converting…' : 'Choose CSV file'}
          </Button>
          <p className="m-0 text-xs" style={{ color: 'var(--text-muted)' }}>
            Required columns: <span className="font-mono">Transaction_Date</span>,{' '}
            <span className="font-mono">Amount</span>
          </p>
          {error && (
            <p className="m-0 text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
