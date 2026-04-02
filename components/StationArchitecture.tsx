
import React, { useState, useRef, useEffect } from 'react';
import { Language, Theme } from '../types';
import { 
    Zap, Sun, Battery, Network, Cloud, Car, Droplets, Gauge,
    CheckCircle2, AlertTriangle, XCircle, Info,
    Plus, Minus, RefreshCw, Save, Maximize, Minimize,
    Server, Laptop, Globe, Share2,
    ArrowUp, ArrowDown, Thermometer
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
    battery: {
        name: '#1', soc: '78.5%', soh: '99.1%',
        vmax: '3.45 V', vmin: '3.12 V', tmax: '32°C', tmin: '24°C',
        status: 0 // 0: Normal, 1: Hint, 2: Warn, 3: Fault
    },
    dcPv: {
        name: 'Carport PV (DC)',
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
    }
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
    battery: {
        name: '#1', soc: '78.5%', soh: '99.1%',
        vmax: '3.45 V', vmin: '3.12 V', tmax: '32°C', tmin: '24°C',
        status: 0 // 0: Normal, 1: Hint, 2: Warn, 3: Fault
    },
    dcPv: {
        name: '车棚光伏 (DC耦合)',
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
    }
};

// --- Architecture diagram theme (matches reference: dark lime “command center” / light olive-green cards) ---

const getArchTheme = (isDark: boolean) => ({
    isDark,
    canvas: isDark ? 'bg-black border-zinc-800/90' : 'bg-slate-100/90 border-slate-200',
    gridDot: isDark ? 'rgba(63,63,70,0.45)' : 'rgba(148,163,184,0.35)',
    strokeAC: isDark ? '#fb923c' : '#ea580c',
    strokeDC: isDark ? '#a3e635' : '#16a34a',
    strokeBusH: isDark ? '#a3e635' : '#ea580c',
    strokeComm: isDark ? '#a3e635' : '#819226',
    ringTrack: isDark ? '#3f3f46' : '#e2e8f0',
    ringLow: '#fb923c',
    ringHigh: isDark ? '#a3e635' : '#16a34a',
    cardShell: isDark
        ? 'bg-zinc-900/95 border-zinc-700/90'
        : 'bg-white border-slate-200 shadow-[0_4px_12px_rgba(0,0,0,0.06)]',
    cardHeader: isDark ? 'bg-lime-400 text-black' : 'bg-emerald-100 text-emerald-900',
    textMain: isDark ? 'text-white' : 'text-slate-900',
    textSub: isDark ? 'text-zinc-400' : 'text-slate-500',
    pillSolid: isDark ? 'bg-lime-400 text-black border-lime-300' : 'bg-emerald-600 text-white border-emerald-500',
    pcsOutline: isDark ? 'border-lime-400 bg-black/40 text-lime-400' : 'border-emerald-600 bg-white text-emerald-700',
});

// --- Helper Components ---

