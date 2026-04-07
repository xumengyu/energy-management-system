
import React, { useState } from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, ComposedChart, Legend, Bar
} from 'recharts';
import { 
    RefreshCw, Edit, Download, History, Copy, 
    Activity, Calendar, Cpu, LayoutTemplate, Network, Server, Zap, AlertTriangle, ArrowRight,
    ChevronDown, ChevronUp, PlayCircle, StopCircle, PauseCircle, Settings, X, Lock, ShieldCheck,
    CalendarDays, Save, Upload, Settings2, AlertCircle, RefreshCcw, Database, Globe, Clock, LayoutGrid, Trash2, Plus, Cloud,
    Battery, GitBranch, Link, FileText, ChevronRight, Search, BrainCircuit, TrendingDown, Sun, MoreHorizontal, Power,
    Timer, Hourglass, MapPin, Loader2, List, DollarSign, Coins, LayoutDashboard
} from 'lucide-react';
import { StrategyItem, ChartDataPoint, ForecastDataPoint, Language, StrategyTab, Theme, PriceRow, Coefficients, Template, StrategyStationBindings, StrategyStationDeployState, StrategyDeployStatus } from '../types';
import { MOCK_STRATEGY_STATION_DEPLOY } from '../data/mockStrategyStationDeploy';
import type { StationListItem } from './StationList';
import { translations } from '../translations';
import DeployModal from './DeployModal';
import PriceSelectionModal from './PriceSelectionModal';
import CoefficientsEditModal from './CoefficientsEditModal';
import ChangeTemplateModal from './ChangeTemplateModal';
import StrategyEditor from './StrategyEditor';

// Mock Data
const MOCK_SYNC_DATA: ChartDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    edge: i > 8 && i < 16 ? -150 : (i > 18 ? 120 : 0), // Real-time Power
    cloud: i > 8 && i < 16 ? -150 : (i > 18 ? 120 : 0), // Plan
    recommended: i > 8 && i < 16 ? -165 : (i > 18 ? 135 : 15), // AI Forecast
    socForecast1: 60 + Math.sin(i / 2) * 20,
    socForecast2: 50 + Math.cos(i / 2) * 25,
    cos: 0.8 + Math.sin(i) * 0.1,
}));

const MOCK_FORECAST_DATA: ChartDataPoint[] = Array.from({ length: 25 }, (_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    edge: 0, // Not used for forecast
    cloud: i > 4 && i < 12 ? -220 : (i > 18 ? 150 : 30), // Modified Plan
    recommended: i > 4 && i < 12 ? -240 : (i > 18 ? 170 : 50), // Modified AI Forecast
    socForecast1: 55 + Math.sin(i / 2) * 25,
    socForecast2: 45 + Math.cos(i / 2) * 30,
}));


const DEFAULT_STRATEGIES: StrategyItem[] = [
    { id: '1', startTime: '00:00', endTime: '06:00', type: 'Charge', power: 120 },
    { id: '2', startTime: '06:00', endTime: '12:00', type: 'Standby', power: 0 },
    { id: '3', startTime: '12:00', endTime: '16:00', type: 'Discharge', power: 150 },
    { id: '4', startTime: '16:00', endTime: '22:00', type: 'Charge', power: 120 },
    { id: '5', startTime: '22:00', endTime: '24:00', type: 'Standby', power: 0 },
];

const EDGE_STRATEGIES_TODAY: StrategyItem[] = [
    { id: '1', startTime: '00:00', endTime: '06:00', type: 'Charge', power: 120 },
    { id: '2', startTime: '06:00', endTime: '12:00', type: 'Standby', power: 0 },
    { id: '3', startTime: '12:00', endTime: '16:00', type: 'Discharge', power: 150 },
    { id: '4', startTime: '16:00', endTime: '22:00', type: 'Charge', power: 120 },
    { id: '5', startTime: '22:00', endTime: '24:00', type: 'Standby', power: 0 },
];

const EDGE_STRATEGIES_YESTERDAY: StrategyItem[] = [
    { id: '1', startTime: '00:00', endTime: '08:00', type: 'Charge', power: 100 },
    { id: '2', startTime: '08:00', endTime: '14:00', type: 'Standby', power: 0 },
    { id: '3', startTime: '14:00', endTime: '18:00', type: 'Discharge', power: 180 }, 
    { id: '4', startTime: '18:00', endTime: '24:00', type: 'Charge', power: 100 },
];

const generateTimeSlots = (): PriceRow[] => {
  const slots: PriceRow[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      
      let basePrice = 0.35;
      if (h >= 8 && h < 11) basePrice = 0.85; 
      if (h >= 11 && h < 14) basePrice = 0.55; 
      if (h >= 14 && h < 18) basePrice = 0.85; 
      if (h >= 18 && h < 22) basePrice = 1.05; 
      
      slots.push({
        time: `${hh}:${mm}`,
        priceA: basePrice,
        source: 'Manual'
      });
    }
  }
  const last = slots[slots.length - 1];
  if (last) {
    slots.push({ time: '24:00', priceA: last.priceA, source: last.source });
  }
  return slots;
};

/** AI 调度策略页电价预览：横轴固定 0:00–24:00，刻度稀疏避免重叠 */
const PRICE_PREVIEW_X_AXIS_TICKS = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'];

const formatPricePreviewTimeTick = (raw: string): string => {
  if (raw === '00:00') return '0:00';
  if (raw === '24:00') return '24:00';
  const [hs, ms] = raw.split(':');
  const h = parseInt(hs, 10);
  const m = parseInt(ms, 10);
  if (Number.isNaN(h)) return raw;
  if (m === 0) return `${h}:00`;
  return raw;
};

interface StrategyManagerProps {
    lang: Language;
    theme: Theme;
    selectedStation: string;
    initialTab?: string;
    hideOverviewTab?: boolean;
    /** 隐藏顶部「执行视图 / AI调度执行 / AI调度策略」切换条（仅标题区） */
    hideStrategyTabBar?: boolean;
    onTabChange?: (tab: string) => void;
    onNavigate?: (path: string) => void;
    viewMode?: 'my' | 'site';
    stations?: StationListItem[];
    strategyStationBindings?: StrategyStationBindings;
}

