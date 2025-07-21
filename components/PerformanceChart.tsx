import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HistoryDataPoint } from '../types';

interface PerformanceChartProps {
    data: HistoryDataPoint[];
}

const ChartContainer: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-72">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 text-center">{title}</h2>
        {children}
    </div>
);

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
    return (
        <ChartContainer title="Performance Analysis">
            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="tick" stroke="#64748b" fontSize={12} label={{ value: 'Time (ticks)', position: 'insideBottom', dy: 10, fill: '#64748b' }} />
                    <YAxis yAxisId="left" stroke="#818cf8" fontSize={12} domain={[10, 20]} label={{ value: 'AFR', angle: -90, position: 'insideLeft', fill: '#818cf8' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#facc15" fontSize={12} domain={[20, 45]} label={{ value: 'Efficiency (%)', angle: 90, position: 'insideRight', fill: '#facc15' }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', borderRadius: '0.5rem', boxShadow: '2px 2px 10px rgba(0,0,0,0.1)' }}
                        labelStyle={{ color: '#1e293b' }}
                        itemStyle={{ color: '#334155' }}
                    />
                    <Legend wrapperStyle={{fontSize: "14px", color: '#334155'}} />
                    <Line yAxisId="left" type="monotone" dataKey="afr" name="AFR" stroke="#818cf8" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="efficiency" name="Efficiency" stroke="#facc15" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
};