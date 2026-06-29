
import React, { useEffect, useRef, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { PredictionStep } from '../types';

interface PredictionChartProps {
  data: PredictionStep[];
  labels: any;
}

const PredictionChart: React.FC<PredictionChartProps> = ({ data, labels }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartWidth, setChartWidth] = useState(720);

  useEffect(() => {
    const updateWidth = () => {
      const containerWidth = containerRef.current?.clientWidth ?? window.innerWidth - 96;
      setChartWidth(Math.max(320, Math.floor(containerWidth - 32)));
    };

    updateWidth();

    const resizeObserver = typeof ResizeObserver !== 'undefined' && containerRef.current
      ? new ResizeObserver(updateWidth)
      : null;
    if (resizeObserver && containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener('resize', updateWidth);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full min-w-0 h-[360px] min-h-[320px] overflow-hidden bg-white p-4 rounded-xl">
        <AreaChart width={chartWidth} height={320} data={data} margin={{ top: 20, right: 24, left: 8, bottom: 16 }}>
          <defs>
            <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a303a" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10, fill: '#8f99aa' }} 
            interval={7} 
            stroke="#4b5565" 
          />
          <YAxis 
            tick={{ fill: '#8f99aa' }}
            label={{ value: labels.power + ' (kW)', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#8f99aa' }} 
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
          
          <Area 
            type="monotone" 
            dataKey="pvForecast" 
            stroke="#f59e0b" 
            fillOpacity={1} 
            fill="url(#colorPv)" 
            name={labels.pvForecast}
            strokeWidth={3}
          />
          <Area 
            type="monotone" 
            dataKey="loadForecast" 
            stroke="#ef4444" 
            fillOpacity={1} 
            fill="url(#colorLoad)" 
            name={labels.loadForecast}
            strokeWidth={3}
          />
        </AreaChart>
    </div>
  );
};

export default PredictionChart;