const StatusBadge = ({ level, text }: { level: number | string, text?: string }) => {
    let bg = 'bg-emerald-100 dark:bg-emerald-900/30';
    let textCol = 'text-emerald-700 dark:text-emerald-400';
    let icon = <CheckCircle2 size={12} />;
    let label = text || 'Normal';

    if (level === 1 || level === 'Hint') {
        bg = 'bg-blue-100 dark:bg-blue-900/30';
        textCol = 'text-blue-700 dark:text-blue-400';
        icon = <Info size={12} />;
        if (!text) label = 'Hint L1';
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
        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-transparent ${bg} ${textCol}`}>
            {icon} {label}
        </span>
    );
};

// Floating Data Component for Lines (AC/DC) — P 主数值突出，U/I 次级灰字
const FloatingData = ({
    p,
    u,
    i,
    type = 'ac',
    style,
    isDark,
}: {
    p: string;
    u: string;
    i: string;
    type?: 'ac' | 'dc';
    style?: React.CSSProperties;
    isDark: boolean;
}) => {
    const labelAC = isDark ? 'text-orange-400' : 'text-orange-600';
    const labelDC = isDark ? 'text-lime-400' : 'text-green-600';
    const label = type === 'ac' ? labelAC : labelDC;
    const dotAC = isDark ? 'bg-orange-400 border-black' : 'bg-orange-500 border-white';
    const dotDC = isDark ? 'bg-lime-400 border-black' : 'bg-green-500 border-white';
    return (
        <div className="absolute flex flex-col gap-0.5 z-0 text-sm whitespace-nowrap pointer-events-none" style={style}>
            <div
                className={`absolute -left-3 w-2 h-2 rounded-full border-2 ${
                    type === 'ac' ? `${dotAC} top-[100%] -translate-y-2` : `${dotDC} top-[-4px]`
                }`}
            />
            <div className="flex items-center gap-2">
                <span className={`${label} font-bold w-3`}>P</span>
                <span className={`font-mono font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{p}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={`${label} font-bold w-3`}>U</span>
                <span className={`font-mono text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{u}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={`${label} font-bold w-3`}>I</span>
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
                className={`flex items-center justify-between mb-2 pb-2 border-b ${
                    archIsDark === true ? 'border-zinc-700' : archIsDark === false ? 'border-slate-100' : 'border-black/5 dark:border-apple-border-dark'
                }`}
            >
                <div className="flex items-center gap-2">
                    <div
                        className={`p-1.5 rounded-lg shadow-sm ${
                            archIsDark === true
                                ? 'bg-zinc-800 text-lime-400'
                                : archIsDark === false
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-white/60 dark:bg-apple-surface-secondary-dark text-slate-600 dark:text-slate-400'
                        }`}
                    >
                        <Icon size={16} />
                    </div>
                    <span
                        className={`text-sm font-bold ${
                            archIsDark === true ? 'text-white' : archIsDark === false ? 'text-slate-900' : 'text-slate-800 dark:text-slate-200'
                        }`}
                    >
                        {title}
                    </span>
                </div>
            </div>
            <div className="space-y-1.5">{children}</div>
        </div>
    );
};

const PcsCard = ({ data, style, isDark }: { data: any; style: React.CSSProperties; isDark: boolean }) => {
    const th = getArchTheme(isDark);
    const box = th.pcsOutline;
    return (
        <div className="absolute z-10 w-24 flex flex-col items-center justify-center overflow-visible" style={style}>
            <FloatingData
                p={data.ac.p}
                u={data.ac.v}
                i={data.ac.i}
                type="ac"
                isDark={isDark}
                style={{ top: '-65px', left: '33%', marginLeft: '12px' }}
            />
            <div
                className={`w-[4.75rem] h-[4.75rem] rounded-2xl border-2 shadow-lg relative z-10 flex flex-col items-center justify-center gap-0.5 ${box}`}
            >
                <span className={`text-[11px] font-black tracking-tight ${isDark ? 'text-lime-400' : 'text-emerald-700'}`}>PCS</span>
                <svg viewBox="0 0 100 100" className="w-9 h-9 opacity-90" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect
                        x="5"
                        y="15"
                        width="90"
                        height="70"
                        rx="8"
                        className={isDark ? 'stroke-lime-500/60 fill-lime-500/5' : 'stroke-emerald-500/50 fill-emerald-50'}
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
                        className={isDark ? 'stroke-lime-400' : 'stroke-green-600'}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                    />
                    <line
                        x1="30"
                        y1="75"
                        x2="70"
                        y2="75"
                        className={isDark ? 'stroke-lime-400' : 'stroke-green-600'}
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
                                          ? 'bg-lime-950/50 text-lime-300 border-lime-700'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
            </div>
            <FloatingData
                p={data.dc?.p || '-'}
                u={data.dc?.v || '-'}
                i={data.dc?.i || '-'}
                type="dc"
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
}) => {
    const th = getArchTheme(isDark);
    const rowBg = isDark ? 'bg-zinc-800/90' : 'bg-slate-100';
    const iconBox = isDark ? 'bg-zinc-800 border-zinc-600 text-lime-400' : 'bg-white border-slate-200 text-emerald-700';

    return (
        <div
            className={`absolute z-10 w-[168px] overflow-hidden rounded-2xl border ${th.cardShell} ${className}`}
            style={style}
        >
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
                                <ArrowDown className="shrink-0 text-emerald-500" size={12} strokeWidth={2.5} />
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
                                <ArrowDown className="shrink-0 text-emerald-500" size={12} strokeWidth={2.5} />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DataRow = ({ label, value, subValue, highlight = false }: any) => (
    <div className="flex justify-between items-center text-xs">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <div className="flex items-center gap-1">
            <span className={`font-mono font-bold ${highlight ? 'text-brand-600 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {value}
            </span>
            {subValue && <span className="text-slate-400 scale-90">{subValue}</span>}
        </div>
    </div>
);

// --- Architecture Diagram Component ---

const StationDiagram = ({
    stationData,
    view,
    lang,
    isDark,
}: {
    stationData: any;
    view: ArchView;
    lang: Language;
    isDark: boolean;
}) => {
    const WIDTH = 1700;
    const HEIGHT = 900;
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

        return (
            <div
                className={`relative rounded-xl overflow-hidden shadow-2xl border ${th.canvas}`}
                style={{ width: WIDTH, height: HEIGHT }}
            >
                <div
                    className="absolute inset-0 pointer-events-none z-0"
                    style={{
                        opacity: isDark ? 0.35 : 0.5,
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
                    className="flex flex-col items-center"
                >
                    <div
                        className={`flex items-center gap-4 rounded-2xl border-2 p-4 shadow-xl ${
                            isDark ? 'border-lime-300 bg-lime-400 text-black' : 'border-emerald-500 bg-emerald-600 text-white'
                        }`}
                    >
                        <Cloud size={40} className={isDark ? 'text-black' : 'text-white'} />
                        <div>
                            <div className="text-lg font-black">EcoWatt Cloud EMS</div>
                            <div className={`font-mono text-xs ${isDark ? 'text-black/70' : 'text-white/80'}`}>v4.2.0 (Global Cluster)</div>
                        </div>
                    </div>
                </div>

                {/* Level 2: Edge Gateway */}
                <div
                    style={{ position: 'absolute', top: Y_EDGE, left: X_EDGE, transform: 'translateX(-50%)' }}
                    className="flex flex-col items-center"
                >
                    <div
                        className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 shadow-lg ${
                            isDark
                                ? 'border-lime-400/50 bg-zinc-900/95 text-white'
                                : 'border-emerald-200 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)]'
                        }`}
                    >
                        <div
                            className={`rounded-full p-3 ${
                                isDark ? 'bg-lime-400/15 text-lime-400' : 'bg-emerald-50 text-emerald-700'
                            }`}
                        >
                            <Server size={32} />
                        </div>
                        <div className="text-center">
                            <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>EMS Edge Gateway #2</div>
                            <div
                                className={`mt-1 text-[10px] font-black uppercase tracking-widest ${
                                    isDark ? 'text-lime-400' : 'text-emerald-600'
                                }`}
                            >
                                Status: Operational
                            </div>
                        </div>
                    </div>
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
                             <Globe size={16} className={isDark ? 'text-lime-400' : 'text-blue-600'} />
                             <span className={`text-xs font-black uppercase tracking-wider ${th.textSub}`}>{lang==='zh'?'电网侧':'Grid Interface'}</span>
                        </div>
                        <div className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-slate-100 bg-slate-50/80'}`}>
                            <div className="mb-2 flex items-center gap-2">
                                <Zap size={14} className={isDark ? 'text-lime-400' : 'text-blue-600'} />
                                <span className={`text-xs font-bold ${th.textMain}`}>10kV Grid Connection</span>
                            </div>
                            <DataRow label="Import" value="450 kW" highlight />
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
                            </div>
                            <div className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-slate-100 bg-slate-50/80'}`}>
                                <div className={`mb-1 text-xs font-bold ${th.textMain}`}>Diesel Generator</div>
                                <DataRow label="Status" value="Standby" />
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
                             <Battery size={16} className={isDark ? 'text-lime-400' : 'text-purple-600'} />
                             <span className={`text-xs font-black uppercase tracking-wider ${th.textSub}`}>{lang==='zh'?'储能核心':'BESS'}</span>
                        </div>
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`overflow-hidden rounded-xl border ${isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-slate-100 bg-white'}`}>
                                    <div className={`px-2 py-1.5 text-center text-[10px] font-black ${th.cardHeader}`}>
                                        BESS #{i}
                                    </div>
                                    <div className="p-2.5">
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <span className={`text-[10px] font-bold ${th.textSub}`}>SOC</span>
                                            <span className={`rounded px-1 text-[9px] font-bold ${isDark ? 'bg-lime-400/20 text-lime-400' : 'bg-emerald-100 text-emerald-800'}`}>Online</span>
                                        </div>
                                        <div className={`h-1.5 w-full overflow-hidden rounded-full ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}>
                                            <div
                                                className={`h-full ${isDark ? 'bg-lime-400' : 'bg-emerald-500'}`}
                                                style={{ width: i===1?'78%':(i===2?'45%':'92%') }}
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
                             <Laptop size={16} className={isDark ? 'text-orange-400' : 'text-emerald-600'} />
                             <span className={`text-xs font-black uppercase tracking-wider ${th.textSub}`}>{lang==='zh'?'负荷消纳':'Consumption'}</span>
                        </div>
                        <div className="space-y-2">
                            <div className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-slate-100 bg-slate-50/80'}`}>
                                <div className={`mb-1 text-xs font-bold ${th.textMain}`}>EV Charging Station</div>
                                <DataRow label="Demand" value="120 kW" highlight />
                            </div>
                            <div className={`rounded-xl border p-3 ${isDark ? 'border-zinc-700 bg-zinc-950/50' : 'border-slate-100 bg-slate-50/80'}`}>
                                <div className={`mb-1 text-xs font-bold ${th.textMain}`}>Building Load</div>
                                <DataRow label="Usage" value="325 kW" highlight />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- POWER ARCHITECTURE DESIGN (Original SLD Style) ---
    // (Existing physical SLD code preserved here)
    const Y_BUSBAR = 190;
    /** 主干竖线在 PCC 表计处断开，避免与卡片重叠（与顶部 flex：Grid → 短线 → NodeCard 的近似像素对齐） */
    const Y_TRUNK_FROM_GRID = 48;
    const Y_TRUNK_STOP_BEFORE_PCC = 73;
    const Y_TRUNK_RESUME_AFTER_PCC = 218;
    const Y_MAIN_ROW = 262; 
    const Y_DC_START = Y_MAIN_ROW + 80; 
    const Y_EVSE_DC_START = Y_MAIN_ROW + 100;
    const Y_SPLIT_PCS1 = 480; 
    const Y_SUB_ROW = 560;    
    const Y_SUB_ROW_CLOSE = 430; 

    const X_DG = 289;
    const X_ACPV = 476;
    const X_EVSE = 663;
    const X_PCS1 = 944; 
    const X_BATTERY1 = 850; 
    const X_DCPV = 1038;
    const X_PCS2 = 1225;
    const X_PCS3 = 1412;

    const OFFSET_PCS = -14; 
    const OFFSET_STD = -26;
    const BATTERY_OFFSET_X = 12;

    const trunkStroke = isDark ? th.strokeDC : th.strokeAC;
    const busStroke = th.strokeBusH;
    const acTap = th.strokeAC;
    const dcRun = th.strokeDC;

    const bessTitle = (name: string) =>
        lang === 'zh' ? `${String(name).replace('#', '')}#BESS` : `BESS ${name}`;

    return (
        <div className={`relative overflow-hidden rounded-xl border shadow-2xl ${th.canvas}`} style={{ width: WIDTH, height: HEIGHT }}>
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                    opacity: isDark ? 0.4 : 0.45,
                    backgroundImage: `radial-gradient(${th.gridDot} 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                }}
            />

            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" style={{ overflow: 'visible' }}>
                <defs>
                    <marker id="arrowhead-power" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon
                            points="0 0, 10 3.5, 0 7"
                            fill={isDark ? '#52525b' : '#cbd5e1'}
                        />
                    </marker>
                </defs>
                <path
                    d={`M${CENTER_X} ${Y_TRUNK_FROM_GRID} V ${Y_TRUNK_STOP_BEFORE_PCC}`}
                    stroke={trunkStroke}
                    strokeWidth={2}
                    fill="none"
                />
                <path
                    d={`M${CENTER_X} ${Y_TRUNK_RESUME_AFTER_PCC} V ${Y_BUSBAR}`}
                    stroke={trunkStroke}
                    strokeWidth={2}
                    fill="none"
                />
                <path d={`M220 ${Y_BUSBAR} H 1480`} stroke={busStroke} strokeWidth={2} fill="none" />
                <rect x="210" y={Y_BUSBAR - 2} width="1280" height="4" rx="2" fill={busStroke} />
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
                <path d={`M${X_PCS2 + OFFSET_PCS} ${Y_BUSBAR} V ${Y_MAIN_ROW}`} stroke={acTap} strokeWidth={2} fill="none" />
                <path d={`M${X_PCS3 + OFFSET_PCS} ${Y_BUSBAR} V ${Y_MAIN_ROW}`} stroke={acTap} strokeWidth={2} fill="none" />
                <path
                    d={`M${X_EVSE + OFFSET_STD} ${Y_EVSE_DC_START} V 400`}
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
                <path d={`M${X_PCS2 + OFFSET_PCS} ${Y_DC_START} V ${Y_SUB_ROW_CLOSE}`} stroke={dcRun} strokeWidth={2} fill="none" />
                <path d={`M${X_PCS3 + OFFSET_PCS} ${Y_DC_START} V ${Y_SUB_ROW_CLOSE}`} stroke={dcRun} strokeWidth={2} fill="none" />
            </svg>

            <div className="absolute left-[50%] top-0 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5">
                <div
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 shadow-lg ${th.pillSolid}`}
                >
                    <Cloud size={18} className={isDark ? 'text-black' : 'text-white'} />
                    <span className={`text-sm font-black ${isDark ? 'text-black' : 'text-white'}`}>{stationData.grid.name}</span>
                    <span
                        className={`rounded-md px-1.5 py-0.5 font-mono text-xs font-bold ${
                            isDark ? 'bg-black/15 text-black' : 'bg-white/20 text-white'
                        }`}
                    >
                        {stationData.grid.voltage}
                    </span>
                </div>
                {/* 与 SVG 上段主干衔接的短线；表计放在独立层，避免 SVG 竖线贯穿 */}
                <div className="h-3 w-px shrink-0 rounded-full" style={{ background: trunkStroke }} />
                <div className="relative z-30 w-[160px]">
                    <NodeCard
                        title={stationData.acMeter.name}
                        icon={Gauge}
                        archIsDark={isDark}
                        className={`w-full shadow-lg ${isDark ? 'ring-2 ring-lime-400/35' : 'ring-2 ring-emerald-500/25'}`}
                        style={{ position: 'relative' }}
                    >
                        <DataRow label="Power" value={stationData.acMeter.ac.p} highlight />
                        <DataRow label="Current" value={stationData.acMeter.ac.i} />
                        <DataRow label="Voltage" value={stationData.acMeter.ac.v} />
                    </NodeCard>
                </div>
            </div>

            <div style={{ position: 'absolute', top: Y_MAIN_ROW, left: X_DG, transform: 'translateX(-50%)', zIndex: 10 }}>
                <FloatingData
                    p={stationData.dg.ac.p}
                    u={stationData.dg.ac.v}
                    i={stationData.dg.ac.i}
                    type="ac"
                    isDark={isDark}
                    style={{ top: '-65px', left: '33%', marginLeft: '12px' }}
                />
                <NodeCard
                    title={stationData.dg.name}
                    icon={Droplets}
                    archIsDark={isDark}
                    className="w-[154px]"
                    style={{ position: 'relative' }}
                    variant="slate"
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
                    type="ac"
                    isDark={isDark}
                    style={{ top: '-65px', left: '33%', marginLeft: '12px' }}
                />
                <NodeCard
                    title={stationData.acPv.name}
                    icon={Sun}
                    archIsDark={isDark}
                    className="w-[154px]"
                    style={{ position: 'relative' }}
                    variant="slate"
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
                    type="ac"
                    isDark={isDark}
                    style={{ top: '-65px', left: '33%', marginLeft: '12px' }}
                />
                <NodeCard
                    title={stationData.evse.name}
                    icon={Zap}
                    archIsDark={isDark}
                    className="w-[154px]"
                    style={{ position: 'relative' }}
                    variant="slate"
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

            <PcsCard data={stationData.pcs} isDark={isDark} style={{ top: Y_MAIN_ROW, left: X_PCS1, transform: 'translateX(-50%)' }} />
            <PcsCard data={stationData.ess2.pcs} isDark={isDark} style={{ top: Y_MAIN_ROW, left: X_PCS2, transform: 'translateX(-50%)' }} />
            <PcsCard data={stationData.ess3.pcs} isDark={isDark} style={{ top: Y_MAIN_ROW, left: X_PCS3, transform: 'translateX(-50%)' }} />
            <NodeCard
                title={stationData.car.name}
                icon={Car}
                archIsDark={isDark}
                className="w-[154px]"
                style={{ top: 400, left: X_EVSE, transform: 'translateX(-50%)' }}
                variant="slate"
            >
                <div className={`mb-2 h-1.5 w-full overflow-hidden rounded-full ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                    <div
                        className={`h-full ${isDark ? 'bg-lime-400' : 'bg-emerald-500'}`}
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
            />

            <div style={{ position: 'absolute', top: Y_SUB_ROW, left: X_DCPV, transform: 'translateX(-50%)', zIndex: 10 }}>
                <FloatingData
                    p={stationData.dcPv.hv.p}
                    u={stationData.dcPv.hv.v}
                    i={stationData.dcPv.hv.i}
                    type="dc"
                    isDark={isDark}
                    style={{ top: '-85px', left: '33%', marginLeft: '12px' }}
                />
                <NodeCard
                    title={stationData.dcPv.name}
                    icon={Sun}
                    archIsDark={isDark}
                    className="w-[154px]"
                    style={{ position: 'relative' }}
                    variant="slate"
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
                    top: Y_SUB_ROW_CLOSE,
                    left: X_PCS2 + BATTERY_OFFSET_X,
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                }}
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
                    top: Y_SUB_ROW_CLOSE,
                    left: X_PCS3 + BATTERY_OFFSET_X,
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                }}
            />
        </div>
    );
};

// --- Main Component ---

const StationArchitecture: React.FC<StationArchitectureProps> = ({ lang, theme, selectedStation }) => {
  const t = translations[lang].architecture;
  const showDiagram = selectedStation.includes('#2') || selectedStation.includes('Munich') || selectedStation.includes('慕尼黑');
  const stationData = lang === 'zh' ? STATION_DATA_ZH : STATION_DATA_EN;

  // View State
  const [activeView, setActiveView] = useState<ArchView>('power');

  // Zoom & Pan State
  const [scale, setScale] = useState(0.85);
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
          const targetWidth = 1700;
          const targetHeight = 900;

          const x = (containerWidth - targetWidth) / 2;
          const y = (containerHeight - targetHeight) / 2 > 0 ? (containerHeight - targetHeight) / 2 : 20;
          
          setPosition({ x, y });
          
          if (containerWidth < targetWidth) {
              const fitScale = (containerWidth - 40) / targetWidth;
              setScale(Math.max(0.4, fitScale));
          }
      }
  }, [showDiagram, activeView]);

  useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
          if (e.key === 'Escape' && isFullScreen) setIsFullScreen(false);
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullScreen]);

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
          setPosition({ x: (w - 1700) / 2, y: (h - 900) / 2 > 0 ? (h - 900) / 2 : 20 });
          setScale(w < 1700 ? (w - 40)/1700 : 1);
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
                        <>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span> AC</div>
                            <div className="w-px h-3 bg-slate-200 dark:bg-white/10"></div>
                            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-600 dark:bg-lime-400"></span> DC</div>
                        </>
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
    </div>
  );
};

export default StationArchitecture;
