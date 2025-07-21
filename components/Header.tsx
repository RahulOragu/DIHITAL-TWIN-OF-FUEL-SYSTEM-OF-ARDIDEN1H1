import React from 'react';

interface HeaderProps {
    onToggleDocs: () => void;
    isDocsVisible: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleDocs, isDocsVisible }) => (
  <header className="relative text-center p-2 border-b-2 border-slate-200/80">
    <h1 className="text-2xl md:text-3xl font-bold text-cyan-600 tracking-wide">
      Helicopter Fuel System Digital Twin
    </h1>
    <p className="text-sm text-slate-500">
      Turbomeca Shakti 1H1 Engine - Multi-Pump System (MPS)
    </p>
    <div className="absolute top-1/2 right-4 -translate-y-1/2">
        <button
            onClick={onToggleDocs}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 ${
              isDocsVisible
                ? 'bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 focus:ring-slate-400'
            }`}
            aria-label={isDocsVisible ? 'Close documentation' : 'Open documentation'}
          >
            {isDocsVisible ? 'DASHBOARD' : 'DOCS'}
        </button>
    </div>
  </header>
);