import React from 'react';
import { Battery, Sun, Cable, RotateCw, Zap, ArrowUp, ArrowDown, Activity, Thermometer, Car } from 'lucide-react';
import { Language } from '../../types';

type CabinetStatus = 'online' | 'warning' | 'fault' | 'offline';

export interface StationRealtimeCabinetT {
  soc: string;
  soh: string;
  ac: string;
  dc: string;
  vmaxMin: string;
  tmaxMin: string;
  statusOnline: string;
  statusWarning: string;
  statusFault: string;
  statusOffline: string;
  dash: string;
  pvDetailTitle?: string;
  evseDetailTitle?: string;
  dgDetailTitle?: string;
  efficiency?: string;
  outputKw?: string;
  viewDetails?: string;
}

interface EssCabinet {
  id: string;
  status: CabinetStatus;
  soc: number;
  soh: number;
  acKw: number;
  acV: number;
  acA: [number, number, number];
  dcKw: number;
  dcV: number;
  dcA: number;
  vmax: string;
  vmin: string;
  tmax: string;
  tmin: string;
}

const ESS_CABINETS: EssCabinet[] = [
  { id: '1-1', status: 'online', soc: 68, soh: 92.3, acKw: 125, acV: 400, acA: [76, 75, 76], dcKw: 128, dcV: 750, dcA: 121, vmax: '3.654', vmin: '3.280', tmax: '32.5', tmin: '24.1' },
  { id: '1-2', status: 'online', soc: 72, soh: 93.1, acKw: 130, acV: 401, acA: [78, 77, 77], dcKw: 132, dcV: 752, dcA: 125, vmax: '3.648', vmin: '3.295', tmax: '31.8', tmin: '24.5' },
  { id: '2-1', status: 'warning', soc: 4, soh: 89.2, acKw: 98, acV: 398, acA: [61, 59, 60], dcKw: 96, dcV: 748, dcA: 109, vmax: '3.672', vmin: '3.265', tmax: '38.2', tmin: '26.1' },
  { id: '2-2', status: 'fault', soc: 12, soh: 88.0, acKw: 0, acV: 0, acA: [0, 0, 0], dcKw: 0, dcV: 0, dcA: 0, vmax: '3.701', vmin: '3.210', tmax: '42.0', tmin: '28.4' },
  { id: '3-1', status: 'online', soc: 100, soh: 94.0, acKw: 110, acV: 400, acA: [69, 68, 69], dcKw: 114, dcV: 755, dcA: 117, vmax: '3.640', vmin: '3.310', tmax: '30.1', tmin: '23.8' },
  { id: '3-2', status: 'offline', soc: 0, soh: 0, acKw: 0, acV: 0, acA: [0, 0, 0], dcKw: 0, dcV: 0, dcA: 0, vmax: '—', vmin: '—', tmax: '—', tmin: '—' },
];

type StatusMetaResolved = {
  label: string;
  border: string;
  accent: string;
  bar: string;
  text: string;
  pillSurface: string;
};

function statusMeta(status: CabinetStatus, ct: StationRealtimeCabinetT): StatusMetaResolved {
  /* Card chrome matches global `ems-card`; only fault tints the outer border. */
  const shellDefault = 'border-slate-200 dark:border-apple-border-dark';
  switch (status) {
    case 'online':
      return {
        label: ct.statusOnline,
        border: shellDefault,
        accent: 'text-brand-600 dark:text-brand-400',
        bar: 'bg-brand-500',
        text: 'text-brand-700 dark:text-brand-400',
        pillSurface:
          'border-brand-200/80 bg-brand-50 dark:border-brand-800/45 dark:bg-brand-900/20',
      };
    case 'warning':
      return {
        label: ct.statusOnline,
        border: shellDefault,
        accent: 'text-brand-600 dark:text-brand-400',
        bar: 'bg-brand-500',
        text: 'text-brand-700 dark:text-brand-400',
        pillSurface:
          'border-brand-200/80 bg-brand-50 dark:border-brand-800/45 dark:bg-brand-900/20',
      };
    case 'fault':
      return {
        label: ct.statusFault,
        border: 'border-red-500',
        accent: 'text-rose-600 dark:text-rose-400',
        bar: 'bg-rose-500',
        text: 'text-rose-700 dark:text-rose-300',
        pillSurface:
          'border-rose-200/80 bg-rose-50 dark:border-rose-800/45 dark:bg-rose-900/25',
      };
    default:
      return {
        label: ct.statusOffline,
        border: shellDefault,
        accent: 'text-slate-500 dark:text-slate-400',
        bar: 'bg-slate-500',
        text: 'text-slate-600 dark:text-slate-300',
        pillSurface:
          'border-slate-200 bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50',
      };
  }
}

