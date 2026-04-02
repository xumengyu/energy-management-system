
import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, MapPin, Link as BindIcon,
  Battery, AlertCircle, CheckCircle2, Power, Settings, Sun,
  ChevronDown, ChevronRight, Folder, Edit3, Check, X, FileText
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

// Define the shape of a station item
export interface StationListItem {
  id: string;
  name: string;
  location: string;
  type: string;
  pvCap: number;
  essCap: number;
  soc: number;
  power: number;
  status: string;
  grid: string;
  lastUpdate: string;
  group: string;
  deviceTypes?: string[];
}

interface StationListProps {
  lang: Language;
  theme: Theme;
  selectedStation: string;
  stations: StationListItem[];
  onSelectStation: (station: string) => void;
  onRenameGroup: (oldName: string, newName: string) => void;
  onNavigate?: (path: string) => void;
  onEdit?: (station: StationListItem) => void;
}

const StationList: React.FC<StationListProps> = ({ 
    lang, 
    theme, 
    selectedStation, 
    stations, 
    onSelectStation, 
    onRenameGroup,
    onNavigate,
    onEdit
}) => {
  const t = translations[lang].stationList;
  const isDark = theme === 'dark';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  
  // Group Renaming Local UI State
  const [renamingGroup, setRenamingGroup] = useState<{oldName: string, newName: string} | null>(null);

  // Helper to check if critical info is missing
  const isStationInfoIncomplete = (station: StationListItem) => {
    return (
        !station.location || 
        station.location === 'Unknown' || 
        !station.deviceTypes || 
        station.deviceTypes.length === 0 ||
        !station.type
    );
  };

  const filteredStations = useMemo(() => {
    return stations.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            s.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = statusFilter === 'All' || s.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [stations, searchTerm, statusFilter]);

  // Separate Ungrouped and Grouped Data
  const { ungroupedStations, groupedStations } = useMemo(() => {
    const grouped: Record<string, StationListItem[]> = {};
    const ungrouped: StationListItem[] = [];
    
    filteredStations.forEach(s => {
      if (!s.group || s.group.trim() === '') {
        ungrouped.push(s);
      } else {
        if (!grouped[s.group]) grouped[s.group] = [];
        grouped[s.group].push(s);
      }
    });
    return { ungroupedStations: ungrouped, groupedStations: grouped };
  }, [filteredStations]);

  // If searching, auto-expand all groups
  useMemo(() => {
    if (searchTerm) {
      setExpandedGroups(Object.keys(groupedStations));
    } else if (expandedGroups.length === 0 && Object.keys(groupedStations).length > 0) {
      setExpandedGroups([Object.keys(groupedStations)[0]]); 
    }
  }, [groupedStations, searchTerm]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]
    );
  };

  const handleStartRename = (e: React.MouseEvent, groupName: string) => {
      e.stopPropagation();
      setRenamingGroup({ oldName: groupName, newName: groupName });
  }

  const handleSaveRename = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (renamingGroup && renamingGroup.newName.trim() && renamingGroup.oldName !== renamingGroup.newName) {
          onRenameGroup(renamingGroup.oldName, renamingGroup.newName.trim());
          setExpandedGroups(prev => prev.map(g => g === renamingGroup.oldName ? renamingGroup.newName.trim() : g));
      }
      setRenamingGroup(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
      e.stopPropagation();
      setRenamingGroup(null);
  };

  const renderStatusBadge = (status: string) => {
      if (status === 'Normal') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><CheckCircle2 size={12}/> {t.statusNormal}</span>
      if (status === 'Warning') return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><AlertCircle size={12}/> {t.statusWarning}</span>
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-apple-surface-secondary-dark text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-apple-border-dark"><Power size={12}/> {t.statusOffline}</span>
  }

  const renderStationRow = (station: StationListItem, isIndented: boolean) => {
    const isIncomplete = isStationInfoIncomplete(station);
    
    return (
        <tr key={station.id} className={`group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors ${selectedStation === station.name ? 'bg-blue-50/40 dark:bg-brand-900/10' : ''}`}>
            <td className={`px-3 py-2.5 ${isIndented ? 'pl-8' : ''}`}>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-apple-surface-secondary-dark dark:to-apple-bg-dark flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold border border-slate-200 dark:border-apple-border-dark text-xs">
                        {station.type ? station.type.charAt(0) : '?'}
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-sm leading-tight">{station.name}</div>
                        <div className="text-xs text-slate-400 font-mono leading-none">{station.id}</div>
                    </div>
                </div>
            </td>
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-sm">
                    <MapPin size={12} className="text-slate-400 shrink-0" />
                    <span className={`truncate max-w-[100px] ${!station.location || station.location === 'Unknown' ? 'text-rose-400 italic' : ''}`}>
                        {station.location || 'Unknown'}
                    </span>
                </div>
            </td>
            <td className="px-3 py-2.5">
                <div className="flex flex-col gap-0">
                    <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                        <Sun size={10} className="text-amber-500" /> {station.pvCap} kWp
                    </div>
                    {station.essCap > 0 && (
                        <div className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                            <Battery size={10} className="text-purple-500" /> {station.essCap} kWh
                        </div>
                    )}
                </div>
            </td>
            <td className="px-3 py-2.5">
                {renderStatusBadge(station.status)}
            </td>
            <td className="px-3 py-2.5 text-center">
                {station.essCap > 0 ? (
                    <div className="inline-flex flex-col items-center">
                        <span className={`text-sm font-bold ${station.soc < 30 ? 'text-rose-500' : 'text-emerald-500'}`}>{station.soc}%</span>
                        <div className="w-8 h-1 bg-slate-100 dark:bg-apple-surface-secondary-dark rounded-full overflow-hidden mt-0.5">
                            <div className={`h-full rounded-full ${station.soc < 30 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{width: `${station.soc}%`}}></div>
                        </div>
                    </div>
                ) : (
                    <span className="text-slate-300 dark:text-slate-700">-</span>
                )}
            </td>
            <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 text-xs">
                {station.lastUpdate}
            </td>
            <td className="px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1">
                    {/* Modify Info Button - Conditioned on Incomplete status */}
                    <button 
                        onClick={() => onEdit && onEdit(station)}
                        className={`p-0.5 rounded-lg transition-colors flex items-center gap-1 
                        ${isIncomplete 
                            ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20' 
                            : 'text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'}`} 
                        title={isIncomplete 
                            ? (lang === 'zh' ? '请补全站点信息' : 'Please complete station info') 
                            : t.actionModify}
                    >
                        <FileText size={12} />
                        <span className="text-xs font-bold hidden xl:inline">
                            {t.actionModify}
                        </span>
                        {isIncomplete && (
                            <div className="absolute top-0 right-0 w-1 h-1 bg-rose-500 rounded-full border border-white dark:border-apple-bg-dark"></div>
                        )}
                    </button>
                    <button 
                        onClick={() => {
                            onSelectStation(station.name);
                            if (onNavigate) {
                                onNavigate('/stations/realtime');
                            }
                        }}
                        className="px-1.5 py-0.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 font-bold text-sm border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all"
                    >
                        {t.actionMonitor}
                    </button>
                </div>
            </td>
        </tr>
    );
  };

  return (
    <div className="ems-page-shell">
        {/* Toolbar */}
        <div className="ems-card p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6 w-full md:w-auto overflow-x-auto md:overflow-visible">
                <div className="relative w-full md:w-64 min-w-[160px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={t.search} 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all"
                    />
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden md:block"></div>
                <div className="flex items-center gap-1">
                    {['All', 'Normal', 'Warning', 'Offline'].map(status => (
                        <button 
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors whitespace-nowrap
                            ${statusFilter === status 
                                ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 dark:border-white' 
                                : 'bg-white dark:bg-apple-surface-dark text-slate-600 dark:text-slate-400 border-slate-200 dark:border-apple-border-dark hover:border-slate-300 dark:hover:border-white/15'}`}
                        >
                            {status === 'All' ? t.filterAll : (
                                status === 'Normal' ? t.statusNormal : (
                                    status === 'Warning' ? t.statusWarning : t.statusOffline
                                )
                            )}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button 
                  onClick={() => onNavigate && onNavigate('/stations/new')}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-xl shadow-md text-sm font-bold transition-all hover:-translate-y-0.5 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 whitespace-nowrap"
                >
                    <Plus size={18} /> {t.addStation}
                </button>
            </div>
        </div>

        {/* Table List with Grouping */}
        <div className="ems-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-apple-surface-secondary-dark/50 border-b border-slate-100 dark:border-apple-border-dark font-bold">
                        <tr>
                            <th className="px-3 py-3 w-[300px]">{t.colName}</th>
                            <th className="px-3 py-3">{t.colLocation}</th>
                            <th className="px-3 py-3">{t.colCapacity}</th>
                            <th className="px-3 py-3">{t.colStatus}</th>
                            <th className="px-3 py-3 text-center">{t.colSoc}</th>
                            <th className="px-3 py-3">{t.colTime}</th>
                            <th className="px-3 py-3 text-right">{t.colAction}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                        {/* 1. Ungrouped Stations (Direct display without headers) */}
                        {ungroupedStations.map(station => renderStationRow(station, false))}

                        {/* 2. Grouped Stations */}
                        {(Object.entries(groupedStations) as [string, StationListItem[]][]).map(([groupName, groupStations]) => {
                            const isExpanded = expandedGroups.includes(groupName);
                            const normalCount = groupStations.filter(s => s.status === 'Normal').length;
                            const warningCount = groupStations.filter(s => s.status === 'Warning').length;
                            const offlineCount = groupStations.filter(s => s.status === 'Offline').length;

                            const isRenaming = renamingGroup?.oldName === groupName;

                            return (
                                <React.Fragment key={groupName}>
                                    {/* Group Header Row */}
                                    <tr 
                                        className={`cursor-pointer bg-slate-50/80 dark:bg-apple-surface-secondary-dark/40 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark/60 transition-colors ${isRenaming ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''}`}
                                        onClick={() => toggleGroup(groupName)}
                                    >
                                        <td colSpan={7} className="px-3 py-2.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 flex-1">
                                                    <div className="p-0.5 rounded bg-white dark:bg-apple-surface-dark text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-apple-border-dark">
                                                        {isExpanded ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                                                    </div>
                                                    <div className="flex items-center gap-1 group/groupname">
                                                        <Folder size={12} className="text-amber-500 fill-amber-500/20 shrink-0"/>
                                                        
                                                        {isRenaming ? (
                                                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                                <input 
                                                                    autoFocus
                                                                    className="bg-white dark:bg-apple-surface-dark border-2 border-brand-500 rounded px-1.5 py-0.5 text-xs font-bold outline-none text-slate-800 dark:text-slate-200"
                                                                    value={renamingGroup.newName}
                                                                    onChange={e => setRenamingGroup({ ...renamingGroup, newName: e.target.value })}
                                                                    onKeyDown={e => e.key === 'Enter' && handleSaveRename(e as any)}
                                                                />
                                                                <button onClick={handleSaveRename} className="p-0.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded" title={t.save}>
                                                                    <Check size={10}/>
                                                                </button>
                                                                <button onClick={handleCancelRename} className="p-0.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded" title={t.cancel}>
                                                                    <X size={10}/>
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{groupName}</span>
                                                                <button 
                                                                    onClick={(e) => handleStartRename(e, groupName)}
                                                                    className="p-0.5 opacity-0 group-hover/groupname:opacity-100 transition-opacity text-slate-400 hover:text-brand-500 hover:bg-white dark:hover:bg-apple-bg-dark rounded"
                                                                    title={t.renameGroup}
                                                                >
                                                                    <Edit3 size={10}/>
                                                                </button>
                                                                <span className="px-1 py-0.5 rounded-full bg-slate-200 dark:bg-apple-bg-dark text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                                    {t.stationsCount.replace('{count}', groupStations.length.toString())}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {!isRenaming && (
                                                    <div className="flex items-center gap-2 mr-2">
                                                        <div className="flex items-center gap-1 text-[10px]">
                                                            {normalCount > 0 && <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-1 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/40"><CheckCircle2 size={8}/> {normalCount}</span>}
                                                            {warningCount > 0 && <span className="flex items-center gap-1 text-amber-600 font-bold bg-amber-50 dark:bg-amber-900/20 px-1 py-0.5 rounded border border-amber-100 dark:border-amber-900/40"><AlertCircle size={8}/> {warningCount}</span>}
                                                            {offlineCount > 0 && <span className="flex items-center gap-1 text-slate-500 font-bold bg-slate-100 dark:bg-apple-surface-dark px-1 py-0.5 rounded border border-slate-200 dark:border-apple-border-dark"><Power size={8}/> {offlineCount}</span>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Indented Station Rows */}
                                    {isExpanded && groupStations.map((station) => renderStationRow(station, true))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {/* Empty State */}
            {filteredStations.length === 0 && (
                <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-apple-surface-secondary-dark rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-slate-300 dark:text-slate-600" size={32}/>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No stations found matching your criteria.</p>
                </div>
            )}

            {/* Pagination Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-apple-border-dark flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/30 dark:bg-apple-surface-secondary-dark/30">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                    {lang === 'zh' ? '共计' : 'Total'} <span className="font-bold text-slate-800 dark:text-slate-200">{filteredStations.length}</span> {lang === 'zh' ? '个匹配站点' : 'matching stations'}
                </div>
                <div className="flex gap-2 shrink-0">
                    <button type="button" className="px-3 py-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-xl hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark disabled:opacity-50 transition-colors">{lang === 'zh' ? '上一页' : 'Previous'}</button>
                    <button type="button" className="px-3 py-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-xl hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark transition-colors">{lang === 'zh' ? '下一页' : 'Next'}</button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StationList;
