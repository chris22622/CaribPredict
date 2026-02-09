'use client';

import { useState } from 'react';
import { User } from '@/lib/types';
import { formatSatoshis } from '@/lib/amm';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, X, Bitcoin } from 'lucide-react';
import { toast } from 'sonner';

interface WalletModalProps {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
}

export default function WalletModal({ user, onClose, onUpdate }: WalletModalProps) {
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [bitcoinAddress, setBitcoinAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    setLoading(true);
    try {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount');
      }

      const response = await fetch('/api/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amountUSD: amountNum
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      // Redirect to BTCPay checkout
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create deposit');
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      const satoshis = Math.floor(parseFloat(amount) * 100000000);

      if (isNaN(satoshis) || satoshis <= 0) {
        throw new Error('Invalid amount');
      }

      if (satoshis > user.balance_satoshis) {
        throw new Error('Insufficient balance');
      }

      if (!bitcoinAddress.match(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/)) {
        throw new Error('Invalid Bitcoin address');
      }

      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amountSatoshis: satoshis,
          bitcoinAddress
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      toast.success('Withdrawal initiated! It will be processed shortly.');
      onUpdate();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to withdraw');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Wallet className="text-caribbean-blue" size={24} />
            <h2 className="text-2xl font-bold">Wallet</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 p-4 bg-gradient-to-r from-caribbean-blue to-caribbean-teal rounded-lg">
          <div className="text-white text-sm mb-1 opacity-90">Current Balance</div>
          <div className="text-white text-3xl font-bold flex items-center gap-2">
            <Bitcoin size={28} />
            {formatSatoshis(user.balance_satoshis)}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('deposit')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              mode === 'deposit'
                ? 'bg-caribbean-blue text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowDownToLine className="inline mr-2" size={18} />
            Deposit
          </button>
          <button
            onClick={() => setMode('withdraw')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              mode === 'withdraw'
                ? 'bg-caribbean-blue text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowUpFromLine className="inline mr-2" size={18} />
            Withdraw
          </button>
        </div>

        {mode === 'deposit' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10.00"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-caribbean-blue focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum: $1.00</p>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-900">
                💡 You'll be redirected to BTCPay to complete payment via Bitcoin or Lightning Network
              </p>
            </div>

            <button
              onClick={handleDeposit}
              disabled={loading || !amount || parseFloat(amount) < 1}
              className="w-full bg-caribbean-blue text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-opacity-90 transition-all shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Bitcoin size={18} />
                  Pay with Bitcoin
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Amount (BTC)
              </label>
              <div className="relative">
                <Bitcoin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.001"
                  step="0.00000001"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-caribbean-blue focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Available: {formatSatoshis(user.balance_satoshis)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">
                Bitcoin Address
              </label>
              <input
                type="text"
                value={bitcoinAddress}
                onChange={(e) => setBitcoinAddress(e.target.value)}
                placeholder="bc1q..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-caribbean-blue focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Enter your Bitcoin address</p>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-900">
                ⚠️ Double-check your address! Bitcoin transactions cannot be reversed.
              </p>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={loading || !amount || !bitcoinAddress}
              className="w-full bg-caribbean-blue text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-opacity-90 transition-all shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                'Withdraw to Bitcoin Address'
              )}
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Powered by BTCPay Server • Lightning Network supported
          </p>
        </div>
      </div>
    </div>
  );
}
