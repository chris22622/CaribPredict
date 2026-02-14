'use client';

import Link from 'next/link';
import { ArrowLeft, UserPlus, Bitcoin, TrendingUp, Trophy, ArrowRight, Zap, Shield, Globe, BarChart2 } from 'lucide-react';
import { useAuth } from '@/app/layout-client';

export default function HowItWorksPage() {
  const { openAuth, user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} />
        Back to Markets
      </Link>

      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">How CaribPredict Works</h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
          Trade on the outcomes of real events across the Caribbean. If you think something will happen, buy shares.
          If you're right, you earn sats.
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
        {[
          {
            step: 1,
            icon: UserPlus,
            title: 'Create Account',
            description: 'Sign up with your email in seconds. No KYC required to get started.',
            color: 'from-blue-400 to-blue-600',
          },
          {
            step: 2,
            icon: Bitcoin,
            title: 'Deposit Sats',
            description: 'Fund your account with Bitcoin via the Lightning Network. Instant, low-fee deposits.',
            color: 'from-orange-400 to-orange-600',
          },
          {
            step: 3,
            icon: TrendingUp,
            title: 'Trade Markets',
            description: 'Buy shares in outcomes you believe in. Prices reflect real-time probability.',
            color: 'from-emerald-400 to-emerald-600',
          },
          {
            step: 4,
            icon: Trophy,
            title: 'Earn Rewards',
            description: 'When a market resolves, correct predictions pay out. Withdraw your winnings anytime.',
            color: 'from-purple-400 to-purple-600',
          },
        ].map((item) => (
          <div key={item.step} className="text-center">
            <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
              <item.icon size={24} className="text-white" />
            </div>
            <div className="text-xs font-bold text-gray-400 mb-1">STEP {item.step}</div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.description}</p>
          </div>
        ))}
      </div>

      {/* What Are Prediction Markets */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">What Are Prediction Markets?</h2>
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            Prediction markets are platforms where you can trade shares on the outcomes of future events. Each
            market asks a question like "Will Jamaica's GDP grow by more than 3% in 2026?" with possible outcomes
            (Yes/No or multiple options).
          </p>
          <p>
            Share prices range from 1 to 99 sats, representing the market's estimated probability of that outcome.
            If a share is trading at 70 sats, the market collectively believes there's approximately a 70% chance
            that outcome will happen.
          </p>
          <p>
            When the event occurs and the market resolves, shares of the winning outcome pay out 100 sats each.
            Shares of losing outcomes become worthless. So if you bought "Yes" at 70 sats and it resolves Yes,
            you earn 30 sats profit per share.
          </p>
        </div>
      </div>

      {/* Pricing Mechanism */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">How Pricing Works</h2>
        <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <p>
            CaribPredict uses a Logarithmic Market Scoring Rule (LMSR) automated market maker. This means
            you can always buy or sell shares — you don't need to find another trader on the other side.
            The system provides continuous liquidity.
          </p>
          <p>
            Prices adjust automatically based on demand. When many people buy "Yes" shares, the price goes up
            (probability increases). When people sell, the price goes down. This creates a self-correcting
            mechanism that aggregates the collective knowledge of all participants.
          </p>
        </div>
      </div>

      {/* Why Caribbean */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-xl flex items-center justify-center shrink-0">
            <Globe size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Why the Caribbean?</h2>
            <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
              <p>
                The Caribbean is one of the most dynamic regions in the world — from elections and economic
                policies to cricket, carnival, and hurricane seasons. But until now, there hasn't been a
                dedicated prediction market for the region.
              </p>
              <p>
                CaribPredict covers all 15 CARICOM member states: Jamaica, Trinidad and Tobago, Barbados,
                Guyana, Suriname, Bahamas, Belize, Dominica, Grenada, Haiti, Saint Lucia, Saint Vincent
                and the Grenadines, Antigua and Barbuda, Saint Kitts and Nevis, and Montserrat.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <Zap size={20} className="text-orange-500 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Lightning Fast</h3>
          <p className="text-xs text-gray-500">Instant deposits and withdrawals via Bitcoin Lightning Network. No waiting for confirmations.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <Shield size={20} className="text-blue-500 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Transparent Resolution</h3>
          <p className="text-xs text-gray-500">Markets are resolved using publicly verifiable sources. Resolution criteria are displayed on every market.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <BarChart2 size={20} className="text-emerald-500 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Real-Time Data</h3>
          <p className="text-xs text-gray-500">Watch prices update in real-time as events unfold. Live activity feed shows every trade.</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-5">
          {[
            {
              q: 'How much do I need to start?',
              a: 'There\'s no minimum deposit. You can start with as little as a few hundred satoshis (fractions of a cent). Single shares can cost as low as 1 sat.',
            },
            {
              q: 'How are markets resolved?',
              a: 'Markets are resolved by platform administrators based on publicly verifiable information — news reports, official statistics, and public records. Resolution criteria are specified when each market is created.',
            },
            {
              q: 'Can I sell my shares before a market resolves?',
              a: 'Yes! You can buy and sell shares at any time before market resolution. The automated market maker ensures there\'s always liquidity available.',
            },
            {
              q: 'Is this gambling?',
              a: 'Prediction markets are information aggregation tools — they harness collective intelligence to estimate probabilities. Unlike traditional gambling, the outcomes are tied to real-world events, and trading skill (research, analysis) gives you an edge.',
            },
            {
              q: 'What happens if a market is cancelled?',
              a: 'In rare cases where a market becomes unresolvable, it may be voided. In that case, all shares are refunded at their original purchase price.',
            },
            {
              q: 'How do I withdraw my winnings?',
              a: 'Click the Bitcoin balance button in the navigation bar to open the wallet. From there you can withdraw to any Bitcoin Lightning wallet instantly.',
            },
          ].map((faq, i) => (
            <div key={i}>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{faq.q}</h3>
              <p className="text-sm text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      {!user && (
        <div className="text-center py-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to start predicting?</h2>
          <p className="text-sm text-gray-500 mb-5">Join the Caribbean's first prediction market platform.</p>
          <button
            onClick={openAuth}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            Get Started
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
