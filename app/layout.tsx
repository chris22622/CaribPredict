import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Toaster } from 'sonner';

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
  themeColor: '#1570EF',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-caribbean-sand">
        {/* Navigation */}
        <Navbar />

        {/* Toast Notifications */}
        <Toaster position="top-right" richColors />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 min-h-screen">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-caribbean-gray-200 py-8 mt-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-sm text-caribbean-gray-600">
                  © 2026 CaribPredict - Caribbean Prediction Markets
                </p>
                <p className="text-xs text-caribbean-gray-500 mt-1">
                  Trade responsibly. Markets are for entertainment and informational purposes.
                </p>
              </div>
              <div className="flex gap-6 text-sm text-caribbean-gray-600">
                <a href="#" className="hover:text-caribbean-blue transition-colors">
                  About
                </a>
                <a href="#" className="hover:text-caribbean-blue transition-colors">
                  Help
                </a>
                <a href="#" className="hover:text-caribbean-blue transition-colors">
                  Terms
                </a>
                <a href="#" className="hover:text-caribbean-blue transition-colors">
                  Privacy
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
