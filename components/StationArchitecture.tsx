
import React, { useState, useRef, useEffect } from 'react';
import { Language, Theme } from '../types';
import { 
    Zap, Sun, Battery, Network, Cloud, Car, Droplets, Gauge,
    CheckCircle2, AlertTriangle, XCircle,
    Plus, Minus, RefreshCw, Save, Maximize, Minimize,
    Server, Laptop, Globe, Share2,
    ArrowUp, ArrowDown, Thermometer, X, PanelRight
} from 'lucide-react';
import { translations } from '../translations';

interface StationArchitectureProps {
  lang: Language;
  theme: Theme;
  selectedStation: string;
}

type ArchView = 'power' | 'overview';

// --- Specific Data for Station #2 (EN) ---
const STATION_DATA_EN = {
    grid: { name: 'Grid 10kV', voltage: '10.5 kV' },
    acMeter: { name: 'PCC Meter', ac: { p: '450 kW', i: '25.6 A', v: '398.5 V' } },
    dg: { 
        name: 'Diesel Gen #1', freq: '50.02 Hz', level: '85%', temp: '68°C',
        ac: { p: '0 kW', i: '0 A', v: '0 V' } // Standby
    },
    acPv: {
        name: 'Rooftop PV Inv', rated: '100 kW',
        ac: { p: '85.2 kW', i: '128.4 A', v: '399.1 V' }
    },
    evse: {
        name: 'DC Charger #01', 
        ac: { p: '120.5 kW', i: '182.1 A', v: '397.8 V' },
        internal: { input: '120.1 kW', output: '115.8 kW' }
    },
    car: { name: 'BYD Tang EV', soc: '34%', demand: '120 kW' },
    pcs: {
        name: 'PCS #1',
        ac: { p: '-50.2 kW', i: '76/77/78 A', v: '228/224/226 V' }, // Discharging to Grid, 3-phase data
        dc: { p: '52.1 kW', i: '68.5 A', v: '760.5 V' },
        status: { mode: 'PQ', state: 'Discharge', health: 'Normal' }
    },
    dcMeter: { name: 'DC Meter', dc: { p: '52.0 kW', i: '68.4 A', v: '760.4 V' } },
    /** PCS #2–#6 共用的并网支路表（母线 → 本表 → 汇流排 → 五路 PCS） */
    essPairAcMeter: {
        name: 'ESS #2/#3 Branch Meter',
        ac: { p: '248.2 kW', i: '412/410/415 A', v: '229/228/229 V' },
    },
    battery: {
        name: '#1', soc: '78.5%', soh: '99.1%',
        vmax: '3.45 V', vmin: '3.12 V', tmax: '32°C', tmin: '24°C',
        status: 0 // 0: Normal, 1: Hint, 2: Warn, 3: Fault
    },
    dcPv: {
        name: 'Carport PV',
        hv: { p: '25.4 kW', i: '35.2 A', v: '720.5 V' },
        panels: [
            { id: 'PV1', p: '6.2kW', i: '8.8A', v: '704V' },
            { id: 'PV2', p: '6.4kW', i: '9.1A', v: '703V' },
            { id: 'PV3', p: '6.3kW', i: '8.9A', v: '708V' },
            { id: 'PV4', p: '6.5kW', i: '9.2A', v: '706V' },
        ]
    },
    // New Devices
    ess2: {
        pcs: { 
            name: 'PCS #2', 
            ac: { p: '100.5 kW', i: '145/146/144 A', v: '229/228/229 V' }, 
            dc: { p: '102.3 kW', i: '135.1 A', v: '758.2 V' },
            status: { mode: 'PQ', state: 'Charge', health: 'Normal' } 
        },
        bat: { 
            name: '#2', soc: '45.2%', soh: '99.5%', status: 0,
            vmax: '3.41 V', vmin: '3.18 V', tmax: '30°C', tmin: '22°C'
        }
    },
    ess3: {
        pcs: { 
            name: 'PCS #3', 
            ac: { p: '0.0 kW', i: '0/0/0 A', v: '230/230/230 V' }, 
            dc: { p: '0.0 kW', i: '0.0 A', v: '762.1 V' },
            status: { mode: 'VSG', state: 'Standby', health: 'Normal' } 
        },
        bat: { 
            name: '#3', soc: '92.1%', soh: '98.8%', status: 0,
            vmax: '3.55 V', vmin: '3.32 V', tmax: '34°C', tmin: '26°C'
        }
    },
    ess4: {
        pcs: {
            name: 'PCS #4',
            ac: { p: '48.5 kW', i: '72/71/73 A', v: '228/229/228 V' },
            dc: { p: '49.8 kW', i: '65.8 A', v: '757.5 V' },
            status: { mode: 'PQ', state: 'Charge', health: 'Normal' },
        },
        bat: {
            name: '#4', soc: '62.0%', soh: '99.2%', status: 0,
            vmax: '3.40 V', vmin: '3.20 V', tmax: '31°C', tmin: '23°C',
        },
    },
    ess5: {
        pcs: {
            name: 'PCS #5',
            ac: { p: '52.0 kW', i: '76/75/77 A', v: '229/228/230 V' },
            dc: { p: '53.4 kW', i: '70.2 A', v: '758.8 V' },
            status: { mode: 'PQ', state: 'Discharge', health: 'Normal' },
        },
        bat: {
            name: '#5', soc: '55.8%', soh: '99.0%', status: 0,
            vmax: '3.42 V', vmin: '3.15 V', tmax: '29°C', tmin: '21°C',
        },
    },
    ess6: {
        pcs: {
            name: 'PCS #6',
            ac: { p: '47.2 kW', i: '70/69/71 A', v: '228/228/229 V' },
            dc: { p: '48.5 kW', i: '64.1 A', v: '756.2 V' },
            status: { mode: 'VSG', state: 'Standby', health: 'Normal' },
        },
        bat: {
            name: '#6', soc: '71.3%', soh: '98.9%', status: 1,
            vmax: '3.48 V', vmin: '3.22 V', tmax: '33°C', tmin: '25°C',
        },
    },
};

// --- Specific Data for Station #2 (ZH) ---
const STATION_DATA_ZH = {
    grid: { name: '市电接入 10kV', voltage: '10.5 kV' },
    acMeter: { name: '关口表 PCC', ac: { p: '450 kW', i: '25.6 A', v: '398.5 V' } },
    dg: { 
        name: '柴油发电机 #1', freq: '50.02 Hz', level: '85%', temp: '68°C',
        ac: { p: '0 kW', i: '0 A', v: '0 V' } // Standby
    },
    acPv: {
        name: '屋顶光伏逆变器', rated: '100 kW',
        ac: { p: '85.2 kW', i: '128.4 A', v: '399.1 V' }
    },
    evse: {
        name: '直流快充桩 #01', 
        ac: { p: '120.5 kW', i: '182.1 A', v: '397.8 V' },
        internal: { input: '120.1 kW', output: '115.8 kW' }
    },
    car: { name: '比亚迪 Tang EV', soc: '34%', demand: '120 kW' },
    pcs: {
        name: 'PCS 储能变流器 #1',
        ac: { p: '-50.2 kW', i: '76/77/78 A', v: '228/224/226 V' }, // Discharging to Grid, 3-phase data
        dc: { p: '52.1 kW', i: '68.5 A', v: '760.5 V' },
        status: { mode: 'PQ', state: 'Discharge', health: 'Normal' }
    },
    dcMeter: { name: '直流总表', dc: { p: '52.0 kW', i: '68.4 A', v: '760.4 V' } },
    /** PCS #2–#6 经本支路表汇总并网 */
    essPairAcMeter: {
        name: '储能 #2/#3 支路表',
        ac: { p: '248.2 kW', i: '412/410/415 A', v: '229/228/229 V' },
    },
    battery: {
        name: '#1', soc: '78.5%', soh: '99.1%',
        vmax: '3.45 V', vmin: '3.12 V', tmax: '32°C', tmin: '24°C',
        status: 0 // 0: Normal, 1: Hint, 2: Warn, 3: Fault
    },
    dcPv: {
        name: '车棚光伏',
        hv: { p: '25.4 kW', i: '35.2 A', v: '720.5 V' },
        panels: [
            { id: 'PV1', p: '6.2kW', i: '8.8A', v: '704V' },
            { id: 'PV2', p: '6.4kW', i: '9.1A', v: '703V' },
            { id: 'PV3', p: '6.3kW', i: '8.9A', v: '708V' },
            { id: 'PV4', p: '6.5kW', i: '9.2A', v: '706V' },
        ]
    },
    // New Devices
    ess2: {
        pcs: { 
            name: 'PCS 储能变流器 #2', 
            ac: { p: '100.5 kW', i: '145/146/144 A', v: '229/228/229 V' }, 
            dc: { p: '102.3 kW', i: '135.1 A', v: '758.2 V' },
            status: { mode: 'PQ', state: 'Charge', health: 'Normal' } 
        },
        bat: { 
            name: '#2', soc: '45.2%', soh: '99.5%', status: 0,
            vmax: '3.41 V', vmin: '3.18 V', tmax: '30°C', tmin: '22°C'
        }
    },
    ess3: {
        pcs: { 
            name: 'PCS 储能变流器 #3', 
            ac: { p: '0.0 kW', i: '0/0/0 A', v: '230/230/230 V' }, 
            dc: { p: '0.0 kW', i: '0.0 A', v: '762.1 V' },
            status: { mode: 'VSG', state: 'Standby', health: 'Normal' } 
        },
        bat: { 
            name: '#3', soc: '92.1%', soh: '98.8%', status: 0,
            vmax: '3.55 V', vmin: '3.32 V', tmax: '34°C', tmin: '26°C'
        }
    },
    ess4: {
        pcs: {
            name: 'PCS 储能变流器 #4',
            ac: { p: '48.5 kW', i: '72/71/73 A', v: '228/229/228 V' },
            dc: { p: '49.8 kW', i: '65.8 A', v: '757.5 V' },
            status: { mode: 'PQ', state: 'Charge', health: 'Normal' },
        },
        bat: {
            name: '#4', soc: '62.0%', soh: '99.2%', status: 0,
            vmax: '3.40 V', vmin: '3.20 V', tmax: '31°C', tmin: '23°C',
        },
    },
    ess5: {
        pcs: {
            name: 'PCS 储能变流器 #5',
            ac: { p: '52.0 kW', i: '76/75/77 A', v: '229/228/230 V' },
            dc: { p: '53.4 kW', i: '70.2 A', v: '758.8 V' },
            status: { mode: 'PQ', state: 'Discharge', health: 'Normal' },
        },
        bat: {
            name: '#5', soc: '55.8%', soh: '99.0%', status: 0,
            vmax: '3.42 V', vmin: '3.15 V', tmax: '29°C', tmin: '21°C',
        },
    },
    ess6: {
        pcs: {
            name: 'PCS 储能变流器 #6',
            ac: { p: '47.2 kW', i: '70/69/71 A', v: '228/228/229 V' },
            dc: { p: '48.5 kW', i: '64.1 A', v: '756.2 V' },
            status: { mode: 'VSG', state: 'Standby', health: 'Normal' },
        },
        bat: {
            name: '#6', soc: '71.3%', soh: '98.9%', status: 1,
            vmax: '3.48 V', vmin: '3.22 V', tmax: '33°C', tmin: '25°C',
        },
    },
};

// --- Architecture diagram theme：暗色下主色统一为项目 brand（与全局按钮/强调色一致）---

const getArchTheme = (isDark: boolean) => ({
    isDark,
    /** 与页面 dark:bg-apple-bg-dark 同色，避免单独 #000 画布；内联 var 兜底防未打包 class */
    canvas: isDark
        ? 'bg-apple-bg-dark border-transparent shadow-none'
        : 'bg-slate-100/90 border-slate-200 shadow-sm',
    gridDot: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.35)',
    strokeAC: isDark ? 'var(--color-brand-400)' : 'var(--color-brand-600)',
    strokeDC: isDark ? 'var(--color-brand-400)' : 'var(--color-brand-600)',
    strokeBusH: isDark ? 'var(--color-brand-400)' : 'var(--color-brand-600)',
    strokeComm: isDark ? 'var(--color-brand-500)' : 'var(--color-brand-500)',
    ringTrack: isDark ? '#3f3f46' : '#e2e8f0',
    ringLow: '#fb923c',
    ringHigh: isDark ? 'var(--color-brand-400)' : 'var(--color-brand-600)',
    cardShell: isDark
        ? 'bg-zinc-900/95 border-zinc-700/90'
        : 'bg-white border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.06)]',
    cardHeader: isDark ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-900',
    textMain: isDark ? 'text-white' : 'text-slate-900',
    textSub: isDark ? 'text-zinc-400' : 'text-slate-500',
    pillSolid: isDark ? 'bg-brand-600 text-white border-brand-400' : 'bg-brand-600 text-white border-brand-500',
    pcsOutline: isDark ? 'border-brand-400 bg-black/40 text-brand-400' : 'border-brand-600 bg-white text-brand-700',
});

