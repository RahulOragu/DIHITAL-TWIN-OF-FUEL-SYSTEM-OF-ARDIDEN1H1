import { SimulationState, HealthStatus, FaultType, ComponentName, SystemComponent, SloshIntensity } from './types';

export const SIMULATION_TICK_RATE_MS = 500; // 2Hz update rate
export const MAX_N1_RPM = 52000;
export const MAX_N2_RPM = 21000;
export const TARGET_NR_RPM = 273; // Main Rotor (100%)
export const TARGET_NT_RPM = 1303; // Tail Rotor (100%)
export const MAX_FUEL = 1400; // Liters
export const IDLE_RPM_N1 = 33800; // 65% of MAX_N1_RPM
export const IDLE_RPM_N2 = 14700; // 70% of MAX_N2_RPM
export const IDLE_TEMP = 293; // Kelvin (20C)
export const MAX_TEMP = 950; // Kelvin
export const MAX_PRESSURE_MPA = 8;
export const MAX_FUEL_TEMP = 80;
export const AMBIENT_FUEL_TEMP = 20;


export const ALL_COMPONENTS: SystemComponent[] = [
  { name: ComponentName.FUEL_TANK, status: HealthStatus.OFF },
  { name: ComponentName.FADEC, status: HealthStatus.OFF },
  { name: ComponentName.START_PURGE_VALVE, status: HealthStatus.OFF },
  { name: ComponentName.FUEL_PRESSURE_TRANSMITTER, status: HealthStatus.OFF },
  { name: ComponentName.FUEL_FILTER, status: HealthStatus.OFF },
  { name: ComponentName.HP_FUEL_PUMP, status: HealthStatus.OFF },
  { name: ComponentName.FUEL_PUMP_UNITS, status: HealthStatus.OFF },
  { name: ComponentName.COMBUSTION_AP_VALVE, status: HealthStatus.OFF },
  { name: ComponentName.FULVALVE_ASSEMBLY, status: HealthStatus.OFF },
  { name: ComponentName.MANUAL_PURGE_VALVE, status: HealthStatus.OFF },
  { name: ComponentName.PRESSURIZING_VALVE, status: HealthStatus.OFF },
  { name: ComponentName.STOP_PURGE_VALVE, status: HealthStatus.OFF },
  { name: ComponentName.START_ELECTRO_VALVE, status: HealthStatus.OFF },
  { name: ComponentName.PREFERENCE_INJECTORS, status: HealthStatus.OFF },
  { name: ComponentName.MAIN_INJECTORS, status: HealthStatus.OFF },
  { name: ComponentName.START_MAIN_INJECTORS, status: HealthStatus.OFF },
  { name: ComponentName.P3_INJECTORS, status: HealthStatus.OFF },
];

export const INITIAL_STATE: SimulationState = {
  isRunning: false,
  throttle: 0,
  lastThrottle: 0,
  collectivePitch: 0,
  lastCollectivePitch: 0,
  n1Rpm: 0,
  n2Rpm: 0,
  nrRpm: 0,
  ntRpm: 0,
  isRotorReady: false,
  fuelQuantity: MAX_FUEL,
  fuelFlow: 0,
  exhaustTemp: IDLE_TEMP,
  pressureHP: 0,
  tempFuel: AMBIENT_FUEL_TEMP,
  afr: 14.7,
  efficiency: 0,
  pumpExtensions: [0, 0, 0, 0],
  injectorFlows: [0, 0, 0, 0],
  activeFault: FaultType.NONE,
  components: JSON.parse(JSON.stringify(ALL_COMPONENTS)),
  logs: [{ timestamp: new Date().toLocaleTimeString(), message: 'Digital Twin Initialized. Ready to start.', level: HealthStatus.OK }],
  manualCalc: {
    isActive: false,
    startTick: 0,
    startFuel: 0,
  },
  isAFREnhanced: false,
  tick: 0,
  history: [],
  isDocsVisible: false,
  predictiveAnalysis: {
    status: 'idle',
    summary: null,
    results: [],
    lastRunTick: 0,
  },
  kalmanState: {
    x: MAX_FUEL,
    p: 50.0,
    k: 0,
  },
  fuelFlowTotalizer: {
    calculatedFuel: MAX_FUEL,
  },
  sloshIntensity: SloshIntensity.NONE,
};