const StrategyManager: React.FC<StrategyManagerProps> = ({
    lang,
    theme,
    selectedStation,
    initialTab = 'overview',
    hideOverviewTab = false,
    hideStrategyTabBar = false,
    onTabChange,
    onNavigate,
    viewMode = 'site',
    stations = [],
    strategyStationBindings = {},
}) => {
    const t = translations[lang].strategyManager;
    const tPrice = translations[lang].priceEditor;
    const tPList = translations[lang].priceList;
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState<string>(initialTab);

    React.useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    React.useEffect(() => {
        if (hideOverviewTab && activeTab === 'overview') {
            setActiveTab('orchestration');
        }
    }, [hideOverviewTab, activeTab]);
    const [cloudStrategies, setCloudStrategies] = useState<StrategyItem[]>(DEFAULT_STRATEGIES);
    const [isEditing, setIsEditing] = useState(false);
    
    // Shared State for Templates
    const [activeTemplateId, setActiveTemplateId] = useState<string>('profit_max');
    
    const [myTemplates, setMyTemplates] = useState<Template[]>([
        { id: 'profit_max', nameKey: 'profitMax', typeKey: 'algo', scopeKey: 'allSites', statusKey: 'active', isRemovable: false },
        { id: 'u1', nameKey: 'peakTpl', typeKey: 'staticTpl', scopeKey: 'summer', statusKey: 'ready', isRemovable: true },
        { id: 'u2', nameKey: 'vpp', typeKey: 'apiHook', scopeKey: 'site2', statusKey: 'inactive', isRemovable: true },
        { id: 'u3', nameKey: 'aiDispatch', typeKey: 'algo', scopeKey: 'allSites', statusKey: 'ready', isRemovable: true }
    ]);
    const [showCreateSetModal, setShowCreateSetModal] = useState(false);
    const [newSetName, setNewSetName] = useState('');
    const [expandedSets, setExpandedSets] = useState<Record<string, boolean>>({});
    const [showEditStrategyModal, setShowEditStrategyModal] = useState(false);
    const [editingStrategyRef, setEditingStrategyRef] = useState<{ setId: string; rowIdx: number } | null>(null);

    type SetStrategyRow = { name: string; status: 'enabled' | 'disabled'; lastUpdate: string };

    const [setStrategies, setSetStrategies] = useState<Record<string, SetStrategyRow[]>>({
        u1: [
            {
                name: lang === 'zh' ? '工作日削峰策略' : 'Weekday Peak Shaving',
                status: 'enabled',
                lastUpdate: lang === 'zh' ? '2026年03月28日 10:30' : '2026-03-28 10:30',
            },
        ],
        u2: [
            {
                name: lang === 'zh' ? '台风保电策略' : 'Storm Backup Strategy',
                status: 'disabled',
                lastUpdate: lang === 'zh' ? '2026年03月24日 14:45' : '2026-03-24 14:45',
            },
        ],
    });

    const [stationDeployState, setStationDeployState] = useState<StrategyStationDeployState>(() =>
        JSON.parse(JSON.stringify(MOCK_STRATEGY_STATION_DEPLOY)) as StrategyStationDeployState
    );

    const deployStrategyToStations = React.useCallback(
        (templateId: string) => {
            const ids = strategyStationBindings[templateId] ?? [];
            if (ids.length === 0) return;
            setStationDeployState((prev) => {
                const next: StrategyStationDeployState = { ...prev, [templateId]: { ...(prev[templateId] ?? {}) } };
                for (const sid of ids) {
                    const cur = next[templateId][sid] ?? { lastDeployTime: '', status: 'never' as const };
                    next[templateId][sid] = { ...cur, status: 'pending' };
                }
                return next;
            });
            window.setTimeout(() => {
                const now = new Date();
                const ts =
                    lang === 'zh'
                        ? `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                setStationDeployState((prev) => {
                    const next: StrategyStationDeployState = { ...prev, [templateId]: { ...(prev[templateId] ?? {}) } };
                    for (const sid of ids) {
                        next[templateId][sid] = { lastDeployTime: ts, status: 'success' };
                    }
                    return next;
                });
            }, 650);
        },
        [strategyStationBindings, lang]
    );
    
    const displayedTemplates = viewMode === 'my' 
        ? myTemplates.filter(t => t.isRemovable && t.id !== 'profit_max') 
        : myTemplates;
    
    // Ensure activeTemplateId is valid for the current view
    React.useEffect(() => {
        if (displayedTemplates.length > 0 && !displayedTemplates.find(t => t.id === activeTemplateId)) {
            setActiveTemplateId(displayedTemplates[0].id);
        }
    }, [viewMode, displayedTemplates, activeTemplateId]);
    
    const [priceRows, setPriceRows] = useState<PriceRow[]>(generateTimeSlots());
    const [coeffs, setCoeffs] = useState<Coefficients>({
        pv: { grid: 0.3, local: 0.7 },
        charge: { fromPv: 0.7, fromGrid: 1.0 },
        discharge: { toGrid: 0.3, toLoad: 0.8 },
    });

    const [showDeployModal, setShowDeployModal] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [inputCode, setInputCode] = useState('');
    const [deployError, setDeployError] = useState(false);
    const [deploySuccess, setDeploySuccess] = useState(false);

    // Edge Strategy State
    const [edgeViewDate, setEdgeViewDate] = useState<'today' | 'yesterday'>('today');
    const [edgeData, setEdgeData] = useState({
        today: EDGE_STRATEGIES_TODAY,
        yesterday: EDGE_STRATEGIES_YESTERDAY
    });
    const [isSyncingEdge, setIsSyncingEdge] = useState(false);
    const [edgeLastSyncTime, setEdgeLastSyncTime] = useState('14:30:00');

    // Price Selection State
    const [showPriceSelectionModal, setShowPriceSelectionModal] = useState(false);
    const [selectedPriceSchemeId, setSelectedPriceSchemeId] = useState('SCH-001');
    const [modalPriceTab, setModalPriceTab] = useState<'user' | 'api'>('user');

    // Coefficients Edit State
    const [showCoeffEditModal, setShowCoeffEditModal] = useState(false);

    // Template Change State
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    // Chart visibility toggles
    const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
    const toggleSeries = (dataKey: string) => {
        setHiddenSeries(prev => prev.includes(dataKey) ? prev.filter(k => k !== dataKey) : [...prev, dataKey]);
    };

    const userTemplates = [
        { id: 'u1', name: lang === 'zh' ? '夏季削峰策略' : 'Summer Peak Shaving', updated: lang === 'zh' ? '2天前' : '2 days ago' },
        { id: 'u2', name: lang === 'zh' ? '应急备电 (台风)' : 'Emergency Backup (Storm)', updated: lang === 'zh' ? '1周前' : '1 week ago' },
    ];

    const userSchemes = [
        { id: 'SCH-002', name: lang === 'zh' ? '慕尼黑科技园峰谷电价' : 'Munich Tech Hub TOU', region: 'DE-BY', type: 'Gen. Ind.', voltage: '20kV' },
        { id: 'SCH-005', name: lang === 'zh' ? '维也纳分时电价 V3' : 'Vienna TOU V3', region: 'AT-WI', type: 'Large Ind.', voltage: '10kV' },
    ];

    const systemSchemes = [
        { id: 'SCH-001', name: lang === 'zh' ? 'EPEX 德国日前市场自动策略' : 'EPEX Spot DE Auto Strategy', region: 'DE-LU', provider: 'EPEX SPOT', frequency: 'Day-Ahead' },
        { id: 'SCH-006', name: lang === 'zh' ? '北欧电力现货 (Nord Pool)' : 'Nord Pool Spot', region: 'EU-NO', provider: 'Nord Pool AS', frequency: 'Day-Ahead' },
    ];

    const chartColors = {
      grid: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      text: isDark ? '#86868b' : '#6e6e73',
      tooltipBg: isDark ? '#1e2128' : '#FFFFFF',
      tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    }

    const fmt = (num: number) => num.toFixed(3);

    const getTemplateName = (key: string) => {
        return t.sourceContent.table[key] || key;
    };

    /** Labels for AI 调度执行「更换模板」：与 AI调度策略页两张卡标题一致 */
    const getTemplateDisplayNameForOrchestration = (tpl: Template) => {
        if (tpl.id === 'profit_max') return t.templates.profitMax.title;
        if (tpl.id === 'u3') {
            return lang === 'zh' ? '绿电消纳最大化' : 'Green Power Efficiency Maximization Strategy';
        }
        return getTemplateName(tpl.nameKey);
    };

    const aiDispatchStrategyTemplates = React.useMemo(
        () =>
            (['profit_max', 'u3'] as const)
                .map((id) => myTemplates.find((x) => x.id === id))
                .filter((x): x is Template => x != null),
        [myTemplates]
    );

    const orchestrationCurrentTemplate = React.useMemo(() => {
        if (activeTemplateId === 'profit_max' || activeTemplateId === 'u3') {
            return myTemplates.find((x) => x.id === activeTemplateId) ?? myTemplates[0];
        }
        return myTemplates.find((x) => x.id === 'profit_max') ?? myTemplates[0];
    }, [activeTemplateId, myTemplates]);

    const changeTemplateModalActiveId =
        activeTemplateId === 'profit_max' || activeTemplateId === 'u3' ? activeTemplateId : 'profit_max';

    const getTemplateLastUpdate = (templateId: string) => {
        const timestampMap: Record<string, string> = {
            u1: '2026-03-30T09:20:00',
            u2: '2026-03-24T14:45:00',
            u3: '2026-03-18T08:00:00',
        };
        const date = new Date(timestampMap[templateId] || '2026-03-20T10:00:00');
        if (lang === 'zh') {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            return `${y}年${m}月${d}日 ${hh}:${mm}`;
        }
        return date.toISOString().slice(0, 16).replace('T', ' ');
    };

    const formatStrategyRowStatus = (status: 'enabled' | 'disabled') => {
        if (lang === 'zh') return status === 'enabled' ? '启用' : '停用';
        return status === 'enabled' ? 'Enabled' : 'Disabled';
    };

    const formatNow = () => {
        const date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return lang === 'zh' ? `${y}年${m}月${d}日 ${hh}:${mm}` : `${y}-${m}-${d} ${hh}:${mm}`;
    };

    const handleCreateStrategySet = () => {
        const trimmed = newSetName.trim();
        if (!trimmed) return;
        const id = `u${Date.now()}`;
        setMyTemplates((prev) => [
            ...prev,
            { id, nameKey: trimmed, typeKey: 'staticTpl', scopeKey: 'custom', statusKey: 'ready', isRemovable: true },
        ]);
        setSetStrategies((prev) => ({ ...prev, [id]: [] as SetStrategyRow[] }));
        setExpandedSets((prev) => ({ ...prev, [id]: true }));
        setActiveTemplateId(id);
        setNewSetName('');
        setShowCreateSetModal(false);
    };

    const toggleExpandSet = (id: string) => {
        setExpandedSets((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const openEditStrategyModal = (setId: string, rowIdx: number, row: SetStrategyRow) => {
        setEditingStrategyRef({ setId, rowIdx });
        setShowEditStrategyModal(true);
    };

    const closeEditStrategyModal = () => {
        setShowEditStrategyModal(false);
        setEditingStrategyRef(null);
    };

    const saveEditedStrategy = (strategy: any) => {
        if (!editingStrategyRef) return;
        const { setId, rowIdx } = editingStrategyRef;
        setSetStrategies((prev) => {
            const rows = prev[setId] || [];
            const nextRows = rows.map((r, idx) =>
                idx === rowIdx
                    ? {
                        ...r,
                        name: (strategy?.name || '').trim() || r.name,
                        status: strategy?.enabled === false ? 'disabled' : 'enabled',
                        lastUpdate: formatNow(),
                    }
                    : r
            );
            return { ...prev, [setId]: nextRows };
        });
        closeEditStrategyModal();
    };

    const handleDeployClick = () => {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        setVerificationCode(code);
        setInputCode('');
        setDeployError(false);
        setDeploySuccess(false);
        setShowDeployModal(true);
    };

    const verifyAndDeploy = () => {
        if (inputCode === verificationCode) {
            setDeploySuccess(true);
            if (isEditing) setIsEditing(false);
        } else {
            setDeployError(true);
        }
    };

    const handleCoeffChange = (section: keyof Coefficients, key: string, value: string) => {
        const num = parseFloat(value);
        if (isNaN(num)) return;
        setCoeffs(prev => ({...prev, [section]: { ...prev[section], [key]: num }}));
    };

    const handleSyncEdge = () => {
        setIsSyncingEdge(true);
        setTimeout(() => {
            const now = new Date();
            setEdgeLastSyncTime(now.toLocaleTimeString('en-US', { hour12: false }));
            setIsSyncingEdge(false);
            setEdgeData({
                today: [...EDGE_STRATEGIES_TODAY],
                yesterday: [...EDGE_STRATEGIES_YESTERDAY]
            });
        }, 1500);
    };

    const renderTypeBadge = (type: string) => {
        const styles = {
            'Charge': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            'Discharge': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            'Standby': 'bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark text-apple-text-secondary-light dark:text-apple-text-secondary-dark border-slate-200 dark:border-apple-border-dark'
        };
        const icons = {
            'Charge': <PlayCircle size={12}/>,
            'Discharge': <StopCircle size={12}/>,
            'Standby': <PauseCircle size={12}/>
        }
        const s = styles[type as keyof typeof styles] || styles['Standby'];
        const icon = icons[type as keyof typeof icons] || icons['Standby'];
        
        let label = type;
        if (type === 'Charge') label = t.charge;
        if (type === 'Discharge') label = t.discharge;
        if (type === 'Standby') label = t.standby;

        return <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border w-fit ${s}`}>{icon} {label}</span>;
    };

    const tooltipStyle = {
        contentStyle: { 
            borderRadius: '12px', 
            border: `1px solid ${chartColors.tooltipBorder}`, 
            backgroundColor: chartColors.tooltipBg, 
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            backdropFilter: 'blur(8px)',
            padding: '12px'
        },
        itemStyle: { fontSize: '13px', fontWeight: 500, padding: '4px 0' },
        labelStyle: { color: isDark ? '#86868b' : '#6e6e73', marginBottom: '8px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }
    };

    // Custom Legend
    const CustomLegend = ({ payload, onClick, legendMb = 'mb-4' }: any) => (
        <div className={`flex flex-wrap justify-end gap-4 ${legendMb}`}>
            {payload.map((entry: any, index: number) => (
                <button 
                    key={`item-${index}`} 
                    onClick={() => onClick(entry.dataKey)}
                    className={`flex items-center gap-2 text-xs font-medium transition-all ${hiddenSeries.includes(entry.dataKey) ? 'opacity-30 grayscale' : 'opacity-100'} text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:opacity-80`}
                >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                    {entry.value}
                </button>
            ))}
        </div>
    );

    // --- Tab Components ---

    const OverviewTab = () => {
        const activeTpl = displayedTemplates.find(t => t.id === activeTemplateId) || displayedTemplates[0];
        const templateName = getTemplateName(activeTpl.nameKey);

        const todayChartTitle = `${t.realtimeMonitor} — ${lang === 'zh' ? '今日' : 'Today'}`;

        return (
        <div className="space-y-4">
            {/* KPI — 与数据总览 Dashboard 同款卡片结构 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="ems-card group relative overflow-hidden p-4 transition-all hover:shadow-md">
                    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-purple-50 opacity-50 blur-2xl dark:bg-purple-900/10"></div>
                    <div className="relative z-10 flex min-h-[112px] flex-col">
                        <div className="mb-2 flex items-start justify-between">
                            <div className="rounded-xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                                <Cpu size={16} />
                            </div>
                            <span className="flex items-center gap-1 rounded-full border border-purple-200/50 bg-purple-100/50 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:border-purple-800/50 dark:bg-purple-900/30 dark:text-purple-400">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500"></span>
                                {t.overviewBadgeActive}
                            </span>
                        </div>
                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t.currentTemplate}</p>
                        <div className="line-clamp-2 text-lg font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white">{templateName}</div>
                    </div>
                </div>

                <div className="ems-card group relative overflow-hidden p-4 transition-all hover:shadow-md">
                    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-50 opacity-50 blur-2xl dark:bg-amber-900/10"></div>
                    <div className="relative z-10">
                        <div className="mb-2 flex items-start justify-between">
                            <div className="rounded-xl bg-amber-50 p-2 text-amber-500 dark:bg-amber-900/20 dark:text-amber-400">
                                <Zap size={16} />
                            </div>
                            <span className="flex items-center gap-0.5 rounded-full border border-blue-200/50 bg-blue-100/50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:border-blue-800/50 dark:bg-blue-900/30 dark:text-blue-400">
                                <Activity size={10} />
                                {t.overviewBadgeDischarging}
                            </span>
                        </div>
                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t.power}</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">-120</span>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">kW</span>
                        </div>
                    </div>
                </div>

                <div className="ems-card group relative overflow-hidden p-4 transition-all hover:shadow-md">
                    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-50 opacity-50 blur-2xl dark:bg-emerald-900/10"></div>
                    <div className="relative z-10">
                        <div className="mb-2 flex items-start justify-between">
                            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400">
                                <Battery size={16} />
                            </div>
                        </div>
                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">SOC</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-extrabold tracking-tight text-emerald-500">85.4</span>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">%</span>
                        </div>
                        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-apple-bg-light shadow-inner dark:bg-apple-bg-dark">
                            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: '85.4%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="ems-card group relative overflow-hidden p-4 transition-all hover:shadow-md">
                    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-indigo-50 opacity-50 blur-2xl dark:bg-indigo-900/10"></div>
                    <div className="relative z-10">
                        <div className="mb-2 flex items-start justify-between">
                            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                                <DollarSign size={16} />
                            </div>
                            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                {t.overviewLiveSync}
                            </span>
                        </div>
                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t.realtimePrice}</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">0.85</span>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">CNY/kWh</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 图表区 — 标题条与数据总览右侧分布卡一致 */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="ems-card flex min-h-[400px] flex-col overflow-hidden lg:min-h-0 lg:h-[600px]">
                    <div className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50">
                        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                            <span className="rounded-xl bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                <Activity size={16} />
                            </span>
                            {todayChartTitle}
                        </h3>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                        <p className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t.chartSectionPower}</p>
                        <div className="min-h-0 w-full flex-[1.45]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={MOCK_SYNC_DATA} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorEdgeToday" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                    <XAxis dataKey="time" hide />
                                    {/* domain 与刻度一致，避免 [-300,900] 在 300kW 以上留出大块空白 */}
                                    <YAxis orientation="left" domain={[-300, 300]} ticks={[-300, -150, 0, 150, 300]} fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} stroke={chartColors.text} tickFormatter={(val) => `${val}kW`} />
                                    <Tooltip {...tooltipStyle} />
                                    <Legend verticalAlign="top" height={28} content={<CustomLegend onClick={toggleSeries} legendMb="mb-0" />} />
                                    <Area hide={hiddenSeries.includes('edge')} name={t.legendEdge} type="stepAfter" dataKey="edge" stroke="#3b82f6" fill="url(#colorEdgeToday)" strokeWidth={2.5} animationDuration={500} />
                                    <Line hide={hiddenSeries.includes('cloud')} name={t.legendCloud} type="stepAfter" dataKey="cloud" stroke="#f97316" strokeWidth={2.5} strokeDasharray="4 4" dot={false} animationDuration={500} />
                                    <Line hide={hiddenSeries.includes('recommended')} name={t.legendAiForecast} type="monotone" dataKey="recommended" stroke="#10b981" strokeWidth={2} dot={false} animationDuration={500} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="shrink-0 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t.chartSectionSoc}</p>
                        <div className="min-h-0 w-full flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={MOCK_SYNC_DATA} margin={{ top: 4, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                    <XAxis dataKey="time" fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={8} minTickGap={30} stroke={chartColors.text} />
                                    <YAxis orientation="left" domain={[0, 100]} ticks={[0, 50, 100]} fontSize={11} tickLine={false} axisLine={false} stroke={chartColors.text} tickFormatter={(val) => `${val}%`} />
                                    <Tooltip {...tooltipStyle} />
                                    <Legend verticalAlign="top" height={36} content={<CustomLegend onClick={toggleSeries}/>} />
                                    <Line hide={hiddenSeries.includes('socForecast1')} name="SOC实际" type="monotone" dataKey="socForecast1" stroke="#8b5cf6" strokeWidth={2} dot={false} animationDuration={500} />
                                    <Line hide={hiddenSeries.includes('socForecast2')} name="SOC Forecast 2" type="monotone" dataKey="socForecast2" stroke="#ec4899" strokeWidth={2} dot={false} animationDuration={500} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
                <div className="ems-card flex min-h-[400px] flex-col overflow-hidden lg:min-h-0 lg:h-[600px]">
                    <div className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50">
                        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                            <span className="rounded-xl bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                <Activity size={16} />
                            </span>
                            {t.forecastTomorrowTitle}
                        </h3>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                        <p className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t.chartSectionPower}</p>
                        <div className="min-h-0 w-full flex-[1.45]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={MOCK_FORECAST_DATA} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                    <XAxis dataKey="time" hide />
                                    <YAxis orientation="left" domain={[-300, 300]} ticks={[-300, -150, 0, 150, 300]} fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} stroke={chartColors.text} tickFormatter={(val) => `${val}kW`} />
                                    <Tooltip {...tooltipStyle} />
                                    <Legend verticalAlign="top" height={28} content={<CustomLegend onClick={toggleSeries} legendMb="mb-0" />} />
                                    <Line hide={hiddenSeries.includes('cloud')} name={t.legendCloud} type="stepAfter" dataKey="cloud" stroke="#f97316" strokeWidth={2.5} strokeDasharray="4 4" dot={false} animationDuration={500} />
                                    <Line hide={hiddenSeries.includes('recommended')} name={t.legendAiForecast} type="monotone" dataKey="recommended" stroke="#10b981" strokeWidth={2} dot={false} animationDuration={500} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="shrink-0 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{t.chartSectionSoc}</p>
                        <div className="min-h-0 w-full flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={MOCK_FORECAST_DATA} margin={{ top: 4, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                    <XAxis dataKey="time" fontSize={12} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={8} minTickGap={30} stroke={chartColors.text} />
                                    <YAxis orientation="left" domain={[0, 100]} ticks={[0, 50, 100]} fontSize={11} tickLine={false} axisLine={false} stroke={chartColors.text} tickFormatter={(val) => `${val}%`} />
                                    <Tooltip {...tooltipStyle} />
                                    <Legend verticalAlign="top" height={36} content={<CustomLegend onClick={toggleSeries}/>} />
                                    <Line hide={hiddenSeries.includes('socForecast1')} name="SOC实际" type="monotone" dataKey="socForecast1" stroke="#8b5cf6" strokeWidth={2} dot={false} animationDuration={500} />
                                    <Line hide={hiddenSeries.includes('socForecast2')} name="SOC Forecast 2" type="monotone" dataKey="socForecast2" stroke="#ec4899" strokeWidth={2} dot={false} animationDuration={500} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        );
    };

    const OrchestrationTab = () => {
        const [strategyDate, setStrategyDate] = useState('2025-09-16');

        return (
            <div className="animate-in space-y-4 slide-in-from-right-4 duration-500">
                {/* 顶栏 — 与电价列表工具条一致 */}
                <div className="ems-card mb-4 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex w-full flex-wrap items-center gap-6 md:w-auto">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.currentTemplate}</span>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-200">
                                    <LayoutTemplate size={18} className="text-purple-500" />
                                    {getTemplateDisplayNameForOrchestration(orchestrationCurrentTemplate)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowTemplateModal(true)}
                                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                                >
                                    <RefreshCcw size={16} /> {t.changeTemplate}
                                </button>
                            </div>
                        </div>

                        <div className="hidden h-8 w-px bg-slate-200 dark:bg-white/10 md:block" />

                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.dispatchMode}</span>
                            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <Zap size={14} className="fill-current" />
                                {t.modeAuto}
                            </span>
                        </div>
                    </div>

                    <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
                        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-300 md:flex">
                            <MapPin size={16} className="text-slate-400" />
                            {lang === 'zh' ? 'DE-BY 慕尼黑' : 'DE-BY Munich'}
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm font-bold text-slate-800 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200">
                            <Clock size={16} className="text-slate-400" />
                            <span className="tracking-wide">2025-09-16 14:30:24</span>
                        </div>
                    </div>
                </div>

                <div className="grid min-h-[500px] grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* 边缘策略表 — 与电价列表表格壳一致 */}
                    <div className="ems-card relative flex h-[600px] flex-col overflow-hidden">
                        <div className="border-b border-slate-100 bg-slate-50/50 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50">
                            <div className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                                    <Activity size={18} className="text-blue-500" />
                                    {t.edgeStrategyTitle}
                                </h3>
                                <div className="ems-segmented shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setEdgeViewDate('today')}
                                        className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${edgeViewDate === 'today' ? 'bg-white text-blue-600 shadow-sm dark:bg-apple-surface-dark dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                                    >
                                        {t.viewToday}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEdgeViewDate('yesterday')}
                                        className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${edgeViewDate === 'yesterday' ? 'bg-white text-blue-600 shadow-sm dark:bg-apple-surface-dark dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                                    >
                                        {t.viewYesterday}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-3 dark:border-apple-border-dark sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <span>{t.edgeStatus}:</span>
                                        <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 normal-case text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            {t.enabled}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 normal-case">
                                        <span>{t.edgeLastSync}:</span>
                                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{edgeLastSyncTime}</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSyncEdge}
                                    disabled={isSyncingEdge}
                                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                                >
                                    {isSyncingEdge ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                    {isSyncingEdge ? t.syncing : t.fetch}
                                </button>
                            </div>
                        </div>
                        <div className="custom-scrollbar flex-1 overflow-auto">
                            <table className="w-full border-separate border-spacing-0 text-left text-sm">
                                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-xs font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/95 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4">{t.start}</th>
                                        <th className="px-6 py-4">{t.end}</th>
                                        <th className="px-6 py-4">{t.type}</th>
                                        <th className="px-6 py-4 text-right">{t.power}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                                    {edgeData[edgeViewDate].map((item) => (
                                        <tr
                                            key={item.id}
                                            className="transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                                        >
                                            <td className="px-6 py-4 font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{item.startTime}</td>
                                            <td className="px-6 py-4 font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{item.endTime}</td>
                                            <td className="px-6 py-4">{renderTypeBadge(item.type)}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-slate-800 dark:text-slate-200">{item.power} kW</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 云端调度表 */}
                    <div className="ems-card relative flex h-[600px] flex-col overflow-hidden">
                        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50">
                            <div className="flex flex-wrap items-center gap-3">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                                    <Cloud size={18} className="text-blue-500" />
                                    {t.cloudDispatch}
                                </h3>
                                {isEditing && (
                                    <span className="rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                        {t.editing}
                                    </span>
                                )}
                                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-500 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-400">
                                    <Clock size={12} className="shrink-0" />
                                    <span className="uppercase tracking-wider">{t.lastDispatch}</span>
                                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">2025-09-16 14:30</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-6 border-b border-slate-100 px-6 py-3 dark:border-apple-border-dark">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                                <Calendar size={16} className="text-slate-400" />
                                <span className="uppercase tracking-wider text-slate-500 dark:text-slate-400">{t.strategyDate}</span>
                            </div>
                            <input
                                type="date"
                                value={strategyDate}
                                disabled={!isEditing}
                                onChange={(e) => setStrategyDate(e.target.value)}
                                className={`rounded-xl border bg-slate-50 px-3 py-2 font-mono text-sm font-semibold outline-none transition-all dark:bg-apple-surface-secondary-dark ${
                                    isEditing
                                        ? 'border-blue-500/40 text-slate-800 focus:ring-2 focus:ring-blue-100 dark:border-blue-500/40 dark:text-slate-200 dark:focus:ring-blue-900'
                                        : 'cursor-not-allowed border-transparent text-slate-500 opacity-80 dark:text-slate-400'
                                }`}
                            />
                        </div>

                        <div className="custom-scrollbar flex-1 overflow-auto pb-16">
                            <table className="w-full border-separate border-spacing-0 text-left text-sm">
                                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-xs font-bold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/95 dark:text-slate-400">
                                    <tr>
                                        <th className="w-32 px-6 py-4">{t.start}</th>
                                        <th className="w-32 px-6 py-4">{t.end}</th>
                                        <th className="px-6 py-4">{t.type}</th>
                                        <th className="px-6 py-4 text-right">{t.power}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                                    {cloudStrategies.map((item) => (
                                        <tr key={item.id} className="transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <input
                                                        type="time"
                                                        defaultValue={item.startTime}
                                                        className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200 dark:focus:ring-blue-900"
                                                    />
                                                ) : (
                                                    <span className="inline-block rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-sm font-bold text-slate-700 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-300">
                                                        {item.startTime}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <input
                                                        type="time"
                                                        defaultValue={item.endTime}
                                                        className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200 dark:focus:ring-blue-900"
                                                    />
                                                ) : (
                                                    <span className="inline-block rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-sm font-bold text-slate-700 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-300">
                                                        {item.endTime}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isEditing ? (
                                                    <select
                                                        defaultValue={item.type}
                                                        className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200 dark:focus:ring-blue-900"
                                                    >
                                                        <option value="Charge">{t.charge}</option>
                                                        <option value="Discharge">{t.discharge}</option>
                                                        <option value="Standby">{t.standby}</option>
                                                    </select>
                                                ) : (
                                                    renderTypeBadge(item.type)
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-slate-800 dark:text-slate-200">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        defaultValue={item.power}
                                                        className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-right font-mono text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200 dark:focus:ring-blue-900"
                                                    />
                                                ) : (
                                                    `${item.power} kW`
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {isEditing && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-4 text-center dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/30">
                                    <button
                                        type="button"
                                        className="mx-auto flex max-w-xs items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                                    >
                                        <Plus size={16} /> {t.addRow}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 flex h-16 items-center justify-end border-t border-slate-100 bg-white/90 px-6 backdrop-blur-md dark:border-apple-border-dark dark:bg-apple-surface-dark/90">
                            <div className="flex w-full gap-3 lg:w-auto">
                                <button
                                    type="button"
                                    onClick={handleDeployClick}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 lg:flex-none"
                                >
                                    <Download size={18} /> {t.deploy}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const TemplatesTab = () => {
        const profitMaxActive = activeTemplateId === 'profit_max';
        const userTpls = displayedTemplates
            .filter(t => t.id !== 'profit_max')
            .sort((a, b) => {
                const aIsAi = a.nameKey === 'aiDispatch';
                const bIsAi = b.nameKey === 'aiDispatch';
                if (aIsAi && !bIsAi) return -1;
                if (!aIsAi && bIsAi) return 1;
                return 0;
            });
        const linkedIds = strategyStationBindings[activeTemplateId] ?? [];
        const linkedStations = stations.filter((s) => linkedIds.includes(s.id));
        const activeUserTpl = userTpls.find((t) => t.id === activeTemplateId) ?? userTpls[0];
        const isGreenStrategyActive = activeTemplateId === 'u3';
        const tt = t.templates;

        const deployStatusPillClass = (s: StrategyDeployStatus) => {
            switch (s) {
                case 'success':
                    return 'bg-emerald-500/15 text-emerald-800 border-emerald-500/40 dark:text-emerald-200 dark:border-emerald-500/35';
                case 'pending':
                    return 'bg-amber-500/15 text-amber-900 border-amber-500/40 dark:text-amber-100 dark:border-amber-500/35';
                case 'failed':
                    return 'bg-red-500/15 text-red-800 border-red-500/40 dark:text-red-200 dark:border-red-500/35';
                default:
                    return 'bg-slate-100 text-apple-text-tertiary-light border-slate-200 dark:bg-apple-surface-secondary-dark dark:text-apple-text-tertiary-dark dark:border-apple-border-dark';
            }
        };

        return (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 pb-12">
                {viewMode !== 'my' && (
                <div>
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6">
                    <div className="min-w-0 flex-1">
                    <div className={`relative bg-white dark:bg-apple-surface-dark border transition-all overflow-hidden rounded-3xl shadow-sm
                        ${profitMaxActive ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 dark:border-apple-border-dark'}`}>
                        {profitMaxActive && (
                            <span className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30">
                                {lang === 'zh' ? '已激活' : 'Activated'}
                            </span>
                        )}
                        <div className="p-6">
                            <div className="flex flex-col justify-between">
                                <div>
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                        <div className="flex items-start gap-4 min-w-0 flex-1">
                                            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                                                <TrendingDown size={22}/>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                                                    <h4 className="text-xl font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark tracking-tight">
                                                        {t.templates.profitMax.title}
                                                    </h4>
                                                    <span
                                                        className={`inline-flex shrink-0 items-center rounded-full border border-brand-400/50 bg-gradient-to-r from-brand-600 to-brand-500 px-3 py-1 text-[11px] font-bold text-white shadow-md shadow-brand-500/35 ring-1 ring-white/25 dark:from-brand-500 dark:to-brand-600 dark:ring-white/15 ${lang === 'zh' ? 'tracking-wide' : 'uppercase tracking-wider'}`}
                                                    >
                                                        {t.templates.profitMax.tag}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-apple-text-secondary-light dark:text-apple-text-secondary-dark mt-1.5 leading-relaxed max-w-3xl">
                                                    {t.templates.profitMax.desc}
                                                </p>
                                            </div>
                                        </div>

                                        {!profitMaxActive && (
                                            <span className="flex shrink-0 items-center gap-2 self-start text-[10px] font-bold text-apple-text-secondary-light dark:text-apple-text-secondary-dark bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark px-3 py-1.5 rounded-full border border-slate-200 dark:border-apple-border-dark uppercase tracking-widest w-fit">
                                                Ready
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 mt-8">
                                    {!profitMaxActive && (
                                        <button 
                                            onClick={() => setActiveTemplateId('profit_max')}
                                            className="px-6 h-9 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-full font-bold transition-all flex items-center gap-2 shadow-lg shadow-brand-500/20"
                                        >
                                            <PlayCircle size={16}/> {t.templates.profitMax.apply}
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setShowPriceSelectionModal(true)}
                                        className="px-5 h-9 text-xs border border-slate-200 dark:border-apple-border-dark hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark text-apple-text-primary-light dark:text-apple-text-primary-dark rounded-full font-bold transition-all flex items-center gap-2"
                                    >
                                        <DollarSign size={16} />
                                        {lang === 'zh' ? '配置电价' : 'Configure Price'}
                                    </button>
                                    <button 
                                        onClick={() => setShowCoeffEditModal(true)}
                                        className="px-5 h-9 text-xs border border-slate-200 dark:border-apple-border-dark hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark text-apple-text-primary-light dark:text-apple-text-primary-dark rounded-full font-bold transition-all flex items-center gap-2"
                                    >
                                        <Coins size={16} />
                                        {lang === 'zh' ? '发电收益与成本系数' : 'Generation Revenue & Cost Coefficients'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Part: Coefficients Configuration (Read-only View) — 标题与说明置于网格上方横向排列，三列参数占满宽 */}
                        <div className="border-t border-slate-200 dark:border-apple-border-dark bg-apple-surface-secondary-light/30 dark:bg-apple-surface-secondary-dark/30 p-6">
                            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                                        <Zap size={18} />
                                    </div>
                                    <h3 className="text-sm font-bold tracking-tight text-apple-text-primary-light dark:text-apple-text-primary-dark">
                                        {tPrice.coeffTitle}
                                    </h3>
                                </div>
                                <p className="text-xs leading-relaxed text-apple-text-secondary-light dark:text-apple-text-secondary-dark opacity-90 sm:max-w-md sm:text-right md:max-w-lg lg:max-w-xl">
                                    {tPrice.note}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-apple-border-dark uppercase tracking-widest">
                                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                            {tPrice.pvCoeffs}
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-apple-text-secondary-light dark:text-apple-text-secondary-dark">{tPrice.gridPrice}</label>
                                                <div className="flex items-center gap-2 font-mono text-base font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark">
                                                    <span className="text-[10px] text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase font-sans">Ax</span>
                                                    {coeffs.pv.grid}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-apple-text-secondary-light dark:text-apple-text-secondary-dark">{tPrice.localUse}</label>
                                                <div className="flex items-center gap-2 font-mono text-base font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark">
                                                    <span className="text-[10px] text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase font-sans">Ax</span>
                                                    {coeffs.pv.local}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-apple-border-dark uppercase tracking-widest">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            {tPrice.storageCharge}
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-apple-text-secondary-light dark:text-apple-text-secondary-dark">{tPrice.fromPv}</label>
                                                <div className="flex items-center gap-2 font-mono text-base font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark">
                                                    <span className="text-[10px] text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase font-sans">Ax</span>
                                                    {coeffs.charge.fromPv}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-apple-text-secondary-light dark:text-apple-text-secondary-dark">{tPrice.fromGrid}</label>
                                                <div className="flex items-center gap-2 font-mono text-base font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark">
                                                    <span className="text-[10px] text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase font-sans">Ax</span>
                                                    {coeffs.charge.fromGrid}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-apple-border-dark uppercase tracking-widest">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            {tPrice.storageDischarge}
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-apple-text-secondary-light dark:text-apple-text-secondary-dark">{tPrice.toGrid}</label>
                                                <div className="flex items-center gap-2 font-mono text-base font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark">
                                                    <span className="text-[10px] text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase font-sans">Ax</span>
                                                    {coeffs.discharge.toGrid}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-apple-text-secondary-light dark:text-apple-text-secondary-dark">{tPrice.toLoad}</label>
                                                <div className="flex items-center gap-2 font-mono text-base font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark">
                                                    <span className="text-[10px] text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase font-sans">Ax</span>
                                                    {coeffs.discharge.toLoad}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-apple-border-dark p-6 bg-apple-surface-secondary-light/20 dark:bg-apple-surface-secondary-dark/20">
                            <div className="w-full bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark rounded-2xl border border-slate-200 dark:border-apple-border-dark p-5 flex flex-col h-[220px] shadow-inner">
                                <div className="flex justify-between items-center mb-4 shrink-0">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest">{t.templates.profitMax.pricePreview}</span>
                                        <span className="text-xs text-brand-600 dark:text-brand-400 font-bold mt-1">
                                            {[...userSchemes, ...systemSchemes].find(s => s.id === selectedPriceSchemeId)?.name}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-mono text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest">EUR/kWh</span>
                                </div>
                                <div className="flex-1 w-full min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={priceRows} margin={{ top: 6, right: 8, left: 4, bottom: 30 }}>
                                            <defs>
                                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#819226" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#819226" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                            <XAxis
                                                dataKey="time"
                                                ticks={PRICE_PREVIEW_X_AXIS_TICKS}
                                                tickFormatter={formatPricePreviewTimeTick}
                                                fontSize={12}
                                                fontWeight="bold"
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={10}
                                                stroke={chartColors.text}
                                            />
                                            <YAxis fontSize={9} tickLine={false} axisLine={false} stroke={chartColors.text} />
                                            <Tooltip 
                                                contentStyle={{
                                                    backgroundColor: isDark ? '#1e2128' : '#ffffff',
                                                    borderRadius: '12px',
                                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                                    fontSize: '10px'
                                                }}
                                                itemStyle={{ color: isDark ? '#ffffff' : '#000000' }}
                                                labelStyle={{ display: 'none' }}
                                                formatter={(val) => [val, 'Price']}
                                            />
                                            <Area type="stepAfter" dataKey="priceA" stroke="#819226" strokeWidth={2} fill="url(#colorPrice)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>

                    <div className="min-w-0 flex-1 flex">
                        <div
                            className={`w-full rounded-2xl border bg-white dark:bg-[#26292D] p-6 transition-all relative overflow-hidden
                                ${isGreenStrategyActive
                                    ? 'border-emerald-500/40 ring-1 ring-inset ring-emerald-400/50 shadow-md shadow-emerald-500/10 dark:border-emerald-400/70 dark:ring-emerald-400 dark:shadow-lg dark:shadow-emerald-500/20'
                                    : 'border-slate-200 dark:border-white/10 shadow-md'}`}
                        >
                            {isGreenStrategyActive && (
                                <>
                                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-brand-500 to-emerald-400" aria-hidden />
                                    <span className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-500/35 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-400/40">
                                        {lang === 'zh' ? '已激活' : 'Activated'}
                                    </span>
                                </>
                            )}
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col justify-between">
                                    <div>
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                            <div className="flex items-start gap-4 min-w-0 flex-1">
                                                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                                                    <Sun size={22} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className={`text-xl font-bold text-apple-text-primary-light dark:text-white tracking-tight ${isGreenStrategyActive ? 'pr-[5.5rem] sm:pr-24 lg:pr-28' : ''}`}>
                                                        {lang === 'zh' ? '绿电消纳最大化' : 'Green Power Efficiency Maximization Strategy'}
                                                    </h4>
                                                    <p className="text-xs text-apple-text-secondary-light dark:text-slate-400 mt-1.5 leading-relaxed max-w-3xl">
                                                        {lang === 'zh'
                                                            ? '优先消纳与利用新能源出力，提升绿电利用效率。'
                                                            : 'Maximize renewable consumption and green energy utilization efficiency.'}
                                                    </p>
                                                </div>
                                            </div>
                                            {!isGreenStrategyActive && (
                                                <span className="flex shrink-0 items-center gap-2 self-start text-[10px] font-bold text-apple-text-secondary-light dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 uppercase tracking-widest w-fit">
                                                    Ready
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-8">
                                        {!isGreenStrategyActive && (
                                            <button
                                                type="button"
                                                onClick={() => setActiveTemplateId('u3')}
                                                className="px-6 h-9 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-full font-bold transition-all flex items-center gap-2 shadow-lg shadow-brand-500/20"
                                            >
                                                <PlayCircle size={16} /> {t.templates.profitMax.apply}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowPriceSelectionModal(true)}
                                            className="px-5 h-9 text-xs border border-slate-200 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/10 text-apple-text-primary-light dark:text-slate-200 rounded-full font-bold transition-all flex items-center gap-2"
                                        >
                                            <DollarSign size={16} />
                                            {lang === 'zh' ? '配置电价' : 'Configure Price'}
                                        </button>
                                    </div>
                                </div>
                                {/* 固定高度，避免 ResponsiveContainer 在 h-auto 下高度为 0 */}
                                <div className="w-full shrink-0 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-black/25 p-5 shadow-inner flex h-[220px] flex-col">
                                    <div className="flex shrink-0 justify-between items-center mb-4 gap-2">
                                        <div className="min-w-0 pr-2">
                                            <span className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-slate-500 uppercase tracking-widest block">
                                                {t.templates.profitMax.pricePreview}
                                            </span>
                                            <span className="text-xs text-emerald-700 dark:text-emerald-300/95 font-bold mt-1 line-clamp-2">
                                                {[...userSchemes, ...systemSchemes].find(s => s.id === selectedPriceSchemeId)?.name}
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-mono text-apple-text-tertiary-light dark:text-slate-500 uppercase tracking-widest shrink-0">EUR/kWh</span>
                                    </div>
                                    <div className="flex-1 min-h-0 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={priceRows} margin={{ top: 4, right: 8, left: -14, bottom: 28 }}>
                                                <defs>
                                                    <linearGradient id="colorPriceGreenPreview" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.35}/>
                                                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
                                                <XAxis
                                                    dataKey="time"
                                                    ticks={PRICE_PREVIEW_X_AXIS_TICKS}
                                                    tickFormatter={formatPricePreviewTimeTick}
                                                    fontSize={10}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickMargin={8}
                                                    stroke="#94a3b8"
                                                />
                                                <YAxis fontSize={9} width={32} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: isDark ? '#1e2128' : '#ffffff',
                                                        borderRadius: '12px',
                                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                                        fontSize: '10px',
                                                    }}
                                                    itemStyle={{ color: isDark ? '#ffffff' : '#000000' }}
                                                    labelStyle={{ display: 'none' }}
                                                    formatter={(val) => [val, lang === 'zh' ? '电价' : 'Price']}
                                                />
                                                <Area type="stepAfter" dataKey="priceA" stroke="#34d399" strokeWidth={2} fill="url(#colorPriceGreenPreview)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </div>
                )}

                {viewMode === 'my' && (
                <div>
                    <div className="flex justify-end items-end mb-4 px-1">
                        <button
                            onClick={() => setShowCreateSetModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md shadow-brand-500/20 text-sm font-bold transition-all hover:-translate-y-0.5"
                        >
                            <Plus size={18} /> {lang === 'zh' ? '创建策略集' : 'Create Strategy Set'}
                        </button>
                    </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-6 flex flex-col gap-2">
                                {userTpls.map((tpl) => {
                                    const isActive = activeTemplateId === tpl.id;
                                    const isAiDispatch = tpl.nameKey === 'aiDispatch';
                                    const tplStationIds = strategyStationBindings[tpl.id] ?? [];
                                    const rows = setStrategies[tpl.id] ?? [];
                                    return (
                                        <div
                                            key={tpl.id}
                                            role="presentation"
                                            onClick={() => setActiveTemplateId(tpl.id)}
                                            className={`w-full text-left rounded-2xl border transition-all shadow-md cursor-pointer overflow-hidden
                                                ${isAiDispatch
                                                    ? 'relative isolate border-brand-500/50 bg-gradient-to-br from-white via-apple-bg-light to-brand-50/90 dark:border-brand-700/80 dark:bg-gradient-to-r dark:from-brand-900 dark:via-brand-800 dark:to-brand-900 hover:border-brand-400 hover:shadow-xl hover:shadow-brand-900/15 dark:hover:shadow-brand-900/25'
                                                    : 'border-slate-200 dark:border-apple-border-dark bg-apple-bg-light dark:bg-apple-surface-dark hover:border-brand-500/40'}
                                                ${isActive ? 'ring-1 ring-inset ring-brand-400 border-brand-400' : ''}`}
                                        >
                                            {isAiDispatch && (
                                                <>
                                                    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-1 bg-gradient-to-r from-brand-600 via-brand-400 to-brand-700" aria-hidden />
                                                    <div className="pointer-events-none absolute -right-10 -top-16 z-0 h-40 w-40 rounded-full bg-brand-400/25 blur-3xl dark:bg-brand-500/15" aria-hidden />
                                                    <div className="pointer-events-none absolute -bottom-8 -left-6 z-0 h-28 w-28 rounded-full bg-brand-600/15 blur-2xl dark:bg-brand-700/20" aria-hidden />
                                                </>
                                            )}
                                            <div className={`p-4 flex flex-col gap-2 ${isAiDispatch ? 'relative z-10' : ''}`}>
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    <div className={`shrink-0 ${isAiDispatch ? 'rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-3 text-white shadow-lg shadow-brand-600/30 ring-2 ring-white/60 dark:ring-white/10' : 'p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                                                        {isAiDispatch ? <BrainCircuit size={22} strokeWidth={2} /> : <FileText size={22}/>}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h4 className={`text-base font-bold line-clamp-2 tracking-tight flex-1 min-w-0 ${isAiDispatch ? 'text-brand-950 dark:text-white' : 'text-apple-text-primary-light dark:text-apple-text-primary-dark'}`}>
                                                                {getTemplateName(tpl.nameKey)}
                                                            </h4>
                                                            {!isAiDispatch && (
                                                                <div className="flex flex-wrap gap-2 justify-end shrink-0">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            deployStrategyToStations(tpl.id);
                                                                        }}
                                                                        disabled={tplStationIds.length === 0}
                                                                        className="shrink-0 inline-flex items-center gap-1 px-2.5 h-7 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-apple-border-dark text-apple-text-primary-light dark:text-apple-text-primary-dark bg-white dark:bg-apple-surface-secondary-dark hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark/80 transition-colors disabled:opacity-45 disabled:pointer-events-none disabled:cursor-not-allowed"
                                                                    >
                                                                        <Download size={12} />
                                                                        {tt.deployButton}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveTemplateId(tpl.id);
                                                                            onNavigate && onNavigate('/strategy/create');
                                                                        }}
                                                                        className="shrink-0 px-2.5 h-7 rounded-lg text-[11px] font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                                                                    >
                                                                        {lang === 'zh' ? '创建策略' : 'Create Strategy'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isAiDispatch && (
                                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-sm shadow-brand-600/25 dark:from-white/20 dark:to-white/10 dark:text-white dark:shadow-none border border-white/20">
                                                                <BrainCircuit size={10} />
                                                                AI Dispatch
                                                            </span>
                                                            <span className="text-[10px] font-semibold tracking-wide text-brand-800/90 dark:text-white/90">
                                                                {lang === 'zh' ? '智能调度优先' : 'Priority AI'}
                                                            </span>
                                                            </div>
                                                        )}
                                                        <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isAiDispatch ? 'text-brand-700/75 dark:text-white/80' : 'text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark'}`}>
                                                            {t.templates.lastUpdate}: {getTemplateLastUpdate(tpl.id)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            {!isAiDispatch && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleExpandSet(tpl.id);
                                                    }}
                                                    className={`w-full h-10 px-3 text-[12px] font-bold border rounded-xl transition-all flex items-center justify-between ${
                                                        expandedSets[tpl.id]
                                                            ? 'border-brand-300 dark:border-brand-700 bg-brand-50/80 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                                            : 'border-slate-200 dark:border-apple-border-dark text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark'
                                                    }`}
                                                >
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <List size={14} />
                                                        <span>{tt.user}</span>
                                                        <span className={`px-1.5 h-5 rounded-md text-[10px] inline-flex items-center ${
                                                            expandedSets[tpl.id]
                                                                ? 'bg-brand-100/80 dark:bg-brand-800/60'
                                                                : 'bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark'
                                                        }`}>
                                                            {rows.length}
                                                        </span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span className="text-[10px] uppercase tracking-wider">
                                                            {expandedSets[tpl.id]
                                                                ? (lang === 'zh' ? '收起' : 'Collapse')
                                                                : (lang === 'zh' ? '展开' : 'Expand')}
                                                        </span>
                                                        <ChevronDown
                                                            size={14}
                                                            className={`transition-transform ${expandedSets[tpl.id] ? 'rotate-180' : ''}`}
                                                        />
                                                    </span>
                                                </button>
                                            )}
                                            </div>
                                            {!isAiDispatch && expandedSets[tpl.id] && (
                                                <div
                                                    className="border-t border-slate-200 dark:border-apple-border-dark"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="bg-apple-surface-secondary-light/70 dark:bg-apple-surface-secondary-dark/60 overflow-hidden">
                                                        <div className="px-4 h-9 border-b border-slate-200 dark:border-apple-border-dark flex items-center justify-between bg-white/70 dark:bg-black/25">
                                                            <span className="text-[11px] font-bold text-apple-text-secondary-light dark:text-apple-text-secondary-dark uppercase tracking-wider">
                                                                {lang === 'zh' ? '策略详情' : 'Strategy Details'}
                                                            </span>
                                                            <span className="text-[10px] text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark shrink-0">
                                                                {rows.length} {lang === 'zh' ? '条' : 'items'}
                                                            </span>
                                                        </div>
                                                        <div className="p-2.5">
                                                    {rows.length ? (
                                                        <div className="w-full overflow-x-auto">
                                                            <table className="w-full min-w-[560px] text-[14px]">
                                                                <thead>
                                                                    <tr className="text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark border-b border-slate-200 dark:border-apple-border-dark">
                                                                        <th className="text-left font-bold py-1 pr-2">{lang === 'zh' ? '策略名称' : 'Name'}</th>
                                                                        <th className="text-left font-bold py-1 px-2 whitespace-nowrap">{lang === 'zh' ? '状态' : 'Status'}</th>
                                                                        <th className="text-right font-bold py-1 pl-2 whitespace-nowrap">{lang === 'zh' ? '最后更新' : 'Last updated'}</th>
                                                                        <th className="text-right font-bold py-1 pl-2 whitespace-nowrap">{lang === 'zh' ? '操作' : 'Action'}</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {rows.map((row, idx) => (
                                                                        <tr key={`${tpl.id}-r-${idx}`} className="text-apple-text-secondary-light dark:text-apple-text-secondary-dark border-b border-slate-100 dark:border-apple-border-dark/60 last:border-0">
                                                                            <td className="py-1.5 pr-2 align-top">{row.name}</td>
                                                                            <td className="py-1.5 px-2 align-top whitespace-nowrap">{formatStrategyRowStatus(row.status)}</td>
                                                                            <td className="py-1.5 pl-2 align-top text-right whitespace-nowrap">{row.lastUpdate}</td>
                                                                            <td className="py-1.5 pl-2 align-top text-right whitespace-nowrap">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => openEditStrategyModal(tpl.id, idx, row)}
                                                                                    className="inline-flex items-center gap-1 px-2 h-7 rounded-md border border-slate-200 dark:border-apple-border-dark text-[14px] text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:text-brand-600 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-white dark:hover:bg-apple-surface-secondary-dark transition-colors"
                                                                                >
                                                                                    <Edit size={12} />
                                                                                    {lang === 'zh' ? '编辑' : 'Edit'}
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[11px] text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark">
                                                            {lang === 'zh' ? '暂无策略，可点击“创建策略”新增' : 'No strategy yet. Click "Create Strategy" to add.'}
                                                        </p>
                                                    )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="lg:col-span-6 bg-apple-bg-light dark:bg-apple-surface-dark rounded-3xl border border-slate-200 dark:border-apple-border-dark shadow-md p-6 flex flex-col min-h-[280px]">
                                <div className="mb-4">
                                    <h4 className="text-lg font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark tracking-tight">
                                        {activeUserTpl ? getTemplateName(activeUserTpl.nameKey) : ''}
                                    </h4>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <h5 className="text-xs font-bold uppercase tracking-widest text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark">
                                        {t.templates.linkedStations}
                                    </h5>
                                    <span className="text-[10px] font-mono text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark">
                                        ({linkedStations.length})
                                    </span>
                                </div>
                                {linkedStations.length === 0 ? (
                                    <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-apple-border-dark bg-apple-surface-secondary-light/50 dark:bg-apple-surface-secondary-dark/30 px-4 py-10">
                                        <p className="text-sm text-apple-text-secondary-light dark:text-apple-text-secondary-dark text-center">
                                            {t.templates.noLinkedStations}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-slate-200 dark:border-apple-border-dark bg-white dark:bg-apple-surface-dark shadow-sm overflow-hidden flex-1 min-h-0">
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[720px] text-sm text-left">
                                                <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-apple-surface-secondary-dark/50 border-b border-slate-100 dark:border-apple-border-dark font-bold uppercase tracking-wider">
                                                    <tr>
                                                        <th className="px-4 py-3 whitespace-nowrap">{tt.colStation}</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">{tt.colLocation}</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">{tt.lastStrategyDeploy}</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">{tt.deployStatusCol}</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">{tt.deploySiteStatus}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                                                    {linkedStations.map((st) => {
                                                        const dep = stationDeployState[activeTemplateId]?.[st.id] ?? {
                                                            lastDeployTime: '',
                                                            status: 'never' as StrategyDeployStatus,
                                                        };
                                                        const lastDisp =
                                                            dep.status === 'never' || !dep.lastDeployTime.trim()
                                                                ? '—'
                                                                : dep.lastDeployTime;
                                                        return (
                                                            <tr
                                                                key={st.id}
                                                                className="transition-colors group hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                                                            >
                                                                <td className="px-4 py-3 align-top">
                                                                    <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                        {st.name}
                                                                    </div>
                                                                    <div className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                                                        {st.id}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-300">
                                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                                        <MapPin size={14} className="text-slate-400 shrink-0" />
                                                                        <span className="truncate">{st.location}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 align-top font-mono text-[13px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                                    {dep.status === 'pending' ? (
                                                                        <span className="inline-flex items-center gap-1.5">
                                                                            <Loader2 size={14} className="animate-spin shrink-0 text-blue-500" />
                                                                            <span>
                                                                                {dep.lastDeployTime.trim() ? dep.lastDeployTime : '—'}
                                                                            </span>
                                                                        </span>
                                                                    ) : (
                                                                        lastDisp
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 align-top">
                                                                    <span
                                                                        className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold border ${deployStatusPillClass(dep.status)}`}
                                                                    >
                                                                        {tt.deployStatusLabels[dep.status]}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 align-top">
                                                                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 tracking-wide">
                                                                        {st.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                </div>
                )}
            </div>
        );
    };

    return (
        <div className="ems-page-shell w-full">
            <div className="mx-auto max-w-full space-y-4">
                {/* Header — 与电价列表同款分段时隐藏独立大标题（执行视图独立路由） */}
                {viewMode !== 'my' && !hideStrategyTabBar && (
                <div className="ems-card mb-4 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white md:text-xl">{t.title}</h1>
                        {t.subtitle != null && t.subtitle !== '' && (
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
                        )}
                    </div>

                    <div className="custom-scrollbar-hide flex min-w-0 w-full items-center overflow-x-auto md:w-auto">
                        <div className="ems-segmented shrink-0">
                        {!hideOverviewTab && (
                        <button 
                            type="button"
                            onClick={() => setActiveTab('overview')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-blue-600 shadow-sm dark:bg-apple-surface-dark dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            <LayoutDashboard size={16} />
                            {t.tabOverview}
                        </button>
                        )}
                        <button 
                            type="button"
                            onClick={() => setActiveTab('orchestration')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'orchestration' ? 'bg-white text-blue-600 shadow-sm dark:bg-apple-surface-dark dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            <Zap size={16} />
                            {t.tabOrchestration}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('templates')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'templates' ? 'bg-white text-purple-600 shadow-sm dark:bg-apple-surface-dark dark:text-purple-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            <LayoutTemplate size={16} />
                            {t.tabLink}
                        </button>
                        </div>
                    </div>
                </div>
                )}

                {/* Tab Content */}
                <div>
                    {activeTab === 'overview' && !hideOverviewTab && <OverviewTab />}
                    {activeTab === 'orchestration' && <OrchestrationTab />}
                    {activeTab === 'templates' && <TemplatesTab />}
                </div>
            </div>

                {/* Modals */}
            <ChangeTemplateModal 
                lang={lang}
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                templates={aiDispatchStrategyTemplates}
                activeTemplateId={changeTemplateModalActiveId}
                onSelect={setActiveTemplateId}
                getTemplateName={getTemplateName}
                getTemplateLabel={getTemplateDisplayNameForOrchestration}
            />
            <PriceSelectionModal 
                lang={lang}
                isOpen={showPriceSelectionModal}
                onClose={() => setShowPriceSelectionModal(false)}
                modalPriceTab={modalPriceTab}
                setModalPriceTab={setModalPriceTab}
                userSchemes={userSchemes}
                systemSchemes={systemSchemes}
                selectedPriceSchemeId={selectedPriceSchemeId}
                setSelectedPriceSchemeId={setSelectedPriceSchemeId}
            />
            <CoefficientsEditModal 
                lang={lang}
                isOpen={showCoeffEditModal}
                onClose={() => setShowCoeffEditModal(false)}
                coeffs={coeffs}
                handleCoeffChange={handleCoeffChange}
            />
            <DeployModal 
                lang={lang}
                isOpen={showDeployModal}
                onClose={() => setShowDeployModal(false)}
                verificationCode={verificationCode}
                inputCode={inputCode}
                setInputCode={setInputCode}
                onVerify={verifyAndDeploy}
                error={deployError}
                success={deploySuccess}
            />
            {showCreateSetModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setShowCreateSetModal(false)}></div>
                    <div className="relative w-[92%] max-w-md bg-white dark:bg-apple-surface-dark rounded-2xl border border-slate-200 dark:border-apple-border-dark shadow-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark">
                                {lang === 'zh' ? '创建策略集' : 'Create Strategy Set'}
                            </h3>
                            <button
                                onClick={() => setShowCreateSetModal(false)}
                                className="p-1 rounded-md text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                                {lang === 'zh' ? '策略集名称' : 'Strategy Set Name'}
                            </label>
                            <input
                                value={newSetName}
                                onChange={(e) => setNewSetName(e.target.value)}
                                placeholder={lang === 'zh' ? '请输入策略集名称' : 'Enter strategy set name'}
                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-apple-border-dark bg-white dark:bg-apple-surface-secondary-dark text-sm text-apple-text-primary-light dark:text-apple-text-primary-dark outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setShowCreateSetModal(false)}
                                    className="px-4 h-9 rounded-lg text-sm font-bold border border-slate-200 dark:border-apple-border-dark text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark"
                                >
                                    {lang === 'zh' ? '取消' : 'Cancel'}
                                </button>
                                <button
                                    onClick={handleCreateStrategySet}
                                    className="px-4 h-9 rounded-lg text-sm font-bold text-white bg-brand-600 hover:bg-brand-700"
                                >
                                    {lang === 'zh' ? '创建' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showEditStrategyModal && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/30" onClick={closeEditStrategyModal}></div>
                    <div className="relative w-[96%] max-w-6xl max-h-[85vh] overflow-y-auto bg-white dark:bg-apple-surface-dark rounded-2xl border border-slate-200 dark:border-apple-border-dark shadow-2xl">
                        <StrategyEditor
                            lang={lang}
                            theme={theme}
                            embedded
                            initialData={
                                editingStrategyRef
                                    ? {
                                          name: setStrategies[editingStrategyRef.setId]?.[editingStrategyRef.rowIdx]?.name || '',
                                          enabled: setStrategies[editingStrategyRef.setId]?.[editingStrategyRef.rowIdx]?.status !== 'disabled',
                                      }
                                    : undefined
                            }
                            onBack={closeEditStrategyModal}
                            onSave={saveEditedStrategy}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategyManager;
