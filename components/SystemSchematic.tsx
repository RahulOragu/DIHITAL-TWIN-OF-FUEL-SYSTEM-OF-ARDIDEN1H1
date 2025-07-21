import React from 'react';
import { SystemComponent, HealthStatus, ComponentName } from '../types';

interface SystemSchematicProps {
  components: SystemComponent[];
  isRunning: boolean;
}

const getStatusClass = (status: HealthStatus): string => {
    switch (status) {
        case HealthStatus.OK:
            return 'fill-green-500/20 stroke-green-500';
        case HealthStatus.WARN:
            return 'fill-yellow-500/20 stroke-yellow-500 animate-pulse';
        case HealthStatus.FAULT:
            return 'fill-red-500/20 stroke-red-500 animate-pulse';
        case HealthStatus.OFF:
        default:
            return 'fill-slate-200/50 stroke-slate-400';
    }
};

const getLineStatusClass = (status: HealthStatus, isRunning: boolean): string => {
    if (!isRunning) return 'stroke-slate-300';
    switch (status) {
        case HealthStatus.OK:
            return 'stroke-cyan-500 animated-flow';
        case HealthStatus.WARN:
            return 'stroke-yellow-500 animated-flow';
        case HealthStatus.FAULT:
            return 'stroke-red-500 animated-flow';
        default:
            return 'stroke-slate-300';
    }
};


const Label: React.FC<{ x: number, y: number, children: React.ReactNode, anchor?: 'start' | 'middle' | 'end'}> = ({ x, y, children, anchor = 'start' }) => (
    <text x={x} y={y} textAnchor={anchor} className="label">{children}</text>
);

const ComponentBox: React.FC<{ x:number, y:number, w:number, h:number, name: ComponentName, components: SystemComponent[] }> = ({ x,y,w,h, name, components }) => {
    const status = components.find(c => c.name === name)?.status || HealthStatus.OFF;
    return <rect x={x} y={y} width={w} height={h} className={`comp-rect ${getStatusClass(status)}`} aria-label={name} />;
};


