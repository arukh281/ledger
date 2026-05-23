import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { Navbar } from '@/components/layout/Navbar';
import { AppProviders } from '@/components/providers/AppProviders';
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
        <AppProviders>
          <Navbar />
          <main className="flex-1 w-full min-w-0 max-w-5xl mx-auto px-4 py-5 sm:px-5 sm:py-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {children}
          </main>
          <Toaster
            position="bottom-right"
            gutter={12}
            containerStyle={{
              bottom: 'max(1.25rem, env(safe-area-inset-bottom))',
              right: 'max(1rem, env(safe-area-inset-right))',
            }}
            toastOptions={{
              style: {
                fontSize: '0.875rem',
                fontWeight: '500',
                padding: '10px 14px',
                borderRadius: '6px',
                minWidth: '220px',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-surface)',
              },
              success: { iconTheme: { primary: '#15803d', secondary: '#fff' } },
              error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
            }}
          />
        </AppProviders>
      </body>
    </html>
  );
}
