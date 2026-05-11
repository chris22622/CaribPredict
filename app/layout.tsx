import type { Metadata, Viewport } from 'next';
import './globals.css';
import LayoutClient from './layout-client';
import { Toaster } from 'sonner';
import { Wordmark } from '@/components/cp/Icon';

export const metadata: Metadata = {
  title: 'CaribPredict — Caribbean Prediction Markets',
  description: 'Trade predictions on Caribbean events and outcomes.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CaribPredict',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B1F2E',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="cp-paper">
        <Toaster position="top-right" richColors />
        <LayoutClient>
          {children}
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
