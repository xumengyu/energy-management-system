
import React, { useState } from 'react';
import { 
  Search, Plus, MapPin
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

// Mock Data for Map Visualization (Lat/Lng simulated by %)
const STATIONS_EN = [
  { id: 'ST-001', name: 'Station #1 (Berlin)', location: 'Berlin, Germany', status: 'Normal', lat: '30%', lng: '40%' },
  { id: 'ST-002', name: 'Station #2 (Munich)', location: 'Munich, Germany', status: 'Warning', lat: '45%', lng: '55%' },
  { id: 'ST-003', name: 'Station #3 (London)', location: 'London, UK', status: 'Offline', lat: '20%', lng: '30%' },
  { id: 'ST-004', name: 'Station #5 (Paris)', location: 'Paris, France', status: 'Normal', lat: '50%', lng: '60%' },
  { id: 'ST-005', name: 'Station #6 (Madrid)', location: 'Madrid, Spain', status: 'Normal', lat: '60%', lng: '45%' },
  { id: 'ST-006', name: 'Station #8 (Rome)', location: 'Rome, Italy', status: 'Normal', lat: '80%', lng: '35%' },
  { id: 'ST-007', name: 'Station #9 (Zurich)', location: 'Zurich, Switzerland', status: 'Warning', lat: '65%', lng: '25%' },
  { id: 'ST-008', name: 'Station #11 (Oslo)', location: 'Oslo, Norway', status: 'Normal', lat: '55%', lng: '20%' },
];

const STATIONS_ZH = [
  { id: 'ST-001', name: '站点 #1 (柏林)', location: '德国, 柏林', status: 'Normal', lat: '30%', lng: '40%' },
  { id: 'ST-002', name: '站点 #2 (慕尼黑)', location: '德国, 慕尼黑', status: 'Warning', lat: '45%', lng: '55%' },
  { id: 'ST-003', name: '站点 #3 (伦敦)', location: '英国, 伦敦', status: 'Offline', lat: '20%', lng: '30%' },
  { id: 'ST-004', name: '站点 #5 (巴黎)', location: '法国, 巴黎', status: 'Normal', lat: '50%', lng: '60%' },
  { id: 'ST-005', name: '站点 #6 (马德里)', location: '西班牙, 马德里', status: 'Normal', lat: '60%', lng: '45%' },
  { id: 'ST-006', name: '站点 #8 (罗马)', location: '意大利, 罗马', status: 'Normal', lat: '80%', lng: '35%' },
  { id: 'ST-007', name: '站点 #9 (苏黎世)', location: '瑞士, 苏黎世', status: 'Warning', lat: '65%', lng: '25%' },
  { id: 'ST-008', name: '站点 #11 (奥斯陆)', location: '挪威, 奥斯陆', status: 'Normal', lat: '55%', lng: '20%' },
];

interface StationMapProps {
  lang: Language;
  theme: Theme;
}

const StationMap: React.FC<StationMapProps> = ({ lang, theme }) => {
  const t = translations[lang].stationList; // Use StationList translations for consistent header
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const STATIONS = lang === 'zh' ? STATIONS_ZH : STATIONS_EN;

  const filteredStations = STATIONS.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = statusFilter === 'All' || s.status === statusFilter;
      return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full h-[calc(100vh-80px)] p-4 flex flex-col animate-in fade-in duration-300">
        {/* Header copied from StationList */}
        <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-2xl border border-slate-100 dark:border-apple-border-dark shadow-sm mb-4 flex flex-col md:flex-row items-center justify-between gap-4 z-10 relative">
            <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto md:overflow-visible">
                <div className="relative w-full md:w-80 min-w-[200px]">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={t.search} 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all"
                    />
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden md:block"></div>
                <div className="flex items-center gap-2">
                    {['All', 'Normal', 'Warning', 'Offline'].map(status => (
                        <button 
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors whitespace-nowrap
                            ${statusFilter === status 
                                ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 dark:border-white' 
                                : 'bg-white dark:bg-apple-surface-dark text-slate-600 dark:text-slate-400 border-slate-200 dark:border-apple-border-dark hover:border-slate-300 dark:hover:border-white/15'}`}
                        >
                            {status === 'All' ? t.filterAll : (
                                status === 'Normal' ? t.statusNormal : (
                                    status === 'Warning' ? t.statusWarning : t.statusOffline
                                )
                            )}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md shadow-blue-500/20 text-sm font-bold transition-all hover:-translate-y-0.5 whitespace-nowrap">
                    <Plus size={18} /> {t.addStation}
                </button>
            </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 bg-slate-100 dark:bg-apple-bg-dark rounded-2xl border border-slate-200 dark:border-apple-border-dark relative overflow-hidden group shadow-inner">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[#e5e7eb] dark:bg-apple-bg-dark opacity-50">
                 <div className="w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            </div>
            
            {/* Pins */}
            {filteredStations.map(station => (
                <div 
                    key={station.id} 
                    className="absolute cursor-pointer transform hover:scale-110 transition-transform group/pin z-20"
                    style={{ top: station.lat, left: station.lng }}
                >
                    <div className="relative flex flex-col items-center">
                        <div className={`p-2 rounded-full text-white shadow-lg border-2 border-white dark:border-apple-bg-dark 
                            ${station.status === 'Normal' ? 'bg-emerald-500' : (station.status === 'Warning' ? 'bg-amber-500' : 'bg-slate-500')}`}>
                            <MapPin size={24} fill="currentColor" />
                        </div>
                        {/* Hover Card */}
                        <div className="absolute bottom-full mb-3 bg-white dark:bg-apple-surface-dark text-slate-800 dark:text-white text-xs px-4 py-3 rounded-xl shadow-xl border border-slate-100 dark:border-apple-border-dark whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none min-w-[150px]">
                            <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-slate-100 dark:border-apple-border-dark">
                                <span className={`w-2 h-2 rounded-full ${station.status === 'Normal' ? 'bg-emerald-500' : (station.status === 'Warning' ? 'bg-amber-500' : 'bg-slate-500')}`}></span>
                                <span className="font-bold text-sm">{station.name}</span>
                            </div>
                            <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400">
                                <span className="font-medium">{station.location}</span>
                                <span className="font-mono text-[10px] opacity-70">{station.id}</span>
                            </div>
                            <div className="absolute left-1/2 -bottom-1 w-2 h-2 bg-white dark:bg-apple-surface-dark transform -translate-x-1/2 rotate-45 border-r border-b border-slate-100 dark:border-apple-border-dark"></div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Empty State */}
            {filteredStations.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/80 dark:bg-apple-surface-dark/80 backdrop-blur px-6 py-4 rounded-2xl shadow-sm text-slate-500 dark:text-slate-400 text-sm font-medium border border-slate-100 dark:border-apple-border-dark">
                        No stations match your criteria.
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default StationMap;