/* Realtime detail cards — align with global `ems-card` + StationRealtime nested rows (index.css / StationRealtime.tsx) */

const DETAIL_CARD_SHELL = 'ems-card flex w-full min-w-0 flex-col p-3';
const DETAIL_CARD_MIN_WIDTH = 280;
const DETAIL_CARD_MAX_WIDTH = 432;
const DETAIL_CARD_GAP = 12; // Tailwind `gap-3`

const RealtimeAdaptiveCardGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = React.useState({ cols: 1, cardWidth: DETAIL_CARD_MIN_WIDTH });

  React.useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const calc = () => {
      const w = el.clientWidth;
      if (!w) return;
      const cols = Math.max(1, Math.floor((w + DETAIL_CARD_GAP) / (DETAIL_CARD_MIN_WIDTH + DETAIL_CARD_GAP)));
      const raw = (w - (cols - 1) * DETAIL_CARD_GAP) / cols;
      const cardWidth = Math.min(DETAIL_CARD_MAX_WIDTH, Math.max(DETAIL_CARD_MIN_WIDTH, raw));
      setLayout({ cols, cardWidth });
    };

    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className="grid justify-start gap-3"
      style={{ gridTemplateColumns: `repeat(${layout.cols}, ${layout.cardWidth}px)` }}
    >
      {children}
    </div>
  );
};

const DETAIL_PANEL_SHELL =
  'rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50';

/** BESS detail card: stacked sections separated by faint rules (no inner framed panels) */
const ESS_DETAIL_SECTIONS = 'flex min-w-0 flex-col divide-y divide-slate-200/55 dark:divide-white/[0.08]';

const ESS_DETAIL_SECTION_PAD = 'px-0 py-2.5 first:pt-0 last:pb-0';

const DETAIL_BORDER_T = 'border-t border-slate-200 dark:border-apple-border-dark';

const DETAIL_BORDER_R = 'border-r border-slate-200 dark:border-apple-border-dark';

const DETAIL_LABEL =
  'text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';

const DETAIL_VALUE = 'text-sm font-black text-slate-900 dark:text-white';

const DETAIL_TITLE = 'text-slate-900 dark:text-white';
const DETAIL_SECTION_TITLE = 'text-slate-700 dark:text-slate-300';

const DETAIL_GRID_HEADING = 'text-lg font-bold text-slate-900 dark:text-white';

const DETAIL_CAP_LABEL =
  'text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500';

const DETAIL_SECONDARY_CELL = 'text-xs font-semibold text-slate-400 dark:text-slate-500';

const DETAIL_STATUS_PILL =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black uppercase tracking-wider';

/** Icon + name left, status pill right, one row */
const DETAIL_CARD_HEADER = 'mb-2 flex min-w-0 items-center justify-between gap-2';

/** Same language as BESS health row icon wells: white / apple-surface-dark + apple-border */
const DETAIL_HEADER_TYPE_ICON =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-apple-border-dark dark:bg-apple-surface-dark';

const DETAIL_SECTION_ICON =
  'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-brand-600 shadow-sm dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-brand-400';

/** BESS SOC — track only (no bordered shell; matches thin progress style used elsewhere) */
const DETAIL_BAR_TRACK =
  'relative h-5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700';

/** EVSE Car SOC — track only (no outer shell) */
const DETAIL_PERCENT_METER_TRACK =
  'h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700';

const DG_SEMI_GAUGE_R = 34;
const DG_SEMI_GAUGE_ARC = Math.PI * DG_SEMI_GAUGE_R;
const DG_SEMI_GAUGE_PATH = `M ${50 - DG_SEMI_GAUGE_R} 48 A ${DG_SEMI_GAUGE_R} ${DG_SEMI_GAUGE_R} 0 0 1 ${50 + DG_SEMI_GAUGE_R} 48`;

function parsePercentFromGaugeLabel(s: string): number | null {
  const t = String(s).trim();
  if (!t || t === '—' || t === '--') return null;
  const n = parseFloat(t.replace(/%/g, ''));
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
}

