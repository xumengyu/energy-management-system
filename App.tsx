
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
import CreateStation from './components/CreateStation';
import EnergyStatistics from './components/EnergyStatistics';
import FaultAlarms from './components/FaultAlarms';
import StationMap from './components/StationMap';
import EntityManagement from './components/EntityManagement';
import { 
  Bell, User, Globe, ChevronDown, Moon, Sun, Menu, Search, Check, Folder, ChevronLeft,
  Building2, Repeat, LogOut
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

// WIP Component for placeholder routes
const WIP = ({ title, lang }: { title: string, lang: Language }) => {
    const t = translations[lang].common;
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)] text-slate-400 dark:text-slate-500">
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
      const saved = localStorage.getItem('theme') as Theme;
      return saved || 'light';
    }
    return 'light';
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

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const getLangLabel = (l: Language) => {
      if(l === 'en') return 'English';
      if(l === 'zh') return '中文';
      return 'Français';
  }

  const shouldShowStationSelector = !['/', '/stations', '/stations/map', '/faults', '/price/list', '/stations/new', '/stations/edit', '/entity-mgmt', '/strategy/my-templates', '/strategy/create'].includes(currentPath);
  const isCreatingOrEditing = currentPath === '/stations/new' || currentPath === '/stations/edit';
  const isCreatingStrategy = currentPath === '/strategy/create';

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
                     />;
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
              return <StationMap lang={lang} theme={theme} />;
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
              return <StrategyManager lang={lang} theme={theme} selectedStation={selectedStation} stations={stations} strategyStationBindings={{}} initialTab="overview" onTabChange={(tab) => handleNavigate(tab === 'templates' ? '/strategy/templates' : tab === 'overview' ? '/strategy/execution-view' : '/strategy/orchestration')} onNavigate={handleNavigate} />;
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
              return <WIP title={lang === 'zh' ? "收益管理" : "Revenue Management"} lang={lang} />;
          default:
              return <Dashboard lang={lang} theme={theme} selectedStation={selectedStation} onNavigate={handleNavigate} />;
      }
  };

  const userMenuT = translations[lang].header.userMenu;
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
      
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isSidebarCollapsed || isEntityMgmt ? (isEntityMgmt ? 'ml-0' : 'ml-14') : 'ml-48'}`}>
        {/* Top Header - Hidden in Entity Mgmt because it has its own shell or header logic */}
        {!isEntityMgmt && (
            <header className="h-[54px] bg-apple-surface-light/80 dark:bg-apple-surface-dark/80 backdrop-blur-xl border-b border-apple-border-light dark:border-apple-border-dark shadow-sm sticky top-0 z-50 px-3 flex items-center justify-between transition-all">
            
            <div className="flex items-center gap-1">
                <button 
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="p-1.5 rounded-lg hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark text-slate-600 dark:text-slate-400 transition-colors"
                >
                    <Menu size={16} />
                </button>

                {isCreatingOrEditing && (
                    <button 
                        onClick={() => { setEditingStation(null); handleNavigate('/stations'); }}
                        className="flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-all border border-transparent hover:border-brand-100 dark:hover:border-brand-800"
                    >
                        <ChevronLeft size={12} />
                        {lang === 'zh' ? '返回列表' : 'Back'}
                    </button>
                )}

                {isCreatingStrategy && (
                    <button
                        onClick={() => handleNavigate('/strategy/my-templates')}
                        className="flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-all border border-transparent hover:border-brand-100 dark:hover:border-brand-800"
                    >
                        <ChevronLeft size={12} />
                        {lang === 'zh' ? '返回策略列表' : 'Back to Strategy List'}
                    </button>
                )}

                <div className="w-0.5"></div>

                {shouldShowStationSelector && (
                    <div className="relative w-[200px] z-50">
                        <button 
                            onClick={() => setIsStationMenuOpen(!isStationMenuOpen)}
                            className="w-full h-8 flex items-center justify-between bg-white dark:bg-apple-surface-dark hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark hover:border-slate-300 dark:hover:border-white/15 rounded-lg px-3 transition-all group shadow-sm"
                        >
                                <div className="flex items-center overflow-hidden min-w-0">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate w-full text-left">{selectedStation}</span>
                                </div>
                                <ChevronDown size={12} className={`text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform duration-300 ${isStationMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isStationMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsStationMenuOpen(false)}></div>
                                    <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                        {/* Search Box */}
                                        <div className="p-2 border-b border-slate-200 dark:border-apple-border-dark bg-white dark:bg-apple-surface-dark">
                                            <div className="h-8 flex items-center gap-2 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark px-3 rounded-lg focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-900 transition-all">
                                                <Search size={12} className="text-slate-400"/>
                                                <input 
                                                    type="text" 
                                                    placeholder={lang === 'zh' ? "搜索站点或分组..." : "Search station or group..."}
                                                    className="w-full bg-transparent outline-none text-sm font-medium text-slate-700 dark:text-slate-200 placeholder-slate-400"
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
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-between group
                                                            ${selectedStation === station.name 
                                                                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' 
                                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'}`}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span>{station.name}</span>
                                                            <span className="text-[10px] font-mono opacity-50">{station.id}</span>
                                                        </div>
                                                        {selectedStation === station.name && <Check size={14} className="text-brand-500" />}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Render Grouped Stations */}
                                            {(Object.entries(groupedStations) as [string, StationListItem[]][]).map(([groupName, stationsInGroup]) => (
                                                <div key={groupName} className="mb-1">
                                                    {/* Group Header */}
                                                    <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest bg-slate-50 dark:bg-apple-surface-secondary-dark rounded-lg mb-1">
                                                        <Folder size={12} className="text-amber-500/70" />
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
                                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-between group pl-7
                                                                    ${selectedStation === station.name 
                                                                        ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400' 
                                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark'}`}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span>{station.name}</span>
                                                                    <span className="text-[10px] font-mono opacity-50">{station.id}</span>
                                                                </div>
                                                                {selectedStation === station.name && <Check size={14} className="text-brand-500" />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}

                                            {ungroupedStations.length === 0 && Object.keys(groupedStations).length === 0 && (
                                                <div className="p-12 text-center text-slate-400 text-sm font-bold">
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
            
            <div className="flex items-center justify-end gap-2">
                <button 
                    onClick={toggleTheme}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark hover:text-brand-600 dark:hover:text-brand-400 rounded-full transition-all"
                    title="Toggle Theme"
                >
                    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                </button>

                <div className="relative">
                    <button 
                    onClick={() => setShowLangMenu(!showLangMenu)}
                    className="px-1.5 py-1 rounded-lg hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark text-slate-600 dark:text-slate-300 font-medium text-[9px] border border-apple-border-light dark:border-apple-border-dark flex items-center gap-1 transition-all"
                    title="Switch Language"
                    >
                    <Globe size={11} />
                    <span>{getLangLabel(lang)}</span>
                    </button>
                    {showLangMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowLangMenu(false)}></div>
                            <div className="absolute right-0 mt-1 w-24 bg-apple-surface-light dark:bg-apple-surface-dark rounded-xl shadow-lg border border-apple-border-light dark:border-apple-border-dark py-1 z-20 overflow-hidden">
                                {(['en', 'zh', 'fr'] as Language[]).map(l => (
                                    <button 
                                        key={l}
                                        onClick={() => { setLang(l); setShowLangMenu(false); }}
                                        className={`w-full text-left px-2.5 py-1 text-[9px] font-medium hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark transition-colors ${lang === l ? 'text-brand-600 dark:text-brand-400 bg-brand-100 dark:bg-brand-900/40' : 'text-slate-600 dark:text-slate-300'}`}
                                    >
                                        {getLangLabel(l)}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="h-4 w-px bg-apple-border-light dark:bg-apple-border-dark"></div>

                <div 
                    onClick={toggleTheme}
                    className="flex items-center w-10 h-5 bg-slate-100 dark:bg-slate-800 rounded-full p-0.5 cursor-pointer transition-all border border-apple-border-light dark:border-apple-border-dark hover:border-brand-400 dark:hover:border-brand-500 group relative"
                    title={theme === 'light' ? (lang === 'zh' ? '切换至暗色模式' : 'Switch to Dark Mode') : (lang === 'zh' ? '切换至亮色模式' : 'Switch to Light Mode')}
                >
                    <div className={`w-4 h-4 rounded-full shadow-sm transition-all duration-300 flex items-center justify-center ${theme === 'dark' ? 'translate-x-5 bg-brand-500' : 'translate-x-0 bg-white'}`}>
                        {theme === 'light' ? <Sun size={10} className="text-amber-500" /> : <Moon size={10} className="text-white" />}
                    </div>
                </div>

                <button 
                    onClick={() => handleNavigate('/faults')}
                    className="relative p-1.5 text-slate-500 dark:text-slate-400 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark hover:text-brand-600 dark:hover:text-brand-400 rounded-full transition-all group"
                >
                    <Bell size={16} />
                    {activeAlarmsCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[12px] h-[12px] px-0.5 bg-red-500 text-white rounded-full border border-white dark:border-apple-bg-dark shadow-sm flex items-center justify-center text-[7px] font-black group-hover:scale-110 transition-transform">
                            {activeAlarmsCount}
                        </span>
                    )}
                </button>
                
                <div className="relative">
                <div 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1.5 pl-1 pr-0.5 py-0.5 rounded-full hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark transition-all cursor-pointer border border-transparent hover:border-apple-border-light dark:hover:border-apple-border-dark group"
                >
                    <div className="text-right hidden md:block">
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{lang === 'zh' ? '管理员' : 'Admin User'}</div>
                        <div className="text-[8px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">{lang === 'zh' ? '超级管理员' : 'Super Admin'}</div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-500 to-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-200 dark:shadow-brand-900/20 border border-white dark:border-apple-border-dark">
                    <User size={14} />
                    </div>
                    <ChevronDown size={10} className={`text-slate-400 dark:text-slate-500 mr-0.5 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
                </div>

                {showUserMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)}></div>
                        <div className="absolute right-0 mt-3 w-56 bg-apple-surface-light dark:bg-apple-surface-dark rounded-2xl shadow-2xl border border-apple-border-light dark:border-apple-border-dark py-2 z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <button 
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark hover:text-brand-600 transition-all text-left"
                                onClick={() => { setShowUserMenu(false); handleNavigate('/entity-mgmt'); }}
                            >
                                <Building2 size={16} className="text-slate-400" />
                                {userMenuT.manageOrg}
                            </button>
                            <button 
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark hover:text-brand-600 transition-all text-left"
                                onClick={() => { setShowUserMenu(false); }}
                            >
                                <Repeat size={16} className="text-slate-400" />
                                {userMenuT.switchOrg}
                            </button>
                            <button 
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark hover:text-brand-600 transition-all text-left"
                                onClick={() => { setShowUserMenu(false); }}
                            >
                                <User size={16} className="text-slate-400" />
                                {userMenuT.editProfile}
                            </button>
                            
                            <button 
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark hover:text-brand-600 transition-all text-left"
                                onClick={() => { toggleTheme(); setShowUserMenu(false); }}
                            >
                                {theme === 'light' ? <Moon size={16} className="text-slate-400" /> : <Sun size={16} className="text-slate-400" />}
                                {userMenuT.themeSwitch}
                            </button>
                            
                            <div className="h-px bg-apple-border-light dark:bg-apple-border-dark my-2"></div>
                            
                            <button 
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all text-left"
                                onClick={() => { setShowUserMenu(false); }}
                            >
                                <LogOut size={16} className="text-rose-500" />
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
