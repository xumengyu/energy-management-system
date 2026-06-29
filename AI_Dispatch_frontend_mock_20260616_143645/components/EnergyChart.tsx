
import React, { useEffect, useState } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ReferenceLine
} from 'recharts';
import { SimulationStep } from '../types';

interface EnergyChartProps {
  data: SimulationStep[];
  labels: any;
}

const EnergyChart: React.FC<EnergyChartProps> = ({ data, labels }) => {
  const [chartWidth, setChartWidth] = useState(1000);

  useEffect(() => {
    const updateWidth = () => {
      setChartWidth(Math.max(720, Math.min(1400, window.innerWidth - 96)));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div className="w-full min-w-0 h-[500px] min-h-[360px] overflow-x-auto bg-white p-4 rounded-xl">
        <ComposedChart width={chartWidth} height={460} data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a303a" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10, fill: '#8f99aa' }} 
            interval={7} 
            stroke="#4b5565" 
          />
          <YAxis 
            yAxisId="left" 
            tick={{ fill: '#8f99aa' }}
            label={{ value: labels.power + ' (kW)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#8f99aa' }} 
            stroke="#4b5565"
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tick={{ fill: '#8f99aa' }}
            label={{ value: labels.soc + ' % / ' + labels.energyPrice, angle: 90, position: 'insideRight', fontSize: 12, fill: '#8f99aa' }} 
            stroke="#4b5565"
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '8px', 
              border: '1px solid rgba(148, 163, 184, 0.22)', 
              boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35)',
              backgroundColor: 'rgba(25, 28, 32, 0.96)',
              color: '#e8edf5',
              backdropFilter: 'blur(4px)'
            }}
            labelStyle={{ color: '#e8edf5', fontWeight: 700 }}
            itemStyle={{ color: '#e8edf5' }}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ color: '#c9d2e2', fontSize: '12px', fontWeight: '500' }} />
          
          <ReferenceLine yAxisId="left" y={0} stroke="#465160" strokeWidth={1} />

          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="pv" 
            fill="#fbbf24" 
            stroke="#f59e0b" 
            name={labels.solarPv} 
            fillOpacity={0.2}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="load" 
            stroke="#ef4444" 
            name={labels.loadDemand} 
            dot={false}
            strokeWidth={2}
          />
          <Bar 
            yAxisId="left"
            dataKey="batteryPower" 
            fill="#0ea5e9" 
            name={labels.storagePower} 
            radius={[4, 4, 4, 4]}
          />
          <Bar 
            yAxisId="left"
            dataKey="gridPower" 
            fill="#64748b" 
            name={labels.gridInteraction} 
            opacity={0.4}
            radius={[2, 2, 2, 2]}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="soc" 
            stroke="#10b981" 
            name={labels.batterySoc} 
            dot={false} 
            strokeWidth={3}
          />
          <Line 
            yAxisId="right"
            type="step" 
            dataKey={(v: any) => v.price * 50} 
            stroke="#8b5cf6" 
            name={labels.energyPrice} 
            dot={false}
            strokeDasharray="4 4"
          />
        </ComposedChart>
    </div>
  );
};

export default EnergyChart;