type ArchDetailId =
    | 'grid'
    | 'acMeter'
    | 'essPairMeter'
    | 'dg'
    | 'acPv'
    | 'evse'
    | 'pcs1'
    | 'pcs2'
    | 'pcs3'
    | 'pcs4'
    | 'pcs5'
    | 'pcs6'
    | 'car'
    | 'bess1'
    | 'bess2'
    | 'bess3'
    | 'bess4'
    | 'bess5'
    | 'bess6'
    | 'dcPv'
    | 'ov-cloud'
    | 'ov-edge'
    | 'ov-grid'
    | 'ov-rooftop-pv'
    | 'ov-diesel'
    | 'ov-bess-1'
    | 'ov-bess-2'
    | 'ov-bess-3'
    | 'ov-evse'
    | 'ov-building';

const ArchDetailButton = ({
    label,
    onOpen,
    isDark,
    size = 'default',
}: {
    label: string;
    onOpen: () => void;
    isDark: boolean;
    /** compact：拓扑小块（如 PCC 表计）用更小 padding/字号 */
    size?: 'default' | 'compact';
}) => (
    <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
            e.stopPropagation();
            onOpen();
        }}
        className={`shrink-0 font-bold transition-colors ${
            size === 'compact' ? 'rounded px-1.5 py-px text-[9px]' : 'rounded-md px-2 py-0.5 text-[10px]'
        } ${
            isDark
                ? 'bg-brand-500/25 text-brand-300 hover:bg-brand-500/40'
                : 'bg-brand-600/10 text-brand-700 hover:bg-brand-600/15'
        }`}
    >
        {label}
    </button>
);

const DrawerRow = ({ label, value }: { label: string; value: React.ReactNode }) => {
    const isStatusLabel = label === 'State' || label === 'Status' || label === '状态';
    const valueIsString = typeof value === 'string';

    return (
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 text-sm dark:border-white/10">
            <span className="shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
            {isStatusLabel && valueIsString ? (
                <span className="rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-right text-xs font-bold text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {value}
                </span>
            ) : (
                <span className="break-all text-right font-mono font-semibold text-slate-900 dark:text-slate-100">{value}</span>
            )}
        </div>
    );
};

const PcsStatusChip = ({ value, isDark }: { value: string; isDark: boolean }) => {
    const v = value.toLowerCase();
    const good = ['normal', 'online', 'remote', 'grid-tied', '并网', '正常', '远程', '0'].some((k) => v.includes(k));
    const warn = ['standby', 'island', '离网', '待机', 'open', '1', '2', '3', '4'].some((k) => v.includes(k));
    const bad = ['fault', 'alarm', 'offline', '故障', '告警'].some((k) => v.includes(k));
    const cls = bad
        ? isDark
            ? 'bg-red-500/15 text-red-300 ring-red-500/30'
            : 'bg-red-50 text-red-700 ring-red-200'
        : warn
          ? isDark
              ? 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
              : 'bg-amber-50 text-amber-700 ring-amber-200'
          : good
            ? isDark
                ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : isDark
              ? 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30'
              : 'bg-slate-100 text-slate-700 ring-slate-200';
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${cls}`}>{value}</span>;
};

const PcsSectionTitle = ({ children, isDark }: { children: React.ReactNode; isDark: boolean }) => (
    <h3 className={`mb-3 mt-1 text-xs font-black uppercase tracking-[0.18em] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{children}</h3>
);

const PcsStatusRow = ({ label, value, isDark }: { label: string; value: React.ReactNode; isDark: boolean }) => (
    <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-slate-200 bg-white'}`}>
        <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{label}</span>
        {value}
    </div>
);

const PcsKpiCard = ({ label, value, unit, isDark }: { label: string; value: React.ReactNode; unit?: string; isDark: boolean }) => (
    <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-slate-200 bg-white'}`}>
        <div className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{label}</div>
        <div className="mt-1.5 flex items-end gap-1">
            <span className={`font-mono text-[22px] font-black ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>{value}</span>
            {unit ? <span className={`pb-0.5 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{unit}</span> : null}
        </div>
    </div>
);

const PcsDataRow = ({ label, value, unit, isDark }: { label: string; value: React.ReactNode; unit?: string; isDark: boolean }) => (
    <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${isDark ? 'border-zinc-800 bg-zinc-950/80' : 'border-slate-200 bg-white'}`}>
        <span className={`text-sm ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{label}</span>
        <span className={`flex items-end gap-1 font-mono text-[22px] font-black ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
            {value}
            {unit ? <span className={`pb-0.5 text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{unit}</span> : null}
        </span>
    </div>
);

function archDetailTitle(id: ArchDetailId, stationData: any, lang: Language): string {
    const L = (en: string, zh: string) => (lang === 'zh' ? zh : en);
    switch (id) {
        case 'grid':
            return stationData.grid.name;
        case 'acMeter':
            return stationData.acMeter.name;
        case 'essPairMeter':
            return stationData.essPairAcMeter.name;
        case 'dg':
            return stationData.dg.name;
        case 'acPv':
            return stationData.acPv.name;
        case 'evse':
            return stationData.evse.name;
        case 'pcs1':
            return stationData.pcs.name;
        case 'pcs2':
            return stationData.ess2.pcs.name;
        case 'pcs3':
            return stationData.ess3.pcs.name;
        case 'pcs4':
            return stationData.ess4.pcs.name;
        case 'pcs5':
            return stationData.ess5.pcs.name;
        case 'pcs6':
            return stationData.ess6.pcs.name;
        case 'car':
            return stationData.car.name;
        case 'bess1':
            return L(`BESS ${stationData.battery.name}`, `${stationData.battery.name} 电池簇`);
        case 'bess2':
            return L(`BESS ${stationData.ess2.bat.name}`, `${stationData.ess2.bat.name} 电池簇`);
        case 'bess3':
            return L(`BESS ${stationData.ess3.bat.name}`, `${stationData.ess3.bat.name} 电池簇`);
        case 'bess4':
            return L(`BESS ${stationData.ess4.bat.name}`, `${stationData.ess4.bat.name} 电池簇`);
        case 'bess5':
            return L(`BESS ${stationData.ess5.bat.name}`, `${stationData.ess5.bat.name} 电池簇`);
        case 'bess6':
            return L(`BESS ${stationData.ess6.bat.name}`, `${stationData.ess6.bat.name} 电池簇`);
        case 'dcPv':
            return stationData.dcPv.name;
        case 'ov-cloud':
            return 'EcoWatt Cloud EMS';
        case 'ov-edge':
            return L('EMS Edge Gateway #2', 'EMS 边缘网关 #2');
        case 'ov-grid':
            return L('Grid interface', '电网侧');
        case 'ov-rooftop-pv':
            return L('Rooftop PV System', '屋顶光伏系统');
        case 'ov-diesel':
            return L('Diesel Generator', '柴油发电机');
        case 'ov-bess-1':
            return 'BESS #1';
        case 'ov-bess-2':
            return 'BESS #2';
        case 'ov-bess-3':
            return 'BESS #3';
        case 'ov-evse':
            return L('EV Charging Station', '充电站');
        case 'ov-building':
            return L('Building Load', '建筑负荷');
        default:
            return '';
    }
}