/** DG output % / fuel — semicircular dial */
const DetailDgArcGauge: React.FC<{
  label: string;
  valueLabel: string;
  valuePercent: number | null;
  stress?: boolean;
}> = ({ label, valueLabel, valuePercent, stress }) => {
  const hasValue = valuePercent != null;
  const activeArc = hasValue ? (valuePercent / 100) * DG_SEMI_GAUGE_ARC : 0;
  const arcAccent = stress
    ? 'text-rose-600 dark:text-rose-400'
    : 'text-brand-500 dark:text-brand-400';
  const valClass = !hasValue
    ? 'text-slate-400 dark:text-slate-500'
    : stress
      ? 'text-rose-700 dark:text-rose-300'
      : 'text-slate-900 dark:text-white';

  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className={`max-w-[9rem] text-center leading-tight ${DETAIL_CAP_LABEL}`}>{label}</div>
      <div className="relative mt-1.5 aspect-[100/54] w-full max-w-[8.5rem]">
        <svg className="h-full w-full" viewBox="0 0 100 54" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path
            d={DG_SEMI_GAUGE_PATH}
            className="text-slate-200 dark:text-slate-600"
            stroke="currentColor"
            strokeWidth={5}
            strokeLinecap="round"
          />
          {hasValue && (
            <path
              d={DG_SEMI_GAUGE_PATH}
              className={arcAccent}
              stroke="currentColor"
              strokeWidth={5}
              strokeLinecap="round"
              strokeDasharray={`${activeArc} ${DG_SEMI_GAUGE_ARC}`}
            />
          )}
        </svg>
        <div className={`absolute inset-x-0 bottom-1 text-center text-base font-black leading-none ${valClass}`}>
          {valueLabel}
        </div>
      </div>
    </div>
  );
};

