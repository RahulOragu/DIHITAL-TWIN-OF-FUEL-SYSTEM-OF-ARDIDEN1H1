import React from 'react';

interface DataCardProps {
  label: string;
  value: string;
  unit: string;
  isWarning?: boolean;
}

export const DataCard: React.FC<DataCardProps> = ({ label, value, unit, isWarning = false }) => {
  const valueColor = isWarning ? 'text-yellow-600' : 'text-cyan-600';
  const bgColor = isWarning ? 'bg-yellow-100/70' : 'bg-white';

  return (
    <div className={`${bgColor} border border-slate-200 rounded-lg p-3 text-center transition-colors duration-300 shadow-sm`}>
      <p className="text-xs sm:text-sm font-medium text-slate-500">{label}</p>
      <p className={`text-xl sm:text-2xl font-bold ${valueColor}`}>
        {value}
        <span className="text-base text-slate-500 ml-1">{unit}</span>
      </p>
    </div>
  );
};