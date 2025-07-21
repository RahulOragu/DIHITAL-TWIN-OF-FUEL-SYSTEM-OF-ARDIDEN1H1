import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HistoryDataPoint } from '../types';

interface InjectorFlowChartProps {
    data: HistoryDataPoint[];
}

const ChartContainer: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-72">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 text-center">{title}</h2>
        {children}
    </div>
);

export const InjectorFlowChart: React.FC<InjectorFlowChartProps> = ({ data }) => {
    return (
        <ChartContainer title="Preference Injector Mass Flow Rate">
            <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="tick" stroke="#64748b" fontSize={12} label={{ value: 'Time (ticks)', position: 'insideBottom', dy: 10, fill: '#64748b' }} />
                    <YAxis stroke="#64748b" fontSize={12} domain={[0, 10]} label={{ value: 'Flow (g/s)', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', borderRadius: '0.5rem', boxShadow: '2px 2px 10px rgba(0,0,0,0.1)' }}
                        labelStyle={{ color: '#1e293b' }}
                        itemStyle={{ color: '#334155' }}
                    />
                     <Legend wrapperStyle={{fontSize: "14px", color: '#334155'}} />
                    <Area type="monotone" dataKey="injector1Flow" name="Preference Injector Flow" stroke="#22d3ee" fill="url(#colorUv)" />
                </AreaChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
};