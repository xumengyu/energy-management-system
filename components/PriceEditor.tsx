
import React, { useState, useMemo } from 'react';
import { 
    FileText, Download, Upload, Save, X, Calendar, Settings2, 
    CalendarDays, LayoutTemplate, LineChart as LineChartIcon, 
    Database, ArrowRight, Zap, CheckCircle2, AlertCircle, Copy,
    Globe, FileSpreadsheet, HandMetal, ChevronDown
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Legend 
} from 'recharts';
import { Coefficients, PriceRow, Language, PriceTab, MarketSource, Theme } from '../types';
import { translations } from '../translations';

// --- Helper Functions ---
const generateTimeSlots = (): PriceRow[] => {
  const slots: PriceRow[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      
      // Simulate a curve for default values
      let basePrice = 0.35;
      if (h >= 8 && h < 11) basePrice = 0.85; // Peak
      if (h >= 11 && h < 14) basePrice = 0.55; // Flat
      if (h >= 14 && h < 18) basePrice = 0.85; // Peak
      if (h >= 18 && h < 22) basePrice = 1.05; // Critical Peak
      
      slots.push({
        time: `${hh}:${mm}`,
        priceA: basePrice,
        source: 'Manual'
      });
    }
  }
  return slots;
};

const MOCK_SOURCES_EN: MarketSource[] = [
    { id: '1', name: 'EPEX SPOT DE (Day-Ahead)', type: 'API', status: 'Active', lastSync: '10:00:00', region: 'DE-LU' },
    { id: '2', name: 'Nord Pool System Price', type: 'API', status: 'Inactive', lastSync: 'Yesterday', region: 'EU-NO' },
    { id: '3', name: 'Excel Import Template', type: 'File', status: 'Active', lastSync: '08:30:00', region: 'Local' },
    { id: '4', name: 'Manual Override', type: 'Manual', status: 'Active', lastSync: '-', region: 'Local' },
];

const MOCK_SOURCES_ZH: MarketSource[] = [
    { id: '1', name: 'EPEX SPOT 德国 (日前)', type: 'API', status: 'Active', lastSync: '10:00:00', region: 'DE-LU' },
    { id: '2', name: 'Nord Pool 系统电价', type: 'API', status: 'Inactive', lastSync: '昨天', region: 'EU-NO' },
    { id: '3', name: 'Excel 导入模板', type: 'File', status: 'Active', lastSync: '08:30:00', region: '本地' },
    { id: '4', name: '手动覆盖', type: 'Manual', status: 'Active', lastSync: '-', region: '本地' },
];

interface PriceEditorProps {
    lang: Language;
    theme: Theme;
    selectedStation: string;
}

