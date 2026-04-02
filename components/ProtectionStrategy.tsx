
import React, { useState, useEffect } from 'react';
import { 
    ShieldAlert, Zap, Battery, ShieldCheck, 
    Save, RotateCcw, Info, RefreshCw,
    CheckCircle2, Layers, ChevronRight, MapPin, Search, Cpu,
    ArrowDownCircle, ArrowUpCircle, AlertTriangle, Copy, Settings,
    Trash2, Plus
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

interface ProtectionStrategyProps {
    lang: Language;
    theme: Theme;
    selectedStation: string;
}

type ProtectionTab = 'antiBackflow' | 'depth';
type MeterType = 'main' | 'virtual' | 'metering';

// New types for Depth Protection
interface DepthRule {
    soc: number;
    vol: number;
    power: number;
}

const ProtectionStrategy: React.FC<ProtectionStrategyProps> = ({ lang, theme, selectedStation }) => {
    const t = translations[lang].protectionStrategy;
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState<ProtectionTab>('antiBackflow');

    // --- State: Anti-Backflow ---
    const [selectedPointId, setSelectedPointId] = useState('PCC-01');
    const protectionPoints = [
        { id: 'PCC-01', name: lang === 'zh' ? '主关口表 (PCC)' : 'Main Meter (PCC)', status: 'Active' },
        { id: 'BUS-01', name: lang === 'zh' ? '工业母线 A' : 'Industrial Bus A', status: 'Active' },
        { id: 'BUS-02', name: lang === 'zh' ? '研发楼负载组' : 'R&D Load Group', status: 'Inactive' }
    ];

    const [antiBackflowConfig, setAntiBackflowConfig] = useState({
        strategyName: 'Global Grid Protection',
        meterType: 'main' as MeterType,
        selectedDevice: '1-1',
        limitEnabled: true,
        limit: 50,
        singlePhaseEnabled: false,
        singlePhasePower: 15
    });

    // --- State: Depth Protection ---
    const [selectedDepthId, setSelectedDepthId] = useState('PCS-01');
    const depthDevices = [
        { id: 'PCS-01', name: lang === 'zh' ? '储能变流器 #1' : 'PCS #1', chargeStatus: true, dischargeStatus: true },
        { id: 'PCS-02', name: lang === 'zh' ? '储能变流器 #2' : 'PCS #2', chargeStatus: true, dischargeStatus: false },
        { id: 'PCS-03', name: lang === 'zh' ? '储能变流器 #3' : 'PCS #3', chargeStatus: false, dischargeStatus: false },
    ];

    const [depthConfig, setDepthConfig] = useState({
        chargeEnabled: true,
        chargeRules: [
            { soc: 95, vol: 3.65, power: 0 },
            { soc: 98, vol: 3.70, power: 0 },
            { soc: 0, vol: 0, power: 0 },
            { soc: 0, vol: 0, power: 0 }
        ] as DepthRule[],
        dischargeEnabled: true,
        dischargeRules: [
            { soc: 10, vol: 2.80, power: 0 },
            { soc: 5, vol: 2.70, power: 0 },
            { soc: 0, vol: 0, power: 0 },
            { soc: 0, vol: 0, power: 0 }
        ] as DepthRule[]
    });

    // Auto-switch device name based on meter type
    useEffect(() => {
        const prefixMap: Record<MeterType, string> = {
            main: '1',
            virtual: '2',
            metering: '3'
        };
        const prefix = prefixMap[antiBackflowConfig.meterType];
        setAntiBackflowConfig(prev => ({ ...prev, selectedDevice: `${prefix}-1` }));
    }, [antiBackflowConfig.meterType]);

    const [isSaving, setIsSaving] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
        }, 1500);
    };

    const handleFetch = () => {
        setIsFetching(true);
        setTimeout(() => {
            setIsFetching(false);
        }, 1500);
    };

    const handleDelete = () => {
        if (confirm(lang === 'zh' ? '确定要删除当前策略配置吗？此操作不可恢复。' : 'Are you sure you want to delete this strategy configuration? This action cannot be undone.')) {
            setIsDeleting(true);
            setTimeout(() => {
                setIsDeleting(false);
                // Logic to clear or reset the configuration would go here
            }, 1500);
        }
    };

    const handleCreateStrategy = () => {
        // Logic to clear form for new strategy
        setAntiBackflowConfig({
            strategyName: lang === 'zh' ? '新策略' : 'New Strategy',
            meterType: 'main',
            selectedDevice: '1-1',
            limitEnabled: true,
            limit: 0,
            singlePhaseEnabled: false,
            singlePhasePower: 0
        });
        // Optionally deselect current point or select a "new" placeholder
    };

    // Helper to update a specific rule row
    const updateDepthRule = (type: 'charge' | 'discharge', index: number, field: keyof DepthRule, value: string) => {
        const numValue = parseFloat(value) || 0;
        setDepthConfig(prev => {
            const key = type === 'charge' ? 'chargeRules' : 'dischargeRules';
            const newRules = [...prev[key]];
            newRules[index] = { ...newRules[index], [field]: numValue };
            return { ...prev, [key]: newRules };
        });
    };

    const renderAntiBackflow = () => (
        <div className="flex flex-col lg:flex-row gap-4 h-full animate-in fade-in duration-300">
            {/* Left: Master List (300px fixed) */}
            <div className="w-full lg:w-80 bg-white dark:bg-apple-surface-dark rounded-2xl border border-slate-200 dark:border-apple-border-dark shadow-sm flex flex-col overflow-hidden shrink-0">
                <div className="p-4 border-b border-slate-100 dark:border-apple-border-dark bg-slate-50/50 dark:bg-apple-surface-secondary-dark/30">
                    <button 
                        onClick={handleFetch}
                        disabled={isFetching}
                        className="w-full py-2.5 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-200 dark:hover:border-brand-800 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        <RefreshCw size={14} className={`text-slate-400 group-hover:text-brand-500 transition-colors ${isFetching ? 'animate-spin text-brand-500' : ''}`} />
                        {lang === 'zh' ? '获取最新边缘策略' : 'Fetch Latest Edge Strategy'}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {protectionPoints.map(point => {
                        const isActive = selectedPointId === point.id;
                        return (
                            <button
                                key={point.id}
                                onClick={() => setSelectedPointId(point.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group
                                ${isActive 
                                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-100 dark:border-brand-900/50' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark border border-transparent'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isActive ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'bg-slate-100 dark:bg-apple-surface-secondary-dark text-slate-400 group-hover:text-slate-600'}`}>
                                        <Zap size={16} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold truncate max-w-[150px]">{point.name}</div>
                                        <div className="text-[10px] font-mono opacity-50 uppercase tracking-wider">{point.id}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {point.status === 'Active' && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    )}
                                    <ChevronRight size={14} className={`transition-transform duration-300 ${isActive ? 'translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right: Detail View (Auto width) */}
            <div className="flex-1 bg-white dark:bg-apple-surface-dark rounded-3xl border border-slate-200 dark:border-apple-border-dark shadow-sm flex flex-col relative overflow-hidden">
                
                {/* Detail Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-apple-border-dark flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            {t.antiBackflow.title}
                            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-apple-surface-secondary-dark px-2 py-0.5 rounded border border-slate-200 dark:border-apple-border-dark">
                                {selectedPointId}
                            </span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">{t.antiBackflow.desc}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
                    <div className="w-full space-y-10">
                        {/* Configuration Content */}
                        <div className="space-y-8 bg-slate-50/50 dark:bg-apple-surface-secondary-dark/20 p-6 rounded-2xl border border-slate-200 dark:border-apple-border-dark">
                            <div className="space-y-4">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest block">{t.antiBackflow.strategyName}</label>
                                <input 
                                    type="text"
                                    value={antiBackflowConfig.strategyName}
                                    onChange={(e) => setAntiBackflowConfig(prev => ({...prev, strategyName: e.target.value}))}
                                    className="w-full bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-100 shadow-sm transition-all"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest block">{t.antiBackflow.meterSelection}</label>
                                <div className="flex bg-slate-200/50 dark:bg-apple-bg-dark p-1.5 rounded-2xl border border-slate-200 dark:border-apple-border-dark w-full md:w-fit">
                                    {[
                                        { id: 'main', label: t.antiBackflow.meterTypes.main },
                                        { id: 'virtual', label: t.antiBackflow.meterTypes.virtual },
                                        { id: 'metering', label: t.antiBackflow.meterTypes.metering }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setAntiBackflowConfig(prev => ({...prev, meterType: type.id as MeterType}))}
                                            className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap
                                            ${antiBackflowConfig.meterType === type.id 
                                                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-apple-border-dark">
                                <label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                    <Cpu size={14} className="text-brand-500" />
                                    {t.antiBackflow.deviceName}
                                </label>
                                <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                                    {['1', '2', '3', '4', '5', '6', '7'].map(num => {
                                        const prefix = antiBackflowConfig.meterType === 'main' ? '1' : (antiBackflowConfig.meterType === 'virtual' ? '2' : '3');
                                        const deviceId = `${prefix}-${num}`;
                                        const isSelected = antiBackflowConfig.selectedDevice === deviceId;
                                        return (
                                            <div
                                                key={deviceId}
                                                className={`py-2.5 rounded-xl border text-sm font-mono font-bold transition-all text-center select-none cursor-default
                                                ${isSelected 
                                                    ? 'bg-brand-500 text-white border-brand-500 shadow-xl shadow-brand-500/20 scale-105 z-10' 
                                                    : 'bg-slate-100/50 dark:bg-apple-surface-dark border-slate-200 dark:border-apple-border-dark text-slate-300 dark:text-slate-600'}`}
                                            >
                                                {deviceId}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400 italic">*{lang === 'zh' ? '设备名称随功率器选择自动呈现，不可编辑' : 'Equipment names switch automatically based on selection and are read-only'}</p>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100 dark:bg-white/10"></div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className={`p-6 rounded-2xl border shadow-sm space-y-6 transition-all duration-300 ${antiBackflowConfig.limitEnabled ? 'bg-white dark:bg-apple-surface-dark border-brand-200 dark:border-brand-900/50 ring-1 ring-brand-100 dark:ring-brand-900/20' : 'bg-slate-50 dark:bg-apple-surface-dark border-slate-200 dark:border-apple-border-dark'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-colors ${antiBackflowConfig.limitEnabled ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600' : 'bg-slate-100 dark:bg-apple-surface-secondary-dark text-slate-400'}`}>
                                            <ShieldCheck size={20} />
                                        </div>
                                        <label className="text-sm font-black text-slate-800 dark:text-slate-200">{t.antiBackflow.pccLimit}</label>
                                    </div>
                                    <button 
                                        onClick={() => setAntiBackflowConfig(prev => ({...prev, limitEnabled: !prev.limitEnabled}))}
                                        className={`w-14 h-7 rounded-full transition-all relative cursor-pointer focus:outline-none ${antiBackflowConfig.limitEnabled ? 'bg-brand-500 shadow-inner' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${antiBackflowConfig.limitEnabled ? 'left-[calc(100%-24px)]' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                
                                <div className={`relative group transition-all duration-300 ${antiBackflowConfig.limitEnabled ? 'opacity-100 translate-y-0' : 'opacity-40 -translate-y-1 pointer-events-none'}`}>
                                    <input 
                                        type="number"
                                        disabled={!antiBackflowConfig.limitEnabled}
                                        value={antiBackflowConfig.limit}
                                        onChange={(e) => setAntiBackflowConfig(prev => ({...prev, limit: Number(e.target.value)}))}
                                        className={`w-full bg-slate-50 dark:bg-apple-surface-secondary-dark border rounded-2xl px-5 py-4 text-2xl font-mono font-bold outline-none transition-all
                                        ${antiBackflowConfig.limitEnabled 
                                            ? 'border-slate-200 dark:border-apple-border-dark text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-100' 
                                            : 'border-transparent text-slate-300 dark:text-slate-600'}`}
                                    />
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">kW</div>
                                </div>
                            </div>

                            <div className={`p-6 rounded-2xl border shadow-sm space-y-6 transition-all duration-300 ${antiBackflowConfig.singlePhaseEnabled ? 'bg-white dark:bg-apple-surface-dark border-brand-200 dark:border-brand-900/50 ring-1 ring-brand-100 dark:ring-brand-900/20' : 'bg-slate-50 dark:bg-apple-surface-dark border-slate-200 dark:border-apple-border-dark'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-colors ${antiBackflowConfig.singlePhaseEnabled ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600' : 'bg-slate-100 dark:bg-apple-surface-secondary-dark text-slate-400'}`}>
                                            <Layers size={20} />
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{t.antiBackflow.singlePhaseEnable}</span>
                                    </div>
                                    <button 
                                        onClick={() => setAntiBackflowConfig(prev => ({...prev, singlePhaseEnabled: !prev.singlePhaseEnabled}))}
                                        className={`w-14 h-7 rounded-full transition-all relative cursor-pointer focus:outline-none ${antiBackflowConfig.singlePhaseEnabled ? 'bg-brand-500 shadow-inner' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${antiBackflowConfig.singlePhaseEnabled ? 'left-[calc(100%-24px)]' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                <div className={`relative transition-all duration-300 ${antiBackflowConfig.singlePhaseEnabled ? 'opacity-100 translate-y-0' : 'opacity-40 -translate-y-1 pointer-events-none'}`}>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{lang === 'zh' ? '单相功率阈值' : 'Single Phase Threshold'}</label>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                disabled={!antiBackflowConfig.singlePhaseEnabled}
                                                value={antiBackflowConfig.singlePhasePower}
                                                onChange={(e) => setAntiBackflowConfig(prev => ({...prev, singlePhasePower: Number(e.target.value)}))}
                                                className={`w-full bg-slate-50 dark:bg-apple-surface-secondary-dark border rounded-xl px-4 py-3 font-mono font-bold outline-none transition-all text-lg
                                                ${antiBackflowConfig.singlePhaseEnabled 
                                                    ? 'border-slate-200 dark:border-apple-border-dark text-slate-800 dark:text-white focus:ring-2 focus:ring-brand-100' 
                                                    : 'border-transparent text-slate-300 dark:text-slate-600'}`}
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase opacity-50">kW</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4 pb-4 items-center">
                             <button 
                                onClick={handleDelete}
                                disabled={isDeleting || isSaving}
                                className="px-6 py-3.5 bg-white dark:bg-apple-surface-dark border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold shadow-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all flex items-center gap-2 disabled:opacity-50 hover:shadow-md"
                            >
                                {isDeleting ? <RefreshCw size={18} className="animate-spin"/> : <Trash2 size={18} />}
                                {t.actions.delete || (lang === 'zh' ? '删除策略' : 'Delete Strategy')}
                            </button>

                             <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-8 py-3.5 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 flex items-center gap-2 hover:bg-brand-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
                            >
                                {isSaving ? (
                                    <CheckCircle2 size={18} className="animate-bounce" />
                                ) : (
                                    <Save size={18} />
                                )}
                                {isSaving ? (lang === 'zh' ? '下发中...' : 'Deploying...') : t.actions.saveAndDeploy}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- Render Depth Protection with Split Layout ---
    const renderDepth = () => (
        <div className="flex flex-col lg:flex-row gap-4 h-full animate-in fade-in duration-300">
            {/* Left: Device List */}
            <div className="w-full lg:w-80 bg-white dark:bg-apple-surface-dark rounded-2xl border border-slate-200 dark:border-apple-border-dark shadow-sm flex flex-col overflow-hidden shrink-0">
                <div className="p-4 border-b border-slate-100 dark:border-apple-border-dark bg-slate-50/50 dark:bg-apple-surface-secondary-dark/30">
                    <button 
                        onClick={handleFetch}
                        disabled={isFetching}
                        className="w-full py-2.5 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-200 dark:hover:border-brand-800 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        <RefreshCw size={14} className={`text-slate-400 group-hover:text-brand-500 transition-colors ${isFetching ? 'animate-spin text-brand-500' : ''}`} />
                        {lang === 'zh' ? '获取最新边缘策略' : 'Fetch Latest Edge Strategy'}
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {depthDevices.map(device => {
                        const isActive = selectedDepthId === device.id;
                        return (
                            <button
                                key={device.id}
                                onClick={() => setSelectedDepthId(device.id)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group
                                ${isActive 
                                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-100 dark:border-brand-900/50' 
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark border border-transparent'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isActive ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'bg-slate-100 dark:bg-apple-surface-secondary-dark text-slate-400 group-hover:text-slate-600'}`}>
                                        <Cpu size={16} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold truncate max-w-[150px]">{device.name}</div>
                                        <div className="text-[10px] font-mono opacity-50 uppercase tracking-wider">{device.id}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                        <ArrowDownCircle size={18} className={device.chargeStatus ? 'text-emerald-500' : 'text-slate-300'} />
                                        <ArrowUpCircle size={18} className={device.dischargeStatus ? 'text-blue-500' : 'text-slate-300'} />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right: Configuration Details */}
            <div className="flex-1 bg-white dark:bg-apple-surface-dark rounded-3xl border border-slate-200 dark:border-apple-border-dark shadow-sm flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-apple-border-dark flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            {t.depth.title}
                            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-apple-surface-secondary-dark px-2 py-0.5 rounded border border-slate-200 dark:border-apple-border-dark">
                                {selectedDepthId}
                            </span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">{t.depth.desc}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
                    <div className="w-full space-y-8">
                        {/* Protection Sections Grid Wrapper */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            
                            {/* Charge Protection Section */}
                            <div className={`p-6 rounded-2xl border shadow-sm transition-all duration-300 ${depthConfig.chargeEnabled ? 'bg-white dark:bg-apple-surface-dark border-emerald-200 dark:border-emerald-900/50 ring-1 ring-emerald-100 dark:ring-emerald-900/20' : 'bg-slate-50 dark:bg-apple-surface-dark border-slate-200 dark:border-apple-border-dark'}`}>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-colors ${depthConfig.chargeEnabled ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-100 dark:bg-apple-surface-secondary-dark text-slate-400'}`}>
                                            <ArrowDownCircle size={20} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-black text-slate-800 dark:text-slate-200 block">{lang === 'zh' ? '充电深度保护' : 'Charge Depth Protection'}</label>
                                            <span className="text-[10px] text-slate-400">{lang === 'zh' ? '设置0为禁用/不处理' : 'Set to 0 to disable/ignore'}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setDepthConfig(prev => ({...prev, chargeEnabled: !prev.chargeEnabled}))}
                                        className={`w-14 h-7 rounded-full transition-all relative cursor-pointer focus:outline-none ${depthConfig.chargeEnabled ? 'bg-emerald-500 shadow-inner' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${depthConfig.chargeEnabled ? 'left-[calc(100%-24px)]' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                <div className={`grid grid-cols-3 gap-4 transition-all duration-300 ${depthConfig.chargeEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">SOC (%)</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{lang === 'zh' ? '单体电压 (V)' : 'Cell Volt (V)'}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{lang === 'zh' ? '输出功率 (%)' : 'Output Power (%)'}</div>

                                    {depthConfig.chargeRules.map((rule, idx) => (
                                        <React.Fragment key={`charge-${idx}`}>
                                            <input 
                                                type="number" 
                                                value={rule.soc} 
                                                onChange={(e) => updateDepthRule('charge', idx, 'soc', e.target.value)}
                                                className="bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                            />
                                            <input 
                                                type="number" step="0.01"
                                                value={rule.vol} 
                                                onChange={(e) => updateDepthRule('charge', idx, 'vol', e.target.value)}
                                                className="bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                            />
                                            <input 
                                                type="number" 
                                                value={rule.power} 
                                                onChange={(e) => updateDepthRule('charge', idx, 'power', e.target.value)}
                                                className="bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-900"
                                            />
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* Discharge Protection Section */}
                            <div className={`p-6 rounded-2xl border shadow-sm space-y-6 transition-all duration-300 ${depthConfig.dischargeEnabled ? 'bg-white dark:bg-apple-surface-dark border-blue-200 dark:border-blue-900/50 ring-1 ring-blue-100 dark:ring-blue-900/20' : 'bg-slate-50 dark:bg-apple-surface-dark border-slate-200 dark:border-apple-border-dark'}`}>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl transition-colors ${depthConfig.dischargeEnabled ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-100 dark:bg-apple-surface-secondary-dark text-slate-400'}`}>
                                            <ArrowUpCircle size={20} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-black text-slate-800 dark:text-slate-200 block">{lang === 'zh' ? '放电深度保护' : 'Discharge Depth Protection'}</label>
                                            <span className="text-[10px] text-slate-400">{lang === 'zh' ? '设置0为禁用/不处理' : 'Set to 0 to disable/ignore'}</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setDepthConfig(prev => ({...prev, dischargeEnabled: !prev.dischargeEnabled}))}
                                        className={`w-14 h-7 rounded-full transition-all relative cursor-pointer focus:outline-none ${depthConfig.dischargeEnabled ? 'bg-blue-500 shadow-inner' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${depthConfig.dischargeEnabled ? 'left-[calc(100%-24px)]' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                <div className={`grid grid-cols-3 gap-4 transition-all duration-300 ${depthConfig.dischargeEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">SOC (%)</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{lang === 'zh' ? '单体电压 (V)' : 'Cell Volt (V)'}</div>
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{lang === 'zh' ? '输出功率 (%)' : 'Output Power (%)'}</div>

                                    {depthConfig.dischargeRules.map((rule, idx) => (
                                        <React.Fragment key={`discharge-${idx}`}>
                                            <input 
                                                type="number" 
                                                value={rule.soc} 
                                                onChange={(e) => updateDepthRule('discharge', idx, 'soc', e.target.value)}
                                                className="bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                                            />
                                            <input 
                                                type="number" step="0.01"
                                                value={rule.vol} 
                                                onChange={(e) => updateDepthRule('discharge', idx, 'vol', e.target.value)}
                                                className="bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                                            />
                                            <input 
                                                type="number" 
                                                value={rule.power} 
                                                onChange={(e) => updateDepthRule('discharge', idx, 'power', e.target.value)}
                                                className="bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                                            />
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end pt-4 gap-3">
                             <button 
                                className="px-6 py-3.5 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark transition-all flex items-center gap-2"
                            >
                                <Copy size={18} />
                                {lang === 'zh' ? '以此策略批量下发全部设备' : 'Batch Deploy to All Devices'}
                            </button>
                             <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-8 py-3.5 bg-brand-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 flex items-center gap-2 hover:bg-brand-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
                            >
                                {isSaving ? (
                                    <CheckCircle2 size={18} className="animate-bounce" />
                                ) : (
                                    <Save size={18} />
                                )}
                                {isSaving ? (lang === 'zh' ? '下发中...' : 'Deploying...') : t.actions.saveAndDeploy}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-4 w-full h-[calc(100vh-72px)] flex flex-col animate-in fade-in duration-300 gap-4">
            {/* Horizontal Header */}
            <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-apple-border-dark shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-6 w-full md:w-auto overflow-x-auto">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setActiveTab('antiBackflow')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap
                            ${activeTab === 'antiBackflow' 
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' 
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark dark:text-slate-400'}`}
                        >
                            <ShieldAlert size={18} className={activeTab === 'antiBackflow' ? 'text-white' : 'text-slate-400'} />
                            {t.tabs.antiBackflow}
                        </button>
                        <button 
                            onClick={() => setActiveTab('depth')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap
                            ${activeTab === 'depth' 
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' 
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark dark:text-slate-400'}`}
                        >
                            <Battery size={18} className={activeTab === 'depth' ? 'text-white' : 'text-slate-400'} />
                            {t.tabs.depth}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                     {activeTab === 'antiBackflow' ? (
                        <button 
                            onClick={handleCreateStrategy}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white border border-brand-600 hover:border-brand-700 rounded-xl text-sm font-bold transition-all shadow-md shadow-brand-500/20 hover:-translate-y-0.5"
                        >
                            <Plus size={16} />
                            {lang === 'zh' ? '创建策略' : 'Create Strategy'}
                        </button>
                     ) : (
                         <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300">
                            <Settings size={14} className="text-slate-400"/>
                            {selectedStation}
                         </div>
                     )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0">
                {activeTab === 'antiBackflow' ? renderAntiBackflow() : renderDepth()}
            </div>
        </div>
    );
};

export default ProtectionStrategy;
