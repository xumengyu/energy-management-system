
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ComposedChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush, LineChart
} from 'recharts';
import { Calendar, RotateCcw, Battery, ChevronDown, Layers, Zap, Activity, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

// --- Helper: Dynamic Data Generation based on selected date ---
const generateLoadData = (startDateStr: string) => {
    const dateSeed = startDateStr.split('-').reduce((acc, val) => acc + parseInt(val), 0);
    
    return Array.from({ length: 96 * 1.5 }, (_, i) => { 
        const hour = (i * 15) / 60 % 24;
        const hStr = Math.floor(hour).toString().padStart(2, '0');
        const mStr = ((i * 15) % 60).toString().padStart(2, '0');
        
        const baseDate = new Date(startDateStr);
        const itemDate = new Date(baseDate.getTime() + (i * 15 * 60 * 1000));
        const dateLabel = `${(itemDate.getMonth()+1).toString().padStart(2, '0')}-${itemDate.getDate().toString().padStart(2, '0')}`;
        
        const time = `${hStr}:${mStr}`;
        const fullTime = `${dateLabel} ${time}`;

        const randomFactor = Math.sin(dateSeed + i);

        const dynamicDemand = 950;
        const reverseRef = -50;

        const baseLoad = 200 + Math.abs(randomFactor) * 20;
        const peakLoad = (hour > 8 && hour < 20) ? 300 * Math.sin((hour - 8) / 12 * Math.PI) : 0;
        const loadPower = Math.round(baseLoad + peakLoad + Math.random() * 30);

        const evsePower = (hour > 7 && hour < 22) ? Math.round(Math.random() * 150 + 20) : 0;

        const isSun = hour > 6 && hour < 18;
        const pvPower = isSun ? Math.round(Math.sin((hour - 6) / 12 * Math.PI) * 800 * (0.8 + Math.random() * 0.2)) : 0;

        const dgPower = (hour > 18 && hour < 20) ? 200 : 0;

        let essPower = 0;
        const netLoadBeforeEss = loadPower + evsePower - pvPower - dgPower;
        
        if (netLoadBeforeEss < -100) {
            essPower = -Math.min(300, Math.abs(netLoadBeforeEss)); 
        } else if (netLoadBeforeEss > 300) {
            essPower = Math.min(300, netLoadBeforeEss - 200); 
        }

        const gridPoint = Math.round(loadPower + evsePower - pvPower - dgPower - essPower);

        return {
            index: i,
            time: fullTime,
            shortTime: time,
            dynamicDemand,
            reverseRef,
            loadPower,
            evsePower,
            pvPower,
            dgPower,
            essPower,
            gridPoint
        };
    });
};

const generatePowerData = (startDateStr: string) => {
    return Array.from({ length: 97 }, (_, i) => { 
        const t = i / 4; 
        const socVal = 52.5 + 37.5 * Math.sin(((t - 0) / 24) * 2 * Math.PI - Math.PI / 2 + 1); 
        const powerVal = 60 * Math.sin(t * 1.2) + 30 * Math.sin(t * 2.8) - 10 * Math.cos(t * 0.5);

        const h = Math.floor(t);
        const m = (i % 4) * 15;
        const hStr = h.toString().padStart(2, '0');
        const mStr = m.toString().padStart(2, '0');
        const timeLabel = h === 24 ? "24:00" : `${hStr}:${mStr}`;

        return {
            index: i,
            time: timeLabel,
            fullTime: `${startDateStr} ${timeLabel}`,
            soc: Math.max(0, Math.min(100, socVal)),
            power: Math.round(powerVal)
        };
    });
};

const generateBatteryData = (startDateStr: string) => {
    return Array.from({ length: 97 }, (_, i) => {
        const t = i / 4;
        const h = Math.floor(t);
        const m = (i % 4) * 15;
        const hStr = h.toString().padStart(2, '0');
        const mStr = m.toString().padStart(2, '0');
        const timeLabel = h === 24 ? "24:00" : `${hStr}:${mStr}`;

        const baseVol = 750;
        const volNoise = Math.random() * 5;
        const voltage = baseVol + Math.sin(t / 3) * 30 + volNoise; 
        const current = Math.sin(t / 2) * 100 + (Math.random() * 10);
        const soc = 50 + Math.sin(t / 4) * 40;

        return {
            time: timeLabel,
            voltage: Math.round(voltage),
            current: Math.round(current),
            soc: Math.max(0, Math.min(100, Math.round(soc))),
            soh: 98.5
        }
    });
};

const BATTERY_CLUSTERS_EN = [
    'Cluster 1-1', 'Cluster 1-2', 'Cluster 1-3',
    'Cluster 2-1', 'Cluster 2-2', 'Cluster 2-3'
];

const BATTERY_CLUSTERS_ZH = [
    '电池簇 1-1', '电池簇 1-2', '电池簇 1-3',
    '电池簇 2-1', '电池簇 2-2', '电池簇 2-3'
];

// Helper for small charts in Battery Analysis
const SimpleChartContainer = ({ title, children }: { title: string, children?: React.ReactNode }) => (
    <div className="bg-slate-50/50 dark:bg-apple-surface-secondary-dark/30 rounded-2xl border border-slate-200 dark:border-apple-border-dark p-6 flex flex-col h-[320px]">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-brand-500 rounded-sm"></span>
            {title}
        </h4>
        <div className="flex-1 w-full min-h-0">
            {children}
        </div>
    </div>
);

interface DataAnalysisProps {
  lang: Language;
  theme: Theme;
  selectedStation: string;
}

const DataAnalysis: React.FC<DataAnalysisProps> = ({ lang, theme, selectedStation }) => {
  const t = translations[lang].dataAnalysis;
  const isDark = theme === 'dark';

  const BATTERY_CLUSTERS = lang === 'zh' ? BATTERY_CLUSTERS_ZH : BATTERY_CLUSTERS_EN;

  const today = new Date().toISOString().split('T')[0];
  
  const [activeTab, setActiveTab] = useState<'load' | 'power' | 'battery' | 'curve'>('load');
  const [dateRange, setDateRange] = useState({ start: today, end: today });
  const [selectedCluster, setSelectedCluster] = useState(BATTERY_CLUSTERS[0]);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); 
  const [tempSelection, setTempSelection] = useState<{ start: string | null; end: string | null }>({ start: today, end: today });

  const LOAD_CHART_DATA = useMemo(() => generateLoadData(dateRange.start), [dateRange]);
  const POWER_CHART_DATA = useMemo(() => generatePowerData(dateRange.start), [dateRange]);
  const BATTERY_CHART_DATA = useMemo(() => generateBatteryData(dateRange.start), [dateRange]);

  const toggleSeries = (dataKey: string) => {
    setHiddenSeries(prev => prev.includes(dataKey) ? prev.filter(k => k !== dataKey) : [...prev, dataKey]);
  };

  const handleReset = () => {
      const todayDate = new Date();
      const todayStr = todayDate.toISOString().split('T')[0];
      
      setDateRange({ start: todayStr, end: todayStr });
      setTempSelection({ start: todayStr, end: todayStr });
      setViewDate(todayDate);
  };

  const chartColors = {
      grid: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
      text: isDark ? '#94a3b8' : '#64748b',
      tooltipBg: isDark ? '#1e2128' : '#ffffff',
      tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
      lines: {
          gridPoint: '#ef4444', 
          loadPower: '#819226', 
          pvPower: '#eab308',   
          essPower: '#8b5cf6',  
          evsePower: '#06b6d4', 
          dgPower: '#64748b',   
          demand: '#d946ef',    
          reverseRef: '#f43f5e',
      }
  };

  // --- Date Picker Logic ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isDateDisabled = (year: number, month: number, day: number) => {
      const dateToCheck = new Date(year, month, day);
      const todayDate = new Date();
      todayDate.setHours(0,0,0,0);
      if (dateToCheck > todayDate) return true;
      if (tempSelection.start && !tempSelection.end) {
          const startDate = new Date(tempSelection.start);
          const diffTime = Math.abs(dateToCheck.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 60) return true;
      }
      return false;
  };

  const handleDateClick = (day: number) => {
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    
    if (isDateDisabled(currentYear, currentMonth, day)) return;

    const clickedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (!tempSelection.start || (tempSelection.start && tempSelection.end)) {
        setTempSelection({ start: clickedDateStr, end: null });
    } else {
        if (clickedDateStr < tempSelection.start) {
            setTempSelection({ start: clickedDateStr, end: tempSelection.start });
        } else {
            setTempSelection({ ...tempSelection, end: clickedDateStr });
        }
    }
  };

  const applyDateSelection = () => {
      if (tempSelection.start) {
          setDateRange({ 
              start: tempSelection.start, 
              end: tempSelection.end || tempSelection.start 
          });
      }
      setIsDateOpen(false);
  };

  const isSelected = (day: number) => {
      const current = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return current === tempSelection.start || current === tempSelection.end;
  };

  const isInRange = (day: number) => {
      if (!tempSelection.start || !tempSelection.end) return false;
      const current = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return current > tempSelection.start && current < tempSelection.end;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const startDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
    const days = [];

    for (let i = 0; i < startDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const selected = isSelected(d);
        const inRange = isInRange(d);
        const disabled = isDateDisabled(viewDate.getFullYear(), viewDate.getMonth(), d);
        
        days.push(
            <button 
                key={d} 
                disabled={disabled}
                onClick={() => handleDateClick(d)}
                className={`h-8 w-full text-xs font-bold rounded-lg transition-all relative
                    ${disabled ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/50' : ''}
                    ${!disabled && selected 
                        ? 'bg-brand-500 text-white z-10 shadow-md shadow-brand-500/30' 
                        : !disabled && inRange 
                            ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-none' 
                            : !disabled && 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'
                    }
                    ${d === 1 && inRange ? 'rounded-l-lg' : ''}
                    ${d === daysInMonth && inRange ? 'rounded-r-lg' : ''}
                `}
            >
                {d}
            </button>
        );
    }

    return (
        <div className="p-4 w-[320px]">
            <div className="flex items-center justify-between mb-4">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded text-slate-500"><ChevronLeft size={16}/></button>
                <div className="text-sm font-bold text-slate-800 dark:text-white">
                    {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded text-slate-500"><ChevronRight size={16}/></button>
            </div>
            
            <div className="grid grid-cols-7 mb-2 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</div>
                ))}
            </div>
            
            <div className="grid grid-cols-7 gap-y-1">
                {days}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-apple-border-dark">
                <div className="text-xs text-slate-400">
                    {tempSelection.start ? (
                        <span>{tempSelection.start} {tempSelection.end ? `→ ${tempSelection.end}` : ''}</span>
                    ) : 'Select range'}
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsDateOpen(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={applyDateSelection}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shadow-sm"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
  };

  const CustomLegend = (props: any) => {
      const { payload, onClick } = props;
      return (
          <div className="flex flex-wrap justify-end gap-x-6 gap-y-2 mb-4 text-xs font-medium text-slate-600 dark:text-slate-400">
              {payload.map((entry: any, index: number) => {
                  const isHidden = hiddenSeries.includes(entry.dataKey);
                  return (
                    <button 
                        key={`item-${index}`} 
                        onClick={() => onClick(entry.dataKey)}
                        className={`flex items-center gap-2 transition-all ${isHidden ? 'opacity-40 grayscale' : 'opacity-100'}`}
                    >
                        {['dynamicDemand', 'reverseRef'].includes(entry.dataKey) ? (
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full border-2 bg-transparent" style={{borderColor: entry.color}}></div>
                                <div className="w-4 h-0.5 border-t-2 border-dashed ml-1" style={{borderColor: entry.color}}></div>
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                <div className="w-4 h-0.5 ml-1" style={{ backgroundColor: entry.color }}></div>
                            </div>
                        )}
                        <span>{entry.value}</span>
                    </button>
                  )
              })}
          </div>
      );
  };

  const tooltipStyle = {
      contentStyle: { borderRadius: '12px', border: `1px solid ${chartColors.tooltipBorder}`, backgroundColor: chartColors.tooltipBg, fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
      itemStyle: { fontSize: '14px', fontWeight: 600, padding: '2px 0' },
      labelStyle: { color: isDark ? '#94a3b8' : '#64748b', marginBottom: '8px', fontSize: '12px' }
  };

  const renderLoadTracking = () => (
    <div className="w-full h-full min-h-0 relative flex flex-col gap-2">
        <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={LOAD_CHART_DATA} syncId="loadSync" margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis 
                        dataKey="index" 
                        fontSize={14} 
                        tickLine={false} 
                        axisLine={{ stroke: chartColors.grid }}
                        stroke={chartColors.text}
                        tickFormatter={(idx) => {
                            const item = LOAD_CHART_DATA[idx];
                            if (!item) return '';
                            if (idx % 24 === 0) return item.shortTime; 
                            return '';
                        }}
                        interval={12}
                        fontWeight={500}
                    />
                    <YAxis 
                        fontSize={14} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke={chartColors.text}
                        label={{ value: t.unitKw, position: 'top', offset: 10, fontSize: 12, fill: chartColors.text }}
                        domain={[-400, 1000]}
                        ticks={[-400, 0, 400, 800]}
                        fontWeight={500}
                    />
                    <Tooltip 
                        {...tooltipStyle}
                        labelStyle={{ color: chartColors.text, marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '12px' }}
                        formatter={(value: number) => [value, 'kW']}
                        labelFormatter={(label) => {
                            const item = LOAD_CHART_DATA.find(d => d.index === label);
                            return item ? item.time : '';
                        }}
                    />
                    <Legend content={<CustomLegend onClick={toggleSeries} />} verticalAlign="top" height={60}/>
                    <ReferenceLine y={0} stroke={chartColors.grid} />
                    
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('essPower')} name={t.legend.ess} type="monotone" dataKey="essPower" stroke={chartColors.lines.essPower} strokeWidth={2} dot={false} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('pvPower')} name={t.legend.pv} type="monotone" dataKey="pvPower" stroke={chartColors.lines.pvPower} strokeWidth={2} dot={false} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('evsePower')} name={t.legend.evse} type="monotone" dataKey="evsePower" stroke={chartColors.lines.evsePower} strokeWidth={2} dot={false} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('dgPower')} name={t.legend.dg} type="stepAfter" dataKey="dgPower" stroke={chartColors.lines.dgPower} strokeWidth={2} dot={false} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('loadPower')} name={t.legend.load} type="monotone" dataKey="loadPower" stroke={chartColors.lines.loadPower} strokeWidth={2} dot={false} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('gridPoint')} name={t.legend.gridPoint} type="monotone" dataKey="gridPoint" stroke={chartColors.lines.gridPoint} strokeWidth={2} dot={false} activeDot={{r: 6}} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('dynamicDemand')} name={t.legend.demand} type="stepAfter" dataKey="dynamicDemand" stroke={chartColors.lines.demand} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('reverseRef')} name={t.legend.reverseRef} type="stepAfter" dataKey="reverseRef" stroke={chartColors.lines.reverseRef} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>

        {/* Filter / Preview Chart */}
        <div className="h-[36px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={LOAD_CHART_DATA} syncId="loadSync" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPreview" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#819226" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#819226" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="index" hide />
                    <YAxis domain={[-400, 1000]} hide />
                    <Area type="monotone" dataKey="loadPower" stroke="#819226" strokeWidth={1} fill="url(#colorPreview)" isAnimationActive={false} />
                    <Brush 
                        dataKey="index" 
                        height={36} 
                        y={0}
                        travellerWidth={10}
                        stroke={isDark ? '#819226' : '#819226'}
                        fill={isDark ? '#1e2128' : '#f1f5f9'}
                        fillOpacity={0.5} 
                        tickFormatter={() => ''}
                    />
                </ComposedChart>
             </ResponsiveContainer>
        </div>
    </div>
  );

  const renderPowerTracking = () => (
    <div className="w-full h-full flex flex-col gap-6">
        {/* SOC Chart (Top) */}
        <div className="flex-1 min-h-0 relative">
            <div className="absolute top-0 left-0 w-full flex justify-center z-10 pointer-events-none">
                <div className="flex items-center gap-2 bg-white/50 dark:bg-apple-surface-dark/50 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm mt-2 border border-slate-100 dark:border-apple-border-dark">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#facc15]"></div>
                    <span className="text-sm font-bold text-[#facc15]">{t.legend.soc}</span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={POWER_CHART_DATA} syncId="powerTracking" margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorSoc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#facc15" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#facc15" stopOpacity={0.05}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} strokeOpacity={0.5} />
                    <XAxis dataKey="index" type="number" domain={[0, 96]} hide />
                    <YAxis 
                        fontSize={14} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke={chartColors.text}
                        domain={[0, 120]}
                        ticks={[25, 50, 75, 100]}
                        fontWeight={500}
                    />
                    <Tooltip 
                        {...tooltipStyle}
                        itemStyle={{ fontWeight: 600 }}
                        formatter={(value: number) => [value, '%']}
                        labelFormatter={(label) => {
                             const idx = Number(label);
                             const item = POWER_CHART_DATA.find(d => d.index === idx);
                             return item ? item.time : '';
                        }}
                    />
                    <Area type="monotone" dataKey="soc" stroke="#facc15" strokeWidth={3} fill="url(#colorSoc)" animationDuration={1000} />
                </AreaChart>
            </ResponsiveContainer>
        </div>

        {/* Power Chart (Bottom) */}
        <div className="flex-1 min-h-0 relative">
            <div className="absolute top-0 left-0 w-full flex justify-center z-10 pointer-events-none">
                <div className="flex items-center gap-2 bg-white/50 dark:bg-apple-surface-dark/50 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm mt-2 border border-slate-100 dark:border-apple-border-dark">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#819226]"></div>
                    <span className="text-sm font-bold text-[#819226]">{t.legend.power}</span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={POWER_CHART_DATA} syncId="powerTracking" margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#819226" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#819226" stopOpacity={0.05}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} strokeOpacity={0.5} />
                    <XAxis 
                        dataKey="index" 
                        type="number" 
                        domain={[0, 96]}
                        fontSize={14} 
                        tickLine={false} 
                        axisLine={{ stroke: chartColors.grid }}
                        stroke={chartColors.text}
                        tickFormatter={(idx) => {
                             const h = idx / 4;
                             if (Number.isInteger(h) && h % 2 !== 0) { 
                                 return `${h.toString().padStart(2, '0')}:00`;
                             }
                             if (h === 24) return '24:00';
                             return '';
                        }}
                        ticks={[4, 12, 20, 28, 36, 44, 52, 60, 68, 76, 84, 96]} 
                        interval={0}
                        fontWeight={500}
                    />
                    <YAxis 
                        fontSize={14} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke={chartColors.text}
                        domain={[-150, 150]}
                        ticks={[-100, 0, 100]}
                        fontWeight={500}
                    />
                    <Tooltip 
                        {...tooltipStyle}
                        itemStyle={{ fontWeight: 600 }}
                        formatter={(value: number) => [value, 'kW']}
                        labelFormatter={(label) => {
                             const idx = Number(label);
                             const item = POWER_CHART_DATA.find(d => d.index === idx);
                             return item ? item.time : '';
                        }}
                    />
                    <ReferenceLine y={0} stroke={chartColors.grid} strokeDasharray="3 3"/>
                    <Area type="monotone" dataKey="power" stroke="#819226" strokeWidth={3} fill="url(#colorPower)" animationDuration={1000}/>
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
  );

  const renderBatteryAnalysis = () => (
      <div className="w-full h-full overflow-y-auto custom-scrollbar p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Cluster Voltage */}
              <SimpleChartContainer title={t.charts.clusterVol}>
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={BATTERY_CHART_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                          <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} stroke={chartColors.text} interval={12}/>
                          <YAxis fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} domain={['auto', 'auto']} unit="V"/>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${chartColors.tooltipBorder}`, backgroundColor: chartColors.tooltipBg, fontSize: '14px', fontWeight: 600 }} itemStyle={{color: '#3b82f6'}} />
                          <Line type="monotone" dataKey="voltage" stroke="#3b82f6" strokeWidth={2} dot={false} name="Voltage"/>
                      </LineChart>
                  </ResponsiveContainer>
              </SimpleChartContainer>

              {/* 2. Cluster Current */}
              <SimpleChartContainer title={t.charts.clusterCur}>
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={BATTERY_CHART_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorCur" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                          <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} stroke={chartColors.text} interval={12}/>
                          <YAxis fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} unit="A"/>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${chartColors.tooltipBorder}`, backgroundColor: chartColors.tooltipBg, fontSize: '14px', fontWeight: 600 }} itemStyle={{color: '#f97316'}} />
                          <Area type="monotone" dataKey="current" stroke="#f97316" fill="url(#colorCur)" strokeWidth={2} name="Current"/>
                      </AreaChart>
                  </ResponsiveContainer>
              </SimpleChartContainer>

              {/* 3. Cluster SOC */}
              <SimpleChartContainer title={t.charts.clusterSoc}>
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={BATTERY_CHART_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorSocBat" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                          <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} stroke={chartColors.text} interval={12}/>
                          <YAxis fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} domain={[0, 100]} unit="%"/>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${chartColors.tooltipBorder}`, backgroundColor: chartColors.tooltipBg, fontSize: '14px', fontWeight: 600 }} itemStyle={{color: '#10b981'}} />
                          <Area type="monotone" dataKey="soc" stroke="#10b981" fill="url(#colorSocBat)" strokeWidth={2} name="SOC"/>
                      </AreaChart>
                  </ResponsiveContainer>
              </SimpleChartContainer>

              {/* 4. Cluster SOH */}
              <SimpleChartContainer title={t.charts.clusterSoh}>
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={BATTERY_CHART_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                          <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} stroke={chartColors.text} interval={12}/>
                          <YAxis fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} domain={[90, 100]} unit="%"/>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: `1px solid ${chartColors.tooltipBorder}`, backgroundColor: chartColors.tooltipBg, fontSize: '14px', fontWeight: 600 }} itemStyle={{color: '#14b8a6'}} />
                          <Line type="step" dataKey="soh" stroke="#14b8a6" strokeWidth={2} dot={false} name="SOH"/>
                      </LineChart>
                  </ResponsiveContainer>
              </SimpleChartContainer>
          </div>
      </div>
  );

  return (
    <div className="h-[calc(100vh-80px)] p-4 flex flex-col gap-4 animate-in fade-in duration-300">
        
        {/* Header Toolbar */}
        <div className="flex flex-col xl:flex-row items-center justify-between mb-0 bg-white dark:bg-apple-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-apple-border-dark shadow-sm gap-4 shrink-0">
            {/* Left: Tabs */}
            <div className="flex items-center gap-6 w-full xl:w-auto overflow-x-auto">
                <div className="flex gap-2">
                    {[
                        { id: 'load', label: t.tabs.load, icon: Activity },
                        { id: 'power', label: t.tabs.power, icon: Zap },
                        { id: 'battery', label: t.tabs.battery, icon: Battery },
                        { id: 'curve', label: t.tabs.curve, icon: Layers }
                    ].map((item) => (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveTab(item.id as any)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap
                            ${activeTab === item.id 
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' 
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark dark:text-slate-400'}`}
                        >
                            <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-slate-400'} />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap justify-end">
                {activeTab === 'battery' && (
                    <div className="relative">
                        <div className="flex items-center bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-xl p-2 pr-3 h-[42px]">
                            <Layers size={16} className="text-slate-400 ml-2 mr-2"/>
                            <select 
                                value={selectedCluster} 
                                onChange={(e) => setSelectedCluster(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer appearance-none pr-6"
                            >
                                {BATTERY_CLUSTERS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown size={14} className="text-slate-400 absolute right-3 pointer-events-none"/>
                        </div>
                    </div>
                )}

                {/* Date Range Picker (Calendar Dropdown) */}
                <div className="relative">
                    <button 
                        onClick={() => setIsDateOpen(!isDateOpen)}
                        className={`flex items-center gap-3 bg-slate-50 dark:bg-apple-surface-secondary-dark border rounded-xl px-4 py-2 h-[42px] transition-all group min-w-[240px] justify-between
                        ${isDateOpen ? 'border-brand-500 ring-2 ring-brand-100 dark:ring-brand-900/30' : 'border-slate-200 dark:border-apple-border-dark hover:border-brand-400'}`}
                    >
                        <div className="flex items-center gap-2">
                             <Calendar size={16} className="text-slate-400 group-hover:text-brand-500 transition-colors"/>
                             <span className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono">
                                {dateRange.start} <span className="text-slate-300 mx-1">→</span> {dateRange.end}
                             </span>
                        </div>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isDateOpen ? 'rotate-180' : ''}`}/>
                    </button>
                    
                    {isDateOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setIsDateOpen(false)}></div>
                            <div className="absolute top-full right-0 mt-2 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark shadow-xl rounded-2xl z-40 animate-in fade-in zoom-in-95 duration-100">
                                {renderCalendar()}
                            </div>
                        </>
                    )}
                </div>
                
                <button 
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors h-[42px]"
                >
                    <RotateCcw size={16} /> {t.reset}
                </button>
            </div>
        </div>

        {/* Main Chart Card */}
        <div className="flex-1 bg-white dark:bg-apple-surface-dark rounded-2xl border border-slate-200 dark:border-apple-border-dark shadow-sm flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-100 dark:border-apple-border-dark flex justify-between items-center shrink-0">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white pl-2 border-l-4 border-brand-500">
                    {activeTab === 'load' && t.titleLoad}
                    {activeTab === 'power' && t.titlePower}
                    {activeTab === 'battery' && `${t.titleBattery} - ${selectedCluster}`}
                </h3>
            </div>

            <div className="flex-1 w-full min-h-0 p-6 relative">
                {activeTab === 'load' && renderLoadTracking()}
                {activeTab === 'power' && renderPowerTracking()}
                {activeTab === 'battery' && renderBatteryAnalysis()}
                {activeTab === 'curve' && (
                    <div className="flex items-center justify-center h-full text-slate-400 font-medium">
                        Curve Analysis - Work in Progress
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default DataAnalysis;