/** EV Car SOC — horizontal bar (track only) */
const DetailPercentMeter: React.FC<{
  label: string;
  valueLabel: string;
  valuePercent: number | null;
}> = ({ label, valueLabel, valuePercent }) => {
  const hasValue = valuePercent != null;
  const pct = hasValue ? valuePercent : 0;
  const fillClass = 'bg-brand-500 dark:bg-brand-400';

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-end justify-between gap-2">
        <span className={`min-w-0 leading-tight ${DETAIL_CAP_LABEL}`}>{label}</span>
        <span className={`shrink-0 text-xl font-black tabular-nums leading-none ${DETAIL_TITLE}`}>{valueLabel}</span>
      </div>
      <div
        className={DETAIL_PERCENT_METER_TRACK}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hasValue ? Math.round(valuePercent as number) : undefined}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${hasValue ? fillClass : 'bg-transparent'}`}
          style={{ width: hasValue ? `${pct}%` : '0%' }}
        />
      </div>
    </div>
  );
};

const RealtimeDetailCardFooter: React.FC<{
  label: string;
  deviceId: string;
  onViewDetail?: (deviceId: string) => void;
}> = ({ label, deviceId, onViewDetail }) => (
  <button
    type="button"
    className="mt-2.5 flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-100 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark/80 dark:focus-visible:ring-brand-900/40 disabled:opacity-50"
    onClick={() => onViewDetail?.(deviceId)}
  >
    {label}
  </button>
);

const EssCabinetCard: React.FC<{
  cab: EssCabinet;
  ct: StationRealtimeCabinetT;
  onViewDetail?: (deviceId: string) => void;
}> = ({ cab, ct, onViewDetail }) => {
  const m = statusMeta(cab.status, ct);
  const offline = cab.status === 'offline';
  const lowSoc = !offline && cab.soc < 5;
  const batteryLevel = Math.min(100, Math.max(0, cab.soc));
  const batteryBarColor = cab.id === '2-2'
    ? 'bg-brand-500'
    : cab.status === 'fault'
      ? 'bg-rose-500'
      : lowSoc
        ? 'bg-amber-500'
        : 'bg-brand-500';
  const neutralValue = `${ct.dash} / ${ct.dash} / ${ct.dash}`;
  const acPhaseCurrent = offline ? neutralValue : `${cab.acA[0]} / ${cab.acA[1]} / ${cab.acA[2]} A`;
  const acPhaseVoltage = offline ? neutralValue : `${cab.acV} / ${cab.acV + 1} / ${cab.acV + 2} V`;

  return (
    <div
      className={`${DETAIL_CARD_SHELL} ${m.border}`}
    >
      <div className={DETAIL_CARD_HEADER}>
        <div className="flex min-w-0 items-center gap-2 text-left">
          <div className={DETAIL_HEADER_TYPE_ICON}>
            <Battery size={16} className={m.accent} />
          </div>
          <span className={`min-w-0 truncate font-mono text-base font-black tracking-wide ${DETAIL_TITLE}`}>{cab.id}</span>
        </div>
        <span className={`${DETAIL_STATUS_PILL} ${m.pillSurface} ${m.text}`}>
          <span className="h-2 w-2 rounded-full bg-current" />
          {m.label}
        </span>
      </div>

      <div className={ESS_DETAIL_SECTIONS}>
        <div className={ESS_DETAIL_SECTION_PAD}>
          <div className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1">
              <span className={`text-3xl font-black tabular-nums leading-none tracking-tight ${
                offline
                  ? 'text-slate-500 dark:text-slate-300'
                  : lowSoc
                    ? 'text-amber-500 dark:text-amber-400'
                    : 'text-brand-500 dark:text-brand-400'
              }`}>
                {offline ? ct.dash : cab.soc}
                {!offline && <span className="ml-px text-xl">%</span>}
              </span>
              <span className="text-slate-400 dark:text-slate-500">/</span>
              <span className={DETAIL_CAP_LABEL}>{ct.soc}</span>
              <span className="select-none text-slate-400 dark:text-slate-600">,</span>
            </span>
            <span className="inline-flex min-w-0 shrink-0 flex-wrap items-baseline justify-end gap-x-0.5 text-right">
              <span className={`text-xs font-black tabular-nums leading-none tracking-tight ${offline ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {offline ? ct.dash : cab.soh.toFixed(1)}
                {!offline && <span className="ml-px text-[10px] font-black">%</span>}
              </span>
              <span className="text-[10px] leading-none text-slate-400 dark:text-slate-500">/</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {ct.soh}
              </span>
            </span>
          </div>
          <div className="mt-1.5">
            <div className={DETAIL_BAR_TRACK}>
              <div className={`h-full rounded-full transition-all duration-500 ${offline ? 'bg-slate-600 dark:bg-slate-600' : batteryBarColor}`} style={{ width: offline ? '0%' : `${batteryLevel}%` }} />
            </div>
          </div>
        </div>

        <div className={ESS_DETAIL_SECTION_PAD}>
          <div className="mb-2 flex items-center gap-1.5">
            <span className={DETAIL_SECTION_ICON}>
              <Zap size={13} strokeWidth={2.25} />
            </span>
            <span className={`text-lg font-semibold ${DETAIL_SECTION_TITLE}`}>PCS</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`${DETAIL_BORDER_R} pr-2.5`}>
              <div className={DETAIL_SECONDARY_CELL}>{ct.ac}</div>
              <div className="mt-1 flex items-end gap-1">
                <span className={`text-2xl font-black leading-none ${offline ? 'text-slate-500 dark:text-slate-300' : 'text-brand-500 dark:text-brand-400'}`}>{offline ? ct.dash : cab.acKw}</span>
                <span className="text-lg font-semibold leading-none text-slate-500 dark:text-slate-400">kW</span>
              </div>
              <div className="mt-2 space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                <div>{acPhaseVoltage}</div>
                <div>{acPhaseCurrent}</div>
              </div>
            </div>
            <div>
              <div className={DETAIL_SECONDARY_CELL}>{ct.dc}</div>
              <div className="mt-1 flex items-end gap-1">
                <span className={`text-2xl font-black leading-none ${DETAIL_TITLE}`}>{offline ? ct.dash : cab.dcKw}</span>
                <span className="text-lg font-semibold leading-none text-slate-500 dark:text-slate-400">kW</span>
              </div>
              <div className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                {offline ? `${ct.dash} V / ${ct.dash} A` : `${cab.dcV} V / ${cab.dcA} A`}
              </div>
            </div>
          </div>
        </div>

        <div className={`${ESS_DETAIL_SECTION_PAD} grid grid-cols-2 gap-2.5 text-[11px]`}>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <GaugeBadge />
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{ct.vmaxMin}</span>
            </div>
            <div className="space-y-1.5">
              <div className={`flex items-center gap-1 text-base font-black ${DETAIL_TITLE}`}>
                <ArrowUp size={12} className={offline ? 'text-slate-500 dark:text-slate-400' : 'text-brand-500 dark:text-brand-400'} />
                <span>{offline ? ct.dash : cab.vmax}</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">V</span>
              </div>
              <div className={`flex items-center gap-1 text-base font-black ${DETAIL_TITLE}`}>
                <ArrowDown size={12} className={offline ? 'text-slate-500 dark:text-slate-400' : 'text-brand-500 dark:text-brand-400'} />
                <span>{offline ? ct.dash : cab.vmin}</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">V</span>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <span className={DETAIL_SECTION_ICON}>
                <Thermometer size={13} />
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{ct.tmaxMin}</span>
            </div>
            <div className="space-y-1.5">
              <div className={`flex items-center gap-1 text-base font-black ${DETAIL_TITLE}`}>
                <ArrowUp size={12} className={offline ? 'text-slate-500 dark:text-slate-400' : 'text-brand-500 dark:text-brand-400'} />
                <span>{offline ? ct.dash : cab.tmax}</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">°C</span>
              </div>
              <div className={`flex items-center gap-1 text-base font-black ${DETAIL_TITLE}`}>
                <ArrowDown size={12} className={offline ? 'text-slate-500 dark:text-slate-400' : 'text-brand-500 dark:text-brand-400'} />
                <span>{offline ? ct.dash : cab.tmin}</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">°C</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <RealtimeDetailCardFooter
        label={ct.viewDetails ?? 'View details'}
        deviceId={cab.id}
        onViewDetail={onViewDetail}
      />
    </div>
  );
};

