
export enum HealthStatus {
  OK = 'OK',
  WARN = 'WARN',
  FAULT = 'FAULT',
  OFF = 'OFF'
}

export enum FaultType {
  NONE = 'NONE',
  SENSOR_BIAS_N1 = 'SENSOR_BIAS_N1',
  BLOCKAGE_FUEL_LINE = 'BLOCKAGE_FUEL_LINE',
  FAIL_FUEL_PROBE = 'FAIL_FUEL_PROBE',
  INTERMITTENT_WIRING_INJECTOR_1 = 'INTERMITTENT_WIRING_INJECTOR_1',
  CONNECTOR_FAILURE_INJECTOR_2 = 'CONNECTOR_FAILURE_INJECTOR_2',
  TOTAL_FUELFLOWSENSORSYSTEM_FAILURE = 'TOTAL_FUELFLOWSENSORSYSTEM_FAILURE',
  SLOSHING_FUEL_TANK = 'SLOSHING_FUEL_TANK',
  FADEC_AFR_ENHANCED = 'FADEC_AFR_ENHANCED'
}

export const FAULT_DESCRIPTIONS: Record<FaultType, string> = {
  [FaultType.NONE]: 'No active faults. System nominal.',
  [FaultType.SENSOR_BIAS_N1]: 'N1 RPM sensor reporting biased values.',
  [FaultType.BLOCKAGE_FUEL_LINE]: 'Partial blockage in main fuel line.',
  [FaultType.FAIL_FUEL_PROBE]: 'Fuel quantity probe has failed.',
  [FaultType.INTERMITTENT_WIRING_INJECTOR_1]: 'Preference injector has an intermittent connection.',
  [FaultType.CONNECTOR_FAILURE_INJECTOR_2]: 'Main injectors have a connector failure.',
  [FaultType.TOTAL_FUELFLOWSENSORSYSTEM_FAILURE]: 'Total failure of fuel flow sensor system.',
  [FaultType.SLOSHING_FUEL_TANK]: 'Fuel sloshing causing erratic quantity readings.',
  [FaultType.FADEC_AFR_ENHANCED]: 'Switch to AFR-Enhanced FADEC logic.',
};

export enum SloshIntensity {
    NONE = 'NONE',
    LOW = 'LOW (Forward Flight)',
    MEDIUM = 'MEDIUM (Banking Turn)',
    HIGH = 'HIGH (Aggressive Maneuver)',
}

export enum ComponentName {
  FUEL_TANK = 'Fuel Tank',
  FADEC = 'FADEC / FCU',
  HP_FUEL_PUMP = 'HP Fuel Pump',
  FUEL_FILTER = 'Fuel Filter',
  FULVALVE_ASSEMBLY = 'Fulvalve Assembly',
  PRESSURIZING_VALVE = 'Pressurizing Valve',
  START_ELECTRO_VALVE = 'Start Electro Valve',
  PREFERENCE_INJECTORS = 'Preference Injectors',
  MAIN_INJECTORS = 'Main Injectors',
  COMBUSTION_AP_VALVE = 'Combustion AP Valve',
  FUEL_PUMP_UNITS = 'Fuel Pump Units',
  START_PURGE_VALVE = 'Start Purge Valve',
  FUEL_PRESSURE_TRANSMITTER = 'Fuel Pressure Transmitter',
  MANUAL_PURGE_VALVE = 'Manual Purge Valve',
  STOP_PURGE_VALVE = 'Stop Purge Valve',
  START_MAIN_INJECTORS = 'Start/Main Injectors',
  P3_INJECTORS = 'P3 Injectors',
}


export interface SystemComponent {
  name: ComponentName;
  status: HealthStatus;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  level: HealthStatus;
}

export interface HistoryDataPoint {
    tick: number;
    throttle: number;
    afr: number;
    efficiency: number;
    injector1Flow: number;
    pressureHP: number;
    fuelFlow: number;
    exhaustTemp: number;
    kalmanGain: number;
    kalmanFilterQty: number;
}

export interface ManualCalcState {
    isActive: boolean;
    startTick: number;
    startFuel: number;
}

export interface PredictiveMaintenanceResult {
    componentName: ComponentName | string;
    prediction: string;
    confidence: number; // 0 to 1
    recommendation: string;
    estimatedTimeToFailureHours?: number;
}

export interface PredictiveAnalysisPayload {
    summary: string;
    results: PredictiveMaintenanceResult[];
}

export interface SimulationState {
  isRunning: boolean;
  throttle: number; // 0-100
  lastThrottle: number;
  collectivePitch: number; // -2 to 15 degrees
  lastCollectivePitch: number;
  n1Rpm: number;
  n2Rpm: number;
  nrRpm: number; // Main Rotor RPM
  ntRpm: number; // Tail Rotor RPM
  isRotorReady: boolean;
  fuelQuantity: number; // in Liters, represents the SENSOR reading
  fuelFlow: number; // L/hr
  exhaustTemp: number; // in Kelvin
  pressureHP: number; // in MPa
  tempFuel: number; // in Celsius
  afr: number;
  efficiency: number; // 0-1
  pumpExtensions: number[]; // Array of 4
  injectorFlows: number[]; // Array of 4
  activeFault: FaultType;
  components: SystemComponent[];
  logs: LogEntry[];
  manualCalc: ManualCalcState;
  isAFREnhanced: boolean;
  tick: number;
  history: HistoryDataPoint[];
  isDocsVisible: boolean;
  predictiveAnalysis: {
    status: 'idle' | 'loading' | 'success' | 'error';
    summary: string | null;
    results: PredictiveMaintenanceResult[];
    lastRunTick: number;
  };
  kalmanState: {
    x: number; // estimated fuel quantity
    p: number; // estimate covariance
    k: number; // kalman gain
  };
  fuelFlowTotalizer: {
    calculatedFuel: number; // Ground truth fuel level
  };
  sloshIntensity: SloshIntensity;
}
