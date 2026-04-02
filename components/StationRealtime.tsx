
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Zap, Battery, Sun, Activity, Thermometer, Gauge, HeartPulse,
  Droplets, RotateCw, Cable, Download
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, LineChart, Line, BarChart, Bar, ReferenceLine, ComposedChart
} from 'recharts';
import { Language, Theme } from '../types';
import { translations } from '../translations';

// Dynamic Data Generator
const generateData = (days: number = 1) => {
    const totalHours = days * 24;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    return Array.from({ length: totalHours + 1 }, (_, i) => {
        const currentTime = new Date(startDate.getTime() + i * 60 * 60 * 1000);
        const t = currentTime.getHours(); // 0-23
        const isDay = t > 5 && t < 19; 
        
        const timeLabel = `${t.toString().padStart(2, '0')}:00`;

        // Basic Load
        const load = 400 + Math.random() * 100 + (t > 17 ? 300 : 0);
        
        // PV Data
        const irradiance = isDay ? Math.sin((t - 5.5) / 13.5 * Math.PI) * 1000 : 0;
        const pvPower = Math.max(0, irradiance * 0.85 * (1 + (Math.random() * 0.1 - 0.05)));
        // 日前/平滑预测曲线（无随机抖动，略偏保守效率，与实时总功率区分）
        const pvForecastPower = Math.max(0, irradiance * 0.78);
        
        // Per-Inverter Mock Data
        const inv1Power = isDay ? pvPower * 0.4 * (1 + (Math.random() * 0.05 - 0.025)) : 0;
        const inv2Power = isDay ? pvPower * 0.4 * (1 + (Math.random() * 0.05 - 0.025)) : 0;
        const inv3Power = isDay ? pvPower * 0.2 * (1 + (Math.random() * 0.05 - 0.025)) : 0;

        // ESS Data
        const strategy = 600;
        const demand = 800;
        const soc = Math.max(0, Math.min(100, 50 + Math.sin(t/3)*40));
        
        // ESS Power: Positive = Charging (Load), Negative = Discharging (Gen)
        const essPower = Math.round((Math.random() - 0.5) * 300);
        const power = essPower; 

        const maxCellVol = 3.45 + Math.random() * 0.1;
        const minCellVol = 3.15 + Math.random() * 0.1;
        const maxCellTemp = 35 + Math.random() * 5;
        const minCellTemp = 25 + Math.random() * 5;

        // DG Data
        const dgRun = t > 18 && t < 22;
        const dgPower = dgRun ? 450 + Math.random() * 20 : 0;
        const fuelLevel = Math.max(0, 85 - (t * 1.5));
        const coolantTemp = dgRun ? 88 + Math.random() * 3 : 40 + Math.random() * 5;
        const oilPress = dgRun ? 4.5 + Math.random() * 0.2 : 0;

        // EVSE Data
        const evsePower = (t > 8 && t < 20) ? 200 + Math.random() * 150 : 20 + Math.random() * 10;
        const activeSessions = Math.round(evsePower / 40);

        // Meter Power Calculation (Net Grid Power)
        const meterPower = Math.round((load + evsePower) - (pvPower + dgPower) + essPower);
        const refLine = -50;

        return {
            time: timeLabel,
            loadPower: Math.round(load + evsePower), // Total Load
            gridPower: Math.max(0, meterPower), // Import only
            meterPower: meterPower, // Net PCC
            essPower: essPower,
            refLine: refLine,
            strategy,
            demand,
            // ESS
            soc,
            power,
            maxCellVol,
            minCellVol,
            maxCellTemp,
            minCellTemp,
            // PV
            irradiance: Math.round(irradiance),
            pvPower: Math.round(pvPower),
            pvForecastPower: Math.round(pvForecastPower),
            inv1Power: Math.round(inv1Power),
            inv2Power: Math.round(inv2Power),
            inv3Power: Math.round(inv3Power),
            // DG
            dgPower: Math.round(dgPower),
            fuelLevel,
            coolantTemp: Math.round(coolantTemp),
            oilPress,
            // EVSE
            evsePower: Math.round(evsePower),
            activeSessions
        };
    });
};

