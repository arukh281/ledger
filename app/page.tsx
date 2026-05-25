import Link from 'next/link';
import { BookOpen, FileText, Hash, IdCard, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const services: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/paytm', label: 'Paytm', icon: Wallet },
  { href: '/party', label: 'Ledger', icon: BookOpen },
  { href: '/invoice', label: 'Invoice', icon: FileText },
  { href: '/hsn', label: 'HSN', icon: Hash },
  { href: '/gstin', label: 'GSTIN', icon: IdCard },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] py-6">
      <h1 className="text-2xl font-semibold tracking-tight mb-8">Tally</h1>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md m-0 p-0 list-none">
        {services.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border p-5 no-underline min-h-[var(--touch-min)] transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-surface)',
              }}
            >
              <Icon size={28} strokeWidth={1.75} style={{ color: 'var(--primary)' }} aria-hidden />
              <span className="font-medium text-sm">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
