'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Users } from 'lucide-react';

const links = [
  { href: '/ledger', label: 'Ledger', icon: BookOpen },
  { href: '/vendors', label: 'Vendors', icon: Users },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      style={{ background: 'var(--nav-bg)', color: 'var(--nav-text)' }}
      className="no-print"
    >
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <Link
          href="/ledger"
          className="font-semibold tracking-tight no-underline"
          style={{
            fontSize: '0.9375rem',
            color: 'var(--nav-text)',
          }}
        >
          Ledger
        </Link>
        <ul className="flex gap-0.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md font-medium transition-colors no-underline"
                  style={{
                    color: active ? 'var(--nav-active)' : 'var(--nav-text)',
                    background: active ? 'rgba(248,250,252,0.08)' : 'transparent',
                    fontSize: '0.8125rem',
                    minHeight: '2.25rem',
                  }}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
