import type { Metadata, Viewport } from 'next';
import './globals.css';
import LayoutClient from './layout-client';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'CaribPredict - Caribbean Prediction Markets',
  description: 'Predict and trade on Caribbean events. The #1 prediction market for CARICOM nations.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CaribPredict',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-poly-bg antialiased">
        <Toaster position="top-center" richColors closeButton />
        <LayoutClient>
          <main className="min-h-screen">
            {children}
          </main>
        </LayoutClient>
      </body>
    </html>
  );
}
