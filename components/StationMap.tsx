import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Battery,
  Cable,
  CheckCircle2,
  Clock3,
  Crosshair,
  Expand,
  MapPin,
  Minus,
  Plus,
  RotateCw,
  Search,
  Sun,
  XCircle,
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

type StationStatus = 'Normal' | 'Warning' | 'Offline';
type StationChargeState = 'Charging' | 'Discharging' | 'Standby';
type StationAssetType = 'BESS' | 'PV' | 'DG' | 'EVSE';
interface StationAssetDetail {
  type: StationAssetType;
  power: string;
  capacity: string;
}

interface MapStation {
  id: string;
  name: string;
  location: string;
  assetTypes: StationAssetType[];
  assetDetails: StationAssetDetail[];
  status: StationStatus;
  chargeState: StationChargeState;
  soc: number;
  powerMw: number;
  top: string;
  left: string;
}

const STATIONS_EN: MapStation[] = [
  { id: 'ST-001', name: 'Station #1 (Berlin)', location: 'Berlin, Germany', assetTypes: ['BESS', 'PV'], assetDetails: [{ type: 'BESS', power: '28 MW', capacity: '56 MWh' }, { type: 'PV', power: '16 MW', capacity: '20 MWp' }], status: 'Normal', chargeState: 'Charging', soc: 86, powerMw: 10.8, top: '32%', left: '42%' },
  { id: 'ST-002', name: 'Station #2 (Munich)', location: 'Munich, Germany', assetTypes: ['BESS', 'PV', 'DG'], assetDetails: [{ type: 'BESS', power: '22 MW', capacity: '44 MWh' }, { type: 'PV', power: '18 MW', capacity: '24 MWp' }, { type: 'DG', power: '6 MW', capacity: '9 MVA' }], status: 'Warning', chargeState: 'Discharging', soc: 43, powerMw: 6.2, top: '48%', left: '56%' },
  { id: 'ST-003', name: 'Station #3 (London)', location: 'London, UK', assetTypes: ['BESS', 'PV', 'EVSE'], assetDetails: [{ type: 'BESS', power: '14 MW', capacity: '28 MWh' }, { type: 'PV', power: '12 MW', capacity: '15 MWp' }, { type: 'EVSE', power: '4 MW', capacity: '120 stalls' }], status: 'Offline', chargeState: 'Standby', soc: 0, powerMw: 0, top: '21%', left: '29%' },
  { id: 'ST-004', name: 'Station #5 (Paris)', location: 'Paris, France', assetTypes: ['PV', 'DG'], assetDetails: [{ type: 'PV', power: '21 MW', capacity: '27 MWp' }, { type: 'DG', power: '8 MW', capacity: '12 MVA' }], status: 'Normal', chargeState: 'Discharging', soc: 91, powerMw: 12.4, top: '56%', left: '60%' },
  { id: 'ST-005', name: 'Station #6 (Madrid)', location: 'Madrid, Spain', assetTypes: ['BESS', 'EVSE'], assetDetails: [{ type: 'BESS', power: '20 MW', capacity: '40 MWh' }, { type: 'EVSE', power: '5 MW', capacity: '160 stalls' }], status: 'Normal', chargeState: 'Charging', soc: 67, powerMw: 8.1, top: '62%', left: '45%' },
  { id: 'ST-006', name: 'Station #8 (Rome)', location: 'Rome, Italy', assetTypes: ['BESS', 'PV'], assetDetails: [{ type: 'BESS', power: '24 MW', capacity: '48 MWh' }, { type: 'PV', power: '14 MW', capacity: '18 MWp' }], status: 'Normal', chargeState: 'Standby', soc: 78, powerMw: 9.3, top: '77%', left: '37%' },
  { id: 'ST-007', name: 'Station #9 (Zurich)', location: 'Zurich, Switzerland', assetTypes: ['BESS', 'DG'], assetDetails: [{ type: 'BESS', power: '18 MW', capacity: '36 MWh' }, { type: 'DG', power: '7 MW', capacity: '10 MVA' }], status: 'Warning', chargeState: 'Discharging', soc: 35, powerMw: 5.4, top: '66%', left: '27%' },
  { id: 'ST-008', name: 'Station #11 (Oslo)', location: 'Oslo, Norway', assetTypes: ['BESS', 'PV', 'DG', 'EVSE'], assetDetails: [{ type: 'BESS', power: '30 MW', capacity: '60 MWh' }, { type: 'PV', power: '19 MW', capacity: '25 MWp' }, { type: 'DG', power: '9 MW', capacity: '13 MVA' }, { type: 'EVSE', power: '6 MW', capacity: '200 stalls' }], status: 'Normal', chargeState: 'Charging', soc: 58, powerMw: 7.2, top: '52%', left: '20%' },
];

