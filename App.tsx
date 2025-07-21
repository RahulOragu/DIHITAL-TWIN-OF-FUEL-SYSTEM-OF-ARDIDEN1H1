
import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { Gauge } from './components/Gauge';
import { DataCard } from './components/DataCard';
import { SystemSchematic } from './components/SystemSchematic';
import { HealthStatusCard } from './components/HealthStatusCard';
import { LogCard } from './components/LogCard';
import { PerformanceChart } from './components/PerformanceChart';
import { PumpKinematicsChart } from './components/PumpKinematicsChart';
import { InjectorFlowChart } from './components/InjectorFlowChart';
import { Documentation } from './components/Documentation';
import { PredictiveMaintenanceCard } from './components/PredictiveMaintenanceCard';
import { KalmanGainChart } from './components/KalmanGainChart';
import { SimulationState, FaultType, HealthStatus, FAULT_DESCRIPTIONS, HistoryDataPoint, ManualCalcState, PredictiveAnalysisPayload, SloshIntensity } from './types';
import { INITIAL_STATE, SIMULATION_TICK_RATE_MS, MAX_N1_RPM, MAX_N2_RPM, MAX_TEMP, TARGET_NR_RPM } from './constants';
import { updateSimulation } from './services/simulationService';
import { getPredictiveMaintenanceAnalysis } from './services/aiService';

type Action =
  | { type: 'TOGGLE_SIMULATION' }
  | { type: 'RESET_SIMULATION' }
  | { type: 'TICK' }
  | { type: 'SET_THROTTLE'; payload: number }
  | { type: 'INJECT_FAULT'; payload: FaultType }
  | { type: 'TOGGLE_DOCS' }
  | { type: 'SET_COLLECTIVE_PITCH'; payload: number }
  | { type: 'SET_SLOSH_INTENSITY'; payload: SloshIntensity }
  | { type: 'START_PREDICTION'; payload: { tick: number } }
  | { type: 'SET_PREDICTION_SUCCESS'; payload: { tick: number; analysis: PredictiveAnalysisPayload } }
  | { type: 'SET_PREDICTION_ERROR'; payload: { message: string } };

