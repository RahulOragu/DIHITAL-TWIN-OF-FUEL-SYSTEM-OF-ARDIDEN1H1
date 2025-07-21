import React from 'react';
import { SystemComponent, HealthStatus } from '../types';

interface HealthStatusCardProps {
  components: SystemComponent[];
}

const getStatusIndicator = (status: HealthStatus) => {
  switch (status) {
    case HealthStatus.OK:
      return <div className="w-3 h-3 rounded-full bg-green-500" title="OK"></div>;
    case HealthStatus.WARN:
      return <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" title="Warning"></div>;
    case HealthStatus.FAULT:
      return <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" title="Fault"></div>;
    case HealthStatus.OFF:
    default:
      return <div className="w-3 h-3 rounded-full bg-slate-400" title="Off"></div>;
  }
};

export const HealthStatusCard: React.FC<HealthStatusCardProps> = ({ components }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-full">
      <h2 className="text-lg font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Component Health</h2>
      <div className="space-y-2 text-sm">
        {components.map((component) => (
          <div key={component.name} className="flex justify-between items-center bg-slate-100/70 p-2 rounded-md">
            <span className="text-slate-700">{component.name}</span>
            <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-500">{component.status}</span>
                {getStatusIndicator(component.status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};