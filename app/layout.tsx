import type { Metadata, Viewport } from 'next';
import './globals.css';
import LayoutClient from './layout-client';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'CaribPredict - Caribbean Prediction Markets',
  description: 'Predict and trade on Caribbean events across all 15 CARICOM nations. Deposit with Bitcoin Lightning, trade shares on real outcomes, and earn sats.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://www.caribpredict.com'),
  openGraph: {
    title: 'CaribPredict - Caribbean Prediction Markets',
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
        alt: 'CaribPredict - Caribbean Prediction Markets',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CaribPredict - Caribbean Prediction Markets',
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
