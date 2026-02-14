'use client';

import { formatSatoshis } from '@/lib/amm';
import { Wallet } from 'lucide-react';

interface BalanceDisplayProps {
  balance: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function BalanceDisplay({ balance, showLabel = true, size = 'md' }: BalanceDisplayProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <div className="flex items-center gap-2">
      <Wallet size={iconSizes[size]} className="text-caribbean-coral" />
      <div>
        {showLabel && <div className="text-xs text-gray-600">Balance</div>}
        <div className={`${sizeClasses[size]} font-bold text-caribbean-navy`}>
          {formatSatoshis(balance)}
        </div>
      </div>
    </div>
  );
}
