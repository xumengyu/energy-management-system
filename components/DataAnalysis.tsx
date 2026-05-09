
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ComposedChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush, LineChart
} from 'recharts';
import { Calendar, RotateCcw, Battery, ChevronDown, Layers, Package, Zap, Activity, ChevronLeft, ChevronRight, SlidersHorizontal, Download, Check } from 'lucide-react';
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

const CUSTOM_METRICS = [
  'soc',
  'soh',
  'acActivePower',
  'dcVoltage',
  'dcCurrent',
  'cellMaxVoltage',
  'cellMinVoltage',
  'cellMaxTemp',
  'cellMinTemp',
] as const;

const CUSTOM_DEVICE_OPTIONS = [
  { id: 'lot2_pcs_1_1', en: 'Lot 2 PCS 1-1', zh: '2#地块PCS1-1' },
  { id: 'lot2_pcs_1_2', en: 'Lot 2 PCS 1-2', zh: '2#地块PCS1-2' },
  { id: 'lot2_pcs_2_1', en: 'Lot 2 PCS 2-1', zh: '2#地块PCS2-1' },
  { id: 'lot2_pcs_2_2', en: 'Lot 2 PCS 2-2', zh: '2#地块PCS2-2' },
  { id: 'lot3_pcs_3_1', en: 'Lot 3 PCS 3-1', zh: '3#地块PCS3-1' },
  { id: 'lot3_pcs_3_2', en: 'Lot 3 PCS 3-2', zh: '3#地块PCS3-2' },
] as const;

type CustomCategoryId = (typeof CUSTOM_DEVICE_OPTIONS)[number]['id'];