const STATIONS_ZH: MapStation[] = [
  { id: 'ST-001', name: '站点 #1 (柏林)', location: '德国, 柏林', assetTypes: ['BESS', 'PV'], assetDetails: [{ type: 'BESS', power: '28 MW', capacity: '56 MWh' }, { type: 'PV', power: '16 MW', capacity: '20 MWp' }], status: 'Normal', chargeState: 'Charging', soc: 86, powerMw: 10.8, top: '32%', left: '42%' },
  { id: 'ST-002', name: '站点 #2 (慕尼黑)', location: '德国, 慕尼黑', assetTypes: ['BESS', 'PV', 'DG'], assetDetails: [{ type: 'BESS', power: '22 MW', capacity: '44 MWh' }, { type: 'PV', power: '18 MW', capacity: '24 MWp' }, { type: 'DG', power: '6 MW', capacity: '9 MVA' }], status: 'Warning', chargeState: 'Discharging', soc: 43, powerMw: 6.2, top: '48%', left: '56%' },
  { id: 'ST-003', name: '站点 #3 (伦敦)', location: '英国, 伦敦', assetTypes: ['BESS', 'PV', 'EVSE'], assetDetails: [{ type: 'BESS', power: '14 MW', capacity: '28 MWh' }, { type: 'PV', power: '12 MW', capacity: '15 MWp' }, { type: 'EVSE', power: '4 MW', capacity: '120 桩' }], status: 'Offline', chargeState: 'Standby', soc: 0, powerMw: 0, top: '21%', left: '29%' },
  { id: 'ST-004', name: '站点 #5 (巴黎)', location: '法国, 巴黎', assetTypes: ['PV', 'DG'], assetDetails: [{ type: 'PV', power: '21 MW', capacity: '27 MWp' }, { type: 'DG', power: '8 MW', capacity: '12 MVA' }], status: 'Normal', chargeState: 'Discharging', soc: 91, powerMw: 12.4, top: '56%', left: '60%' },
  { id: 'ST-005', name: '站点 #6 (马德里)', location: '西班牙, 马德里', assetTypes: ['BESS', 'EVSE'], assetDetails: [{ type: 'BESS', power: '20 MW', capacity: '40 MWh' }, { type: 'EVSE', power: '5 MW', capacity: '160 桩' }], status: 'Normal', chargeState: 'Charging', soc: 67, powerMw: 8.1, top: '62%', left: '45%' },
  { id: 'ST-006', name: '站点 #8 (罗马)', location: '意大利, 罗马', assetTypes: ['BESS', 'PV'], assetDetails: [{ type: 'BESS', power: '24 MW', capacity: '48 MWh' }, { type: 'PV', power: '14 MW', capacity: '18 MWp' }], status: 'Normal', chargeState: 'Standby', soc: 78, powerMw: 9.3, top: '77%', left: '37%' },
  { id: 'ST-007', name: '站点 #9 (苏黎世)', location: '瑞士, 苏黎世', assetTypes: ['BESS', 'DG'], assetDetails: [{ type: 'BESS', power: '18 MW', capacity: '36 MWh' }, { type: 'DG', power: '7 MW', capacity: '10 MVA' }], status: 'Warning', chargeState: 'Discharging', soc: 35, powerMw: 5.4, top: '66%', left: '27%' },
  { id: 'ST-008', name: '站点 #11 (奥斯陆)', location: '挪威, 奥斯陆', assetTypes: ['BESS', 'PV', 'DG', 'EVSE'], assetDetails: [{ type: 'BESS', power: '30 MW', capacity: '60 MWh' }, { type: 'PV', power: '19 MW', capacity: '25 MWp' }, { type: 'DG', power: '9 MW', capacity: '13 MVA' }, { type: 'EVSE', power: '6 MW', capacity: '200 桩' }], status: 'Normal', chargeState: 'Charging', soc: 58, powerMw: 7.2, top: '52%', left: '20%' },
];

