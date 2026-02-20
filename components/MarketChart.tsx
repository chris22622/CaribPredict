'use client';

import { useEffect, useState } from 'react';
import { MarketOption } from '@/lib/types';
import { createClient } from '@/lib/supabase-client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MarketChartProps {
  options: MarketOption[];
  marketId: string;
}

interface TradePoint {
  time: string;
  [key: string]: any;
}

export default function MarketChart({ options, marketId }: MarketChartProps) {
  const [data, setData] = useState<TradePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadTradeHistory();
  }, [marketId]);

  const loadTradeHistory = async () => {
    try {
      // Fetch trades for this market, ordered by time
      const { data: trades, error } = await supabase
        .from('trades')
        .select('created_at, option_id, price, is_buy')
        .eq('market_id', marketId)
        .order('created_at', { ascending: true });

      if (error || !trades || trades.length === 0) {
        // No trades yet — show a flat line at current probabilities
        const now = new Date();
        const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const points: TradePoint[] = [
          { time: formatTime(startTime) },
          { time: 'Now' },
        ];
        options.forEach(opt => {
          points[0][opt.label] = opt.probability;
          points[1][opt.label] = opt.probability;
        });
        setData(points);
        setLoading(false);
        return;
      }

      // Build option label lookup
      const optionLabels: Record<string, string> = {};
      options.forEach(opt => { optionLabels[opt.id] = opt.label; });

      // Group trades into time buckets and track running probability
      // Start with equal probabilities, update as trades come in
      const runningProbs: Record<string, number> = {};
      options.forEach(opt => { runningProbs[opt.label] = 1 / options.length; });

      const points: TradePoint[] = [];

      // Add initial point
      const firstTradeTime = new Date(trades[0].created_at);
      const initialPoint: TradePoint = { time: formatTime(firstTradeTime) };
      options.forEach(opt => { initialPoint[opt.label] = 1 / options.length; });
      points.push(initialPoint);

      // Bucket trades by time intervals (adaptive based on time span)
      const lastTradeTime = new Date(trades[trades.length - 1].created_at);
      const timeSpan = lastTradeTime.getTime() - firstTradeTime.getTime();
      const bucketCount = Math.min(24, Math.max(6, trades.length));
      const bucketSize = Math.max(timeSpan / bucketCount, 60000); // At least 1 minute

      let currentBucketEnd = firstTradeTime.getTime() + bucketSize;

      for (const trade of trades) {
        const tradeTime = new Date(trade.created_at).getTime();

        // If this trade is past the current bucket, create a point
        while (tradeTime > currentBucketEnd && currentBucketEnd < lastTradeTime.getTime() + bucketSize) {
          const point: TradePoint = { time: formatTime(new Date(currentBucketEnd)) };
          options.forEach(opt => { point[opt.label] = runningProbs[opt.label]; });
          points.push(point);
          currentBucketEnd += bucketSize;
        }

        // Update running price from trade
        // Price from a trade reflects the implied probability for that option
        const label = optionLabels[trade.option_id];
        if (label && trade.price) {
          // Clamp price to valid probability range
          const impliedProb = Math.max(0.01, Math.min(0.99, trade.price));
          runningProbs[label] = impliedProb;

          // Normalize other probabilities so they sum to ~1
          const otherLabels = options.map(o => o.label).filter(l => l !== label);
          const remaining = 1 - impliedProb;
          const otherSum = otherLabels.reduce((s, l) => s + runningProbs[l], 0);
          if (otherSum > 0) {
            otherLabels.forEach(l => {
              runningProbs[l] = (runningProbs[l] / otherSum) * remaining;
            });
          }
        }
      }

      // Add final "Now" point with current actual probabilities
      const nowPoint: TradePoint = { time: 'Now' };
      options.forEach(opt => { nowPoint[opt.label] = opt.probability; });
      points.push(nowPoint);

      // Deduplicate and limit points
      const limited = points.length > 30
        ? points.filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 30) === 0)
        : points;

      setData(limited);
    } catch (err) {
      console.error('Error loading trade history:', err);
      // Fallback: flat line at current probs
      const point: TradePoint = { time: 'Now' };
      options.forEach(opt => { point[opt.label] = opt.probability; });
      setData([point]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    if (diffHours < 24 * 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', hour12: true });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const colors = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Price History</h3>
        <div className="h-48 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Price History</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
              tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [`${(value * 100).toFixed(1)}%`]}
            />
            {options.map((option, idx) => (
              <Line
                key={option.id}
                type="monotone"
                dataKey={option.label}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {options.map((option, idx) => (
          <div key={option.id} className="flex items-center gap-1.5 text-xs text-gray-600">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: colors[idx % colors.length] }}
            />
            {option.label}
          </div>
        ))}
      </div>
    </div>
  );
}
