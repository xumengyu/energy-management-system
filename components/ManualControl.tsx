
import React, { useState } from 'react';
import { 
    Battery, RotateCw, Play, Square, Power, Settings2, Zap, AlertTriangle, Activity, 
    Droplets, Gauge, ArrowRightCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

interface ManualControlProps {
    lang: Language;
    theme: Theme;
    selectedStation: string;
}

type DeviceType = 'ess' | 'dg';
type DeviceStatus = 'Running' | 'Stopped' | 'Fault';

interface DeviceData {
    id: string;
    name: string;
    type: DeviceType;
    status: DeviceStatus;
    power: number; // kW
    soc?: number; // % for ESS
    fuel?: number; // % for DG
    mode?: 'Charge' | 'Discharge'; // for ESS
}

const ManualControl: React.FC<ManualControlProps> = ({ lang, theme, selectedStation }) => {
    const t = translations[lang].manualControl;
    const [activeTab, setActiveTab] = useState<DeviceType>('ess');

    // Mock Data State
    const [devices, setDevices] = useState<DeviceData[]>([
        { id: 'PCS-01', name: 'PCS #1', type: 'ess', status: 'Running', power: 120, soc: 85, mode: 'Discharge' },
        { id: 'PCS-02', name: 'PCS #2', type: 'ess', status: 'Stopped', power: 0, soc: 42, mode: 'Charge' },
        { id: 'PCS-03', name: 'PCS #3', type: 'ess', status: 'Fault', power: 0, soc: 12, mode: 'Charge' },
        { id: 'DG-01', name: 'Diesel Gen #1', type: 'dg', status: 'Stopped', power: 0, fuel: 88 },
        { id: 'DG-02', name: 'Diesel Gen #2', type: 'dg', status: 'Running', power: 450, fuel: 65 },
    ]);

    const filteredDevices = devices.filter(d => d.type === activeTab);

    const toggleStatus = (id: string) => {
        setDevices(prev => prev.map(d => {
            if (d.id === id) {
                // Toggle between Running and Stopped
                const newStatus = d.status === 'Running' ? 'Stopped' : 'Running';
                return { ...d, status: newStatus, power: newStatus === 'Stopped' ? 0 : 50 }; // Default start power
            }
            return d;
        }));
    };

    const updatePower = (id: string, newPower: string) => {
        const num = parseFloat(newPower);
        if (!isNaN(num)) {
            setDevices(prev => prev.map(d => d.id === id ? { ...d, power: num } : d));
        }
    };

    const toggleMode = (id: string) => {
        setDevices(prev => prev.map(d => {
            if (d.id === id && d.type === 'ess') {
                return { ...d, mode: d.mode === 'Charge' ? 'Discharge' : 'Charge' };
            }
            return d;
        }));
    };

    const getStatusColor = (status: DeviceStatus) => {
        if (status === 'Running') return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/50';
        if (status === 'Fault') return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/50';
        return 'text-slate-500 bg-slate-100 dark:bg-apple-surface-secondary-dark border-slate-200 dark:border-apple-border-dark';
    };

    return (
        <div className="p-4 w-full h-[calc(100vh-80px)] flex flex-col animate-in fade-in duration-300 gap-4">
            
            {/* Header Tabs */}
            <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-apple-border-dark shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setActiveTab('ess')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap
                            ${activeTab === 'ess' 
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' 
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark dark:text-slate-400'}`}
                        >
                            <Battery size={18} className={activeTab === 'ess' ? 'text-white' : 'text-slate-400'} />
                            {t.tabs.ess}
                        </button>
                        <button 
                            onClick={() => setActiveTab('dg')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap
                            ${activeTab === 'dg' 
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' 
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark dark:text-slate-400'}`}
                        >
                            <RotateCw size={18} className={activeTab === 'dg' ? 'text-white' : 'text-slate-400'} />
                            {t.tabs.dg}
                        </button>
                    </div>
                </div>
                
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300">
                    <Settings2 size={14} className="text-slate-400"/>
                    {selectedStation}
                </div>
            </div>

            {/* Devices Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
                    {filteredDevices.map(device => (
                        <div key={device.id} className="bg-white dark:bg-apple-surface-dark rounded-2xl border border-slate-200 dark:border-apple-border-dark shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                            {/* Card Header */}
                            <div className="p-5 border-b border-slate-100 dark:border-apple-border-dark flex justify-between items-start bg-slate-50/30 dark:bg-apple-surface-secondary-dark/30">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${device.type === 'ess' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-600'}`}>
                                        {device.type === 'ess' ? <Battery size={24}/> : <RotateCw size={24}/>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{device.name}</h3>
                                        <p className="text-xs font-mono text-slate-400">{device.id}</p>
                                    </div>
                                </div>
                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(device.status)}`}>
                                    {device.status === 'Running' && <Activity size={14} className="animate-pulse"/>}
                                    {device.status === 'Fault' && <AlertTriangle size={14}/>}
                                    {device.status === 'Stopped' && <Power size={14}/>}
                                    {device.status === 'Running' ? t.running : (device.status === 'Fault' ? t.fault : t.stopped)}
                                </span>
                            </div>

                            {/* Card Content - Metrics */}
                            <div className="p-6 grid grid-cols-2 gap-6">
                                {/* Metric 1: Power */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
                                        <Zap size={14}/> {t.power}
                                    </div>
                                    <div className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                                        {device.power} <span className="text-sm text-slate-400 font-bold">kW</span>
                                    </div>
                                </div>

                                {/* Metric 2: SOC or Fuel */}
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
                                        {device.type === 'ess' ? <Gauge size={14}/> : <Droplets size={14}/>}
                                        {device.type === 'ess' ? t.soc : t.fuel}
                                    </div>
                                    <div className={`text-2xl font-black font-mono ${
                                        (device.soc && device.soc < 20) || (device.fuel && device.fuel < 20) ? 'text-rose-500' : 'text-emerald-500'
                                    }`}>
                                        {device.type === 'ess' ? device.soc : device.fuel} <span className="text-sm text-slate-400 font-bold">%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Control Panel */}
                            <div className="p-6 pt-0 mt-auto">
                                <div className="p-4 bg-slate-50 dark:bg-apple-surface-secondary-dark/50 rounded-xl border border-slate-100 dark:border-apple-border-dark space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.controlPanel}</span>
                                    </div>

                                    {/* ESS Mode Toggle */}
                                    {device.type === 'ess' && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t.chargeDischarge}</span>
                                            <div className="flex bg-white dark:bg-apple-surface-dark p-1 rounded-lg border border-slate-200 dark:border-apple-border-dark">
                                                <button 
                                                    onClick={() => device.mode !== 'Charge' && toggleMode(device.id)}
                                                    disabled={device.status !== 'Running'}
                                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${device.mode === 'Charge' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                                >
                                                    {t.charge}
                                                </button>
                                                <button 
                                                    onClick={() => device.mode !== 'Discharge' && toggleMode(device.id)}
                                                    disabled={device.status !== 'Running'}
                                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${device.mode === 'Discharge' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                                >
                                                    {t.discharge}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Set Power Input */}
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="number"
                                            value={device.power}
                                            disabled={device.status !== 'Running'}
                                            onChange={(e) => updatePower(device.id, e.target.value)}
                                            className="w-full bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-lg px-3 py-2 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <button 
                                            disabled={device.status !== 'Running'}
                                            className="px-4 py-2 bg-slate-200 dark:bg-apple-surface-secondary-dark hover:bg-brand-500 hover:text-white dark:hover:bg-brand-600 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                        >
                                            {t.actions.setPower}
                                        </button>
                                    </div>

                                    {/* Start/Stop Actions */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        {device.status === 'Running' ? (
                                            <button 
                                                onClick={() => toggleStatus(device.id)}
                                                className="col-span-2 py-2.5 bg-white dark:bg-apple-surface-dark border-2 border-rose-100 dark:border-rose-900/30 hover:border-rose-500 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <Square size={16} fill="currentColor" /> {t.actions.stop}
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => toggleStatus(device.id)}
                                                disabled={device.status === 'Fault'}
                                                className="col-span-2 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                            >
                                                <Play size={16} fill="currentColor" /> {t.actions.start}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ManualControl;
