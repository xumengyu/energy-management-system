
import React, { useState } from 'react';
import { 
  Zap, Sun, Battery, Activity, 
  ArrowUpRight, ArrowDownRight,
  MapPin, AlertCircle, Factory, Search
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

const STATIONS_EN = [
  { id: 1, name: 'Station #1 (Berlin)', location: 'Berlin Ind. Park', status: 'normal', pvCap: 1200, essCap: 2000, soc: 85, lat: '30%', lng: '40%' },
  { id: 2, name: 'Station #2 (Munich)', location: 'Munich Tech Hub', status: 'warning', pvCap: 800, essCap: 1000, soc: 40, lat: '45%', lng: '55%' },
  { id: 3, name: 'Station #3 (London)', location: 'London North', status: 'offline', pvCap: 500, essCap: 0, soc: 0, lat: '20%', lng: '30%' },
  { id: 4, name: 'Station #5 (Paris)', location: 'Paris West', status: 'normal', pvCap: 2000, essCap: 4000, soc: 92, lat: '50%', lng: '60%' },
  { id: 5, name: 'Station #14 (Vienna)', location: 'Vienna Logistics', status: 'normal', pvCap: 1500, essCap: 3000, soc: 76, lat: '65%', lng: '45%' },
];

const STATIONS_ZH = [
  { id: 1, name: '站点 #1 (柏林)', location: '柏林工业园', status: 'normal', pvCap: 1200, essCap: 2000, soc: 85, lat: '30%', lng: '40%' },
  { id: 2, name: '站点 #2 (慕尼黑)', location: '慕尼黑科技园', status: 'warning', pvCap: 800, essCap: 1000, soc: 40, lat: '45%', lng: '55%' },
  { id: 3, name: '站点 #3 (伦敦)', location: '伦敦北区', status: 'offline', pvCap: 500, essCap: 0, soc: 0, lat: '20%', lng: '30%' },
  { id: 4, name: '站点 #5 (巴黎)', location: '巴黎西区', status: 'normal', pvCap: 2000, essCap: 4000, soc: 92, lat: '50%', lng: '60%' },
  { id: 5, name: '站点 #14 (维也纳)', location: '维也纳物流中心', status: 'normal', pvCap: 1500, essCap: 3000, soc: 76, lat: '65%', lng: '45%' },
];

interface DashboardProps {
  lang: Language;
  theme: Theme;
  selectedStation: string;
  onNavigate?: (path: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ lang, theme, selectedStation, onNavigate }) => {
  const t = translations[lang].dashboard;
  const isDark = theme === 'dark';
  
  const STATIONS = lang === 'zh' ? STATIONS_ZH : STATIONS_EN;

  const renderStatus = (status: string) => {
    if (status === 'normal') return <span className="flex items-center gap-1.5 text-brand-700 dark:text-brand-400 bg-brand-100/50 dark:bg-brand-900/30 px-2.5 py-1 rounded-full text-[11px] font-bold border border-brand-200/50 dark:border-brand-800/50"><span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span> {t.status.normal}</span>;
    if (status === 'warning') return <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-200/50 dark:border-amber-800/50"><AlertCircle size={12}/> {t.status.warning}</span>;
    return <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark px-2.5 py-1 rounded-full text-[11px] font-bold border border-apple-border-light dark:border-apple-border-dark"><Battery size={12}/> {t.status.offline}</span>;
  };

  return (
    <div className="p-2 w-full animate-in fade-in duration-500 space-y-2">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2">
        {/* Card 0: Total Stations */}
        <div className="bg-apple-surface-light dark:bg-apple-surface-dark p-4 rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-indigo-50 dark:bg-indigo-900/10 rounded-full opacity-50 blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <Factory size={16} />
                </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{t.kpi.totalStations}</p>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{STATIONS.length}</span>
            </div>
          </div>
        </div>

        {/* Card 1: Total PV Capacity */}
        <div className="bg-apple-surface-light dark:bg-apple-surface-dark p-4 rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-brand-50 dark:bg-brand-900/10 rounded-full opacity-50 blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-xl text-brand-600 dark:text-brand-400">
                    <Sun size={16} />
                </div>
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-100/50 dark:bg-brand-900/30 px-1.5 py-0.5 rounded-full border border-brand-200/50 dark:border-brand-800/50 flex items-center gap-0.5">
                    <ArrowUpRight size={10} /> 12%
                </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{t.kpi.totalPv}</p>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">5.8</span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">MW</span>
            </div>
          </div>
        </div>

        {/* Card 2: ESS Installed Scale */}
        <div className="bg-apple-surface-light dark:bg-apple-surface-dark p-4 rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-purple-50 dark:bg-purple-900/10 rounded-full opacity-50 blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
                    <Battery size={16} />
                </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{t.kpi.essScale}</p>
            <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">6.4</span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">MW</span>
                <span className="text-slate-300 dark:text-slate-600">/</span>
                <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">12.8</span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">MWh</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Generation */}
        <div className="bg-apple-surface-light dark:bg-apple-surface-dark p-4 rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-50 dark:bg-amber-900/10 rounded-full opacity-50 blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-500 dark:text-amber-400">
                    <Zap size={16} />
                </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{t.kpi.totalGen}</p>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">12.4</span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">GWh</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Charge */}
        <div className="bg-apple-surface-light dark:bg-apple-surface-dark p-4 rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-50 dark:bg-emerald-900/10 rounded-full opacity-50 blur-2xl"></div>
          <div className="relative z-10">
             <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-500 dark:text-emerald-400">
                    <ArrowDownRight size={16} />
                </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{t.kpi.totalCharge}</p>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">4.2</span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">GWh</span>
            </div>
          </div>
        </div>

        {/* Card 5: Total Discharge */}
        <div className="bg-apple-surface-light dark:bg-apple-surface-dark p-4 rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
           <div className="absolute -right-6 -top-6 w-20 h-20 bg-blue-50 dark:bg-blue-900/10 rounded-full opacity-50 blur-2xl"></div>
           <div className="relative z-10">
             <div className="flex justify-between items-start mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500 dark:text-blue-400">
                    <ArrowUpRight size={16} />
                </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">{t.kpi.totalDischarge}</p>
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">3.8</span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">GWh</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Map Section (Replacing Chart Section) */}
        <div className="lg:col-span-2 bg-apple-surface-light dark:bg-apple-surface-dark p-4 rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm flex flex-col min-h-[320px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span className="p-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-xl"><MapPin size={16} /></span>
              {lang === 'zh' ? '全球资产分布' : 'Global Asset Distribution'}
            </h3>
            <div className="flex gap-3">
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[11px] font-bold text-slate-500">{t.status.normal}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span className="text-[11px] font-bold text-slate-500">{t.status.warning}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                    <span className="text-[11px] font-bold text-slate-500">{t.status.offline}</span>
                </div>
            </div>
          </div>
          
          <div className="flex-1 bg-apple-bg-light dark:bg-apple-bg-dark rounded-2xl border border-apple-border-light dark:border-apple-border-dark relative overflow-hidden group shadow-inner">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-[#e5e7eb] dark:bg-apple-bg-dark opacity-50">
                   <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
              </div>
              
              {/* Station Pins */}
              {STATIONS.map(station => {
                  const statusColor = station.status === 'normal' ? 'bg-emerald-500' : (station.status === 'warning' ? 'bg-amber-500' : 'bg-slate-500');
                  return (
                      <div 
                          key={station.id} 
                          className="absolute cursor-pointer transform hover:scale-110 transition-transform group/pin z-20"
                          style={{ top: station.lat, left: station.lng }}
                      >
                          <div className="relative flex flex-col items-center">
                              <div className={`p-1 rounded-full text-white shadow-lg border border-white dark:border-apple-bg-dark ${statusColor}`}>
                                  <MapPin size={14} fill="currentColor" />
                              </div>
                              {/* Hover Card */}
                              <div className="absolute bottom-full mb-2 bg-apple-surface-light dark:bg-apple-surface-dark text-slate-800 dark:text-white text-[11px] px-3 py-2 rounded-xl shadow-2xl border border-apple-border-light dark:border-apple-border-dark whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none min-w-[120px] z-30">
                                  <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-apple-border-light dark:border-apple-border-dark">
                                      <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`}></span>
                                      <span className="font-bold">{station.name}</span>
                                  </div>
                                  <div className="flex flex-col gap-0.5 text-slate-500 dark:text-slate-400">
                                      <span className="font-medium">{station.location}</span>
                                      <span className="font-mono text-[10px] opacity-70">SN: {station.id.toString().padStart(3, '0')}</span>
                                  </div>
                                  <div className="absolute left-1/2 -bottom-1 w-2 h-2 bg-apple-surface-light dark:bg-apple-surface-dark transform -translate-x-1/2 rotate-45 border-r border-b border-apple-border-light dark:border-apple-border-dark"></div>
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
        </div>

        {/* Aggregated Status / Distribution */}
        <div className="bg-apple-surface-light dark:bg-apple-surface-dark rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm flex flex-col overflow-hidden h-full min-h-[320px]">
             <div className="p-4 border-b border-apple-border-light dark:border-apple-border-dark bg-apple-surface-secondary-light/50 dark:bg-apple-surface-secondary-dark/50">
                 <h3 className="font-bold text-base text-slate-900 dark:text-white">{t.charts.distribution}</h3>
             </div>
             <div className="p-4 flex-1 flex flex-col justify-center items-center relative">
                 {/* Visual Donut Chart */}
                 <div className="relative w-32 h-32 rounded-full border-[10px] border-apple-bg-light dark:border-apple-bg-dark flex items-center justify-center shadow-inner">
                    <div className="absolute inset-0 rounded-full border-[10px] border-yellow-400 border-l-transparent border-b-transparent rotate-45 transition-all hover:scale-[1.02] opacity-90 filter drop-shadow-sm"></div>
                    <div className="absolute inset-0 rounded-full border-[10px] border-brand-500 border-t-transparent border-r-transparent rotate-[200deg] transition-all hover:scale-[1.02] opacity-90 filter drop-shadow-sm"></div>
                    <div className="text-center z-10">
                        <span className="block text-2xl font-black text-slate-800 dark:text-white tracking-tighter">82%</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest mt-0.5">{lang === 'zh' ? '自给率' : 'Self-Sufficiency'}</span>
                    </div>
                 </div>
                 
                 <div className="mt-4 w-full space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] p-2.5 bg-apple-surface-secondary-light/50 dark:bg-apple-surface-secondary-dark/50 rounded-xl hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark transition-colors cursor-default">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-sm"></span> {lang === 'zh' ? '光伏直供' : 'PV Direct Use'}</span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">45%</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] p-2.5 bg-apple-surface-secondary-light/50 dark:bg-apple-surface-secondary-dark/50 rounded-xl hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark transition-colors cursor-default">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-sm"></span> {lang === 'zh' ? '电网取电' : 'Grid Import'}</span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">18%</span>
                    </div>
                     <div className="flex justify-between items-center text-[11px] p-2.5 bg-apple-surface-secondary-light/50 dark:bg-apple-surface-secondary-dark/50 rounded-xl hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark transition-colors cursor-default">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 shadow-sm"></span> {lang === 'zh' ? '电池放电' : 'Battery Disch.'}</span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">37%</span>
                    </div>
                 </div>
             </div>
        </div>
      </div>

      {/* Station List Table */}
      <div className="bg-apple-surface-light dark:bg-apple-surface-dark rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm overflow-hidden">
        <div className="p-4 border-b border-apple-border-light dark:border-apple-border-dark flex flex-col sm:flex-row justify-between items-center gap-2 bg-apple-surface-secondary-light/30 dark:bg-apple-surface-secondary-dark/30">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">{t.table.title}</h3>
            <button 
                onClick={() => onNavigate && onNavigate('/stations')}
                className="text-[11px] text-brand-600 dark:text-brand-400 font-bold hover:bg-brand-100/50 dark:hover:bg-brand-900/30 px-3 py-1.5 rounded-xl transition-all border border-transparent hover:border-brand-200/50 dark:hover:border-brand-800/50"
            >
                {t.table.view}
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-apple-surface-secondary-light/50 dark:bg-apple-surface-secondary-dark/50 border-b border-apple-border-light dark:border-apple-border-dark">
                    <tr>
                        <th className="px-6 py-3">{t.table.name}</th>
                        <th className="px-6 py-3">{t.table.location}</th>
                        <th className="px-6 py-3">{t.table.status}</th>
                        <th className="px-6 py-3">{t.table.capacity}</th>
                        <th className="px-6 py-3 text-center">{t.table.soc}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-apple-border-light dark:divide-apple-border-dark text-[13px]">
                    {STATIONS.map((station) => (
                        <tr key={station.id} className={`hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark transition-colors group ${selectedStation === station.name ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''}`}>
                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{station.name}</td>
                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium">
                                <div className="flex items-center gap-1.5">
                                    <MapPin size={12} className="text-slate-400 shrink-0" /> {station.location}
                                </div>
                            </td>
                            <td className="px-6 py-4">{renderStatus(station.status)}</td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                                        <Sun size={10} className="text-amber-500" /> {station.pvCap} kWp
                                    </div>
                                    {station.essCap > 0 && (
                                        <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                                            <Battery size={10} className="text-purple-500" /> {station.essCap} kWh
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-16 h-1.5 bg-apple-bg-light dark:bg-apple-bg-dark rounded-full overflow-hidden shadow-inner">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${station.soc < 30 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                            style={{ width: `${station.soc}%` }}
                                        ></div>
                                    </div>
                                    <span className="font-bold text-slate-700 dark:text-slate-300 w-10">{station.soc}%</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