interface StationMapProps {
  lang: Language;
  theme: Theme;
  onNavigate?: (path: string) => void;
}

interface LiveEvent {
  id: string;
  level: 'warning' | 'info';
  station: string;
  message: string;
  time: string;
}

const statusMeta: Record<
  StationStatus,
  { dot: string; ring: string; icon: React.ReactNode }
> = {
  Normal: {
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500/40',
    icon: <CheckCircle2 size={14} className="text-emerald-500" />,
  },
  Warning: {
    // Product: use fault red for all Warning-status visuals in asset overview
    dot: 'bg-rose-500',
    ring: 'ring-rose-500/40',
    icon: <AlertTriangle size={14} className="text-rose-500" />,
  },
  Offline: {
    dot: 'bg-slate-500',
    ring: 'ring-slate-500/40',
    icon: <XCircle size={14} className="text-slate-500" />,
  },
};

const assetMeta: Record<
  StationAssetType,
  { icon: React.ReactNode; badgeClass: string }
> = {
  BESS: {
    icon: <Battery size={11} />,
    badgeClass: 'text-purple-500',
  },
  PV: {
    icon: <Sun size={11} />,
    badgeClass: 'text-amber-500',
  },
  DG: {
    icon: <RotateCw size={11} />,
    badgeClass: 'text-slate-500',
  },
  EVSE: {
    icon: <Cable size={11} />,
    badgeClass: 'text-sky-500',
  },
};

