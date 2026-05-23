'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';

export function ConditionalNavbar() {
  const pathname = usePathname();
  if (pathname === '/login') return null;
  return <Navbar />;
}
