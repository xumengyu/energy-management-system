
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
import { StrategyItem, ChartDataPoint, ForecastDataPoint, Language, StrategyTab, Theme, PriceRow, Coefficients, Template, StrategyStationBindings } from '../types';
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
  return slots;
};

interface StrategyManagerProps {
    lang: Language;
    theme: Theme;
    selectedStation: string;
    initialTab?: string;
    hideOverviewTab?: boolean;
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
            'Standby': 'bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark text-apple-text-secondary-light dark:text-apple-text-secondary-dark border-apple-border-light dark:border-apple-border-dark'
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
    const CustomLegend = ({ payload, onClick }: any) => (
        <div className="flex flex-wrap justify-end gap-6 mb-4">
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

        return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-apple-surface-light dark:bg-apple-surface-dark p-6 rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm flex flex-col justify-between relative overflow-hidden h-[140px] transition-all hover:shadow-md">
                    <div className="absolute right-[-10px] top-[-10px] p-4 opacity-[0.03] dark:opacity-[0.05] rotate-12"><Zap size={100} /></div>
                    <div>
                        <p className="text-apple-text-secondary-light dark:text-apple-text-secondary-dark text-[11px] font-bold uppercase tracking-wider mb-1">{t.power}</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-semibold text-apple-text-primary-light dark:text-apple-text-primary-dark tracking-tight">-120</span>
                            <span className="text-base font-bold text-apple-text-secondary-light dark:text-apple-text-secondary-dark">kW</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 w-fit px-2.5 py-1 rounded-full border border-blue-500/20">
                        <Activity size={12} /> Discharging
                    </div>
                </div>

                <div className="bg-apple-surface-light dark:bg-apple-surface-dark p-6 rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm flex flex-col justify-between relative overflow-hidden h-[140px] transition-all hover:shadow-md">
                     <div className="absolute right-[-10px] top-[-10px] p-4 opacity-[0.03] dark:opacity-[0.05] rotate-12"><Battery size={100} /></div>
                    <div>
                        <p className="text-apple-text-secondary-light dark:text-apple-text-secondary-dark text-[11px] font-bold uppercase tracking-wider mb-1">SOC</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-semibold text-emerald-500 tracking-tight">85.4</span>
                            <span className="text-sm font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">%</span>
                        </div>
                    </div>
                    <div className="w-full bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{width: '85.4%'}}></div>
                    </div>
                </div>

                <div className="bg-apple-surface-light dark:bg-apple-surface-dark p-6 rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm flex flex-col justify-between relative overflow-hidden h-[140px] transition-all hover:shadow-md">
                     <div className="absolute right-[-10px] top-[-10px] p-4 opacity-[0.03] dark:opacity-[0.05] rotate-12"><Cpu size={100} /></div>
                    <div>
                        <p className="text-apple-text-secondary-light dark:text-apple-text-secondary-dark text-[11px] font-bold uppercase tracking-wider mb-1">{t.currentTemplate}</p>
                        <div className="text-lg font-semibold text-apple-text-primary-light dark:text-apple-text-primary-dark leading-tight mt-1 line-clamp-2">
                            {templateName}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 w-fit px-2.5 py-1 rounded-full border border-purple-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div> Active
                    </div>
                </div>

                <div className="bg-apple-surface-light dark:bg-apple-surface-dark p-6 rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm flex flex-col justify-between relative overflow-hidden h-[140px] transition-all hover:shadow-md">
                     <div className="absolute right-[-10px] top-[-10px] p-4 opacity-[0.03] dark:opacity-[0.05] rotate-12"><DollarSign size={100} /></div>
                    <div>
                        <p className="text-apple-text-secondary-light dark:text-apple-text-secondary-dark text-[11px] font-bold uppercase tracking-wider mb-1">{t.realtimePrice}</p>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-3xl font-semibold text-apple-text-primary-light dark:text-apple-text-primary-dark tracking-tight">0.85</span>
                            <span className="text-sm font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">CNY/kWh</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                        <span className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                            {lang === 'zh' ? '实时同步' : 'Live Sync'}
                        </span>
                        <span className="font-mono bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark px-1.5 py-0.5 rounded">v2.1.0</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-apple-surface-light dark:bg-apple-surface-dark border border-apple-border-light dark:border-apple-border-dark rounded-2xl shadow-sm flex flex-col h-[500px] overflow-hidden">
                    <div className="p-5 border-b border-apple-border-light dark:border-apple-border-dark flex items-center justify-between">
                        <h3 className="font-semibold text-apple-text-primary-light dark:text-apple-text-primary-dark flex items-center gap-2 text-sm">
                            <Activity size={16} className="text-blue-500"/>
                            {t.realtimeMonitor} - {lang === 'zh' ? '今日' : 'Today'}
                        </h3>
                    </div>
                    <div className="flex-1 w-full min-h-0 relative p-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={MOCK_SYNC_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="colorEdgeToday" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="time" fontSize={16} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={12} minTickGap={30} stroke={chartColors.text} />
                                <YAxis yAxisId="power" orientation="left" domain={[-300, 900]} ticks={[-300, -150, 0, 150, 300]} fontSize={16} fontWeight="bold" tickLine={false} axisLine={false} stroke={chartColors.text} tickFormatter={(val) => `${val}kW`} />
                                <YAxis yAxisId="soc" orientation="right" domain={[0, 100]} ticks={[0, 50, 100]} fontSize={11} tickLine={false} axisLine={false} stroke={chartColors.text} tickFormatter={(val) => `${val}%`} />
                                <Tooltip {...tooltipStyle} />
                                <Legend verticalAlign="top" height={40} content={<CustomLegend onClick={toggleSeries}/>} />
                                
                                <Area hide={hiddenSeries.includes('edge')} yAxisId="power" name={t.legendEdge} type="stepAfter" dataKey="edge" stroke="#3b82f6" fill="url(#colorEdgeToday)" strokeWidth={2.5} animationDuration={500} />
                                <Line hide={hiddenSeries.includes('cloud')} yAxisId="power" name={t.legendCloud} type="stepAfter" dataKey="cloud" stroke="#f97316" strokeWidth={2.5} strokeDasharray="4 4" dot={false} animationDuration={500} />
                                <Line hide={hiddenSeries.includes('recommended')} yAxisId="power" name={t.legendAiForecast} type="monotone" dataKey="recommended" stroke="#10b981" strokeWidth={2} dot={false} animationDuration={500} />
                                
                                <Line hide={hiddenSeries.includes('socForecast1')} yAxisId="soc" name="SOC实际" type="monotone" dataKey="socForecast1" stroke="#8b5cf6" strokeWidth={2} dot={false} animationDuration={500} />
                                <Line hide={hiddenSeries.includes('socForecast2')} yAxisId="soc" name="SOC Forecast 2" type="monotone" dataKey="socForecast2" stroke="#ec4899" strokeWidth={2} dot={false} animationDuration={500} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-apple-surface-light dark:bg-apple-surface-dark border border-apple-border-light dark:border-apple-border-dark rounded-2xl shadow-sm flex flex-col h-[500px] overflow-hidden">
                    <div className="p-5 border-b border-apple-border-light dark:border-apple-border-dark flex items-center justify-between">
                        <h3 className="font-semibold text-apple-text-primary-light dark:text-apple-text-primary-dark flex items-center gap-2 text-sm">
                            <Activity size={16} className="text-blue-500"/>
                            {lang === 'zh' ? '调度预测 - 明日' : 'Dispatch Forecast - Tomorrow'}
                        </h3>
                    </div>
                    <div className="flex-1 w-full min-h-0 relative p-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={MOCK_FORECAST_DATA} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="time" fontSize={16} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={12} minTickGap={30} stroke={chartColors.text} />
                                <YAxis yAxisId="power" orientation="left" domain={[-300, 900]} ticks={[-300, -150, 0, 150, 300]} fontSize={16} fontWeight="bold" tickLine={false} axisLine={false} stroke={chartColors.text} tickFormatter={(val) => `${val}kW`} />
                                <YAxis yAxisId="soc" orientation="right" domain={[0, 100]} ticks={[0, 50, 100]} fontSize={11} tickLine={false} axisLine={false} stroke={chartColors.text} tickFormatter={(val) => `${val}%`} />
                                <Tooltip {...tooltipStyle} />
                                <Legend verticalAlign="top" height={40} content={<CustomLegend onClick={toggleSeries}/>} />
                                
                                <Line hide={hiddenSeries.includes('cloud')} yAxisId="power" name={t.legendCloud} type="stepAfter" dataKey="cloud" stroke="#f97316" strokeWidth={2.5} strokeDasharray="4 4" dot={false} animationDuration={500} />
                                <Line hide={hiddenSeries.includes('recommended')} yAxisId="power" name={t.legendAiForecast} type="monotone" dataKey="recommended" stroke="#10b981" strokeWidth={2} dot={false} animationDuration={500} />
                                
                                <Line hide={hiddenSeries.includes('socForecast1')} yAxisId="soc" name="SOC实际" type="monotone" dataKey="socForecast1" stroke="#8b5cf6" strokeWidth={2} dot={false} animationDuration={500} />
                                <Line hide={hiddenSeries.includes('socForecast2')} yAxisId="soc" name="SOC Forecast 2" type="monotone" dataKey="socForecast2" stroke="#ec4899" strokeWidth={2} dot={false} animationDuration={500} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
        );
    };

    const OrchestrationTab = () => {
        const [strategyDate, setStrategyDate] = useState('2025-09-16');

        return (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                <div className="bg-apple-surface-light dark:bg-apple-surface-dark p-4 border border-apple-border-light dark:border-apple-border-dark rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-6 text-sm w-full md:w-auto">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-apple-text-secondary-light dark:text-apple-text-secondary-dark tracking-widest">{t.currentTemplate}</span>
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-apple-text-primary-light dark:text-apple-text-primary-dark flex items-center gap-2 text-base">
                                    <LayoutTemplate size={18} className="text-purple-500" />
                                    {getTemplateDisplayNameForOrchestration(orchestrationCurrentTemplate)}
                                </span>
                                <button 
                                    onClick={() => setShowTemplateModal(true)}
                                    className="px-3 h-7 text-[11px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-500/10 border border-brand-500/20 rounded-full hover:bg-brand-500/20 transition-all flex items-center gap-1.5"
                                >
                                    <RefreshCcw size={12} /> {t.changeTemplate}
                                </button>
                            </div>
                        </div>

                        <div className="h-10 w-px bg-apple-border-light dark:bg-apple-border-dark hidden md:block"></div>

                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-bold text-apple-text-secondary-light dark:text-apple-text-secondary-dark tracking-widest">{t.dispatchMode}</span>
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20">
                                <Zap size={12} className="fill-current"/> 
                                <span className="font-bold text-[10px] uppercase tracking-wider">{t.modeAuto}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark border border-apple-border-light dark:border-apple-border-dark rounded-full text-[11px] font-semibold text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                            <MapPin size={12} className="text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark"/>
                            {lang === 'zh' ? 'DE-BY 慕尼黑' : 'DE-BY Munich'}
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark border border-apple-border-light dark:border-apple-border-dark rounded-full text-[11px] font-mono font-semibold text-apple-text-primary-light dark:text-apple-text-primary-dark">
                            <Clock size={12} className="text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark"/>
                            <span className="tracking-wide">2025-09-16 14:30:24</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
                    <div className="bg-apple-surface-light dark:bg-apple-surface-dark border border-apple-border-light dark:border-apple-border-dark rounded-2xl flex flex-col h-[600px] overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-apple-border-light dark:border-apple-border-dark bg-apple-bg-light/50 dark:bg-apple-bg-dark/50">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-semibold text-apple-text-primary-light dark:text-apple-text-primary-dark text-sm flex items-center gap-2">
                                    <Activity size={18} className="text-blue-500"/>
                                    {t.edgeStrategyTitle}
                                </h3>
                                <div className="flex bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark p-1 rounded-xl border border-apple-border-light dark:border-apple-border-dark">
                                    <button 
                                        onClick={() => setEdgeViewDate('today')}
                                        className={`px-4 h-7 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center ${edgeViewDate === 'today' ? 'bg-apple-surface-light dark:bg-apple-surface-dark text-apple-text-primary-light dark:text-apple-text-primary-dark shadow-sm' : 'text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:text-apple-text-primary-light dark:hover:text-apple-text-primary-dark'}`}
                                    >
                                        {t.viewToday}
                                    </button>
                                    <button 
                                        onClick={() => setEdgeViewDate('yesterday')}
                                        className={`px-4 h-7 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center ${edgeViewDate === 'yesterday' ? 'bg-apple-surface-light dark:bg-apple-surface-dark text-apple-text-primary-light dark:text-apple-text-primary-dark shadow-sm' : 'text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:text-apple-text-primary-light dark:hover:text-apple-text-primary-dark'}`}
                                    >
                                        {t.viewYesterday}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 text-[11px]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark font-bold uppercase tracking-widest">{t.edgeStatus}:</span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{t.enabled}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark font-bold uppercase tracking-widest">{t.edgeLastSync}:</span>
                                        <span className="font-mono text-apple-text-primary-light dark:text-apple-text-primary-dark font-semibold">{edgeLastSyncTime}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleSyncEdge}
                                    disabled={isSyncingEdge}
                                    className="text-[11px] bg-apple-surface-light dark:bg-apple-surface-dark border border-apple-border-light dark:border-apple-border-dark text-apple-text-primary-light dark:text-apple-text-primary-dark px-3 h-8 rounded-full hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark transition-colors flex items-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    {isSyncingEdge ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12}/>} 
                                    {isSyncingEdge ? t.syncing : t.fetch}
                                </button>
                            </div>
                        </div>
                        <div className="overflow-auto flex-1 custom-scrollbar">
                            <table className="w-full text-sm text-left border-separate border-spacing-0">
                                <thead className="text-[10px] text-apple-text-secondary-light dark:text-apple-text-secondary-dark bg-apple-bg-light/30 dark:bg-apple-bg-dark/30 font-bold uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        <th className="px-5 py-3 border-b border-apple-border-light dark:border-apple-border-dark">{t.start}</th>
                                        <th className="px-5 py-3 border-b border-apple-border-light dark:border-apple-border-dark">{t.end}</th>
                                        <th className="px-5 py-3 border-b border-apple-border-light dark:border-apple-border-dark">{t.type}</th>
                                        <th className="px-5 py-3 border-b border-apple-border-light dark:border-apple-border-dark text-right">{t.power}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-apple-border-light dark:divide-apple-border-dark">
                                    {edgeData[edgeViewDate].map((item) => (
                                        <tr key={item.id} className="hover:bg-apple-surface-secondary-light/30 dark:hover:bg-apple-surface-secondary-dark/30 transition-colors group">
                                            <td className="px-5 py-3 text-apple-text-secondary-light dark:text-apple-text-secondary-dark font-mono text-base font-bold">{item.startTime}</td>
                                            <td className="px-5 py-3 text-apple-text-secondary-light dark:text-apple-text-secondary-dark font-mono text-base font-bold">{item.endTime}</td>
                                            <td className="px-5 py-3">{renderTypeBadge(item.type)}</td>
                                            <td className="px-5 py-3 text-right font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark text-base">{item.power} kW</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-apple-surface-light dark:bg-apple-surface-dark border border-apple-border-light dark:border-apple-border-dark rounded-2xl flex flex-col h-[600px] overflow-hidden relative shadow-sm">
                        <div className="p-5 border-b border-apple-border-light dark:border-apple-border-dark flex items-center justify-between bg-brand-500/5">
                            <div className="flex items-center gap-3">
                                <h3 className="font-semibold text-apple-text-primary-light dark:text-apple-text-primary-dark text-sm flex items-center gap-2">
                                    <Cloud size={18} className="text-brand-500"/>
                                    {t.cloudDispatch}
                                    {isEditing && <span className="text-[10px] uppercase font-bold text-brand-600 bg-brand-500/10 px-2 py-0.5 rounded-full tracking-widest border border-brand-500/20">Editing</span>}
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark px-2 py-1 rounded-full border border-apple-border-light dark:border-apple-border-dark">
                                    <Clock size={10} className="text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark" />
                                    <span className="uppercase tracking-widest">{t.lastDispatch}:</span>
                                    <span className="font-mono text-apple-text-primary-light dark:text-apple-text-primary-dark">2025-09-16 14:30</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-3 border-b border-apple-border-light dark:border-apple-border-dark bg-apple-surface-light dark:bg-apple-surface-dark flex items-center justify-start gap-6">
                            <div className="flex items-center gap-2 text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                                <Calendar size={14} className="text-brand-500" />
                                <span className="font-bold text-[10px] uppercase tracking-widest">{t.strategyDate}:</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="date" 
                                    value={strategyDate}
                                    disabled={!isEditing}
                                    onChange={(e) => setStrategyDate(e.target.value)}
                                    className={`bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark border rounded-lg px-3 py-1.5 text-xs font-mono font-semibold outline-none transition-all
                                        ${isEditing 
                                            ? 'border-brand-500/50 text-apple-text-primary-light dark:text-apple-text-primary-dark focus:ring-2 focus:ring-brand-500/20' 
                                            : 'border-transparent bg-transparent text-apple-text-primary-light dark:text-apple-text-primary-dark cursor-not-allowed'}`}
                                />
                            </div>
                        </div>
                        
                        <div className="overflow-auto flex-1 pb-16 custom-scrollbar bg-apple-bg-light/10 dark:bg-apple-bg-dark/10">
                            <table className="w-full text-sm text-left border-separate border-spacing-0">
                                <thead className="text-[10px] text-apple-text-secondary-light dark:text-apple-text-secondary-dark bg-apple-bg-light/30 dark:bg-apple-bg-dark/30 font-bold uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
                                    <tr>
                                        <th className="px-5 py-3 border-b border-apple-border-light dark:border-apple-border-dark w-32">{t.start}</th>
                                        <th className="px-5 py-3 border-b border-apple-border-light dark:border-apple-border-dark w-32">{t.end}</th>
                                        <th className="px-5 py-3 border-b border-apple-border-light dark:border-apple-border-dark">{t.type}</th>
                                        <th className="px-5 py-3 border-b border-apple-border-light dark:border-apple-border-dark text-right">{t.power}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-apple-border-light dark:divide-apple-border-dark">
                                    {cloudStrategies.map((item) => (
                                        <tr key={item.id} className="hover:bg-brand-500/5 group bg-apple-surface-light dark:bg-apple-surface-dark transition-colors">
                                            <td className="px-5 py-3">
                                                {isEditing ? (
                                                    <input type="time" defaultValue={item.startTime} className="w-24 border border-apple-border-light dark:border-apple-border-dark rounded-lg px-2 py-1 text-base font-bold font-mono bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark text-apple-text-primary-light dark:text-apple-text-primary-dark focus:ring-2 focus:ring-brand-500/20 outline-none" />
                                                ) : (
                                                    <span className="font-mono text-apple-text-secondary-light dark:text-apple-text-secondary-dark bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark px-2 py-1 rounded-lg border border-apple-border-light dark:border-apple-border-dark text-base font-bold">{item.startTime}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {isEditing ? (
                                                    <input type="time" defaultValue={item.endTime} className="w-24 border border-apple-border-light dark:border-apple-border-dark rounded-lg px-2 py-1 text-base font-bold font-mono bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark text-apple-text-primary-light dark:text-apple-text-primary-dark focus:ring-2 focus:ring-brand-500/20 outline-none" />
                                                ) : (
                                                     <span className="font-mono text-apple-text-secondary-light dark:text-apple-text-secondary-dark bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark px-2 py-1 rounded-lg border border-apple-border-light dark:border-apple-border-dark text-base font-bold">{item.endTime}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                {isEditing ? (
                                                    <select defaultValue={item.type} className="border border-apple-border-light dark:border-apple-border-dark rounded-lg px-2 py-1 text-xs bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark text-apple-text-primary-light dark:text-apple-text-primary-dark focus:ring-2 focus:ring-brand-500/20 outline-none cursor-pointer">
                                                        <option value="Charge">{t.charge}</option>
                                                        <option value="Discharge">{t.discharge}</option>
                                                        <option value="Standby">{t.standby}</option>
                                                    </select>
                                                ) : (
                                                    renderTypeBadge(item.type)
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark text-base">
                                                 {isEditing ? (
                                                    <input type="number" defaultValue={item.power} className="w-24 text-right border border-apple-border-light dark:border-apple-border-dark rounded-lg px-2 py-1 text-base font-bold bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark text-apple-text-primary-light dark:text-apple-text-primary-dark focus:ring-2 focus:ring-brand-500/20 outline-none" />
                                                ) : (
                                                    `${item.power} kW`
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {isEditing && (
                                <div className="p-6 border-t border-apple-border-light dark:border-apple-border-dark bg-brand-500/5 text-center">
                                    <button className="px-6 h-9 text-[11px] text-brand-600 dark:text-brand-400 font-bold bg-apple-surface-light dark:bg-apple-surface-dark border border-brand-500/20 rounded-full hover:bg-brand-500/10 transition-all flex items-center justify-center gap-2 w-full max-w-xs mx-auto shadow-sm">
                                        <Plus size={14}/> {t.addRow}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-16 px-6 bg-apple-surface-light/80 dark:bg-apple-surface-dark/80 backdrop-blur-xl border-t border-apple-border-light dark:border-apple-border-dark flex justify-end items-center">
                             <div className="flex gap-3 w-full lg:w-auto">
                                <button 
                                    onClick={handleDeployClick}
                                    className="flex-1 lg:flex-none px-10 h-9 text-sm text-white rounded-full font-bold transition-all bg-brand-600 hover:bg-brand-500 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
                                >
                                    <Download size={18}/> {t.deploy}
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

        return (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 pb-12">
                {viewMode !== 'my' && (
                <div>
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-6">
                    <div className="min-w-0 flex-1">
                    <div className={`relative bg-apple-surface-light dark:bg-apple-surface-dark border transition-all overflow-hidden rounded-3xl shadow-sm
                        ${profitMaxActive ? 'border-brand-500 ring-1 ring-brand-500' : 'border-apple-border-light dark:border-apple-border-dark'}`}>
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
                                            <span className="flex shrink-0 items-center gap-2 self-start text-[10px] font-bold text-apple-text-secondary-light dark:text-apple-text-secondary-dark bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark px-3 py-1.5 rounded-full border border-apple-border-light dark:border-apple-border-dark uppercase tracking-widest w-fit">
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
                                        className="px-5 h-9 text-xs border border-apple-border-light dark:border-apple-border-dark hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark text-apple-text-primary-light dark:text-apple-text-primary-dark rounded-full font-bold transition-all flex items-center gap-2"
                                    >
                                        <DollarSign size={16} />
                                        {lang === 'zh' ? '配置电价' : 'Configure Price'}
                                    </button>
                                    <button 
                                        onClick={() => setShowCoeffEditModal(true)}
                                        className="px-5 h-9 text-xs border border-apple-border-light dark:border-apple-border-dark hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark text-apple-text-primary-light dark:text-apple-text-primary-dark rounded-full font-bold transition-all flex items-center gap-2"
                                    >
                                        <Coins size={16} />
                                        {lang === 'zh' ? '发电收益与成本系数' : 'Generation Revenue & Cost Coefficients'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Part: Coefficients Configuration (Read-only View) */}
                        <div className="border-t border-apple-border-light dark:border-apple-border-dark bg-apple-surface-secondary-light/30 dark:bg-apple-surface-secondary-dark/30 p-6">
                            <div className="flex flex-col xl:flex-row gap-8">
                                <div className="xl:w-1/4 xl:border-r border-apple-border-light dark:border-apple-border-dark xl:pr-8 flex flex-col justify-center">
                                    <h3 className="text-sm font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark mb-2 flex items-center gap-2">
                                        <div className="p-2 bg-brand-500/10 rounded-xl text-brand-600 dark:text-brand-400"><Zap size={18}/></div>
                                        {tPrice.coeffTitle}
                                    </h3>
                                    <p className="text-xs text-apple-text-secondary-light dark:text-apple-text-secondary-dark leading-relaxed opacity-80">
                                        {tPrice.note}
                                    </p>
                                </div>

                                <div className="xl:w-3/4 grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark flex items-center gap-2 pb-2 border-b border-apple-border-light dark:border-apple-border-dark uppercase tracking-widest">
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
                                        <h4 className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark flex items-center gap-2 pb-2 border-b border-apple-border-light dark:border-apple-border-dark uppercase tracking-widest">
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
                                        <h4 className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark flex items-center gap-2 pb-2 border-b border-apple-border-light dark:border-apple-border-dark uppercase tracking-widest">
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
                        </div>

                        <div className="border-t border-apple-border-light dark:border-apple-border-dark p-6 bg-apple-surface-secondary-light/20 dark:bg-apple-surface-secondary-dark/20">
                            <div className="w-full bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark rounded-2xl border border-apple-border-light dark:border-apple-border-dark p-5 flex flex-col h-[220px] shadow-inner">
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
                                        <AreaChart data={priceRows}>
                                            <defs>
                                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#819226" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#819226" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                            <XAxis dataKey="time" fontSize={16} fontWeight="bold" tickLine={false} axisLine={false} interval={3} stroke={chartColors.text} />
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
                            className={`w-full rounded-2xl border bg-apple-surface-light dark:bg-[#26292D] p-6 transition-all relative overflow-hidden
                                ${isGreenStrategyActive
                                    ? 'border-emerald-500/40 ring-1 ring-inset ring-emerald-400/50 shadow-md shadow-emerald-500/10 dark:border-emerald-400/70 dark:ring-emerald-400 dark:shadow-lg dark:shadow-emerald-500/20'
                                    : 'border-apple-border-light dark:border-white/10 shadow-md'}`}
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
                                                <span className="flex shrink-0 items-center gap-2 self-start text-[10px] font-bold text-apple-text-secondary-light dark:text-slate-400 bg-apple-surface-secondary-light dark:bg-white/5 px-3 py-1.5 rounded-full border border-apple-border-light dark:border-white/10 uppercase tracking-widest w-fit">
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
                                            className="px-5 h-9 text-xs border border-apple-border-light dark:border-white/15 hover:bg-apple-surface-secondary-light dark:hover:bg-white/10 text-apple-text-primary-light dark:text-slate-200 rounded-full font-bold transition-all flex items-center gap-2"
                                        >
                                            <DollarSign size={16} />
                                            {lang === 'zh' ? '配置电价' : 'Configure Price'}
                                        </button>
                                    </div>
                                </div>
                                {/* 固定高度，避免 ResponsiveContainer 在 h-auto 下高度为 0 */}
                                <div className="w-full shrink-0 rounded-2xl border border-apple-border-light dark:border-white/10 bg-apple-surface-secondary-light/90 dark:bg-black/25 p-5 shadow-inner flex h-[220px] flex-col">
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
                                            <AreaChart data={priceRows} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorPriceGreenPreview" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.35}/>
                                                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
                                                <XAxis dataKey="time" fontSize={10} tickLine={false} axisLine={false} interval={3} stroke="#94a3b8" />
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
                                    const rows = setStrategies[tpl.id] ?? [];
                                    return (
                                        <div
                                            key={tpl.id}
                                            role="presentation"
                                            onClick={() => setActiveTemplateId(tpl.id)}
                                            className={`w-full text-left rounded-2xl border transition-all shadow-md cursor-pointer overflow-hidden
                                                ${isAiDispatch
                                                    ? 'relative isolate border-brand-500/50 bg-gradient-to-br from-white via-apple-bg-light to-brand-50/90 dark:border-brand-700/80 dark:bg-gradient-to-r dark:from-brand-900 dark:via-brand-800 dark:to-brand-900 hover:border-brand-400 hover:shadow-xl hover:shadow-brand-900/15 dark:hover:shadow-brand-900/25'
                                                    : 'border-apple-border-light dark:border-apple-border-dark bg-apple-bg-light dark:bg-apple-surface-dark hover:border-brand-500/40'}
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
                                                            : 'border-apple-border-light dark:border-apple-border-dark text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark'
                                                    }`}
                                                >
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <List size={14} />
                                                        <span>{lang === 'zh' ? '策略列表' : 'Strategies'}</span>
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
                                                    className="border-t border-apple-border-light dark:border-apple-border-dark"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="bg-apple-surface-secondary-light/70 dark:bg-apple-surface-secondary-dark/60 overflow-hidden">
                                                        <div className="px-4 h-9 border-b border-apple-border-light dark:border-apple-border-dark flex items-center justify-between bg-white/70 dark:bg-black/25">
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
                                                                    <tr className="text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark border-b border-apple-border-light dark:border-apple-border-dark">
                                                                        <th className="text-left font-bold py-1 pr-2">{lang === 'zh' ? '策略名称' : 'Name'}</th>
                                                                        <th className="text-left font-bold py-1 px-2 whitespace-nowrap">{lang === 'zh' ? '状态' : 'Status'}</th>
                                                                        <th className="text-right font-bold py-1 pl-2 whitespace-nowrap">{lang === 'zh' ? '最后更新' : 'Last updated'}</th>
                                                                        <th className="text-right font-bold py-1 pl-2 whitespace-nowrap">{lang === 'zh' ? '操作' : 'Action'}</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {rows.map((row, idx) => (
                                                                        <tr key={`${tpl.id}-r-${idx}`} className="text-apple-text-secondary-light dark:text-apple-text-secondary-dark border-b border-apple-border-light/60 dark:border-apple-border-dark/60 last:border-0">
                                                                            <td className="py-1.5 pr-2 align-top">{row.name}</td>
                                                                            <td className="py-1.5 px-2 align-top whitespace-nowrap">{formatStrategyRowStatus(row.status)}</td>
                                                                            <td className="py-1.5 pl-2 align-top text-right whitespace-nowrap">{row.lastUpdate}</td>
                                                                            <td className="py-1.5 pl-2 align-top text-right whitespace-nowrap">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => openEditStrategyModal(tpl.id, idx, row)}
                                                                                    className="inline-flex items-center gap-1 px-2 h-7 rounded-md border border-apple-border-light dark:border-apple-border-dark text-[14px] text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:text-brand-600 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-apple-surface-light dark:hover:bg-apple-surface-secondary-dark transition-colors"
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
                            <div className="lg:col-span-6 bg-apple-bg-light dark:bg-apple-surface-dark rounded-3xl border border-apple-border-light dark:border-apple-border-dark shadow-md p-6 flex flex-col min-h-[280px]">
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
                                    <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-apple-border-light dark:border-apple-border-dark bg-apple-surface-secondary-light/50 dark:bg-apple-surface-secondary-dark/30 px-4 py-10">
                                        <p className="text-sm text-apple-text-secondary-light dark:text-apple-text-secondary-dark text-center">
                                            {t.templates.noLinkedStations}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {linkedStations.map((st) => (
                                            <div
                                                key={st.id}
                                                className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-apple-border-light dark:border-apple-border-dark bg-apple-surface-secondary-light/40 dark:bg-apple-surface-secondary-dark/40"
                                            >
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark truncate">
                                                        {st.name}
                                                    </div>
                                                    <div className="text-[11px] text-apple-text-secondary-light dark:text-apple-text-secondary-dark flex items-center gap-1 mt-0.5">
                                                        <MapPin size={12} className="shrink-0 opacity-70" />
                                                        <span className="truncate">{st.location}</span>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-wider shrink-0">
                                                    {st.status}
                                                </span>
                                            </div>
                                        ))}
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
        <div className="min-h-screen bg-apple-bg-light dark:bg-apple-surface-dark p-2 md:p-4">
            <div className="max-w-full mx-auto space-y-6">
                {/* Header */}
                {viewMode !== 'my' && (
                <div className="flex flex-row items-center justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark tracking-tight">{t.title}</h1>
                        <p className="text-apple-text-secondary-light dark:text-apple-text-secondary-dark text-sm mt-1">{t.subtitle}</p>
                    </div>
                    
                    <div className="flex bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark p-1 rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-sm">
                        {!hideOverviewTab && (
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`flex items-center gap-2 px-6 h-9 rounded-xl text-sm font-semibold transition-all ${activeTab === 'overview' ? 'bg-apple-surface-light dark:bg-black text-apple-text-primary-light dark:text-white shadow-md' : 'text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:text-apple-text-primary-light dark:hover:text-apple-text-primary-dark'}`}
                        >
                            <LayoutDashboard size={16} />
                            {t.tabOverview}
                        </button>
                        )}
                        <button 
                            onClick={() => setActiveTab('orchestration')}
                            className={`flex items-center gap-2 px-6 h-9 rounded-xl text-sm font-semibold transition-all ${activeTab === 'orchestration' ? 'bg-apple-surface-light dark:bg-black text-apple-text-primary-light dark:text-white shadow-md' : 'text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:text-apple-text-primary-light dark:hover:text-apple-text-primary-dark'}`}
                        >
                            <Zap size={16} />
                            {t.tabOrchestration}
                        </button>
                        <button 
                            onClick={() => setActiveTab('templates')}
                            className={`flex items-center gap-2 px-6 h-9 rounded-xl text-sm font-semibold transition-all ${activeTab === 'templates' ? 'bg-apple-surface-light dark:bg-black text-apple-text-primary-light dark:text-white shadow-md' : 'text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:text-apple-text-primary-light dark:hover:text-apple-text-primary-dark'}`}
                        >
                            <LayoutTemplate size={16} />
                            {t.tabLink}
                        </button>
                    </div>
                </div>
                )}

                {/* Tab Content */}
                <div className="mt-6">
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
                    <div className="relative w-[92%] max-w-md bg-apple-surface-light dark:bg-apple-surface-dark rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-2xl p-5">
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
                                className="w-full h-10 px-3 rounded-xl border border-apple-border-light dark:border-apple-border-dark bg-apple-surface-light dark:bg-apple-surface-secondary-dark text-sm text-apple-text-primary-light dark:text-apple-text-primary-dark outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setShowCreateSetModal(false)}
                                    className="px-4 h-9 rounded-lg text-sm font-bold border border-apple-border-light dark:border-apple-border-dark text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark"
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
                    <div className="relative w-[96%] max-w-6xl max-h-[85vh] overflow-y-auto bg-apple-surface-light dark:bg-apple-surface-dark rounded-2xl border border-apple-border-light dark:border-apple-border-dark shadow-2xl">
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