const GaugeBadge: React.FC = () => (
  <span className={DETAIL_SECTION_ICON}>
    <Activity size={13} />
  </span>
);


export const RealtimeDetailEssCabinets: React.FC<{
  lang: Language;
  cabinetT: StationRealtimeCabinetT;
  onViewDetail?: (deviceId: string) => void;
}> = ({ cabinetT, onViewDetail }) => (
  <div className="animate-in fade-in duration-300">
    <RealtimeAdaptiveCardGrid>
      {ESS_CABINETS.map((cab) => (
        <EssCabinetCard key={cab.id} cab={cab} ct={cabinetT} onViewDetail={onViewDetail} />
      ))}
    </RealtimeAdaptiveCardGrid>
  </div>
);

type PvCard = {
  id: string;
  status: CabinetStatus;
  powerKw: number;
  acVoltage: string;
  acCurrent: string;
  dcKw: number;
  dcVoltage: string;
  dcCurrent: string;
};
const PV_CARDS: PvCard[] = [
  {
    id: '1-1',
    status: 'online',
    powerKw: 98,
    acVoltage: '401 / 402 / 403 V',
    acCurrent: '78 / 77 / 77 A',
    dcKw: 100,
    dcVoltage: '782 V',
    dcCurrent: '128 A',
  },
  {
    id: '1-2',
    status: 'online',
    powerKw: 102,
    acVoltage: '399 / 400 / 401 V',
    acCurrent: '80 / 79 / 79 A',
    dcKw: 104,
    dcVoltage: '776 V',
    dcCurrent: '134 A',
  },
  {
    id: '2-1',
    status: 'warning',
    powerKw: 45,
    acVoltage: '395 / 396 / 397 V',
    acCurrent: '36 / 35 / 35 A',
    dcKw: 46,
    dcVoltage: '758 V',
    dcCurrent: '61 A',
  },
  {
    id: '2-2',
    status: 'offline',
    powerKw: 0,
    acVoltage: '—',
    acCurrent: '—',
    dcKw: 0,
    dcVoltage: '—',
    dcCurrent: '—',
  },
  {
    id: '3-1',
    status: 'online',
    powerKw: 88,
    acVoltage: '400 / 401 / 402 V',
    acCurrent: '70 / 69 / 69 A',
    dcKw: 90,
    dcVoltage: '768 V',
    dcCurrent: '117 A',
  },
  {
    id: '3-2',
    status: 'fault',
    powerKw: 0,
    acVoltage: '—',
    acCurrent: '—',
    dcKw: 0,
    dcVoltage: '—',
    dcCurrent: '—',
  },
];

export const RealtimeDetailPvCards: React.FC<{
  cabinetT: StationRealtimeCabinetT;
  onViewDetail?: (deviceId: string) => void;
}> = ({ cabinetT, onViewDetail }) => (
  <div className="animate-in fade-in duration-300">
    <RealtimeAdaptiveCardGrid>
      {PV_CARDS.map((c) => {
        const m = statusMeta(c.status, cabinetT);
        const off = c.status === 'offline';
        return (
          <div key={c.id} className={`${DETAIL_CARD_SHELL} ${m.border}`}>
            <div className={DETAIL_CARD_HEADER}>
              <div className="flex min-w-0 items-center gap-2 text-left">
                <div className={DETAIL_HEADER_TYPE_ICON}>
                  <Sun size={16} className={m.accent} />
                </div>
                <span className={`min-w-0 truncate font-mono text-base font-black tracking-wide ${DETAIL_TITLE}`}>{c.id}</span>
              </div>
              <span className={`${DETAIL_STATUS_PILL} ${m.pillSurface} ${m.text}`}>
                <span className="h-2 w-2 rounded-full bg-current" />
                {m.label}
              </span>
            </div>

            <div className={`${DETAIL_PANEL_SHELL} mb-2.5`}>
              <div className="mb-2 flex items-center gap-1.5">
                <span className={DETAIL_SECTION_ICON}>
                  <Zap size={13} strokeWidth={2.25} />
                </span>
                <span className={`text-lg font-semibold ${DETAIL_SECTION_TITLE}`}>ACDC</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className={`${DETAIL_BORDER_R} pr-2.5`}>
                  <div className={DETAIL_SECONDARY_CELL}>{cabinetT.ac}</div>
                  <div className="mt-1 flex items-end gap-1">
                    <span className={`text-2xl font-black leading-none ${off ? 'text-slate-500 dark:text-slate-300' : 'text-brand-500 dark:text-brand-400'}`}>{off ? cabinetT.dash : c.powerKw}</span>
                    <span className="text-base font-semibold leading-none text-slate-500 dark:text-slate-400">kW</span>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <div>{off ? cabinetT.dash : c.acVoltage}</div>
                    <div>{off ? cabinetT.dash : c.acCurrent}</div>
                  </div>
                </div>
                <div>
                  <div className={DETAIL_SECONDARY_CELL}>{cabinetT.dc}</div>
                  <div className="mt-1 flex items-end gap-1">
                    <span className={`text-2xl font-black leading-none ${DETAIL_TITLE}`}>{off ? cabinetT.dash : c.dcKw}</span>
                    <span className="text-base font-semibold leading-none text-slate-500 dark:text-slate-400">kW</span>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <div>{off ? cabinetT.dash : c.dcVoltage}</div>
                    <div>{off ? cabinetT.dash : c.dcCurrent}</div>
                  </div>
                </div>
              </div>
            </div>
            <RealtimeDetailCardFooter label={cabinetT.viewDetails ?? 'View details'} deviceId={c.id} onViewDetail={onViewDetail} />
          </div>
        );
      })}
    </RealtimeAdaptiveCardGrid>
  </div>
);