const reducer = (state: SimulationState, action: Action): SimulationState => {
  switch (action.type) {
    case 'TOGGLE_SIMULATION': {
        if (!state.isRunning) { // Starting
            return {
                ...state,
                isRunning: true,
                logs: [{ timestamp: new Date().toLocaleTimeString(), message: 'Simulation Started. Engine spooling up.', level: HealthStatus.OK }, ...state.logs],
            };
        }
        // Pausing
        return { 
            ...state, 
            isRunning: false,
            logs: [{ timestamp: new Date().toLocaleTimeString(), message: 'Simulation Paused.', level: HealthStatus.OK }, ...state.logs],
        };
    }
    case 'RESET_SIMULATION':
      return {
        ...INITIAL_STATE,
        components: JSON.parse(JSON.stringify(INITIAL_STATE.components)),
        logs: [{ timestamp: new Date().toLocaleTimeString(), message: 'Digital Twin Reset. Ready to start.', level: HealthStatus.OK }],
      };
    case 'TICK': {
        const newState = updateSimulation(state);
        
        const newHistoryPoint: HistoryDataPoint = {
            tick: newState.tick,
            throttle: newState.throttle,
            afr: newState.afr,
            efficiency: newState.efficiency * 100, // as percentage
            injector1Flow: newState.injectorFlows[0],
            pressureHP: newState.pressureHP,
            fuelFlow: newState.fuelFlow,
            exhaustTemp: newState.exhaustTemp,
            kalmanGain: newState.kalmanState.k,
            kalmanFilterQty: newState.kalmanState.x,
        };
        const newHistory = [...state.history, newHistoryPoint].slice(-100);
        return { ...newState, history: newHistory, lastCollectivePitch: state.collectivePitch };
    }
    case 'SET_THROTTLE':
        if (!state.isRunning || !state.isRotorReady) return state;
        return { ...state, throttle: action.payload, lastThrottle: state.throttle };
    case 'SET_COLLECTIVE_PITCH':
        if (!state.isRunning || !state.isRotorReady) return state;
        return { ...state, collectivePitch: action.payload };
    case 'INJECT_FAULT': {
        const isAFREnhanced = action.payload === FaultType.FADEC_AFR_ENHANCED;
        const faultDescription = FAULT_DESCRIPTIONS[action.payload] || 'Unknown Fault';
        const logMessage = isAFREnhanced 
            ? 'Switched to AFR-Enhanced FADEC.' 
            : `Injecting Fault: ${faultDescription}`;
        const logLevel = isAFREnhanced ? HealthStatus.OK : HealthStatus.WARN;

        let manualCalcState: ManualCalcState = state.manualCalc;
        if (action.payload === FaultType.TOTAL_FUELFLOWSENSORSYSTEM_FAILURE) {
            manualCalcState = {
                isActive: true,
                startTick: state.tick,
                startFuel: state.fuelQuantity,
            };
        } else if (state.manualCalc.isActive) {
            // Deactivate if we're switching to another fault or NONE
            manualCalcState = INITIAL_STATE.manualCalc;
        }

        let kalmanStateUpdate = {};
        let sloshIntensity = state.sloshIntensity;
        // If we are *just now* turning on the sloshing fault, reset Kalman filter state
        if (action.payload === FaultType.SLOSHING_FUEL_TANK && state.activeFault !== FaultType.SLOSHING_FUEL_TANK) {
            kalmanStateUpdate = {
                x: state.fuelFlowTotalizer.calculatedFuel, // Start from the current true value
                p: 50.0, // Reset uncertainty
                k: 0,
            };
            sloshIntensity = SloshIntensity.LOW; // Default to low intensity when first selected
        }
        
        // If switching away from sloshing fault, reset intensity to NONE
        if (action.payload !== FaultType.SLOSHING_FUEL_TANK) {
            sloshIntensity = SloshIntensity.NONE;
        }
        
        return {
            ...state,
            activeFault: action.payload,
            isAFREnhanced,
            manualCalc: manualCalcState,
            kalmanState: { ...state.kalmanState, ...kalmanStateUpdate }, // Apply reset if needed
            sloshIntensity: sloshIntensity,
            logs: [{ timestamp: new Date().toLocaleTimeString(), message: logMessage, level: logLevel }, ...state.logs],
        };
    }
    case 'SET_SLOSH_INTENSITY': {
        if (!state.isRunning || state.activeFault !== FaultType.SLOSHING_FUEL_TANK) return state;
        const logMessage = `Sloshing intensity set to: ${action.payload}`;
        return {
            ...state,
            sloshIntensity: action.payload,
            logs: [{ timestamp: new Date().toLocaleTimeString(), message: logMessage, level: HealthStatus.OK }, ...state.logs],
        };
    }
    case 'TOGGLE_DOCS':
        return { ...state, isDocsVisible: !state.isDocsVisible };
    case 'START_PREDICTION':
        return {
            ...state,
            predictiveAnalysis: {
                ...state.predictiveAnalysis,
                status: 'loading',
                summary: null,
                results: [],
                lastRunTick: action.payload.tick,
            },
             logs: [{ timestamp: new Date().toLocaleTimeString(), message: `Starting AI analysis of run history...`, level: HealthStatus.OK }, ...state.logs],
        };
    case 'SET_PREDICTION_SUCCESS': {
        return {
            ...state,
            predictiveAnalysis: {
                ...state.predictiveAnalysis,
                status: 'success',
                summary: action.payload.analysis.summary,
                results: action.payload.analysis.results,
            },
            logs: [{ timestamp: new Date().toLocaleTimeString(), message: `AI analysis at tick ${action.payload.tick} complete.`, level: HealthStatus.OK }, ...state.logs],
        };
    }
    case 'SET_PREDICTION_ERROR':
        return {
            ...state,
            predictiveAnalysis: {
                ...state.predictiveAnalysis,
                status: 'error',
                summary: 'Analysis failed to complete.',
                results: [],
            },
            logs: [{ timestamp: new Date().toLocaleTimeString(), message: action.payload.message, level: HealthStatus.FAULT }, ...state.logs],
        };
    default:
      return state;
  }
};

