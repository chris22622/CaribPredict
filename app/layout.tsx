import type { Metadata, Viewport } from 'next';
import './globals.css';
import LayoutClient from './layout-client';
import { Toaster } from 'sonner';
import { Wordmark } from '@/components/cp/Icon';

export const metadata: Metadata = {
  title: 'CaribPredict — Caribbean Prediction Markets',
  description: 'Predict and trade on Caribbean events across all 15 CARICOM nations. Deposit with Bitcoin Lightning, trade shares on real outcomes, and earn sats.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://www.caribpredict.com'),
  openGraph: {
    title: 'CaribPredict — Caribbean Prediction Markets',
    description: 'Trade on the outcomes of real events across the Caribbean. Deposit with Bitcoin, earn sats.',
    url: 'https://www.caribpredict.com',
    siteName: 'CaribPredict',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CaribPredict — Caribbean Prediction Markets',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CaribPredict — Caribbean Prediction Markets',
    description: 'Trade on the outcomes of real events across the Caribbean. Deposit with Bitcoin, earn sats.',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CaribPredict',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0B1F2E',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="cp-paper antialiased">
        <Toaster position="top-center" richColors closeButton />
        <LayoutClient>
          <main style={{ minHeight: 'calc(100vh - 200px)' }}>
            {children}
          </main>
        </LayoutClient>

        <footer style={{
          marginTop: 60, padding: '24px 28px', borderTop: '1px solid var(--cp-line)',
          color: 'var(--cp-text-3)', fontSize: 12,
        }}>
          <div style={{
            maxWidth: 1400, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <Wordmark size={18} color="var(--cp-text-2)"/>
              <span>· Kingston, Port of Spain, Bridgetown · est 2026</span>
            </div>
            <div style={{ display: 'inline-flex', gap: 16 }}>
              <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Markets</a>
              <a href="/leaderboard" style={{ color: 'inherit', textDecoration: 'none' }}>Activity</a>
              <a href="/profile" style={{ color: 'inherit', textDecoration: 'none' }}>Portfolio</a>
              <a href="/stats" style={{ color: 'inherit', textDecoration: 'none' }}>Stats</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
