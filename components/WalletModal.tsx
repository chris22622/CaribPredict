'use client';

import { useState } from 'react';
import { User } from '@/lib/types';
import { formatSatoshis } from '@/lib/amm';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, X, Bitcoin, Copy, Check, ExternalLink, Zap, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface WalletModalProps {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
}

export default function WalletModal({ user, onClose, onUpdate }: WalletModalProps) {
  const [mode, setMode] = useState<'overview' | 'deposit' | 'withdraw'>('overview');
  const [amount, setAmount] = useState('');
  const [bitcoinAddress, setBitcoinAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDeposit = async () => {
    setLoading(true);
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) throw new Error('Invalid amount');
      if (amountNum < 1) throw new Error('Minimum deposit is $1.00');

      const response = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amountUSD: amountNum })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      window.open(data.checkoutUrl, '_blank');
      toast.success('Payment page opened. Complete your Bitcoin payment.');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create deposit');
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      const satoshis = Math.floor(parseFloat(amount) * 100000000);

      if (isNaN(satoshis) || satoshis <= 0) throw new Error('Invalid amount');
      if (satoshis > user.balance_satoshis) throw new Error('Insufficient balance');
      if (!bitcoinAddress.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/) && !bitcoinAddress.startsWith('lnbc')) {
        throw new Error('Invalid Bitcoin or Lightning address');
      }

      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amountSatoshis: satoshis, bitcoinAddress })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      toast.success('Withdrawal initiated! Processing your Bitcoin payment.');
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to withdraw');
      setLoading(false);
    }
  };

  const btcValue = (user.balance_satoshis / 100000000).toFixed(8);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl max-w-md w-full shadow-modal animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <h2 className="text-lg font-bold text-gray-900">Wallet</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="mx-5 mt-4 p-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl text-white">
          <div className="text-xs text-gray-400 mb-1">Total Balance</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            <Bitcoin size={22} className="text-orange-400" />
            {formatSatoshis(user.balance_satoshis)}
          </div>
          <div className="text-xs text-gray-400 mt-1">{btcValue} BTC</div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mx-5 mt-4">
          <button
            onClick={() => setMode('deposit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'deposit'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowDownToLine size={16} />
            Deposit
          </button>
          <button
            onClick={() => setMode('withdraw')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'withdraw'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowUpFromLine size={16} />
            Withdraw
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {mode === 'overview' && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">Select Deposit or Withdraw to manage your funds.</p>
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-400">
                <Zap size={14} className="text-yellow-500" />
                <span>Bitcoin & Lightning Network supported</span>
              </div>
            </div>
          )}

          {mode === 'deposit' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10.00"
                    step="0.01"
                    min="1"
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[5, 10, 25, 50].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(v.toString())}
                      className="flex-1 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      ${v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <Zap size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  You'll be redirected to BTCPay Server to complete payment via Bitcoin on-chain or Lightning Network.
                </p>
              </div>

              <button
                onClick={handleDeposit}
                disabled={loading || !amount || parseFloat(amount) < 1}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating invoice...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Bitcoin size={16} />
                    Pay with Bitcoin
                  </span>
                )}
              </button>
            </div>
          )}

          {mode === 'withdraw' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Amount (BTC)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.001"
                  step="0.00000001"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Available: {formatSatoshis(user.balance_satoshis)} ({btcValue} BTC)
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Bitcoin / Lightning Address
                </label>
                <input
                  type="text"
                  value={bitcoinAddress}
                  onChange={(e) => setBitcoinAddress(e.target.value)}
                  placeholder="bc1q... or lnbc..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Withdrawals are processed via BTCPay Server. Double-check your address - Bitcoin transactions are irreversible.
                </p>
              </div>

              <button
                onClick={handleWithdraw}
                disabled={loading || !amount || !bitcoinAddress}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Withdraw'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4">
          <div className="pt-3 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Bitcoin size={12} />
            Powered by BTCPay Server
          </div>
        </div>
      </div>
    </div>
  );
}
