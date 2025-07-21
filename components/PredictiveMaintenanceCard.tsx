import React from 'react';
import { SimulationState, PredictiveMaintenanceResult } from '../types';

interface PredictiveMaintenanceCardProps {
    analysis: SimulationState['predictiveAnalysis'];
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-6 w-6 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ConfidenceBar: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.round(value * 100);
    let barColor = 'bg-green-500';
    if (percentage < 75) barColor = 'bg-yellow-500';
    if (percentage < 50) barColor = 'bg-orange-500';

    return (
        <div className="w-full bg-slate-200 rounded-full h-2.5" aria-label={`Confidence: ${percentage}%`}>
            <div className={`${barColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
        </div>
    );
};

const PredictionResult: React.FC<{ result: PredictiveMaintenanceResult }> = ({ result }) => (
    <div className="border-l-4 border-cyan-500 pl-4 py-2 bg-slate-100/70 rounded-r-lg">
        <h4 className="font-bold text-slate-800">{result.componentName}</h4>
        <p className="text-sm text-slate-600 mt-1 italic">"{result.prediction}"</p>
        <div className="text-sm text-slate-700 mt-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-cyan-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 00-1.414 1.414L12 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-2z" />
                <path d="M4 5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V8a1 1 0 00-2 0v8a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 000-2H4z" />
            </svg>
            <span className="font-semibold mr-1">Action:</span> {result.recommendation}
        </div>
        {result.estimatedTimeToFailureHours != null && (
            <div className="text-sm text-yellow-600 mt-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold mr-1">Est. Failure:</span> {result.estimatedTimeToFailureHours.toFixed(1)} hours
            </div>
        )}
        <div className="mt-3 flex items-center space-x-2">
             <span className="text-xs text-slate-500 font-medium">Confidence:</span>
             <ConfidenceBar value={result.confidence} />
             <span className="text-xs text-slate-500 font-semibold w-10 text-right">{Math.round(result.confidence * 100)}%</span>
        </div>
    </div>
);

export const PredictiveMaintenanceCard: React.FC<PredictiveMaintenanceCardProps> = ({ analysis }) => {
    const { status, summary, results, lastRunTick } = analysis;

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <Spinner />
                        <p className="mt-4 text-lg text-slate-700">Analyzing full operational run...</p>
                        <p className="text-sm text-slate-500">Please wait, this may take a moment.</p>
                    </div>
                );
            case 'error':
            case 'success':
                return (
                     <div className="overflow-y-auto pr-2 flex-grow">
                        {summary && (
                            <div className="bg-slate-100 p-4 rounded-lg mb-4 border border-slate-200">
                                <h3 className="text-sm font-semibold text-cyan-600 uppercase tracking-wider mb-2">Final Run Summary</h3>
                                <p className="text-lg text-slate-800">{summary}</p>
                            </div>
                        )}
                        <h3 className="text-sm font-semibold text-cyan-600 uppercase tracking-wider mb-2">Detailed Predictions</h3>
                        <div className="space-y-4">
                            {results.length > 0 ? (
                                results.map((res, index) => <PredictionResult key={index} result={res} />)
                            ) : (
                                <p className="p-4 text-slate-500 text-center">No significant threats detected for this run.</p>
                            )}
                        </div>
                    </div>
                );
            case 'idle':
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.54 5.54L18.46 2.62m-1.42 12.88L14.16 19.8M2.62 18.46l2.92-2.92m12.88-1.42L19.8 14.16M3 9.04l2.12-2.12m10.88-.01L13.88 9.04m4.24 2.82l-2.12 2.12M9.04 3l2.12 2.12" />
                        </svg>
                        <p className="mt-4 text-lg text-slate-700">Analysis Pending</p>
                        <p className="text-sm text-slate-500">Click "Run AI Analysis" in the controls to generate a predictive report.</p>
                    </div>
                );
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[calc(100vh-120px)] flex flex-col">
            <h2 className="text-lg font-semibold text-slate-800 mb-3 border-b border-slate-200 pb-2">AI Post-Run Analysis</h2>
            
            <div className="flex-grow min-h-0">
                {renderContent()}
            </div>

             <div className="text-xs text-slate-400 text-center mt-3 pt-2 border-t border-slate-200/50">
                {status === 'error' && (
                    <p className="text-yellow-500 mb-1 font-semibold">AI analysis failed. Check console for details.</p>
                )}
                {lastRunTick > 0 ? (
                    <p>Status: <span className="font-medium capitalize">{status}</span> | Last Analysis: Tick {lastRunTick}</p>
                ) : (
                    <p>Status: <span className="font-medium capitalize">{status}</span></p>
                )}
             </div>
        </div>
    );
};