const App: React.FC = () => {
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
    const stateRef = useRef(state);
    stateRef.current = state;

    // Main simulation timer effect
    useEffect(() => {
        if (!state.isRunning || state.isDocsVisible) return;

        const timerId = setInterval(() => {
            dispatch({ type: 'TICK' });
        }, SIMULATION_TICK_RATE_MS);

        return () => clearInterval(timerId);
    }, [state.isRunning, state.isDocsVisible]);

    const handleRunAnalysis = useCallback(async () => {
        const currentState = stateRef.current;
        if (currentState.predictiveAnalysis.status === 'loading' || currentState.tick === 0) {
            return;
        }

        dispatch({ type: 'START_PREDICTION', payload: { tick: currentState.tick } });
        try {
            const analysisState = JSON.parse(JSON.stringify(currentState));
            const analysis = await getPredictiveMaintenanceAnalysis(analysisState);
            dispatch({ type: 'SET_PREDICTION_SUCCESS', payload: { tick: currentState.tick, analysis } });
        } catch (error) {
            console.error("Predictive analysis failed:", error);
            const logMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            dispatch({ type: 'SET_PREDICTION_ERROR', payload: { message: `AI analysis failed: ${logMessage}` } });
        }
    }, []);

    const handleToggleSimulation = useCallback(() => dispatch({ type: 'TOGGLE_SIMULATION' }), []);
    const handleReset = useCallback(() => dispatch({ type: 'RESET_SIMULATION' }), []);
    const handleThrottleChange = useCallback((value: number) => dispatch({ type: 'SET_THROTTLE', payload: value }), []);
    const handleCollectivePitchChange = useCallback((value: number) => dispatch({ type: 'SET_COLLECTIVE_PITCH', payload: value }), []);
    const handleFaultInjection = useCallback((fault: FaultType) => dispatch({ type: 'INJECT_FAULT', payload: fault }), []);
    const handleSloshIntensityChange = useCallback((intensity: SloshIntensity) => dispatch({ type: 'SET_SLOSH_INTENSITY', payload: intensity }), []);
    const handleToggleDocs = useCallback(() => dispatch({ type: 'TOGGLE_DOCS' }), []);

    const isProbeFailed = state.activeFault === FaultType.FAIL_FUEL_PROBE;
    const isFuelSensorSystemFailed = state.activeFault === FaultType.TOTAL_FUELFLOWSENSORSYSTEM_FAILURE;
    const isSloshingFaultActive = state.activeFault === FaultType.SLOSHING_FUEL_TANK;
    
    // The main fuel quantity display will show the probe reading, which is sourced directly from the simulation state.
    const displayedFuelQty = state.fuelQuantity;
    
    // Endurance Calculation
    // Use the most reliable fuel source available. Totalizer is ground truth.
    const reliableFuelQty = state.fuelFlowTotalizer.calculatedFuel;
    let enduranceDisplay: string;
    let isEnduranceWarning = false;
    let enduranceInHours = 0;

    if (!isProbeFailed && !isFuelSensorSystemFailed && state.fuelFlow > 0) {
        enduranceInHours = reliableFuelQty / state.fuelFlow;
    }

    if (isProbeFailed || isFuelSensorSystemFailed) {
        enduranceDisplay = 'N/A';
    } else if (enduranceInHours > 0) {
        if (enduranceInHours * 60 < 15) { // Warning if less than 15 minutes
            isEnduranceWarning = true;
        }
        const hours = Math.floor(enduranceInHours);
        const minutes = Math.floor((enduranceInHours * 60) % 60);
        enduranceDisplay = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
    } else if (reliableFuelQty > 0) {
        enduranceDisplay = '—'; // Standby, infinite
    } else {
        enduranceDisplay = '00h 00m'; // Depleted
    }

    // Manual Fuel Flow Calculation
    let manualCalcDisplay = 'N/A';
    let manualCalcUnit = '';
    let isManualCalcWarning = false;

    if (state.manualCalc.isActive) {
        isManualCalcWarning = true;
        if (!state.isRunning) {
            manualCalcDisplay = 'Paused';
        } else {
            const deltaTicks = state.tick - state.manualCalc.startTick;
            if (deltaTicks <= 5) {
                manualCalcDisplay = 'Calculating...';
            } else {
                const deltaFuel = state.manualCalc.startFuel - state.fuelQuantity;
                const deltaHours = deltaTicks * (SIMULATION_TICK_RATE_MS / (1000 * 3600));
                const rate = deltaHours > 0 ? deltaFuel / deltaHours : 0;
                manualCalcDisplay = rate.toFixed(1);
                manualCalcUnit = 'L/hr';
            }
        }
    }

    const nrRpmWarning = state.isRunning && state.isRotorReady && Math.abs(state.nrRpm - TARGET_NR_RPM) > 5;

    return (
        <div className="min-h-screen text-slate-800 font-sans p-4 bg-slate-100 selection:bg-cyan-500 selection:text-white">
            <Header onToggleDocs={handleToggleDocs} isDocsVisible={state.isDocsVisible} />
            {state.isDocsVisible ? (
                <Documentation onClose={handleToggleDocs} />
            ) : (
                <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
                    {/* Left Column */}
                    <div className="lg:col-span-3 col-span-12 space-y-4">
                        <ControlPanel
                            isRunning={state.isRunning}
                            throttle={state.throttle}
                            collectivePitch={state.collectivePitch}
                            activeFault={state.activeFault}
                            isRotorReady={state.isRotorReady}
                            analysisStatus={state.predictiveAnalysis.status}
                            sloshIntensity={state.sloshIntensity}
                            onToggle={handleToggleSimulation}
                            onReset={handleReset}
                            onThrottleChange={handleThrottleChange}
                            onCollectivePitchChange={handleCollectivePitchChange}
                            onInjectFault={handleFaultInjection}
                            onRunAnalysis={handleRunAnalysis}
                            onSloshIntensityChange={handleSloshIntensityChange}
                        />
                        <HealthStatusCard components={state.components} />
                    </div>

                    {/* Center Column */}
                    <div className="lg:col-span-6 col-span-12 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Gauge label="N1 RPM" value={state.n1Rpm} maxValue={MAX_N1_RPM} unit="RPM" />
                            <Gauge label="N2 RPM" value={state.n2Rpm} maxValue={MAX_N2_RPM} unit="RPM" />
                        </div>
                         <div className="grid grid-cols-3 gap-4">
                            <DataCard label="Nr RPM" value={state.nrRpm.toFixed(0)} unit="RPM" isWarning={nrRpmWarning} />
                            <DataCard label="Nt RPM" value={state.ntRpm.toFixed(0)} unit="RPM" isWarning={nrRpmWarning} />
                            <DataCard label="Fuel Qty (Sensor)" value={displayedFuelQty.toFixed(1)} unit="L" isWarning={isProbeFailed || isSloshingFaultActive}/>
                            <DataCard label="Fuel Totalizer" value={state.fuelFlowTotalizer.calculatedFuel.toFixed(1)} unit="L" isWarning={isSloshingFaultActive}/>
                            <DataCard label="Kalman Filter Qty" value={state.kalmanState.x.toFixed(1)} unit="L" isWarning={isSloshingFaultActive} />
                            <DataCard label="Fuel Flow" value={isFuelSensorSystemFailed ? 'FAULT' : state.fuelFlow.toFixed(1)} unit={isFuelSensorSystemFailed ? '' : 'L/hr'} isWarning={isFuelSensorSystemFailed} />
                            <DataCard label="HP Pressure" value={state.pressureHP.toFixed(1)} unit="MPa" />
                            <DataCard label="Exhaust Temp" value={state.exhaustTemp.toFixed(0)} unit="K" isWarning={state.exhaustTemp > MAX_TEMP * 0.95}/>
                            <DataCard label="Fuel Temp" value={state.tempFuel.toFixed(1)} unit="°C" isWarning={state.tempFuel > 75}/>
                            <DataCard label="AFR" value={state.afr.toFixed(2)} unit="" isWarning={state.afr > 18 || state.afr < 12} />
                            <DataCard label="Efficiency" value={(state.efficiency * 100).toFixed(1)} unit="%" />
                            <DataCard label="Endurance" value={enduranceDisplay} unit="" isWarning={isEnduranceWarning} />
                            <DataCard label="Mode" value={state.isAFREnhanced ? "AFR+" : "STD"} unit="" />
                            <DataCard label="Manual Flow Rate Calc" value={manualCalcDisplay} unit={manualCalcUnit} isWarning={isManualCalcWarning} />
                        </div>
                        <SystemSchematic components={state.components} isRunning={state.isRunning && state.n1Rpm > 0} />
                        <PerformanceChart data={state.history} />
                        <PumpKinematicsChart data={state.history} />
                        <InjectorFlowChart data={state.history} />
                        <KalmanGainChart data={state.history} />
                    </div>
                    
                    {/* Right Column */}
                    <div className="lg:col-span-3 col-span-12 space-y-4">
                        <LogCard logs={state.logs} />
                        <PredictiveMaintenanceCard analysis={state.predictiveAnalysis} />
                    </div>
                </main>
            )}
        </div>
    );
};

export default App;
