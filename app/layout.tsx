import type { Metadata, Viewport } from 'next';
import './globals.css';
import Link from 'next/link';
import { Home, User, TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'CaribPredict - Caribbean Prediction Markets',
  description: 'Trade predictions on Caribbean events and outcomes',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CaribPredict',
  },
};

export const viewport: Viewport = {
  themeColor: '#00B4D8',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Header */}
        <header className="bg-caribbean-navy text-white shadow-lg sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <TrendingUp size={28} className="text-caribbean-teal" />
                <h1 className="text-2xl font-bold">CaribPredict</h1>
              </Link>
              <nav className="flex gap-4">
                <Link href="/" className="hover:text-caribbean-teal transition-colors">
                  <Home size={24} />
                </Link>
                <Link href="/profile" className="hover:text-caribbean-teal transition-colors">
                  <User size={24} />
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6 min-h-screen">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-caribbean-navy text-white py-6 mt-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm">© 2026 CaribPredict - Caribbean Prediction Markets</p>
            <p className="text-xs text-gray-400 mt-2">Trade responsibly. Markets are for entertainment and informational purposes.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
