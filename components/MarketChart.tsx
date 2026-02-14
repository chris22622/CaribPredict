'use client';

import { MarketOption } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MarketChartProps {
  options: MarketOption[];
}

export default function MarketChart({ options }: MarketChartProps) {
  // Generate simulated price history based on current probabilities
  // In production, this would come from actual trade history
  const generatePriceHistory = () => {
    const points = 24;
    const data = [];

    for (let i = 0; i < points; i++) {
      const point: Record<string, any> = { time: `${i}h` };
      options.forEach((option, idx) => {
        const base = option.probability;
        const noise = (Math.random() - 0.5) * 0.1;
        const trend = (i / points) * (option.probability - 0.5) * 0.2;
        point[option.label] = Math.max(0.01, Math.min(0.99, base - trend + noise * (1 - i / points)));
      });
      data.push(point);
    }

    // Last point is current
    const lastPoint: Record<string, any> = { time: 'Now' };
    options.forEach(option => { lastPoint[option.label] = option.probability; });
    data.push(lastPoint);

    return data;
  };

  const data = generatePriceHistory();
  const colors = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

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