function ArchDetailPanelContent({ id, stationData, lang, isDark }: { id: ArchDetailId; stationData: any; lang: Language; isDark: boolean }) {
    const L = (en: string, zh: string) => (lang === 'zh' ? zh : en);
    switch (id) {
        case 'grid':
            return (
                <>
                    <DrawerRow label={L('Name', '名称')} value={stationData.grid.name} />
                    <DrawerRow label={L('Voltage', '电压')} value={stationData.grid.voltage} />
                </>
            );
        case 'acMeter':
            return (
                <>
                    <DrawerRow label="P" value={stationData.acMeter.ac.p} />
                    <DrawerRow label="U" value={stationData.acMeter.ac.v} />
                    <DrawerRow label="I" value={stationData.acMeter.ac.i} />
                </>
            );
        case 'essPairMeter':
            return (
                <>
                    <DrawerRow label="P" value={stationData.essPairAcMeter.ac.p} />
                    <DrawerRow label="U" value={stationData.essPairAcMeter.ac.v} />
                    <DrawerRow label="I" value={stationData.essPairAcMeter.ac.i} />
                </>
            );
        case 'dg':
            return (
                <>
                    <DrawerRow label={L('Frequency', '频率')} value={stationData.dg.freq} />
                    <DrawerRow label={L('Fuel level', '油位')} value={stationData.dg.level} />
                    <DrawerRow label={L('Coolant temp.', '冷却温度')} value={stationData.dg.temp} />
                    <DrawerRow label={L('AC power', '交流功率')} value={stationData.dg.ac.p} />
                    <DrawerRow label={L('AC current', '交流电流')} value={stationData.dg.ac.i} />
                    <DrawerRow label={L('AC voltage', '交流电压')} value={stationData.dg.ac.v} />
                </>
            );
        case 'acPv':
            return (
                <>
                    <DrawerRow label={L('Rated', '额定')} value={stationData.acPv.rated} />
                    <DrawerRow label={L('AC power', '交流功率')} value={stationData.acPv.ac.p} />
                    <DrawerRow label={L('AC current', '交流电流')} value={stationData.acPv.ac.i} />
                    <DrawerRow label={L('AC voltage', '交流电压')} value={stationData.acPv.ac.v} />
                </>
            );
        case 'evse':
            return (
                <>
                    <DrawerRow label={L('AC power', '交流功率')} value={stationData.evse.ac.p} />
                    <DrawerRow label={L('AC current', '交流电流')} value={stationData.evse.ac.i} />
                    <DrawerRow label={L('AC voltage', '交流电压')} value={stationData.evse.ac.v} />
                    <DrawerRow label={L('Internal in', '内部输入')} value={stationData.evse.internal.input} />
                    <DrawerRow label={L('Internal out', '内部输出')} value={stationData.evse.internal.output} />
                </>
            );
        case 'pcs1':
        case 'pcs2':
        case 'pcs3':
        case 'pcs4':
        case 'pcs5':
        case 'pcs6': {
            const d =
                id === 'pcs1'
                    ? stationData.pcs
                    : id === 'pcs2'
                      ? stationData.ess2.pcs
                      : id === 'pcs3'
                        ? stationData.ess3.pcs
                        : id === 'pcs4'
                          ? stationData.ess4.pcs
                          : id === 'pcs5'
                            ? stationData.ess5.pcs
                            : stationData.ess6.pcs;
            const acI = String(d.ac.i ?? '--');
            const acV = String(d.ac.v ?? '--');
            const iParts = acI.split('/');
            const vParts = acV.split('/');
            const ia = iParts[0]?.trim() || acI;
            const ib = iParts[1]?.trim() || acI;
            const ic = iParts[2]?.trim() || acI;
            const va = vParts[0]?.trim() || acV;
            const vb = vParts[1]?.trim() || acV;
            const vc = vParts[2]?.trim() || acV;
            return (
                <div className="space-y-7 pb-2">
                    <div>
                        <PcsSectionTitle isDark={isDark}>{L('Status & Alarms', '状态与告警')}</PcsSectionTitle>
                        <div className="space-y-2.5">
                            <PcsStatusRow label={L('PCS operating status', 'PCS运行状态')} value={<PcsStatusChip value="4" isDark={isDark} />} isDark={isDark} />
                            <PcsStatusRow label={L('Alarm status', '告警状态')} value={<PcsStatusChip value="0" isDark={isDark} />} isDark={isDark} />
                            <PcsStatusRow label={L('Fault status', '故障状态')} value={<PcsStatusChip value="0" isDark={isDark} />} isDark={isDark} />
                        </div>
                    </div>

                    <div>
                        <PcsSectionTitle isDark={isDark}>{L('AC Main Parameters', '交流主参数')}</PcsSectionTitle>
                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                            <PcsKpiCard label={L('AC total active power', '交流_总有功功率')} value={d.ac.p} unit="kW" isDark={isDark} />
                            <PcsKpiCard label={L('AC total reactive power', '交流_总无功功率')} value="0.2" unit="kVar" isDark={isDark} />
                            <PcsKpiCard label={L('AC total power factor', '交流_总功率因数')} value="1" isDark={isDark} />
                            <PcsKpiCard label={L('Grid frequency', '交流_电网总频率')} value={id === 'pcs1' ? stationData.dg.freq : '50.02'} unit="Hz" isDark={isDark} />
                        </div>
                    </div>

                    <div>
                        <PcsSectionTitle isDark={isDark}>{L('DC Input', '直流输入')}</PcsSectionTitle>
                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                            <PcsKpiCard label={L('DC power', '直流_功率')} value={d.dc.p} unit="kW" isDark={isDark} />
                            <PcsKpiCard label={L('DC voltage', '直流_电压')} value={d.dc.v} unit="V" isDark={isDark} />
                            <PcsKpiCard label={L('DC current', '直流_电流')} value={d.dc.i} unit="A" isDark={isDark} />
                        </div>
                    </div>

                    <div>
                        <PcsSectionTitle isDark={isDark}>{L('Energy Statistics', '电量统计')}</PcsSectionTitle>
                        <div className="space-y-2.5">
                            <PcsDataRow label={L('AC today charge energy', '交流_日充电量')} value="533" unit="kWh" isDark={isDark} />
                            <PcsDataRow label={L('AC today discharge energy', '交流_日放电量')} value="411" unit="kWh" isDark={isDark} />
                            <PcsDataRow label={L('AC cumulative charge energy', '交流_总充电电量')} value="2718892032" unit="kWh" isDark={isDark} />
                            <PcsDataRow label={L('AC cumulative discharge energy', '交流_总放电电量')} value="1738866688" unit="kWh" isDark={isDark} />
                        </div>
                    </div>

                    <div>
                        <PcsSectionTitle isDark={isDark}>{L('Grid Line Voltage', '线电压')}</PcsSectionTitle>
                        <div className="space-y-2.5">
                            <PcsDataRow label={L('AB grid line voltage', 'AB相电网线电压')} value={va} unit="V" isDark={isDark} />
                            <PcsDataRow label={L('BC grid line voltage', 'BC相电网线电压')} value={vb} unit="V" isDark={isDark} />
                            <PcsDataRow label={L('CA grid line voltage', 'CA相电网线电压')} value={vc} unit="V" isDark={isDark} />
                        </div>
                    </div>

                    <div>
                        <PcsSectionTitle isDark={isDark}>{L('Thermal Monitoring', '温度监测')}</PcsSectionTitle>
                        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                            <PcsKpiCard label={L('Cabinet temperature', '设备内部腔体温度')} value="35.3" unit="°C" isDark={isDark} />
                            <PcsKpiCard label={L('A phase IGBT temperature', 'A相IGBT温度')} value="44.9" unit="°C" isDark={isDark} />
                            <PcsKpiCard label={L('B phase IGBT temperature', 'B相IGBT温度')} value="46.6" unit="°C" isDark={isDark} />
                            <PcsKpiCard label={L('C phase IGBT temperature', 'C相IGBT温度')} value="47" unit="°C" isDark={isDark} />
                        </div>
                    </div>

                    <div>
                        <PcsSectionTitle isDark={isDark}>{L('Detailed AC Phases', '交流分相明细')}</PcsSectionTitle>
                        <div className="space-y-2.5">
                            <PcsDataRow label={L('AC_A active power', '交流_A相有功功率')} value="0" unit="kW" isDark={isDark} />
                            <PcsDataRow label={L('AC_B active power', '交流_B相有功功率')} value="0" unit="kW" isDark={isDark} />
                            <PcsDataRow label={L('AC_C active power', '交流_C相有功功率')} value="0" unit="kW" isDark={isDark} />
                            <PcsDataRow label={L('AC_A reactive power', '交流_A相无功功率')} value="0" unit="kVar" isDark={isDark} />
                            <PcsDataRow label={L('AC_B reactive power', '交流_B相无功功率')} value="0" unit="kVar" isDark={isDark} />
                            <PcsDataRow label={L('AC_C reactive power', '交流_C相无功功率')} value="0" unit="kVar" isDark={isDark} />
                            <PcsDataRow label={L('AC_A phase voltage', '交流_A相电压')} value={va} unit="V" isDark={isDark} />
                            <PcsDataRow label={L('AC_B phase voltage', '交流_B相电压')} value={vb} unit="V" isDark={isDark} />
                            <PcsDataRow label={L('AC_C phase voltage', '交流_C相电压')} value={vc} unit="V" isDark={isDark} />
                            <PcsDataRow label={L('AC_A phase current', '交流_A相电流')} value={ia} unit="A" isDark={isDark} />
                            <PcsDataRow label={L('AC_B phase current', '交流_B相电流')} value={ib} unit="A" isDark={isDark} />
                            <PcsDataRow label={L('AC_C phase current', '交流_C相电流')} value={ic} unit="A" isDark={isDark} />
                        </div>
                    </div>
                </div>
            );
        }
        case 'car':
            return (
                <>
                    <DrawerRow label={L('SOC', 'SOC')} value={stationData.car.soc} />
                    <DrawerRow label={L('Demand', '需求功率')} value={stationData.car.demand} />
                </>
            );
        case 'bess1':
        case 'bess2':
        case 'bess3':
        case 'bess4':
        case 'bess5':
        case 'bess6': {
            const b =
                id === 'bess1'
                    ? stationData.battery
                    : id === 'bess2'
                      ? stationData.ess2.bat
                      : id === 'bess3'
                        ? stationData.ess3.bat
                        : id === 'bess4'
                          ? stationData.ess4.bat
                          : id === 'bess5'
                            ? stationData.ess5.bat
                            : stationData.ess6.bat;
            return (
                <>
                    <DrawerRow label="SOC" value={b.soc} />
                    <DrawerRow label="SOH" value={b.soh} />
                    <DrawerRow label={L('U max', '最高单体电压')} value={b.vmax} />
                    <DrawerRow label={L('U min', '最低单体电压')} value={b.vmin} />
                    <DrawerRow label={L('T max', '最高温度')} value={b.tmax} />
                    <DrawerRow label={L('T min', '最低温度')} value={b.tmin} />
                    <DrawerRow label={L('Status code', '状态码')} value={String(b.status)} />
                </>
            );
        }
        case 'dcPv':
            return (
                <>
                    <DrawerRow label={L('HV power', '汇流功率')} value={stationData.dcPv.hv.p} />
                    <DrawerRow label={L('HV current', '汇流电流')} value={stationData.dcPv.hv.i} />
                    <DrawerRow label={L('HV voltage', '汇流电压')} value={stationData.dcPv.hv.v} />
                    {stationData.dcPv.panels.map((p: { id: string; p: string; i: string; v: string }) => (
                        <React.Fragment key={p.id}>
                            <DrawerRow label={L(`String ${p.id}`, `组串 ${p.id}`)} value={`${p.p} · ${p.v} / ${p.i}`} />
                        </React.Fragment>
                    ))}
                </>
            );
        case 'ov-cloud':
            return (
                <>
                    <DrawerRow label={L('Product', '产品')} value="EcoWatt Cloud EMS" />
                    <DrawerRow label={L('Version', '版本')} value="v4.2.0 (Global Cluster)" />
                    <DrawerRow label={L('Role', '角色')} value={L('Central orchestration', '中央编排')} />
                </>
            );
        case 'ov-edge':
            return (
                <>
                    <DrawerRow label={L('Device', '设备')} value="EMS Edge Gateway #2" />
                    <DrawerRow label={L('Status', '状态')} value="Operational" />
                    <DrawerRow label={L('Link', '链路')} value={L('WAN + site LAN', '广域网 + 站级局域网')} />
                </>
            );
        case 'ov-grid':
            return (
                <>
                    <DrawerRow label={L('Feeder', '接入')} value="10kV Grid Connection" />
                    <DrawerRow label={L('Import power', '受电功率')} value="450 kW" />
                </>
            );
        case 'ov-rooftop-pv':
            return (
                <>
                    <DrawerRow label={L('Subsystem', '子系统')} value="Rooftop PV System" />
                    <DrawerRow label={L('Output power', '输出功率')} value="85.2 kW" />
                </>
            );
        case 'ov-diesel':
            return (
                <>
                    <DrawerRow label={L('Subsystem', '子系统')} value="Diesel Generator" />
                    <DrawerRow label={L('State', '状态')} value="Standby" />
                </>
            );
        case 'ov-bess-1':
        case 'ov-bess-2':
        case 'ov-bess-3': {
            const n = id === 'ov-bess-1' ? 1 : id === 'ov-bess-2' ? 2 : 3;
            const soc = n === 1 ? '78%' : n === 2 ? '45%' : '92%';
            return (
                <>
                    <DrawerRow label={L('Unit', '单元')} value={`BESS #${n}`} />
                    <DrawerRow label="SOC" value={soc} />
                    <DrawerRow label={L('Comm state', '通讯')} value="Online" />
                </>
            );
        }
        case 'ov-evse':
            return (
                <>
                    <DrawerRow label={L('Subsystem', '子系统')} value="EV Charging Station" />
                    <DrawerRow label={L('Demand', '需求功率')} value="120 kW" />
                </>
            );
        case 'ov-building':
            return (
                <>
                    <DrawerRow label={L('Subsystem', '子系统')} value="Building Load" />
                    <DrawerRow label={L('Usage', '用电功率')} value="325 kW" />
                </>
            );
        default:
            return null;
    }
}

const ArchitectureDetailDrawer = ({
    detailId,
    onClose,
    stationData,
    lang,
    isDark,
    panelTitle,
}: {
    detailId: ArchDetailId | null;
    onClose: () => void;
    stationData: any;
    lang: Language;
    isDark: boolean;
    panelTitle: string;
}) => {
    if (!detailId) return null;
    const isPcsDetail = detailId.startsWith('pcs');
    const L = (en: string, zh: string) => (lang === 'zh' ? zh : en);
    const title = archDetailTitle(detailId, stationData, lang);
    return (
        <div
            className="fixed inset-0 z-[120] flex animate-in fade-in duration-200 justify-end bg-slate-900/45 backdrop-blur-[2px] dark:bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="arch-detail-drawer-title"
        >
            <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label="Close"
                onClick={onClose}
            />
            <aside
                className={`animate-in slide-in-from-right relative z-10 flex h-full w-full flex-col border-l shadow-2xl duration-300 ${
                    isPcsDetail
                        ? isDark
                            ? 'max-w-2xl border-zinc-900 bg-[#07090d]'
                            : 'max-w-2xl border-slate-200 bg-white'
                        : 'max-w-md border-slate-200 bg-white dark:border-apple-border-dark dark:bg-apple-surface-dark'
                }`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div
                    className={`flex items-start justify-between gap-3 border-b ${
                        isPcsDetail
                            ? isDark
                                ? 'border-zinc-900 px-5 py-5'
                                : 'border-slate-200 px-5 py-5'
                            : 'border-slate-100 px-4 py-4 dark:border-apple-border-dark'
                    }`}
                >
                    <div className="min-w-0 flex items-start gap-3">
                        <div
                            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                isPcsDetail
                                    ? isDark
                                        ? 'bg-emerald-500/15 text-emerald-400'
                                        : 'bg-emerald-50 text-emerald-600'
                                    : isDark
                                      ? 'bg-brand-500/20 text-brand-400'
                                      : 'bg-brand-50 text-brand-600'
                            }`}
                        >
                            <PanelRight size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${
                                isPcsDetail ? (isDark ? 'text-zinc-500' : 'text-slate-400') : 'text-slate-400 dark:text-slate-500'
                            }`}>{panelTitle}</p>
                            <h2
                                id="arch-detail-drawer-title"
                                className={`mt-1 text-lg font-black leading-tight ${
                                    isPcsDetail ? (isDark ? 'text-zinc-100' : 'text-slate-900') : 'text-slate-900 dark:text-white'
                                }`}
                            >
                                {title}
                            </h2>
                            {isPcsDetail ? (
                                <p className={`mt-1 text-sm ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                                    {L('Detailed telemetry and operational parameters', '详细遥测与运行参数')}
                                </p>
                            ) : null}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`shrink-0 rounded-lg p-2 transition-colors ${
                            isPcsDetail
                                ? isDark
                                    ? 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-slate-200'
                        }`}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className={`custom-scrollbar-hide flex-1 overflow-y-auto ${isPcsDetail ? 'px-5 pb-8 pt-4' : 'px-4 pb-6 pt-1.5'}`}>
                    <ArchDetailPanelContent id={detailId} stationData={stationData} lang={lang} isDark={isDark} />
                </div>
            </aside>
        </div>
    );
};

// --- Helper Components ---

const StatusBadge = ({ level, text }: { level: number | string, text?: string }) => {
    let bg = 'bg-brand-100 dark:bg-brand-900/30';
    let textCol = 'text-brand-700 dark:text-brand-400';
    let icon = <CheckCircle2 size={12} />;
    let label = text || 'Normal';

    if (level === 1 || level === 'Hint') {
        if (!text) return null;
        bg = 'bg-blue-100 dark:bg-blue-900/30';
        textCol = 'text-blue-700 dark:text-blue-400';
        return (
            <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-transparent ${bg} ${textCol}`}
            >
                {text}
            </span>
        );
    } else if (level === 2 || level === 'Warn') {
        bg = 'bg-amber-100 dark:bg-amber-900/30';
        textCol = 'text-amber-700 dark:text-amber-400';
        icon = <AlertTriangle size={12} />;
        if (!text) label = 'Warn L2';
    } else if (level === 3 || level === 'Fault') {
        bg = 'bg-red-100 dark:bg-red-900/30';
        textCol = 'text-red-700 dark:text-red-400';
        icon = <XCircle size={12} />;
        if (!text) label = 'Fault L3';
    }

    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-transparent ${bg} ${textCol}`}>
            {icon}
            {label ? <span>{label}</span> : null}
        </span>
    );
};

const SvgLineSwitch = ({
    x,
    y,
    isClosed,
    isDark,
}: {
    x: number;
    y: number;
    isClosed: boolean;
    isDark: boolean;
}) => {
    const stroke = isClosed
        ? isDark
            ? '#6ee7b7'
            : '#047857'
        : isDark
          ? '#fcd34d'
          : '#b45309';
    return (
        <g transform={`translate(${x}, ${y})`}>
            <line x1="-10" y1="0" x2="-3" y2="0" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="3" y1="0" x2="10" y2="0" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
            <line
                x1="0"
                y1={isClosed ? -4 : -5}
                x2={isClosed ? 0 : 2}
                y2={isClosed ? 4 : 3}
                stroke={stroke}
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            <circle cx="-3" cy="0" r="1.6" fill={stroke} />
            <circle cx="3" cy="0" r="1.6" fill={stroke} />
        </g>
    );
};
// Floating Data Component for Lines — 统一展示 P/U/I
const FloatingData = ({
    p,
    u,
    i,
    style,
    isDark,
}: {
    p: string;
    u: string;
    i: string;
    style?: React.CSSProperties;
    isDark: boolean;
}) => {
    const label = isDark ? 'text-brand-400' : 'text-brand-600';
    const dot = isDark ? 'bg-brand-400 border-black' : 'bg-brand-500 border-white';
    return (
        <div className="pointer-events-none absolute z-0 flex flex-col gap-0.5 whitespace-nowrap text-sm" style={style}>
            <div className={`absolute -left-3 top-[100%] -translate-y-2 h-2 w-2 rounded-full border-2 ${dot}`} />
        <div className="flex items-center gap-2">
                <span className={`${label} w-3 font-bold`}>P</span>
                <span className={`font-mono text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{p}</span>
        </div>
        <div className="flex items-center gap-2">
                <span className={`${label} w-3 font-bold`}>U</span>
                <span className={`font-mono text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{u}</span>
        </div>
        <div className="flex items-center gap-2">
                <span className={`${label} w-3 font-bold`}>I</span>
                <span className={`font-mono text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{i}</span>
        </div>
    </div>
);
};

