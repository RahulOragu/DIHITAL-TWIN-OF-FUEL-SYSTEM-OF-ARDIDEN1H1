import React from 'react';
import { FaultType, FAULT_DESCRIPTIONS, SloshIntensity } from '../types';

interface ControlPanelProps {
  isRunning: boolean;
  throttle: number;
  collectivePitch: number;
  activeFault: FaultType;
  isRotorReady: boolean;
  analysisStatus: 'idle' | 'loading' | 'success' | 'error';
  sloshIntensity: SloshIntensity;
  onToggle: () => void;
  onReset: () => void;
  onThrottleChange: (value: number) => void;
  onCollectivePitchChange: (value: number) => void;
  onInjectFault: (fault: FaultType) => void;
  onRunAnalysis: () => void;
  onSloshIntensityChange: (intensity: SloshIntensity) => void;
}

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-200 pb-2">{title}</h2>
        {children}
    </div>
);


export const ControlPanel: React.FC<ControlPanelProps> = ({
  isRunning,
  throttle,
  collectivePitch,
  activeFault,
  isRotorReady,
  analysisStatus,
  sloshIntensity,
  onToggle,
  onReset,
  onThrottleChange,
  onCollectivePitchChange,
  onInjectFault,
  onRunAnalysis,
  onSloshIntensityChange,
}) => {
  const handleFaultChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onInjectFault(e.target.value as FaultType);
  };
  
  const handleSloshIntensityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSloshIntensityChange(e.target.value as SloshIntensity);
  };

  const isInputDisabled = !isRunning || !isRotorReady;
  const isAnalysisDisabled = !isRotorReady || analysisStatus === 'loading';

  return (
    <Card title="Controls">
      <div className="space-y-6">
        {/* SIMULATION CONTROLS */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggle}
            className={`w-full px-4 py-2 text-white font-bold rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ${
              isRunning
                ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400'
                : 'bg-green-500 hover:bg-green-600 focus:ring-green-400'
            }`}
            aria-label={isRunning ? 'Pause simulation' : 'Start simulation'}
          >
            {isRunning ? 'PAUSE' : 'START'}
          </button>
          <button
            onClick={onReset}
            className="w-full px-4 py-2 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-red-500"
            aria-label="Reset simulation"
          >
            RESET
          </button>
        </div>

        {/* AI ANALYSIS BUTTON */}
        <div>
          <button
            onClick={onRunAnalysis}
            disabled={isAnalysisDisabled}
            className="w-full px-4 py-2 text-white font-bold rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center space-x-2"
            aria-label="Run predictive maintenance analysis"
          >
            {analysisStatus === 'loading' ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Analyzing...</span>
                </>
            ) : (
                <span>Run AI Analysis</span>
            )}
          </button>
        </div>

        {/* THROTTLE CONTROL */}
        <div>
          <label htmlFor="throttle" className="block mb-2 font-medium text-slate-600">
            Throttle: {isInputDisabled ? 'LOCKED' : `${throttle}%`}
          </label>
          <input
            id="throttle"
            type="range"
            min="0"
            max="100"
            value={throttle}
            onChange={(e) => onThrottleChange(parseInt(e.target.value, 10))}
            disabled={isInputDisabled}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Engine throttle control"
          />
        </div>

        {/* COLLECTIVE PITCH CONTROL */}
        <div>
          <label htmlFor="collective" className="block mb-2 font-medium text-slate-600">
            Collective Pitch: {isInputDisabled ? 'LOCKED' : `${collectivePitch.toFixed(1)}°`}
          </label>
          <input
            id="collective"
            type="range"
            min="-2"
            max="15"
            step="0.1"
            value={collectivePitch}
            onChange={(e) => onCollectivePitchChange(parseFloat(e.target.value))}
            disabled={isInputDisabled}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Rotor collective pitch control"
          />
        </div>

        {/* FAULT INJECTION */}
        <div>
          <label htmlFor="fault-injection" className="block mb-2 font-medium text-slate-600">
            Fault Injection
          </label>
          <select
            id="fault-injection"
            value={activeFault}
            onChange={handleFaultChange}
            disabled={!isRunning}
            className="w-full p-2 bg-slate-100 text-slate-800 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
            aria-label="Select a fault to inject"
          >
            {Object.entries(FAULT_DESCRIPTIONS).map(([faultKey, description]) => (
              <option key={faultKey} value={faultKey}>
                {faultKey === 'NONE' ? 'System Nominal' : faultKey === 'FADEC_AFR_ENHANCED' ? 'Mode: AFR+' : `Fault: ${faultKey}`}
              </option>
            ))}
          </select>
        </div>
        
        {/* SLOSH INTENSITY CONTROL */}
        {activeFault === FaultType.SLOSHING_FUEL_TANK && (
            <div className="border-t border-slate-200 pt-4 mt-4">
              <label htmlFor="slosh-intensity" className="block mb-2 font-medium text-slate-600">
                Slosh Intensity
              </label>
              <select
                id="slosh-intensity"
                value={sloshIntensity}
                onChange={handleSloshIntensityChange}
                disabled={!isRunning}
                className="w-full p-2 bg-slate-100 text-slate-800 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                aria-label="Select sloshing intensity"
              >
                {Object.values(SloshIntensity).filter(i => i !== SloshIntensity.NONE).map((intensity) => (
                    <option key={intensity} value={intensity}>
                        {intensity}
                    </option>
                ))}
              </select>
            </div>
        )}
      </div>
    </Card>
  );
};