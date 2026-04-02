
import React, { useState } from 'react';
import { 
    Battery, RotateCw, Play, Square, AlertTriangle, Activity, 
    RefreshCw, Clock, BatteryLow
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

const ManualControl: React.FC<ManualControlProps> = ({ lang, theme: _theme }) => {
    const t = translations[lang].manualControl;
    const [activeTab, setActiveTab] = useState<DeviceType>('ess');

    const [devices, setDevices] = useState<DeviceData[]>([
        { id: 'PCS-01', name: 'PCS #1', type: 'ess', status: 'Running', power: 120, soc: 85, mode: 'Discharge' },
        { id: 'PCS-02', name: 'PCS #2', type: 'ess', status: 'Stopped', power: 0, soc: 42, mode: 'Charge' },
        { id: 'PCS-03', name: 'PCS #3', type: 'ess', status: 'Fault', power: 0, soc: 12, mode: 'Charge' },
        { id: 'DG-01', name: 'Diesel Gen #1', type: 'dg', status: 'Stopped', power: 0, fuel: 88 },
        { id: 'DG-02', name: 'Diesel Gen #2', type: 'dg', status: 'Running', power: 450, fuel: 65 },
    ]);

    const visibleDevices = devices.filter((d) => d.type === activeTab);

    const toggleStatus = (id: string) => {
        setDevices(prev => prev.map(d => {
            if (d.id === id) {
                const newStatus = d.status === 'Running' ? 'Stopped' : 'Running';
                return { ...d, status: newStatus, power: newStatus === 'Stopped' ? 0 : 50 };
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

    const statusBadge = (status: DeviceStatus) => {
        if (status === 'Running') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <Activity size={12} className="animate-pulse shrink-0" />
                    {t.running}
                </span>
            );
        }
        if (status === 'Fault') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                    <AlertTriangle size={12} className="shrink-0" />
                    {t.fault}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-apple-surface-secondary-dark text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-apple-border-dark">
                <Clock size={12} className="shrink-0" />
                {t.stopped}
            </span>
        );
    };

    const rowHover = 'hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark/60';

    return (
        <div className="ems-page-shell">
            {/* 顶栏：与实时总览 StationRealtime 同款 */}
            <div className="ems-card mb-4 flex flex-col items-center justify-between gap-4 p-4 md:flex-row">
                <div className="custom-scrollbar-hide flex w-full items-center gap-6 overflow-x-auto md:w-auto">
                    <div className="ems-segmented shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveTab('ess')}
                            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-all
                            ${activeTab === 'ess'
                                ? 'bg-white text-blue-600 shadow-sm dark:bg-apple-surface-dark dark:text-blue-400'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            <Battery size={16} />
                            {t.tabs.ess}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('dg')}
                            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-all
                            ${activeTab === 'dg'
                                ? 'bg-white text-blue-600 shadow-sm dark:bg-apple-surface-dark dark:text-blue-400'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            <RotateCw size={16} />
                            {t.tabs.dg}
                        </button>
                    </div>
                </div>

                <div className="flex w-full items-center justify-end gap-3 md:w-auto">
                    <button
                        type="button"
                        className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                        title={t.refresh}
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            <div className="min-h-0 space-y-4">
                <div className="ems-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-4">{t.device}</th>
                                    <th className="px-6 py-4">{t.power}</th>
                                    <th className="px-6 py-4">{activeTab === 'ess' ? t.soc : t.fuel}</th>
                                    {activeTab === 'ess' && <th className="px-6 py-4">{t.colMode}</th>}
                                    <th className="px-6 py-4">{t.status}</th>
                                    <th className="px-6 py-4 text-right">{t.colActions}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                                {visibleDevices.map((device) => (
                                    <tr
                                        key={device.id}
                                        className={`group transition-colors ${rowHover}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 dark:text-slate-200">
                                                {device.name}
                                            </div>
                                            <div className="mt-0.5 font-mono text-xs text-slate-400">{device.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="mb-2 font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {device.power} <span className="text-slate-400">kW</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={device.power}
                                                    disabled={device.status !== 'Running'}
                                                    onChange={(e) => updatePower(device.id, e.target.value)}
                                                    className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-white dark:focus:ring-brand-900"
                                                />
                                                <button
                                                    type="button"
                                                    disabled={device.status !== 'Running'}
                                                    className="rounded-lg bg-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-brand-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-apple-surface-secondary-dark dark:text-slate-300 dark:hover:bg-brand-600"
                                                >
                                                    {t.actions.setPower}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`font-mono text-sm font-bold ${
                                                    (device.soc != null && device.soc < 20) || (device.fuel != null && device.fuel < 20)
                                                        ? 'text-rose-500'
                                                        : 'text-emerald-500'
                                                }`}
                                            >
                                                {device.type === 'ess' ? device.soc : device.fuel}
                                                <span className="text-slate-400"> %</span>
                                            </span>
                                        </td>
                                        {activeTab === 'ess' && (
                                            <td className="px-6 py-4">
                                                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-apple-border-dark dark:bg-apple-surface-dark">
                                                    <button
                                                        type="button"
                                                        onClick={() => device.mode !== 'Charge' && toggleMode(device.id)}
                                                        disabled={device.status !== 'Running'}
                                                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                                                            device.mode === 'Charge'
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                                        } disabled:opacity-50`}
                                                    >
                                                        {t.charge}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => device.mode !== 'Discharge' && toggleMode(device.id)}
                                                        disabled={device.status !== 'Running'}
                                                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                                                            device.mode === 'Discharge'
                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                                        } disabled:opacity-50`}
                                                    >
                                                        {t.discharge}
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">{statusBadge(device.status)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end">
                                                {device.status === 'Running' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleStatus(device.id)}
                                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-rose-100 bg-white px-3 py-2 text-xs font-bold text-rose-600 transition-colors hover:border-rose-500 hover:bg-rose-50 dark:border-rose-900/30 dark:bg-apple-surface-dark dark:text-rose-400 dark:hover:border-rose-500 dark:hover:bg-rose-900/20"
                                                    >
                                                        <Square size={14} fill="currentColor" /> {t.actions.stop}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleStatus(device.id)}
                                                        disabled={device.status === 'Fault'}
                                                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Play size={14} fill="currentColor" /> {t.actions.start}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {visibleDevices.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-apple-surface-secondary-dark">
                                <BatteryLow className="text-slate-300 dark:text-slate-500" size={32} />
                            </div>
                            <p className="font-medium text-slate-500 dark:text-slate-400">{t.emptyList}</p>
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t.emptyHint}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManualControl;
