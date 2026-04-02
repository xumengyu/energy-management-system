
import React, { useState } from 'react';
import { 
    Search, Filter, AlertTriangle, Info, XCircle, CheckCircle2, MoreHorizontal, Eye, BellOff,
    Calendar, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

// Mock Data
const ALARMS_ZH = [
    { id: 'ALM-001', time: '2025-09-16 14:23:10', station: '站点 #2 (微网 A)', device: 'PCS-01', code: 'E-304', desc: '直流侧过压保护触发', level: 3, status: 'Active' },
    { id: 'ALM-002', time: '2025-09-16 13:45:00', station: '站点 #5 (工业园)', device: 'BMS-Cluster-2', code: 'W-102', desc: '单体电池温度偏高', level: 2, status: 'Active' },
    { id: 'ALM-003', time: '2025-09-16 12:30:45', station: '站点 #1 (总站)', device: 'Meter-Main', code: 'I-005', desc: '通讯连接闪断', level: 1, status: 'Recovered' },
    { id: 'ALM-004', time: '2025-09-16 10:15:22', station: '站点 #8 (办公楼)', device: 'EMS-Controller', code: 'W-201', desc: 'CPU 负载率 > 85%', level: 2, status: 'Recovered' },
    { id: 'ALM-005', time: '2025-09-16 09:00:00', station: '站点 #2 (微网 A)', device: 'Inv-02', code: 'E-501', desc: '电网频率异常', level: 3, status: 'Recovered' },
    { id: 'ALM-006', time: '2025-09-15 23:10:11', station: '站点 #9 (数据中心)', device: 'AirCon-03', code: 'I-101', desc: '设备运行时间提醒', level: 1, status: 'Recovered' },
    { id: 'ALM-007', time: '2025-09-15 18:20:33', station: '站点 #5 (工业园)', device: 'PCS-02', code: 'W-105', desc: '风扇转速异常', level: 2, status: 'Active' },
];

const ALARMS_EN = [
    { id: 'ALM-001', time: '2025-09-16 14:23:10', station: 'Station #2 (Microgrid A)', device: 'PCS-01', code: 'E-304', desc: 'DC Side Overvoltage Protection', level: 3, status: 'Active' },
    { id: 'ALM-002', time: '2025-09-16 13:45:00', station: 'Station #5 (Ind. Park)', device: 'BMS-Cluster-2', code: 'W-102', desc: 'Cell Temperature High', level: 2, status: 'Active' },
    { id: 'ALM-003', time: '2025-09-16 12:30:45', station: 'Station #1 (Main)', device: 'Meter-Main', code: 'I-005', desc: 'Comm. Connection Intermittent', level: 1, status: 'Recovered' },
    { id: 'ALM-004', time: '2025-09-16 10:15:22', station: 'Station #8 (Office)', device: 'EMS-Controller', code: 'W-201', desc: 'CPU Load > 85%', level: 2, status: 'Recovered' },
    { id: 'ALM-005', time: '2025-09-16 09:00:00', station: 'Station #2 (Microgrid A)', device: 'Inv-02', code: 'E-501', desc: 'Grid Frequency Abnormal', level: 3, status: 'Recovered' },
    { id: 'ALM-006', time: '2025-09-15 23:10:11', station: 'Station #9 (Data Center)', device: 'AirCon-03', code: 'I-101', desc: 'Runtime Reminder', level: 1, status: 'Recovered' },
    { id: 'ALM-007', time: '2025-09-15 18:20:33', station: 'Station #5 (Ind. Park)', device: 'PCS-02', code: 'W-105', desc: 'Fan Speed Abnormal', level: 2, status: 'Active' },
];

interface FaultAlarmsProps {
    lang: Language;
    theme: Theme;
}

const FaultAlarms: React.FC<FaultAlarmsProps> = ({ lang, theme }) => {
    const t = translations[lang].faultAlarms;
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState<string>('all'); // all, 1, 2, 3
    const [statusFilter, setStatusFilter] = useState<string>('Active'); // Default to Active (Unrecovered)

    // Date Range State
    const [dateRange, setDateRange] = useState({ start: '2025-09-10', end: '2025-09-16' });
    const [isDateOpen, setIsDateOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date('2025-09-16'));
    const [tempSelection, setTempSelection] = useState<{ start: string | null; end: string | null }>({ start: '2025-09-10', end: '2025-09-16' });

    const alarms = lang === 'zh' ? ALARMS_ZH : ALARMS_EN;

    // --- Date Picker Logic ---
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };
    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day: number) => {
        const clickedDateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (!tempSelection.start || (tempSelection.start && tempSelection.end)) {
            setTempSelection({ start: clickedDateStr, end: null });
        } else {
            if (clickedDateStr < tempSelection.start) {
                setTempSelection({ start: clickedDateStr, end: tempSelection.start });
            } else {
                setTempSelection({ ...tempSelection, end: clickedDateStr });
            }
        }
    };

    const applyDateSelection = () => {
        if (tempSelection.start) {
            setDateRange({ 
                start: tempSelection.start, 
                end: tempSelection.end || tempSelection.start 
            });
        }
        setIsDateOpen(false);
    };

    const isSelected = (day: number) => {
        const current = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return current === tempSelection.start || current === tempSelection.end;
    };

    const isInRange = (day: number) => {
        if (!tempSelection.start || !tempSelection.end) return false;
        const current = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return current > tempSelection.start && current < tempSelection.end;
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
        const startDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
        const days = [];

        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8"></div>);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const selected = isSelected(d);
            const inRange = isInRange(d);
            
            days.push(
                <button 
                    key={d} 
                    onClick={() => handleDateClick(d)}
                    className={`h-8 w-full text-xs font-bold rounded-lg transition-all relative
                        ${selected 
                            ? 'bg-brand-500 text-white z-10 shadow-md shadow-brand-500/30' 
                            : inRange 
                                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded-none' 
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'
                        }
                        ${d === 1 && inRange ? 'rounded-l-lg' : ''}
                        ${d === daysInMonth && inRange ? 'rounded-r-lg' : ''}
                    `}
                >
                    {d}
                </button>
            );
        }

        return (
            <div className="p-4 w-[320px]">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded text-slate-500"><ChevronLeft size={16}/></button>
                    <div className="text-base font-bold text-slate-800 dark:text-white">
                        {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded text-slate-500"><ChevronRight size={16}/></button>
                </div>
                
                <div className="grid grid-cols-7 mb-2 text-center">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <div key={d} className="text-xs font-bold text-slate-400 uppercase">{d}</div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 gap-y-1">
                    {days}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-apple-border-dark">
                    <div className="text-xs text-slate-400">
                        {tempSelection.start ? (
                            <span>{tempSelection.start} {tempSelection.end ? `→ ${tempSelection.end}` : ''}</span>
                        ) : 'Select range'}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsDateOpen(false)}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={applyDateSelection}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors shadow-sm"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const filteredAlarms = alarms.filter(alarm => {
        const matchesSearch = 
            alarm.station.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alarm.device.toLowerCase().includes(searchTerm.toLowerCase()) ||
            alarm.code.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesLevel = levelFilter === 'all' || alarm.level.toString() === levelFilter;
        const matchesStatus = statusFilter === 'all' || alarm.status === statusFilter;

        const alarmDate = alarm.time.split(' ')[0];
        const matchesDate = alarmDate >= dateRange.start && alarmDate <= dateRange.end;

        return matchesSearch && matchesLevel && matchesStatus && matchesDate;
    });

    const renderLevelBadge = (level: number) => {
        if (level === 3) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                    <XCircle size={14} /> {t.levels.l3}
                </span>
            );
        }
        if (level === 2) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle size={14} /> {t.levels.l2}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <Info size={14} /> {t.levels.l1}
            </span>
        );
    };

    const renderStatusBadge = (status: string) => {
        if (status === 'Active') {
            return (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                    {t.status.active}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                <CheckCircle2 size={14} className="text-emerald-500"/>
                {t.status.recovered}
            </span>
        );
    };

    return (
        <div className="p-2 w-full animate-in fade-in duration-300">
            {/* Header / Toolbar */}
            <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-apple-border-dark shadow-sm mb-4 flex flex-col xl:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full xl:w-auto">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{t.title}</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total: {alarms.length} / Active: {alarms.filter(a => a.status === 'Active').length}</p>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden xl:block mx-2"></div>
                    <div className="relative w-full xl:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder={translations[lang].header.searchPlaceholder} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-xl text-base outline-none focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full xl:w-auto justify-end flex-wrap">
                    {/* Date Range Picker */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsDateOpen(!isDateOpen)}
                            className={`flex items-center gap-3 bg-white dark:bg-apple-surface-dark border rounded-xl px-4 py-2 text-base font-bold transition-all group min-w-[200px] justify-between
                            ${isDateOpen ? 'border-brand-500 ring-2 ring-brand-100 dark:ring-brand-900/30' : 'border-slate-200 dark:border-apple-border-dark hover:border-slate-300'}`}
                        >
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-slate-400 group-hover:text-brand-500 transition-colors"/>
                                <span className="text-slate-700 dark:text-slate-200 font-mono text-sm">
                                {dateRange.start} <span className="text-slate-300 mx-1">→</span> {dateRange.end}
                                </span>
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isDateOpen ? 'rotate-180' : ''}`}/>
                        </button>
                        
                        {isDateOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setIsDateOpen(false)}></div>
                                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark shadow-xl rounded-2xl z-40 animate-in fade-in zoom-in-95 duration-100">
                                    {renderCalendar()}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Level Filter */}
                    <div className="relative group">
                        <select 
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-xl text-base font-bold text-slate-600 dark:text-slate-300 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all cursor-pointer"
                        >
                            <option value="all">{t.levels.all}</option>
                            <option value="1">{t.levels.l1}</option>
                            <option value="2">{t.levels.l2}</option>
                            <option value="3">{t.levels.l3}</option>
                        </select>
                        <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Status Filter */}
                    <div className="relative group">
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-xl text-base font-bold text-slate-600 dark:text-slate-300 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all cursor-pointer"
                        >
                            <option value="all">{t.status.all}</option>
                            <option value="Active">{t.status.active}</option>
                            <option value="Recovered">{t.status.recovered}</option>
                        </select>
                        <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white dark:bg-apple-surface-dark rounded-2xl border border-slate-200 dark:border-apple-border-dark shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-base text-left">
                        <thead className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-apple-surface-secondary-dark/50 border-b border-slate-100 dark:border-apple-border-dark font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">{t.cols.time}</th>
                                <th className="px-6 py-4">{t.cols.level}</th>
                                <th className="px-6 py-4">{t.cols.station}</th>
                                <th className="px-6 py-4">{t.cols.device}</th>
                                <th className="px-6 py-4">{t.cols.code}</th>
                                <th className="px-6 py-4">{t.cols.desc}</th>
                                <th className="px-6 py-4">{t.cols.status}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                            {filteredAlarms.map((alarm) => (
                                <tr key={alarm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors group">
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-sm whitespace-nowrap">
                                        {alarm.time}
                                    </td>
                                    <td className="px-6 py-4">
                                        {renderLevelBadge(alarm.level)}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">
                                        {alarm.station}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                                        {alarm.device}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm bg-slate-100 dark:bg-apple-surface-secondary-dark text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-apple-border-dark">
                                            {alarm.code}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={alarm.desc}>
                                        {alarm.desc}
                                    </td>
                                    <td className="px-6 py-4">
                                        {renderStatusBadge(alarm.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Empty State */}
                {filteredAlarms.length === 0 && (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-apple-surface-secondary-dark rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="text-slate-300 dark:text-slate-500" size={32} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No alarms found.</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">System is operating normally.</p>
                    </div>
                )}
                
                {/* Pagination (Static) */}
                {filteredAlarms.length > 0 && (
                    <div className="p-4 border-t border-slate-100 dark:border-apple-border-dark flex items-center justify-between bg-slate-50/30 dark:bg-apple-surface-secondary-dark/30">
                        <div className="text-base text-slate-500 dark:text-slate-400">
                            {lang === 'zh' ? '显示' : 'Showing'} <span className="font-bold text-slate-800 dark:text-slate-200">{filteredAlarms.length}</span> {lang === 'zh' ? '条，共' : 'of'} <span className="font-bold text-slate-800 dark:text-slate-200">{alarms.length}</span> {lang === 'zh' ? '条告警' : 'alarms'}
                        </div>
                        <div className="flex gap-2">
                            <button className="px-4 py-2 text-base font-medium text-slate-500 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark disabled:opacity-50">{lang === 'zh' ? '上一页' : 'Previous'}</button>
                            <button className="px-4 py-2 text-base font-medium text-slate-500 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-lg hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark">{lang === 'zh' ? '下一页' : 'Next'}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaultAlarms;
