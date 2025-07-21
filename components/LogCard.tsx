import React from 'react';
import { LogEntry, HealthStatus } from '../types';

interface LogCardProps {
  logs: LogEntry[];
}

const getLevelColor = (level: HealthStatus): string => {
  switch (level) {
    case HealthStatus.OK:
      return 'text-slate-600';
    case HealthStatus.WARN:
      return 'text-yellow-600';
    case HealthStatus.FAULT:
      return 'text-red-500';
    default:
      return 'text-slate-400';
  }
};

export const LogCard: React.FC<LogCardProps> = ({ logs }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-full max-h-[calc(100vh-120px)] flex flex-col">
      <h2 className="text-lg font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">Event Log</h2>
      <div className="overflow-y-auto pr-2 flex-grow">
        <ul className="space-y-1.5">
          {logs.map((log, index) => (
            <li key={index} className={`text-xs ${getLevelColor(log.level)} font-mono flex`}>
                <span className="text-slate-400 mr-2 shrink-0">[{log.timestamp}]</span>
                <span>{log.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};