interface ProbabilityBarProps {
  probability: number; // 0.0 to 1.0
  label?: string;
  showPercentage?: boolean;
}

export default function ProbabilityBar({
  probability,
  label,
  showPercentage = true,
}: ProbabilityBarProps) {
  const percentage = Math.round(probability * 100);

  // Color based on probability
  const getBarColor = () => {
    if (percentage >= 70) return 'bg-caribbean-green';
    if (percentage >= 50) return 'bg-caribbean-teal';
    if (percentage >= 30) return 'bg-caribbean-blue';
    return 'bg-caribbean-gray-400';
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-caribbean-gray-600">{label}</span>
          {showPercentage && (
            <span className="text-sm font-bold text-caribbean-navy">{percentage}%</span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-caribbean-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
