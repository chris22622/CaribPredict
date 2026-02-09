'use client';

import Link from 'next/link';
import { TrendingUp, Search, User, Home, Trophy, BarChart3 } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  balance?: number;
}

export default function Navbar({ balance }: NavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  const formatSats = (sats: number) => {
    if (sats >= 1000000) return `${(sats / 1000000).toFixed(2)}M`;
    if (sats >= 1000) return `${(sats / 1000).toFixed(1)}k`;
    return sats.toString();
  };

  return (
    <nav className="bg-white border-b border-caribbean-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-caribbean-blue rounded-lg p-2 group-hover:bg-caribbean-teal transition-colors">
              <TrendingUp size={24} className="text-white" />
            </div>
            <span className="text-xl font-bold text-caribbean-navy">CaribPredict</span>
          </Link>

          {/* Center - Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-caribbean-gray-400"
              />
              <input
                type="text"
                placeholder="Search markets..."
                className="w-full pl-10 pr-4 py-2 border border-caribbean-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-caribbean-blue focus:border-transparent"
              />
            </div>
          </div>

          {/* Right - Balance & Profile */}
          <div className="flex items-center gap-4">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="md:hidden p-2 hover:bg-caribbean-gray-100 rounded-lg transition-colors"
            >
              <Search size={20} className="text-caribbean-gray-600" />
            </button>

            {/* Balance Display */}
            {balance !== undefined && (
              <div className="hidden sm:flex items-center gap-2 bg-caribbean-sand px-4 py-2 rounded-lg">
                <span className="text-sm text-caribbean-gray-600">Balance:</span>
                <span className="font-bold text-caribbean-navy">{formatSats(balance)} sats</span>
              </div>
            )}

            {/* Navigation Links */}
            <Link
              href="/"
              className="p-2 hover:bg-caribbean-gray-100 rounded-lg transition-colors"
              title="Home"
            >
              <Home size={20} className="text-caribbean-gray-600" />
            </Link>
            <Link
              href="/stats"
              className="p-2 hover:bg-caribbean-gray-100 rounded-lg transition-colors"
              title="Platform Stats"
            >
              <BarChart3 size={20} className="text-caribbean-gray-600" />
            </Link>
            <Link
              href="/leaderboard"
              className="p-2 hover:bg-caribbean-gray-100 rounded-lg transition-colors"
              title="Leaderboard"
            >
              <Trophy size={20} className="text-caribbean-gray-600" />
            </Link>
            <Link
              href="/profile"
              className="p-2 hover:bg-caribbean-gray-100 rounded-lg transition-colors"
              title="Profile"
            >
              <User size={20} className="text-caribbean-gray-600" />
            </Link>
          </div>
        </div>

        {/* Mobile Search */}
        {searchOpen && (
          <div className="md:hidden pb-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-caribbean-gray-400"
              />
              <input
                type="text"
                placeholder="Search markets..."
                className="w-full pl-10 pr-4 py-2 border border-caribbean-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-caribbean-blue focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