export const SystemSchematic: React.FC<SystemSchematicProps> = ({ components, isRunning }) => {
    const getStatus = (name: ComponentName): HealthStatus => {
        return components.find(c => c.name === name)?.status || HealthStatus.OFF;
    };
    
    const fadcStatus = getStatus(ComponentName.FADEC);
    const mainLineStatus = getStatus(ComponentName.HP_FUEL_PUMP);

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-2 text-center">Fuel System Schematic</h2>
            <svg viewBox="0 0 800 570" className="w-full h-auto">
                <style>{`
                    .label { font-size: 12px; fill: #334155; font-family: sans-serif; }
                    .comp-rect { stroke-width: 1.5; rx:3; }
                    .line { stroke-width: 1.5; fill: none; }
                    .data-line { stroke: #a78bfa; stroke-width: 1; stroke-dasharray: 4 3; fill: none; }
                    .fuel-line { stroke-width: 2; fill: none; }
                    .animated-flow {
                        stroke-dasharray: 6 4;
                        animation: flow 2s linear infinite;
                    }
                    @keyframes flow {
                        to { stroke-dashoffset: -20; }
                    }
                `}</style>
                <defs>
                    <marker id="arrowhead" markerWidth="5" markerHeight="4" refX="2.5" refY="2" orient="auto">
                        <polygon points="0 0, 5 2, 0 4" className="fill-current" />
                    </marker>
                    <marker id="data-arrowhead" markerWidth="4" markerHeight="3" refX="2" refY="1.5" orient="auto">
                        <polygon points="0 0, 4 1.5, 0 3" fill="#a78bfa" />
                    </marker>
                </defs>

                {/* FADEC & Data Lines */}
                <g>
                    <ComponentBox x={250} y={10} w={300} h={40} name={ComponentName.FADEC} components={components} />
                    <Label x={400} y={35} anchor="middle">FADEC / FCU</Label>
                    <path d="M 280 50 V 70" className="data-line" markerEnd="url(#data-arrowhead)" />
                    <path d="M 520 50 V 70" className="data-line" markerEnd="url(#data-arrowhead)" />
                    <Label x={280} y={85} anchor="middle">Control</Label>
                    <Label x={520} y={85} anchor="middle">Sensor Data</Label>
                    
                    <path d="M 185 130 H 280 V 70" className="data-line" />
                    <path d="M 185 190 H 220 M 220 190 V 210 H 280 V 70" className="data-line" />
                    <path d="M 185 370 H 280 V 70" className="data-line" />
                    <path d="M 615 218 H 520 V 70" className="data-line" />
                    <path d="M 700 450 v -50 h -180 v -182 h -1" className="data-line" />
                </g>

                {/* Components */}
                <ComponentBox x={10} y={220} w={70} h={80} name={ComponentName.FUEL_TANK} components={components} />
                <Label x={45} y={255} anchor="middle">Fuel</Label>
                <Label x={45} y={270} anchor="middle">Tank</Label>

                <ComponentBox x={170} y={130} w={30} h={20} name={ComponentName.START_PURGE_VALVE} components={components} />
                <ComponentBox x={170} y={180} w={30} h={20} name={ComponentName.FUEL_PRESSURE_TRANSMITTER} components={components} />
                <ComponentBox x={170} y={240} w={30} h={40} name={ComponentName.FUEL_FILTER} components={components} />
                <ComponentBox x={170} y={350} w={30} h={40} name={ComponentName.FUEL_PRESSURE_TRANSMITTER} components={components} />
                
                <ComponentBox x={250} y={150} w={80} h={200} name={ComponentName.HP_FUEL_PUMP} components={components} />
                
                <ComponentBox x={230} y={420} w={30} h={20} name={ComponentName.FUEL_PUMP_UNITS} components={components} />
                <ComponentBox x={280} y={420} w={30} h={20} name={ComponentName.FUEL_PUMP_UNITS} components={components} />
                <ComponentBox x={330} y={420} w={30} h={20} name={ComponentName.FUEL_PUMP_UNITS} components={components} />
                <Label x={295} y={455} anchor="middle">FUEL PUMP UNITS</Label>

                <ComponentBox x={380} y={260} w={30} h={20} name={ComponentName.COMBUSTION_AP_VALVE} components={components} />
                <ComponentBox x={380} y={420} w={30} h={20} name={ComponentName.FULVALVE_ASSEMBLY} components={components} />
                <ComponentBox x={450} y={180} w={40} h={20} name={ComponentName.MANUAL_PURGE_VALVE} components={components} />
                <ComponentBox x={530} y={210} w={40} h={20} name={ComponentName.MANUAL_PURGE_VALVE} components={components} />
                <ComponentBox x={600} y={240} w={30} h={20} name={ComponentName.PRESSURIZING_VALVE} components={components} />
                <ComponentBox x={600} y={310} w={30} h={40} name={ComponentName.STOP_PURGE_VALVE} components={components} />
                <ComponentBox x={560} y={480} w={40} h={20} name={ComponentName.START_ELECTRO_VALVE} components={components} />

                {/* Injectors */}
                <ComponentBox x={680} y={150} w={80} h={20} name={ComponentName.PREFERENCE_INJECTORS} components={components} />
                <ComponentBox x={680} y={180} w={80} h={150} name={ComponentName.MAIN_INJECTORS} components={components} />
                <ComponentBox x={680} y={340} w={80} h={40} name={ComponentName.START_MAIN_INJECTORS} components={components} />
                <ComponentBox x={680} y={470} w={80} h={40} name={ComponentName.P3_INJECTORS} components={components} />
                
                {/* Fuel Lines */}
                <g className={`fuel-line text-slate-400 ${getLineStatusClass(mainLineStatus, isRunning)}`} markerEnd="url(#arrowhead)">
                    <path d="M 80 260 H 100" />
                    <path d="M 100 140 V 370" />
                    <path d="M 100 140 H 170" />
                    <path d="M 200 140 H 250" />
                    <path d="M 200 190 H 250" />
                    <path d="M 100 260 H 170" />
                    <path d="M 200 260 H 250" />
                    <path d="M 100 370 H 170" />
                    <path d="M 200 370 H 250" />
                    <path d="M 330 200 H 450" />
                    <path d="M 450 200 V 190 H 450" />
                    <path d="M 490 190 H 520" />
                    <path d="M 330 250 H 380" />
                    <path d="M 410 270 H 480" />
                    <path d="M 480 270 V 220 H 530" />
                    <path d="M 570 220 H 600" />
                    <path d="M 630 250 H 660 V 160 H 680" />
                    <path d="M 660 250 V 320 H 600" />
                    <path d="M 630 320 H 660 V 285 H 680" />
                    <path d="M 660 285 V 350 H 680" />
                    <path d="M 330 300 H 600" />
                    <path d="M 330 430 H 380" />
                    <path d="M 410 430 H 480 V 490 H 560" />
                    <path d="M 600 490 H 640 V 410 H 680" />
                    <path d="M 640 490 V 480 H 680" />
                </g>

                {/* Pump Drive Lines */}
                 <g className="line stroke-slate-400">
                    <path d="M 245 420 V 350" />
                    <path d="M 295 420 V 350" />
                    <path d="M 345 420 V 350" />
                 </g>

                {/* Labels */}
                <Label x={165} y={145} anchor="end">Start purge valve</Label>
                <Label x={165} y={195} anchor="end">Fuel pressure transmitter</Label>
                <Label x={165} y={265} anchor="end">FUEL FILTER</Label>
                <Label x={165} y={375} anchor="end">Fuel pressure transmitter</Label>
                
                <Label x={340} y={240} anchor="start">HP fuel pump</Label>
                <Label x={340} y={255} anchor="start">(with displacer</Label>
                <Label x={340} y={270} anchor="start">relief valve)</Label>

                <Label x={415} y={275}>Combustion AP valve</Label>
                <Label x={415} y={435}>FULVALVE ASSEMBLY</Label>

                <Label x={495} y={195}>Manual purge valve</Label>
                <Label x={575} y={225} anchor="start">Manual pressurizing valve</Label>
                <Label x={635} y={255} anchor="start">Pressurizing valve</Label>
                <Label x={635} y={335} anchor="start">Stop purge valve</Label>
                <Label x={605} y={495} anchor="start">Start electro valve</Label>

                <g textAnchor="end">
                    <Label x={675} y={165}>Preference Injectors</Label>
                    <Label x={675} y={255}>Main Injectors</Label>
                    <Label x={675} y={365}>Start/Main Injectors</Label>
                    <Label x={675} y={495}>P3 Injectors</Label>
                </g>
            </svg>
        </div>
    );
};