interface StationRealtimeProps {
  lang: Language;
  theme: Theme;
  selectedStation: string;
  stationData?: any;
}

const StationRealtime: React.FC<StationRealtimeProps> = ({ lang, theme, selectedStation, stationData }) => {
  const t = translations[lang].stationRealtime;
  const isDark = theme === 'dark';
  
  const [activeTab, setActiveTab] = useState('pv');
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  // Memoize data to avoid regeneration on every render
  const chartData = useMemo(() => {
      return generateData(1);
  }, []);

  // --- Dynamic Tab Logic ---
  const allTabs = useMemo(() => [
      { id: 'ess', label: t?.subNav?.ess || 'BESS', icon: Battery },
      { id: 'pv', label: t?.subNav?.pv || 'PV', icon: Sun },
      { id: 'evse', label: t?.subNav?.evse || 'EVSE', icon: Cable },
      { id: 'dg', label: t?.subNav?.dg || 'DG', icon: RotateCw }
  ], [t]);

  const visibleTabs = useMemo(() => {
      // If no station data or no device types specified, show all (fallback)
      if (!stationData || !stationData.deviceTypes || stationData.deviceTypes.length === 0) {
          return allTabs;
      }
      return allTabs.filter(tab => stationData.deviceTypes.includes(tab.id));
  }, [stationData, allTabs]);

  // Auto-switch tab if current active tab is not visible
  useEffect(() => {
      if (visibleTabs.length > 0 && !visibleTabs.find(tab => tab.id === activeTab)) {
          setActiveTab(visibleTabs[0].id);
      }
  }, [visibleTabs, activeTab, selectedStation]);

  const handleTabChange = (tabId: string) => {
      setActiveTab(tabId);
      setHiddenSeries([]);
  };

  const toggleSeries = (dataKey: string) => {
    setHiddenSeries(prev => prev.includes(dataKey) ? prev.filter(k => k !== dataKey) : [...prev, dataKey]);
  };

  const chartColors = {
      grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
      text: isDark ? '#94a3b8' : '#64748b',
      tooltipBg: isDark ? '#1e2128' : '#ffffff',
      tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
  };

  const tooltipStyle = {
      contentStyle: { borderRadius: '16px', border: `1px solid ${chartColors.tooltipBorder}`, backgroundColor: chartColors.tooltipBg, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' },
      itemStyle: { fontSize: '15px', fontWeight: 600, padding: '4px 0' },
      labelStyle: { color: isDark ? '#94a3b8' : '#64748b', marginBottom: '8px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }
  };

  const CustomLegend = ({ payload, onClick }: any) => {
      return (
          <div className="flex flex-wrap justify-center gap-x-7 gap-y-2.5 mt-5">
              {payload.map((entry: any, index: number) => {
                  const isHidden = hiddenSeries.includes(entry.dataKey);
                  return (
                      <button 
                          key={`item-${index}`} 
                          onClick={() => onClick(entry.dataKey)}
                          className={`flex items-center gap-2.5 text-sm font-bold transition-all ${isHidden ? 'opacity-40 grayscale' : 'opacity-100'} text-slate-600 dark:text-slate-300`}
                      >
                          {entry.dataKey === 'refLine' ? (
                              <div className="flex items-center">
                                  <div className="w-3.5 h-3.5 rounded-full border-2 bg-transparent" style={{borderColor: entry.color}}></div>
                                  <div className="w-4 h-0.5 border-t-2 border-dashed ml-1" style={{borderColor: entry.color}}></div>
                              </div>
                          ) : (
                              <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></span>
                          )}
                          {entry.value}
                      </button>
                  )
              })}
          </div>
      )
  }

  // --- Render Contents ---

  const renderEssContent = () => (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
        {/* Left Column: ESS Overview */}
        <div className="xl:col-span-1 space-y-3">
            <div className="ems-card p-5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="p-1.5 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl"><Battery size={16}/></span>
                    {lang === 'zh' ? '储能监控' : 'BESS Monitor'}
                </h3>
                <div className="space-y-3">
                    {/* SOC Circle */}
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark">
                         <div className="relative w-28 h-28 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path className="text-slate-200 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
                                <path className="text-emerald-500 drop-shadow-md transition-all duration-1000 ease-out" strokeDasharray="85, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">85%</span>
                                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t?.soc || 'SOC'}</span>
                            </div>
                         </div>
                         <div className="mt-3 flex justify-between w-full px-1 text-sm">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">{t?.remainingCap || 'Remaining Cap'}</span>
                            <span className="font-bold text-slate-900 dark:text-white text-lg">1,850 kWh</span>
                         </div>
                    </div>

                    {/* Energy Stats */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-2xl border border-amber-200/50 dark:border-amber-800/50">
                            <div className="text-sm text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mb-0.5">{t?.chargeEnergy || 'Charge'}</div>
                            <div className="text-xl font-extrabold text-slate-900 dark:text-white mb-0.5">4.2</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 flex justify-between items-center font-medium">
                                <span>{t?.today || 'Today'}</span>
                                <span className="font-mono bg-white/50 dark:bg-black/20 px-1 py-0.5 rounded text-amber-600 dark:text-amber-400">1.2</span>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-100/50 dark:bg-blue-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-800/50">
                            <div className="text-sm text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mb-0.5">{t?.dischargeEnergy || 'Discharge'}</div>
                            <div className="text-xl font-extrabold text-slate-900 dark:text-white mb-0.5">3.8</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400 flex justify-between items-center font-medium">
                                <span>{t?.today || 'Today'}</span>
                                <span className="font-mono bg-white/50 dark:bg-black/20 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">0.9</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Battery Health Stats */}
            <div className="ems-card p-5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="p-1.5 bg-rose-100 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl"><HeartPulse size={16}/></span>
                    {lang === 'zh' ? '电池健康' : 'Battery Health'}
                </h3>
                <div className="space-y-2.5">
                     <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-apple-surface-dark flex items-center justify-center shadow-sm text-emerald-500 border border-slate-200 dark:border-apple-border-dark">
                                <Activity size={16} />
                            </div>
                            <div>
                                <div className="text-base font-bold text-slate-700 dark:text-slate-200">SOH</div>
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">State of Health</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">98.5%</div>
                            <div className="text-sm font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest">{lang === 'zh' ? '优秀' : 'Excellent'}</div>
                        </div>
                     </div>
                     <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-apple-surface-dark flex items-center justify-center shadow-sm text-orange-500 border border-slate-200 dark:border-apple-border-dark">
                                <Thermometer size={16} />
                            </div>
                            <div>
                                <div className="text-base font-bold text-slate-700 dark:text-slate-200">CELL TEMP</div>
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">{lang === 'zh' ? '平均值' : 'Average'}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-extrabold text-orange-500">28.5°C</div>
                            <div className="text-sm font-bold text-slate-400 tracking-widest">26.2 - 31.4°C</div>
                        </div>
                     </div>
                     <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-apple-surface-dark flex items-center justify-center shadow-sm text-blue-500 border border-slate-200 dark:border-apple-border-dark">
                                <Gauge size={16} />
                            </div>
                            <div>
                                <div className="text-base font-bold text-slate-700 dark:text-slate-200">CELL VOLT</div>
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">{lang === 'zh' ? '平均值' : 'Average'}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-extrabold text-blue-500">3.34 V</div>
                            <div className="text-sm font-bold text-slate-400 tracking-widest">3.28 - 3.41 V</div>
                        </div>
                     </div>
                </div>
            </div>
        </div>

        {/* Right Column: ESS Charts */}
        <div className="xl:col-span-3 space-y-3 flex flex-col">
            {/* Load Tracking */}
            <div className="ems-card p-5 flex flex-col flex-1 min-h-[300px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t?.loadCurve || 'Load Curve'}</h3>
                </div>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorEssPower" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                            <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} fontWeight={600} interval={3}/>
                            <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} label={{ value: 'kW', position: 'insideLeft', angle: -90, dy: 10, fontSize: 13, fill: chartColors.text, fontWeight: 700 }} fontWeight={600} />
                            <Tooltip {...tooltipStyle} />
                            <Legend verticalAlign="top" height={40} content={<CustomLegend onClick={toggleSeries}/>} />
                            
                            <ReferenceLine y={0} stroke={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} strokeWidth={1} />

                            <Line hide={hiddenSeries.includes('meterPower')} name={t?.legend?.meterPower || 'Meter Power'} type="monotone" dataKey="meterPower" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={500} />
                            <Area hide={hiddenSeries.includes('essPower')} name={lang === 'zh' ? '储能功率' : 'BESS Power'} type="monotone" dataKey="essPower" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorEssPower)" animationDuration={500} />
                            <Line hide={hiddenSeries.includes('loadPower')} name={t?.legend?.loadPower || 'Load Power'} type="monotone" dataKey="loadPower" stroke="#819226" strokeWidth={2} dot={false} animationDuration={500} />
                            <Line hide={hiddenSeries.includes('refLine')} name={t?.legend?.refLine || 'Reverse Ref Line'} type="step" dataKey="refLine" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} animationDuration={500} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* SOC-Power */}
            <div className="ems-card p-5 flex flex-col min-h-[300px]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t?.socPowerCurve || 'SOC-Power'}</h3>
                </div>
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                        <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} syncId="socPower" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSoc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="time" hide />
                                <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} domain={[0, 100]} fontWeight={600} />
                                <Tooltip {...tooltipStyle} />
                                <Legend verticalAlign="top" height={26} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 700, marginTop: '-6px' }} />
                                <Area name={t?.legend?.soc || 'SOC'} type="monotone" dataKey="soc" stroke="#eab308" fill="url(#colorSoc)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                        </div>
                        <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} syncId="socPower" margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#819226" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#819226" stopOpacity={0.05}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} interval={3} fontWeight={600} />
                                <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} fontWeight={600} />
                                <Tooltip {...tooltipStyle} />
                                <Legend verticalAlign="top" height={26} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 700, marginTop: '-6px' }} />
                                <Area name={t?.legend?.power || 'Power'} type="monotone" dataKey="power" stroke="#819226" fill="url(#colorPower)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                        </div>
                </div>
            </div>
        </div>
    </div>
  );

  const renderPvContent = () => (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
        {/* 大屏：与「光伏监控」同列同行拉伸，曲线区高度与左侧卡片一致 */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 xl:items-stretch">
            <div className="xl:col-span-1">
                <div className="ems-card p-5 h-full xl:flex xl:flex-col">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <span className="p-1.5 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl"><Sun size={16}/></span>
                        {lang === 'zh' ? '光伏监控' : 'PV Monitor'}
                    </h3>
                    <div className="p-5 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark text-center mb-3">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{lang === 'zh' ? '实时总功率' : 'Total Real-time Power'}</p>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">854 <span className="text-base font-bold text-slate-400">kW</span></p>
                    </div>
                    <div className="space-y-2.5">
                         <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark transition-colors">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{lang === 'zh' ? '日发电量' : 'Daily Yield'}</span>
                            <span className="text-xl font-extrabold text-slate-900 dark:text-white">5.8 MWh</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark transition-colors">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{lang === 'zh' ? '总发电量' : 'Total Yield'}</span>
                            <span className="text-xl font-extrabold text-slate-900 dark:text-white">12.4 GWh</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark transition-colors">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{lang === 'zh' ? '发电时长' : 'Yield Hours'}</span>
                            <span className="text-xl font-extrabold text-slate-900 dark:text-white">1,245 h</span>
                         </div>
                    </div>
                </div>
            </div>

            <div className="xl:col-span-3 flex min-h-[280px] flex-col">
                <div className="ems-card flex flex-1 flex-col min-h-0 p-5">
                    <h3 className="shrink-0 text-lg font-bold text-slate-900 dark:text-white mb-3">{t?.pvRealtimePower}</h3>
                    <div className="min-h-[240px] flex-1 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPvPower" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} fontWeight={600} interval={3}/>
                                <YAxis yAxisId="left" fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} label={{ value: 'kW', position: 'insideLeft', angle: -90, dy: 10, fontSize: 13, fill: chartColors.text, fontWeight: 700 }} fontWeight={600}/>
                                <YAxis yAxisId="right" orientation="right" fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} label={{ value: 'W/m²', position: 'insideRight', angle: 90, dy: 10, fontSize: 13, fill: chartColors.text, fontWeight: 700 }} fontWeight={600}/>
                                <Tooltip {...tooltipStyle} />
                                <Legend verticalAlign="top" height={44} content={<CustomLegend onClick={toggleSeries}/>} />
                                <Area hide={hiddenSeries.includes('pvPower')} yAxisId="left" name={lang === 'zh' ? '光伏总实时功率' : 'Total PV (real-time)'} type="monotone" dataKey="pvPower" stroke="#eab308" strokeWidth={2} fill="url(#colorPvPower)" animationDuration={500} />
                                <Line hide={hiddenSeries.includes('pvForecastPower')} yAxisId="left" name={t.pvForecastPower} type="monotone" dataKey="pvForecastPower" stroke="#0ea5e9" strokeWidth={2} dot={false} strokeDasharray="6 4" animationDuration={500}/>
                                <Line hide={hiddenSeries.includes('irradiance')} yAxisId="right" name={lang === 'zh' ? '辐照度' : 'Irradiance'} type="monotone" dataKey="irradiance" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" animationDuration={500}/>
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>

        {/* 第二行：逆变器 | 各逆变器曲线（xl 下两卡同高；列表区与充电终端同为 max-h-[300px] 内滚动） */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 xl:items-stretch">
            <div className="xl:col-span-1 flex h-full min-h-0">
                <div className="ems-card h-full w-full p-5">
                    <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">{lang === 'zh' ? '逆变器' : 'Inverters'}</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                        {[
                            { name: 'Inv #01 (100kW)', sub: lang === 'zh' ? '效率: 98.4%' : 'Efficiency: 98.4%', mode: 'run' as const },
                            { name: 'Inv #02 (100kW)', sub: lang === 'zh' ? '效率: 98.4%' : 'Efficiency: 98.4%', mode: 'run' as const },
                            { name: 'Inv #03 (50kW)', sub: lang === 'zh' ? '效率: 98.4%' : 'Efficiency: 98.4%', mode: 'run' as const },
                            { name: 'Inv #04 (50kW)', sub: lang === 'zh' ? '无辐照' : 'No Irradiance', mode: 'standby' as const },
                            { name: 'Inv #05 (100kW)', sub: lang === 'zh' ? '效率: 97.9%' : 'Efficiency: 97.9%', mode: 'run' as const },
                            { name: 'Inv #06 (50kW)', sub: lang === 'zh' ? '效率: 98.1%' : 'Efficiency: 98.1%', mode: 'run' as const },
                        ].map((inv) => (
                            <div
                                key={inv.name}
                                className={`flex items-center justify-between p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark ${inv.mode === 'run' ? 'hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark transition-colors' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-2 h-2 rounded-full shrink-0 ${inv.mode === 'run' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    />
                                    <div>
                                        <div className="text-base font-bold text-slate-800 dark:text-slate-200">{inv.name}</div>
                                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">{inv.sub}</div>
                                    </div>
                                </div>
                                {inv.mode === 'run' ? (
                                    <span className="text-sm font-black bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                        {lang === 'zh' ? '运行' : 'Run'}
                                    </span>
                                ) : (
                                    <span className="text-sm font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                        {lang === 'zh' ? '待机' : 'Standby'}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="xl:col-span-3 flex h-full min-h-[240px] xl:min-h-0">
                <div className="ems-card flex h-full w-full min-h-0 flex-col p-5">
                    <h3 className="mb-4 shrink-0 text-lg font-bold text-slate-900 dark:text-white">{t?.pvDailyCurve}</h3>
                    <div className="min-h-0 w-full flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} fontWeight={600} interval={3}/>
                                <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} label={{ value: 'kW', position: 'insideLeft', angle: -90, dy: 10, fontSize: 13, fill: chartColors.text, fontWeight: 700 }} fontWeight={600}/>
                                <Tooltip {...tooltipStyle} />
                                <Legend verticalAlign="top" height={40} content={<CustomLegend onClick={toggleSeries}/>} />
                                <Line hide={hiddenSeries.includes('inv1Power')} type="monotone" dataKey="inv1Power" name={t?.legend?.inv1} stroke="#eab308" strokeWidth={2} dot={false} animationDuration={500} />
                                <Line hide={hiddenSeries.includes('inv2Power')} type="monotone" dataKey="inv2Power" name={t?.legend?.inv2} stroke="#f97316" strokeWidth={2} dot={false} animationDuration={500} />
                                <Line hide={hiddenSeries.includes('inv3Power')} type="monotone" dataKey="inv3Power" name={t?.legend?.inv3} stroke="#84cc16" strokeWidth={2} dot={false} animationDuration={500} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  const renderEvseContent = () => (
    <div className="space-y-4 animate-in fade-in duration-300">
        {/* 第一行：Charging Hub 与 Charging Load Profile 同高（xl stretch） */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 xl:items-stretch">
            <div className="xl:col-span-1 flex h-full min-h-0">
                <div className="ems-card flex h-full w-full flex-col p-5">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 shrink-0">
                        <span className="p-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl"><Cable size={16}/></span>
                        {lang === 'zh' ? '充电站监控' : 'Charging Hub'}
                    </h3>
                    <div className="flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark mb-3 shrink-0">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <path className="text-slate-200 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                <path className="text-blue-500 drop-shadow-md" strokeDasharray="65, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">65%</span>
                                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">{lang === 'zh' ? '利用率' : 'Utilization'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 shrink-0">
                        <div className="text-center p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark">
                            <div className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-1">Active</div>
                            <div className="text-xl font-extrabold text-slate-900 dark:text-white">8/12</div>
                        </div>
                        <div className="text-center p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark">
                            <div className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-1">Today</div>
                            <div className="text-xl font-extrabold text-slate-900 dark:text-white">1.2<span className="text-sm ml-1 text-slate-500">MWh</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="xl:col-span-3 flex h-full min-h-[240px]">
                <div className="ems-card flex h-full w-full min-h-0 flex-col p-5">
                    <h3 className="shrink-0 text-lg font-bold text-slate-900 dark:text-white mb-4">{lang === 'zh' ? '充电负荷曲线' : 'Charging Load Profile'}</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEvse" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} fontWeight={600} interval={3}/>
                                <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} label={{ value: 'kW', position: 'insideLeft', angle: -90, dy: 10, fontSize: 13, fill: chartColors.text, fontWeight: 700 }} fontWeight={600} />
                                <Tooltip {...tooltipStyle} />
                                <Area name="Charging Power" type="step" dataKey="evsePower" stroke="#3b82f6" strokeWidth={2} fill="url(#colorEvse)" animationDuration={500}/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>

        {/* 第二行：充电终端 | 活跃会话 */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 xl:items-stretch">
            <div className="xl:col-span-1 flex h-full min-h-0">
                <div className="ems-card h-full w-full p-5">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{lang === 'zh' ? '充电终端' : 'Charging Terminals'}</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                        {[1,2,3,4,5,6].map(i => {
                            const status = i < 4 ? 'Charging' : (i === 4 ? 'Available' : 'Fault');
                            const color = status === 'Charging' ? 'bg-blue-500 shadow-blue-500/50' : (status === 'Available' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50');
                            return (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-md ${color}`}>
                                            {i}
                                        </div>
                                        <div>
                                            <div className="text-base font-bold text-slate-800 dark:text-slate-200">Terminal #{i.toString().padStart(2,'0')}</div>
                                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">120kW DC</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-black uppercase tracking-widest ${status === 'Charging' ? 'text-blue-600' : (status === 'Available' ? 'text-emerald-600' : 'text-red-600')}`}>{status}</div>
                                        {status === 'Charging' && <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">85% • 45kW</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="xl:col-span-3 flex h-full min-h-[280px]">
                <div className="ems-card flex h-full w-full min-h-0 flex-col p-5">
                    <h3 className="shrink-0 text-lg font-bold text-slate-900 dark:text-white mb-4">{lang === 'zh' ? '活跃会话数' : 'Active Sessions'}</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} fontWeight={600} interval={3}/>
                                <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} fontWeight={600} />
                                <Tooltip {...tooltipStyle} cursor={{fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', radius: 4}} />
                                <Bar name="Active Cars" dataKey="activeSessions" fill="#84cc16" radius={[4, 4, 0, 0]} barSize={24} animationDuration={500} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  const renderDgContent = () => (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
        <div className="xl:col-span-1 space-y-3">
             {/* DG Overview */}
             <div className="ems-card p-5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl"><RotateCw size={16}/></span>
                    {lang === 'zh' ? '柴发监控' : 'Diesel Gen'}
                </h3>
                <div className="flex justify-center mb-4">
                     <div className="relative w-32 h-32 rounded-full border-4 border-slate-200 dark:border-apple-border-dark flex items-center justify-center bg-slate-50 dark:bg-apple-surface-secondary-dark/50">
                         <div className="text-center">
                             <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">500</div>
                             <div className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-0.5">kW Output</div>
                         </div>
                         <div className="absolute bottom-3 flex flex-col items-center">
                             <span className="text-sm font-black text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 uppercase tracking-widest">Running</span>
                         </div>
                     </div>
                </div>
                <div className="space-y-2">
                     <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark">
                         <div className="flex items-center gap-2">
                             <Droplets size={16} className="text-blue-500" />
                             <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{lang === 'zh' ? '油位' : 'Fuel Level'}</span>
                         </div>
                         <span className="text-lg font-mono font-bold text-slate-900 dark:text-white">76%</span>
                     </div>
                     <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-200 dark:border-apple-border-dark">
                         <div className="flex items-center gap-2">
                             <RotateCw size={16} className="text-amber-500" />
                             <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{lang === 'zh' ? '运行时间' : 'Run Hours'}</span>
                         </div>
                         <span className="text-lg font-mono font-bold text-slate-900 dark:text-white">1,240 h</span>
                     </div>
                </div>
             </div>

             {/* Engine Health */}
             <div className="ems-card p-5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">{lang === 'zh' ? '引擎指标' : 'Engine Metrics'}</h3>
                <div className="space-y-4">
                     <div>
                         <div className="flex justify-between mb-1.5">
                             <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{lang === 'zh' ? '冷却液温度' : 'Coolant Temp'}</span>
                             <span className="text-base font-bold text-slate-900 dark:text-white">88°C</span>
                         </div>
                         <div className="w-full bg-slate-100 dark:bg-apple-surface-secondary-dark rounded-full h-2.5 overflow-hidden">
                             <div className="bg-orange-500 h-2.5 rounded-full transition-all duration-1000" style={{width: '60%'}}></div>
                         </div>
                     </div>
                     <div>
                         <div className="flex justify-between mb-1.5">
                             <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{lang === 'zh' ? '机油压力' : 'Oil Pressure'}</span>
                             <span className="text-base font-bold text-slate-900 dark:text-white">4.5 Bar</span>
                         </div>
                         <div className="w-full bg-slate-100 dark:bg-apple-surface-secondary-dark rounded-full h-2.5 overflow-hidden">
                             <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000" style={{width: '75%'}}></div>
                         </div>
                     </div>
                     <div>
                         <div className="flex justify-between mb-1.5">
                             <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{lang === 'zh' ? '蓄电池电压' : 'Battery V'}</span>
                             <span className="text-base font-bold text-slate-900 dark:text-white">26.4 V</span>
                         </div>
                         <div className="w-full bg-slate-100 dark:bg-apple-surface-secondary-dark rounded-full h-2.5 overflow-hidden">
                             <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000" style={{width: '90%'}}></div>
                         </div>
                     </div>
                </div>
             </div>
        </div>

        <div className="xl:col-span-3 space-y-3 flex flex-col">
             <div className="ems-card p-5 flex flex-col min-h-[300px]">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{lang === 'zh' ? '输出功率' : 'Output Power'}</h3>
                 <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                             <defs>
                                <linearGradient id="colorDg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                            <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} fontWeight={600} interval={3}/>
                            <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} label={{ value: 'kW', position: 'insideLeft', angle: -90, dy: 10, fontSize: 13, fill: chartColors.text, fontWeight: 700 }} fontWeight={600} />
                            <Tooltip {...tooltipStyle} />
                            <Area name="DG Output" type="monotone" dataKey="dgPower" stroke="#475569" strokeWidth={2} fill="url(#colorDg)" animationDuration={500}/>
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[280px]">
                 <div className="ems-card p-5 flex flex-col">
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{lang === 'zh' ? '冷却液温度' : 'Coolant Temperature'}</h3>
                     <div className="flex-1 w-full min-h-0">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} fontWeight={600} interval={3}/>
                                <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} unit="°C" fontWeight={600} />
                                <Tooltip {...tooltipStyle} />
                                <Line name="Temp" type="monotone" dataKey="coolantTemp" stroke="#f97316" strokeWidth={2} dot={false} animationDuration={500}/>
                            </LineChart>
                        </ResponsiveContainer>
                     </div>
                 </div>
                 <div className="ems-card p-5 flex flex-col">
                     <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{lang === 'zh' ? '燃油消耗' : 'Fuel Consumption'}</h3>
                       <div className="flex-1 w-full min-h-0">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="time" fontSize={13} tickLine={false} axisLine={false} tickMargin={12} stroke={chartColors.text} fontWeight={600} interval={3}/>
                                <YAxis fontSize={13} tickLine={false} axisLine={false} stroke={chartColors.text} unit="%" fontWeight={600} />
                                <Tooltip {...tooltipStyle} />
                                <Line name="Fuel Level" type="monotone" dataKey="fuelLevel" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={500}/>
                            </LineChart>
                        </ResponsiveContainer>
                     </div>
                 </div>
             </div>
        </div>
    </div>
  );

  return (
    <div className="ems-page-shell">
        {/* 顶栏：与电价列表 Header / Toolbar 同款 */}
        <div className="ems-card p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 w-full md:w-auto overflow-x-auto custom-scrollbar-hide">
                <div className="ems-segmented shrink-0">
                    {visibleTabs.map((item) => (
                        <button 
                            key={item.id} 
                            onClick={() => handleTabChange(item.id)}
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

            <div className="flex w-full items-center justify-end gap-3 md:w-auto">
                <button
                    type="button"
                    className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                    title={lang === 'zh' ? '导出' : 'Export'}
                >
                    <Download size={16} />
                </button>
            </div>
        </div>

        <div className="min-h-0 space-y-4">
            {activeTab === 'ess' && visibleTabs.some(t => t.id === 'ess') && renderEssContent()}
            {activeTab === 'pv' && visibleTabs.some(t => t.id === 'pv') && renderPvContent()}
            {activeTab === 'evse' && visibleTabs.some(t => t.id === 'evse') && renderEvseContent()}
            {activeTab === 'dg' && visibleTabs.some(t => t.id === 'dg') && renderDgContent()}
        </div>
    </div>
  );
};

export default StationRealtime;
