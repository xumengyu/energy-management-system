
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { HistoryPriceStep } from '../types';

interface HistoryPriceChartProps {
  data: HistoryPriceStep[];
  labels: any;
}

const HistoryPriceChart: React.FC<HistoryPriceChartProps> = ({ data, labels }) => {
  return (
    <div className="w-full h-[400px] bg-white p-4 rounded-xl">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10 }} 
            interval={7} 
            stroke="#94a3b8" 
          />
          <YAxis 
            label={{ value: labels.priceUnit, angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748b' }} 
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
          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '500' }} />
          
          <Line 
            type="stepAfter" 
            dataKey="gridSellPrice" 
            stroke="#8b5cf6" 
            name={labels.gridSellPrice} 
            dot={false}
            strokeWidth={3}
          />
          <Line 
            type="stepAfter" 
            dataKey="storageFromGridPrice" 
            stroke="#0ea5e9" 
            name={labels.storageFromGridPrice} 
            dot={false}
            strokeDasharray="5 5"
          />
          <Line 
            type="stepAfter" 
            dataKey="storageLocalPrice" 
            stroke="#10b981" 
            name={labels.storageLocalPrice} 
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HistoryPriceChart;
