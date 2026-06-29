
import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { HistoryStep } from '../types';

interface HistoryChartProps {
  data: HistoryStep[];
  labels: any;
}

const HistoryChart: React.FC<HistoryChartProps> = ({ data, labels }) => {
  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-xl">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10 }} 
            interval={7} 
            stroke="#94a3b8" 
          />
          <YAxis 
            label={{ value: labels.power + ' (kW)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748b' }} 
            stroke="#94a3b8"
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(4px)'
            }}
          />
          <Legend verticalAlign="top" height={36} iconType="rect" wrapperStyle={{ fontSize: '12px', fontWeight: '500' }} />
          
          <Bar 
            dataKey="pvActual" 
            fill="#fbbf24" 
            name={labels.pvActual} 
            radius={[2, 2, 0, 0]}
          />
          <Bar 
            dataKey="loadActual" 
            fill="#64748b" 
            name={labels.loadActual} 
            radius={[2, 2, 0, 0]}
            opacity={0.8}
          />
          
          <Line 
            type="monotone" 
            dataKey="pvForecast" 
            stroke="#f59e0b" 
            name={labels.pvForecast} 
            dot={false}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
          <Line 
            type="monotone" 
            dataKey="loadForecast" 
            stroke="#ef4444" 
            name={labels.loadForecast} 
            dot={false}
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryChart;