
import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import PriceList from './components/PriceList';
import StrategyManager from './components/StrategyManager';
import StrategyTemplates from './components/StrategyTemplates';
import StrategyEditor from './components/StrategyEditor';
import ProtectionStrategy from './components/ProtectionStrategy';
import ManualControl from './components/ManualControl';
import Dashboard from './components/Dashboard';
import StationRealtime from './components/StationRealtime';
import StationArchitecture from './components/StationArchitecture';
import DataAnalysis from './components/DataAnalysis';
import StationList, { StationListItem } from './components/StationList';
import StationBranchConfig, { StationFeederConfig } from './components/StationBranchConfig';
import CreateStation from './components/CreateStation';
import EnergyStatistics from './components/EnergyStatistics';
import SiteRevenueDetail from './components/SiteRevenueDetail';
import FaultAlarms from './components/FaultAlarms';
import StationMap from './components/StationMap';
import EntityManagement from './components/EntityManagement';
import { 
  Bell, User, Globe, ChevronDown, Menu, Search, Check, Folder, ChevronLeft,
  Building2, Repeat, LogOut, Sun, Moon
} from 'lucide-react';
import { Language, Theme } from './types';
import { translations } from './translations';
import { MOCK_STRATEGY_STATION_BINDINGS } from './data/mockStrategyStationBindings';

// Lifted Initial Data
const INITIAL_STATIONS_EN: StationListItem[] = [
  { id: 'ST-001', name: 'Station #1 (Berlin)', location: 'Berlin, Germany', type: 'Industrial', pvCap: 1200, essCap: 2000, soc: 85, power: 450, status: 'Normal', grid: 'Connected', lastUpdate: '1 min ago', group: 'European Industrial Hubs', deviceTypes: ['ess', 'pv'] },
  { id: 'ST-004', name: 'Station #5 (Paris)', location: 'Paris, France', type: 'Industrial', pvCap: 2000, essCap: 4000, soc: 92, power: 1100, status: 'Normal', grid: 'Connected', lastUpdate: 'Just now', group: 'European Industrial Hubs', deviceTypes: ['ess', 'pv', 'evse'] },
  { id: 'ST-007', name: 'Station #9 (Zurich)', location: 'Zurich, Switzerland', type: 'Industrial', pvCap: 1500, essCap: 3000, soc: 88, power: 900, status: 'Warning', grid: 'Connected', lastUpdate: '10 mins ago', group: 'European Industrial Hubs', deviceTypes: ['ess', 'pv'] },
  { id: 'ST-002', name: 'Station #2 (Munich)', location: 'Munich, Germany', type: 'Microgrid', pvCap: 800, essCap: 1000, soc: 40, power: 120, status: 'Warning', grid: 'Island', lastUpdate: '5 mins ago', group: 'Research & Innovation', deviceTypes: ['ess', 'pv', 'evse', 'dg'] },
  { id: 'ST-003', name: 'Station #3 (London)', location: 'London, UK', type: 'Commercial', pvCap: 500, essCap: 0, soc: 0, power: 0, status: 'Offline', grid: 'Disconnected', lastUpdate: '2 hours ago', group: '', deviceTypes: ['pv'] }, // Ungrouped
  { id: 'ST-005', name: 'Station #6 (Madrid)', location: 'Madrid, Spain', type: 'Commercial', pvCap: 600, essCap: 500, soc: 65, power: 320, status: 'Normal', grid: 'Connected', lastUpdate: '1 min ago', group: 'Retail & Commercial', deviceTypes: ['ess', 'pv'] },
  { id: 'ST-006', name: 'Station #8 (Rome)', location: 'Rome, Italy', type: 'Commercial', pvCap: 300, essCap: 200, soc: 78, power: 150, status: 'Normal', grid: 'Connected', lastUpdate: '30 secs ago', group: 'Retail & Commercial', deviceTypes: ['ess', 'pv'] },
  { id: 'ST-008', name: 'Station #11 (Oslo)', location: 'Oslo, Norway', type: 'Commercial', pvCap: 800, essCap: 1200, soc: 45, power: 400, status: 'Normal', grid: 'Connected', lastUpdate: '2 mins ago', group: '', deviceTypes: ['ess', 'pv', 'evse'] }, // Ungrouped
];