const StationMap: React.FC<StationMapProps> = ({ lang, theme, onNavigate }) => {
  const t = translations[lang].stationList;
  const labels = {
    stations: lang === 'zh' ? '站点分布' : 'Station distribution',
    summary: lang === 'zh' ? '运行概览' : 'Operations summary',
    installedCapacity: lang === 'zh' ? '装机容量' : 'Installed capacity',
    essInstalled: lang === 'zh' ? '储能装机' : 'ESS installed',
    pvInstalled: lang === 'zh' ? '光伏装机' : 'PV installed',
    dgInstalled: lang === 'zh' ? 'DG装机' : 'DG installed',
    onlineRate: lang === 'zh' ? '在线率' : 'Online rate',
    liveFeed: lang === 'zh' ? '实时事件流' : 'Live event feed',
    mapLayer: lang === 'zh' ? '图层' : 'Layers',
    mapHeat: lang === 'zh' ? '热力图' : 'Heatmap',
    mapTraffic: lang === 'zh' ? '路况' : 'Traffic',
    stationInfo: lang === 'zh' ? '电站基础信息' : 'Station basic info',
    stationId: lang === 'zh' ? '电站ID' : 'Station ID',
    assetInfo: lang === 'zh' ? '资产信息' : 'Asset details',
    location: lang === 'zh' ? '位置' : 'Location',
    status: lang === 'zh' ? '状态' : 'Status',
    chargeState: lang === 'zh' ? '充放电状态' : 'Charge/Discharge status',
    soc: 'SOC',
    powerNow: lang === 'zh' ? '当前功率' : 'Current power',
    viewRealtime: lang === 'zh' ? '查看实时数据' : 'View realtime data',
    empty: lang === 'zh' ? '没有符合筛选条件的站点。' : 'No stations match your criteria.',
    all: t.filterAll,
    normal: t.statusNormal,
    // Product terminology: map "Warning" status to "Fault" label in asset overview.
    warning: t.statusFault,
    offline: t.statusOffline,
    charging: lang === 'zh' ? '充电' : 'Charging',
    discharging: lang === 'zh' ? '放电' : 'Discharging',
    standby: lang === 'zh' ? '待机' : 'Standby',
  };

  const getChargeStateLabel = (state: StationChargeState) => {
    if (state === 'Charging') return labels.charging;
    if (state === 'Discharging') return labels.discharging;
    return labels.standby;
  };

  const getChargeStateTextClass = (state: StationChargeState) => {
    if (state === 'Charging') return 'text-sky-300';
    if (state === 'Discharging') return 'text-rose-300';
    return 'text-slate-300';
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | StationStatus>('All');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const stations = lang === 'zh' ? STATIONS_ZH : STATIONS_EN;

  const filteredStations = useMemo(
    () =>
      stations.filter((s) => {
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [stations, searchTerm, statusFilter]
  );

  const counts = useMemo(() => {
    const c = { Normal: 0, Warning: 0, Offline: 0 };
    stations.forEach((s) => {
      c[s.status] += 1;
    });
    return c;
  }, [stations]);

  const onlineRate = Math.round(((counts.Normal + counts.Warning) / stations.length) * 100);
  const warningRate = Math.round((counts.Warning / stations.length) * 100);
  const offlineRate = Math.round((counts.Offline / stations.length) * 100);
  const liveEvents: LiveEvent[] = [
    {
      id: 'EVT-001',
      level: 'warning',
      station: stations[1]?.name ?? 'Station #2',
      message: lang === 'zh' ? '逆变器温度偏高' : 'Inverter temperature high',
      time: lang === 'zh' ? '8 分钟前' : '8m ago',
    },
    {
      id: 'EVT-002',
      level: 'warning',
      station: stations[6]?.name ?? 'Station #9',
      message: lang === 'zh' ? '并网电压偏移' : 'Grid voltage deviation',
      time: lang === 'zh' ? '15 分钟前' : '15m ago',
    },
    {
      id: 'EVT-003',
      level: 'info',
      station: stations[7]?.name ?? 'Station #11',
      message: lang === 'zh' ? '通信恢复成功' : 'Communication restored',
      time: lang === 'zh' ? '1 小时前' : '1h ago',
    },
  ];
  const tickerText = liveEvents
    .map((e) => `${e.time} · ${e.station} · ${e.message}`)
    .join('     ');
  const selectedStation = selectedStationId
    ? stations.find((s) => s.id === selectedStationId) ?? null
    : null;

  return (
    <div className="ems-page-shell !p-0 w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="relative flex h-[calc(100vh-72px)] min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <div className="absolute inset-0 z-0 min-h-0 w-full min-w-0 max-w-full overflow-hidden">
        <div
          className="relative h-full w-full min-w-0 overflow-hidden"
          onClick={() => setSelectedStationId(null)}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(129,146,38,0.18),transparent_45%),radial-gradient(circle_at_72%_78%,rgba(59,130,246,0.12),transparent_35%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(129,146,38,0.22),transparent_45%),radial-gradient(circle_at_72%_78%,rgba(37,99,235,0.2),transparent_35%)]" />
          <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(148,163,184,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.35)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="absolute inset-x-3 top-3 z-20 flex min-w-0 items-start justify-between gap-2 sm:inset-x-4 sm:top-4 sm:gap-3 lg:inset-x-5 2xl:inset-x-6">
          <div className="min-w-0 flex w-full max-w-[320px] flex-col gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-apple-border-dark dark:bg-apple-surface-dark/90">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">{labels.summary}</h3>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{labels.stations}</p>
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/40">
                <div className="flex items-center gap-2.5">
                  <div className="relative h-14 w-14 shrink-0">
                    <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                      <path
                        d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                        fill="none"
                        className="stroke-slate-200 dark:stroke-slate-700"
                        strokeWidth="3.5"
                      />
                      <path
                        d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                        fill="none"
                        className="stroke-emerald-500"
                        strokeWidth="3.5"
                        strokeDasharray={`${onlineRate}, 100`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-slate-800 dark:text-white">
                      {stations.length}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{labels.onlineRate}</div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{onlineRate}%</div>
                    <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                      {labels.warning}: {warningRate}% · {labels.offline}: {offlineRate}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[
                  { status: 'Normal' as StationStatus, label: labels.normal, value: counts.Normal },
                  { status: 'Warning' as StationStatus, label: labels.warning, value: counts.Warning },
                  { status: 'Offline' as StationStatus, label: labels.offline, value: counts.Offline },
                ].map((item) => (
                  <div
                    key={item.status}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 px-1.5 py-1.5 text-center dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/40"
                  >
                    <div className="mb-0.5 flex items-center justify-center">{statusMeta[item.status].icon}</div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-300">{item.label}</div>
                    <div className="text-sm font-black text-slate-800 dark:text-white">{item.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {[
                  { id: 'All', label: labels.all, dot: 'bg-slate-400' },
                  { id: 'Normal', label: labels.normal, dot: 'bg-emerald-500' },
                  { id: 'Warning', label: labels.warning, dot: 'bg-rose-500' },
                  { id: 'Offline', label: labels.offline, dot: 'bg-slate-500' },
                ].map((item) => {
                  const selected = statusFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatusFilter(item.id as 'All' | StationStatus)}
                      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors ${
                        selected
                          ? 'border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur dark:border-apple-border-dark dark:bg-apple-surface-dark/90">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {labels.installedCapacity}
              </div>
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/75 p-2 dark:border-white/10 dark:bg-apple-surface-secondary-dark/65">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.essInstalled}</div>
                  <div className="mt-1 flex items-end gap-1 text-slate-900 dark:text-white">
                    <span className="text-2xl font-extrabold leading-none">108</span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">MW</span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">/</span>
                    <span className="text-2xl font-extrabold leading-none">230</span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">MWh</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded-lg border border-slate-200/80 bg-slate-50/75 p-2 dark:border-white/10 dark:bg-apple-surface-secondary-dark/65">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.pvInstalled}</div>
                    <div className="mt-1 text-xl font-extrabold leading-none text-slate-900 dark:text-white">254<span className="ml-1 text-xs font-bold text-slate-500 dark:text-slate-400">MW</span></div>
                  </div>
                  <div className="rounded-lg border border-slate-200/80 bg-slate-50/75 p-2 dark:border-white/10 dark:bg-apple-surface-secondary-dark/65">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.dgInstalled}</div>
                    <div className="mt-1 text-xl font-extrabold leading-none text-slate-900 dark:text-white">500<span className="ml-1 text-xs font-bold text-slate-500 dark:text-slate-400">MW</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="shrink-0 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-apple-border-dark dark:bg-apple-surface-dark/90 sm:gap-1.5 sm:p-1.5">
            {[
              { key: 'zoom-in', icon: <Plus size={13} /> },
              { key: 'zoom-out', icon: <Minus size={13} /> },
              { key: 'target', icon: <Crosshair size={13} /> },
              { key: 'fullscreen', icon: <Expand size={13} /> },
            ].map((tool) => (
              <button
                key={tool.key}
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-brand-400"
              >
                {tool.icon}
              </button>
            ))}
          </div>
          </div>

          {filteredStations.map((station) => (
            <div
              key={station.id}
              style={{ top: station.top, left: station.left }}
              className={`group/pin absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer ${
                hoveredStationId === station.id ? 'z-[70]' : 'z-10'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStationId(station.id);
              }}
              onMouseEnter={() => setHoveredStationId(station.id)}
              onMouseLeave={() => setHoveredStationId((current) => (current === station.id ? null : current))}
            >
              <div className="relative h-11 w-11">
                <svg viewBox="0 0 36 36" className="absolute inset-0 h-11 w-11 -rotate-90">
                  <path
                    d="M18 3a15 15 0 1 1 0 30a15 15 0 1 1 0-30"
                    fill="none"
                    className="stroke-slate-300/70 dark:stroke-slate-700/70"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 3a15 15 0 1 1 0 30a15 15 0 1 1 0-30"
                    fill="none"
                    className="stroke-brand-500"
                    strokeWidth="3"
                    strokeDasharray={`${Math.max(0, Math.min(station.soc, 100))}, 100`}
                  />
                </svg>
              <div className={`absolute inset-[6px] rounded-full bg-white p-1.5 shadow-lg ring-2 dark:bg-apple-surface-dark ${statusMeta[station.status].ring}`}>
                <MapPin
                  size={18}
                  className={station.status === 'Normal' ? 'text-emerald-500' : station.status === 'Warning' ? 'text-rose-500' : 'text-slate-500'}
                  fill="currentColor"
                />
              </div>
              </div>
              <div className="pointer-events-none absolute left-1/2 top-[115%] -translate-x-1/2 rounded-md border border-slate-300/60 bg-slate-900/70 px-2 py-1 text-center text-[10px] font-semibold text-slate-100 shadow-sm backdrop-blur dark:border-white/10 dark:bg-apple-surface-secondary-dark/80 dark:text-slate-200">
                <div className="inline-flex items-center gap-1 whitespace-nowrap">
                  <span className="inline-flex items-center gap-0.5">
                    {station.assetTypes.map((assetType) => (
                      <span
                        key={`${station.id}-${assetType}`}
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 ${assetMeta[assetType].badgeClass}`}
                      >
                        {assetMeta[assetType].icon}
                      </span>
                    ))}
                  </span>
                  <span>{station.name}</span>
                  <span className="text-[9px] font-bold text-slate-300">{station.assetTypes.join('+')}</span>
                </div>
                <div className={`mt-0.5 text-[10px] font-bold ${getChargeStateTextClass(station.chargeState)}`}>
                  {getChargeStateLabel(station.chargeState)}
                </div>
              </div>
              <div
                className={`pointer-events-none absolute bottom-[120%] left-1/2 z-[80] min-w-[220px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-xl transition-opacity dark:border-apple-border-dark dark:bg-apple-surface-dark ${
                  hoveredStationId === station.id ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusMeta[station.status].dot}`} />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{station.name}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{station.location}</div>
                <div className="mt-0.5 font-mono text-[11px] text-slate-400">{station.id}</div>
                <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-700">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {labels.assetInfo}
                  </div>
                  <div className="space-y-1">
                    {station.assetDetails.map((asset) => (
                      <div
                        key={`${station.id}-asset-${asset.type}`}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{asset.type}</span>
                        <span className="text-slate-500 dark:text-slate-400">{`${asset.power}/${asset.capacity}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredStations.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-xl border border-slate-200 bg-white/85 px-4 py-2 text-sm text-slate-500 backdrop-blur dark:border-apple-border-dark dark:bg-apple-surface-dark/80 dark:text-slate-400">
                {labels.empty}
              </div>
            </div>
          )}

          {selectedStation && (
            <div
              className="absolute z-30 w-[280px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-apple-border-dark dark:bg-apple-surface-dark/95"
              style={{ top: selectedStation.top, left: selectedStation.left, transform: 'translate(calc(-50% + 28px), calc(-50% - 12px))' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-black text-slate-900 dark:text-white">{labels.stationInfo}</div>
              <div className="mt-1 text-xs font-bold text-slate-800 dark:text-slate-100">{selectedStation.name}</div>
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">{labels.stationId}</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">{selectedStation.id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">{labels.location}</span>
                    <span className="text-right text-slate-700 dark:text-slate-200">{selectedStation.location}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">{labels.status}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {selectedStation.status === 'Normal'
                        ? labels.normal
                        : selectedStation.status === 'Warning'
                          ? labels.warning
                          : labels.offline}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">{labels.chargeState}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {getChargeStateLabel(selectedStation.chargeState)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{labels.soc}</span>
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-black text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {selectedStation.soc}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${Math.max(0, Math.min(selectedStation.soc, 100))}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{labels.powerNow}</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{selectedStation.powerMw.toFixed(1)} MW</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('/stations/realtime')}
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
              >
                {labels.viewRealtime}
              </button>
            </div>
          )}
        </div>

      </div>

      <div className="ems-card relative z-20 mx-3 mb-3 mt-auto shrink-0 overflow-hidden border-brand-100/70 sm:mx-4 sm:mb-4 lg:mx-5 2xl:mx-6 dark:border-brand-900/40">
        <div className="flex items-center gap-2 bg-brand-50/70 px-3 py-2 text-xs dark:bg-brand-900/20 sm:gap-3">
          <div className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-1 font-bold text-brand-700 dark:bg-apple-surface-dark dark:text-brand-300">
            <Clock3 size={12} />
            <span className="hidden sm:inline">{labels.liveFeed}</span>
            <span className="sm:hidden">{lang === 'zh' ? '事件流' : 'Feed'}</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="whitespace-nowrap font-medium text-slate-600 dark:text-slate-300 animate-[marquee_24s_linear_infinite]">
              {tickerText} &nbsp; {tickerText}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default StationMap;
