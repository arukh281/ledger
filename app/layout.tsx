import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Navbar } from '@/components/layout/Navbar';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'Tally',
  description: 'Vendor accounts and Paytm statements',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ background: 'var(--bg)' }}>
        <Navbar />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">{children}</main>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontSize: '0.875rem',
              fontWeight: '500',
              padding: '10px 14px',
              borderRadius: '6px',
              minWidth: '220px',
            },
            success: { iconTheme: { primary: '#15803d', secondary: '#fff' } },
            error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}