const generateCustomReportData = () => {
  return Array.from({ length: 168 }, (_, i) => {
    const day = 17 + Math.floor(i / 24);
    const hour = i % 24;
    const dayStr = `05-${String(day).padStart(2, '0')}`;
    const timeLabel = `${String(hour).padStart(2, '0')}:00`;
    const t = i / 10;

    return {
      time: `${dayStr} ${timeLabel}`,
      soc: Math.round((68 + Math.sin(t) * 1.6) * 10) / 10,
      soh: Math.round((92 + Math.sin(t / 3) * 0.25) * 10) / 10,
      acActivePower: Math.round(128 + Math.sin(t * 2.2) * 12 + Math.random() * 4),
      dcVoltage: Math.round((752 + Math.sin(t / 2) * 1.8) * 10) / 10,
      dcCurrent: Math.round((185 + Math.cos(t * 1.7) * 2.4) * 10) / 10,
      cellMaxVoltage: Math.round((3.655 + Math.sin(t / 2.5) * 0.006) * 1000) / 1000,
      cellMinVoltage: Math.round((3.281 + Math.sin(t / 2.5) * 0.004) * 1000) / 1000,
      cellMaxTemp: Math.round((32.6 + Math.sin(t / 2.8) * 0.25) * 10) / 10,
      cellMinTemp: Math.round((24.2 + Math.cos(t / 2.8) * 0.18) * 10) / 10,
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
  
  const [activeTab, setActiveTab] = useState<'load' | 'power' | 'battery' | 'custom'>('load');
  const [dateRange, setDateRange] = useState({ start: today, end: today });
  const [selectedStack, setSelectedStack] = useState(BATTERY_STACKS[0]);
  const [selectedCluster, setSelectedCluster] = useState(BATTERY_CLUSTERS[0]);
  const [isBatteryStackOpen, setIsBatteryStackOpen] = useState(false);
  const [isBatteryClusterOpen, setIsBatteryClusterOpen] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState<CustomCategoryId>('lot2_pcs_1_1');
  const [customMetrics, setCustomMetrics] = useState<string[]>([...CUSTOM_METRICS]);
  const [customStartDateTime, setCustomStartDateTime] = useState('2025-05-17T00:00:00');
  const [customEndDateTime, setCustomEndDateTime] = useState('2025-05-23T23:59:59');
  const [isCustomMetricOpen, setIsCustomMetricOpen] = useState(false);
  const [isCustomCategoryOpen, setIsCustomCategoryOpen] = useState(false);
  const [isCustomTimeRangeOpen, setIsCustomTimeRangeOpen] = useState(false);
  const [activeCustomTimeField, setActiveCustomTimeField] = useState<'start' | 'end'>('start');
  const [customCalendarView, setCustomCalendarView] = useState(new Date(2025, 4, 1));
  const customHourListRef = useRef<HTMLDivElement>(null);
  const customMinuteListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedStack(BATTERY_STACKS[0]);
    setSelectedCluster(BATTERY_CLUSTERS[0]);
    setIsBatteryStackOpen(false);
    setIsBatteryClusterOpen(false);
  }, [lang]);

  useEffect(() => {
    setIsCustomMetricOpen(false);
    setIsCustomCategoryOpen(false);
    setIsCustomTimeRangeOpen(false);
    setIsBatteryStackOpen(false);
    setIsBatteryClusterOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!isCustomTimeRangeOpen) return;
    const [hour = '00', minute = '00'] = getCustomTimePart(getCustomTimeValue(activeCustomTimeField)).split(':');
    requestAnimationFrame(() => {
      const row = 32;
      const viewportMid = 246 / 2 - row / 2;
      if (customHourListRef.current) customHourListRef.current.scrollTop = Math.max(0, Number(hour) * row - viewportMid + 24);
      if (customMinuteListRef.current) customMinuteListRef.current.scrollTop = Math.max(0, Number(minute) * row - viewportMid + 24);
    });
  }, [isCustomTimeRangeOpen, activeCustomTimeField, customStartDateTime, customEndDateTime]);
  
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); 
  const [tempSelection, setTempSelection] = useState<{ start: string | null; end: string | null }>({ start: today, end: today });

  const LOAD_CHART_DATA = useMemo(() => generateLoadData(dateRange.start), [dateRange]);
  const POWER_CHART_DATA = useMemo(() => generatePowerData(dateRange.start), [dateRange]);
  const BATTERY_CHART_DATA = useMemo(() => generateBatteryData(dateRange.start), [dateRange]);
  const CUSTOM_REPORT_DATA = useMemo(() => generateCustomReportData(), []);
  const customDeviceLabelMap = useMemo(
    () =>
      Object.fromEntries(
        CUSTOM_DEVICE_OPTIONS.map((item) => [item.id, lang === 'zh' ? item.zh : item.en]),
      ) as Record<CustomCategoryId, string>,
    [lang],
  );

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
    const weekDays = lang === 'zh' ? ['日', '一', '二', '三', '四', '五', '六'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const monthLabel = lang === 'zh'
      ? `${viewDate.getFullYear()}年${viewDate.getMonth() + 1}月`
      : viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

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
                className={`relative h-8 w-full rounded-lg text-xs font-bold transition-all
                    ${disabled ? (isDark ? 'cursor-not-allowed bg-slate-800/40 text-slate-600' : 'cursor-not-allowed bg-slate-50/50 text-slate-300') : ''}
                    ${!disabled && selected 
                        ? 'bg-brand-500 text-white z-10 shadow-md shadow-brand-500/30' 
                        : !disabled && inRange 
                            ? (isDark ? 'rounded-none bg-brand-900/20 text-brand-200' : 'rounded-none bg-brand-50 text-brand-700') 
                            : !disabled && (isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')
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
      <div className={`w-[320px] p-4 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className={`rounded p-1 transition-colors ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <ChevronLeft size={16} />
          </button>
          <div className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            {monthLabel}
          </div>
          <button
            onClick={handleNextMonth}
            className={`rounded p-1 transition-colors ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center">
          {weekDays.map(d => (
            <div key={d} className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {days}
        </div>

        <div className={`mt-4 flex items-center justify-between border-t pt-4 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <div className={`min-w-0 pr-3 text-xs ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
            {tempSelection.start ? (
              <span className="block truncate">{tempSelection.start} {tempSelection.end ? `→ ${tempSelection.end}` : ''}</span>
            ) : 'Select range'}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setIsDateOpen(false)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              Cancel
            </button>
            <button
              onClick={applyDateSelection}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700"
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

  const customMetricConfig = {
    soc: { label: 'SOC (%)', color: '#84cc16' },
    soh: { label: 'SOH (%)', color: '#60a5fa' },
    acActivePower: { label: 'AC Active Power (kW)', color: '#a855f7' },
    dcVoltage: { label: 'DC Voltage (V)', color: '#f97316' },
    dcCurrent: { label: 'DC Current (A)', color: '#06b6d4' },
    cellMaxVoltage: { label: 'Cell Max Voltage (V)', color: '#facc15' },
    cellMinVoltage: { label: 'Cell Min Voltage (V)', color: '#f472b6' },
    cellMaxTemp: { label: 'Cell Max Temperature (°C)', color: '#ef4444' },
    cellMinTemp: { label: 'Cell Min Temperature (°C)', color: '#3b82f6' },
  } as const;

  const removeCustomMetric = (metric: string) => {
    setCustomMetrics((prev) => prev.filter((m) => m !== metric));
  };

  const toggleCustomMetric = (metric: string) => {
    setCustomMetrics((prev) => (prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]));
  };

  const formatCustomDateTime = (value: string) => {
    const [date, time = '00:00:00'] = value.split('T');
    const [hour = '00', minute = '00'] = time.split(':');
    return `${date} ${hour}:${minute}`;
  };
  const getCustomDatePart = (value: string) => value.split('T')[0];
  const getCustomTimePart = (value: string) => value.split('T')[1] || '00:00:00';
  const getCustomTimeValue = (field: 'start' | 'end') => (field === 'start' ? customStartDateTime : customEndDateTime);
  const customTimeLabels = {
    start: lang === 'zh' ? '开始时间' : 'Start Time',
    end: lang === 'zh' ? '结束时间' : 'End Time',
    confirm: lang === 'zh' ? '确定' : 'Confirm',
  };

  const setCustomDateTimeValue = (field: 'start' | 'end', value: string) => {
    if (field === 'start') {
      setCustomStartDateTime(value);
      return;
    }
    setCustomEndDateTime(value);
  };

  const activateCustomTimeField = (field: 'start' | 'end') => {
    setActiveCustomTimeField(field);
    const fieldDate = new Date(`${getCustomDatePart(getCustomTimeValue(field))}T00:00:00`);
    if (!Number.isNaN(fieldDate.getTime())) {
      setCustomCalendarView(new Date(fieldDate.getFullYear(), fieldDate.getMonth(), 1));
    }
  };

  const handleCustomDateSelect = (day: number) => {
    const datePart = `${customCalendarView.getFullYear()}-${String(customCalendarView.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timePart = getCustomTimePart(getCustomTimeValue(activeCustomTimeField));
    setCustomDateTimeValue(activeCustomTimeField, `${datePart}T${timePart}`);
  };

  const handleCustomTimeChange = (field: 'start' | 'end', timeValue: string) => {
    const normalizedTime = `${timeValue.split(':').slice(0, 2).join(':')}:00`;
    setCustomDateTimeValue(field, `${getCustomDatePart(getCustomTimeValue(field))}T${normalizedTime}`);
  };

  const handleCustomTimeUnitChange = (field: 'start' | 'end', unitIndex: number, unitValue: string) => {
    const parts = getCustomTimePart(getCustomTimeValue(field)).split(':');
    parts[unitIndex] = unitValue;
    handleCustomTimeChange(field, parts.slice(0, 2).join(':'));
  };

  const shiftCustomCalendarMonth = (offset: number) => {
    setCustomCalendarView(new Date(customCalendarView.getFullYear(), customCalendarView.getMonth() + offset, 1));
  };

  const renderCustomTimeRangeDropdown = () => {
    const year = customCalendarView.getFullYear();
    const month = customCalendarView.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);
    const selectedDate = getCustomDatePart(getCustomTimeValue(activeCustomTimeField));
    const activeTimeParts = getCustomTimePart(getCustomTimeValue(activeCustomTimeField)).split(':');
    const monthLabel = lang === 'zh'
      ? `${year}年 ${month + 1}月`
      : customCalendarView.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const weekDays = lang === 'zh' ? ['一', '二', '三', '四', '五', '六', '日'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const mondayStartOffset = (startDay + 6) % 7;
    const days = [];

    for (let i = 0; i < mondayStartOffset; i++) {
      days.push(
        <span key={`prev-${i}`} className="flex h-8 items-center justify-center text-xs font-semibold text-slate-300 dark:text-slate-600">
          {prevMonthDays - mondayStartOffset + i + 1}
        </span>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const datePart = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isActive = datePart === selectedDate;

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleCustomDateSelect(day)}
          className={`flex h-8 items-center justify-center rounded-lg text-xs font-bold transition-all
            ${isActive
              ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 dark:bg-brand-500 dark:text-white'
              : 'text-slate-900 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-100 dark:hover:bg-brand-900/25 dark:hover:text-brand-300'}`}
        >
          {day}
        </button>
      );
    }

    while (days.length < 42) {
      const nextDay = days.length - (mondayStartOffset + daysInMonth) + 1;
      days.push(
        <span key={`next-${nextDay}`} className="flex h-8 items-center justify-center text-xs font-semibold text-slate-300 dark:text-slate-600">
          {nextDay}
        </span>
      );
    }

    const renderTimeColumn = (unitIndex: number, max: number) => (
      <div
        ref={unitIndex === 0 ? customHourListRef : customMinuteListRef}
        className="custom-scrollbar-hide h-[246px] snap-y scroll-pt-6 scroll-pb-0 overflow-y-auto border-l border-slate-100 pt-6 pb-0 dark:border-apple-border-dark"
      >
        {Array.from({ length: max + 1 }, (_, value) => {
          const label = String(value).padStart(2, '0');
          const selected = activeTimeParts[unitIndex] === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => handleCustomTimeUnitChange(activeCustomTimeField, unitIndex, label)}
              className={`mx-1 flex h-8 w-[calc(100%-0.5rem)] snap-center items-center justify-center rounded-md text-xs font-bold transition-colors
                ${selected
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 dark:bg-brand-500 dark:text-white'
                  : 'text-slate-900 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-100 dark:hover:bg-brand-900/25 dark:hover:text-brand-300'}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );

    return (
      <div className="w-[min(94vw,440px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:shadow-black/30">
        <div className="grid grid-cols-[292px_148px] items-start">
          <div>
            <div className="flex h-10 items-center justify-between border-b border-slate-100 px-2 dark:border-apple-border-dark">
              <button
                type="button"
                onClick={() => shiftCustomCalendarMonth(-12)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-brand-700 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-brand-300"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => shiftCustomCalendarMonth(-1)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-brand-700 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-brand-300"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="min-w-24 text-center text-xs font-bold text-slate-900 dark:text-white">{monthLabel}</div>
              <button
                type="button"
                onClick={() => shiftCustomCalendarMonth(1)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-brand-700 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-brand-300"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => shiftCustomCalendarMonth(12)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-brand-700 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-brand-300"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-7 border-b border-slate-100 px-2.5 py-1.5 text-center dark:border-apple-border-dark">
              {weekDays.map((day) => (
                <div key={day} className="text-xs font-bold text-slate-500 dark:text-slate-400">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5 px-2.5 py-1.5">{days}</div>
          </div>
          <div className="grid grid-cols-2 items-start self-start border-l border-slate-100 dark:border-apple-border-dark">
            {renderTimeColumn(0, 23)}
            {renderTimeColumn(1, 59)}
          </div>
        </div>
        <div className="flex h-12 items-center justify-end border-t border-slate-100 px-3 dark:border-apple-border-dark">
          <button
            type="button"
            onClick={() => {
              if (activeCustomTimeField === 'start') {
                activateCustomTimeField('end');
                setIsCustomTimeRangeOpen(true);
              } else {
                setIsCustomTimeRangeOpen(false);
              }
            }}
            className="rounded-lg border border-brand-500 bg-brand-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-600"
          >
            {customTimeLabels.confirm}
          </button>
        </div>
      </div>
    );
  };

  const renderCustomFilters = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-4 xl:grid-cols-12 xl:gap-x-6">
      <div className="min-w-0 sm:col-span-1 xl:col-span-2">
        <div className={`relative w-full max-w-full ${isCustomCategoryOpen ? 'z-[70]' : ''}`}>
          <button
            type="button"
            onClick={() => {
              setIsCustomMetricOpen(false);
              setIsCustomTimeRangeOpen(false);
              setIsCustomCategoryOpen((v) => !v);
            }}
            className={`flex h-10 w-full items-center justify-between rounded-xl border bg-slate-50 px-3 text-sm font-bold text-slate-700 transition-all dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200
              ${isCustomCategoryOpen
                ? 'border-brand-400 ring-2 ring-brand-100 dark:ring-brand-900/30'
                : 'border-slate-200 hover:border-slate-300 dark:hover:border-white/15'}`}
          >
            <span>{customDeviceLabelMap[customCategory]}</span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isCustomCategoryOpen ? 'rotate-180 text-brand-500 dark:text-brand-400' : ''}`} />
          </button>
          {isCustomCategoryOpen && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setIsCustomCategoryOpen(false)} />
              <div className="absolute left-0 top-full z-[80] mt-2 w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-apple-border-dark dark:bg-apple-surface-dark">
                {CUSTOM_DEVICE_OPTIONS.map((device) => {
                  const checked = customCategory === device.id;
                  return (
                    <button
                      key={device.id}
                      type="button"
                      onClick={() => {
                        setCustomCategory(device.id);
                        setIsCustomCategoryOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors
                        ${checked
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark'}`}
                    >
                      <span>{lang === 'zh' ? device.zh : device.en}</span>
                      {checked && <Check size={14} className="text-brand-600 dark:text-brand-400" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="min-w-0 sm:col-span-2 xl:col-span-7">
        <div className={`relative ${isCustomMetricOpen ? 'z-[70]' : ''}`}>
          <button
            type="button"
            onClick={() => {
              setIsCustomCategoryOpen(false);
              setIsCustomTimeRangeOpen(false);
              setIsCustomMetricOpen((v) => !v);
            }}
            className={`flex min-h-10 w-full max-w-full items-start gap-2 rounded-xl border bg-slate-50 px-3 py-2 text-left text-sm font-bold outline-none ring-0 transition-all dark:bg-apple-surface-secondary-dark
              ${isCustomMetricOpen
                ? 'border-brand-400 ring-2 ring-brand-100 dark:ring-brand-900/30'
                : 'border-slate-200 hover:border-slate-300 dark:border-apple-border-dark dark:hover:border-white/15'}`}
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              {customMetrics.length === 0 ? (
                <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">{t.custom.selectDataValues}</span>
              ) : (
                customMetrics.map((metric) => (
                  <span
                    key={metric}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-700 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-200"
                  >
                    {customMetricConfig[metric as keyof typeof customMetricConfig].label}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomMetric(metric);
                      }}
                      className="rounded px-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label={`Remove ${metric}`}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
            <ChevronDown
              size={14}
              className={`shrink-0 self-center transition-transform ${isCustomMetricOpen ? 'rotate-180 text-brand-500 dark:text-brand-400' : 'text-slate-400'}`}
            />
          </button>
          {isCustomMetricOpen && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setIsCustomMetricOpen(false)} />
              <div className="absolute left-0 top-full z-[80] mt-2 max-h-[min(60vh,22rem)] w-[min(100%,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-apple-border-dark dark:bg-apple-surface-dark sm:w-full">
                {CUSTOM_METRICS.map((metric) => {
                  const checked = customMetrics.includes(metric);
                  return (
                    <button
                      key={metric}
                      type="button"
                      onClick={() => toggleCustomMetric(metric)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors
                        ${checked
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark'}`}
                    >
                      <span>{customMetricConfig[metric].label}</span>
                      {checked && <Check size={14} className="text-brand-600 dark:text-brand-400" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="min-w-0 w-full max-w-[440px] sm:col-span-2 xl:col-span-3 xl:justify-self-end">
        <div className={`relative ${isCustomTimeRangeOpen ? 'z-50' : ''}`}>
          <div
            className={`relative z-50 flex h-10 w-full items-center gap-2 overflow-hidden rounded-xl border bg-slate-50 px-2 text-left outline-none ring-0 transition-all dark:bg-apple-surface-secondary-dark
              ${isCustomTimeRangeOpen
                ? 'border-brand-400 ring-2 ring-brand-100 dark:ring-brand-900/30'
                : 'border-slate-200 hover:border-slate-300 dark:border-apple-border-dark dark:hover:border-white/15'}`}
          >
            <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center text-sm font-bold">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                    setIsCustomCategoryOpen(false);
                  activateCustomTimeField('start');
                    setIsCustomMetricOpen(false);
                  setIsCustomTimeRangeOpen(true);
                }}
                className={`min-w-0 truncate rounded-lg px-1.5 py-2 text-left transition-colors
                  ${activeCustomTimeField === 'start' && isCustomTimeRangeOpen
                    ? 'text-brand-700 dark:text-brand-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'}`}
              >
                {formatCustomDateTime(customStartDateTime) || customTimeLabels.start}
              </button>
              <span className="px-3 text-slate-400">→</span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => {
                    setIsCustomCategoryOpen(false);
                  activateCustomTimeField('end');
                    setIsCustomMetricOpen(false);
                  setIsCustomTimeRangeOpen(true);
                }}
                className={`min-w-0 truncate rounded-lg px-1.5 py-2 text-left transition-colors
                  ${activeCustomTimeField === 'end' && isCustomTimeRangeOpen
                    ? 'text-brand-700 dark:text-brand-300'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100'}`}
              >
                {formatCustomDateTime(customEndDateTime) || customTimeLabels.end}
              </button>
            </div>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={() => {
                setIsCustomCategoryOpen(false);
                activateCustomTimeField(activeCustomTimeField);
                setIsCustomMetricOpen(false);
                setIsCustomTimeRangeOpen(true);
              }}
              className="flex shrink-0 items-center justify-center rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-700 dark:hover:bg-apple-surface-dark dark:hover:text-brand-300"
              aria-label={t.custom.timeRange}
            >
              <Calendar size={16} />
            </button>
            {isCustomTimeRangeOpen && (
              <span
                className={`absolute bottom-0 h-0.5 bg-brand-500 transition-all ${activeCustomTimeField === 'start' ? 'left-3 w-[calc(50%-28px)]' : 'left-[calc(50%+15px)] w-[calc(50%-50px)]'}`}
              />
            )}
          </div>
          {isCustomTimeRangeOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsCustomTimeRangeOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-3 w-[min(94vw,440px)] max-w-[calc(100vw-1rem)] animate-in fade-in zoom-in-95 duration-100">
                {renderCustomTimeRangeDropdown()}
              </div>
            </>
          )}
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setCustomStartDateTime('2025-05-17T00:00:00');
              setCustomEndDateTime('2025-05-23T23:59:59');
              setCustomCalendarView(new Date(2025, 4, 1));
            }}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-apple-border-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
          >
            {t.reset}
          </button>
          <button type="button" className="rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-700">{t.custom.generateReport}</button>
        </div>
      </div>
    </div>
  );

  const renderBatteryFilters = () => (
    <div className="flex flex-wrap items-center gap-2">
      <div className={`relative w-full sm:w-auto sm:min-w-[220px] ${isBatteryStackOpen ? 'z-50' : ''}`}>
        <button
          type="button"
          onClick={() => {
            setIsBatteryClusterOpen(false);
            setIsBatteryStackOpen((v) => !v);
          }}
          className={`flex h-10 w-full items-center justify-between rounded-xl border bg-slate-50 px-3 text-sm font-bold text-slate-700 transition-all dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200
            ${isBatteryStackOpen
              ? 'border-brand-400 ring-2 ring-brand-100 dark:ring-brand-900/30'
              : 'border-slate-200 hover:border-slate-300 dark:hover:border-white/15'}`}
          aria-label={t.stackSelect}
        >
          <span>{selectedStack}</span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isBatteryStackOpen ? 'rotate-180 text-brand-500 dark:text-brand-400' : ''}`} />
        </button>
        {isBatteryStackOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsBatteryStackOpen(false)} />
            <div className="absolute left-0 top-full z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-apple-border-dark dark:bg-apple-surface-dark">
              {BATTERY_STACKS.map((s) => {
                const checked = selectedStack === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSelectedStack(s);
                      setIsBatteryStackOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors
                      ${checked
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark'}`}
                  >
                    <span>{s}</span>
                    {checked && <Check size={14} className="text-brand-600 dark:text-brand-400" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div className={`relative w-full sm:w-auto sm:min-w-[220px] ${isBatteryClusterOpen ? 'z-50' : ''}`}>
        <button
          type="button"
          onClick={() => {
            setIsBatteryStackOpen(false);
            setIsBatteryClusterOpen((v) => !v);
          }}
          className={`flex h-10 w-full items-center justify-between rounded-xl border bg-slate-50 px-3 text-sm font-bold text-slate-700 transition-all dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200
            ${isBatteryClusterOpen
              ? 'border-brand-400 ring-2 ring-brand-100 dark:ring-brand-900/30'
              : 'border-slate-200 hover:border-slate-300 dark:hover:border-white/15'}`}
          aria-label={t.clusterSelect}
        >
          <span>{selectedCluster}</span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isBatteryClusterOpen ? 'rotate-180 text-brand-500 dark:text-brand-400' : ''}`} />
        </button>
        {isBatteryClusterOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setIsBatteryClusterOpen(false)} />
            <div className="absolute left-0 top-full z-30 mt-2 w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-apple-border-dark dark:bg-apple-surface-dark">
              {BATTERY_CLUSTERS.map((c) => {
                const checked = selectedCluster === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setSelectedCluster(c);
                      setIsBatteryClusterOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors
                      ${checked
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark'}`}
                  >
                    <span>{c}</span>
                    {checked && <Check size={14} className="text-brand-600 dark:text-brand-400" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div className="ml-auto">{renderDateSelector()}</div>
    </div>
  );

  const renderCustomAnalysis = () => (
    <div className="animate-in fade-in space-y-4 duration-300">
      <div className="ems-card p-5">
        <div className="h-[540px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={CUSTOM_REPORT_DATA} margin={{ top: 28, right: 24, left: 0, bottom: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
              <XAxis dataKey="time" tickLine={false} axisLine={false} stroke={chartColors.text} interval={23} />
              <YAxis yAxisId="left" tickLine={false} axisLine={false} stroke={chartColors.text} domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} stroke={chartColors.text} domain={[0, 1000]} />
              <Tooltip {...tooltipStyle} />
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
              {customMetrics.includes('soc') && <Line yAxisId="left" type="monotone" dataKey="soc" name={customMetricConfig.soc.label} stroke={customMetricConfig.soc.color} dot={false} isAnimationActive={false} />}
              {customMetrics.includes('soh') && <Line yAxisId="left" type="monotone" dataKey="soh" name={customMetricConfig.soh.label} stroke={customMetricConfig.soh.color} dot={false} isAnimationActive={false} />}
              {customMetrics.includes('acActivePower') && <Line yAxisId="right" type="monotone" dataKey="acActivePower" name={customMetricConfig.acActivePower.label} stroke={customMetricConfig.acActivePower.color} dot={false} isAnimationActive={false} />}
              {customMetrics.includes('dcVoltage') && <Line yAxisId="right" type="monotone" dataKey="dcVoltage" name={customMetricConfig.dcVoltage.label} stroke={customMetricConfig.dcVoltage.color} dot={false} isAnimationActive={false} />}
              {customMetrics.includes('dcCurrent') && <Line yAxisId="right" type="monotone" dataKey="dcCurrent" name={customMetricConfig.dcCurrent.label} stroke={customMetricConfig.dcCurrent.color} dot={false} isAnimationActive={false} />}
              {customMetrics.includes('cellMaxVoltage') && <Line yAxisId="left" type="monotone" dataKey="cellMaxVoltage" name={customMetricConfig.cellMaxVoltage.label} stroke={customMetricConfig.cellMaxVoltage.color} dot={false} isAnimationActive={false} />}
              {customMetrics.includes('cellMinVoltage') && <Line yAxisId="left" type="monotone" dataKey="cellMinVoltage" name={customMetricConfig.cellMinVoltage.label} stroke={customMetricConfig.cellMinVoltage.color} dot={false} isAnimationActive={false} />}
              {customMetrics.includes('cellMaxTemp') && <Line yAxisId="left" type="monotone" dataKey="cellMaxTemp" name={customMetricConfig.cellMaxTemp.label} stroke={customMetricConfig.cellMaxTemp.color} dot={false} isAnimationActive={false} />}
              {customMetrics.includes('cellMinTemp') && <Line yAxisId="left" type="monotone" dataKey="cellMinTemp" name={customMetricConfig.cellMinTemp.label} stroke={customMetricConfig.cellMinTemp.color} dot={false} isAnimationActive={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="ems-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-base font-bold text-slate-800 dark:text-slate-100">
            {t.custom.reportData}
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-500/20 dark:text-brand-300">
            <Download size={14} />
            {t.custom.exportCsv}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-bold text-slate-500 dark:border-apple-border-dark dark:text-slate-400">
                <th className="px-3 py-2">{t.custom.timeCol}</th>
                <th className="px-3 py-2">SOC (%)</th>
                <th className="px-3 py-2">SOH (%)</th>
                <th className="px-3 py-2">AC Active Power (kW)</th>
                <th className="px-3 py-2">DC Voltage (V)</th>
                <th className="px-3 py-2">DC Current (A)</th>
                <th className="px-3 py-2">Cell Max Voltage (V)</th>
                <th className="px-3 py-2">Cell Min Voltage (V)</th>
                <th className="px-3 py-2">Cell Max Temperature (°C)</th>
                <th className="px-3 py-2">Cell Min Temperature (°C)</th>
              </tr>
            </thead>
            <tbody>
              {CUSTOM_REPORT_DATA.slice(0, 8).map((row) => (
                <tr key={row.time} className="border-b border-slate-100 text-slate-700 transition-colors hover:bg-slate-50/70 dark:border-white/5 dark:text-slate-200 dark:hover:bg-white/5">
                  <td className="px-3 py-2">{`2025-${row.time}`}</td>
                  <td className="px-3 py-2">{row.soc}</td>
                  <td className="px-3 py-2">{row.soh}</td>
                  <td className="px-3 py-2">{row.acActivePower}</td>
                  <td className="px-3 py-2">{row.dcVoltage}</td>
                  <td className="px-3 py-2">{row.dcCurrent}</td>
                  <td className="px-3 py-2">{row.cellMaxVoltage}</td>
                  <td className="px-3 py-2">{row.cellMinVoltage}</td>
                  <td className="px-3 py-2">{row.cellMaxTemp}</td>
                  <td className="px-3 py-2">{row.cellMinTemp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.custom.showingRecords}</p>
        </div>
      </div>
    </div>
  );

  const renderDateSelector = () => (
    <div
      className={`relative z-20 flex w-full max-w-full items-stretch overflow-visible rounded-xl border bg-slate-50 transition-all sm:w-auto sm:min-w-[300px] dark:bg-apple-surface-secondary-dark
      ${isDateOpen
        ? 'border-brand-500 ring-2 ring-brand-100 dark:ring-brand-900/30'
        : 'border-slate-200 dark:border-apple-border-dark hover:border-slate-300 dark:hover:border-white/15'}`}
    >
      <button
        type="button"
        onClick={() => setIsDateOpen(!isDateOpen)}
        className="group flex h-10 min-w-0 flex-1 items-center justify-between gap-2 border-0 bg-transparent px-3 text-left outline-none ring-0 sm:px-4"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Calendar size={16} className="shrink-0 text-slate-400 transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400" />
          <div className="flex min-w-0 items-center gap-1 font-mono text-sm font-bold text-slate-700 dark:text-slate-200">
            <span className="truncate">{dateRange.start}</span>
            <span className="shrink-0 text-slate-400">-</span>
            <span className="truncate">{dateRange.end}</span>
          </div>
        </div>
        <ChevronDown size={14} className={`shrink-0 transition-transform duration-300 ${isDateOpen ? 'rotate-180 text-brand-500 dark:text-brand-400' : 'text-slate-400'}`} />
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
          <div className="fixed inset-0 z-30" onClick={() => setIsDateOpen(false)} />
          <div className={`absolute right-0 top-full z-40 mt-2 animate-in fade-in zoom-in-95 rounded-2xl border shadow-xl duration-100 ${
            isDark ? 'border-white/10 bg-[#1b212d]' : 'border-slate-200 bg-white'
          }`}>
            {renderCalendar()}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="ems-page-shell">
        {/* 顶栏：与实时数据页同款 */}
        <div className="ems-card mb-4 flex flex-col gap-3 p-4">
            <div className="flex w-full items-center justify-between gap-3">
                <div className="custom-scrollbar-hide min-w-0 flex-1 overflow-x-auto">
                    <div className="flex w-max shrink-0 flex-nowrap items-end border-b border-slate-200 dark:border-white/10">
                        {[
                            { id: 'load', label: t.tabs.load, icon: Activity },
                            { id: 'power', label: t.tabs.power, icon: Zap },
                            { id: 'battery', label: t.tabs.battery, icon: Battery },
                            { id: 'custom', label: t.tabs.custom, icon: SlidersHorizontal }
                        ].map((item) => (
                            <button 
                                key={item.id} 
                                type="button"
                                onClick={() => setActiveTab(item.id as any)}
                                className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-bold transition-colors -mb-px
                                ${activeTab === item.id 
                                    ? 'border-b-2 border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400' 
                                    : 'border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                            >
                                <item.icon size={14} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="border-t border-slate-100 pt-3 dark:border-white/10">
                {(activeTab === 'load' || activeTab === 'power') && (
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {activeTab === 'load' ? t.titleLoad : t.titlePower}
                        </h3>
                        {renderDateSelector()}
                    </div>
                )}
                {activeTab === 'custom' && renderCustomFilters()}
                {activeTab === 'battery' && renderBatteryFilters()}
            </div>
        </div>

        <div className="min-h-0 space-y-4">
            {activeTab === 'load' && (
                <div className="animate-in fade-in space-y-4 duration-300">
                    <div className="ems-card relative flex min-h-[560px] flex-col p-5">
                        <div className="relative min-h-0 w-full flex-1">{renderLoadTracking()}</div>
                    </div>
                </div>
            )}
            {activeTab === 'power' && (
                <div className="animate-in fade-in space-y-4 duration-300">
                    {renderPowerTracking()}
                </div>
            )}
            {activeTab === 'battery' && (
                <div className="animate-in fade-in duration-300">
                    {renderBatteryAnalysis()}
                </div>
            )}
            {activeTab === 'custom' && renderCustomAnalysis()}
        </div>
    </div>
  );
};

export default DataAnalysis;
