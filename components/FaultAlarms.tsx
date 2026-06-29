import React, { useMemo, useState } from 'react';
import {
    AlertTriangle, Calendar, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
    Clock3, Eye, Filter, Info, MapPin, Search, XCircle
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

type AlarmStatus = 'Active' | 'Recovered';
type TabId = 'details' | 'heatmap';
type HeatmapMode = 'today' | 'fifteenDays';

interface AlarmRecord {
    id: string;
    time: string;
    station: string;
    device: string;
    code: string;
    desc: string;
    level: number;
    status: AlarmStatus;
}

interface StationAlarmGroup {
    station: string;
    alarms: AlarmRecord[];
    activeCount: number;
    recoveredCount: number;
    maxLevel: number;
    latestTime: string;
}

interface FaultAlarmsProps {
    lang: Language;
    theme: Theme;
    selectedStation?: string;
}

const LABELS = {
    en: {
        tabs: { details: 'Alarm details', heatmap: 'Heatmap' },
        groups: {
            title: 'Alarms by Station',
            subtitle: 'Grouped for faster station-level triage',
            expandAll: 'Expand all',
            collapseAll: 'Collapse all',
            alarms: 'alarms',
            active: 'active',
            recovered: 'recovered',
            latest: 'Latest',
            highest: 'Highest',
        },
        heatmap: {
            title: 'Alarm Heatmap',
            subtitle: 'Cells show alarm count. Use the mode switch to compare today by hour or the last 15 days by date.',
            today: 'Today',
            fifteenDays: '15 days',
            station: 'Station',
            selected: 'Selected cell',
            none: 'No cell selected',
            alarms: 'alarms',
        },
    },
    zh: {
        tabs: { details: '告警明细', heatmap: '告警热力图' },
        groups: {
            title: '按电站查看告警',
            subtitle: '先定位电站，再展开查看设备与告警明细',
            expandAll: '展开全部',
            collapseAll: '折叠全部',
            alarms: '条告警',
            active: '未恢复',
            recovered: '已恢复',
            latest: '最新',
            highest: '最高',
        },
        heatmap: {
            title: '告警热力图',
            subtitle: '单元格只显示告警数量，可切换“今天按小时”或“近 15 天按日期”。',
            today: '今天',
            fifteenDays: '15天',
            station: '电站',
            selected: '当前单元格',
            none: '未选择单元格',
            alarms: '条告警',
        },
    },
    fr: {
        tabs: { details: 'Alarm details', heatmap: 'Heatmap' },
        groups: {
            title: 'Alarms by Station',
            subtitle: 'Grouped for faster station-level triage',
            expandAll: 'Expand all',
            collapseAll: 'Collapse all',
            alarms: 'alarms',
            active: 'active',
            recovered: 'recovered',
            latest: 'Latest',
            highest: 'Highest',
        },
        heatmap: {
            title: 'Alarm Heatmap',
            subtitle: 'Cells show alarm count. Use the mode switch to compare today by hour or the last 15 days by date.',
            today: 'Today',
            fifteenDays: '15 days',
            station: 'Station',
            selected: 'Selected cell',
            none: 'No cell selected',
            alarms: 'alarms',
        },
    },
};

const ALARMS_ZH: AlarmRecord[] = [
    { id: 'ALM-001', time: '2025-09-16 14:23:10', station: '站点 #2 (微网 A)', device: 'PCS-01', code: 'E-304', desc: '直流侧过压保护触发', level: 3, status: 'Active' },
    { id: 'ALM-008', time: '2025-09-16 14:23:34', station: '站点 #2 (微网 A)', device: 'BMS-Cluster-1', code: 'E-312', desc: '簇电压采样异常', level: 2, status: 'Active' },
    { id: 'ALM-009', time: '2025-09-16 14:24:06', station: '站点 #2 (微网 A)', device: 'Meter-Main', code: 'W-209', desc: '功率计量波动', level: 2, status: 'Active' },
    { id: 'ALM-002', time: '2025-09-16 13:45:00', station: '站点 #5 (工业园)', device: 'BMS-Cluster-2', code: 'W-102', desc: '单体电池温度偏高', level: 2, status: 'Active' },
    { id: 'ALM-010', time: '2025-09-16 13:51:28', station: '站点 #5 (工业园)', device: 'PCS-02', code: 'W-105', desc: '风扇转速异常', level: 2, status: 'Active' },
    { id: 'ALM-003', time: '2025-09-16 12:30:45', station: '站点 #1 (总站)', device: 'Meter-Main', code: 'I-005', desc: '通讯连接闪断', level: 1, status: 'Recovered' },
    { id: 'ALM-011', time: '2025-09-16 12:31:12', station: '站点 #1 (总站)', device: 'EMS-Controller', code: 'I-006', desc: '数据刷新延迟', level: 1, status: 'Recovered' },
    { id: 'ALM-004', time: '2025-09-16 10:15:22', station: '站点 #8 (办公楼)', device: 'EMS-Controller', code: 'W-201', desc: 'CPU 负载率 > 85%', level: 2, status: 'Recovered' },
    { id: 'ALM-005', time: '2025-09-16 09:00:00', station: '站点 #2 (微网 A)', device: 'Inv-02', code: 'E-501', desc: '电网频率异常', level: 3, status: 'Recovered' },
    { id: 'ALM-006', time: '2025-09-15 23:10:11', station: '站点 #9 (数据中心)', device: 'AirCon-03', code: 'I-101', desc: '设备运行时间提醒', level: 1, status: 'Recovered' },
    { id: 'ALM-007', time: '2025-09-15 18:20:33', station: '站点 #5 (工业园)', device: 'PCS-02', code: 'W-105', desc: '风扇转速异常', level: 2, status: 'Active' },
    { id: 'ALM-012', time: '2025-09-14 16:02:10', station: '站点 #8 (办公楼)', device: 'Meter-Branch-2', code: 'I-022', desc: '支路电表数据延迟', level: 1, status: 'Recovered' },
    { id: 'ALM-013', time: '2025-09-13 08:42:05', station: '站点 #1 (总站)', device: 'EMS-Gateway', code: 'W-211', desc: '网关链路质量偏低', level: 2, status: 'Recovered' },
    { id: 'ALM-014', time: '2025-09-12 20:18:43', station: '站点 #9 (数据中心)', device: 'AirCon-02', code: 'W-330', desc: '制冷效率下降', level: 2, status: 'Recovered' },
    { id: 'ALM-015', time: '2025-09-11 11:35:18', station: '站点 #2 (微网 A)', device: 'BMS-Cluster-3', code: 'I-116', desc: 'SOC 校准提醒', level: 1, status: 'Recovered' },
    { id: 'ALM-016', time: '2025-09-10 06:15:31', station: '站点 #5 (工业园)', device: 'PCS-02', code: 'W-108', desc: '逆变器温度波动', level: 2, status: 'Recovered' },
];

const ALARMS_EN: AlarmRecord[] = [
    { id: 'ALM-001', time: '2025-09-16 14:23:10', station: 'Station #2 (Microgrid A)', device: 'PCS-01', code: 'E-304', desc: 'DC Side Overvoltage Protection', level: 3, status: 'Active' },
    { id: 'ALM-008', time: '2025-09-16 14:23:34', station: 'Station #2 (Microgrid A)', device: 'BMS-Cluster-1', code: 'E-312', desc: 'Cluster Voltage Sampling Abnormal', level: 2, status: 'Active' },
    { id: 'ALM-009', time: '2025-09-16 14:24:06', station: 'Station #2 (Microgrid A)', device: 'Meter-Main', code: 'W-209', desc: 'Power Metering Fluctuation', level: 2, status: 'Active' },
    { id: 'ALM-002', time: '2025-09-16 13:45:00', station: 'Station #5 (Ind. Park)', device: 'BMS-Cluster-2', code: 'W-102', desc: 'Cell Temperature High', level: 2, status: 'Active' },
    { id: 'ALM-010', time: '2025-09-16 13:51:28', station: 'Station #5 (Ind. Park)', device: 'PCS-02', code: 'W-105', desc: 'Fan Speed Abnormal', level: 2, status: 'Active' },
    { id: 'ALM-003', time: '2025-09-16 12:30:45', station: 'Station #1 (Main)', device: 'Meter-Main', code: 'I-005', desc: 'Comm. Connection Intermittent', level: 1, status: 'Recovered' },
    { id: 'ALM-011', time: '2025-09-16 12:31:12', station: 'Station #1 (Main)', device: 'EMS-Controller', code: 'I-006', desc: 'Data Refresh Delay', level: 1, status: 'Recovered' },
    { id: 'ALM-004', time: '2025-09-16 10:15:22', station: 'Station #8 (Office)', device: 'EMS-Controller', code: 'W-201', desc: 'CPU Load > 85%', level: 2, status: 'Recovered' },
    { id: 'ALM-005', time: '2025-09-16 09:00:00', station: 'Station #2 (Microgrid A)', device: 'Inv-02', code: 'E-501', desc: 'Grid Frequency Abnormal', level: 3, status: 'Recovered' },
    { id: 'ALM-006', time: '2025-09-15 23:10:11', station: 'Station #9 (Data Center)', device: 'AirCon-03', code: 'I-101', desc: 'Runtime Reminder', level: 1, status: 'Recovered' },
    { id: 'ALM-007', time: '2025-09-15 18:20:33', station: 'Station #5 (Ind. Park)', device: 'PCS-02', code: 'W-105', desc: 'Fan Speed Abnormal', level: 2, status: 'Active' },
    { id: 'ALM-012', time: '2025-09-14 16:02:10', station: 'Station #8 (Office)', device: 'Meter-Branch-2', code: 'I-022', desc: 'Branch Meter Data Delay', level: 1, status: 'Recovered' },
    { id: 'ALM-013', time: '2025-09-13 08:42:05', station: 'Station #1 (Main)', device: 'EMS-Gateway', code: 'W-211', desc: 'Gateway Link Quality Low', level: 2, status: 'Recovered' },
    { id: 'ALM-014', time: '2025-09-12 20:18:43', station: 'Station #9 (Data Center)', device: 'AirCon-02', code: 'W-330', desc: 'Cooling Efficiency Reduced', level: 2, status: 'Recovered' },
    { id: 'ALM-015', time: '2025-09-11 11:35:18', station: 'Station #2 (Microgrid A)', device: 'BMS-Cluster-3', code: 'I-116', desc: 'SOC Calibration Reminder', level: 1, status: 'Recovered' },
    { id: 'ALM-016', time: '2025-09-10 06:15:31', station: 'Station #5 (Ind. Park)', device: 'PCS-02', code: 'W-108', desc: 'Inverter Temperature Fluctuation', level: 2, status: 'Recovered' },
];

const TODAY = '2025-09-16';
const HEATMAP_HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
const HEATMAP_DAYS = [
    '2025-09-02', '2025-09-03', '2025-09-04', '2025-09-05', '2025-09-06',
    '2025-09-07', '2025-09-08', '2025-09-09', '2025-09-10', '2025-09-11',
    '2025-09-12', '2025-09-13', '2025-09-14', '2025-09-15', '2025-09-16',
];

const getStationNumberToken = (stationName?: string) => stationName?.match(/#\d+/)?.[0].toLowerCase() || '';

const FaultAlarms: React.FC<FaultAlarmsProps> = ({ lang, selectedStation = '' }) => {
    const t = translations[lang].faultAlarms;
    const ui = LABELS[lang] || LABELS.en;
    const [activeTab, setActiveTab] = useState<TabId>('details');
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('Active');
    const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('today');
    const [heatmapSelection, setHeatmapSelection] = useState<{ station: string; bucket: string } | null>(null);
    const [expandedStations, setExpandedStations] = useState<string[]>(() => {
        const initialAlarms = lang === 'zh' ? ALARMS_ZH : ALARMS_EN;
        return Array.from(new Set(initialAlarms.filter((alarm) => alarm.status === 'Active').map((alarm) => alarm.station)));
    });

    const [dateRange, setDateRange] = useState({ start: '2025-09-10', end: '2025-09-16' });
    const [isDateOpen, setIsDateOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date('2025-09-16'));
    const [tempSelection, setTempSelection] = useState<{ start: string | null; end: string | null }>({ start: '2025-09-10', end: '2025-09-16' });

    const alarms = lang === 'zh' ? ALARMS_ZH : ALARMS_EN;
    const selectedStationToken = getStationNumberToken(selectedStation);

    const filteredAlarms = useMemo(() => {
        return alarms.filter(alarm => {
            const normalizedSearch = searchTerm.toLowerCase();
            const matchesSearch =
                alarm.station.toLowerCase().includes(normalizedSearch) ||
                alarm.device.toLowerCase().includes(normalizedSearch) ||
                alarm.code.toLowerCase().includes(normalizedSearch) ||
                alarm.desc.toLowerCase().includes(normalizedSearch);

            const matchesLevel = levelFilter === 'all' || alarm.level.toString() === levelFilter;
            const matchesStatus = statusFilter === 'all' || alarm.status === statusFilter;
            const matchesStation = !selectedStationToken || alarm.station.toLowerCase().includes(selectedStationToken);
            const alarmDate = alarm.time.split(' ')[0];
            const matchesDate = alarmDate >= dateRange.start && alarmDate <= dateRange.end;

            return matchesSearch && matchesLevel && matchesStatus && matchesStation && matchesDate;
        });
    }, [alarms, dateRange.end, dateRange.start, levelFilter, searchTerm, selectedStationToken, statusFilter]);

    const stationGroups = useMemo<StationAlarmGroup[]>(() => {
        const grouped = filteredAlarms.reduce<Record<string, AlarmRecord[]>>((acc, alarm) => {
            if (!acc[alarm.station]) acc[alarm.station] = [];
            acc[alarm.station].push(alarm);
            return acc;
        }, {});

        return (Object.entries(grouped) as Array<[string, AlarmRecord[]]>)
            .map(([station, stationAlarms]) => {
                const sorted = [...stationAlarms].sort((a, b) => b.time.localeCompare(a.time));
                return {
                    station,
                    alarms: sorted,
                    activeCount: sorted.filter((alarm) => alarm.status === 'Active').length,
                    recoveredCount: sorted.filter((alarm) => alarm.status === 'Recovered').length,
                    maxLevel: Math.max(...sorted.map((alarm) => alarm.level)),
                    latestTime: sorted[0]?.time || '',
                };
            })
            .sort((a, b) => b.activeCount - a.activeCount || b.maxLevel - a.maxLevel || b.latestTime.localeCompare(a.latestTime));
    }, [filteredAlarms]);

    const heatmapStations = useMemo(() => Array.from(new Set(alarms.map((alarm) => alarm.station))).sort(), [alarms]);
    const heatmapBuckets = heatmapMode === 'today' ? HEATMAP_HOURS : HEATMAP_DAYS;
    const selectedHeatmapAlarms = useMemo(() => {
        if (!heatmapSelection) return [];
        return alarms.filter((alarm) => {
            if (alarm.station !== heatmapSelection.station) return false;
            if (heatmapMode === 'today') {
                return alarm.time.startsWith(TODAY) && alarm.time.slice(11, 13) === heatmapSelection.bucket.slice(0, 2);
            }
            return alarm.time.startsWith(heatmapSelection.bucket);
        });
    }, [alarms, heatmapMode, heatmapSelection]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
    const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    const handleDateClick = (day: number) => {
        const clickedDateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (!tempSelection.start || (tempSelection.start && tempSelection.end)) {
            setTempSelection({ start: clickedDateStr, end: null });
        } else if (clickedDateStr < tempSelection.start) {
            setTempSelection({ start: clickedDateStr, end: tempSelection.start });
        } else {
            setTempSelection({ ...tempSelection, end: clickedDateStr });
        }
    };

    const applyDateSelection = () => {
        if (tempSelection.start) {
            setDateRange({ start: tempSelection.start, end: tempSelection.end || tempSelection.start });
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

    const getBucketLabel = (bucket: string) => heatmapMode === 'today' ? bucket.slice(0, 2) : bucket.slice(5);

    const getHeatmapCount = (station: string, bucket: string) => {
        return alarms.filter((alarm) => {
            if (alarm.station !== station) return false;
            if (heatmapMode === 'today') {
                return alarm.time.startsWith(TODAY) && alarm.time.slice(11, 13) === bucket.slice(0, 2);
            }
            return alarm.time.startsWith(bucket);
        }).length;
    };

    const getHeatmapClass = (count: number) => {
        if (count >= 3) return 'bg-red-500 text-white hover:bg-red-600';
        if (count === 2) return 'bg-amber-400 text-slate-950 hover:bg-amber-500';
        if (count === 1) return 'bg-brand-200 text-brand-900 hover:bg-brand-300 dark:bg-brand-800 dark:text-brand-100';
        return 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-apple-surface-secondary-dark dark:text-slate-500 dark:hover:bg-slate-700';
    };

    const toggleStation = (station: string) => {
        setExpandedStations((prev) => (
            prev.includes(station) ? prev.filter((item) => item !== station) : [...prev, station]
        ));
    };

    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
        const startDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
        const days = [];

        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8" />);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const selected = isSelected(d);
            const inRange = isInRange(d);
            days.push(
                <button
                    key={d}
                    onClick={() => handleDateClick(d)}
                    className={`relative h-8 w-full rounded-lg text-xs font-bold transition-all ${
                        selected
                            ? 'z-10 bg-brand-500 text-white'
                            : inRange
                                ? 'rounded-none bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-apple-surface-secondary-dark'
                    } ${d === 1 && inRange ? 'rounded-l-lg' : ''} ${d === daysInMonth && inRange ? 'rounded-r-lg' : ''}`}
                >
                    {d}
                </button>
            );
        }

        return (
            <div className="w-[320px] p-4">
                <div className="mb-4 flex items-center justify-between">
                    <button onClick={handlePrevMonth} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark"><ChevronLeft size={16} /></button>
                    <div className="text-base font-bold text-slate-800 dark:text-white">
                        {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <button onClick={handleNextMonth} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark"><ChevronRight size={16} /></button>
                </div>

                <div className="mb-2 grid grid-cols-7 text-center">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <div key={d} className="text-xs font-bold uppercase text-slate-400">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1">{days}</div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-apple-border-dark">
                    <div className="text-xs text-slate-400">
                        {tempSelection.start ? <span>{tempSelection.start} {tempSelection.end ? `→ ${tempSelection.end}` : ''}</span> : 'Select range'}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsDateOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark">
                            Cancel
                        </button>
                        <button onClick={applyDateSelection} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-700">
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        );
    };

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

    const renderStatusBadge = (status: AlarmStatus) => {
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

    const renderToolbar = () => (
        <div className="ems-card mb-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex w-full shrink-0 gap-1 overflow-x-auto lg:w-auto">
                    {([
                        { id: 'details', label: ui.tabs.details, icon: AlertTriangle },
                        { id: 'heatmap', label: ui.tabs.heatmap, icon: Clock3 },
                    ] as const).map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition-all ${
                                    active
                                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/45 dark:text-brand-300'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-slate-100'
                                }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-end lg:gap-2 lg:overflow-x-auto">
                    <div className="relative min-w-[210px] lg:w-56">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t.search}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-100 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:focus:ring-blue-900"
                        />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {([
                            { id: 'Active' as const, label: t.status.active },
                            { id: 'Recovered' as const, label: t.status.recovered },
                            { id: 'all' as const, label: t.status.all },
                        ]).map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setStatusFilter(item.id)}
                                className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                                    statusFilter === item.id
                                        ? 'border-slate-800 bg-slate-800 text-white dark:border-white dark:bg-white dark:text-slate-900'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-400 dark:hover:border-white/15'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsDateOpen(!isDateOpen)}
                            className={`group flex min-w-[220px] items-center justify-between gap-3 rounded-xl border bg-white px-4 py-2 text-sm font-bold transition-all dark:bg-apple-surface-dark ${
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
                            <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform duration-300 ${isDateOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDateOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setIsDateOpen(false)} />
                                <div className="absolute right-0 top-full z-40 mt-2 animate-in rounded-2xl border border-slate-200 bg-white duration-100 zoom-in-95 dark:border-apple-border-dark dark:bg-apple-surface-dark">
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
        </div>
    );

    const renderGroupedAlarmDetails = () => {
        const stationNames = stationGroups.map((group) => group.station);
        return (
            <div className="ems-card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-apple-border-dark md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-base font-black text-slate-900 dark:text-white">{ui.groups.title}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{ui.groups.subtitle}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setExpandedStations(stationNames)}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                        >
                            {ui.groups.expandAll}
                        </button>
                        <button
                            type="button"
                            onClick={() => setExpandedStations([])}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                        >
                            {ui.groups.collapseAll}
                        </button>
                    </div>
                </div>

                {stationGroups.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-apple-surface-secondary-dark">
                            <Search className="text-slate-300 dark:text-slate-500" size={32} />
                        </div>
                        <p className="font-medium text-slate-500 dark:text-slate-400">{t.emptyTitle}</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t.emptyHint}</p>
                    </div>
                )}

                <div className="divide-y divide-slate-100 dark:divide-white/10">
                    {stationGroups.map((group) => {
                        const expanded = expandedStations.includes(group.station);
                        return (
                            <div key={group.station}>
                                <button
                                    type="button"
                                    onClick={() => toggleStation(group.station)}
                                    className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark/60"
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-apple-surface-secondary-dark dark:text-slate-300">
                                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </div>
                                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <MapPin size={14} className="shrink-0 text-slate-400" />
                                            <span className="truncate font-black text-slate-900 dark:text-white">{group.station}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span>{group.alarms.length} {ui.groups.alarms}</span>
                                            <span>{group.activeCount} {ui.groups.active}</span>
                                            <span>{group.recoveredCount} {ui.groups.recovered}</span>
                                            <span>{ui.groups.latest}: {group.latestTime}</span>
                                        </div>
                                    </div>
                                    <div className="hidden shrink-0 items-center gap-2 sm:flex">
                                        <span className="text-xs font-bold text-slate-400">{ui.groups.highest}</span>
                                        {renderLevelBadge(group.maxLevel)}
                                    </div>
                                </button>

                                {expanded && (
                                    <div className="overflow-x-auto border-t border-slate-100 bg-slate-50/40 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/20">
                                        <table className="w-full min-w-[940px] text-left text-sm">
                                            <thead className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                <tr>
                                                    <th className="px-6 py-3">{t.cols.time}</th>
                                                    <th className="px-6 py-3">{t.cols.level}</th>
                                                    <th className="px-6 py-3">{t.cols.device}</th>
                                                    <th className="px-6 py-3">{t.cols.code}</th>
                                                    <th className="px-6 py-3">{t.cols.desc}</th>
                                                    <th className="px-6 py-3">{t.cols.status}</th>
                                                    <th className="px-6 py-3 text-right">{t.cols.action}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white dark:divide-white/10 dark:bg-apple-surface-dark">
                                                {group.alarms.map((alarm) => (
                                                    <tr key={alarm.id} className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                                                        <td className="px-6 py-3">
                                                            <div className="font-bold text-slate-800 dark:text-slate-200">{alarm.time}</div>
                                                            <div className="font-mono text-xs text-slate-400">{alarm.id}</div>
                                                        </td>
                                                        <td className="px-6 py-3">{renderLevelBadge(alarm.level)}</td>
                                                        <td className="px-6 py-3 font-medium text-slate-600 dark:text-slate-300">{alarm.device}</td>
                                                        <td className="px-6 py-3">
                                                            <span className="inline-flex items-center rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-600 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-400">{alarm.code}</span>
                                                        </td>
                                                        <td className="max-w-xs truncate px-6 py-3 text-slate-600 dark:text-slate-300" title={alarm.desc}>{alarm.desc}</td>
                                                        <td className="px-6 py-3">{renderStatusBadge(alarm.status)}</td>
                                                        <td className="px-6 py-3 text-right">
                                                            <button type="button" className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-apple-surface-secondary-dark" title={t.actions.view}>
                                                                <Eye size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {filteredAlarms.length > 0 && (
                    <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-4 text-sm text-slate-500 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/30 dark:text-slate-400">
                        {t.footer.summary.split(/(\{filtered\}|\{total\})/).map((segment, i) => {
                            if (segment === '{filtered}') return <span key={i} className="font-bold text-slate-800 dark:text-slate-200">{filteredAlarms.length}</span>;
                            if (segment === '{total}') return <span key={i} className="font-bold text-slate-800 dark:text-slate-200">{alarms.length}</span>;
                            return <span key={i}>{segment}</span>;
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderHeatmap = () => (
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <div className="ems-card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-apple-border-dark md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-base font-black text-slate-900 dark:text-white">{ui.heatmap.title}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{ui.heatmap.subtitle}</p>
                    </div>
                    <div className="ems-segmented w-fit">
                        {([
                            { id: 'today' as const, label: ui.heatmap.today },
                            { id: 'fifteenDays' as const, label: ui.heatmap.fifteenDays },
                        ]).map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    setHeatmapMode(item.id);
                                    setHeatmapSelection(null);
                                }}
                                className={`min-h-8 rounded-md px-3 text-sm font-bold transition-colors ${
                                    heatmapMode === item.id
                                        ? 'bg-white text-slate-900 dark:bg-apple-surface-dark dark:text-white'
                                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="max-h-[560px] overflow-auto p-4">
                    <div className="min-w-max">
                        <div
                            className="grid items-center gap-1"
                            style={{ gridTemplateColumns: `168px repeat(${heatmapBuckets.length}, 42px)` }}
                        >
                            <div className="sticky left-0 z-20 bg-white pr-2 text-xs font-bold uppercase text-slate-400 dark:bg-apple-surface-dark">
                                {ui.heatmap.station}
                            </div>
                            {heatmapBuckets.map((bucket) => (
                                <div key={bucket} className="sticky top-0 z-10 bg-white py-1 text-center font-mono text-[11px] font-bold text-slate-500 dark:bg-apple-surface-dark dark:text-slate-400">
                                    {getBucketLabel(bucket)}
                                </div>
                            ))}

                            {heatmapStations.map((station) => (
                                <React.Fragment key={station}>
                                    <div className="sticky left-0 z-10 flex h-8 min-w-0 items-center gap-1.5 bg-white pr-2 text-xs font-bold text-slate-700 dark:bg-apple-surface-dark dark:text-slate-200">
                                        <MapPin size={12} className="shrink-0 text-slate-400" />
                                        <span className="truncate">{station}</span>
                                    </div>
                                    {heatmapBuckets.map((bucket) => {
                                        const count = getHeatmapCount(station, bucket);
                                        const selected = heatmapSelection?.station === station && heatmapSelection.bucket === bucket;
                                        return (
                                            <button
                                                key={`${station}-${bucket}`}
                                                type="button"
                                                aria-label={`${station} ${bucket} ${count}`}
                                                onClick={() => setHeatmapSelection({ station, bucket })}
                                                className={`flex h-8 w-[42px] items-center justify-center rounded border text-xs font-black transition-all ${getHeatmapClass(count)} ${selected ? 'border-slate-950 ring-2 ring-slate-300 dark:border-white dark:ring-white/20' : 'border-transparent'}`}
                                            >
                                                {count}
                                            </button>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="ems-card p-5">
                <div className="mb-4">
                    <div className="text-sm font-black text-slate-900 dark:text-white">{ui.heatmap.selected}</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {heatmapSelection ? `${heatmapSelection.station} / ${getBucketLabel(heatmapSelection.bucket)}` : ui.heatmap.none}
                    </div>
                </div>

                {selectedHeatmapAlarms.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-apple-border-dark dark:text-slate-400">
                        {ui.heatmap.none}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {selectedHeatmapAlarms.length}
                            <span className="ml-2 text-sm font-bold text-slate-400">{ui.heatmap.alarms}</span>
                        </div>
                        {selectedHeatmapAlarms.map((alarm) => (
                            <div key={alarm.id} className="rounded-lg border border-slate-200 p-3 dark:border-apple-border-dark">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-xs font-bold text-slate-400">{alarm.time}</span>
                                    {renderLevelBadge(alarm.level)}
                                </div>
                                <div className="mt-2 font-bold text-slate-900 dark:text-white">{alarm.device} / {alarm.code}</div>
                                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{alarm.desc}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="ems-page-shell">
            {renderToolbar()}
            {activeTab === 'details' && renderGroupedAlarmDetails()}
            {activeTab === 'heatmap' && renderHeatmap()}
        </div>
    );
};

export default FaultAlarms;