const INITIAL_STATIONS_ZH: StationListItem[] = [
  { id: 'ST-001', name: '站点 #1 (柏林)', location: '德国, 柏林', type: '工业', pvCap: 1200, essCap: 2000, soc: 85, power: 450, status: 'Normal', grid: 'Connected', lastUpdate: '1 分钟前', group: '欧洲工业园区', deviceTypes: ['ess', 'pv'] },
  { id: 'ST-004', name: '站点 #5 (巴黎)', location: '法国, 巴黎', type: '工业', pvCap: 2000, essCap: 4000, soc: 92, power: 1100, status: 'Normal', grid: 'Connected', lastUpdate: '刚刚', group: '欧洲工业园区', deviceTypes: ['ess', 'pv', 'evse'] },
  { id: 'ST-007', name: '站点 #9 (苏瑞世)', location: '瑞士, 苏黎世', type: '工业', pvCap: 1500, essCap: 3000, soc: 88, power: 900, status: 'Warning', grid: 'Connected', lastUpdate: '10 分钟前', group: '欧洲工业园区', deviceTypes: ['ess', 'pv'] },
  { id: 'ST-002', name: '站点 #2 (慕尼黑)', location: '德国, 慕尼黑', type: '微电网', pvCap: 800, essCap: 1000, soc: 40, power: 120, status: 'Warning', grid: 'Island', lastUpdate: '5 分钟前', group: '研发与创新中心', deviceTypes: ['ess', 'pv', 'evse', 'dg'] },
  { id: 'ST-003', name: '站点 #3 (伦敦)', location: '英国, 伦敦', type: '商业', pvCap: 500, essCap: 0, soc: 0, power: 0, status: 'Offline', grid: 'Disconnected', lastUpdate: '2 小时前', group: '', deviceTypes: ['pv'] }, // 未分组
  { id: 'ST-005', name: '站点 #6 (马德里)', location: '西班牙, 马德里', type: '商业', pvCap: 600, essCap: 500, soc: 65, power: 320, status: 'Normal', grid: 'Connected', lastUpdate: '1 分钟前', group: '商业综合体', deviceTypes: ['ess', 'pv'] },
  { id: 'ST-006', name: '站点 #8 (罗马)', location: '意大利, 罗马', type: '商业', pvCap: 300, essCap: 200, soc: 78, power: 150, status: 'Normal', grid: 'Connected', lastUpdate: '30 秒前', group: '商业综合体', deviceTypes: ['ess', 'pv'] },
  { id: 'ST-008', name: '站点 #11 (奥斯陆)', location: '挪威, 奥斯陆', type: '商业', pvCap: 800, essCap: 1200, soc: 45, power: 400, status: 'Normal', grid: 'Connected', lastUpdate: '2 分钟前', group: '', deviceTypes: ['ess', 'pv', 'evse'] }, // 未分组
];

const EMPTY_STATION_FEEDER_CONFIG: StationFeederConfig = { branches: [], assignments: {} };