const PriceEditor: React.FC<PriceEditorProps> = ({ lang, theme, selectedStation }) => {
  const t = translations[lang].priceEditor;
  const isDark = theme === 'dark';
  
  // --- Shared State ---
  const [activeTab, setActiveTab] = useState<PriceTab>('overview');
  const [date, setDate] = useState('2025-09-16');
  const [month, setMonth] = useState('2025-09');
  
  // Data State (Lifted up for Level 1 access)
  const [rows, setRows] = useState<PriceRow[]>(generateTimeSlots());
  const [coeffs, setCoeffs] = useState<Coefficients>({
    pv: { grid: 0.3, local: 0.7 },
    charge: { fromPv: 0.7, fromGrid: 1.0 },
    discharge: { toGrid: 0.3, toLoad: 0.8 },
  });

  const MOCK_SOURCES = lang === 'zh' ? MOCK_SOURCES_ZH : MOCK_SOURCES_EN;

  // --- View Helpers ---
  const handleCoeffChange = (section: keyof Coefficients, key: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setCoeffs(prev => ({...prev, [section]: { ...prev[section], [key]: num }}));
  };

  const handlePriceAChange = (index: number, value: string) => {
    const newPrice = parseFloat(value);
    if (isNaN(newPrice)) return;
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], priceA: newPrice, source: 'Manual' };
    setRows(newRows);
  };

  const fmt = (num: number) => num.toFixed(3);

  const chartColors = {
      grid: isDark ? '#334155' : '#e2e8f0',
      text: isDark ? '#94a3b8' : '#94a3b8',
      tooltipBg: isDark ? '#1e293b' : '#ffffff',
      tooltipBorder: isDark ? '#334155' : '#e2e8f0',
  }

  // --- Render Helpers ---
  const renderKpiCard = (title: string, value: string, unit: string, icon: React.ReactNode, colorClass: string) => (
      <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group`}>
          <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${colorClass}-500`}>
              {icon}
          </div>
          <div className="relative z-10">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
              <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-extrabold text-slate-800 dark:text-white`}>{value}</span>
                  <span className="text-sm font-medium text-slate-400">{unit}</span>
              </div>
          </div>
      </div>
  );

  // --- Components ---

  // 1. Tab: Overview
  const OverviewTab = () => {
    // Calc stats
    const stats = useMemo(() => {
        const prices = rows.map(r => r.priceA);
        const sum = prices.reduce((a, b) => a + b, 0);
        const avg = sum / prices.length;
        const max = Math.max(...prices);
        const min = Math.min(...prices);
        const current = rows[36].priceA; // Mock current time approx
        return { avg, max, min, current };
    }, [rows]);

    const chartData = useMemo(() => {
        return rows.map(r => ({
            time: r.time,
            priceA: r.priceA,
            pvLocal: r.priceA * coeffs.pv.local,
            gridChg: r.priceA * coeffs.charge.fromGrid,
            gridDisch: r.priceA * coeffs.discharge.toGrid
        }));
    }, [rows, coeffs]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {renderKpiCard(t.avgPrice, stats.avg.toFixed(3), 'EUR/kWh', <Zap size={64}/>, 'blue')}
                {renderKpiCard(t.peakPrice, stats.max.toFixed(3), 'EUR/kWh', <ArrowRight size={64} className="-rotate-45"/>, 'red')}
                {renderKpiCard(t.valleyPrice, stats.min.toFixed(3), 'EUR/kWh', <ArrowRight size={64} className="rotate-45"/>, 'green')}
                {renderKpiCard(t.currentPrice, stats.current.toFixed(3), 'EUR/kWh', <CheckCircle2 size={64}/>, 'purple')}
            </div>

            {/* Main Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                        <LineChartIcon size={20} className="text-blue-500" />
                        {t.curveTitle}
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={() => setActiveTab('settings')} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors">
                            {t.gotoSet}
                        </button>
                        <button onClick={() => setActiveTab('sources')} className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                            {t.viewSource}
                        </button>
                    </div>
                </div>
                <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                            <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} tickMargin={15} minTickGap={30} stroke={chartColors.text} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} stroke={chartColors.text} />
                            <Tooltip 
                                contentStyle={{ 
                                    borderRadius: '12px', 
                                    border: `1px solid ${chartColors.tooltipBorder}`, 
                                    backgroundColor: chartColors.tooltipBg,
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
                                }}
                                formatter={(val: number) => val.toFixed(3)}
                                itemStyle={{fontSize: '12px', fontWeight: 500, color: isDark ? '#e2e8f0' : '#1e293b'}}
                                labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
                            />
                            <Legend wrapperStyle={{paddingTop: '20px'}} />
                            <Line name={t.legendA} type="stepAfter" dataKey="priceA" stroke="#2563eb" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                            <Line name={t.legendPvLocal} type="stepAfter" dataKey="pvLocal" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                            <Line name={t.legendGridChg} type="stepAfter" dataKey="gridChg" stroke="#16a34a" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                            <Line name={t.legendGridDisch} type="stepAfter" dataKey="gridDisch" stroke="#9333ea" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
  };

  // 2. Tab: Settings
  const SettingsTab = () => {
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             {/* Sub-Header Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button 
                                onClick={() => setViewMode('daily')}
                                className={`px-4 py-2 text-sm font-bold rounded-md flex items-center gap-2 transition-all ${
                                    viewMode === 'daily' 
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                <CalendarDays size={14} />
                                {t.modeDaily}
                            </button>
                            <button 
                                onClick={() => setViewMode('monthly')}
                                className={`px-4 py-2 text-sm font-bold rounded-md flex items-center gap-2 transition-all ${
                                    viewMode === 'monthly' 
                                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                            >
                                <LayoutTemplate size={14} />
                                {t.modeMonthly}
                            </button>
                        </div>
                        
                        {viewMode === 'monthly' ? (
                             <div className="relative">
                                <input 
                                    type="month" 
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    className="pl-8 pr-4 py-2 border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 rounded-lg text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none w-48 shadow-sm text-slate-800 dark:text-slate-200"
                                />
                                <LayoutTemplate className="absolute left-2.5 top-2.5 text-purple-400" size={16} />
                             </div>
                        ) : (
                             <div className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <span className="bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 font-mono shadow-sm">{date}</span>
                             </div>
                        )}

                        {viewMode === 'daily' && (
                             <button className="flex items-center gap-2 px-4 py-2 border border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 font-bold transition-colors">
                                <Copy size={14} /> {t.batchApply}
                             </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                         <button className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all" title={t.import}><Upload size={18}/></button>
                         <button className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all" title={t.export}><Download size={18}/></button>
                    </div>
                </div>
            </div>

            {/* Coefficients Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                 <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* PV */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                                {t.pvCoeffs}
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.gridPrice}</label>
                                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-hidden w-24 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 focus-within:border-blue-300 transition-all">
                                        <span className="px-2 text-[10px] font-bold text-slate-400 border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">A×</span>
                                        <input type="number" value={coeffs.pv.grid} onChange={(e) => handleCoeffChange('pv', 'grid', e.target.value)} className="w-full py-1.5 px-1 text-sm text-center bg-white dark:bg-slate-900 outline-none font-bold text-slate-700 dark:text-slate-200"/>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.localUse}</label>
                                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-hidden w-24 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 focus-within:border-blue-300 transition-all">
                                        <span className="px-2 text-[10px] font-bold text-slate-400 border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">A×</span>
                                        <input type="number" value={coeffs.pv.local} onChange={(e) => handleCoeffChange('pv', 'local', e.target.value)} className="w-full py-1.5 px-1 text-sm text-center bg-white dark:bg-slate-900 outline-none font-bold text-slate-700 dark:text-slate-200"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Charge */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                {t.storageCharge}
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.fromPv}</label>
                                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-hidden w-24 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 focus-within:border-blue-300 transition-all">
                                        <span className="px-2 text-[10px] font-bold text-slate-400 border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">A×</span>
                                        <input type="number" value={coeffs.charge.fromPv} onChange={(e) => handleCoeffChange('charge', 'fromPv', e.target.value)} className="w-full py-1.5 px-1 text-sm text-center bg-white dark:bg-slate-900 outline-none font-bold text-slate-700 dark:text-slate-200"/>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.fromGrid}</label>
                                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-hidden w-24 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 focus-within:border-blue-300 transition-all">
                                        <span className="px-2 text-[10px] font-bold text-slate-400 border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">A×</span>
                                        <input type="number" value={coeffs.charge.fromGrid} onChange={(e) => handleCoeffChange('charge', 'fromGrid', e.target.value)} className="w-full py-1.5 px-1 text-sm text-center bg-white dark:bg-slate-900 outline-none font-bold text-slate-700 dark:text-slate-200"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Discharge */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                {t.storageDischarge}
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.toGrid}</label>
                                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-hidden w-24 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 focus-within:border-blue-300 transition-all">
                                        <span className="px-2 text-[10px] font-bold text-slate-400 border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">A×</span>
                                        <input type="number" value={coeffs.discharge.toGrid} onChange={(e) => handleCoeffChange('discharge', 'toGrid', e.target.value)} className="w-full py-1.5 px-1 text-sm text-center bg-white dark:bg-slate-900 outline-none font-bold text-slate-700 dark:text-slate-200"/>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.toLoad}</label>
                                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-hidden w-24 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 focus-within:border-blue-300 transition-all">
                                        <span className="px-2 text-[10px] font-bold text-slate-400 border-r border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">A×</span>
                                        <input type="number" value={coeffs.discharge.toLoad} onChange={(e) => handleCoeffChange('discharge', 'toLoad', e.target.value)} className="w-full py-1.5 px-1 text-sm text-center bg-white dark:bg-slate-900 outline-none font-bold text-slate-700 dark:text-slate-200"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
                 <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-center text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">
                    <div className="flex gap-3 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-500 h-fit"><Zap size={16}/></div>
                        <p>{t.note}</p>
                    </div>
                 </div>
            </div>

            {/* Table */}
            <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border ${viewMode === 'monthly' ? 'border-purple-200 dark:border-purple-800' : 'border-slate-200 dark:border-slate-800'} overflow-hidden flex flex-col`}>
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm text-center border-collapse relative">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 border-b dark:border-slate-700 w-28 bg-slate-50 dark:bg-slate-800 sticky left-0 z-20">{t.tableTime}</th>
                                <th className={`p-4 border-b dark:border-slate-700 w-36 ${viewMode === 'monthly' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'}`}>
                                    {t.tablePriceA}
                                </th>
                                <th colSpan={2} className="p-4 border-b dark:border-slate-700 border-l dark:border-l-slate-700 border-r dark:border-r-slate-700 border-slate-100 text-orange-600 dark:text-orange-400 bg-orange-50/30 dark:bg-orange-900/20">{t.tablePvPrices}</th>
                                <th colSpan={3} className="p-4 border-b dark:border-slate-700 text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-900/20">{t.tableStoragePrices}</th>
                                <th className="p-4 border-b dark:border-slate-700 w-28">{t.tableSource}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {rows.map((row, index) => (
                                <tr key={row.time} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                                    <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-blue-50/30 dark:group-hover:bg-slate-800 border-r border-slate-100 dark:border-slate-800 transition-colors">{row.time}</td>
                                    <td className={`py-2.5 px-4 ${viewMode === 'monthly' ? 'bg-purple-50/20 dark:bg-purple-900/10' : 'bg-blue-50/10 dark:bg-blue-900/5'}`}>
                                        <input 
                                            type="number" step="0.001" value={row.priceA} onChange={(e) => handlePriceAChange(index, e.target.value)}
                                            className={`w-full text-center font-bold bg-transparent rounded py-1 px-2 outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:shadow-sm transition-all
                                                ${viewMode === 'monthly' ? 'text-purple-700 dark:text-purple-400 focus:ring-purple-200 dark:focus:ring-purple-900' : 'text-blue-700 dark:text-blue-400 focus:ring-blue-200 dark:focus:ring-blue-900'}`}
                                        />
                                    </td>
                                    <td className="py-2.5 px-4 border-l border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono">{fmt(row.priceA * coeffs.pv.grid)}</td>
                                    <td className="py-2.5 px-4 border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono">{fmt(row.priceA * coeffs.pv.local)}</td>
                                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">{fmt(row.priceA * coeffs.charge.fromPv)}</td>
                                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">{fmt(row.priceA * coeffs.charge.fromGrid)}</td>
                                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 font-mono">{fmt(row.priceA * coeffs.discharge.toGrid)}</td>
                                    <td className="py-2.5 px-4 border-l border-slate-100 dark:border-slate-800 italic text-slate-400 text-xs">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.source === 'Manual' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                            {viewMode === 'monthly' ? t.manual : (row.source === 'Manual' ? t.manual : t.market)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer Action Bar */}
                <div className={`border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between transition-all
                    ${viewMode === 'monthly' ? 'border-t-purple-200 dark:border-t-purple-800' : ''}`}>
                    <div className="text-slate-600 dark:text-slate-400 text-sm">
                        {t.showing} <span className="font-bold text-slate-900 dark:text-white">96</span> {t.intervals}
                        {viewMode === 'monthly' && (
                            <span className="ml-3 text-purple-600 dark:text-purple-400 text-xs bg-purple-50 dark:bg-purple-900/30 px-2.5 py-1 rounded-full border border-purple-100 dark:border-purple-800 font-bold">{t.monthNote}</span>
                        )}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setActiveTab('overview')} className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 transition-colors">
                            {t.cancel}
                        </button>
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`px-6 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 dark:shadow-blue-900/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2
                            ${viewMode === 'monthly' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/30' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            <Save size={18} /> {viewMode === 'monthly' ? t.saveMonth : t.save}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  // 3. Tab: Sources (Interactive)
  const SourcesTab = () => {
    const [selectedSourceId, setSelectedSourceId] = useState<string>(MOCK_SOURCES[0].id);
    const selectedSource = MOCK_SOURCES.find(s => s.id === selectedSourceId) || MOCK_SOURCES[0];

    const getIcon = (type: string) => {
        if(type === 'API') return <Globe size={16}/>;
        if(type === 'File') return <FileSpreadsheet size={16}/>;
        return <HandMetal size={16}/>;
    }

    const getLocalizedSourceName = (id: string) => {
        const source = MOCK_SOURCES.find(s => s.id === id);
        return source ? source.name : '';
    }

    return (
        <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Left: Current Source Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2"><Settings2 size={18} className="text-blue-500" /> {t.currentSource}</h3>
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800 mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <AlertCircle className="text-amber-600 dark:text-amber-500" size={20} />
                                <span className="font-bold text-amber-900 dark:text-amber-400">{t.manualOverride}</span>
                            </div>
                            <p className="text-sm text-amber-800/80 dark:text-amber-300/80 leading-snug">
                                {t.sourceContent.manualOverrideWarn.replace('{date}', date)}
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm py-2 border-b border-slate-50 dark:border-slate-800">
                                <span className="text-slate-500 dark:text-slate-400 font-medium">{t.sourceType}</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{t.sourceContent.mixedSource}</span>
                            </div>
                            <div className="flex justify-between text-sm py-2">
                                <span className="text-slate-500 dark:text-slate-400 font-medium">{t.lastSync}</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">2025-09-16 08:30:00</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl text-white shadow-xl shadow-blue-200 dark:shadow-blue-900/30">
                         <h4 className="font-bold text-lg mb-2">{t.preview}</h4>
                         <p className="text-sm text-blue-100 mb-6 opacity-90">{t.sourceContent.checkTomorrow}</p>
                         <button className="w-full bg-white text-blue-600 py-3 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors shadow-sm">
                            {t.sourceContent.previewBtn}
                         </button>
                    </div>
                </div>

                {/* Right: Strategy List & Configuration */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">{t.strategyList}</h3>
                        <button className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-bold shadow-sm transition-colors">
                            {t.addSource}
                        </button>
                    </div>
                    
                    {/* List */}
                    <div className="h-56 overflow-auto border-b border-slate-100 dark:border-slate-800 custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 font-bold uppercase tracking-wider sticky top-0">
                                <tr>
                                    <th className="px-6 py-4">{t.exchangeName}</th>
                                    <th className="px-6 py-4">{t.sourceType}</th>
                                    <th className="px-6 py-4">{t.configRegion}</th>
                                    <th className="px-6 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {MOCK_SOURCES.map((s) => (
                                    <tr 
                                        key={s.id} 
                                        onClick={() => setSelectedSourceId(s.id)}
                                        className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors ${selectedSourceId === s.id ? 'bg-blue-50 dark:bg-blue-900/20 ring-l-4 ring-blue-500' : ''}`}
                                    >
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{getLocalizedSourceName(s.id)}</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
                                            {getIcon(s.type)} {s.type}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 dark:text-slate-500 font-mono text-xs">{s.region}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.status === 'Active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                {s.status === 'Active' ? translations[lang].strategyManager.sourceContent.table.active : translations[lang].strategyManager.sourceContent.table.inactive}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Dynamic Details Form */}
                     <div className="flex-1 p-8 bg-slate-50/30 dark:bg-slate-800/20 overflow-y-auto custom-scrollbar">
                        {selectedSource.type === 'API' && (
                             <div className="animate-in fade-in duration-300 w-full">
                                <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 text-lg">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Globe size={20} /></div>
                                    {t.configApiTitle}
                                </h4>
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{t.configApiUrl}</label>
                                        <input defaultValue="https://api.epex-spot.eu/v1/market/day-ahead" className="w-full text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-xl p-3 border focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-300 outline-none shadow-sm transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{t.configRegion}</label>
                                        <input defaultValue={selectedSource.region} className="w-full text-sm border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-xl p-3 border focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-300 outline-none shadow-sm transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{t.configFreq}</label>
                                        <select className="w-full text-sm border-slate-200 dark:border-slate-700 rounded-xl p-3 border focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-300 outline-none bg-white dark:bg-slate-900 dark:text-slate-200 shadow-sm transition-all">
                                            <option>{t.freqRealtime}</option>
                                            <option>{t.freqDaily}</option>
                                            <option>{t.freqHourly}</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{t.mapping}</label>
                                        <div className="font-mono text-xs bg-slate-900 dark:bg-black text-slate-300 p-4 rounded-xl border border-slate-800 whitespace-pre">
                                            {t.sourceContent.mapping}
                                        </div>
                                    </div>
                                </div>
                                <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-200 dark:shadow-blue-900/30 transition-all">{t.save}</button>
                             </div>
                        )}

                        {selectedSource.type === 'File' && (
                             <div className="animate-in fade-in duration-300">
                                <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 text-lg">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><FileSpreadsheet size={20} /></div>
                                    {t.configFileTitle}
                                </h4>
                                <div className="space-y-6">
                                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-10 text-center bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group">
                                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <Upload className="text-slate-400 dark:text-slate-500 group-hover:text-blue-500" size={28} />
                                        </div>
                                        <p className="text-sm text-slate-700 dark:text-slate-300 font-bold">{t.configUpload}</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">.csv, .xlsx (Max 5MB)</p>
                                    </div>
                                    <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{t.configDownloadTpl}</span>
                                        <button className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-bold bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-4 py-2 rounded-lg transition-colors">
                                            <Download size={16} /> Download
                                        </button>
                                    </div>
                                </div>
                             </div>
                        )}

                         {selectedSource.type === 'Manual' && (
                             <div className="animate-in fade-in duration-300">
                                <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 text-lg">
                                    <div className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg"><HandMetal size={20} /></div>
                                    {t.configManualTitle}
                                </h4>
                                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 leading-relaxed shadow-sm">
                                    {t.configManualDesc}
                                </div>
                                <div className="mt-6">
                                     <button 
                                        onClick={() => setActiveTab('settings')}
                                        className="px-6 py-2.5 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-sm font-bold hover:bg-slate-900 dark:hover:bg-slate-600 shadow-lg shadow-slate-200 dark:shadow-slate-900/50 hover:-translate-y-0.5 transition-all"
                                    >
                                        {t.gotoSet}
                                    </button>
                                </div>
                             </div>
                        )}
                     </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="p-6 w-full animate-in fade-in duration-300">
      {/* Updated Header / Filter to match StationRealtime layout */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm gap-4">
          <div className="flex items-center gap-6 w-full md:w-auto overflow-x-auto">
              <div className="flex gap-2">
                  {[
                      { id: 'overview', label: t.tabOverview, icon: LineChartIcon },
                      { id: 'settings', label: t.tabSettings, icon: Settings2 },
                      { id: 'sources', label: t.tabSources, icon: Database }
                  ].map((item) => (
                      <button 
                          key={item.id} 
                          onClick={() => setActiveTab(item.id as PriceTab)}
                          className={`px-4 py-2 rounded-lg text-sm md:text-base font-bold transition-all flex items-center gap-2 whitespace-nowrap
                          ${activeTab === item.id 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400'}`}
                      >
                          <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-slate-400'} />
                          {item.label}
                      </button>
                  ))}
              </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 w-full md:w-auto min-w-[160px] relative">
                  <select className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none w-full appearance-none z-10 cursor-pointer">
                      <option>{t.schemeDefault}</option>
                      <option>{lang === 'zh' ? '夏季峰谷策略' : 'Summer Peak Strategy'}</option>
                  </select>
                  <ChevronDown size={14} className="text-slate-400 absolute right-3" />
               </div>
               <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
               <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 w-full md:w-auto">
                  <Calendar size={16} className="text-slate-500 dark:text-slate-400" />
                  <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none border-none p-0 w-full md:w-auto cursor-pointer dark:invert dark:grayscale"
                  />
               </div>
          </div>
      </div>

      <div className="min-h-0">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'sources' && <SourcesTab />}
      </div>
    </div>
  );
};

export default PriceEditor;
