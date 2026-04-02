
import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  List,
  Map,
  Activity,
  PieChart,
  Network,
  GitBranch,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  LayoutTemplate,
  ToggleRight
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface SidebarProps {
  lang: Language;
  isCollapsed: boolean;
  currentPath: string;
  onNavigate: (path: string) => void;
}

// Define the structure for grouped menu items
type MenuItem = {
  id: string; // This serves as the path
  label: string;
  icon: any;
};

type MenuCategory = {
  title: string;
  items: MenuItem[];
};

const Sidebar: React.FC<SidebarProps> = ({ lang, isCollapsed, currentPath, onNavigate }) => {
  const t = translations[lang].sidebar;
  
  const handleNavigate = (path: string) => {
      onNavigate(path);
  };

  const menuGroups: MenuCategory[] = [
    {
        title: '',
        items: [
            { id: '/', label: t.assets, icon: LayoutDashboard },
        ]
    },
    {
        title: t.categoryManagement,
        items: [
            { id: '/stations', label: t.stationList, icon: List },
            { id: '/stations/map', label: t.stationMap, icon: Map },
            { id: '/stations/architecture', label: t.stationArchitecture, icon: Network },
            { id: '/stations/realtime', label: t.realtimeData, icon: Activity },
            { id: '/stations/analysis', label: t.dataAnalysis, icon: PieChart },
            { id: '/energy', label: t.energyStats, icon: BarChart3 },
        ]
    },
    {
        title: t.categoryAlarms,
        items: [{ id: '/faults', label: t.faults, icon: AlertTriangle }],
    },
    {
        title: t.categoryPriceTrading,
        items: [
            { id: '/strategy/execution-view', label: t.executionView, icon: Activity },
            { id: '/strategy/orchestration', label: t.dispatchOrchestration, icon: GitBranch },
            { id: '/strategy/my-templates', label: t.myStrategies, icon: LayoutTemplate },
            { id: '/price/list', label: t.priceList, icon: List },
        ]
    },
    {
        title: t.categoryRevenue,
        items: [{ id: '/revenue', label: t.revenue, icon: DollarSign }],
    },
    {
        title: t.categoryControl,
        items: [
            { id: '/strategy/md', label: t.mdStrategy, icon: Activity },
            { id: '/strategy/protection', label: t.protectionStrategy, icon: ShieldCheck },
            { id: '/strategy/manual', label: t.manualControl, icon: ToggleRight },
        ]
    }
  ];

  return (
    <div className={`${isCollapsed ? 'w-14' : 'w-64'} bg-apple-surface-light dark:bg-apple-surface-dark text-slate-800 dark:text-white flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] overflow-hidden border-r border-apple-border-light dark:border-apple-border-dark`}>
      {/* Brand / Logo Area */}
      <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} transition-all`}>
        <div className="flex items-center gap-2.5">
          {/* EcoWatt Custom Logo */}
          <div className="w-6 h-6 flex-shrink-0 transform transition-transform hover:scale-105 cursor-pointer">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
                <circle cx="20" cy="55" r="13" className="fill-slate-900 dark:fill-white" />
                <circle cx="28" cy="28" r="13" className="fill-brand-900" />
                <circle cx="55" cy="15" r="13" className="fill-brand-700" />
                <circle cx="82" cy="28" r="13" className="fill-brand-500" />
                <circle cx="35" cy="80" r="13" className="fill-brand-600" />
                <circle cx="65" cy="85" r="13" className="fill-[#eab308]" />
            </svg>
          </div>
          
          {!isCollapsed && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
                <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-none font-sans">
                  EcoWatt
                </h1>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wider">Technologies</span>
            </div>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar ${isCollapsed ? 'py-2 px-0' : 'space-y-2 py-2 px-3'}`}>
        {menuGroups.map((group, index) => (
            <div key={index}>
                {group.title && !isCollapsed && (
                    <h3 className="px-1 text-[10px] font-extrabold text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1 animate-in fade-in duration-300 delay-100">
                        {group.title}
                    </h3>
                )}
                <ul className="space-y-0.5">
                    {group.items.map((item) => {
                        const isActive = currentPath === item.id;

                        return (
                            <li key={item.id} className="relative">
                                <button 
                                    onClick={() => handleNavigate(item.id)}
                                    className={`w-full h-10 flex items-center rounded-xl transition-all duration-200 group relative select-none text-[13px]
                                    ${isCollapsed ? 'justify-center px-0' : 'justify-start px-3 text-left'}
                                    ${isActive 
                                        ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 font-bold' 
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark hover:text-slate-900 dark:hover:text-slate-200 font-medium'}`}
                                    title={isCollapsed ? item.label : ''}
                                >
                                    {isCollapsed ? (
                                        <span className={`flex items-center justify-center shrink-0 rounded-md p-0.5 transition-colors ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                                            <item.icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                                        </span>
                                    ) : (
                                        <div className="flex items-center gap-3 text-left flex-1 min-w-0">
                                            <div className={`shrink-0 p-0.5 rounded-md transition-colors ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                                                <item.icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                                            </div>
                                            <span className="leading-tight flex-1 truncate">{item.label}</span>
                                        </div>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        ))}
      </div>

      {/* Footer */}
      {!isCollapsed && (
          <div className="px-3 py-2.5 border-t border-slate-200 dark:border-apple-border-dark bg-slate-50/80 dark:bg-apple-surface-secondary-dark/40 shrink-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center font-medium leading-snug tracking-wide">
                  © 2025 EcoWatt Technologies
              </div>
          </div>
      )}
    </div>
  );
};

export default Sidebar;