type EvseCard = {
  id: string;
  status: CabinetStatus;
  gunStatus: 'unplugged' | 'plugged';
  powerKw: number;
  dcKw: number;
  acVoltage: string;
  acCurrent: string;
  dcVoltage: string;
  dcCurrent: string;
  demandKw: number;
  carSoc: string;
};
const EVSE_CARDS: EvseCard[] = [
  { id: '1-1', status: 'online', gunStatus: 'plugged', powerKw: 60, dcKw: 60, acVoltage: '400 / 401 / 402 V', acCurrent: '92 / 90 / 91 A', dcVoltage: '748 V', dcCurrent: '80 A', demandKw: 65, carSoc: '82%' },
  { id: '1-2', status: 'online', gunStatus: 'plugged', powerKw: 120, dcKw: 118, acVoltage: '401 / 402 / 403 V', acCurrent: '121 / 120 / 120 A', dcVoltage: '752 V', dcCurrent: '159 A', demandKw: 130, carSoc: '54%' },
  { id: '2-1', status: 'warning', gunStatus: 'plugged', powerKw: 40, dcKw: 39, acVoltage: '398 / 399 / 400 V', acCurrent: '61 / 60 / 60 A', dcVoltage: '746 V', dcCurrent: '54 A', demandKw: 90, carSoc: '91%' },
  { id: '2-2', status: 'offline', gunStatus: 'unplugged', powerKw: 0, dcKw: 0, acVoltage: '—', acCurrent: '—', dcVoltage: '—', dcCurrent: '—', demandKw: 0, carSoc: '—' },
  { id: '3-1', status: 'online', gunStatus: 'plugged', powerKw: 80, dcKw: 79, acVoltage: '400 / 401 / 402 V', acCurrent: '95 / 93 / 94 A', dcVoltage: '750 V', dcCurrent: '106 A', demandKw: 110, carSoc: '76%' },
  { id: '3-2', status: 'fault', gunStatus: 'unplugged', powerKw: 0, dcKw: 0, acVoltage: '—', acCurrent: '—', dcVoltage: '—', dcCurrent: '—', demandKw: 0, carSoc: '—' },
];

