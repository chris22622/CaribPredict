'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, User, Wallet, TrendingUp, Menu, X, ChevronDown, Bitcoin, BarChart2, Trophy, Settings, Bookmark } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/app/layout-client';
import { formatSatoshis } from '@/lib/amm';

export default function Navbar() {
  const { user, balance, openAuth, openWallet, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { href: '/', label: 'Markets', icon: TrendingUp },
    { href: '/leaderboard', label: 'Rankings', icon: Trophy },
    { href: '/stats', label: 'Activity', icon: BarChart2 },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                <TrendingUp size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900 hidden sm:block">CaribPredict</span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Center: Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search markets..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </form>

          {/* Right: Auth + Wallet */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Balance / Deposit */}
                <button
                  onClick={openWallet}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                >
                  <Bitcoin size={14} className="text-orange-500" />
                  <span className="text-sm font-semibold text-gray-900">
                    {formatSatoshis(balance)}
                  </span>
                </button>

                {/* Portfolio */}
                <Link
                  href="/portfolio"
                  className={`p-2 rounded-lg transition-colors ${
                    pathname === '/portfolio' ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                  title="Portfolio"
                >
                  <Wallet size={18} className="text-gray-600" />
                </Link>

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setProfileDropdown(!profileDropdown)}
                    className="flex items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {(user.email?.[0] || 'U').toUpperCase()}
                      </span>
                    </div>
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>

                  {profileDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 animate-fade-in">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Balance: {formatSatoshis(balance)}
                        </p>
                      </div>
                      <Link
                        href="/portfolio"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setProfileDropdown(false)}
                      >
                        <Wallet size={16} />
                        Portfolio
                      </Link>
                      <Link
                        href="/watchlist"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setProfileDropdown(false)}
                      >
                        <Bookmark size={16} />
                        Watchlist
                      </Link>
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setProfileDropdown(false)}
                      >
                        <User size={16} />
                        Profile
                      </Link>
                      {user.email === 'admin@caribpredict.com' && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setProfileDropdown(false)}
                        >
                          <Settings size={16} />
                          Admin Panel
                        </Link>
                      )}
                      <div className="border-t border-gray-100 mt-1">
                        <button
                          onClick={() => { logout(); setProfileDropdown(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={openAuth}
                  className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Log In
                </button>
                <button
                  onClick={openAuth}
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  Sign Up
                </button>
              </>
            )}

            {/* Mobile Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-50"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 mt-2 pt-3 animate-fade-in">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search markets..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              />
            </form>
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    isActive(link.href)
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <link.icon size={18} />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
