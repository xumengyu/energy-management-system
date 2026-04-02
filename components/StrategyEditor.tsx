import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Save, Plus, MinusCircle, Clock3, ChevronDown } from 'lucide-react';
import { Language, Theme } from '../types';

interface StrategyEditorProps {
    lang: Language;
    theme: Theme;
    onBack: () => void;
    onSave: (strategy: any) => void;
    initialData?: Partial<{
        name: string;
        enabled: boolean;
        year: string;
        selectedMonths: number[];
        selectedDays: number[];
        selectedBess: string[];
        powerCurve: Array<{
            id?: number;
            startTime?: string;
            endTime?: string;
            mode?: 'charge' | 'disch' | 'standby';
            power?: string | number;
        }>;
    }>;
    embedded?: boolean;
}

const StrategyEditor: React.FC<StrategyEditorProps> = ({
    lang,
    theme: _theme,
    onBack,
    onSave,
    initialData,
    embedded = false,
}) => {
    const labels = useMemo(
        () => ({
            createTitle: lang === 'zh' ? '创建策略' : 'Create New Strategy',
            name: lang === 'zh' ? '名称' : 'Name',
            namePlaceholder: lang === 'zh' ? '请输入策略名称' : 'Enter strategy name',
            save: lang === 'zh' ? '保存' : 'Save',
            cancel: lang === 'zh' ? '取消' : 'Cancel',
            enableStatus: lang === 'zh' ? '启用状态' : 'Enable Status',
            enableStrategy: lang === 'zh' ? '启用策略' : 'Enable Strategy',
            executionYear: lang === 'zh' ? '执行年份' : 'Execution Year',
            executionMonth: lang === 'zh' ? '执行月份' : 'Execution Month',
            executionDay: lang === 'zh' ? '执行日期' : 'Execution Day',
            bess: 'BESS',
            powerCurve: lang === 'zh' ? '功率曲线' : 'Power Curve',
            id: 'ID',
            startTime: lang === 'zh' ? '开始时间' : 'Start Time',
            endTime: lang === 'zh' ? '结束时间' : 'End Time',
            workingMode: lang === 'zh' ? '运行模式' : 'Working Mode',
            power: lang === 'zh' ? '功率' : 'Power',
            addNew: lang === 'zh' ? '新增' : 'Add New',
            charge: lang === 'zh' ? '充电' : 'Charge',
            disch: lang === 'zh' ? '放电' : 'Disch',
            standby: lang === 'zh' ? '待机' : 'Standby',
        }),
        [lang]
    );

    const [enabled, setEnabled] = useState(true);
    const [strategyName, setStrategyName] = useState('');
    const [year, setYear] = useState('');
    const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [selectedBess, setSelectedBess] = useState<string[]>([]);
    const [openTimePickerKey, setOpenTimePickerKey] = useState<string | null>(null);
    const [yearOpen, setYearOpen] = useState(false);
    const timePickerWrapRef = useRef<HTMLDivElement | null>(null);
    const yearSelectRef = useRef<HTMLDivElement | null>(null);

    type WorkingMode = 'charge' | 'disch' | 'standby';
    interface CurveRow {
        id: number;
        startTime: string;
        endTime: string;
        mode: WorkingMode;
        power: string;
    }

    const initialRows: CurveRow[] = Array.from({ length: 7 }, (_, idx) => ({
        id: idx + 1,
        startTime: '',
        endTime: '',
        mode: 'charge',
        power: '',
    }));
    const [curveRows, setCurveRows] = useState<CurveRow[]>(initialRows);

    useEffect(() => {
        if (!initialData) return;
        setStrategyName(initialData.name ?? '');
        setEnabled(initialData.enabled ?? true);
        setYear(initialData.year ?? '');
        setSelectedMonths(initialData.selectedMonths ?? []);
        setSelectedDays(initialData.selectedDays ?? []);
        setSelectedBess(initialData.selectedBess ?? []);
        if (initialData.powerCurve && initialData.powerCurve.length > 0) {
            setCurveRows(
                initialData.powerCurve.map((row, idx) => ({
                    id: idx + 1,
                    startTime: row.startTime ?? '',
                    endTime: row.endTime ?? '',
                    mode: row.mode ?? 'charge',
                    power: row.power != null ? String(row.power) : '',
                }))
            );
        } else {
            setCurveRows(initialRows);
        }
    }, [initialData]);

    const handleSave = () => {
        onSave({
            name: strategyName,
            enabled,
            year,
            selectedMonths,
            selectedDays,
            selectedBess,
            powerCurve: curveRows,
        });
    };

    const toggleSelect = <T,>(value: T, current: T[], setter: (v: T[]) => void) => {
        setter(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
    };

    const setCurveValue = <K extends keyof CurveRow>(index: number, key: K, value: CurveRow[K]) => {
        setCurveRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
    };

    const getTimePart = (value: string, part: 'hour' | 'minute') => {
        const [h = '00', m = '00'] = (value || '').split(':');
        return part === 'hour' ? h : m;
    };

    const setTimePart = (index: number, key: 'startTime' | 'endTime', part: 'hour' | 'minute', val: string) => {
        const current = curveRows[index][key] || '00:00';
        const hour = getTimePart(current, 'hour');
        const minute = getTimePart(current, 'minute');
        const next = part === 'hour' ? `${val}:${minute}` : `${hour}:${val}`;
        setCurveValue(index, key, next);
    };

    useEffect(() => {
        const onClickOutside = (event: MouseEvent) => {
            if (timePickerWrapRef.current && !timePickerWrapRef.current.contains(event.target as Node)) {
                setOpenTimePickerKey(null);
            }
            if (yearSelectRef.current && !yearSelectRef.current.contains(event.target as Node)) {
                setYearOpen(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const addCurveRow = () => {
        setCurveRows((prev) => [
            ...prev,
            { id: prev.length + 1, startTime: '', endTime: '', mode: 'charge', power: '' },
        ]);
    };

    const removeCurveRow = (index: number) => {
        setCurveRows((prev) =>
            prev
                .filter((_, i) => i !== index)
                .map((row, i) => ({
                    ...row,
                    id: i + 1,
                }))
        );
    };

    const monthLabels = lang === 'zh'
        ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const bessOptions = ['BESS', 'BESS2', 'BESS3'];
    const yearOptions = Array.from({ length: 11 }, (_, idx) => String(new Date().getFullYear() - 5 + idx));
    const pageDescription =
        lang === 'zh'
            ? '配置执行周期、储能对象与功率曲线参数'
            : 'Configure execution schedule, BESS targets and power curve settings';

    const sectionTitle = (title: string) => (
        <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
            <span className="w-1 h-3 bg-brand-500 rounded-full"></span>
            {title}
        </h3>
    );

    const inputClass =
        'w-full px-3 py-1.5 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-lg text-[13px] text-slate-700 dark:text-slate-200 outline-none transition-all focus:ring-2 focus:ring-brand-100';

    const chipClass = (selected: boolean) =>
        `h-8 rounded-lg border text-xs font-bold transition-all ${
            selected
                ? 'bg-[rgb(103,118,30)] border-[rgb(103,118,30)] text-white ring-1 ring-[rgb(103,118,30)]/25'
                : 'bg-white dark:bg-apple-surface-secondary-dark border-slate-200 dark:border-apple-border-dark text-slate-600 dark:text-slate-300 hover:border-brand-300 dark:hover:border-brand-700 hover:text-brand-600 dark:hover:text-brand-300'
        }`;

    return (
        <div className={`${embedded ? '' : 'max-w-7xl mx-auto'} p-3 md:p-4 animate-in slide-in-from-bottom-2 duration-300`}>
            {!embedded && (
                <div className="mb-4">
                    <h1 className="text-lg font-black text-slate-900 dark:text-white leading-none">
                        {labels.createTitle}
                    </h1>
                    <p className="text-[11px] text-slate-500 mt-1">{pageDescription}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-4 space-y-3">
                    <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-xl border border-slate-200 dark:border-apple-border-dark shadow-sm">
                        {sectionTitle(labels.name)}
                        <input
                            type="text"
                            value={strategyName}
                            onChange={(e) => setStrategyName(e.target.value)}
                            placeholder={labels.namePlaceholder}
                            className={inputClass}
                        />
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-apple-border-dark flex items-center justify-between gap-3">
                            <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                                {labels.enableStrategy}
                            </span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={enabled}
                                onClick={() => setEnabled((v) => !v)}
                                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                                    enabled
                                        ? 'bg-[rgb(103,118,30)]'
                                        : 'bg-slate-200 dark:bg-slate-600'
                                }`}
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                        enabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-xl border border-slate-200 dark:border-apple-border-dark shadow-sm">
                        {sectionTitle(labels.executionYear)}
                        <div className="relative" ref={yearSelectRef}>
                            <button
                                type="button"
                                onClick={() => setYearOpen((o) => !o)}
                                className={`${inputClass} w-full flex items-center justify-between gap-2 text-left cursor-pointer ${
                                    year
                                        ? 'border-[rgb(103,118,30)] text-[rgb(103,118,30)] dark:text-[rgb(164,178,92)]'
                                        : 'text-slate-500 dark:text-slate-400'
                                }`}
                            >
                                <span className="truncate">{year || (lang === 'zh' ? '选择年份' : 'Select year')}</span>
                                <ChevronDown
                                    size={16}
                                    className={`shrink-0 text-slate-400 transition-transform ${yearOpen ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {yearOpen && (
                                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-apple-border-dark bg-white dark:bg-apple-surface-dark shadow-lg py-1">
                                    {yearOptions.map((y) => (
                                        <button
                                            key={y}
                                            type="button"
                                            onClick={() => {
                                                setYear(y);
                                                setYearOpen(false);
                                            }}
                                            className={`w-full px-3 py-2 text-left text-[13px] transition-colors ${
                                                year === y
                                                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-bold'
                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark'
                                            }`}
                                        >
                                            {y}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-xl border border-slate-200 dark:border-apple-border-dark shadow-sm">
                        {sectionTitle(labels.executionMonth)}
                        <div className="grid grid-cols-6 gap-1.5">
                            {monthLabels.map((label, idx) => {
                                const value = idx + 1;
                                const selected = selectedMonths.includes(value);
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => toggleSelect(value, selectedMonths, setSelectedMonths)}
                                        className={chipClass(selected)}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-xl border border-slate-200 dark:border-apple-border-dark shadow-sm">
                        {sectionTitle(labels.executionDay)}
                        <div className="grid grid-cols-7 gap-1.5">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                                const selected = selectedDays.includes(day);
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleSelect(day, selectedDays, setSelectedDays)}
                                        className={chipClass(selected)}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-apple-surface-dark p-4 rounded-xl border border-slate-200 dark:border-apple-border-dark shadow-sm">
                        {sectionTitle(labels.bess)}
                        <div className="flex flex-wrap gap-2">
                            {bessOptions.map((option) => {
                                const selected = selectedBess.includes(option);
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => toggleSelect(option, selectedBess, setSelectedBess)}
                                        className={`px-3 ${chipClass(selected)}`}
                                    >
                                        {option}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>

                <div ref={timePickerWrapRef} className="lg:col-span-8 bg-white dark:bg-apple-surface-dark p-4 rounded-xl border border-slate-200 dark:border-apple-border-dark shadow-sm">
                    {sectionTitle(labels.powerCurve)}
                    <div className="border border-slate-200 dark:border-apple-border-dark rounded-lg overflow-visible">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-apple-surface-secondary-dark border-b border-slate-200 dark:border-apple-border-dark">
                                    <tr className="text-slate-600 dark:text-slate-300">
                                        <th className="px-3 py-2 text-left w-12">{labels.id}</th>
                                        <th className="px-3 py-2 text-left">{labels.startTime}</th>
                                        <th className="px-3 py-2 text-left">{labels.endTime}</th>
                                        <th className="px-3 py-2 text-left">{labels.workingMode}</th>
                                        <th className="px-3 py-2 text-left">{labels.power}</th>
                                        <th className="px-3 py-2 text-center w-12"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {curveRows.map((row, index) => (
                                        <tr key={row.id} className="border-b last:border-b-0 border-slate-100 dark:border-apple-border-dark">
                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{String(row.id).padStart(2, '0')}</td>
                                            <td className="px-3 py-2">
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenTimePickerKey(openTimePickerKey === `start-${index}` ? null : `start-${index}`)}
                                                        className="w-full h-8 px-2 rounded-xl border border-slate-200 dark:border-apple-border-dark bg-white dark:bg-apple-surface-secondary-dark text-slate-700 dark:text-slate-200 outline-none transition-all hover:border-brand-400 flex items-center justify-between"
                                                    >
                                                        <span>{row.startTime || '--:--'}</span>
                                                        <Clock3 size={14} className="text-slate-400" />
                                                    </button>
                                                    {openTimePickerKey === `start-${index}` && (
                                                        <div className="absolute top-full left-0 mt-1 z-30 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-2xl shadow-xl p-2 w-[220px]">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="max-h-40 overflow-auto space-y-1">
                                                                    {Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')).map((h) => (
                                                                        <button
                                                                            key={h}
                                                                            type="button"
                                                                            onClick={() => setTimePart(index, 'startTime', 'hour', h)}
                                                                            className={`w-full h-8 rounded-lg text-sm font-bold ${getTimePart(row.startTime, 'hour') === h ? 'bg-[rgb(103,118,30)] text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'}`}
                                                                        >
                                                                            {h}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <div className="max-h-40 overflow-auto space-y-1">
                                                                    {Array.from({ length: 60 }, (_, m) => String(m).padStart(2, '0')).map((m) => (
                                                                        <button
                                                                            key={m}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setTimePart(index, 'startTime', 'minute', m);
                                                                                setOpenTimePickerKey(null);
                                                                            }}
                                                                            className={`w-full h-8 rounded-lg text-sm font-bold ${getTimePart(row.startTime, 'minute') === m ? 'bg-[rgb(103,118,30)] text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'}`}
                                                                        >
                                                                            {m}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenTimePickerKey(openTimePickerKey === `end-${index}` ? null : `end-${index}`)}
                                                        className="w-full h-8 px-2 rounded-xl border border-slate-200 dark:border-apple-border-dark bg-white dark:bg-apple-surface-secondary-dark text-slate-700 dark:text-slate-200 outline-none transition-all hover:border-brand-400 flex items-center justify-between"
                                                    >
                                                        <span>{row.endTime || '--:--'}</span>
                                                        <Clock3 size={14} className="text-slate-400" />
                                                    </button>
                                                    {openTimePickerKey === `end-${index}` && (
                                                        <div className="absolute top-full left-0 mt-1 z-30 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark rounded-2xl shadow-xl p-2 w-[220px]">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="max-h-40 overflow-auto space-y-1">
                                                                    {Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')).map((h) => (
                                                                        <button
                                                                            key={h}
                                                                            type="button"
                                                                            onClick={() => setTimePart(index, 'endTime', 'hour', h)}
                                                                            className={`w-full h-8 rounded-lg text-sm font-bold ${getTimePart(row.endTime, 'hour') === h ? 'bg-[rgb(103,118,30)] text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'}`}
                                                                        >
                                                                            {h}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                                <div className="max-h-40 overflow-auto space-y-1">
                                                                    {Array.from({ length: 60 }, (_, m) => String(m).padStart(2, '0')).map((m) => (
                                                                        <button
                                                                            key={m}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setTimePart(index, 'endTime', 'minute', m);
                                                                                setOpenTimePickerKey(null);
                                                                            }}
                                                                            className={`w-full h-8 rounded-lg text-sm font-bold ${getTimePart(row.endTime, 'minute') === m ? 'bg-[rgb(103,118,30)] text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark'}`}
                                                                        >
                                                                            {m}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="inline-flex rounded-lg border border-slate-200 dark:border-apple-border-dark overflow-hidden">
                                                    {(['charge', 'disch', 'standby'] as WorkingMode[]).map((mode) => {
                                                        const active = row.mode === mode;
                                                        const modeLabel = mode === 'charge' ? labels.charge : mode === 'disch' ? labels.disch : labels.standby;
                                                        return (
                                                            <button
                                                                key={mode}
                                                                type="button"
                                                                onClick={() => setCurveValue(index, 'mode', mode)}
                                                                className={`h-8 px-3 text-xs font-bold border-r last:border-r-0 border-slate-200 dark:border-apple-border-dark transition-colors ${
                                                                    active
                                                                        ? 'bg-[rgb(103,118,30)] text-white'
                                                                        : 'bg-white dark:bg-apple-surface-secondary-dark text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark'
                                                                }`}
                                                            >
                                                                {modeLabel}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={row.power}
                                                        onChange={(e) => setCurveValue(index, 'power', e.target.value)}
                                                        className="w-full h-8 pl-2 pr-10 rounded-lg border border-slate-200 dark:border-apple-border-dark bg-white dark:bg-apple-surface-secondary-dark text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-100 transition-all"
                                                    />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">kW</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeCurveRow(index)}
                                                    className="text-slate-500 hover:text-rose-500 transition-colors"
                                                    disabled={curveRows.length <= 1}
                                                >
                                                    <MinusCircle size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                    </div>

                    <button
                        type="button"
                        onClick={addCurveRow}
                        className="w-full mt-4 h-10 border border-dashed border-slate-300 dark:border-apple-border-dark rounded-lg text-slate-600 dark:text-slate-300 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark transition-all"
                    >
                        <Plus size={16} />
                        {labels.addNew}
                    </button>
                </div>
            </div>

            <div className="flex justify-end gap-2 pb-8 pt-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-1.5 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-apple-surface-dark border border-slate-200 dark:border-apple-border-dark hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark transition-all"
                >
                    {labels.cancel}
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-1.5 rounded-lg text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                >
                    <Save size={14} />
                    {labels.save}
                </button>
            </div>
        </div>
    );
};

export default StrategyEditor;
