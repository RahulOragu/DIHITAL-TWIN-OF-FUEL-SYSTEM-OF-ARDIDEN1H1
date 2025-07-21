import React from 'react';

interface GaugeProps {
  label: string;
  value: number;
  maxValue: number;
  unit: string;
}

export const Gauge: React.FC<GaugeProps> = ({ label, value, maxValue, unit }) => {
  const clampedValue = Math.min(Math.max(value, 0), maxValue);
  const percentage = clampedValue / maxValue;
  
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  // We want a 3/4 circle gauge, so we multiply the percentage by 0.75
  const strokeDashoffset = circumference * (1 - percentage * 0.75);

  const getStrokeColor = () => {
    if (percentage > 0.9) return 'stroke-red-500';
    if (percentage > 0.7) return 'stroke-yellow-500';
    return 'stroke-cyan-500';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center aspect-square shadow-sm">
      <div className="relative w-full h-full flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgb(226 232 240)" // slate-200
            strokeWidth="8"
            strokeDasharray={circumference * 0.75}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(135 50 50)"
          />
          {/* Value arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            className={`${getStrokeColor()} transition-all duration-300`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(135 50 50)"
          />
        </svg>
        <div className="absolute text-center">
          <span className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tighter">
            {Math.round(clampedValue)}
          </span>
          <span className="block text-xs text-slate-500">{unit}</span>
        </div>
      </div>
      <h3 className="mt-2 text-sm font-semibold text-slate-700">{label}</h3>
    </div>
  );
};