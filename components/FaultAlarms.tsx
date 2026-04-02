
import React, { useState } from 'react';
import { 
    Search, Filter, AlertTriangle, Info, XCircle, CheckCircle2,
    Calendar, ChevronDown, ChevronLeft, ChevronRight, Activity, List, MapPin, Eye
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

const FaultAlarms: React.FC<FaultAlarmsProps> = ({ lang }) => {
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
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle size={12} /> {t.levels.l3}
                </span>
            );
        }
        if (level === 2) {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    <AlertTriangle size={12} /> {t.levels.l2}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                <Info size={12} /> {t.levels.l1}
            </span>
        );
    };

    const renderStatusBadge = (status: string) => {
        if (status === 'Active') {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-600 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                    {t.status.active}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircle2 size={12} />
                {t.status.recovered}
            </span>
        );
    };

    const statusTabBtn = (active: boolean) =>
        `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all whitespace-nowrap ${
            active
                ? 'bg-white text-blue-600 shadow-sm dark:bg-apple-surface-dark dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
        }`;

    return (
        <div className="ems-page-shell">
            {/* Header / Toolbar — 与电价列表同款 */}
            <div className="ems-card mb-4 flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-center md:w-auto md:gap-6">
                    <div className="custom-scrollbar-hide flex min-w-0 items-center overflow-x-auto">
                        <div className="ems-segmented shrink-0">
                            {(
                                [
                                    { id: 'Active' as const, label: t.status.active, icon: Activity },
                                    { id: 'Recovered' as const, label: t.status.recovered, icon: CheckCircle2 },
                                    { id: 'all' as const, label: t.status.all, icon: List },
                                ] as const
                            ).map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setStatusFilter(item.id)}
                                    className={statusTabBtn(statusFilter === item.id)}
                                >
                                    <item.icon size={16} />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="hidden h-8 w-px shrink-0 bg-slate-200 dark:bg-white/10 sm:block" />

                    <div className="relative w-full sm:min-w-[200px] md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t.search}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-100 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:focus:ring-blue-900"
                        />
                    </div>
                </div>

                <div className="flex w-full flex-wrap items-center justify-end gap-3 md:w-auto">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsDateOpen(!isDateOpen)}
                            className={`group flex min-w-[200px] items-center justify-between gap-3 rounded-xl border bg-white px-4 py-2 text-sm font-bold transition-all dark:bg-apple-surface-dark ${
                                isDateOpen
                                    ? 'border-brand-500 ring-2 ring-brand-100 dark:ring-brand-900/30'
                                    : 'border-slate-200 hover:border-slate-300 dark:border-apple-border-dark'
                            }`}
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <Calendar size={16} className="shrink-0 text-slate-400 transition-colors group-hover:text-brand-500" />
                                <span className="truncate font-mono text-slate-700 dark:text-slate-200">
                                    {dateRange.start} <span className="mx-1 text-slate-300">→</span> {dateRange.end}
                                </span>
                            </div>
                            <ChevronDown
                                size={14}
                                className={`shrink-0 text-slate-400 transition-transform duration-300 ${isDateOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {isDateOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setIsDateOpen(false)} />
                                <div className="absolute right-0 top-full z-40 mt-2 animate-in rounded-2xl border border-slate-200 bg-white shadow-xl duration-100 zoom-in-95 dark:border-apple-border-dark dark:bg-apple-surface-dark">
                                    {renderCalendar()}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="relative">
                        <select
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                            className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-4 pr-9 text-sm font-bold text-slate-600 transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:focus:ring-blue-900"
                            aria-label={t.levels.all}
                        >
                            <option value="all">{t.levels.all}</option>
                            <option value="1">{t.levels.l1}</option>
                            <option value="2">{t.levels.l2}</option>
                            <option value="3">{t.levels.l3}</option>
                        </select>
                        <Filter size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                </div>
            </div>

            {/* List Table — 与电价列表同款表格密度与行交互 */}
            <div className="ems-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-4">{t.cols.time}</th>
                                <th className="px-6 py-4">{t.cols.level}</th>
                                <th className="px-6 py-4">{t.cols.station}</th>
                                <th className="px-6 py-4">{t.cols.device}</th>
                                <th className="px-6 py-4">{t.cols.code}</th>
                                <th className="px-6 py-4">{t.cols.desc}</th>
                                <th className="px-6 py-4">{t.cols.status}</th>
                                <th className="px-6 py-4 text-right">{t.cols.action}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                            {filteredAlarms.map((alarm) => (
                                <tr
                                    key={alarm.id}
                                    className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                                >
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-bold text-slate-800 transition-colors group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-400">
                                                {alarm.time}
                                            </div>
                                            <div className="font-mono text-xs text-slate-400">{alarm.id}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{renderLevelBadge(alarm.level)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                            <MapPin size={14} className="shrink-0 text-slate-400" />
                                            <span className="font-bold text-slate-800 transition-colors group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-400">
                                                {alarm.station}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{alarm.device}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-600 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-400">
                                            {alarm.code}
                                        </span>
                                    </td>
                                    <td className="max-w-xs truncate px-6 py-4 text-slate-600 dark:text-slate-300" title={alarm.desc}>
                                        {alarm.desc}
                                    </td>
                                    <td className="px-6 py-4">{renderStatusBadge(alarm.status)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-60 transition-opacity group-hover:opacity-100">
                                            <button
                                                type="button"
                                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-apple-surface-secondary-dark"
                                                title={t.actions.view}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-apple-surface-secondary-dark"
                                                title={t.actions.ack}
                                            >
                                                <CheckCircle2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredAlarms.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-apple-surface-secondary-dark">
                            <Search className="text-slate-300 dark:text-slate-500" size={32} />
                        </div>
                        <p className="font-medium text-slate-500 dark:text-slate-400">{t.emptyTitle}</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t.emptyHint}</p>
                    </div>
                )}

                {filteredAlarms.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/30 px-6 py-4 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/30 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                            {t.footer.summary.split(/(\{filtered\}|\{total\})/).map((segment, i) => {
                                if (segment === '{filtered}')
                                    return (
                                        <span key={i} className="font-bold text-slate-800 dark:text-slate-200">
                                            {filteredAlarms.length}
                                        </span>
                                    );
                                if (segment === '{total}')
                                    return (
                                        <span key={i} className="font-bold text-slate-800 dark:text-slate-200">
                                            {alarms.length}
                                        </span>
                                    );
                                return <span key={i}>{segment}</span>;
                            })}
                        </div>
                        <div className="flex shrink-0 gap-2">
                            <button
                                type="button"
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                            >
                                {t.footer.prev}
                            </button>
                            <button
                                type="button"
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                            >
                                {t.footer.next}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaultAlarms;
