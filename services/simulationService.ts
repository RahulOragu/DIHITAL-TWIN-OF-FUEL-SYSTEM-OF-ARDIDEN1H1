import { SimulationState, FaultType, HealthStatus, ComponentName, LogEntry, SystemComponent, SloshIntensity } from '../types';
import { MAX_N1_RPM, MAX_N2_RPM, IDLE_RPM_N1, IDLE_RPM_N2, MAX_FUEL, IDLE_TEMP, MAX_TEMP, SIMULATION_TICK_RATE_MS, MAX_PRESSURE_MPA, MAX_FUEL_TEMP, AMBIENT_FUEL_TEMP, TARGET_NR_RPM, TARGET_NT_RPM } from '../constants';

function createLog(message: string, level: HealthStatus): LogEntry {
    return { timestamp: new Date().toLocaleTimeString(), message, level };
}

function updateComponentStatus(components: SystemComponent[], name: ComponentName, status: HealthStatus) {
    const component = components.find(c => c.name === name);
    if (component && component.status !== HealthStatus.FAULT) {
        component.status = status;
    }
}

export const updateSimulation = (state: SimulationState): SimulationState => {
    if (!state.isRunning) return state;

    const newState: SimulationState = JSON.parse(JSON.stringify(state));
    newState.tick++;
    const newLogs: LogEntry[] = [];

    // The state from the last tick becomes the "last" state for this tick's calculations
    const pitchChange = state.collectivePitch - state.lastCollectivePitch;
    newState.lastCollectivePitch = state.collectivePitch; // Update for the next tick

    newState.components.forEach(c => c.status = HealthStatus.OFF);
    if (state.n1Rpm > 1) {
         newState.components.forEach(c => c.status = HealthStatus.OK);
    }
    
    let targetN1Rpm: number;
    let targetN2Rpm: number;

    let nrRpm = state.nrRpm;
    let governorCorrection = 0;

    // --- GOVERNOR & ROTOR DYNAMICS ---
    if (state.isRotorReady && state.fuelFlowTotalizer.calculatedFuel > 0) {
        // 1. Calculate the immediate effect of collective pitch change on rotor RPM.
        // This simulates the sudden change in aerodynamic drag.
        if (Math.abs(pitchChange) > 0.05) {
            // A sudden increase in pitch increases drag, dropping RPM.
            // A sudden decrease in pitch decreases drag, increasing RPM.
            const dragEffect = pitchChange * 4; // A scaling factor for sensitivity
            nrRpm -= dragEffect;
            if (pitchChange > 0 && newState.tick % 4 === 1) {
                 newLogs.push(createLog(`Collective up, rotor droop detected. Compensating.`, HealthStatus.OK));
            } else if (pitchChange < 0 && newState.tick % 4 === 1) {
                 newLogs.push(createLog(`Collective down, rotor overspeed detected. Compensating.`, HealthStatus.OK));
            }
        }

        // 2. The FADEC/governor tries to correct any deviation from the target rotor RPM.
        // This is a simple proportional controller.
        const rpmError = TARGET_NR_RPM - nrRpm;
        governorCorrection = rpmError * 0.1; // Proportional gain. This will be added to the throttle demand.

        // 3. Rotors have inertia and will tend towards the target RPM, pushed by the engine.
        const inertiaFactor = 0.1;
        nrRpm += (TARGET_NR_RPM - nrRpm) * inertiaFactor;
    }

    // State machine for engine/rotor state
    if (!state.isRotorReady && state.fuelFlowTotalizer.calculatedFuel > 0) {
        // ---- STARTUP SEQUENCE ----
        targetN1Rpm = IDLE_RPM_N1;
        targetN2Rpm = IDLE_RPM_N2;
        
        if (state.n1Rpm > IDLE_RPM_N1 * 0.1) {
             const rampFactor = 0.08;
             newState.nrRpm = state.nrRpm + (TARGET_NR_RPM - state.nrRpm) * rampFactor;
             newState.ntRpm = state.ntRpm + (TARGET_NT_RPM - state.ntRpm) * rampFactor;
        }

        if (newState.nrRpm >= TARGET_NR_RPM - 1) {
            newState.isRotorReady = true;
            newState.nrRpm = TARGET_NR_RPM;
            newState.ntRpm = TARGET_NT_RPM;
            newLogs.push(createLog('Main and tail rotors at speed. System ready.', HealthStatus.OK));
        }
    } else if (state.isRotorReady && state.fuelFlowTotalizer.calculatedFuel > 0) {
        // ---- NORMAL OPERATION ----
        // Governor adjusts throttle demand to maintain rotor speed against load from collective pitch.
        const demandedThrottle = Math.min(110, Math.max(0, state.throttle + governorCorrection)); // Clamp demanded throttle
        
        targetN1Rpm = IDLE_RPM_N1 + (demandedThrottle / 100) * (MAX_N1_RPM - IDLE_RPM_N1);
        targetN2Rpm = IDLE_RPM_N2 + (demandedThrottle / 100) * (MAX_N2_RPM - IDLE_RPM_N2);

        // Update the rotor speeds based on the governor/dynamics calculations
        newState.nrRpm = nrRpm;
        newState.ntRpm = nrRpm * (TARGET_NT_RPM / TARGET_NR_RPM); // Tail rotor follows main rotor
    } else { 
        // ---- SHUTDOWN SEQUENCE (e.g., out of fuel) ----
        targetN1Rpm = 0;
        targetN2Rpm = 0;
        newState.nrRpm = Math.max(0, state.nrRpm * 0.98); // Slower decay for rotors
        newState.ntRpm = Math.max(0, state.ntRpm * 0.98);
        if (state.isRotorReady) {
            newState.isRotorReady = false;
        }
    }

    // 1. Calculate base performance
    const responsiveness = state.isAFREnhanced ? 0.4 : 0.25;
    let n1Rpm = state.n1Rpm + (targetN1Rpm - state.n1Rpm) * responsiveness;
    if(n1Rpm < 0.1) n1Rpm = 0;
    
    let n2Rpm = state.n2Rpm + (targetN2Rpm - state.n2Rpm) * responsiveness;
    if(n2Rpm < 0.1) n2Rpm = 0;

    // More realistic fuel flow calculation based on N1 RPM
    let baseFuelFlow: number;
    const n1Ratio = n1Rpm / MAX_N1_RPM;
    const idleN1Ratio = IDLE_RPM_N1 / MAX_N1_RPM; // ~0.65

    if (n1Rpm < 1) {
        baseFuelFlow = 0;
    } else if (n1Ratio < idleN1Ratio) {
        // Startup sequence fuel flow ramps up to idle requirement
        const startupProgress = n1Ratio / idleN1Ratio;
        baseFuelFlow = 35 + 60 * Math.pow(startupProgress, 2); // Ramps from 35 to 95 L/hr
    } else {
        // Normal operation fuel flow (from idle to max)
        const idleFlow = 95;
        const maxFlow = 380;
        // Map the N1 range from idle (0.65) to max (1.0) to the fuel flow range
        const throttleEffect = (n1Ratio - idleN1Ratio) / (1 - idleN1Ratio); // Ranges from 0 to 1
        baseFuelFlow = idleFlow + (maxFlow - idleFlow) * Math.pow(throttleEffect, 1.2); // Non-linear response
    }
    
    let pressureHP = MAX_PRESSURE_MPA * Math.pow(n1Rpm / MAX_N1_RPM, 1.8); // Use power law for pressure

    let exhaustTemp = IDLE_TEMP + (n1Rpm / MAX_N1_RPM) * (MAX_TEMP - IDLE_TEMP);

    let performanceModifier = 1.0;
    let vibrationFactor = 0;
    let efficiency = 0.35; // Base thermal efficiency (more realistic for a turboshaft)
    let afr = 14.7;

    // 2. Apply fault effects
    switch (state.activeFault) {
        case FaultType.SENSOR_BIAS_N1:
            const bias = 0.15 * Math.sin(newState.tick * 0.5);
            n1Rpm *= (1 + bias);
            updateComponentStatus(newState.components, ComponentName.FADEC, HealthStatus.WARN);
            if (newState.tick % 20 === 1) newLogs.push(createLog('N1 sensor reading fluctuates.', HealthStatus.WARN));
            break;

        case FaultType.BLOCKAGE_FUEL_LINE:
            performanceModifier *= 0.6;
            pressureHP *= 0.5;
            exhaustTemp *= 1.1;
            afr *= 1.2;
            efficiency *= 0.75;
            updateComponentStatus(newState.components, ComponentName.FUEL_FILTER, HealthStatus.FAULT);
            updateComponentStatus(newState.components, ComponentName.HP_FUEL_PUMP, HealthStatus.WARN);
            if (newState.tick % 10 === 1) newLogs.push(createLog('Low fuel pressure. Possible blockage in filter.', HealthStatus.FAULT));
            break;

        case FaultType.FAIL_FUEL_PROBE:
            updateComponentStatus(newState.components, ComponentName.FADEC, HealthStatus.FAULT);
            if (newState.tick % 20 === 1) newLogs.push(createLog('Fuel probe signal lost. Reading unreliable.', HealthStatus.FAULT));
            break;
        
        case FaultType.INTERMITTENT_WIRING_INJECTOR_1:
             if (newState.tick % 4 < 2) {
                performanceModifier *= 0.9;
                vibrationFactor += 0.1;
                pressureHP *= 1.05;
                updateComponentStatus(newState.components, ComponentName.PREFERENCE_INJECTORS, HealthStatus.WARN);
                if (newState.tick % 4 === 1) newLogs.push(createLog('Intermittent fault on Preference Injector.', HealthStatus.WARN));
             }
            break;
        
        case FaultType.CONNECTOR_FAILURE_INJECTOR_2:
            performanceModifier *= 0.8;
            vibrationFactor += 0.25;
            pressureHP *= 1.1;
            updateComponentStatus(newState.components, ComponentName.MAIN_INJECTORS, HealthStatus.FAULT);
            if (newState.tick % 10 === 1) newLogs.push(createLog('Permanent fault on Main Injectors.', HealthStatus.FAULT));
            break;
            
        case FaultType.TOTAL_FUELFLOWSENSORSYSTEM_FAILURE:
            updateComponentStatus(newState.components, ComponentName.FADEC, HealthStatus.FAULT);
            if (newState.tick % 10 === 1) newLogs.push(createLog('Primary fuel flow sensor system has failed.', HealthStatus.FAULT));
            break;
        
        case FaultType.SLOSHING_FUEL_TANK:
             updateComponentStatus(newState.components, ComponentName.FADEC, HealthStatus.WARN);
             if (newState.tick % 15 === 1) newLogs.push(createLog('Fuel quantity sensor erratic due to sloshing.', HealthStatus.WARN));
             break;
    }
    
    n1Rpm *= (1 + vibrationFactor * (Math.random() - 0.5));
    n2Rpm *= (1 + vibrationFactor * (Math.random() - 0.5));

    if (state.isAFREnhanced) {
        baseFuelFlow *= 0.92; // AFR+ is more efficient, use slightly less fuel
        performanceModifier *= 1.05; 
        efficiency = 0.38; // Slight efficiency gain
        const throttleDiff = Math.abs(state.throttle - state.lastThrottle);
        afr = 16.0 - (throttleDiff * 0.05);
        if (state.activeFault === FaultType.NONE && newState.tick % 30 === 1) {
             newLogs.push(createLog('AFR+ FADEC optimizing fuel mixture.', HealthStatus.OK));
        }
    } else {
        const throttleDiff = Math.abs(state.throttle - state.lastThrottle);
        afr -= (throttleDiff * 0.1);
    }
    
    newState.n1Rpm = n1Rpm * performanceModifier;
    newState.n2Rpm = n2Rpm * performanceModifier;
    newState.fuelFlow = baseFuelFlow * performanceModifier;
    newState.exhaustTemp = exhaustTemp * performanceModifier;
    newState.pressureHP = pressureHP * performanceModifier;
    newState.afr = afr * (1 + vibrationFactor * (Math.random() - 0.1));
    newState.efficiency = Math.max(0, efficiency - vibrationFactor);

    // Pump & Injector Kinematics
    const camAngle = (newState.tick * (newState.n1Rpm / 100)) % 360;
    const phase = (offset: number) => (camAngle + offset) * (Math.PI / 180);
    newState.pumpExtensions = [
        5 * (1 + Math.sin(phase(0))),
        5 * (1 + Math.sin(phase(270))),
        5 * (1 + Math.sin(phase(90))),
        5 * (1 + Math.sin(phase(180))),
    ];
    newState.injectorFlows = newState.pumpExtensions.map((ext, i) => (ext > 9.8 && newState.n1Rpm > 1) ? 8.4 : 0);

    if(state.activeFault === FaultType.INTERMITTENT_WIRING_INJECTOR_1 && (newState.tick % 4 < 2)) {
        newState.injectorFlows[0] = 0;
    }
    if(state.activeFault === FaultType.CONNECTOR_FAILURE_INJECTOR_2) {
        newState.injectorFlows[1] = 0;
    }

    const tempDiff = state.exhaustTemp - IDLE_TEMP;
    const heating = (tempDiff > 0) ? tempDiff * 0.0005 : 0;
    const cooling = 0.1;
    newState.tempFuel = Math.max(AMBIENT_FUEL_TEMP, Math.min(MAX_FUEL_TEMP, state.tempFuel + heating - cooling));

    // --- FUEL QUANTITY & REDUNDANT SYSTEMS ---
    // 1. Fuel Flow Totalizer: This is the ground truth.
    const fuelConsumed = newState.fuelFlow * (SIMULATION_TICK_RATE_MS / (1000 * 3600));
    const newCalculatedFuel = state.fuelFlowTotalizer.calculatedFuel - fuelConsumed;
    newState.fuelFlowTotalizer.calculatedFuel = Math.max(0, newCalculatedFuel);

    // Update Fuel Tank status based on fuel level
    const fuelTank = newState.components.find(c => c.name === ComponentName.FUEL_TANK);
    if (fuelTank) {
        // The default status is set at the start of the function (OFF or OK).
        // We only need to override it for low fuel conditions when the engine is running.
        if (n1Rpm > 1) {
            const fuelRatio = newState.fuelFlowTotalizer.calculatedFuel / MAX_FUEL;
            if (fuelRatio <= 0) {
                fuelTank.status = HealthStatus.FAULT;
            } else if (fuelRatio <= 0.15) {
                fuelTank.status = HealthStatus.WARN;
            }
        }
    }

    // 2. Main Sensor Reading (`fuelQuantity`): This is based on ground truth, but with faults applied.
    let sensorFuelQuantity: number;
    let sloshNoise = 0;
    let kalmanR = 35.0; // Default measurement noise covariance

    if (state.activeFault === FaultType.FAIL_FUEL_PROBE) {
        sensorFuelQuantity = 735.5;
    } else if (state.activeFault === FaultType.SLOSHING_FUEL_TANK) {
        const baseFuel = newState.fuelFlowTotalizer.calculatedFuel;
        switch (state.sloshIntensity) {
            case SloshIntensity.LOW:
                sloshNoise = (Math.random() - 0.5) * 30; // +/- 15L fluctuation
                kalmanR = 75; // Variance = (30^2)/12
                break;
            case SloshIntensity.MEDIUM:
                sloshNoise = (Math.random() - 0.5) * 80; // +/- 40L fluctuation
                kalmanR = 533; // Variance = (80^2)/12
                break;
            case SloshIntensity.HIGH:
                sloshNoise = (Math.random() - 0.5) * 150; // +/- 75L fluctuation
                kalmanR = 1875; // Variance = (150^2)/12
                break;
        }
        sensorFuelQuantity = Math.max(0, baseFuel + sloshNoise);
    } else {
        // No fault affecting the sensor directly
        sensorFuelQuantity = newState.fuelFlowTotalizer.calculatedFuel;
    }
    newState.fuelQuantity = sensorFuelQuantity;

    // 3. Kalman Filter: This smooths the (potentially noisy) sensor reading.
    let { x, p } = state.kalmanState;
    const A = 1; // State transition matrix
    const H = 1; // Measurement matrix
    const Q = 1.0; // Process noise covariance (accounts for model uncertainty/fuel consumption)
    const R = kalmanR; // Use the dynamically calculated R based on slosh intensity
    
    // Prediction step
    const xp = A * x;
    const Pp = A * p * A + Q;
    // Update step
    const K = Pp * H / (H * Pp * H + R);
    const z = newState.fuelQuantity; // Current (noisy or failed) measurement
    const new_x = xp + K * (z - H * xp);
    const new_p = (1 - K * H) * Pp;
    newState.kalmanState = { x: new_x, p: new_p, k: K };

    // --- END OF FUEL ---
    if (newState.fuelFlowTotalizer.calculatedFuel <= 0 && state.fuelFlowTotalizer.calculatedFuel > 0) {
        newState.throttle = 0;
        newLogs.push(createLog('Fuel depleted. Engine shutting down.', HealthStatus.FAULT));
    }
    
    if (newState.n1Rpm < 1 && state.n1Rpm > 0 && targetN1Rpm === 0) {
        if (state.n1Rpm >= 1) {
            newLogs.push(createLog('Engine Off.', HealthStatus.OK));
        }
        newState.n1Rpm = 0;
        newState.n2Rpm = 0;
        newState.fuelFlow = 0;
        newState.pressureHP = 0;
        newState.afr = 14.7;
        newState.efficiency = 0;
        newState.injectorFlows = [0,0,0,0];
        newState.components.forEach(c => c.status = HealthStatus.OFF);
        newState.nrRpm = 0;
        newState.ntRpm = 0;
    }

    if(!state.isRunning || newState.fuelFlow === 0) {
       newState.exhaustTemp = Math.max(IDLE_TEMP, state.exhaustTemp - 10);
       newState.tempFuel = Math.max(AMBIENT_FUEL_TEMP, state.tempFuel - 0.5);
    }
    
    if (newState.exhaustTemp > MAX_TEMP * 0.95) {
        updateComponentStatus(newState.components, ComponentName.FADEC, HealthStatus.WARN);
        newLogs.push(createLog('Exhaust temperature nearing critical limit!', HealthStatus.WARN));
    }

    newState.logs = [...newLogs, ...state.logs].slice(0, 100);

    return newState;
};