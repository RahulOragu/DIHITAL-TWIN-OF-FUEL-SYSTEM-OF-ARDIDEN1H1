

import React from 'react';

interface DocumentationProps {
    onClose: () => void;
}

const DocSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-2xl font-bold text-cyan-600 mb-4 pb-2 border-b border-slate-200">{title}</h2>
        <div className="space-y-4 text-slate-700 leading-relaxed">{children}</div>
    </div>
);

const Formula: React.FC<{ children: React.ReactNode, caption?: string }> = ({ children, caption }) => (
    <div className="bg-slate-100 p-4 rounded-md my-2 border border-slate-200">
        <div className="text-center">
            <code className="text-cyan-700 text-sm md:text-base">{children}</code>
        </div>
        {caption && <p className="text-xs text-slate-500 mt-2 text-center italic">{caption}</p>}
    </div>
);

const Definition: React.FC<{ term: string, children: React.ReactNode }> = ({ term, children }) => (
    <div className="pl-4 border-l-2 border-slate-300">
        <dt className="font-bold text-slate-800">{term}</dt>
        <dd className="mt-1 text-slate-600">{children}</dd>
    </div>
);


export const Documentation: React.FC<DocumentationProps> = ({ onClose }) => {
    return (
        <div className="max-w-5xl mx-auto mt-6">

            <DocSection title="Digital Twin Overview">
                <p>
                    Welcome to the documentation for the Helicopter Fuel System Digital Twin. This interactive simulation models the Multi-Pump Fuel Injection System (MPS) of a Turbomeca Shakti 1H1 engine. Its purpose is to provide a high-fidelity environment for real-time monitoring, performance analysis, and the study of failure modes.
                </p>
                <p>
                    This guide explains the simulation's core logic, the meaning of each data point, the system's architecture, and how to use the control features.
                </p>
            </DocSection>

            <DocSection title="System Schematic Explained">
                <p>
                    The schematic provides a visual representation of the fuel's journey from the tank to the injectors. Each component's border color indicates its health status: <span className="font-semibold text-green-600">Green</span> for OK, <span className="font-semibold text-yellow-500">Yellow</span> for Warning, and <span className="font-semibold text-red-500">Red</span> for Fault. The flow lines are animated and colored based on the overall system health.
                </p>
                <div className="space-y-3 mt-4">
                    <Definition term="Fuel Tank">
                        The source of fuel. Its status changes to WARN on low fuel and FAULT when empty.
                    </Definition>
                    <Definition term="HP Fuel Pump">
                        The heart of the system. It increases fuel pressure to the level required for injection. Its performance is directly tied to the N1 RPM.
                    </Definition>
                    <Definition term="Fuel Filter">
                        Removes contaminants from the fuel. A blockage here (simulated fault) will reduce pressure and fuel flow downstream.
                    </Definition>
                    <Definition term="FADEC / FCU">
                        The brain of the system. This electronic controller monitors all sensors and precisely manages fuel flow, engine RPM, and other parameters to ensure optimal and safe operation. It sends control signals to valves and actuators.
                    </Definition>
                    <Definition term="Valves (Start, Purge, Pressurizing, etc.)">
                        These components direct the flow of fuel during different phases of operation, such as engine start-up, normal running, and shutdown.
                    </Definition>
                     <Definition term="Injectors (Preference & Main)">
                        The final stage. These components atomize and inject fuel into the combustion chamber. The simulation models their flow rate based on commands from the FADEC and the health of the system.
                    </Definition>
                </div>
            </DocSection>

            <DocSection title="Core Simulation Logic">
                 <p>
                    The simulation runs on a discrete clock cycle. In each "tick," the state of the entire system is recalculated based on the previous state and user inputs. The core formulas governing the system are detailed in the Data Cards section below.
                </p>
            </DocSection>
            
            <DocSection title="Dashboard Data Cards Explained">
                <p>Each card on the dashboard displays a critical piece of information from the simulation, governed by the formulas below.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-4">
                    <Definition term="N1 / N2 RPM (Gauges)">
                        <p>N1 is the gas generator speed, and N2 is the power turbine speed. The FADEC calculates a target N1 based on throttle input, and the actual RPM smoothly accelerates towards it.</p>
                        <Formula>Target N1 = Idle N1 + (Throttle/100) * (Max N1 - Idle N1)</Formula>
                    </Definition>
                    <Definition term="Nr / Nt RPM">
                        <p>Main (Nr) and Tail (Nt) Rotor speed. The governor corrects for rotor speed deviations by adjusting the throttle demand.</p>
                        <Formula>Correction ∝ (Target Nr - Current Nr)</Formula>
                    </Definition>
                    <Definition term="Fuel Qty (Sensor)">
                       <p>Displays the reading from the primary fuel probe. This value is intentionally made unreliable during `FAIL_FUEL_PROBE` and `SLOSHING_FUEL_TANK` faults.</p>
                       <Formula caption="During sloshing fault">Fuel Qty = True Fuel + Slosh Noise</Formula>
                    </Definition>
                    <Definition term="Fuel Totalizer">
                        <p>Calculates fuel by subtracting consumption from the initial amount. It serves as the simulation's ground truth.</p>
                        <Formula>New Fuel = Prev Fuel - (Flow * (Tick Rate / 3.6e6))</Formula>
                    </Definition>
                    <Definition term="Kalman Filter Qty">
                        <p>The filtered fuel quantity calculated by the Kalman Filter. It provides a stable, smoothed value by processing the noisy sensor readings. See the dedicated Kalman Filter section for full formulas.</p>
                        <Formula caption="Core update logic">New Value = Prediction + Gain * (Sensor Value - Prediction)</Formula>
                    </Definition>
                    <Definition term="Fuel Flow">
                        <p>The rate of fuel consumption, modeled non-linearly based on the engine's power output (N1 RPM).</p>
                        <Formula>Flow ∝ (Effective N1 throttle) ^ 1.2</Formula>
                    </Definition>
                    <Definition term="HP Pressure">
                       <p>The High-Pressure fuel line pressure, which increases exponentially with engine speed.</p>
                        <Formula>Pressure = Max P * (N1 RPM / Max N1) ^ 1.8</Formula>
                    </Definition>
                    <Definition term="Exhaust Temp">
                        <p>Exhaust Gas Temperature (EGT) is a key indicator of engine load and health.</p>
                        <Formula>EGT = Idle Temp + (N1 RPM / Max N1) * (Max Temp - Idle Temp)</Formula>
                    </Definition>
                    <Definition term="Fuel Temp">
                        <p>The fuel temperature increases based on heat exchange with the engine, influenced by EGT.</p>
                        <Formula>ΔTemp ∝ (EGT - Ambient Temp)</Formula>
                    </Definition>
                    <Definition term="AFR (Air-Fuel Ratio)">
                        <p>The ratio is dynamically adjusted based on how quickly the pilot changes the throttle.</p>
                         <Formula>AFR = Base AFR - ( |ΔThrottle| * Factor )</Formula>
                    </Definition>
                    <Definition term="Efficiency">
                        <p>Represents the engine's thermal efficiency. It starts from a base value and is reduced by factors like injector faults that cause vibration and incomplete combustion.</p>
                         <Formula>Efficiency = Base Efficiency - Fault Penalties</Formula>
                    </Definition>
                    <Definition term="Endurance">
                        <p>The estimated flight time remaining, calculated using the most reliable fuel source and current consumption rate.</p>
                        <Formula>Endurance (hr) = Fuel Totalizer / Fuel Flow</Formula>
                    </Definition>
                     <Definition term="Mode (STD / AFR+)">
                        <p>Indicates the active FADEC logic. STD is the standard mode, while AFR+ is an enhanced mode that improves efficiency and responsiveness.</p>
                    </Definition>
                </div>
            </DocSection>

            <DocSection title="FADEC & Fault Injection">
                <h3 className="text-xl font-semibold text-slate-800 mt-2 mb-2">FADEC Modes</h3>
                <p>The FADEC can operate in two modes, selectable via the "Fault Injection" dropdown:</p>
                <ul className="list-disc list-inside pl-4 mt-2 space-y-2">
                    <li><strong>Standard (STD):</strong> The default engine control logic.</li>
                    <li><strong>AFR-Enhanced (AFR+):</strong> A more advanced logic that actively optimizes the air-fuel ratio. This results in about 8% better fuel efficiency, 5% more power output, and faster engine response.</li>
                </ul>
                <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-2">Simulated Faults</h3>
                <p>You can inject various faults to observe their impact on the system:</p>
                <ul className="list-disc list-inside pl-4 mt-2 space-y-2">
                    <li><strong>Sensor Bias (N1):</strong> Causes the N1 RPM sensor to report fluctuating, incorrect values, forcing the FADEC to make poor adjustments.</li>
                    <li><strong>Blockage Fuel Line:</strong> Simulates a clogged fuel filter, causing a drop in pressure and performance, and an increase in EGT.</li>
                    <li><strong>Fail Fuel Probe:</strong> The primary fuel quantity sensor fails, reporting a fixed, incorrect value.</li>
                    <li><strong>Injector Wiring/Connector Faults:</strong> Simulates intermittent or permanent failures on injectors, causing power loss and engine vibration.</li>
                    <li><strong>Sloshing Fuel Tank:</strong> Simulates fuel sloshing during maneuvers. This makes the `Fuel Qty (Sensor)` reading highly erratic. You can select the intensity:
                        <ul className="list-decimal list-inside pl-6 mt-1">
                           <li><strong>Low:</strong> Simulates gentle forward flight.</li>
                           <li><strong>Medium:</strong> Simulates a coordinated banking turn.</li>
                           <li><strong>High:</strong> Simulates an aggressive, rapid maneuver.</li>
                        </ul>
                    </li>
                </ul>
            </DocSection>
            
            <DocSection title="Kalman Filter Implementation">
                <p>
                    When the `SLOSHING_FUEL_TANK` fault is active, a Kalman Filter is used to provide a reliable fuel quantity value. The filter works in a two-step process: Predict and Update.
                </p>
                <p>
                    <strong>1. Prediction:</strong> The filter first predicts what the next fuel quantity will be, based on its previous state. Since fuel is always decreasing during operation, we account for this model uncertainty with Process Noise (<var>Q</var>).
                </p>
                 <Formula>x̂<sub>p</sub> = A * x<sub>prev</sub>  &nbsp;&nbsp; | &nbsp;&nbsp; P<sub>p</sub> = A * P<sub>prev</sub> * A<sup>T</sup> + Q</Formula>
                <p>
                    <strong>2. Update:</strong> The filter calculates the Kalman Gain (<var>K</var>), which determines how much to trust the new, noisy sensor measurement (<var>z</var>) versus its own prediction. It then calculates the final, updated fuel quantity (<var>x</var>) and its uncertainty (<var>P</var>). This value <var>x</var> is what is displayed in the "Kalman Filter Qty" data card and graph.
                </p>
                 <Formula>K = P<sub>p</sub> * H<sup>T</sup> * (H * P<sub>p</sub> * H<sup>T</sup> + R)<sup>-1</sup></Formula>
                 <Formula>x = x̂<sub>p</sub> + K * (z - H * x̂<sub>p</sub>) &nbsp;&nbsp; | &nbsp;&nbsp; P = (I - K * H) * P<sub>p</sub></Formula>
                <p>
                    The Measurement Noise (<var>R</var>) is a critical parameter that represents the variance of the sensor noise. In this simulation, <var>R</var> is dynamically adjusted based on the selected slosh intensity to optimize the filter's performance under different conditions.
                </p>
            </DocSection>

            <DocSection title="Predictive Maintenance AI Model">
                <p>
                    The "Run AI Analysis" feature uses the Gemini Large Language Model to act as a Prognostic Reasoning Module. It analyzes the entire operational history of the current session, looking at trends, stress events, and the final system state.
                </p>
                 <p>
                    It synthesizes data like mechanical stress cycles (from rapid throttle changes), thermal stress events (from high EGT), and overall efficiency trends to identify which components have been subjected to the most wear. Based on this holistic analysis, it provides a high-level summary, specific component predictions, and actionable maintenance recommendations.
                </p>
            </DocSection>
            
            <div className="text-center mt-6">
                 <button
                    onClick={onClose}
                    className="px-6 py-2 bg-cyan-600 text-white font-bold rounded-md hover:bg-cyan-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 focus:ring-cyan-500"
                    aria-label="Close documentation"
                >
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
};