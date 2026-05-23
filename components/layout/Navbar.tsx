'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, FileText, Hash, IdCard, Wallet } from 'lucide-react';

const links = [
  { href: '/paytm', label: 'Paytm', icon: Wallet },
  { href: '/primary', label: 'Ledger', icon: BookOpen, match: ['/primary', '/secondary'] },
  { href: '/invoice', label: 'Invoice', icon: FileText },
  { href: '/hsn', label: 'HSN', icon: Hash },
  { href: '/gstin', label: 'GSTIN', icon: IdCard },
];

function isActive(pathname: string, href: string, match?: string[]) {
  const paths = match ?? [href];
  return paths.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

export function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav
      className="no-print sticky top-0 z-30 border-b border-white/10"
      style={{ background: 'var(--nav-bg)', color: 'var(--nav-text)' }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-5 flex items-center gap-3 h-14 min-h-[3.5rem]">
        <Link
          href="/primary"
          className="shrink-0 font-semibold tracking-tight no-underline text-[0.9375rem]"
          style={{ color: 'var(--nav-active)' }}
        >
          Tally
        </Link>
        <ul className="flex flex-1 min-w-0 gap-0.5 m-0 p-0 list-none overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden justify-end">
          {links.map(({ href, label, icon: Icon, match }) => {
            const active = mounted && isActive(pathname, href, match);
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-md font-medium transition-colors no-underline min-h-[var(--touch-min)] sm:min-h-[2.25rem]"
                  style={{
                    color: active ? 'var(--nav-active)' : 'var(--nav-text)',
                    background: active ? 'oklch(98% 0.006 250 / 0.12)' : 'transparent',
                    fontSize: '0.8125rem',
                  }}
                >
                  <Icon size={18} strokeWidth={1.75} aria-hidden />
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