// WIP Component for placeholder routes
const WIP = ({ title, lang }: { title: string, lang: Language }) => {
    const t = translations[lang].common;
    return (
      <div className="flex items-center justify-center h-[calc(100vh-72px)] text-slate-400 dark:text-slate-500">
        <div className="text-center p-8 bg-apple-surface-light dark:bg-apple-surface-dark rounded-2xl shadow-sm border border-apple-border-light dark:border-apple-border-dark">
            <div className="w-16 h-16 bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-slate-300 dark:text-slate-600" size={32}/>
            </div>
            <p className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-200">{t.wipTitle}</p>
            <p className="text-slate-500 dark:text-slate-400">{t.wipDesc.replace('{module}', '')} <span className="font-mono text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-1 rounded">{title}</span></p>
        </div>
      </div>
    );
};

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('/');
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark';
    }
    return 'dark';
  });
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedStation, setSelectedStation] = useState('Station #2 (Munich)');
  const [isStationMenuOpen, setIsStationMenuOpen] = useState(false);
  const [stationSearch, setStationSearch] = useState('');

  // Count of active (unrecovered) fault alarms based on mock data
  const activeAlarmsCount = 3;

  // Lifted Stations State
  const [stations, setStations] = useState<StationListItem[]>(() => lang === 'zh' ? INITIAL_STATIONS_ZH : INITIAL_STATIONS_EN);
  const [editingStation, setEditingStation] = useState<StationListItem | null>(null);
  const [branchConfigStationId, setBranchConfigStationId] = useState<string | null>(null);
  const [feederConfigsByStation, setFeederConfigsByStation] = useState<Record<string, StationFeederConfig>>({});

  // Sync state on lang change
  useEffect(() => {
    setStations(lang === 'zh' ? INITIAL_STATIONS_ZH : INITIAL_STATIONS_EN);
  }, [lang]);

  // Rename Logic
  const handleRenameGroup = (oldName: string, newName: string) => {
      setStations(prev => prev.map(s => s.group === oldName ? { ...s, group: newName } : s));
  };

  const handleSaveStation = (formData: any) => {
      if (editingStation) {
          // Update existing
          setStations(prev => prev.map(s => s.id === editingStation.id ? {
              ...s,
              name: formData.name,
              location: formData.address || 'Unknown',
              type: formData.deviceTypes[0] || 'Unknown',
              pvCap: parseInt(formData.pvPower) || 0,
              essCap: parseInt(formData.essCap) || 0,
              group: formData.parentGroup || '',
              deviceTypes: formData.deviceTypes || [],
              lastUpdate: 'Just now'
          } : s));
          setEditingStation(null);
      } else {
          // Create new
          const newStation: StationListItem = {
              id: formData.id || `ST-NEW-${Date.now()}`,
              name: formData.name,
              location: formData.address || 'Unknown',
              type: formData.deviceTypes[0] || 'Unknown',
              pvCap: parseInt(formData.pvPower) || 0,
              essCap: parseInt(formData.essCap) || 0,
              soc: 0,
              power: 0,
              status: 'Offline',
              grid: 'Connected',
              lastUpdate: 'Just now',
              group: formData.parentGroup || '',
              deviceTypes: formData.deviceTypes || []
          };
          setStations(prev => [newStation, ...prev]);
      }
      setCurrentPath('/stations');
  };

  const handleEditStation = (station: StationListItem) => {
      setEditingStation(station);
      setCurrentPath('/stations/edit');
  };

  const handleConfigureBranches = (station: StationListItem) => {
      setBranchConfigStationId(station.id);
      handleNavigate('/stations/branches');
  };

  // Grouping logic for Header Dropdown
  const { ungroupedStations, groupedStations } = useMemo(() => {
    const filtered = stations.filter(s => 
      s.name.toLowerCase().includes(stationSearch.toLowerCase()) || 
      (s.group && s.group.toLowerCase().includes(stationSearch.toLowerCase()))
    );

    const groups: Record<string, StationListItem[]> = {};
    const ungrouped: StationListItem[] = [];

    filtered.forEach(s => {
      if (s.group) {
        if (!groups[s.group]) groups[s.group] = [];
        groups[s.group].push(s);
      } else {
        ungrouped.push(s);
      }
    });
    return { ungroupedStations: ungrouped, groupedStations: groups };
  }, [stations, stationSearch]);

  // List of existing groups
  const groups = useMemo(() => {
      return Array.from(new Set(stations.map(s => s.group))).filter(Boolean);
  }, [stations]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const getLangLabel = (l: Language) => {
      if(l === 'en') return 'English';
      if(l === 'zh') return '中文';
      return 'Français';
  }

  const shouldShowStationSelector = !['/', '/stations', '/stations/map', '/faults', '/price/list', '/stations/new', '/stations/edit', '/stations/branches', '/entity-mgmt', '/strategy/my-templates', '/strategy/create'].includes(currentPath);
  const isCreatingOrEditing = currentPath === '/stations/new' || currentPath === '/stations/edit';
  const isCreatingStrategy = currentPath === '/strategy/create';
  const isBranchConfig = currentPath === '/stations/branches';

  const handleNavigate = (path: string) => {
      setCurrentPath(path);
  };

  const renderContent = () => {
      // Find full station object for Realtime view
      const selectedStationData = stations.find(s => s.name === selectedStation) || stations[0];

      if (currentPath === '/entity-mgmt') {
          return <EntityManagement lang={lang} theme={theme} onBack={() => handleNavigate('/')} />;
      }

      switch (currentPath) {
          case '/':
              return <Dashboard lang={lang} theme={theme} selectedStation={selectedStation} onNavigate={handleNavigate} />;
          case '/stations':
              return <StationList 
                        lang={lang} 
                        theme={theme} 
                        selectedStation={selectedStation} 
                        stations={stations}
                        onSelectStation={setSelectedStation} 
                        onRenameGroup={handleRenameGroup}
                        onNavigate={handleNavigate} 
                        onEdit={handleEditStation}
                        onConfigureBranches={handleConfigureBranches}
                     />;
          case '/stations/branches': {
              const branchStation = branchConfigStationId
                  ? stations.find((s) => s.id === branchConfigStationId)
                  : undefined;
              if (!branchStation) {
                  return (
                      <StationList
                          lang={lang}
                          theme={theme}
                          selectedStation={selectedStation}
                          stations={stations}
                          onSelectStation={setSelectedStation}
                          onRenameGroup={handleRenameGroup}
                          onNavigate={handleNavigate}
                          onEdit={handleEditStation}
                          onConfigureBranches={handleConfigureBranches}
                      />
                  );
              }
              return (
                  <StationBranchConfig
                      key={branchStation.id}
                      lang={lang}
                      theme={theme}
                      station={branchStation}
                      initialConfig={feederConfigsByStation[branchStation.id] ?? EMPTY_STATION_FEEDER_CONFIG}
                      onBack={() => {
                          setBranchConfigStationId(null);
                          handleNavigate('/stations');
                      }}
                      onSave={(stationId, config) => {
                          setFeederConfigsByStation((prev) => ({ ...prev, [stationId]: config }));
                      }}
                  />
              );
          }
          case '/stations/new':
              return <CreateStation 
                        lang={lang} 
                        theme={theme} 
                        groups={groups} 
                        onBack={() => handleNavigate('/stations')} 
                        onSave={handleSaveStation} 
                     />;
          case '/stations/edit':
              return <CreateStation 
                        lang={lang} 
                        theme={theme} 
                        groups={groups} 
                        initialData={editingStation}
                        onBack={() => { setEditingStation(null); handleNavigate('/stations'); }} 
                        onSave={handleSaveStation} 
                     />;
          case '/stations/map':
              return <StationMap lang={lang} theme={theme} onNavigate={handleNavigate} />;
          case '/stations/architecture':
              return <StationArchitecture lang={lang} theme={theme} selectedStation={selectedStation} />;
          case '/stations/realtime':
              return <StationRealtime lang={lang} theme={theme} selectedStation={selectedStation} stationData={selectedStationData} />;
          case '/stations/analysis':
              return <DataAnalysis lang={lang} theme={theme} selectedStation={selectedStation} />;
          case '/energy':
              return <EnergyStatistics lang={lang} theme={theme} selectedStation={selectedStation} />;
          case '/faults':
              return <FaultAlarms lang={lang} theme={theme} />;
          case '/strategy/execution-view':
              return <StrategyManager lang={lang} theme={theme} selectedStation={selectedStation} stations={stations} strategyStationBindings={{}} initialTab="overview" hideStrategyTabBar onTabChange={(tab) => handleNavigate(tab === 'templates' ? '/strategy/templates' : tab === 'overview' ? '/strategy/execution-view' : '/strategy/orchestration')} onNavigate={handleNavigate} />;
          case '/strategy/orchestration':
              return <StrategyManager lang={lang} theme={theme} selectedStation={selectedStation} stations={stations} strategyStationBindings={{}} initialTab="orchestration" hideOverviewTab onTabChange={(tab) => handleNavigate(tab === 'templates' ? '/strategy/templates' : tab === 'overview' ? '/strategy/execution-view' : '/strategy/orchestration')} onNavigate={handleNavigate} />;
          case '/strategy/md':
              return <WIP title={lang === 'zh' ? "MD 策略" : "MD Strategy"} lang={lang} />;
          case '/strategy/protection':
              return <ProtectionStrategy lang={lang} theme={theme} selectedStation={selectedStation} />;
          case '/strategy/manual':
              return <ManualControl lang={lang} theme={theme} selectedStation={selectedStation} />;
          case '/strategy/my-templates':
              return <StrategyManager lang={lang} theme={theme} selectedStation={selectedStation} stations={stations} strategyStationBindings={MOCK_STRATEGY_STATION_BINDINGS} initialTab="templates" viewMode="my" onTabChange={(tab) => handleNavigate(tab === 'templates' ? '/strategy/my-templates' : tab === 'overview' ? '/strategy/execution-view' : '/strategy/orchestration')} onNavigate={handleNavigate} />;
          case '/strategy/create':
              return <StrategyEditor lang={lang} theme={theme} onBack={() => handleNavigate('/strategy/my-templates')} onSave={(s) => { console.log(s); handleNavigate('/strategy/my-templates'); }} />;
          case '/price/list':
              return <PriceList lang={lang} theme={theme} />;
          case '/revenue':
              return <SiteRevenueDetail lang={lang} theme={theme} />;
          default:
              return <Dashboard lang={lang} theme={theme} selectedStation={selectedStation} onNavigate={handleNavigate} />;
      }
  };

  const headerT = translations[lang].header;
  const userMenuT = headerT.userMenu;
  const isEntityMgmt = currentPath === '/entity-mgmt';

  return (
    <div className={`flex min-h-screen bg-apple-bg-light dark:bg-apple-bg-dark font-sans text-slate-800 dark:text-slate-100 selection:bg-brand-100 dark:selection:bg-brand-900 selection:text-brand-900 dark:selection:text-brand-100`}>
      {!isEntityMgmt && (
        <Sidebar 
            lang={lang} 
            isCollapsed={isSidebarCollapsed}
            currentPath={currentPath}
            onNavigate={handleNavigate}
        />
      )}
      
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isSidebarCollapsed || isEntityMgmt ? (isEntityMgmt ? 'ml-0' : 'ml-14') : 'ml-64'}`}>
        {/* Top Header - Hidden in Entity Mgmt because it has its own shell or header logic */}
        {!isEntityMgmt && (
            <header className="h-[72px] shrink-0 bg-apple-surface-light/80 dark:bg-apple-surface-dark/80 backdrop-blur-xl border-b border-apple-border-light dark:border-apple-border-dark shadow-sm sticky top-0 z-50 px-5 flex items-center justify-between transition-all">
            
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-apple-surface-secondary-light dark:text-slate-400 dark:hover:bg-apple-surface-secondary-dark"
                >
                    <Menu size={20} />
                </button>

                {isCreatingOrEditing && (
                    <button 
                        onClick={() => { setEditingStation(null); handleNavigate('/stations'); }}
                        className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-bold text-slate-500 transition-all hover:border-brand-100 hover:bg-brand-50 hover:text-brand-600 dark:hover:border-brand-800 dark:hover:bg-brand-900/20"
                    >
                        <ChevronLeft size={14} />
                        {lang === 'zh' ? '返回列表' : 'Back'}
                    </button>
                )}

                {isCreatingStrategy && (
                    <button
                        onClick={() => handleNavigate('/strategy/my-templates')}
                        className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-bold text-slate-500 transition-all hover:border-brand-100 hover:bg-brand-50 hover:text-brand-600 dark:hover:border-brand-800 dark:hover:bg-brand-900/20"
                    >
                        <ChevronLeft size={14} />
                        {lang === 'zh' ? '返回手动调度' : 'Back to Manual Dispatch'}
                    </button>
                )}

                {isBranchConfig && (
                    <button
                        type="button"
                        onClick={() => {
                            setBranchConfigStationId(null);
                            handleNavigate('/stations');
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-bold text-slate-500 transition-all hover:border-brand-100 hover:bg-brand-50 hover:text-brand-600 dark:hover:border-brand-800 dark:hover:bg-brand-900/20"
                    >
                        <ChevronLeft size={14} />
                        {lang === 'zh' ? '返回列表' : 'Back'}
                    </button>
                )}

                <div className="w-0.5"></div>

                {shouldShowStationSelector && (
                    <div className="relative z-50 min-w-0 w-[340px] shrink sm:w-[440px]">
                        <button 
                            onClick={() => setIsStationMenuOpen(!isStationMenuOpen)}
                            className="group flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:hover:border-white/15 dark:hover:bg-apple-surface-secondary-dark"
                        >
                                <div className="flex min-w-0 items-center overflow-hidden">
                                    <span className="w-full truncate text-left text-base font-bold text-slate-700 dark:text-slate-200">{selectedStation}</span>
                                </div>
                                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform duration-300 group-hover:text-slate-600 dark:group-hover:text-slate-300 ${isStationMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isStationMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsStationMenuOpen(false)}></div>
                                    <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg animate-in fade-in zoom-in-95 duration-100 dark:border-apple-border-dark dark:bg-apple-surface-dark">
                                        {/* Search Box */}
                                        <div className="border-b border-slate-200 bg-white p-2.5 dark:border-apple-border-dark dark:bg-apple-surface-dark">
                                            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 transition-all focus-within:ring-2 focus-within:ring-brand-100 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:focus-within:ring-brand-900">
                                                <Search size={16} className="shrink-0 text-slate-400"/>
                                                <input 
                                                    type="text" 
                                                    placeholder={lang === 'zh' ? "搜索站点或分组..." : "Search station or group..."}
                                                    className="w-full bg-transparent text-base font-medium text-slate-700 outline-none placeholder-slate-400 dark:text-slate-200"
                                                    value={stationSearch}
                                                    onChange={(e) => setStationSearch(e.target.value)}
                                                    autoFocus
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>

                                        {/* Grouped List Content */}
                                        <div className="max-h-[400px] overflow-y-auto p-1 custom-scrollbar">
                                            
                                            {/* Render Ungrouped Stations First */}
                                            <div className="space-y-0.5 mb-1">
                                                {ungroupedStations.map(station => (
                                                    <button
                                                        key={station.id}
                                                        onClick={() => { 
                                                            setSelectedStation(station.name); 
                                                            setIsStationMenuOpen(false); 
                                                            setStationSearch(''); 
                                                        }}
                                                        className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-base font-bold transition-colors
                                                            ${selectedStation === station.name 
                                                                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' 
                                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'}`}
                                                    >
                                                        <div className="flex flex-col gap-0.5">
                                                            <span>{station.name}</span>
                                                            <span className="font-mono text-xs opacity-50">{station.id}</span>
                                                        </div>
                                                        {selectedStation === station.name && <Check size={18} className="shrink-0 text-brand-500" />}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Render Grouped Stations */}
                                            {(Object.entries(groupedStations) as [string, StationListItem[]][]).map(([groupName, stationsInGroup]) => (
                                                <div key={groupName} className="mb-1">
                                                    {/* Group Header */}
                                                    <div className="mb-1 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:bg-apple-surface-secondary-dark dark:text-slate-500">
                                                        <Folder size={14} className="text-amber-500/70" />
                                                        {groupName}
                                                    </div>
                                                    
                                                    {/* Stations in this Group */}
                                                    <div className="space-y-0.5">
                                                        {stationsInGroup.map(station => (
                                                            <button
                                                                key={station.id}
                                                                onClick={() => { 
                                                                    setSelectedStation(station.name); 
                                                                    setIsStationMenuOpen(false); 
                                                                    setStationSearch(''); 
                                                                }}
                                                                className={`group flex w-full items-center justify-between rounded-lg py-2.5 pl-8 pr-3 text-left text-base font-bold transition-colors
                                                                    ${selectedStation === station.name 
                                                                        ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400' 
                                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark'}`}
                                                            >
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span>{station.name}</span>
                                                                    <span className="font-mono text-xs opacity-50">{station.id}</span>
                                                                </div>
                                                                {selectedStation === station.name && <Check size={18} className="shrink-0 text-brand-500" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}

                                            {ungroupedStations.length === 0 && Object.keys(groupedStations).length === 0 && (
                                                <div className="p-12 text-center text-base font-bold text-slate-400">
                                                    {lang === 'zh' ? '未找到匹配项' : 'No matches found'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                        )}
                    </div>
                )}
            </div>
            
            <div className="flex items-center justify-end gap-2.5">
                <div className="relative">
                    <button 
                    onClick={() => setShowLangMenu(!showLangMenu)}
                    className="flex items-center gap-1.5 rounded-lg border border-apple-border-light px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-apple-surface-secondary-light dark:border-apple-border-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                    title="Switch Language"
                    >
                    <Globe size={15} />
                    <span>{getLangLabel(lang)}</span>
                    </button>
                    {showLangMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowLangMenu(false)}></div>
                            <div className="absolute right-0 z-20 mt-1.5 w-28 overflow-hidden rounded-xl border border-apple-border-light bg-apple-surface-light py-1 shadow-lg dark:border-apple-border-dark dark:bg-apple-surface-dark">
                                {(['en', 'zh', 'fr'] as Language[]).map(l => (
                                    <button 
                                        key={l}
                                        onClick={() => { setLang(l); setShowLangMenu(false); }}
                                        className={`w-full px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark ${lang === l ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400' : 'text-slate-600 dark:text-slate-300'}`}
                                    >
                                        {getLangLabel(l)}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div
                    className="inline-flex items-center rounded-full border border-apple-border-light bg-slate-100/90 px-1 py-0.5 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark"
                    role="group"
                    aria-label={userMenuT.themeSwitch}
                >
                    <button
                        type="button"
                        onClick={() => setTheme('light')}
                        title={headerT.themeLight}
                        aria-pressed={theme === 'light'}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
                            theme === 'light'
                                ? 'bg-white text-amber-500 shadow-sm dark:bg-apple-surface-dark dark:text-amber-300'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <Sun size={16} strokeWidth={2} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        title={headerT.themeDark}
                        aria-pressed={theme === 'dark'}
                        className={`ml-1 flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all ${
                            theme === 'dark'
                                ? 'bg-slate-800 text-slate-50 shadow-sm dark:bg-slate-600 dark:text-white'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <Moon size={16} strokeWidth={2} />
                    </button>
                </div>

                <div className="h-5 w-px bg-apple-border-light dark:bg-apple-border-dark"></div>

                <button 
                    onClick={() => handleNavigate('/faults')}
                    className="group relative rounded-full p-2 text-slate-500 transition-all hover:bg-apple-surface-secondary-light hover:text-brand-600 dark:text-slate-400 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-brand-400"
                >
                    <Bell size={20} />
                    {activeAlarmsCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full border border-white bg-red-500 px-0.5 text-[8px] font-black text-white shadow-sm transition-transform group-hover:scale-110 dark:border-apple-bg-dark">
                            {activeAlarmsCount}
                        </span>
                    )}
                </button>
                
                <div className="relative">
                <div 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="group flex cursor-pointer items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-1 transition-all hover:border-apple-border-light hover:bg-apple-surface-secondary-light dark:hover:border-apple-border-dark dark:hover:bg-apple-surface-secondary-dark"
                >
                    <div className="hidden text-right md:block">
                        <div className="text-sm font-bold leading-tight text-slate-700 transition-colors group-hover:text-brand-600 dark:text-slate-200 dark:group-hover:text-brand-400">{lang === 'zh' ? '管理员' : 'Admin User'}</div>
                        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{lang === 'zh' ? '超级管理员' : 'Super Admin'}</div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white bg-gradient-to-tr from-brand-500 to-brand-600 text-white shadow-md shadow-brand-200 dark:border-apple-border-dark dark:shadow-brand-900/20">
                    <User size={18} />
                    </div>
                    <ChevronDown size={14} className={`mr-0.5 text-slate-400 transition-transform duration-300 dark:text-slate-500 ${showUserMenu ? 'rotate-180' : ''}`} />
                </div>

                {showUserMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)}></div>
                        <div className="absolute right-0 z-20 mt-3 w-60 overflow-hidden rounded-2xl border border-apple-border-light bg-apple-surface-light py-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 dark:border-apple-border-dark dark:bg-apple-surface-dark">
                            <button 
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-base font-bold text-slate-600 transition-all hover:bg-apple-surface-secondary-light hover:text-brand-600 dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                                onClick={() => { setShowUserMenu(false); handleNavigate('/entity-mgmt'); }}
                            >
                                <Building2 size={18} className="shrink-0 text-slate-400" />
                                {userMenuT.manageOrg}
                            </button>
                            <button 
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-base font-bold text-slate-600 transition-all hover:bg-apple-surface-secondary-light hover:text-brand-600 dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                                onClick={() => { setShowUserMenu(false); }}
                            >
                                <Repeat size={18} className="shrink-0 text-slate-400" />
                                {userMenuT.switchOrg}
                            </button>
                            <button 
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-base font-bold text-slate-600 transition-all hover:bg-apple-surface-secondary-light hover:text-brand-600 dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                                onClick={() => { setShowUserMenu(false); }}
                            >
                                <User size={18} className="shrink-0 text-slate-400" />
                                {userMenuT.editProfile}
                            </button>
                            
                            <div className="my-2 h-px bg-apple-border-light dark:bg-apple-border-dark"></div>
                            
                            <button 
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-base font-bold text-rose-600 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/10"
                                onClick={() => { setShowUserMenu(false); }}
                            >
                                <LogOut size={18} className="shrink-0 text-rose-500" />
                                {userMenuT.logout}
                            </button>
                        </div>
                    </>
                )}
                </div>
            </div>
            </header>
        )}

        <main className="flex-1 overflow-x-hidden relative">
            {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
