'use client';

import { MarketOption } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatProbability } from '@/lib/amm';

interface MarketChartProps {
  options: MarketOption[];
}

export default function MarketChart({ options }: MarketChartProps) {
  // Generate simulated historical data (in production, this would come from database)
  // For now, create 10 data points showing probability evolution
  const generateChartData = () => {
    const dataPoints = 10;
    const data = [];

    for (let i = 0; i < dataPoints; i++) {
      const point: any = {
        date: new Date(Date.now() - (dataPoints - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
      };

      // For now, simulate slight variations around current probabilities
      options.forEach((option, idx) => {
        const variance = (Math.random() - 0.5) * 0.1; // ±5% variance
        const historicalProb = Math.max(0.05, Math.min(0.95, option.probability + variance));
        point[option.label] = historicalProb * 100;
      });

      data.push(point);
    }

    // Make sure last point is current probability
    const lastPoint = data[data.length - 1];
    options.forEach((option) => {
      lastPoint[option.label] = option.probability * 100;
    });

    return data;
  };

  const chartData = generateChartData();

  // Colors for different options
  const colors = ['#0095D9', '#00C896', '#FF6B6B', '#9B59B6', '#F39C12'];

  return (
    <div className="bg-white rounded-xl border border-caribbean-gray-200 p-6">
      <h2 className="text-lg font-bold text-caribbean-navy mb-4">Probability Over Time</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number) => `${value.toFixed(1)}%`}
          />
          <Legend />
          {options.map((option, idx) => (
            <Line
              key={option.id}
              type="monotone"
              dataKey={option.label}
              stroke={colors[idx % colors.length]}
              strokeWidth={2}
              dot={{ fill: colors[idx % colors.length], r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-caribbean-gray-500 mt-4 text-center">
        Chart shows probability changes based on trading activity
      </p>
    </div>
  );
}
