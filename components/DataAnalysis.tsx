
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ComposedChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush, LineChart
} from 'recharts';
import { Calendar, RotateCcw, Battery, ChevronDown, Layers, Package, Zap, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const seed = startDateStr.split('-').reduce((acc, v) => acc + parseInt(v, 10), 0);
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

        const vWave = Math.sin(seed * 0.01 + t / 4.5) * 0.042;
        const vDrift = -i * 0.00032;
        let cellVolMax = 3.36 + vWave + vDrift + (seed % 5) * 0.002;
        let cellVolMin = cellVolMax - 0.038 - Math.abs(Math.sin(t / 3.2)) * 0.014;
        cellVolMax = Math.round(cellVolMax * 1000) / 1000;
        cellVolMin = Math.round(cellVolMin * 1000) / 1000;
        if (cellVolMin >= cellVolMax) cellVolMin = Math.round((cellVolMax - 0.02) * 1000) / 1000;

        const cellTempMax = Math.round((18 + Math.sin(seed * 0.02 + t / 3.8) * 3.2 - i * 0.048) * 10) / 10;
        const cellTempMin = Math.round((14.5 + Math.sin(seed * 0.02 + t / 3.8) * 2.4 - i * 0.042) * 10) / 10;

        return {
            time: timeLabel,
            voltage: Math.round(voltage),
            current: Math.round(current),
            soc: Math.max(0, Math.min(100, Math.round(soc))),
            soh: 98.5,
            cellVolMax,
            cellVolMin,
            cellTempMax,
            cellTempMin
        };
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

const BATTERY_STACKS_EN = ['Stack #1', 'Stack #2', 'Stack #3'];
const BATTERY_STACKS_ZH = ['电池堆 #1', '电池堆 #2', '电池堆 #3'];

// Helper for small charts in Battery Cluster Analysis
const SimpleChartContainer = ({
    title,
    children,
    className = '',
}: {
    title: string;
    children?: React.ReactNode;
    className?: string;
}) => (
    <div className={`ems-card flex min-h-0 flex-col p-5 ${className}`}>
        <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        <div className="min-h-0 w-full flex-1">{children}</div>
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
  const BATTERY_STACKS = lang === 'zh' ? BATTERY_STACKS_ZH : BATTERY_STACKS_EN;

  const today = new Date().toISOString().split('T')[0];
  
  const [activeTab, setActiveTab] = useState<'load' | 'power' | 'battery'>('load');
  const [dateRange, setDateRange] = useState({ start: today, end: today });
  const [selectedStack, setSelectedStack] = useState(BATTERY_STACKS[0]);
  const [selectedCluster, setSelectedCluster] = useState(BATTERY_CLUSTERS[0]);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  useEffect(() => {
    setSelectedStack(BATTERY_STACKS[0]);
    setSelectedCluster(BATTERY_CLUSTERS[0]);
  }, [lang]);
  
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
      grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
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
          <div className="mt-5 flex flex-wrap justify-center gap-x-7 gap-y-2.5">
              {payload.map((entry: any, index: number) => {
                  const isHidden = hiddenSeries.includes(entry.dataKey);
                  return (
                      <button
                          key={`item-${index}`}
                          onClick={() => onClick(entry.dataKey)}
                          className={`flex items-center gap-2.5 text-sm font-bold transition-all ${isHidden ? 'opacity-40 grayscale' : 'opacity-100'} text-slate-600 dark:text-slate-300`}
                      >
                          {['dynamicDemand', 'reverseRef'].includes(entry.dataKey) ? (
                              <div className="flex items-center">
                                  <div className="h-3.5 w-3.5 rounded-full border-2 bg-transparent" style={{ borderColor: entry.color }} />
                                  <div className="ml-1 h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: entry.color }} />
                              </div>
                          ) : (
                              <span className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                          )}
                          {entry.value}
                      </button>
                  );
              })}
          </div>
      );
  };

  const tooltipStyle = {
      contentStyle: {
          borderRadius: '16px',
          border: `1px solid ${chartColors.tooltipBorder}`,
          backgroundColor: chartColors.tooltipBg,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      itemStyle: { fontSize: '15px', fontWeight: 600, padding: '4px 0' },
      labelStyle: {
          color: isDark ? '#94a3b8' : '#64748b',
          marginBottom: '8px',
          fontSize: '13px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
      },
  };

  const renderLoadTracking = () => (
    /* Recharts 3：主图与带 Brush 的子图共用 syncId 时，会用 Brush 的索引切片主图数据，易导致主图数据为空。
       将曲线与 Brush 放在同一 ComposedChart，并给容器固定高度，避免 ResponsiveContainer 高度为 0。 */
    <div className="w-full">
        <div className="h-[600px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={LOAD_CHART_DATA}
                    margin={{ top: 16, right: 28, left: 4, bottom: 4 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis
                        dataKey="index"
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        fontSize={13}
                        tickLine={false}
                        axisLine={false}
                        tickMargin={12}
                        stroke={chartColors.text}
                        tickFormatter={(v) => {
                            const idx = typeof v === 'number' ? v : Number(v);
                            const item = LOAD_CHART_DATA.find((d) => d.index === idx);
                            if (!item) return '';
                            if (idx % 24 === 0) return item.shortTime;
                            return '';
                        }}
                        interval={12}
                    />
                    <YAxis
                        fontSize={13}
                        tickLine={false}
                        axisLine={false}
                        stroke={chartColors.text}
                        label={{
                            value: t.unitKw,
                            position: 'insideLeft',
                            angle: -90,
                            dy: 10,
                            fontSize: 13,
                            fill: chartColors.text,
                            fontWeight: 700,
                        }}
                        domain={[-400, 1000]}
                        ticks={[-400, 0, 400, 800]}
                    />
                    <Tooltip
                        {...tooltipStyle}
                        labelStyle={{ color: chartColors.text, marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '12px' }}
                        formatter={(value: number) => [value, 'kW']}
                        labelFormatter={(label) => {
                            const item = LOAD_CHART_DATA.find((d) => d.index === Number(label));
                            return item ? item.time : '';
                        }}
                    />
                    <Legend content={<CustomLegend onClick={toggleSeries} />} verticalAlign="top" height={44} />
                    <ReferenceLine y={0} stroke={chartColors.grid} />

                    <Line isAnimationActive={false} hide={hiddenSeries.includes('essPower')} name={t.legend.ess} type="monotone" dataKey="essPower" stroke={chartColors.lines.essPower} strokeWidth={2} dot={false} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('pvPower')} name={t.legend.pv} type="monotone" dataKey="pvPower" stroke={chartColors.lines.pvPower} strokeWidth={2} dot={false} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('evsePower')} name={t.legend.evse} type="monotone" dataKey="evsePower" stroke={chartColors.lines.evsePower} strokeWidth={2} dot={false} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('dgPower')} name={t.legend.dg} type="stepAfter" dataKey="dgPower" stroke={chartColors.lines.dgPower} strokeWidth={2} dot={false} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('loadPower')} name={t.legend.load} type="monotone" dataKey="loadPower" stroke={chartColors.lines.loadPower} strokeWidth={2} dot={false} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('gridPoint')} name={t.legend.gridPoint} type="monotone" dataKey="gridPoint" stroke={chartColors.lines.gridPoint} strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('dynamicDemand')} name={t.legend.demand} type="stepAfter" dataKey="dynamicDemand" stroke={chartColors.lines.demand} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />
                    <Line isAnimationActive={false} hide={hiddenSeries.includes('reverseRef')} name={t.legend.reverseRef} type="stepAfter" dataKey="reverseRef" stroke={chartColors.lines.reverseRef} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={false} />

                    <Brush
                        dataKey="index"
                        height={32}
                        travellerWidth={10}
                        stroke={isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(100, 116, 139, 0.45)'}
                        fill={isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.06)'}
                        fillOpacity={1}
                        tickFormatter={() => ''}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    </div>
  );

  const powerTabXAxisProps = {
    dataKey: 'index' as const,
    type: 'number' as const,
    domain: [0, 96] as [number, number],
    fontSize: 13,
    tickLine: false,
    axisLine: false,
    tickMargin: 12,
    stroke: chartColors.text,
    tickFormatter: (idx: number) => {
      const h = idx / 4;
      if (Number.isInteger(h) && h % 2 !== 0) {
        return `${h.toString().padStart(2, '0')}:00`;
      }
      if (h === 24) return '24:00';
      return '';
    },
    ticks: [4, 12, 20, 28, 36, 44, 52, 60, 68, 76, 84, 96],
    interval: 0,
    fontWeight: 600,
  };

  const renderPowerTracking = () => (
    <>
        <div className="ems-card flex flex-col p-5">
            <h3 className="mb-4 shrink-0 text-lg font-bold text-slate-900 dark:text-white">
              {t.charts.socTrend}
            </h3>
            <div className="h-[256px] w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={POWER_CHART_DATA} syncId="powerTracking" margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                        <defs>
                            <linearGradient id="colorSoc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#facc15" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#facc15" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                        <XAxis {...powerTabXAxisProps} />
                        <YAxis
                            fontSize={13}
                            tickLine={false}
                            axisLine={false}
                            stroke={chartColors.text}
                            domain={[0, 100]}
                            ticks={[0, 25, 50, 75, 100]}
                            fontWeight={600}
                            label={{ value: t.unitSoc, position: 'insideLeft', angle: -90, dx: -4, dy: 10, fontSize: 12, fill: chartColors.text, fontWeight: 700 }}
                        />
                        <Tooltip
                            {...tooltipStyle}
                            itemStyle={{ fontWeight: 600 }}
                            formatter={(value: number) => [value, '%']}
                            labelFormatter={(label) => {
                                const idx = Number(label);
                                const item = POWER_CHART_DATA.find((d) => d.index === idx);
                                return item ? item.time : '';
                            }}
                        />
                        <Area type="monotone" dataKey="soc" name={t.legend.soc} stroke="#facc15" strokeWidth={2.5} fill="url(#colorSoc)" isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="ems-card flex flex-col p-5">
            <h3 className="mb-4 shrink-0 text-lg font-bold text-slate-900 dark:text-white">
              {t.charts.powerTrend}
            </h3>
            <div className="h-[256px] w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={POWER_CHART_DATA} syncId="powerTracking" margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                        <defs>
                            <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#819226" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#819226" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                        <XAxis {...powerTabXAxisProps} />
                        <YAxis
                            fontSize={13}
                            tickLine={false}
                            axisLine={false}
                            stroke={chartColors.text}
                            domain={[-150, 150]}
                            ticks={[-100, 0, 100]}
                            fontWeight={600}
                            label={{ value: t.unitKw, position: 'insideLeft', angle: -90, dx: -4, dy: 10, fontSize: 12, fill: chartColors.text, fontWeight: 700 }}
                        />
                        <Tooltip
                            {...tooltipStyle}
                            itemStyle={{ fontWeight: 600 }}
                            formatter={(value: number) => [value, 'kW']}
                            labelFormatter={(label) => {
                                const idx = Number(label);
                                const item = POWER_CHART_DATA.find((d) => d.index === idx);
                                return item ? item.time : '';
                            }}
                        />
                        <ReferenceLine y={0} stroke={chartColors.grid} strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="power" name={t.legend.power} stroke="#819226" strokeWidth={2.5} fill="url(#colorPower)" isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    </>
  );

  /** 电池簇分析底部时间刷：与图表/卡片底色接近，低对比 */
  const batteryTimeBrush = () => (
      <Brush
          dataKey="time"
          height={14}
          stroke={isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(100, 116, 139, 0.4)'}
          fill={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)'}
          travellerWidth={6}
          tickFormatter={() => ''}
      />
  );

  const renderBatteryAnalysis = () => (
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
              {/* 1. Cluster Voltage */}
              <SimpleChartContainer title={t.charts.clusterVol} className="!h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={BATTERY_CHART_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 22 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                          <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} interval={12} fontWeight={600} />
                          <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} domain={['auto', 'auto']} unit="V" fontWeight={600} />
                          <Tooltip {...tooltipStyle} itemStyle={{ color: '#3b82f6' }} />
                          <Line type="monotone" dataKey="voltage" stroke="#3b82f6" strokeWidth={2} dot={false} name="Voltage" isAnimationActive={false}/>
                          {batteryTimeBrush()}
                      </LineChart>
                  </ResponsiveContainer>
              </SimpleChartContainer>

              {/* 2. Cluster Current */}
              <SimpleChartContainer title={t.charts.clusterCur} className="!h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={BATTERY_CHART_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 22 }}>
                          <defs>
                              <linearGradient id="colorCur" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                          <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} interval={12} fontWeight={600} />
                          <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} unit="A" fontWeight={600} />
                          <Tooltip {...tooltipStyle} itemStyle={{ color: '#f97316' }} />
                          <Area type="monotone" dataKey="current" stroke="#f97316" fill="url(#colorCur)" strokeWidth={2} name="Current" isAnimationActive={false}/>
                          {batteryTimeBrush()}
                      </AreaChart>
                  </ResponsiveContainer>
              </SimpleChartContainer>

              {/* 3. Cluster SOC */}
              <SimpleChartContainer title={t.charts.clusterSoc} className="!h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={BATTERY_CHART_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 22 }}>
                          <defs>
                              <linearGradient id="colorSocBat" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                          <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} interval={12} fontWeight={600} />
                          <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} domain={[0, 100]} unit="%" fontWeight={600} />
                          <Tooltip {...tooltipStyle} itemStyle={{ color: '#10b981' }} />
                          <Area type="monotone" dataKey="soc" stroke="#10b981" fill="url(#colorSocBat)" strokeWidth={2} name="SOC" isAnimationActive={false}/>
                          {batteryTimeBrush()}
                      </AreaChart>
                  </ResponsiveContainer>
              </SimpleChartContainer>

              {/* 4. Cluster SOH */}
              <SimpleChartContainer title={t.charts.clusterSoh} className="!h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={BATTERY_CHART_DATA} margin={{ top: 5, right: 5, left: 0, bottom: 22 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                          <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} interval={12} fontWeight={600} />
                          <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} domain={[90, 100]} unit="%" fontWeight={600} />
                          <Tooltip {...tooltipStyle} itemStyle={{ color: '#14b8a6' }} />
                          <Line type="step" dataKey="soh" stroke="#14b8a6" strokeWidth={2} dot={false} name="SOH" isAnimationActive={false}/>
                          {batteryTimeBrush()}
                      </LineChart>
                  </ResponsiveContainer>
              </SimpleChartContainer>

              {/* 5. Cell Max/Min Voltage */}
              <SimpleChartContainer title={t.charts.cellVol} className="!h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={BATTERY_CHART_DATA} margin={{ top: 28, right: 8, left: 0, bottom: 22 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                          <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} interval={16} fontWeight={600} />
                          <YAxis
                              fontSize={13}
                              tickLine={false}
                              axisLine={false}
                              stroke={chartColors.text}
                              domain={['dataMin - 0.02', 'dataMax + 0.02']}
                              tickFormatter={(v) => `${v}V`}
                              fontWeight={600}
                          />
                          <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [`${value} V`, name]} />
                          <Legend verticalAlign="top" align="right" height={24} iconType="line" wrapperStyle={{ fontSize: '13px', fontWeight: 700 }} />
                          <Line type="monotone" dataKey="cellVolMax" name={t.charts.cellVolMax} stroke="#6d28d9" strokeWidth={2} dot={false} isAnimationActive={false}/>
                          <Line type="monotone" dataKey="cellVolMin" name={t.charts.cellVolMin} stroke="#c084fc" strokeWidth={2} dot={false} isAnimationActive={false}/>
                          {batteryTimeBrush()}
                      </LineChart>
                  </ResponsiveContainer>
              </SimpleChartContainer>

              {/* 6. Cell Max/Min Temperature */}
              <SimpleChartContainer title={t.charts.cellTemp} className="!h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={BATTERY_CHART_DATA} margin={{ top: 28, right: 8, left: 0, bottom: 22 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                          <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} interval={16} fontWeight={600} />
                          <YAxis
                              fontSize={13}
                              tickLine={false}
                              axisLine={false}
                              stroke={chartColors.text}
                              domain={['dataMin - 1', 'dataMax + 1']}
                              tickFormatter={(v) => `${v}°C`}
                              fontWeight={600}
                          />
                          <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [`${value} °C`, name]} />
                          <Legend verticalAlign="top" align="right" height={24} iconType="line" wrapperStyle={{ fontSize: '13px', fontWeight: 700 }} />
                          <Line type="monotone" dataKey="cellTempMax" name={t.charts.cellTempMax} stroke="#ea580c" strokeWidth={2} dot={false} isAnimationActive={false}/>
                          <Line type="monotone" dataKey="cellTempMin" name={t.charts.cellTempMin} stroke="#fb923c" strokeWidth={2} dot={false} isAnimationActive={false}/>
                          {batteryTimeBrush()}
                      </LineChart>
                  </ResponsiveContainer>
              </SimpleChartContainer>
      </div>
  );

  return (
    <div className="ems-page-shell">
        {/* 顶栏：与实时数据页同款 */}
        <div className="ems-card mb-4 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="custom-scrollbar-hide flex w-full min-w-0 items-center overflow-x-auto md:w-auto md:flex-1">
                <div className="ems-segmented shrink-0">
                    {[
                        { id: 'load', label: t.tabs.load, icon: Activity },
                        { id: 'power', label: t.tabs.power, icon: Zap },
                        { id: 'battery', label: t.tabs.battery, icon: Battery }
                    ].map((item) => (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveTab(item.id as any)}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all whitespace-nowrap
                            ${activeTab === item.id 
                                ? 'bg-white text-blue-600 shadow-sm dark:bg-apple-surface-dark dark:text-blue-400' 
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            <item.icon size={16} />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-3 md:w-auto md:shrink-0">
                {activeTab === 'battery' && (
                    <div className="flex shrink-0 items-center gap-2">
                        <div className="relative">
                            <div className="relative flex min-w-[132px] items-center rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark">
                                <Package size={16} className="mr-2 shrink-0 text-slate-400" aria-hidden />
                                <select
                                    value={selectedStack}
                                    onChange={(e) => setSelectedStack(e.target.value)}
                                    className="w-full min-w-0 cursor-pointer appearance-none bg-transparent pr-1 text-sm font-bold text-slate-700 outline-none dark:text-slate-200"
                                    aria-label={t.stackSelect}
                                >
                                    {BATTERY_STACKS.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                        <div className="relative">
                            <div className="relative flex min-w-[132px] items-center rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark">
                                <Layers size={16} className="mr-2 shrink-0 text-slate-400" aria-hidden />
                                <select 
                                    value={selectedCluster} 
                                    onChange={(e) => setSelectedCluster(e.target.value)}
                                    className="w-full min-w-0 cursor-pointer appearance-none bg-transparent pr-1 text-sm font-bold text-slate-700 outline-none dark:text-slate-200"
                                    aria-label={t.clusterSelect}
                                >
                                    {BATTERY_CLUSTERS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className={`relative flex min-w-[240px] items-stretch overflow-hidden rounded-xl border bg-slate-50 transition-all dark:bg-apple-surface-secondary-dark
                    ${isDateOpen
                        ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30'
                        : 'border-slate-200 dark:border-apple-border-dark hover:border-slate-300 dark:hover:border-white/15'}`}
                >
                    <button
                        type="button"
                        onClick={() => setIsDateOpen(!isDateOpen)}
                        className="group flex min-w-0 flex-1 items-center justify-between gap-2 border-0 bg-transparent px-4 py-2 text-left outline-none ring-0"
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <Calendar size={16} className="shrink-0 text-slate-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"/>
                            <span className="truncate font-mono text-sm font-bold text-slate-700 dark:text-slate-200">
                                {dateRange.start} <span className="mx-1 text-slate-300">→</span> {dateRange.end}
                            </span>
                        </div>
                        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform duration-300 ${isDateOpen ? 'rotate-180' : ''}`}/>
                    </button>
                    <div className="w-px shrink-0 self-stretch bg-slate-200 dark:bg-apple-border-dark" aria-hidden />
                    <button
                        type="button"
                        onClick={handleReset}
                        title={t.reset}
                        aria-label={t.reset}
                        className="flex shrink-0 items-center justify-center border-0 bg-transparent px-3 py-2 text-slate-600 outline-none transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                    >
                        <RotateCcw size={16} />
                    </button>

                    {isDateOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setIsDateOpen(false)}></div>
                            <div className="absolute right-0 top-full z-40 mt-2 animate-in fade-in zoom-in-95 rounded-2xl border border-slate-200 bg-white shadow-xl duration-100 dark:border-apple-border-dark dark:bg-apple-surface-dark">
                                {renderCalendar()}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>

        <div className="min-h-0 space-y-4">
            {activeTab === 'load' && (
                <div className="ems-card relative flex min-h-[560px] flex-col p-5">
                    <div className="mb-4 flex shrink-0 items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.titleLoad}</h3>
                    </div>
                    <div className="relative min-h-0 w-full flex-1">{renderLoadTracking()}</div>
                </div>
            )}
            {activeTab === 'power' && (
                <div className="animate-in fade-in space-y-4 duration-300">
                    <div className="mb-1 flex shrink-0 items-center px-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.titlePower}</h3>
                    </div>
                    {renderPowerTracking()}
                </div>
            )}
            {activeTab === 'battery' && (
                <div className="animate-in fade-in duration-300">
                    <div className="mb-4 flex items-center px-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {`${t.titleBattery} · ${selectedStack} · ${selectedCluster}`}
                        </h3>
                    </div>
                    {renderBatteryAnalysis()}
                </div>
            )}
        </div>
    </div>
  );
};

export default DataAnalysis;