type CardVariant = 'default' | 'orange' | 'blue' | 'emerald' | 'slate' | 'purple';

const NodeCard = ({
    title,
    icon: Icon,
    children,
    className = '',
    style = {},
    variant = 'default',
    archIsDark,
    detailId,
    onOpenDetail,
    detailButtonLabel,
}: any) => {
    const variants: Record<CardVariant, string> = {
        default: 'bg-white border-slate-200',
        orange: 'bg-orange-50 border-orange-200',
        blue: 'bg-blue-50 border-blue-200',
        emerald: 'bg-emerald-50 border-emerald-200',
        slate: 'bg-slate-100 border-slate-300',
        purple: 'bg-purple-50 border-purple-200',
    };

    const baseClass = variants[variant as CardVariant] || variants.default;
    const archShell =
        archIsDark === true
            ? 'bg-zinc-900/95 border-zinc-700/90 shadow-none'
            : archIsDark === false
              ? 'bg-white border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.06)]'
              : null;

    return (
        <div 
            className={`${
                archShell ?? `${baseClass} dark:bg-apple-surface-dark dark:border-apple-border-dark shadow-sm`
            } rounded-2xl border p-3 absolute z-10 ${className}`}
            style={style}
        >
            <div
                className={`mb-2 flex items-center gap-2 border-b pb-2 ${
                    archIsDark === true ? 'border-zinc-700' : archIsDark === false ? 'border-slate-100' : 'border-black/5 dark:border-apple-border-dark'
                }`}
            >
                <div
                    className={`p-1.5 rounded-lg shadow-sm ${
                        archIsDark === true
                            ? 'bg-zinc-800 text-brand-400'
                            : archIsDark === false
                              ? 'bg-brand-50 text-brand-700'
                              : 'bg-white/60 dark:bg-apple-surface-secondary-dark text-slate-600 dark:text-slate-400'
                    }`}
                >
                        <Icon size={16} />
                    </div>
                <span
                    className={`min-w-0 text-sm font-bold ${
                        archIsDark === true ? 'text-white' : archIsDark === false ? 'text-slate-900' : 'text-slate-800 dark:text-slate-200'
                    }`}
                >
                    {title}
                </span>
                </div>
            <div className="space-y-1.5">{children}</div>
            {detailId && onOpenDetail && detailButtonLabel && (
                <div
                    className={`mt-2 flex justify-center border-t pt-2 ${
                        archIsDark === true ? 'border-zinc-700' : archIsDark === false ? 'border-slate-100' : 'border-black/5 dark:border-apple-border-dark'
                    }`}
                >
                    <ArchDetailButton
                        label={detailButtonLabel}
                        onOpen={() => onOpenDetail(detailId)}
                        isDark={archIsDark === true}
                    />
            </div>
            )}
        </div>
    );
};

/** 关口表 PCC：卡片内仅名称 + 详细数据；P/U/I 用 FloatingData 置于卡片外右侧 */
const PccMeterCard = ({
    title,
    archIsDark,
    className = '',
    style = {},
    detailId,
    onOpenDetail,
    detailButtonLabel,
}: {
    title: string;
    archIsDark: boolean;
    className?: string;
    style?: React.CSSProperties;
    detailId: ArchDetailId;
    onOpenDetail: (id: ArchDetailId) => void;
    detailButtonLabel: string;
}) => {
    const isDark = archIsDark === true;
    const archShell =
        archIsDark === true
            ? 'bg-zinc-900/95 border-zinc-700/90 shadow-none'
            : 'bg-white border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.06)]';

    return (
        <div 
            className={`${archShell} relative z-10 flex w-[100px] shrink-0 flex-col items-center justify-between gap-1.5 rounded-xl border p-2 ${className}`}
            style={style}
        >
            <div className="flex flex-col items-center gap-1">
                <div
                    className={`rounded-md p-1.5 shadow-sm ${
                        isDark ? 'bg-zinc-800 text-brand-400' : 'bg-brand-50 text-brand-700'
                    }`}
                >
                    <Gauge size={15} strokeWidth={2.25} />
                </div>
                <span
                    className={`line-clamp-2 text-center text-[11px] font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}
                >
                    {title}
                </span>
            </div>
            <ArchDetailButton
                label={detailButtonLabel}
                onOpen={() => onOpenDetail(detailId)}
                isDark={isDark}
                size="compact"
            />
        </div>
    );
};

const PcsCard = ({
    data,
    style,
    isDark,
    detailId,
    onOpenDetail,
    detailButtonLabel,
}: {
    data: any;
    style: React.CSSProperties;
    isDark: boolean;
    detailId?: ArchDetailId;
    onOpenDetail?: (id: ArchDetailId) => void;
    detailButtonLabel?: string;
}) => {
    const th = getArchTheme(isDark);
    const box = th.pcsOutline;
    return (
        <div className="absolute z-10 flex w-[6.75rem] flex-col items-center justify-center overflow-visible" style={style}>
            <FloatingData
                p={data.ac.p}
                u={data.ac.v}
                i={data.ac.i}
                isDark={isDark}
                style={{ top: '-65px', left: '33%', marginLeft: '12px' }}
            />
            <div
                className={`w-20 shrink-0 rounded-2xl border-2 shadow-lg relative z-10 flex flex-col items-center justify-center gap-1 py-1.5 ${box}`}
            >
                <span className={`text-[11px] font-black tracking-tight ${isDark ? 'text-brand-400' : 'text-brand-700'}`}>PCS</span>
                <svg viewBox="0 0 100 100" className="h-8 w-8 opacity-90" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect
                        x="5"
                        y="15"
                        width="90"
                        height="70"
                        rx="8"
                        className={isDark ? 'stroke-brand-500/60 fill-brand-500/10' : 'stroke-brand-500/50 fill-brand-50'}
                        strokeWidth="2.5"
                    />
                    <path
                        d="M30 35 Q 40 20 50 35 T 70 35"
                        className={isDark ? 'stroke-orange-400' : 'stroke-orange-500'}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        fill="none"
                    />
                    <line x1="15" y1="50" x2="85" y2="50" className={isDark ? 'stroke-zinc-600' : 'stroke-slate-300'} strokeWidth="2" strokeDasharray="4 4" />
                    <line
                        x1="30"
                        y1="65"
                        x2="70"
                        y2="65"
                        className={isDark ? 'stroke-brand-400' : 'stroke-brand-600'}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                    />
                    <line
                        x1="30"
                        y1="75"
                        x2="70"
                        y2="75"
                        className={isDark ? 'stroke-brand-400' : 'stroke-green-600'}
                        strokeWidth="3.5"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute left-[100%] top-0 ml-3 flex flex-col gap-1.5 w-max items-start justify-center h-full">
                     {data.status.mode && (
                        <div title="Mode">
                            <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                                    isDark ? 'bg-zinc-800 text-zinc-200 border-zinc-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                            >
                                {data.status.mode}
                            </span>
                        </div>
                     )}
                     <div title="State">
                        <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                                data.status.state === 'Discharge'
                                    ? isDark
                                        ? 'bg-sky-950/80 text-sky-300 border-sky-700'
                                        : 'bg-sky-50 text-sky-700 border-sky-200'
                                    : data.status.state === 'Charge'
                                      ? isDark
                                          ? 'bg-brand-950/50 text-brand-300 border-brand-700'
                                          : 'bg-brand-50 text-brand-700 border-brand-200'
                                      : isDark
                                        ? 'bg-zinc-800 text-zinc-400 border-zinc-600'
                                        : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                        >
                             {data.status.state}
                         </span>
                     </div>
                     <div title="Health">
                        <StatusBadge level={data.status.health === 'Normal' ? 0 : 2} text={data.status.health} />
                     </div>
                </div>
                {detailId && onOpenDetail && detailButtonLabel && (
                    <ArchDetailButton
                        label={detailButtonLabel}
                        onOpen={() => onOpenDetail(detailId)}
                        isDark={isDark}
                        size="compact"
                    />
                )}
            </div>
            <FloatingData
                p={data.dc?.p || '-'}
                u={data.dc?.v || '-'}
                i={data.dc?.i || '-'}
                isDark={isDark}
                style={{ bottom: '-85px', left: '33%', marginLeft: '12px' }}
            />
        </div>
    );
};

const SocDonut = ({ soc, isDark }: { soc: string; isDark: boolean }) => {
    const th = getArchTheme(isDark);
    const pct = Math.min(100, Math.max(0, parseFloat(soc.replace('%', '')) || 0));
    const r = 36;
    const c = 2 * Math.PI * r;
    const dash = (pct / 100) * c;
    const stroke = pct <= 20 ? th.ringLow : th.ringHigh;
    return (
        <div className="relative mx-auto h-[100px] w-[100px]">
            <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
                <circle cx="44" cy="44" r={r} fill="none" stroke={th.ringTrack} strokeWidth="9" />
                <circle
                    cx="44"
                    cy="44"
                    r={r}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${c}`}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`font-mono text-lg font-black ${th.textMain}`}>{Math.round(pct)}%</span>
            </div>
        </div>
    );
};

