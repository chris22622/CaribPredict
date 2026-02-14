'use client';

import Link from 'next/link';
import { TrendingUp, Bitcoin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                <TrendingUp size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">CaribPredict</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              The premier prediction market platform for the Caribbean. Trade on outcomes across all CARICOM nations.
            </p>
            <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
              <Bitcoin size={14} />
              <span>Powered by Bitcoin & Lightning Network</span>
            </div>
          </div>

          {/* Markets */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Markets</h4>
            <ul className="space-y-2">
              <li><Link href="/?category=Politics" className="text-sm text-gray-500 hover:text-gray-900">Politics</Link></li>
              <li><Link href="/?category=Sports" className="text-sm text-gray-500 hover:text-gray-900">Sports</Link></li>
              <li><Link href="/?category=Economics" className="text-sm text-gray-500 hover:text-gray-900">Economics</Link></li>
              <li><Link href="/?category=Entertainment" className="text-sm text-gray-500 hover:text-gray-900">Entertainment</Link></li>
              <li><Link href="/?category=Technology" className="text-sm text-gray-500 hover:text-gray-900">Technology</Link></li>
            </ul>
          </div>

          {/* Countries */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Countries</h4>
            <ul className="space-y-2">
              <li><Link href="/?country=Jamaica" className="text-sm text-gray-500 hover:text-gray-900">Jamaica</Link></li>
              <li><Link href="/?country=Trinidad+and+Tobago" className="text-sm text-gray-500 hover:text-gray-900">Trinidad & Tobago</Link></li>
              <li><Link href="/?country=Barbados" className="text-sm text-gray-500 hover:text-gray-900">Barbados</Link></li>
              <li><Link href="/?country=Guyana" className="text-sm text-gray-500 hover:text-gray-900">Guyana</Link></li>
              <li><Link href="/?country=Bahamas" className="text-sm text-gray-500 hover:text-gray-900">Bahamas</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Resources</h4>
            <ul className="space-y-2">
              <li><Link href="/stats" className="text-sm text-gray-500 hover:text-gray-900">Platform Stats</Link></li>
              <li><Link href="/leaderboard" className="text-sm text-gray-500 hover:text-gray-900">Leaderboard</Link></li>
              <li><Link href="/how-it-works" className="text-sm text-gray-500 hover:text-gray-900">How It Works</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900">Terms of Service</Link></li>
              <li><Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-gray-400">
            &copy; 2026 CaribPredict. For entertainment and informational purposes only.
          </p>
          <p className="text-xs text-gray-400">
            Serving all 15 CARICOM member states
          </p>
        </div>
      </div>
    </footer>
  );
}