export const RealtimeDetailEvseCards: React.FC<{
  lang: Language;
  cabinetT: StationRealtimeCabinetT;
  onViewDetail?: (deviceId: string) => void;
}> = ({ lang, cabinetT, onViewDetail }) => (
  <div className="animate-in fade-in duration-300">
    <RealtimeAdaptiveCardGrid>
      {EVSE_CARDS.map((c) => {
        const m = statusMeta(c.status, cabinetT);
        const off = c.status === 'offline';
        const gunStatusLabel = c.gunStatus === 'plugged'
          ? (lang === 'zh' ? '已插枪' : 'Plugged')
          : (lang === 'zh' ? '未插枪' : 'Unplugged');
        const gunStatusTone = c.gunStatus === 'plugged'
          ? 'text-brand-500 dark:text-brand-400'
          : 'text-slate-500 dark:text-slate-400';
        return (
          <div key={c.id} className={`${DETAIL_CARD_SHELL} ${m.border}`}>
            <div className={DETAIL_CARD_HEADER}>
              <div className="flex min-w-0 items-center gap-2 text-left">
                <div className={DETAIL_HEADER_TYPE_ICON}>
                  <Cable size={16} className={m.accent} />
                </div>
                <span className={`min-w-0 truncate font-mono text-base font-black tracking-wide ${DETAIL_TITLE}`}>{c.id}</span>
              </div>
              <span className={`${DETAIL_STATUS_PILL} ${m.pillSurface} ${m.text}`}>
                <span className="h-2 w-2 rounded-full bg-current" />
                {m.label}
              </span>
            </div>

            <div className={`${DETAIL_PANEL_SHELL} mb-2.5`}>
              <div className="mb-2 flex items-center gap-1.5">
                <span className={DETAIL_SECTION_ICON}>
                  <Cable size={13} />
                </span>
                <span className={`text-lg font-semibold ${DETAIL_SECTION_TITLE}`}>EVSE</span>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">{lang === 'zh' ? '枪状态' : 'Gun Status'}</div>
                <div className={`text-lg font-black ${gunStatusTone}`}>{gunStatusLabel}</div>
              </div>
              <div className={`mt-2.5 ${DETAIL_BORDER_T} pt-2.5`}>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className={`${DETAIL_BORDER_R} pr-2.5`}>
                    <div className={DETAIL_SECONDARY_CELL}>{cabinetT.ac}</div>
                    <div className="mt-1 flex items-end gap-1">
                      <span className={`text-2xl font-black leading-none ${off ? 'text-slate-500 dark:text-slate-300' : 'text-brand-500 dark:text-brand-400'}`}>{off ? cabinetT.dash : c.powerKw}</span>
                      <span className="text-base font-semibold leading-none text-slate-500 dark:text-slate-400">kW</span>
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <div>{off ? cabinetT.dash : c.acVoltage}</div>
                      <div>{off ? cabinetT.dash : c.acCurrent}</div>
                    </div>
                  </div>
                  <div>
                    <div className={DETAIL_SECONDARY_CELL}>{cabinetT.dc}</div>
                    <div className="mt-1 flex items-end gap-1">
                      <span className={`text-2xl font-black leading-none ${DETAIL_TITLE}`}>{off ? cabinetT.dash : c.dcKw}</span>
                      <span className="text-base font-semibold leading-none text-slate-500 dark:text-slate-400">kW</span>
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <div>{off ? cabinetT.dash : c.dcVoltage}</div>
                      <div>{off ? cabinetT.dash : c.dcCurrent}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${DETAIL_PANEL_SHELL} mb-2.5`}>
              <div className="mb-2 flex items-center gap-1.5">
                <span className={DETAIL_SECTION_ICON}>
                  <Car size={13} strokeWidth={2.25} />
                </span>
                <span className={`text-lg font-semibold ${DETAIL_SECTION_TITLE}`}>EV</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">{lang === 'zh' ? '需求功率' : 'Demand Power'}</div>
                  <div className={`text-lg font-black ${DETAIL_TITLE}`}>{off ? cabinetT.dash : `${c.demandKw} kW`}</div>
                </div>
                <DetailPercentMeter
                  label={lang === 'zh' ? '汽车 SOC' : 'Car SOC'}
                  valueLabel={off ? cabinetT.dash : c.carSoc}
                  valuePercent={off ? null : parsePercentFromGaugeLabel(c.carSoc)}
                />
              </div>
            </div>

            <RealtimeDetailCardFooter label={cabinetT.viewDetails ?? 'View details'} deviceId={c.id} onViewDetail={onViewDetail} />
          </div>
        );
      })}
    </RealtimeAdaptiveCardGrid>
  </div>
);

type DgCard = {
  id: string;
  status: CabinetStatus;
  fuel: string;
  temp: string;
  oilPress: string;
  totalKw: number;
  outPct: string;
  acVoltage: string;
  acCurrent: string;
  genFreq: string;
};
const DG_CARDS: DgCard[] = [
  { id: '1-1', status: 'online', fuel: '76%', temp: '88°C', oilPress: '4.5 bar', totalKw: 500, outPct: '83%', acVoltage: '400 / 401 / 402 V', acCurrent: '96 / 95 / 95 A', genFreq: '50.02 Hz' },
  { id: '2-1', status: 'offline', fuel: '—', temp: '—', oilPress: '—', totalKw: 0, outPct: '—', acVoltage: '—', acCurrent: '—', genFreq: '—' },
  { id: '2-2', status: 'fault', fuel: '9%', temp: '102°C', oilPress: '2.1 bar', totalKw: 0, outPct: '0%', acVoltage: '—', acCurrent: '—', genFreq: '—' },
];

export const RealtimeDetailDgCards: React.FC<{
  lang: Language;
  cabinetT: StationRealtimeCabinetT;
  onViewDetail?: (deviceId: string) => void;
}> = ({ lang, cabinetT, onViewDetail }) => (
  <div className="animate-in fade-in duration-300">
    <RealtimeAdaptiveCardGrid>
      {DG_CARDS.map((c) => {
        const m = statusMeta(c.status, cabinetT);
        const off = c.status === 'offline';
        const outPctNum = off ? null : parsePercentFromGaugeLabel(c.outPct);
        const fuelNum = off ? null : parsePercentFromGaugeLabel(c.fuel);
        const outputPctStress = outPctNum != null && outPctNum > 90;
        const fuelPctStress = fuelNum != null && fuelNum < 10;
        return (
          <div key={c.id} className={`${DETAIL_CARD_SHELL} ${m.border}`}>
            <div className={DETAIL_CARD_HEADER}>
              <div className="flex min-w-0 items-center gap-2 text-left">
                <div className={DETAIL_HEADER_TYPE_ICON}>
                  <RotateCw size={16} className={m.accent} />
                </div>
                <span className={`min-w-0 truncate font-mono text-base font-black tracking-wide ${DETAIL_TITLE}`}>{c.id}</span>
              </div>
              <span className={`${DETAIL_STATUS_PILL} ${m.pillSurface} ${m.text}`}>
                <span className="h-2 w-2 rounded-full bg-current" />
                {m.label}
              </span>
            </div>

            <div className="mb-2.5">
              <div className={`${DETAIL_PANEL_SHELL} p-2`}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-3xl font-black leading-none tracking-tight ${off ? 'text-slate-500 dark:text-slate-300' : 'text-brand-500 dark:text-brand-400'}`}>
                    {off ? cabinetT.dash : c.totalKw}
                    {!off && <span className="ml-1 text-lg">kW</span>}
                  </span>
                  <span className={DETAIL_CAP_LABEL}>{lang === 'zh' ? '总功率' : 'Total Power'}</span>
                </div>
                <div className={`mt-2 ${DETAIL_BORDER_T} pt-3`}>
                  <div className="grid grid-cols-2 gap-2 px-0.5">
                    <DetailDgArcGauge
                      label={lang === 'zh' ? '输出功率百分比' : 'Output %'}
                      valueLabel={off ? cabinetT.dash : c.outPct}
                      valuePercent={outPctNum}
                      stress={outputPctStress}
                    />
                    <DetailDgArcGauge
                      label={lang === 'zh' ? '油位' : 'Fuel'}
                      valueLabel={off ? cabinetT.dash : c.fuel}
                      valuePercent={fuelNum}
                      stress={fuelPctStress}
                    />
                  </div>
                </div>
                <div className={`mt-2 ${DETAIL_BORDER_T} pt-3`}>
                  <div className="grid grid-cols-2 gap-2 px-0.5">
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">{lang === 'zh' ? '温度' : 'Temperature'}</div>
                      <div className={`mt-1 text-sm font-bold ${DETAIL_TITLE}`}>{off ? cabinetT.dash : c.temp}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">{lang === 'zh' ? '油压' : 'Oil Pressure'}</div>
                      <div className={`mt-1 text-sm font-bold ${DETAIL_TITLE}`}>{off ? cabinetT.dash : c.oilPress}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${DETAIL_PANEL_SHELL} mb-2.5`}>
              <div className="mb-2 flex items-center gap-1.5">
                <span className={DETAIL_SECTION_ICON}>
                  <Zap size={13} strokeWidth={2.25} />
                </span>
                <span className={`text-lg font-semibold ${DETAIL_SECTION_TITLE}`}>{cabinetT.ac}</span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <div className={DETAIL_LABEL}>{lang === 'zh' ? '交流电压' : 'AC Voltage'}</div>
                  <div className={`mt-1 ${DETAIL_VALUE}`}>{off ? cabinetT.dash : c.acVoltage}</div>
                </div>
                <div className={`${DETAIL_BORDER_T} pt-2.5`}>
                  <div className={DETAIL_LABEL}>{lang === 'zh' ? '交流电流' : 'AC Current'}</div>
                  <div className={`mt-1 ${DETAIL_VALUE}`}>{off ? cabinetT.dash : c.acCurrent}</div>
                </div>
                <div className={`${DETAIL_BORDER_T} pt-2.5`}>
                  <div className={DETAIL_LABEL}>{lang === 'zh' ? '发电机频率' : 'Generator Frequency'}</div>
                  <div className={`mt-1 ${DETAIL_VALUE}`}>{off ? cabinetT.dash : c.genFreq}</div>
                </div>
              </div>
            </div>
            <RealtimeDetailCardFooter label={cabinetT.viewDetails ?? 'View details'} deviceId={c.id} onViewDetail={onViewDetail} />
          </div>
        );
      })}
    </RealtimeAdaptiveCardGrid>
  </div>
);