const ArchBessCard = ({
    title,
    soc,
    soh,
    vmax,
    vmin,
    tmax,
    tmin,
    status,
    isDark,
    style,
    className = '',
    detailId,
    onOpenDetail,
    detailButtonLabel,
}: {
    title: string;
    soc: string;
    soh: string;
    vmax: string;
    vmin: string;
    tmax: string;
    tmin: string;
    status: number;
    isDark: boolean;
    style?: React.CSSProperties;
    className?: string;
    detailId?: ArchDetailId;
    onOpenDetail?: (id: ArchDetailId) => void;
    detailButtonLabel?: string;
}) => {
    const th = getArchTheme(isDark);
    const rowBg = isDark ? 'bg-zinc-800/90' : 'bg-slate-100';
    const iconBox = isDark ? 'bg-zinc-800 border-zinc-600 text-brand-400' : 'bg-white border-slate-200 text-brand-700';

    return (
        <div className={`absolute z-10 flex w-[180px] flex-col items-stretch ${className}`} style={style}>
            <div className={`w-full overflow-hidden rounded-2xl border ${th.cardShell}`}>
                <div className={`px-2 py-2 text-center text-xs font-black ${th.cardHeader}`}>{title}</div>
                <div className="space-y-2.5 p-2.5">
                    {status !== 0 && (
                        <div className="flex justify-center">
                            <StatusBadge level={status} />
                        </div>
                    )}
                    <SocDonut soc={soc} isDark={isDark} />
                    <div className={`flex items-center justify-between rounded-xl px-2.5 py-2 text-xs ${rowBg}`}>
                        <span className={`font-bold ${th.textSub}`}>SOH</span>
                        <span className={`font-mono font-black ${th.textMain}`}>{soh}</span>
                    </div>
                    <div className={`flex gap-2 rounded-xl p-2 ${rowBg}`}>
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-[10px] font-black ${iconBox}`}>V</div>
                        <div className="min-w-0 flex-1 space-y-1 text-[11px]">
                            <div className={`flex items-center justify-between gap-1 ${th.textMain}`}>
                                <span className={th.textSub}>Umax</span>
                                <span className="flex items-center gap-0.5 font-mono font-bold">
                                    {vmax}
                                    <ArrowUp className="shrink-0 text-red-500" size={12} strokeWidth={2.5} />
                </span>
                            </div>
                            <div className={`flex items-center justify-between gap-1 ${th.textMain}`}>
                                <span className={th.textSub}>Umin</span>
                                <span className="flex items-center gap-0.5 font-mono font-bold">
                                    {vmin}
                                    <ArrowDown className="shrink-0 text-brand-500" size={12} strokeWidth={2.5} />
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className={`flex gap-2 rounded-xl p-2 ${rowBg}`}>
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${iconBox}`}>
                            <Thermometer size={14} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1 text-[11px]">
                            <div className={`flex items-center justify-between gap-1 ${th.textMain}`}>
                                <span className={th.textSub}>Tmax</span>
                                <span className="flex items-center gap-0.5 font-mono font-bold">
                                    {tmax}
                                    <ArrowUp className="shrink-0 text-red-500" size={12} strokeWidth={2.5} />
                                </span>
                            </div>
                            <div className={`flex items-center justify-between gap-1 ${th.textMain}`}>
                                <span className={th.textSub}>Tmin</span>
                                <span className="flex items-center gap-0.5 font-mono font-bold">
                                    {tmin}
                                    <ArrowDown className="shrink-0 text-brand-500" size={12} strokeWidth={2.5} />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {detailId && onOpenDetail && detailButtonLabel && (
                    <div
                        className={`flex justify-center border-t px-2.5 py-2 ${
                            isDark ? 'border-zinc-600/80' : 'border-slate-200'
                        }`}
                    >
                        <ArchDetailButton
                            label={detailButtonLabel}
                            onOpen={() => onOpenDetail(detailId)}
                            isDark={isDark}
                            size="compact"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

const DataRow = ({ label, value, subValue, highlight = false }: any) => {
    const isStatusLabel = label === 'Status' || label === 'State' || label === '状态';
    return (
        <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <div className="flex items-center gap-1">
                {isStatusLabel ? (
                    <span className="rounded-md border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                {value}
            </span>
                ) : (
                    <span
                        className={`font-mono font-bold ${highlight ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                        {value}
                    </span>
                )}
                {subValue && <span className="scale-90 text-slate-400">{subValue}</span>}
        </div>
    </div>
);
};

/** 拓扑画布逻辑尺寸（与 SVG / 绝对定位一致） */
/** #2–#6 BESS 宽 180px，列距需 >180 才不互叠 */
/** PCS#2–6 右移后母线需覆盖至最右落点 */
const ARCH_DIAGRAM_WIDTH = 2320;
/** 紧凑纵向 + 右移分列后底部留白 */
const ARCH_DIAGRAM_HEIGHT = 1360;
/** 默认 100% 缩放；画布增高后仍可通过平移查看全貌 */
const ARCH_DIAGRAM_DEFAULT_SCALE = 1;

// --- Architecture Diagram Component ---

const StationDiagram = ({
    stationData,
    view,
    lang,
    isDark,
    onOpenDetail,
    detailButtonLabel,
}: {
    stationData: any;
    view: ArchView;
    lang: Language;
    isDark: boolean;
    onOpenDetail: (id: ArchDetailId) => void;
    detailButtonLabel: string;
}) => {
    const WIDTH = ARCH_DIAGRAM_WIDTH;
    const HEIGHT = ARCH_DIAGRAM_HEIGHT;
    const CENTER_X = WIDTH / 2;
    const th = getArchTheme(isDark);

    if (view === 'overview') {
        // --- OVERVIEW ARCHITECTURE DESIGN ---
        // Hierarchical logical structure: Cloud -> Edge -> Device Groups
        const Y_CLOUD = 100;
        const Y_EDGE = 320;
        const Y_DEVICE_GROUPS = 600;
        
        const X_CLOUD = CENTER_X;
        const X_EDGE = CENTER_X;
        
        // Horizontal spacing for groups
        const X_GRID = CENTER_X - 600;
        const X_GENERATION = CENTER_X - 250;
        const X_ESS = CENTER_X + 250;
        const X_CONSUMPTION = CENTER_X + 600;

        const diagramSurfaceStyle: React.CSSProperties = {
            width: WIDTH,
            height: HEIGHT,
            ...(isDark ? { backgroundColor: 'var(--color-apple-bg-dark)' } : {}),
        };

        return (
            <div className={`relative overflow-hidden rounded-xl border ${th.canvas}`} style={diagramSurfaceStyle}>
                <div
                    className="pointer-events-none absolute inset-0 z-0"
                    style={{
                        opacity: isDark ? 0.22 : 0.5,
                        backgroundImage: `radial-gradient(${th.gridDot} 1px, transparent 1px)`,
                        backgroundSize: '22px 22px',
                    }}
                />
                {/* SVG for communication paths */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <defs>
                        <linearGradient id="commGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#819226" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                        </linearGradient>
                    </defs>
                    
                    {/* Cloud to Edge */}
                    <path
                        d={`M${X_CLOUD} ${Y_CLOUD + 60} V ${Y_EDGE}`}
                        stroke={th.strokeComm}
                        strokeWidth={2}
                        fill="none"
                        strokeDasharray="6 4"
                    />
                    
                    {/* Edge to Categories */}
                    <path
                        d={`M${X_EDGE} ${Y_EDGE + 80} V ${Y_EDGE + 150} H ${X_GRID} V ${Y_DEVICE_GROUPS}`}
                        stroke={isDark ? th.strokeComm : '#94a3b8'}
                        strokeWidth={2}
                        fill="none"
                    />
                    <path
                        d={`M${X_EDGE} ${Y_EDGE + 150} H ${X_GENERATION} V ${Y_DEVICE_GROUPS}`}
                        stroke={isDark ? th.strokeComm : '#94a3b8'}
                        strokeWidth={2}
                        fill="none"
                    />
                    <path
                        d={`M${X_EDGE} ${Y_EDGE + 150} H ${X_ESS} V ${Y_DEVICE_GROUPS}`}
                        stroke={isDark ? th.strokeComm : '#94a3b8'}
                        strokeWidth={2}
                        fill="none"
                    />
                    <path
                        d={`M${X_EDGE} ${Y_EDGE + 150} H ${X_CONSUMPTION} V ${Y_DEVICE_GROUPS}`}
                        stroke={isDark ? th.strokeComm : '#94a3b8'}
                        strokeWidth={2}
                        fill="none"
                    />

                    <circle cx={X_EDGE} cy={Y_EDGE + 150} r={4} fill={th.strokeComm} />
                </svg>

                {/* Level 1: Cloud */}
                <div
                    style={{ position: 'absolute', top: Y_CLOUD, left: X_CLOUD, transform: 'translateX(-50%)' }}
                    className="flex flex-col items-center gap-2"
                >
                    <div
                        className={`flex items-center gap-4 rounded-2xl border-2 p-4 shadow-xl ${
                            isDark ? 'border-brand-400 bg-brand-600 text-white' : 'border-brand-500 bg-brand-600 text-white'
                        }`}
                    >
                        <Cloud size={40} className="text-white" />
                        <div>
                            <div className="text-lg font-black">EcoWatt Cloud EMS</div>
                            <div className={`font-mono text-xs ${isDark ? 'text-white/80' : 'text-white/80'}`}>v4.2.0 (Global Cluster)</div>
                        </div>
                    </div>
                    <ArchDetailButton label={detailButtonLabel} onOpen={() => onOpenDetail('ov-cloud')} isDark={isDark} />
                </div>

                {/* Level 2: Edge Gateway */}
                <div
                    style={{ position: 'absolute', top: Y_EDGE, left: X_EDGE, transform: 'translateX(-50%)' }}
                    className="flex flex-col items-center gap-2"
                >
                    <div
                        className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 shadow-lg ${
                            isDark
                                ? 'border-brand-400/50 bg-zinc-900/95 text-white'
                                : 'border-brand-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)]'
                        }`}
                    >
                        <div
                            className={`rounded-full p-3 ${
                                isDark ? 'bg-brand-400/15 text-brand-400' : 'bg-brand-50 text-brand-700'
                            }`}
                        >
                            <Server size={32} />
                        </div>
                        <div className="text-center">
                            <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>EMS Edge Gateway #2</div>
                            <div
                                className={`mt-1 text-[10px] font-black uppercase tracking-widest ${
                                    isDark ? 'text-brand-400' : 'text-brand-600'
                                }`}
                            >
                                Status: Operational
                        </div>
                    </div>
                    </div>
                    <ArchDetailButton label={detailButtonLabel} onOpen={() => onOpenDetail('ov-edge')} isDark={isDark} />
                </div>

                {/* Level 3: Device Functional Clusters */}
                {/* Grid Cluster */}
                <div style={{ position: 'absolute', top: Y_DEVICE_GROUPS, left: X_GRID, transform: 'translateX(-50%)' }} className="w-56">
                    <div className={`space-y-4 rounded-3xl border p-4 ${th.cardShell}`}>
                        <div
                            className={`flex items-center gap-2 border-b pb-2 ${
                                isDark ? 'border-zinc-700' : 'border-slate-100'
                            }`}
                        >
                             <Globe size={16} className={isDark ? 'text-brand-400' : 'text-blue-600'} />
                             <span className={`text-xs font-black uppercase tracking-wider ${th.textSub}`}>{lang==='zh'?'电网侧':'Grid Interface'}</span>
                        </div>
                        <div className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-slate-100 bg-slate-50/80'}`}>
                            <div className="mb-2 flex items-center gap-2">
                                <Zap size={14} className={isDark ? 'text-brand-400' : 'text-blue-600'} />
                                <span className={`text-xs font-bold ${th.textMain}`}>10kV Grid Connection</span>
                            </div>
                            <DataRow label="Import" value="450 kW" highlight />
                            <div className="mt-2 flex justify-center">
                                <ArchDetailButton label={detailButtonLabel} onOpen={() => onOpenDetail('ov-grid')} isDark={isDark} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Generation Cluster */}
                <div style={{ position: 'absolute', top: Y_DEVICE_GROUPS, left: X_GENERATION, transform: 'translateX(-50%)' }} className="w-56">
                    <div className={`space-y-4 rounded-3xl border p-4 ${th.cardShell}`}>
                        <div
                            className={`flex items-center gap-2 border-b pb-2 ${
                                isDark ? 'border-zinc-700' : 'border-slate-100'
                            }`}
                        >
                             <Sun size={16} className={isDark ? 'text-orange-400' : 'text-amber-500'} />
                             <span className={`text-xs font-black uppercase tracking-wider ${th.textSub}`}>{lang==='zh'?'能源采集':'Generation'}</span>
                        </div>
                        <div className="space-y-2">
                            <div className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-slate-100 bg-slate-50/80'}`}>
                                <div className={`mb-1 text-xs font-bold ${th.textMain}`}>Rooftop PV System</div>
                                <DataRow label="Power" value="85.2 kW" highlight />
                                <div className="mt-2 flex justify-center">
                                    <ArchDetailButton label={detailButtonLabel} onOpen={() => onOpenDetail('ov-rooftop-pv')} isDark={isDark} />
                            </div>
                            </div>
                            <div className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-slate-100 bg-slate-50/80'}`}>
                                <div className={`mb-1 text-xs font-bold ${th.textMain}`}>Diesel Generator</div>
                                <DataRow label="Status" value="Standby" />
                                <div className="mt-2 flex justify-center">
                                    <ArchDetailButton label={detailButtonLabel} onOpen={() => onOpenDetail('ov-diesel')} isDark={isDark} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Storage Cluster */}
                <div style={{ position: 'absolute', top: Y_DEVICE_GROUPS, left: X_ESS, transform: 'translateX(-50%)' }} className="w-56">
                    <div className={`space-y-4 rounded-3xl border p-4 ${th.cardShell}`}>
                        <div
                            className={`flex items-center gap-2 border-b pb-2 ${
                                isDark ? 'border-zinc-700' : 'border-slate-100'
                            }`}
                        >
                             <Battery size={16} className={isDark ? 'text-brand-400' : 'text-purple-600'} />
                             <span className={`text-xs font-black uppercase tracking-wider ${th.textSub}`}>{lang==='zh'?'储能核心':'BESS'}</span>
                        </div>
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={`overflow-hidden rounded-xl border ${isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-slate-100 bg-white'}`}
                                >
                                    <div className={`px-2 py-1.5 text-center text-[10px] font-black ${th.cardHeader}`}>
                                        BESS #{i}
                                    </div>
                                    <div className="p-2.5">
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <span className={`text-[10px] font-bold ${th.textSub}`}>SOC</span>
                                            <span className={`rounded px-1 text-[9px] font-bold ${isDark ? 'bg-brand-400/20 text-brand-400' : 'bg-brand-100 text-brand-800'}`}>Online</span>
                                        </div>
                                        <div className={`h-1.5 w-full overflow-hidden rounded-full ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}>
                                            <div
                                                className={`h-full ${isDark ? 'bg-brand-400' : 'bg-brand-500'}`}
                                                style={{ width: i === 1 ? '78%' : i === 2 ? '45%' : '92%' }}
                                            />
                                        </div>
                                        <div className="mt-2 flex justify-center">
                                            <ArchDetailButton
                                                label={detailButtonLabel}
                                                onOpen={() => onOpenDetail(i === 1 ? 'ov-bess-1' : i === 2 ? 'ov-bess-2' : 'ov-bess-3')}
                                                isDark={isDark}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Consumption Cluster */}
                <div style={{ position: 'absolute', top: Y_DEVICE_GROUPS, left: X_CONSUMPTION, transform: 'translateX(-50%)' }} className="w-56">
                    <div className={`space-y-4 rounded-3xl border p-4 ${th.cardShell}`}>
                        <div
                            className={`flex items-center gap-2 border-b pb-2 ${
                                isDark ? 'border-zinc-700' : 'border-slate-100'
                            }`}
                        >
                             <Laptop size={16} className={isDark ? 'text-orange-400' : 'text-brand-600'} />
                             <span className={`text-xs font-black uppercase tracking-wider ${th.textSub}`}>{lang==='zh'?'负荷消纳':'Consumption'}</span>
                        </div>
                        <div className="space-y-2">
                            <div className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-slate-100 bg-slate-50/80'}`}>
                                <div className={`mb-1 text-xs font-bold ${th.textMain}`}>EV Charging Station</div>
                                <DataRow label="Demand" value="120 kW" highlight />
                                <div className="mt-2 flex justify-center">
                                    <ArchDetailButton label={detailButtonLabel} onOpen={() => onOpenDetail('ov-evse')} isDark={isDark} />
                            </div>
                            </div>
                            <div className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-slate-100 bg-slate-50/80'}`}>
                                <div className={`mb-1 text-xs font-bold ${th.textMain}`}>Building Load</div>
                                <DataRow label="Usage" value="325 kW" highlight />
                                <div className="mt-2 flex justify-center">
                                    <ArchDetailButton label={detailButtonLabel} onOpen={() => onOpenDetail('ov-building')} isDark={isDark} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- POWER ARCHITECTURE DESIGN (Original SLD Style) ---
    // (Existing physical SLD code preserved here)
    /** 母线及以下整体下移，与顶部 PCC 区域拉开间距 */
    const POWER_LOWER_Y_SHIFT = 56;
    const Y_BUSBAR = 190 + POWER_LOWER_Y_SHIFT;
    /** 并网主干：自顶部接入点连续垂直到母线，穿过 PCC 区域（线在白底/SVG z-0，PCC 卡片 z-30 叠在正中） */
    const Y_TRUNK_FROM_GRID = 48;
    const Y_MAIN_ROW = 262 + POWER_LOWER_Y_SHIFT;
    const Y_DC_START = Y_MAIN_ROW + 80; 
    const Y_EVSE_DC_START = Y_MAIN_ROW + 100;
    const Y_SPLIT_PCS1 = 480 + POWER_LOWER_Y_SHIFT;
    /** 底部 BESS#1 / 车棚 PV 行轻微下移即可；主要用右移 #2–6 错开叠画，避免加长垂线 */
    const Y_SUB_ROW_EXTRA = 48;
    const Y_SUB_ROW = 560 + POWER_LOWER_Y_SHIFT + Y_SUB_ROW_EXTRA;
    const Y_SUB_ROW_CLOSE = 430 + POWER_LOWER_Y_SHIFT;
    /** #2–6 PCS 与 #1 同框高（短汇流垂线），不靠整体下移拉开 */
    /** PCS #2–#6 + BESS #2–#6 相对主行整体下移（与 #1 等其它设备脱钩） */
    const Y_ESS23_BLOCK_SHIFT = 170;
    /** BESS#2–6 与 PCS 间略增垂向间隙（增量小，不明显加长竖线） */
    const Y_ESS26_BESS_EXTRA = 28;
    const Y_MAIN_ESS23 = Y_MAIN_ROW + Y_ESS23_BLOCK_SHIFT;
    const Y_DC_START_ESS23 = Y_MAIN_ESS23 + 80;
    const Y_SUB_ROW_CLOSE_ESS23 = Y_SUB_ROW_CLOSE + Y_ESS23_BLOCK_SHIFT + Y_ESS26_BESS_EXTRA;
    /** 车辆在主设备行下方、BESS#1 行上方，缩短与桩体的视觉链长 */
    const Y_CAR_ROW = Y_MAIN_ROW + 258;
    /** EVSE 直流竖线终点（原 400，随下方整体上移） */
    const Y_EVSE_DC_STUB_END = 400 + POWER_LOWER_Y_SHIFT; 

    const X_DG = 289;
    const X_ACPV = 476;
    const X_EVSE = 663;
    const X_PCS1 = 944; 
    const X_BATTERY1 = 850; 
    const X_DCPV = 1038;
    /** PCS #2–#6：列间距（大于卡宽 180，留白更大） */
    const X_ESS26_COL_STEP = 210;
    /** PCS #2–#6 + 支路表水平基准（整组左右平移只改此值） */
    const X_PCS2 = 1252;
    const X_PCS3 = X_PCS2 + X_ESS26_COL_STEP;
    const X_PCS4 = X_PCS2 + X_ESS26_COL_STEP * 2;
    const X_PCS5 = X_PCS2 + X_ESS26_COL_STEP * 3;
    const X_PCS6 = X_PCS2 + X_ESS26_COL_STEP * 4;

    const OFFSET_PCS = -14; 
    const OFFSET_STD = -26;
    const BATTERY_OFFSET_X = 12;

    /** 支路表：母线 → ESS #2/#3 支路表 → 汇流排 → 五路 PCS */
    const X_PCS2_TAP = X_PCS2 + OFFSET_PCS;
    const X_PCS3_TAP = X_PCS3 + OFFSET_PCS;
    const X_PCS4_TAP = X_PCS4 + OFFSET_PCS;
    const X_PCS5_TAP = X_PCS5 + OFFSET_PCS;
    const X_PCS6_TAP = X_PCS6 + OFFSET_PCS;
    const X_ESS_PAIR_MID = (X_PCS2_TAP + X_PCS6_TAP) / 2;
    /** 支路表与母线垂线同列（五路 PCS 仍关于汇流排几何居中至五路 PCS） */
    const X_ESS_PAIR_METER_SHIFT = 56;
    const X_ESS_PAIR_METER_LEFT = X_ESS_PAIR_MID + X_ESS_PAIR_METER_SHIFT;
    /**
     * 汇流排必须在支路表下方（Y 更大），且略低于 PCS 顶，否则水平线会与表计重叠。
     * 顺序：母线 → 表 → 表下 20px 垂段 → 汇流排 → 五路竖线 → PCS。
     */
    const Y_ESS_PAIR_AC_STUB = 94;
    const Y_ESS_PAIR_TEE = Y_MAIN_ESS23 - Y_ESS_PAIR_AC_STUB;
    const Y_ESS_PAIR_METER_TRUNK_PAD = 44;
    /** 支路表下沿至汇流排垂线长度（固定） */
    const Y_ESS_PAIR_METER_BELOW_STUB = 20;
    const Y_ESS_PAIR_TRUNK_BELOW_METER = Y_ESS_PAIR_TEE - Y_ESS_PAIR_METER_BELOW_STUB;
    const Y_ESS_PAIR_METER = Y_ESS_PAIR_TRUNK_BELOW_METER - Y_ESS_PAIR_METER_TRUNK_PAD;
    /** 母线垂线在表计处断开，避免粗线被卡片完全遮住 */
    const Y_ESS_PAIR_TRUNK_ABOVE_METER = Math.max(Y_BUSBAR + 4, Y_ESS_PAIR_METER - Y_ESS_PAIR_METER_TRUNK_PAD);

    const trunkStroke = th.strokeBusH;
    const busStroke = th.strokeBusH;
    const acTap = th.strokeBusH;
    const dcRun = th.strokeBusH;

    const bessTitle = (name: string) =>
        lang === 'zh' ? `${String(name).replace('#', '')}#BESS` : `BESS ${name}`;

    const diagramSurfaceStyle: React.CSSProperties = {
        width: WIDTH,
        height: HEIGHT,
        ...(isDark ? { backgroundColor: 'var(--color-apple-bg-dark)' } : {}),
    };
    return (
        <div className={`relative overflow-visible rounded-xl border ${th.canvas}`} style={diagramSurfaceStyle}>
        <div 
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-xl"
                style={{
                    opacity: isDark ? 0.22 : 0.45,
                    backgroundImage: `radial-gradient(${th.gridDot} 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                }}
            />

            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible rounded-xl">
                <defs>
                    <marker id="arrowhead-power" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill={isDark ? '#52525b' : '#cbd5e1'}
                        />
                    </marker>
                </defs>
                <path
                    d={`M${CENTER_X} ${Y_TRUNK_FROM_GRID} V ${Y_BUSBAR}`}
                    stroke={trunkStroke}
                    strokeWidth={2}
                    fill="none"
                />
                <path d={`M220 ${Y_BUSBAR} H 2260`} stroke={busStroke} strokeWidth={2} fill="none" />
                <rect x="210" y={Y_BUSBAR - 2} width="2040" height="4" rx="2" fill={busStroke} />
                <path
                    d={`M${X_DG + OFFSET_STD} ${Y_BUSBAR} V ${Y_MAIN_ROW}`}
                    stroke={acTap}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fill="none"
                />
                <path
                    d={`M${X_ACPV + OFFSET_STD} ${Y_BUSBAR} V ${Y_MAIN_ROW}`}
                    stroke={acTap}
                    strokeWidth={2}
                    className="animate-pulse"
                    fill="none"
                />
                <path d={`M${X_EVSE + OFFSET_STD} ${Y_BUSBAR} V ${Y_MAIN_ROW}`} stroke={acTap} strokeWidth={2} fill="none" />
                <path d={`M${X_PCS1 + OFFSET_PCS} ${Y_BUSBAR} V ${Y_MAIN_ROW}`} stroke={acTap} strokeWidth={2} fill="none" />
                <path
                    d={`M${X_ESS_PAIR_METER_LEFT} ${Y_BUSBAR} V ${Y_ESS_PAIR_TRUNK_ABOVE_METER} M${X_ESS_PAIR_METER_LEFT} ${Y_ESS_PAIR_TRUNK_BELOW_METER} V ${Y_ESS_PAIR_TEE} M${X_PCS2_TAP} ${Y_ESS_PAIR_TEE} H ${X_PCS6_TAP} M${X_PCS2_TAP} ${Y_ESS_PAIR_TEE} V ${Y_MAIN_ESS23} M${X_PCS3_TAP} ${Y_ESS_PAIR_TEE} V ${Y_MAIN_ESS23} M${X_PCS4_TAP} ${Y_ESS_PAIR_TEE} V ${Y_MAIN_ESS23} M${X_PCS5_TAP} ${Y_ESS_PAIR_TEE} V ${Y_MAIN_ESS23} M${X_PCS6_TAP} ${Y_ESS_PAIR_TEE} V ${Y_MAIN_ESS23}`}
                    stroke={acTap}
                    strokeWidth={2}
                    fill="none"
                />
                <path
                    d={`M${X_EVSE + OFFSET_STD} ${Y_EVSE_DC_START} V ${Y_EVSE_DC_STUB_END}`}
                    stroke={dcRun}
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    fill="none"
                />
                <path d={`M${X_PCS1 + OFFSET_PCS} ${Y_DC_START} V ${Y_SPLIT_PCS1}`} stroke={dcRun} strokeWidth={2} fill="none" />
                <path
                    d={`M${X_PCS1 + OFFSET_PCS} ${Y_SPLIT_PCS1} H ${X_BATTERY1 + OFFSET_STD} V ${Y_SUB_ROW}`}
                    stroke={dcRun}
                    strokeWidth={2}
                    fill="none"
                />
                <path
                    d={`M${X_PCS1 + OFFSET_PCS} ${Y_SPLIT_PCS1} H ${X_DCPV + OFFSET_STD} V ${Y_SUB_ROW}`}
                    stroke={dcRun}
                    strokeWidth={2}
                    fill="none"
                />
                <path
                    d={`M${X_PCS2 + OFFSET_PCS} ${Y_DC_START_ESS23} V ${Y_SUB_ROW_CLOSE_ESS23}`}
                    stroke={dcRun}
                    strokeWidth={2}
                    fill="none"
                />
                <path
                    d={`M${X_PCS3 + OFFSET_PCS} ${Y_DC_START_ESS23} V ${Y_SUB_ROW_CLOSE_ESS23}`}
                    stroke={dcRun}
                    strokeWidth={2}
                    fill="none"
                />
                <path
                    d={`M${X_PCS4 + OFFSET_PCS} ${Y_DC_START_ESS23} V ${Y_SUB_ROW_CLOSE_ESS23}`}
                    stroke={dcRun}
                    strokeWidth={2}
                    fill="none"
                />
                <path
                    d={`M${X_PCS5 + OFFSET_PCS} ${Y_DC_START_ESS23} V ${Y_SUB_ROW_CLOSE_ESS23}`}
                    stroke={dcRun}
                    strokeWidth={2}
                    fill="none"
                />
                <path
                    d={`M${X_PCS6 + OFFSET_PCS} ${Y_DC_START_ESS23} V ${Y_SUB_ROW_CLOSE_ESS23}`}
                    stroke={dcRun}
                    strokeWidth={2}
                    fill="none"
                />
                <SvgLineSwitch x={CENTER_X} y={Y_BUSBAR - 34} isClosed={true} isDark={isDark} />
                <SvgLineSwitch
                    x={X_DG + OFFSET_STD}
                    y={Y_BUSBAR + (Y_MAIN_ROW - Y_BUSBAR) * 0.42}
                    isClosed={false}
                    isDark={isDark}
                />
                <SvgLineSwitch
                    x={X_ACPV + OFFSET_STD}
                    y={Y_BUSBAR + (Y_MAIN_ROW - Y_BUSBAR) * 0.42}
                    isClosed={true}
                    isDark={isDark}
                />
                <SvgLineSwitch
                    x={X_PCS1 + OFFSET_PCS}
                    y={Y_DC_START + (Y_SPLIT_PCS1 - Y_DC_START) * 0.45}
                    isClosed={true}
                    isDark={isDark}
                />
                <SvgLineSwitch
                    x={X_EVSE + OFFSET_STD}
                    y={Y_EVSE_DC_START + (Y_EVSE_DC_STUB_END - Y_EVSE_DC_START) * 0.4}
                    isClosed={false}
                    isDark={isDark}
                />
            </svg>

            <div className="absolute left-[50%] top-0 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5">
                <div
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 shadow-lg ${th.pillSolid}`}
                >
                    <Cloud size={18} className="text-white" />
                    <span className="text-sm font-black text-white">{stationData.grid.name}</span>
                    <span
                        className={`rounded-md px-1.5 py-0.5 font-mono text-xs font-bold ${
                            isDark ? 'bg-white/15 text-white' : 'bg-white/20 text-white'
                        }`}
                    >
                        {stationData.grid.voltage}
                    </span>
                </div>
                <div className="relative z-30 inline-flex shrink-0 items-center overflow-visible">
                    <PccMeterCard
                        title={stationData.acMeter.name}
                        archIsDark={isDark}
                        className={`shadow-lg ${isDark ? 'ring-2 ring-brand-400/40' : 'ring-2 ring-brand-500/25'}`}
                        detailId="acMeter"
                        onOpenDetail={onOpenDetail}
                        detailButtonLabel={detailButtonLabel}
                    />
                    <FloatingData
                        p={stationData.acMeter.ac.p}
                        u={stationData.acMeter.ac.v}
                        i={stationData.acMeter.ac.i}
                        isDark={isDark}
                        style={{
                            top: '50%',
                            left: '100%',
                            marginLeft: '14px',
                            transform: 'translateY(-50%)',
                        }}
                    />
                </div>
            </div>

            <div
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
                style={{ left: X_ESS_PAIR_METER_LEFT, top: Y_ESS_PAIR_METER }}
            >
                <div className="relative inline-flex shrink-0 items-center overflow-visible">
                    <PccMeterCard
                        title={stationData.essPairAcMeter.name}
                        archIsDark={isDark}
                        className={`shadow-lg ${isDark ? 'ring-2 ring-orange-400/35' : 'ring-2 ring-orange-500/25'}`}
                        detailId="essPairMeter"
                        onOpenDetail={onOpenDetail}
                        detailButtonLabel={detailButtonLabel}
                    />
                    <FloatingData
                        p={stationData.essPairAcMeter.ac.p}
                        u={stationData.essPairAcMeter.ac.v}
                        i={stationData.essPairAcMeter.ac.i}
                        isDark={isDark}
                        style={{
                            top: '50%',
                            left: '100%',
                            marginLeft: '14px',
                            transform: 'translateY(-50%)',
                        }}
                    />
                </div>
            </div>

            <div style={{ position: 'absolute', top: Y_MAIN_ROW, left: X_DG, transform: 'translateX(-50%)', zIndex: 10 }}>
                <FloatingData
                    p={stationData.dg.ac.p}
                    u={stationData.dg.ac.v}
                    i={stationData.dg.ac.i}
                    isDark={isDark}
                    style={{ top: '-65px', left: '33%', marginLeft: '12px' }}
                />
                <NodeCard
                    title={stationData.dg.name}
                    icon={Droplets}
                    archIsDark={isDark}
                    className="w-[168px]"
                    style={{ position: 'relative' }}
                    variant="slate"
                    detailId="dg"
                    onOpenDetail={onOpenDetail}
                    detailButtonLabel={detailButtonLabel}
                >
                    <div className="mb-2 flex gap-2">
                        <span
                            className={`rounded-md border px-2 py-0.5 text-xs font-bold ${
                                isDark ? 'border-orange-500/60 bg-orange-500 text-black' : 'border-slate-200 bg-slate-100 text-slate-600'
                            }`}
                        >
                            Standby
                        </span>
                    </div>
                    <DataRow label="Frequency" value={stationData.dg.freq} />
                    <DataRow label="Fuel Level" value={stationData.dg.level} />
                    <DataRow label="Coolant" value={stationData.dg.temp} />
                </NodeCard>
            </div>

            <div style={{ position: 'absolute', top: Y_MAIN_ROW, left: X_ACPV, transform: 'translateX(-50%)', zIndex: 10 }}>
                <FloatingData
                    p={stationData.acPv.ac.p}
                    u={stationData.acPv.ac.v}
                    i={stationData.acPv.ac.i}
                    isDark={isDark}
                    style={{ top: '-65px', left: '33%', marginLeft: '12px' }}
                />
                <NodeCard
                    title={stationData.acPv.name}
                    icon={Sun}
                    archIsDark={isDark}
                    className="w-[168px]"
                    style={{ position: 'relative' }}
                    variant="slate"
                    detailId="acPv"
                    onOpenDetail={onOpenDetail}
                    detailButtonLabel={detailButtonLabel}
                >
                    <div className="mb-2 flex flex-col gap-1.5">
                        <StatusBadge level="Normal" text="Generating" />
                        <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Rated: {stationData.acPv.rated}</span>
                    </div>
                </NodeCard>
            </div>

            <div style={{ position: 'absolute', top: Y_MAIN_ROW, left: X_EVSE, transform: 'translateX(-50%)', zIndex: 10 }}>
                <FloatingData
                    p={stationData.evse.ac.p}
                    u={stationData.evse.ac.v}
                    i={stationData.evse.ac.i}
                    isDark={isDark}
                    style={{ top: '-65px', left: '33%', marginLeft: '12px' }}
                />
                <NodeCard
                    title={stationData.evse.name}
                    icon={Zap}
                    archIsDark={isDark}
                    className="w-[168px]"
                    style={{ position: 'relative' }}
                    variant="slate"
                    detailId="evse"
                    onOpenDetail={onOpenDetail}
                    detailButtonLabel={detailButtonLabel}
                >
                    <div className="mb-2 flex flex-col gap-1.5">
                        <StatusBadge level="Normal" text="Charging" />
                    </div>
                    <div
                        className={`border-t border-dashed pt-1 ${isDark ? 'border-zinc-700' : 'border-slate-200'}`}
                    >
                        <DataRow label="Input" value={stationData.evse.internal.input} />
                        <DataRow label="Output" value={stationData.evse.internal.output} highlight />
                    </div>
                </NodeCard>
            </div>

            <PcsCard
                data={stationData.pcs}
                isDark={isDark}
                style={{ top: Y_MAIN_ROW, left: X_PCS1, transform: 'translateX(-50%)' }}
                detailId="pcs1"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            />
            <PcsCard
                data={stationData.ess2.pcs}
                isDark={isDark}
                style={{ top: Y_MAIN_ESS23, left: X_PCS2, transform: 'translateX(-50%)' }}
                detailId="pcs2"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            />
            <PcsCard
                data={stationData.ess3.pcs}
                isDark={isDark}
                style={{ top: Y_MAIN_ESS23, left: X_PCS3, transform: 'translateX(-50%)' }}
                detailId="pcs3"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            />
            <PcsCard
                data={stationData.ess4.pcs}
                isDark={isDark}
                style={{ top: Y_MAIN_ESS23, left: X_PCS4, transform: 'translateX(-50%)' }}
                detailId="pcs4"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            />
            <PcsCard
                data={stationData.ess5.pcs}
                isDark={isDark}
                style={{ top: Y_MAIN_ESS23, left: X_PCS5, transform: 'translateX(-50%)' }}
                detailId="pcs5"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            />
            <PcsCard
                data={stationData.ess6.pcs}
                isDark={isDark}
                style={{ top: Y_MAIN_ESS23, left: X_PCS6, transform: 'translateX(-50%)' }}
                detailId="pcs6"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            />
            <NodeCard
                title={stationData.car.name}
                icon={Car}
                archIsDark={isDark}
                className="w-[168px]"
                style={{ top: Y_CAR_ROW, left: X_EVSE, transform: 'translateX(-50%)' }}
                variant="slate"
                detailId="car"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            >
                <div className={`mb-2 h-1.5 w-full overflow-hidden rounded-full ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                    <div
                        className={`h-full ${isDark ? 'bg-brand-400' : 'bg-brand-500'}`}
                        style={{ width: '34%' }}
                    />
                </div>
                <DataRow label="SOC" value={stationData.car.soc} highlight />
                <DataRow label="Demand" value={stationData.car.demand} />
            </NodeCard>

            <ArchBessCard
                title={bessTitle(stationData.battery.name)}
                soc={stationData.battery.soc}
                soh={stationData.battery.soh}
                vmax={stationData.battery.vmax}
                vmin={stationData.battery.vmin}
                tmax={stationData.battery.tmax}
                tmin={stationData.battery.tmin}
                status={stationData.battery.status}
                isDark={isDark}
                style={{ top: Y_SUB_ROW, left: X_BATTERY1, transform: 'translateX(-50%)', zIndex: 10 }}
                detailId="bess1"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            />

            <div style={{ position: 'absolute', top: Y_SUB_ROW, left: X_DCPV, transform: 'translateX(-50%)', zIndex: 10 }}>
                <FloatingData
                    p={stationData.dcPv.hv.p}
                    u={stationData.dcPv.hv.v}
                    i={stationData.dcPv.hv.i}
                    isDark={isDark}
                    style={{ top: '-85px', left: '33%', marginLeft: '12px' }}
                />
                <NodeCard
                    title={stationData.dcPv.name}
                    icon={Sun}
                    archIsDark={isDark}
                    className="w-[168px]"
                    style={{ position: 'relative' }}
                    variant="slate"
                    detailId="dcPv"
                    onOpenDetail={onOpenDetail}
                    detailButtonLabel={detailButtonLabel}
                >
                    <div className="mt-1 grid grid-cols-2 gap-1.5">
                        {stationData.dcPv.panels.map((p: any) => (
                            <div
                                key={p.id}
                                className={`rounded-lg border p-1.5 ${
                                    isDark ? 'border-zinc-700 bg-zinc-950/60' : 'border-slate-100 bg-slate-50'
                                }`}
                            >
                                <div className={`text-[10px] font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{p.id}</div>
                                <div className={`font-mono text-xs leading-tight ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>{p.p}</div>
                                <div className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{p.v}/{p.i}</div>
                            </div>
                        ))}
                    </div>
                </NodeCard>
            </div>

            <ArchBessCard
                title={bessTitle(stationData.ess2.bat.name)}
                soc={stationData.ess2.bat.soc}
                soh={stationData.ess2.bat.soh}
                vmax={stationData.ess2.bat.vmax}
                vmin={stationData.ess2.bat.vmin}
                tmax={stationData.ess2.bat.tmax}
                tmin={stationData.ess2.bat.tmin}
                status={stationData.ess2.bat.status}
                isDark={isDark}
                style={{
                    top: Y_SUB_ROW_CLOSE_ESS23,
                    left: X_PCS2 + BATTERY_OFFSET_X,
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                }}
                detailId="bess2"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            />

            <ArchBessCard
                title={bessTitle(stationData.ess3.bat.name)}
                soc={stationData.ess3.bat.soc}
                soh={stationData.ess3.bat.soh}
                vmax={stationData.ess3.bat.vmax}
                vmin={stationData.ess3.bat.vmin}
                tmax={stationData.ess3.bat.tmax}
                tmin={stationData.ess3.bat.tmin}
                status={stationData.ess3.bat.status}
                isDark={isDark}
                style={{
                    top: Y_SUB_ROW_CLOSE_ESS23,
                    left: X_PCS3 + BATTERY_OFFSET_X,
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                }}
                detailId="bess3"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            />

            <ArchBessCard
                title={bessTitle(stationData.ess4.bat.name)}
                soc={stationData.ess4.bat.soc}
                soh={stationData.ess4.bat.soh}
                vmax={stationData.ess4.bat.vmax}
                vmin={stationData.ess4.bat.vmin}
                tmax={stationData.ess4.bat.tmax}
                tmin={stationData.ess4.bat.tmin}
                status={stationData.ess4.bat.status}
                isDark={isDark}
                style={{
                    top: Y_SUB_ROW_CLOSE_ESS23,
                    left: X_PCS4 + BATTERY_OFFSET_X,
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                }}
                detailId="bess4"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            />
            <ArchBessCard
                title={bessTitle(stationData.ess5.bat.name)}
                soc={stationData.ess5.bat.soc}
                soh={stationData.ess5.bat.soh}
                vmax={stationData.ess5.bat.vmax}
                vmin={stationData.ess5.bat.vmin}
                tmax={stationData.ess5.bat.tmax}
                tmin={stationData.ess5.bat.tmin}
                status={stationData.ess5.bat.status}
                isDark={isDark}
                style={{
                    top: Y_SUB_ROW_CLOSE_ESS23,
                    left: X_PCS5 + BATTERY_OFFSET_X,
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                }}
                detailId="bess5"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            />
            <ArchBessCard
                title={bessTitle(stationData.ess6.bat.name)}
                soc={stationData.ess6.bat.soc}
                soh={stationData.ess6.bat.soh}
                vmax={stationData.ess6.bat.vmax}
                vmin={stationData.ess6.bat.vmin}
                tmax={stationData.ess6.bat.tmax}
                tmin={stationData.ess6.bat.tmin}
                status={stationData.ess6.bat.status}
                isDark={isDark}
                style={{
                    top: Y_SUB_ROW_CLOSE_ESS23,
                    left: X_PCS6 + BATTERY_OFFSET_X,
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                }}
                detailId="bess6"
                onOpenDetail={onOpenDetail}
                detailButtonLabel={detailButtonLabel}
            />
        </div>
    );
};

// --- Main Component ---

const StationArchitecture: React.FC<StationArchitectureProps> = ({ lang, theme, selectedStation }) => {
  const t = translations[lang].architecture;
  const showDiagram = selectedStation.includes('#2') || selectedStation.includes('Munich') || selectedStation.includes('慕尼黑');
  const stationData = lang === 'zh' ? STATION_DATA_ZH : STATION_DATA_EN;

  const [archDetailId, setArchDetailId] = useState<ArchDetailId | null>(null);

  // View State
  const [activeView, setActiveView] = useState<ArchView>('power');

  useEffect(() => {
      if (!showDiagram) setArchDetailId(null);
  }, [showDiagram]);

  useEffect(() => {
      setArchDetailId(null);
  }, [activeView]);

  // Zoom & Pan State
  const [scale, setScale] = useState(ARCH_DIAGRAM_DEFAULT_SCALE);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [savedView, setSavedView] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize view: Load from local storage OR center default
  useEffect(() => {
      if (containerRef.current && showDiagram) {
          const storedView = localStorage.getItem(`station_arch_view_${activeView}`);
          
          if (storedView) {
              try {
                  const { x, y, scale: savedScale } = JSON.parse(storedView);
                  setPosition({ x, y });
                  setScale(savedScale);
                  return;
              } catch (e) {
                  console.error("Failed to parse saved view", e);
              }
          }

          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight;
          const targetWidth = ARCH_DIAGRAM_WIDTH;
          const targetHeight = ARCH_DIAGRAM_HEIGHT;

          let nextScale = ARCH_DIAGRAM_DEFAULT_SCALE;
          if (containerWidth < targetWidth) {
              nextScale = Math.max(0.4, (containerWidth - 40) / targetWidth);
          }
          setScale(nextScale);
          const scaledW = targetWidth * nextScale;
          const scaledH = targetHeight * nextScale;
          const x = (containerWidth - scaledW) / 2;
          const y = (containerHeight - scaledH) / 2 > 0 ? (containerHeight - scaledH) / 2 : 20;
          setPosition({ x, y });
      }
  }, [showDiagram, activeView]);

  useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
              if (archDetailId) setArchDetailId(null);
              else if (isFullScreen) setIsFullScreen(false);
          }
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullScreen, archDetailId]);

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!showDiagram) return;
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
          x: e.clientX - startPos.x,
          y: e.clientY - startPos.y
      });
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.1, 2));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.1, 0.3));
  const handleReset = () => {
      if (containerRef.current) {
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight;
          const tw = ARCH_DIAGRAM_WIDTH;
          const th = ARCH_DIAGRAM_HEIGHT;
          let nextScale = ARCH_DIAGRAM_DEFAULT_SCALE;
          if (w < tw) {
              nextScale = Math.max(0.4, (w - 40) / tw);
          }
          setScale(nextScale);
          const scaledW = tw * nextScale;
          const scaledH = th * nextScale;
          setPosition({ x: (w - scaledW) / 2, y: (h - scaledH) / 2 > 0 ? (h - scaledH) / 2 : 20 });
          localStorage.removeItem(`station_arch_view_${activeView}`);
          setSavedView(false);
      }
  };

  useEffect(() => {
    if(isFullScreen) {
        setTimeout(handleReset, 50);
    }
  }, [isFullScreen]);

  const handleSaveView = () => {
      const viewState = { x: position.x, y: position.y, scale };
      localStorage.setItem(`station_arch_view_${activeView}`, JSON.stringify(viewState));
      setSavedView(true);
      setTimeout(() => setSavedView(false), 2000);
  };

  return (
    <div className={`relative overflow-hidden bg-slate-50 dark:bg-apple-bg-dark text-slate-800 dark:text-slate-200 font-sans selection:bg-blue-100 dark:selection:bg-blue-500/30 flex flex-col transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-[100] w-screen h-screen' : 'w-full h-[calc(100vh-72px)]'}`}>
      
      {/* Floating Header Menu (Responsive) */}
      {!isFullScreen && (
        <div className="absolute top-4 left-4 right-4 z-40 pointer-events-none flex flex-col md:flex-row justify-between items-start gap-4">
            {/* Left: Station Info & Toggle */}
            <div className="flex flex-col gap-3 pointer-events-auto">
                {/* Architecture Type Switcher */}
                <div className="bg-white/90 dark:bg-apple-surface-dark/90 backdrop-blur p-1 rounded-xl shadow-sm border border-slate-200 dark:border-apple-border-dark flex gap-1">
                    <button 
                        onClick={() => setActiveView('power')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2
                        ${activeView === 'power' 
                            ? 'bg-brand-600 text-white shadow-md' 
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'}`}
                    >
                        <Zap size={14} />
                        {lang === 'zh' ? t.powerViewZh : t.powerView}
                    </button>
                    <button 
                        onClick={() => setActiveView('overview')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2
                        ${activeView === 'overview' 
                            ? 'bg-brand-600 text-white shadow-md' 
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'}`}
                    >
                        <Share2 size={14} />
                        {lang === 'zh' ? t.overviewViewZh : t.overviewView}
                    </button>
                </div>
            </div>

            {/* Right: Legend */}
            <div className="bg-white/90 dark:bg-apple-surface-dark/90 backdrop-blur shadow-sm border border-slate-200 dark:border-apple-border-dark rounded-xl p-2 pointer-events-auto transition-all hover:shadow-md ml-auto md:ml-0">
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 px-2">
                    {activeView === 'power' ? (
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-brand-500"></span>
                            {lang === 'zh' ? '功率流' : 'Power Flow'}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-brand-500 border-t-2 border-dashed border-brand-500"></span> WAN</div>
                            <div className="w-px h-3 bg-slate-200 dark:bg-white/10"></div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Local Link</div>
                        </>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Main Diagram Area (Pannable/Zoomable) */}
      <div 
        ref={containerRef}
        className={`flex-1 w-full h-full overflow-hidden relative ${showDiagram ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
          {showDiagram ? (
              <>
                <div 
                    style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, 
                        transformOrigin: '0 0',
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    className="absolute top-0 left-0 w-fit h-fit"
                >
                    <StationDiagram
                        stationData={stationData}
                        view={activeView}
                        lang={lang}
                        isDark={theme === 'dark'}
                        onOpenDetail={setArchDetailId}
                        detailButtonLabel={t.detailData}
                    />
                </div>

                {/* Zoom Controls */}
                <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-white/90 dark:bg-apple-surface-dark/90 backdrop-blur p-2 rounded-xl shadow-lg border border-slate-200 dark:border-apple-border-dark z-50">
                    <button 
                        onClick={handleZoomIn}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                        title="Zoom In"
                    >
                        <Plus size={20} />
                    </button>
                    <button 
                        onClick={handleReset}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                        title="Reset View"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button 
                        onClick={handleZoomOut}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded-lg text-slate-600 dark:text-slate-400 transition-colors"
                        title="Zoom Out"
                    >
                        <Minus size={20} />
                    </button>
                    
                    <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                    
                    <button 
                        onClick={handleSaveView}
                        className={`p-2 rounded-lg transition-colors ${savedView ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'}`}
                        title="Save Current View"
                    >
                        <Save size={18} />
                    </button>

                    <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>

                    <button 
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className={`p-2 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark`}
                        title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                    >
                        {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>

                    <div className="h-px bg-slate-200 dark:bg-white/10 my-1"></div>
                    
                    <div className="text-[10px] font-bold text-center text-slate-400 select-none">
                        {Math.round(scale * 100)}%
                    </div>
                </div>
              </>
          ) : (
              <div className="w-full h-full flex flex-col items-center justify-center min-h-[500px]">
                  <div className="p-4 bg-slate-100 dark:bg-apple-surface-dark rounded-full mb-4">
                      <Network size={32} className="text-slate-400" />
                  </div>
                  <div className="text-center text-slate-400 dark:text-slate-600 max-w-sm px-4">
                     <p className="text-sm font-medium">
                       {lang === 'zh' ? '当前站点暂无拓扑图' : 'Topology diagram is not available for this station.'}
                     </p>
                     <p className="text-xs mt-2 opacity-80 leading-relaxed">
                       {lang === 'zh' ? '请选择已配置微电网拓扑的站点查看。' : 'Select a station that has a microgrid topology configured.'}
                     </p>
                  </div>
              </div>
          )}
      </div>

      {showDiagram && (
          <ArchitectureDetailDrawer
              detailId={archDetailId}
              onClose={() => setArchDetailId(null)}
              stationData={stationData}
              lang={lang}
              isDark={theme === 'dark'}
              panelTitle={t.detailPanelTitle}
          />
      )}
    </div>
  );
};

export default StationArchitecture;
