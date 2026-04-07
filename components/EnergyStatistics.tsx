
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart
} from 'recharts';
import { 
  Calendar, Download, Zap, Sun, Battery, Cable, RotateCw, 
  TrendingUp, Activity, ChevronLeft, ChevronRight, PieChart, ChevronDown
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

// Mock Data Generators
const generateDailyLoadData = () => {
    return Array.from({ length: 30 }, (_, i) => {
        const consumption = Math.floor(Math.random() * 800) + 400;
        const peak = Math.floor(consumption * 0.1) + (consumption / 24) * 1.5;
        return {
            day: `${i + 1}`,
            consumption,
            peak: parseFloat(peak.toFixed(1))
        };
    });
};

const generateEssData = () => {
    return Array.from({ length: 30 }, (_, i) => {
        const charge = Math.floor(Math.random() * 500) + 200;
        const efficiency = 85 + Math.random() * 10;
        const discharge = Math.floor(charge * (efficiency / 100));
        const cycleCount = Math.floor(Math.random() * 4) + 2;

        return {
            day: `${i + 1}`,
            charge,
            discharge,
            cycleCount,
            revenue: Math.floor(Math.random() * 100) + 50
        };
    });
};

const generatePvData = () => {
    return Array.from({ length: 30 }, (_, i) => ({
        day: `${i + 1}`,
        generation: Math.floor(Math.random() * 1000) + 200,
        selfUse: Math.floor(Math.random() * 300) + 100,
        co2: Math.floor(Math.random() * 50) + 10
    }));
};

const generateEvseData = () => {
    return Array.from({ length: 30 }, (_, i) => ({
        day: `${i + 1}`,
        charged: Math.floor(Math.random() * 800) + 300,
        count: Math.floor(Math.random() * 50) + 10,
        utilization: Math.floor(Math.random() * 40) + 10 
    }));
};

const generateDgData = () => {
    return Array.from({ length: 30 }, (_, i) => ({
        day: `${i + 1}`,
        generation: Math.floor(Math.random() * 200)
    }));
};

const DAILY_LOAD_DATA = generateDailyLoadData();
const ESS_DATA = generateEssData();
const PV_DATA = generatePvData();
const EVSE_DATA = generateEvseData();
const DG_DATA = generateDgData();

// Internal Month Picker Component
const MonthPicker = ({ value, onChange, theme, lang }: { value: string, onChange: (val: string) => void, theme: Theme, lang: Language }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewYear, setViewYear] = useState(() => parseInt(value.split('-')[0]));
    const pickerRef = useRef<HTMLDivElement>(null);

    const months = translations[lang].common.months;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMonthSelect = (monthIndex: number) => {
        const monthStr = String(monthIndex + 1).padStart(2, '0');
        onChange(`${viewYear}-${monthStr}`);
        setIsOpen(false);
    };

    const currentMonthIndex = parseInt(value.split('-')[1]) - 1;
    const currentYear = parseInt(value.split('-')[0]);

    return (
        <div className="relative" ref={pickerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 px-4 py-2 bg-white dark:bg-apple-surface-dark rounded-xl border transition-all w-full md:w-auto min-w-[160px] justify-between
                ${isOpen ? 'border-brand-500 ring-2 ring-brand-100 dark:ring-brand-900/30' : 'border-slate-200 dark:border-apple-border-dark hover:border-brand-400 shadow-sm'}`}
            >
                <div className="flex items-center gap-2 text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                    <Calendar size={18} className="text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark"/>
                    <span className="text-sm font-bold font-mono">{value}</span>
                </div>
                <ChevronDown size={14} className={`text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 z-50 w-64 bg-white dark:bg-apple-surface-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-apple-border-dark overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                    <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-apple-border-dark bg-apple-bg-light/50 dark:bg-apple-bg-dark/50">
                        <button onClick={() => setViewYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark text-apple-text-secondary-light dark:text-apple-text-secondary-dark transition-colors"><ChevronLeft size={16}/></button>
                        <span className="font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark">{viewYear}{translations[lang].energyStatistics.units.year}</span>
                        <button onClick={() => setViewYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark text-apple-text-secondary-light dark:text-apple-text-secondary-dark transition-colors"><ChevronRight size={16}/></button>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                        {months.map((m, idx) => {
                            const isSelected = viewYear === currentYear && idx === currentMonthIndex;
                            return (
                                <button
                                    key={m}
                                    onClick={() => handleMonthSelect(idx)}
                                    className={`py-2 px-1 rounded-xl text-sm font-bold transition-all
                                    ${isSelected ? 'bg-brand-500 text-white shadow-md' : 'text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark'}`}
                                >
                                    {m}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

interface EnergyStatisticsProps {
  lang: Language;
  theme: Theme;
  selectedStation: string;
}

const EnergyStatistics: React.FC<EnergyStatisticsProps> = ({ lang, theme, selectedStation }) => {
  const t = translations[lang].energyStatistics;
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'ess' | 'pv' | 'evse' | 'dg' | 'load'>('ess');
  const [activeArea, setActiveArea] = useState<string>('areaA');
  const [month, setMonth] = useState('2025-09');

  // Memoized data to react to activeArea changes
  const dailyLoadData = useMemo(() => {
      return DAILY_LOAD_DATA.map(d => ({
          ...d,
          consumption: activeArea === 'areaB' ? d.consumption * 1.2 : d.consumption,
          peak: activeArea === 'areaB' ? d.peak * 1.1 : d.peak
      }));
  }, [activeArea]);

  const essData = useMemo(() => {
      return ESS_DATA.map(d => ({
          ...d,
          charge: activeArea === 'areaB' ? d.charge * 0.8 : d.charge,
          discharge: activeArea === 'areaB' ? d.discharge * 0.9 : d.discharge,
          cycleCount:
              activeArea === 'areaB' ? Math.max(1, Math.round(d.cycleCount * 0.95)) : d.cycleCount,
      }));
  }, [activeArea]);

  const essBessMonthlyKpis = useMemo(() => {
      const totalCharge = essData.reduce((s, d) => s + d.charge, 0);
      const totalDischarge = essData.reduce((s, d) => s + d.discharge, 0);
      const effPct = totalCharge > 0 ? (totalDischarge / totalCharge) * 100 : 0;
      const cycles = essData.reduce((s, d) => s + d.cycleCount, 0);
      return {
          monthlyGenEfficiency: effPct.toFixed(1),
          cumulativeCycles: String(cycles),
      };
  }, [essData]);

  const pvData = useMemo(() => {
      return PV_DATA.map(d => ({
          ...d,
          generation: activeArea === 'areaB' ? d.generation * 1.3 : d.generation
      }));
  }, [activeArea]);

  const evseData = useMemo(() => {
      return EVSE_DATA.map(d => ({
          ...d,
          charged: activeArea === 'areaB' ? d.charged * 1.5 : d.charged
      }));
  }, [activeArea]);

  const dgData = useMemo(() => {
      return DG_DATA.map(d => ({
          ...d,
          generation: activeArea === 'areaB' ? d.generation * 0.5 : d.generation
      }));
  }, [activeArea]);

  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  const toggleSeries = (dataKey: string) => {
    setHiddenSeries(prev => prev.includes(dataKey) ? prev.filter(k => k !== dataKey) : [...prev, dataKey]);
  };

  const handleTabChange = (tab: 'ess' | 'pv' | 'evse' | 'dg' | 'load') => {
      setActiveTab(tab);
      setHiddenSeries([]);
  }

  const chartColors = {
    grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    text: isDark ? '#86868b' : '#6e6e73',
    tooltipBg: isDark ? 'rgba(28, 28, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    brand: '#819226',
    rose: '#ef4444',
    emerald: '#10b981',
    blue: '#0ea5e9',
    yellow: '#eab308',
    amber: '#f59e0b',
    indigo: '#6366f1',
    slate: '#64748b',
    purple: '#a855f7'
  };

  const renderKpiCard = (title: string, value: string, unit: string, icon: React.ReactNode, colorClass: string = 'brand') => (
    <div className="ems-card p-4 hover:shadow-md transition-all group relative overflow-hidden">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-2xl bg-${colorClass}-500/10 transition-transform group-hover:scale-110 duration-300`}>
          {React.cloneElement(icon as React.ReactElement, { size: 18, className: `text-${colorClass}-500` })}
        </div>
        <div className="text-[10px] font-bold text-apple-text-secondary-light dark:text-apple-text-secondary-dark uppercase tracking-widest opacity-60">
          Live
        </div>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-apple-text-secondary-light dark:text-apple-text-secondary-dark mb-0.5 uppercase tracking-wider">
          {title}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark tracking-tight">
            {value}
          </span>
          <span className="text-xs font-semibold text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );

  const tooltipStyle = {
    contentStyle: { 
      borderRadius: '12px', 
      border: `1px solid ${chartColors.tooltipBorder}`, 
      backgroundColor: chartColors.tooltipBg, 
      fontSize: '13px', 
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      padding: '8px 12px'
    },
    itemStyle: { fontSize: '13px', fontWeight: 500, padding: '2px 0' },
    labelStyle: { color: chartColors.text, marginBottom: '4px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }
  };

  const CustomLegend = ({ payload, onClick }: any) => (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
      {payload?.map((entry: any, index: number) => {
        const isHidden = hiddenSeries.includes(entry.dataKey);
        return (
          <button 
            key={`item-${index}`} 
            onClick={() => onClick(entry.dataKey)}
            className={`flex items-center gap-2 transition-all ${isHidden ? 'opacity-40 grayscale' : 'opacity-100'}`}
          >
            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></div>
            <span>{entry.value}</span>
          </button>
        )
      })}
    </div>
  );

  const renderLoadView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {renderKpiCard(t?.kpi?.monthlyCons || 'Monthly Cons.', '18.4', t?.units?.mwh || 'MWh', <Zap />, 'brand')}
        {renderKpiCard(t?.kpi?.peakPower || 'Max Demand', '852', t?.units?.kw || 'kW', <Activity />, 'rose')}
        {renderKpiCard(t?.kpi?.loadFactor || 'Load Factor', '49.3', t?.units?.percent || '%', <PieChart />, 'indigo')}
      </div>
      
      <div className="ems-card p-8 flex flex-col min-h-[450px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-brand-600 rounded-full"></div>
          <h3 className="text-lg font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark tracking-tight">
            {t?.charts?.loadTitle || 'Daily Load Consumption'}
          </h3>
        </div>
        <div className="w-full h-[360px]">
          <ResponsiveContainer width="100%" height="100%" key={`load-${activeArea}`}>
            <ComposedChart data={dailyLoadData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
              <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} fontWeight={500} tickMargin={12} />
              <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} fontWeight={500} tickMargin={12} />
              <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} fontWeight={500} tickMargin={12} />
              <Tooltip cursor={{fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', radius: 8}} {...tooltipStyle} />
              <Legend content={<CustomLegend onClick={toggleSeries} />} verticalAlign="top" align="right" />
              <Bar isAnimationActive={false} yAxisId="left" hide={hiddenSeries.includes('consumption')} name={t?.kpi?.monthlyCons || 'Consumption'} dataKey="consumption" fill={chartColors.brand} radius={[6, 6, 0, 0]} barSize={20} />
              <Line isAnimationActive={false} yAxisId="right" hide={hiddenSeries.includes('peak')} name={t?.kpi?.peakPower || 'Max Demand'} type="monotone" dataKey="peak" stroke={chartColors.rose} strokeWidth={3} dot={{ r: 4, fill: chartColors.rose, strokeWidth: 2, stroke: isDark ? '#1e2128' : '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderEssView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {renderKpiCard(t?.kpi?.totalCharge || 'Monthly Charge', '375.0', t?.units?.mwh || 'MWh', <Battery />, 'emerald')}
        {renderKpiCard(t?.kpi?.totalDischarge || 'Monthly Discharge', '354.0', t?.units?.mwh || 'MWh', <Zap />, 'blue')}
        {renderKpiCard(
            t?.kpi?.monthlyArbitrageEnergy || 'Monthly Generation Efficiency',
            essBessMonthlyKpis.monthlyGenEfficiency,
            t?.units?.percent || '%',
            <TrendingUp />,
            'indigo'
        )}
        {renderKpiCard(
            t?.kpi?.monthlyReplicationServiceEnergy || 'Cumulative Cycle Count',
            essBessMonthlyKpis.cumulativeCycles,
            t?.units?.cycleTimes || 'cycles',
            <RotateCw />,
            'purple'
        )}
      </div>
      <div className="ems-card p-8 flex flex-col min-h-[400px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
          <h3 className="text-lg font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark tracking-tight">
            {t?.charts?.essTitle || 'BESS Charge/Discharge'}
          </h3>
        </div>
        <div className="w-full h-[360px]">
          <ResponsiveContainer width="100%" height="100%" key={`ess-main-${activeArea}`}>
            <BarChart data={essData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
              <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} fontWeight={500} tickMargin={12} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} fontWeight={500} tickMargin={12} />
              <Tooltip cursor={{fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', radius: 8}} {...tooltipStyle} />
              <Legend content={<CustomLegend onClick={toggleSeries} />} verticalAlign="top" align="right" />
              <Bar isAnimationActive={false} hide={hiddenSeries.includes('charge')} name={t?.kpi?.totalCharge || 'Charge'} dataKey="charge" fill={chartColors.emerald} radius={[6, 6, 0, 0]} barSize={12} />
              <Bar isAnimationActive={false} hide={hiddenSeries.includes('discharge')} name={t?.kpi?.totalDischarge || 'Discharge'} dataKey="discharge" fill={chartColors.blue} radius={[6, 6, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderPvView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderKpiCard(t?.kpi?.totalGeneration || 'Generation', '45.2', t?.units?.mwh || 'MWh', <Sun />, 'amber')}
        {renderKpiCard(t?.kpi?.annualGeneration || 'Annual Generation', '542.8', t?.units?.mwh || 'MWh', <Sun />, 'blue')}
        {renderKpiCard(t?.kpi?.monthlyGeneration || 'Monthly Generation', '45.2', t?.units?.mwh || 'MWh', <Zap />, 'emerald')}
      </div>
      <div className="ems-card p-8 flex flex-col min-h-[450px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-amber-500 rounded-full"></div>
          <h3 className="text-lg font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark tracking-tight">
            {t?.charts?.pvTitle || 'PV Generation'}
          </h3>
        </div>
        <div className="w-full h-[360px]">
          <ResponsiveContainer width="100%" height="100%" key={`pv-${activeArea}`}>
            <BarChart data={pvData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
              <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} tickMargin={12} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} fontWeight={500} tickMargin={12} />
              <Tooltip cursor={{fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', radius: 8}} {...tooltipStyle} />
              <Legend content={<CustomLegend onClick={toggleSeries} />} verticalAlign="top" align="right" />
              <Bar isAnimationActive={false} hide={hiddenSeries.includes('generation')} name={t?.kpi?.totalGeneration || 'Generation'} dataKey="generation" fill={chartColors.yellow} radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderEvseView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderKpiCard(t?.kpi?.cumulativeCharge || 'Cumulative Charge', '245.8', t?.units?.mwh || 'MWh', <Cable />, 'blue')}
        {renderKpiCard(t?.kpi?.monthlyCharge || 'Monthly Charge', '8.4', t?.units?.mwh || 'MWh', <Zap />, 'purple')}
      </div>
      <div className="ems-card p-8 flex flex-col min-h-[450px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
          <h3 className="text-lg font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark tracking-tight">
            {t?.charts?.evseTitle || 'EVSE Charging'}
          </h3>
        </div>
        <div className="w-full h-[360px]">
          <ResponsiveContainer width="100%" height="100%" key={`evse-${activeArea}`}>
            <BarChart data={evseData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
              <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} tickMargin={12} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} fontWeight={500} tickMargin={12} />
              <Tooltip cursor={{fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', radius: 8}} {...tooltipStyle} />
              <Legend content={<CustomLegend onClick={toggleSeries} />} verticalAlign="top" align="right" />
              <Bar isAnimationActive={false} hide={hiddenSeries.includes('charged')} name={t?.kpi?.chargedEnergy || 'Charged'} dataKey="charged" fill={chartColors.blue} radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderDgView = () => (
    <div className="space-y-6">
      <div className="ems-card p-8 flex flex-col min-h-[450px]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-slate-500 rounded-full"></div>
          <h3 className="text-lg font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark tracking-tight">
            {t?.charts?.dgTitle || 'DG Performance'}
          </h3>
        </div>
        <div className="w-full h-[360px]">
          <ResponsiveContainer width="100%" height="100%" key={`dg-${activeArea}`}>
            <BarChart data={dgData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
              <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} tickMargin={12} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} fontWeight={500} tickMargin={12} />
              <Tooltip cursor={{fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)', radius: 8}} {...tooltipStyle} />
              <Legend content={<CustomLegend onClick={toggleSeries} />} verticalAlign="top" align="right" />
              <Bar isAnimationActive={false} hide={hiddenSeries.includes('generation')} name={t?.kpi?.dgGeneration || 'Generation'} dataKey="generation" fill={chartColors.slate} radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const segmentedTabBtn = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all whitespace-nowrap ${
      active
        ? 'bg-white text-blue-600 shadow-sm dark:bg-apple-surface-dark dark:text-blue-400'
        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
    }`;

  /** 页面内第三层（并网点）——较主 Tab 更紧凑 */
  const segmentedAreaBtn = (active: boolean) =>
    `flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
      active
        ? 'bg-white text-blue-600 shadow-sm dark:bg-apple-surface-dark dark:text-blue-400'
        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
    }`;

  return (
    <div className="h-[calc(100vh-72px)] ems-page-shell flex flex-col gap-4 overflow-y-auto custom-scrollbar">
      {/* Header / Toolbar — 与电价列表同款 segmented + 二级并网点 */}
      <div className="ems-card flex shrink-0 flex-col gap-4 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="custom-scrollbar-hide flex w-full min-w-0 flex-1 items-center overflow-x-auto">
            <div className="ems-segmented shrink-0">
              {[
                { id: 'ess', label: t?.tabs?.ess || 'BESS', icon: Battery },
                { id: 'pv', label: t?.tabs?.pv || 'PV', icon: Sun },
                { id: 'evse', label: t?.tabs?.evse || 'EVSE', icon: Cable },
                { id: 'dg', label: t?.tabs?.dg || 'DG', icon: RotateCw },
                { id: 'load', label: t?.tabs?.load || 'Load', icon: Activity }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id as any)}
                  className={segmentedTabBtn(activeTab === item.id)}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full shrink-0 items-center gap-3 md:w-auto">
            <MonthPicker value={month} onChange={setMonth} theme={theme} lang={lang} />
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500 transition-colors hover:text-blue-600 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-400 dark:hover:text-blue-400"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="custom-scrollbar-hide flex min-w-0 overflow-x-auto border-t border-slate-200 pt-3 dark:border-apple-border-dark">
          <div className="flex shrink-0 gap-0.5 rounded-xl border border-slate-200 bg-slate-100 p-0.5 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark">
            {[
              { id: 'areaA', label: t?.areas?.areaA || 'Area A Grid Point' },
              { id: 'areaB', label: t?.areas?.areaB || 'Area B Grid Point' },
              { id: 'areaC', label: t?.areas?.areaC || 'Area C Grid Point' }
            ].map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => setActiveArea(area.id)}
                className={segmentedAreaBtn(activeArea === area.id)}
              >
                {area.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'ess' && renderEssView()}
        {activeTab === 'pv' && renderPvView()}
        {activeTab === 'evse' && renderEvseView()}
        {activeTab === 'dg' && renderDgView()}
        {activeTab === 'load' && renderLoadView()}
      </div>
    </div>
  );
};

export default EnergyStatistics;
