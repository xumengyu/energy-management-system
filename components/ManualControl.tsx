import React, { useEffect, useRef, useState } from 'react';
import { 
    X,
    PowerCircle,
    PowerOff,
    PlugZap,
    Unplug,
    Battery,
    CircuitBoard,
    RotateCcw,
    AirVent,
    Send,
    Loader2,
    CheckCircle2,
    Binary,
    Droplets,
    Fuel,
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

interface ManualControlProps {
    lang: Language;
    theme: Theme;
    selectedStation: string;
}

type ControlCategory = 'dido' | 'ats' | 'diesel' | 'ac' | 'bessPv';

type BessActionKey = 'pcs' | 'bms' | 'ioControl' | 'dehumidifier' | 'ac';

type BessPanelKey = 'bess1' | 'bess2' | 'bess3' | 'bess4';

const BESS_CARD_LAYOUT: { panelKey: BessPanelKey; actions: BessActionKey[] }[] = [
    { panelKey: 'bess1', actions: ['pcs', 'bms', 'ioControl', 'ac'] },
    { panelKey: 'bess2', actions: ['pcs', 'bms', 'ioControl', 'dehumidifier', 'ac'] },
    { panelKey: 'bess3', actions: ['pcs', 'bms', 'ioControl', 'dehumidifier', 'ac'] },
    { panelKey: 'bess4', actions: ['pcs', 'bms', 'ioControl', 'dehumidifier', 'ac'] },
];

const CATEGORY_ORDER: ControlCategory[] = ['bessPv', 'dido', 'ats', 'diesel', 'ac'];

/** 与全局主按钮一致（brand + 圆角 + 阴影） */
const btnFaultReset =
    'inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-500 active:scale-[0.98] dark:bg-brand-600 dark:hover:bg-brand-500';

/** 空调下发成功态（与品牌主按钮同尺寸） */
const btnAcDispatchSuccess =
    'inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all dark:bg-emerald-600';

/** PCS 抽屉：关机 — 实色警示 */
const btnPowerOff =
    'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-rose-700 active:scale-[0.98] dark:bg-rose-600 dark:hover:bg-rose-500';

/** PCS 抽屉：开机 — 实色品牌主色 */
const btnPowerOn =
    'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-500 active:scale-[0.98] dark:bg-brand-600 dark:hover:bg-brand-500';

/** PCS 抽屉：并网 — 品牌色 */
const btnGridConnect =
    'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-500 active:scale-[0.98] dark:bg-brand-600 dark:hover:bg-brand-500';

/** PCS 抽屉：离网 — 黑色 */
const btnGridIsland =
    'inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white';

/** 柴发侧拉：启动 / 允许并网 — 绿色 */
const btnDgGreen =
    'inline-flex min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-[0.98] dark:bg-emerald-600 dark:hover:bg-emerald-500';
/** 柴发侧拉：停止 / 断开并网 — 红色 */
const btnDgRed =
    'inline-flex min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-rose-700 active:scale-[0.98] dark:bg-rose-600 dark:hover:bg-rose-500';
/** 柴发侧拉：紧急停机 — 琥珀色 */
const btnDgAmber =
    'inline-flex min-w-[8.5rem] flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-3 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-amber-400 active:scale-[0.98] dark:bg-amber-500 dark:hover:bg-amber-400';

const DRAWER_DISPATCH_MS = 1500;

/** 侧拉内操作：点击后短时「下发中」，期间同抽屉内其它操作按钮禁用 */
function useDrawerDispatchBusy(open: boolean, scopeKey: string | null | undefined) {
    const [busyId, setBusyId] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    useEffect(() => {
        clearTimer();
        setBusyId(null);
    }, [open, scopeKey]);

    useEffect(() => () => clearTimer(), []);

    const startBusy = (id: string, onDone?: () => void) => {
        if (busyId !== null) return;
        setBusyId(id);
        clearTimer();
        timerRef.current = window.setTimeout(() => {
            setBusyId(null);
            timerRef.current = null;
            onDone?.();
        }, DRAWER_DISPATCH_MS);
    };

    return { busyId, startBusy, isBusy: (id: string) => busyId === id, anyBusy: busyId !== null };
}

const ManualDispatchButton = ({
    dispatchId,
    busyId,
    anyBusy,
    onDispatch,
    className,
    children,
    lang,
    onDone,
}: {
    dispatchId: string;
    busyId: string | null;
    anyBusy: boolean;
    onDispatch: (id: string, onDone?: () => void) => void;
    className: string;
    children: React.ReactNode;
    lang: Language;
    onDone?: () => void;
}) => {
    const applying = translations[lang].manualControl.acDrawer.applyingDispatch;
    const loading = busyId === dispatchId;
    return (
        <button
            type="button"
            disabled={anyBusy}
            onClick={() => onDispatch(dispatchId, onDone)}
            className={`${className} disabled:pointer-events-none disabled:opacity-90`}
        >
            {loading ? (
                <>
                    <Loader2 size={18} strokeWidth={2.25} className="animate-spin shrink-0" aria-hidden />
                    {applying}
                </>
            ) : (
                children
            )}
        </button>
    );
};

const acTargetInputClass =
    'h-9 w-[5rem] shrink-0 rounded-lg border border-apple-border-light bg-apple-surface-secondary-light px-2 text-center text-sm font-mono font-bold tabular-nums text-apple-text-primary-light outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-apple-text-primary-dark';

/** 空调 / 除湿机侧拉分区标题：无竖条，与全站 apple 字阶一致 */
const AcDrawerSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark">
            {title}
        </h3>
        {children}
    </section>
);

/** 与 BMS 抽屉参数区同款：标签 xs medium，数值 2xl/3xl font-black + brand */
const AcCompactMetric = ({ label, value }: { label: string; value: string }) => (
    <div className="min-w-0 rounded-xl border border-apple-border-light bg-apple-bg-light/40 px-3 py-2.5 dark:border-apple-border-dark dark:bg-apple-bg-dark/25">
        <p className="text-xs font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">{label}</p>
        <p className="mt-2 text-2xl font-black tracking-tight text-brand-600 dark:text-brand-400 md:text-3xl">{value}</p>
    </div>
);

const AcSettingRow = ({
    title,
    currentLineLabel,
    currentDisplay,
    targetLabel,
    targetValue,
    onTargetChange,
    unit,
}: {
    title: string;
    currentLineLabel: string;
    currentDisplay: string;
    targetLabel: string;
    targetValue: string;
    onTargetChange: (v: string) => void;
    unit: string;
}) => (
    <div className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2">
        <p className="shrink-0 text-sm font-bold leading-snug text-apple-text-primary-light dark:text-apple-text-primary-dark sm:max-w-[44%]">
            {title}
        </p>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-1.5 text-sm">
            <span className="text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                {currentLineLabel}
                <span className="ml-1.5 font-mono font-bold tabular-nums text-apple-text-primary-light dark:text-apple-text-primary-dark">
                    {currentDisplay}
                </span>
            </span>
            <span className="hidden text-apple-text-tertiary-light sm:inline dark:text-apple-text-tertiary-dark" aria-hidden>
                ·
            </span>
            <div className="flex items-center gap-1.5">
                <span className="text-apple-text-secondary-light dark:text-apple-text-secondary-dark">{targetLabel}</span>
                <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={targetValue}
                    onChange={(e) => onTargetChange(e.target.value)}
                    className={acTargetInputClass}
                    aria-label={`${title} ${targetLabel}`}
                />
                <span className="text-sm text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark">{unit}</span>
            </div>
        </div>
    </div>
);

const PcsDrawerSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-4">
        <div className="border-l-4 border-brand-500 py-0.5 pl-3 dark:border-brand-400">
            <h3 className="text-xs font-black uppercase tracking-wider text-apple-text-primary-light dark:text-apple-text-primary-dark">
                {title}
            </h3>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
);

type PcsMetricProps = {
    label: string;
    value: string;
    children?: React.ReactNode;
};

const PcsMetricCard = ({ label, value, children }: PcsMetricProps) => (
    <div className={`ems-card flex flex-col gap-3 p-5 ${children ? 'min-h-[200px]' : ''}`}>
        <p className="text-xs font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">{label}</p>
        <p className="text-2xl font-black tracking-tight text-brand-600 dark:text-brand-400 md:text-3xl">{value}</p>
        {children ? (
            <div className="mt-auto flex flex-col gap-2 border-t border-apple-border-light pt-4 dark:border-apple-border-dark">
                {children}
            </div>
        ) : null}
    </div>
);

const PcsControlDrawer = ({
    open,
    panelKey,
    unitTitle,
    onClose,
    lang,
}: {
    open: boolean;
    panelKey: BessPanelKey | null;
    unitTitle: string;
    onClose: () => void;
    lang: Language;
}) => {
    const t = translations[lang].manualControl.pcsDrawer;
    const { busyId, startBusy, anyBusy } = useDrawerDispatchBusy(open, panelKey);
    if (!open || !panelKey) return null;

    return (
        <div
            className="fixed inset-0 z-[115] flex animate-in fade-in justify-end duration-300 bg-apple-bg-dark/40 backdrop-blur-md dark:bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pcs-drawer-title"
        >
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
            <aside
                className="animate-in slide-in-from-right relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-apple-border-light bg-apple-surface-light shadow-2xl duration-300 dark:border-apple-border-dark dark:bg-apple-surface-dark"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-apple-border-light bg-apple-bg-light/50 px-5 py-5 dark:border-apple-border-dark dark:bg-apple-bg-dark/50">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/20">
                            <Battery size={22} strokeWidth={2} aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark">
                                {t.unitLabel.replace('{unit}', unitTitle)}
                            </p>
                            <h2
                                id="pcs-drawer-title"
                                className="mt-1 text-lg font-black leading-tight tracking-tight text-apple-text-primary-light dark:text-apple-text-primary-dark"
                            >
                                {t.title}
                            </h2>
                        </div>
                    </div>
                        <button 
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-full p-2 text-apple-text-tertiary-light transition-all hover:rotate-90 hover:bg-apple-surface-secondary-light dark:text-apple-text-tertiary-dark dark:hover:bg-apple-surface-secondary-dark"
                        aria-label="Close"
                    >
                        <X size={20} />
                        </button>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto px-5 pb-10 pt-4">
                    <div className="space-y-8">
                        <PcsDrawerSection title={t.faultStatus}>
                            <div className="ems-card overflow-hidden p-5 md:col-span-2">
                                <div className="grid grid-cols-2 gap-4 md:gap-8">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                                            {t.totalFault}
                                        </p>
                                        <p className="mt-2 text-2xl font-black tracking-tight text-brand-600 dark:text-brand-400 md:text-3xl">
                                            {t.valNormal}
                                        </p>
                                    </div>
                                    <div className="min-w-0 border-l border-apple-border-light pl-4 md:pl-8 dark:border-apple-border-dark">
                                        <p className="text-xs font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                                            {t.totalAlarm}
                                        </p>
                                        <p className="mt-2 text-2xl font-black tracking-tight text-brand-600 dark:text-brand-400 md:text-3xl">
                                            {t.valNormal}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 border-t border-apple-border-light pt-4 dark:border-apple-border-dark">
                                    <ManualDispatchButton
                                        dispatchId="pcs-fault-reset"
                                        busyId={busyId}
                                        anyBusy={anyBusy}
                                        onDispatch={startBusy}
                                        className={btnFaultReset}
                                        lang={lang}
                                    >
                                        {t.faultReset}
                                    </ManualDispatchButton>
                                </div>
                            </div>
                        </PcsDrawerSection>

                        <PcsDrawerSection title={t.powerOnStatus}>
                            <PcsMetricCard label={t.powerSwitch} value={t.valCharge}>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <ManualDispatchButton
                                        dispatchId="pcs-shutdown"
                                        busyId={busyId}
                                        anyBusy={anyBusy}
                                        onDispatch={startBusy}
                                        className={`${btnPowerOff} w-full sm:flex-1`}
                                        lang={lang}
                                    >
                                        <PowerOff size={18} strokeWidth={2.25} aria-hidden />
                                        {t.deviceShutdown}
                                    </ManualDispatchButton>
                                    <ManualDispatchButton
                                        dispatchId="pcs-startup"
                                        busyId={busyId}
                                        anyBusy={anyBusy}
                                        onDispatch={startBusy}
                                        className={`${btnPowerOn} w-full sm:flex-1`}
                                        lang={lang}
                                    >
                                        <PowerCircle size={18} strokeWidth={2.25} aria-hidden />
                                        {t.deviceStartup}
                                    </ManualDispatchButton>
                                </div>
                            </PcsMetricCard>
                            <PcsMetricCard label={t.offGrid} value={t.valGridTied}>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <ManualDispatchButton
                                        dispatchId="pcs-grid-connect"
                                        busyId={busyId}
                                        anyBusy={anyBusy}
                                        onDispatch={startBusy}
                                        className={`${btnGridConnect} w-full sm:flex-1`}
                                        lang={lang}
                                    >
                                        <PlugZap size={18} strokeWidth={2.25} aria-hidden />
                                        {t.gridConnect}
                                    </ManualDispatchButton>
                                    <ManualDispatchButton
                                        dispatchId="pcs-grid-island"
                                        busyId={busyId}
                                        anyBusy={anyBusy}
                                        onDispatch={startBusy}
                                        className={`${btnGridIsland} w-full sm:flex-1`}
                                        lang={lang}
                                    >
                                        <Unplug size={18} strokeWidth={2.25} aria-hidden />
                                        {t.gridDisconnect}
                                    </ManualDispatchButton>
                                </div>
                            </PcsMetricCard>
                        </PcsDrawerSection>
                    </div>
                </div>
            </aside>
        </div>
    );
};

/** 柴发手动控制侧拉：顶栏与滚动区与 PCS 一致；分区用 PcsDrawerSection + 左状态右按钮 */
const DieselGenControlDrawer = ({
    open,
    unitTitle,
    onClose,
    lang,
}: {
    open: boolean;
    unitTitle: string;
    onClose: () => void;
    lang: Language;
}) => {
    const t = translations[lang].manualControl.dieselGenDrawer;
    const { busyId, startBusy, anyBusy } = useDrawerDispatchBusy(open, unitTitle);
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[115] flex animate-in fade-in justify-end duration-300 bg-apple-bg-dark/40 backdrop-blur-md dark:bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="diesel-gen-drawer-title"
        >
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
            <aside
                className="animate-in slide-in-from-right relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-apple-border-light bg-apple-surface-light shadow-2xl duration-300 dark:border-apple-border-dark dark:bg-apple-surface-dark"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-apple-border-light bg-apple-bg-light/50 px-5 py-5 dark:border-apple-border-dark dark:bg-apple-bg-dark/50">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/20">
                            <Fuel size={22} strokeWidth={2} aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <h2
                                id="diesel-gen-drawer-title"
                                className="text-lg font-black leading-tight tracking-tight text-apple-text-primary-light dark:text-apple-text-primary-dark"
                            >
                                {t.titleWithUnit.replace('{unit}', unitTitle)}
                            </h2>
                        </div>
                    </div>
                        <button 
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-full p-2 text-apple-text-tertiary-light transition-all hover:rotate-90 hover:bg-apple-surface-secondary-light dark:text-apple-text-tertiary-dark dark:hover:bg-apple-surface-secondary-dark"
                        aria-label="Close"
                    >
                        <X size={20} />
                        </button>
                    </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto px-5 pb-10 pt-4">
                    <div className="space-y-8">
                        <PcsDrawerSection title={t.sectionStartStop}>
                            <div className="md:col-span-2">
                                <div className="ems-card overflow-hidden p-5">
                                    <div className="flex flex-col gap-4">
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                                                {t.dgStatusLabel}
                                            </p>
                                            <p className="mt-2 text-2xl font-black tracking-tight text-brand-600 dark:text-brand-400 md:text-3xl">
                                                {t.dgStatusOff}
                                            </p>
                </div>
                                        <div className="border-t border-apple-border-light pt-4 dark:border-apple-border-dark">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                                <ManualDispatchButton
                                                    dispatchId="dg-start"
                                                    busyId={busyId}
                                                    anyBusy={anyBusy}
                                                    onDispatch={startBusy}
                                                    className={btnDgGreen}
                                                    lang={lang}
                                                >
                                                    {t.startGen}
                                                </ManualDispatchButton>
                                                <ManualDispatchButton
                                                    dispatchId="dg-stop"
                                                    busyId={busyId}
                                                    anyBusy={anyBusy}
                                                    onDispatch={startBusy}
                                                    className={btnDgRed}
                                                    lang={lang}
                                                >
                                                    {t.stopGen}
                                                </ManualDispatchButton>
                                                <ManualDispatchButton
                                                    dispatchId="dg-emergency"
                                                    busyId={busyId}
                                                    anyBusy={anyBusy}
                                                    onDispatch={startBusy}
                                                    className={btnDgAmber}
                                                    lang={lang}
                                                >
                                                    {t.emergencyStop}
                                                </ManualDispatchButton>
                </div>
            </div>
                                    </div>
                                </div>
                            </div>
                        </PcsDrawerSection>

                        <PcsDrawerSection title={t.sectionGrid}>
                            <div className="md:col-span-2">
                                <div className="ems-card overflow-hidden p-5">
                                    <div className="flex flex-col gap-4">
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                                                {t.gridStatusLabel}
                                            </p>
                                            <p className="mt-2 text-2xl font-black tracking-tight text-slate-500 dark:text-slate-400 md:text-3xl">
                                                {t.gridStatusUnknown}
                                            </p>
                </div>
                                        <div className="border-t border-apple-border-light pt-4 dark:border-apple-border-dark">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                                <ManualDispatchButton
                                                    dispatchId="dg-allow-grid"
                                                    busyId={busyId}
                                                    anyBusy={anyBusy}
                                                    onDispatch={startBusy}
                                                    className={btnDgGreen}
                                                    lang={lang}
                                                >
                                                    {t.allowGrid}
                                                </ManualDispatchButton>
                                                <ManualDispatchButton
                                                    dispatchId="dg-disconnect-grid"
                                                    busyId={busyId}
                                                    anyBusy={anyBusy}
                                                    onDispatch={startBusy}
                                                    className={btnDgRed}
                                                    lang={lang}
                                                >
                                                    {t.disconnectGrid}
                                                </ManualDispatchButton>
            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </PcsDrawerSection>
                    </div>
                </div>
            </aside>
        </div>
    );
};

const BmsControlDrawer = ({
    open,
    panelKey,
    unitTitle,
    onClose,
    lang,
}: {
    open: boolean;
    panelKey: BessPanelKey | null;
    unitTitle: string;
    onClose: () => void;
    lang: Language;
}) => {
    const t = translations[lang].manualControl.bmsDrawer;
    const { busyId, startBusy, anyBusy } = useDrawerDispatchBusy(open, panelKey);
    if (!open || !panelKey) return null;

    return (
        <div
            className="fixed inset-0 z-[115] flex animate-in fade-in justify-end duration-300 bg-apple-bg-dark/40 backdrop-blur-md dark:bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bms-drawer-title"
        >
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
            <aside
                className="animate-in slide-in-from-right relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-apple-border-light bg-apple-surface-light shadow-2xl duration-300 dark:border-apple-border-dark dark:bg-apple-surface-dark"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-apple-border-light bg-apple-bg-light/50 px-5 py-5 dark:border-apple-border-dark dark:bg-apple-bg-dark/50">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/20">
                            <CircuitBoard size={22} strokeWidth={2} aria-hidden />
                                    </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark">
                                {t.unitLabel.replace('{unit}', unitTitle)}
                            </p>
                            <h2
                                id="bms-drawer-title"
                                className="mt-1 text-lg font-black leading-tight tracking-tight text-apple-text-primary-light dark:text-apple-text-primary-dark"
                            >
                                {t.title}
                            </h2>
                                    </div>
                                </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-full p-2 text-apple-text-tertiary-light transition-all hover:rotate-90 hover:bg-apple-surface-secondary-light dark:text-apple-text-tertiary-dark dark:hover:bg-apple-surface-secondary-dark"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                            </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto px-5 pb-10 pt-4">
                    <div className="space-y-8">
                        <PcsDrawerSection title={t.paramsSection}>
                            <div className="ems-card overflow-hidden p-5 md:col-span-2">
                                <div className="grid grid-cols-2 gap-4 md:gap-8">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                                            {t.totalFault}
                                        </p>
                                        <p className="mt-2 text-2xl font-black tracking-tight text-brand-600 dark:text-brand-400 md:text-3xl">
                                            {t.valNormal}
                                        </p>
                                    </div>
                                    <div className="min-w-0 border-l border-apple-border-light pl-4 md:pl-8 dark:border-apple-border-dark">
                                        <p className="text-xs font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                                            {t.totalAlarm}
                                        </p>
                                        <p className="mt-2 text-2xl font-black tracking-tight text-brand-600 dark:text-brand-400 md:text-3xl">
                                            {t.valNormal}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-apple-border-light pt-6 md:gap-8 dark:border-apple-border-dark">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                                            {t.hvStatus}
                                        </p>
                                        <p className="mt-2 text-2xl font-black tracking-tight text-brand-600 dark:text-brand-400 md:text-3xl">
                                            {t.valConnected}
                                        </p>
                                    </div>
                                    <div className="min-w-0 border-l border-apple-border-light pl-4 md:pl-8 dark:border-apple-border-dark">
                                        <p className="text-xs font-medium text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                                            {t.bmsState}
                                        </p>
                                        <p className="mt-2 text-2xl font-black tracking-tight text-brand-600 dark:text-brand-400 md:text-3xl">
                                            {t.valStandby}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </PcsDrawerSection>

                        <PcsDrawerSection title={t.controlSection}>
                            <div className="space-y-4 md:col-span-2">
                                <div className="ems-card p-5">
                                    <ManualDispatchButton
                                        dispatchId="bms-fault-reset"
                                        busyId={busyId}
                                        anyBusy={anyBusy}
                                        onDispatch={startBusy}
                                        className={btnFaultReset}
                                        lang={lang}
                                    >
                                        <RotateCcw size={18} strokeWidth={2.25} aria-hidden />
                                        {t.batteryFaultReset}
                                    </ManualDispatchButton>
                                    </div>
                                <div className="ems-card p-5">
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <ManualDispatchButton
                                            dispatchId="bms-contactor-open"
                                            busyId={busyId}
                                            anyBusy={anyBusy}
                                            onDispatch={startBusy}
                                            className={`${btnPowerOff} w-full sm:flex-1`}
                                            lang={lang}
                                        >
                                            <Unplug size={18} strokeWidth={2.25} aria-hidden />
                                            {t.contactorOpen}
                                        </ManualDispatchButton>
                                        <ManualDispatchButton
                                            dispatchId="bms-contactor-close"
                                            busyId={busyId}
                                            anyBusy={anyBusy}
                                            onDispatch={startBusy}
                                            className={`${btnGridConnect} w-full sm:flex-1`}
                                            lang={lang}
                                        >
                                            <PlugZap size={18} strokeWidth={2.25} aria-hidden />
                                            {t.contactorClose}
                                        </ManualDispatchButton>
                                    </div>
                                </div>
                            </div>
                        </PcsDrawerSection>
                    </div>
                </div>
            </aside>
        </div>
    );
};

const AcControlDrawer = ({
    open,
    panelKey,
    unitTitle,
    onClose,
    lang,
}: {
    open: boolean;
    panelKey: BessPanelKey | null;
    unitTitle: string;
    onClose: () => void;
    lang: Language;
}) => {
    const t = translations[lang].manualControl.acDrawer;
    const u = t.unitC;

    const [targetCooling, setTargetCooling] = useState('');
    const [targetHeating, setTargetHeating] = useState('');
    const [targetCoolingDiff, setTargetCoolingDiff] = useState('');
    const [targetHeatingDiff, setTargetHeatingDiff] = useState('');
    const [targetCoolingStop, setTargetCoolingStop] = useState('');
    const [targetHeatingStop, setTargetHeatingStop] = useState('');

    type AcDispatchPhase = 'idle' | 'loading' | 'success';
    const [dispatchPhase, setDispatchPhase] = useState<AcDispatchPhase>('idle');
    const dispatchTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearDispatchTimers = () => {
        dispatchTimersRef.current.forEach(clearTimeout);
        dispatchTimersRef.current = [];
    };

    useEffect(() => {
        setDispatchPhase('idle');
        clearDispatchTimers();
        return () => clearDispatchTimers();
    }, [open, panelKey]);

    const { busyId: powerBusyId, startBusy: startPowerBusy, anyBusy: powerAnyBusy } = useDrawerDispatchBusy(
        open,
        panelKey,
    );

    const handleApplyDispatch = () => {
        if (dispatchPhase !== 'idle' || powerAnyBusy) return;
        clearDispatchTimers();
        setDispatchPhase('loading');
        const t1 = window.setTimeout(() => {
            setDispatchPhase('success');
            const t2 = window.setTimeout(() => {
                setDispatchPhase('idle');
            }, 2000);
            dispatchTimersRef.current.push(t2);
        }, 1500);
        dispatchTimersRef.current.push(t1);
    };

    if (!open || !panelKey) return null;

    const v = (n: string) => `${n} ${u}`;

    return (
        <div
            className="fixed inset-0 z-[115] flex animate-in fade-in justify-end duration-300 bg-apple-bg-dark/40 backdrop-blur-md dark:bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ac-drawer-title"
        >
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
            <aside
                className="animate-in slide-in-from-right relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-apple-border-light bg-apple-surface-light shadow-2xl duration-300 dark:border-apple-border-dark dark:bg-apple-surface-dark"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-2 border-b border-apple-border-light bg-apple-bg-light/50 px-4 py-4 dark:border-apple-border-dark dark:bg-apple-bg-dark/50">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-500/15">
                            <AirVent size={22} strokeWidth={2} aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark">
                                {t.unitLabel.replace('{unit}', unitTitle)}
                            </p>
                            <h2
                                id="ac-drawer-title"
                                className="mt-1 text-lg font-black leading-tight tracking-tight text-apple-text-primary-light dark:text-apple-text-primary-dark"
                            >
                                {t.title}
                            </h2>
                        </div>
                    </div>
                                                <button 
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-full p-2 text-apple-text-tertiary-light transition-all hover:rotate-90 hover:bg-apple-surface-secondary-light dark:text-apple-text-tertiary-dark dark:hover:bg-apple-surface-secondary-dark"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                                    </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-3">
                    <div className="space-y-4">
                        <AcDrawerSection title={t.sectionData}>
                            <div className="ems-card overflow-hidden p-5">
                                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 md:gap-5">
                                    <AcCompactMetric label={t.runState} value={t.runOk} />
                                    <AcCompactMetric label={t.coilTemp} value={v('22.2')} />
                                    <AcCompactMetric label={t.outdoorTemp} value={v('22')} />
                                    <AcCompactMetric label={t.condTemp} value={v('22.2')} />
                                    <AcCompactMetric label={t.exhaustTemp} value={v('32')} />
                                    <AcCompactMetric label={t.indoorTemp} value={v('20.2')} />
                                </div>
                            </div>
                        </AcDrawerSection>

                        <AcDrawerSection title={t.sectionSwitch}>
                            <div className="ems-card p-4">
                                <div className="flex flex-col gap-2.5 sm:flex-row">
                                    <ManualDispatchButton
                                        dispatchId="ac-power-on"
                                        busyId={powerBusyId}
                                        anyBusy={powerAnyBusy || dispatchPhase !== 'idle'}
                                        onDispatch={startPowerBusy}
                                        className={`${btnPowerOn} w-full py-3 !text-base sm:flex-1`}
                                        lang={lang}
                                    >
                                        <PowerCircle size={18} strokeWidth={2.25} aria-hidden />
                                        {t.powerOn}
                                    </ManualDispatchButton>
                                    <ManualDispatchButton
                                        dispatchId="ac-power-off"
                                        busyId={powerBusyId}
                                        anyBusy={powerAnyBusy || dispatchPhase !== 'idle'}
                                        onDispatch={startPowerBusy}
                                        className={`${btnPowerOff} w-full py-3 !text-base sm:flex-1`}
                                        lang={lang}
                                    >
                                        <PowerOff size={18} strokeWidth={2.25} aria-hidden />
                                        {t.powerOff}
                                    </ManualDispatchButton>
                                </div>
                            </div>
                        </AcDrawerSection>

                        <AcDrawerSection title={t.sectionSettings}>
                            <div className="ems-card p-4">
                                <div className="divide-y divide-apple-border-light dark:divide-apple-border-dark">
                                    <AcSettingRow
                                        title={t.coolingSet}
                                        currentLineLabel={t.current}
                                        currentDisplay={v('2')}
                                        targetLabel={t.target}
                                        targetValue={targetCooling}
                                        onTargetChange={setTargetCooling}
                                        unit={u}
                                    />
                                    <AcSettingRow
                                        title={t.heatingSet}
                                        currentLineLabel={t.current}
                                        currentDisplay={v('2')}
                                        targetLabel={t.target}
                                        targetValue={targetHeating}
                                        onTargetChange={setTargetHeating}
                                        unit={u}
                                    />
                                    <AcSettingRow
                                        title={t.coolingDiff}
                                        currentLineLabel={t.currentDiff}
                                        currentDisplay={v('2')}
                                        targetLabel={t.target}
                                        targetValue={targetCoolingDiff}
                                        onTargetChange={setTargetCoolingDiff}
                                        unit={u}
                                    />
                                    <AcSettingRow
                                        title={t.heatingDiff}
                                        currentLineLabel={t.currentDiff}
                                        currentDisplay={v('2')}
                                        targetLabel={t.target}
                                        targetValue={targetHeatingDiff}
                                        onTargetChange={setTargetHeatingDiff}
                                        unit={u}
                                    />
                                    <AcSettingRow
                                        title={t.coolingStop}
                                        currentLineLabel={t.current}
                                        currentDisplay={t.empty}
                                        targetLabel={t.target}
                                        targetValue={targetCoolingStop}
                                        onTargetChange={setTargetCoolingStop}
                                        unit={u}
                                    />
                                    <AcSettingRow
                                        title={t.heatingStop}
                                        currentLineLabel={t.current}
                                        currentDisplay={t.empty}
                                        targetLabel={t.target}
                                        targetValue={targetHeatingStop}
                                        onTargetChange={setTargetHeatingStop}
                                        unit={u}
                                    />
                                </div>
                                <div className="mt-4 border-t border-apple-border-light pt-4 dark:border-apple-border-dark">
                                                <button 
                                        type="button"
                                        disabled={dispatchPhase !== 'idle' || powerAnyBusy}
                                        onClick={handleApplyDispatch}
                                        className={
                                            dispatchPhase === 'success'
                                                ? btnAcDispatchSuccess
                                                : `${btnFaultReset} disabled:pointer-events-none disabled:opacity-90`
                                        }
                                    >
                                        {dispatchPhase === 'loading' ? (
                                            <Loader2 size={18} strokeWidth={2.25} className="animate-spin" aria-hidden />
                                        ) : dispatchPhase === 'success' ? (
                                            <CheckCircle2 size={18} strokeWidth={2.25} aria-hidden />
                                        ) : (
                                            <Send size={18} strokeWidth={2.25} aria-hidden />
                                        )}
                                        {dispatchPhase === 'loading'
                                            ? t.applyingDispatch
                                            : dispatchPhase === 'success'
                                              ? t.applySuccess
                                              : t.applyDispatchConfig}
                                                </button>
                                            </div>
                                        </div>
                        </AcDrawerSection>
                    </div>
                </div>
            </aside>
        </div>
    );
};

const DehumidifierControlDrawer = ({
    open,
    panelKey,
    unitTitle,
    onClose,
    lang,
}: {
    open: boolean;
    panelKey: BessPanelKey | null;
    unitTitle: string;
    onClose: () => void;
    lang: Language;
}) => {
    const t = translations[lang].manualControl.dehumidifierDrawer;
    const uC = t.unitC;
    const uRh = t.unitRh;

    const [targetTempLo, setTargetTempLo] = useState('0');
    const [targetTempHi, setTargetTempHi] = useState('0');
    const [targetHumLo, setTargetHumLo] = useState('0');
    const [targetHumHi, setTargetHumHi] = useState('0');

    useEffect(() => {
        if (!open) return;
        setTargetTempLo('0');
        setTargetTempHi('0');
        setTargetHumLo('0');
        setTargetHumHi('0');
    }, [open, panelKey]);

    const { busyId, startBusy, anyBusy } = useDrawerDispatchBusy(open, panelKey);

    if (!open || !panelKey) return null;

    /** 图示当前值：温度/湿度均为 0.2（湿度展示为 %RH） */
    const currentTemp = '0.2';
    const currentRh = '0.2';

    return (
        <div
            className="fixed inset-0 z-[115] flex animate-in fade-in justify-end duration-300 bg-apple-bg-dark/40 backdrop-blur-md dark:bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dehumid-drawer-title"
        >
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
            <aside
                className="animate-in slide-in-from-right relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-apple-border-light bg-apple-surface-light shadow-2xl duration-300 dark:border-apple-border-dark dark:bg-apple-surface-dark"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-2 border-b border-apple-border-light bg-apple-bg-light/50 px-4 py-4 dark:border-apple-border-dark dark:bg-apple-bg-dark/50">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-500/15">
                            <Droplets size={22} strokeWidth={2} aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark">
                                {t.unitLabel.replace('{unit}', unitTitle)}
                            </p>
                            <h2
                                id="dehumid-drawer-title"
                                className="mt-1 text-lg font-black leading-tight tracking-tight text-apple-text-primary-light dark:text-apple-text-primary-dark"
                            >
                                {t.title}
                            </h2>
                        </div>
                    </div>
                                                <button 
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-full p-2 text-apple-text-tertiary-light transition-all hover:rotate-90 hover:bg-apple-surface-secondary-light dark:text-apple-text-tertiary-dark dark:hover:bg-apple-surface-secondary-dark"
                        aria-label="Close"
                    >
                        <X size={20} />
                                                </button>
                                            </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-3">
                    <div className="space-y-4">
                        <AcDrawerSection title={t.sectionFault}>
                            <div className="ems-card p-4">
                                <ManualDispatchButton
                                    dispatchId="dehumid-fault-reset"
                                    busyId={busyId}
                                    anyBusy={anyBusy}
                                    onDispatch={startBusy}
                                    className={btnFaultReset}
                                    lang={lang}
                                >
                                    <RotateCcw size={18} strokeWidth={2.25} aria-hidden />
                                    {t.faultReset}
                                </ManualDispatchButton>
                                        </div>
                        </AcDrawerSection>

                        <AcDrawerSection title={t.sectionTemp}>
                            <div className="ems-card p-4">
                                <div className="divide-y divide-apple-border-light dark:divide-apple-border-dark">
                                    <AcSettingRow
                                        title={t.tempLower}
                                        currentLineLabel={t.current}
                                        currentDisplay={`${currentTemp} ${uC}`}
                                        targetLabel={t.target}
                                        targetValue={targetTempLo}
                                        onTargetChange={setTargetTempLo}
                                        unit={uC}
                                    />
                                    <AcSettingRow
                                        title={t.tempUpper}
                                        currentLineLabel={t.current}
                                        currentDisplay={`${currentTemp} ${uC}`}
                                        targetLabel={t.target}
                                        targetValue={targetTempHi}
                                        onTargetChange={setTargetTempHi}
                                        unit={uC}
                                    />
                                </div>
                            </div>
                        </AcDrawerSection>

                        <AcDrawerSection title={t.sectionHumidity}>
                            <div className="ems-card p-4">
                                <div className="divide-y divide-apple-border-light dark:divide-apple-border-dark">
                                    <AcSettingRow
                                        title={t.humLower}
                                        currentLineLabel={t.current}
                                        currentDisplay={`${currentRh} ${uRh}`}
                                        targetLabel={t.target}
                                        targetValue={targetHumLo}
                                        onTargetChange={setTargetHumLo}
                                        unit={uRh}
                                    />
                                    <AcSettingRow
                                        title={t.humUpper}
                                        currentLineLabel={t.current}
                                        currentDisplay={`${currentRh} ${uRh}`}
                                        targetLabel={t.target}
                                        targetValue={targetHumHi}
                                        onTargetChange={setTargetHumHi}
                                        unit={uRh}
                                    />
                                </div>
                            </div>
                        </AcDrawerSection>
                    </div>
                </div>
            </aside>
        </div>
    );
};

/** IO 抽屉区块标题：与 PcsDrawerSection 同款竖条 + apple 字色 */
const IoSectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-3 border-l-4 border-brand-500 py-0.5 pl-3 dark:border-brand-400">
        <h3 className="text-xs font-black uppercase tracking-wider text-apple-text-primary-light dark:text-apple-text-primary-dark">
            {children}
        </h3>
    </div>
);

const IoControlDrawer = ({
    open,
    panelKey,
    unitTitle,
    onClose,
    lang,
}: {
    open: boolean;
    panelKey: BessPanelKey | null;
    unitTitle: string;
    onClose: () => void;
    lang: Language;
}) => {
    const t = translations[lang].manualControl.ioDrawer;
    const [fanOn, setFanOn] = useState(false);
    const { busyId, startBusy, anyBusy } = useDrawerDispatchBusy(open, panelKey);

    useEffect(() => {
        if (!open) setFanOn(false);
    }, [open]);

    if (!open || !panelKey) return null;

    const diRows = [
        { name: t.diQf1, value: '(2)' },
        { name: t.diQf2, value: '(2)' },
        { name: t.diDoor, value: '(2)' },
        { name: t.diWater, value: '(2)' },
        { name: t.diFire, value: '(2)' },
    ];

    const thClass =
        'px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-apple-text-secondary-light dark:text-apple-text-secondary-dark';
    const tdNameClass =
        'border-t border-apple-border-light px-3 py-2.5 text-sm font-medium text-apple-text-primary-light dark:border-apple-border-dark dark:text-apple-text-primary-dark';
    const tdValClass =
        'border-t border-apple-border-light px-3 py-2 text-right font-mono text-2xl font-black tabular-nums text-brand-600 dark:border-apple-border-dark dark:text-brand-400';

    const ioTableWrap = 'ems-card overflow-hidden';
    const ioTheadRow = 'bg-slate-100 dark:bg-apple-surface-secondary-dark/80';

    const doBtnBase =
        'inline-flex min-w-[4rem] flex-1 items-center justify-center rounded-2xl px-3 py-2.5 text-sm font-bold transition-all sm:min-w-[4.5rem] sm:text-base';
    const doBtnActive =
        'bg-brand-600 text-white shadow-lg shadow-brand-500/25 hover:bg-brand-500 active:scale-[0.98] dark:bg-brand-600 dark:hover:bg-brand-500';
    const doBtnIdle =
        'border border-slate-200/90 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-200 dark:hover:bg-apple-surface-secondary-dark';

    return (
        <div
            className="fixed inset-0 z-[115] flex animate-in fade-in justify-end duration-300 bg-apple-bg-dark/40 backdrop-blur-md dark:bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="io-drawer-title"
        >
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
            <aside
                className="animate-in slide-in-from-right relative z-10 flex h-full w-full max-w-6xl flex-col border-l border-apple-border-light bg-apple-surface-light shadow-2xl duration-300 dark:border-apple-border-dark dark:bg-apple-surface-dark"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-apple-border-light bg-apple-bg-light/50 px-5 py-5 dark:border-apple-border-dark dark:bg-apple-bg-dark/50">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/20">
                            <Binary size={22} strokeWidth={2} aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark">
                                {t.unitLabel.replace('{unit}', unitTitle)}
                            </p>
                            <h2
                                id="io-drawer-title"
                                className="mt-1 text-lg font-black leading-tight tracking-tight text-apple-text-primary-light dark:text-apple-text-primary-dark"
                            >
                                {t.title}
                            </h2>
                        </div>
                    </div>
                                        <button 
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-full p-2 text-apple-text-tertiary-light transition-all hover:rotate-90 hover:bg-apple-surface-secondary-light dark:text-apple-text-tertiary-dark dark:hover:bg-apple-surface-secondary-dark"
                        aria-label="Close"
                    >
                        <X size={20} />
                                        </button>
                                    </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto px-5 pb-10 pt-4">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                        <div>
                            <IoSectionTitle>{t.sectionDi}</IoSectionTitle>
                            <div className={ioTableWrap}>
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className={ioTheadRow}>
                                            <th className={thClass}>{t.colDiName}</th>
                                            <th className={`${thClass} text-right`}>{t.colValue}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {diRows.map((row, idx) => (
                                            <tr
                                                key={idx}
                                                className="transition-colors hover:bg-apple-surface-secondary-light/60 dark:hover:bg-white/[0.04]"
                                            >
                                                <td className={tdNameClass}>{row.name}</td>
                                                <td className={`${tdValClass} align-middle`}>{row.value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <IoSectionTitle>{t.sectionDo}</IoSectionTitle>
                            <div className={ioTableWrap}>
                                <table className="w-full border-collapse text-left">
                                    <thead>
                                        <tr className={ioTheadRow}>
                                            <th className={thClass}>{t.colDoName}</th>
                                            <th className={`${thClass} text-right`}>{t.colValue}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="transition-colors hover:bg-apple-surface-secondary-light/60 dark:hover:bg-white/[0.04]">
                                            <td className={tdNameClass}>{t.doFan}</td>
                                            <td className="border-t border-apple-border-light px-3 py-2.5 align-middle dark:border-apple-border-dark">
                                                <div className="flex justify-end gap-2">
                                                    <ManualDispatchButton
                                                        dispatchId="io-fan-on"
                                                        busyId={busyId}
                                                        anyBusy={anyBusy}
                                                        onDispatch={startBusy}
                                                        className={`${doBtnBase} ${fanOn ? doBtnActive : doBtnIdle}`}
                                                        lang={lang}
                                                        onDone={() => setFanOn(true)}
                                                    >
                                                        {t.on}
                                                    </ManualDispatchButton>
                                                    <ManualDispatchButton
                                                        dispatchId="io-fan-off"
                                                        busyId={busyId}
                                                        anyBusy={anyBusy}
                                                        onDispatch={startBusy}
                                                        className={`${doBtnBase} ${!fanOn ? doBtnActive : doBtnIdle}`}
                                                        lang={lang}
                                                        onDone={() => setFanOn(false)}
                                                    >
                                                        {t.off}
                                                    </ManualDispatchButton>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
};

const ManualControl: React.FC<ManualControlProps> = ({ lang, theme: _theme, selectedStation: _selectedStation }) => {
    const t = translations[lang].manualControl;
    const [activeCategory, setActiveCategory] = useState<ControlCategory>('bessPv');
    type HitAction = BessActionKey | 'dieselManual';
    const [lastHit, setLastHit] = useState<{ panel: string; action: HitAction } | null>(null);
    const [pcsDrawer, setPcsDrawer] = useState<{ open: boolean; panelKey: BessPanelKey | null }>({
        open: false,
        panelKey: null,
    });
    const [bmsDrawer, setBmsDrawer] = useState<{ open: boolean; panelKey: BessPanelKey | null }>({
        open: false,
        panelKey: null,
    });
    const [acDrawer, setAcDrawer] = useState<{
        open: boolean;
        panelKey: BessPanelKey | null;
        /** 头部空调卡片：侧拉「单元」行显示 AC 1 / 空调 1 等 */
        unitTitleOverride?: string | null;
    }>({
        open: false,
        panelKey: null,
        unitTitleOverride: null,
    });
    const [ioDrawer, setIoDrawer] = useState<{
        open: boolean;
        panelKey: BessPanelKey | null;
        /** 头部 IO 卡片入口：侧拉副标题显示 IO 1 / IO 2，而非 BESS 名 */
        unitTitleOverride?: string | null;
    }>({
        open: false,
        panelKey: null,
        unitTitleOverride: null,
    });
    const [dehumidifierDrawer, setDehumidifierDrawer] = useState<{ open: boolean; panelKey: BessPanelKey | null }>({
        open: false,
        panelKey: null,
    });
    const [dieselGenDrawerOpen, setDieselGenDrawerOpen] = useState(false);

    const tabLabel = (id: ControlCategory) => {
        switch (id) {
            case 'dido':
                return t.tabs.dido;
            case 'ats':
                return t.tabs.ats;
            case 'diesel':
                return t.tabs.diesel;
            case 'ac':
                return t.tabs.ac;
            case 'bessPv':
                return t.tabs.bessPv;
            default:
                return id;
        }
    };

    const actionLabel = (key: BessActionKey) => t.actionsIo[key];

    /** 储能卡片内操作按钮：圆角、轻阴影、按压反馈，与 PCS 等主按钮家族一致 */
    const bessActionBtn =
        'flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none transition-all hover:border-slate-300 hover:bg-slate-50/90 hover:shadow active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand-500/35 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/90 dark:text-slate-200 dark:hover:border-brand-500/35 dark:hover:bg-apple-surface-secondary-dark';
    const bessActionBtnActive =
        'border-brand-500 bg-gradient-to-b from-brand-50 to-brand-50/70 text-brand-800 shadow-md shadow-brand-500/15 ring-1 ring-brand-500/20 dark:border-brand-500 dark:from-brand-950/50 dark:to-brand-950/30 dark:text-brand-200 dark:shadow-brand-900/30';

    const onBessAction = (panelKey: BessPanelKey, key: BessActionKey) => {
        setLastHit({ panel: panelKey, action: key });
        if (key === 'pcs') {
            setBmsDrawer({ open: false, panelKey: null });
            setAcDrawer({ open: false, panelKey: null, unitTitleOverride: null });
            setIoDrawer({ open: false, panelKey: null, unitTitleOverride: null });
            setDehumidifierDrawer({ open: false, panelKey: null });
            setPcsDrawer({ open: true, panelKey });
        } else if (key === 'bms') {
            setPcsDrawer({ open: false, panelKey: null });
            setAcDrawer({ open: false, panelKey: null, unitTitleOverride: null });
            setIoDrawer({ open: false, panelKey: null, unitTitleOverride: null });
            setDehumidifierDrawer({ open: false, panelKey: null });
            setBmsDrawer({ open: true, panelKey });
        } else if (key === 'ac') {
            setPcsDrawer({ open: false, panelKey: null });
            setBmsDrawer({ open: false, panelKey: null });
            setIoDrawer({ open: false, panelKey: null, unitTitleOverride: null });
            setDehumidifierDrawer({ open: false, panelKey: null });
            setAcDrawer({ open: true, panelKey, unitTitleOverride: null });
        } else if (key === 'ioControl') {
            setPcsDrawer({ open: false, panelKey: null });
            setBmsDrawer({ open: false, panelKey: null });
            setAcDrawer({ open: false, panelKey: null, unitTitleOverride: null });
            setDehumidifierDrawer({ open: false, panelKey: null });
            setIoDrawer({ open: true, panelKey, unitTitleOverride: null });
        } else if (key === 'dehumidifier') {
            setPcsDrawer({ open: false, panelKey: null });
            setBmsDrawer({ open: false, panelKey: null });
            setAcDrawer({ open: false, panelKey: null, unitTitleOverride: null });
            setIoDrawer({ open: false, panelKey: null, unitTitleOverride: null });
            setDehumidifierDrawer({ open: true, panelKey });
        }
    };

    const openIoFromHeaderCard = (slot: 'io1' | 'io2') => {
        const panelKey = slot === 'io1' ? 'bess2' : 'bess3';
        const label = slot === 'io1' ? t.ioCardIo1 : t.ioCardIo2;
        setLastHit({ panel: slot, action: 'ioControl' });
        setPcsDrawer({ open: false, panelKey: null });
        setBmsDrawer({ open: false, panelKey: null });
        setAcDrawer({ open: false, panelKey: null, unitTitleOverride: null });
        setDehumidifierDrawer({ open: false, panelKey: null });
        setIoDrawer({ open: true, panelKey, unitTitleOverride: label });
    };

    const openAcFromHeaderCard = (slot: 'ac1' | 'ac2') => {
        const panelKey = slot === 'ac1' ? 'bess2' : 'bess3';
        const label = slot === 'ac1' ? t.acCardAc1 : t.acCardAc2;
        setLastHit({ panel: slot, action: 'ac' });
        setPcsDrawer({ open: false, panelKey: null });
        setBmsDrawer({ open: false, panelKey: null });
        setIoDrawer({ open: false, panelKey: null, unitTitleOverride: null });
        setDehumidifierDrawer({ open: false, panelKey: null });
        setAcDrawer({ open: true, panelKey, unitTitleOverride: label });
    };

    const drawerUnitTitle = pcsDrawer.panelKey ? t.bessPanels[pcsDrawer.panelKey] : '';
    const bmsDrawerUnitTitle = bmsDrawer.panelKey ? t.bessPanels[bmsDrawer.panelKey] : '';
    const acDrawerUnitTitle = acDrawer.panelKey
        ? acDrawer.unitTitleOverride ?? t.bessPanels[acDrawer.panelKey]
        : '';
    const ioDrawerUnitTitle = ioDrawer.panelKey
        ? ioDrawer.unitTitleOverride ?? t.bessPanels[ioDrawer.panelKey]
        : '';
    const dehumidifierDrawerUnitTitle = dehumidifierDrawer.panelKey ? t.bessPanels[dehumidifierDrawer.panelKey] : '';

    return (
        <div className="ems-page-shell">
            <PcsControlDrawer
                open={pcsDrawer.open}
                panelKey={pcsDrawer.panelKey}
                unitTitle={drawerUnitTitle}
                onClose={() => setPcsDrawer({ open: false, panelKey: null })}
                lang={lang}
            />
            <DieselGenControlDrawer
                open={dieselGenDrawerOpen}
                unitTitle={t.dieselGen.genset1}
                onClose={() => setDieselGenDrawerOpen(false)}
                lang={lang}
            />
            <BmsControlDrawer
                open={bmsDrawer.open}
                panelKey={bmsDrawer.panelKey}
                unitTitle={bmsDrawerUnitTitle}
                onClose={() => setBmsDrawer({ open: false, panelKey: null })}
                lang={lang}
            />
            <AcControlDrawer
                open={acDrawer.open}
                panelKey={acDrawer.panelKey}
                unitTitle={acDrawerUnitTitle}
                onClose={() => setAcDrawer({ open: false, panelKey: null, unitTitleOverride: null })}
                lang={lang}
            />
            <IoControlDrawer
                open={ioDrawer.open}
                panelKey={ioDrawer.panelKey}
                unitTitle={ioDrawerUnitTitle}
                onClose={() => setIoDrawer({ open: false, panelKey: null, unitTitleOverride: null })}
                lang={lang}
            />
            <DehumidifierControlDrawer
                open={dehumidifierDrawer.open}
                panelKey={dehumidifierDrawer.panelKey}
                unitTitle={dehumidifierDrawerUnitTitle}
                onClose={() => setDehumidifierDrawer({ open: false, panelKey: null })}
                lang={lang}
            />

            {/* 顶栏：分类标签 */}
            <div className="ems-card mb-4 p-4">
                <div className="custom-scrollbar-hide max-w-full overflow-x-auto rounded-xl">
                    <div className="ems-segmented w-max">
                        {CATEGORY_ORDER.map((id) => {
                            const active = activeCategory === id;
                            return (
                                            <button 
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveCategory(id)}
                                    className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                                        active
                                            ? 'bg-white text-blue-600 shadow-sm dark:bg-apple-surface-dark dark:text-blue-400'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {tabLabel(id)}
                                            </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {activeCategory === 'bessPv' ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
                    {BESS_CARD_LAYOUT.map(({ panelKey, actions }) => {
                        const unitNo = panelKey.replace(/\D/g, '') || '1';
                        return (
                            <div
                                key={panelKey}
                                className="ems-card group/card relative flex flex-col overflow-hidden p-0 shadow-sm ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/50 dark:ring-white/[0.06] dark:hover:shadow-black/50"
                            >
                                <div className="relative border-b border-slate-200/80 bg-white px-5 pb-4 pt-4 dark:border-apple-border-dark dark:bg-apple-surface-dark">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-600 transition-transform duration-300 group-hover/card:scale-[1.02] dark:border-brand-500/35 dark:bg-brand-500/15 dark:text-brand-400">
                                            <Battery size={22} strokeWidth={2.25} aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1 py-0.5">
                                            <h3 className="truncate text-lg font-black leading-tight tracking-tight text-slate-900 dark:text-slate-50">
                                                {t.bessPanels[panelKey]}
                                            </h3>
                                        </div>
                                        <span
                                            className="shrink-0 rounded-lg border border-slate-200/90 bg-slate-50 px-2.5 py-1 text-xs font-black tabular-nums text-slate-500 dark:border-apple-border-dark dark:bg-white/5 dark:text-slate-400"
                                            aria-hidden
                                        >
                                            {unitNo}
                                        </span>
                                    </div>
                                </div>
                                <div className="relative mx-4 mb-4 mt-1 rounded-2xl bg-gradient-to-b from-slate-100/90 to-slate-50/40 p-2.5 ring-1 ring-inset ring-slate-200/60 dark:from-white/[0.06] dark:to-transparent dark:ring-white/[0.07]">
                                    <div className="flex flex-col gap-2">
                                        {actions.map((key) => {
                                            const pressed = lastHit?.panel === panelKey && lastHit?.action === key;
                                            return (
                                            <button 
                                                    key={key}
                                                    type="button"
                                                    onClick={() => onBessAction(panelKey, key)}
                                                    className={`${bessActionBtn} ${pressed ? bessActionBtnActive : ''}`}
                                                >
                                                    {actionLabel(key)}
                                            </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                        </div>
            ) : activeCategory === 'dido' ? (
                <div className="grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                    {(['io1', 'io2'] as const).map((slot) => {
                        const title = slot === 'io1' ? t.ioCardIo1 : t.ioCardIo2;
                        const pressed = lastHit?.panel === slot && lastHit?.action === 'ioControl';
                        return (
                            <div
                                key={slot}
                                className="ems-card group/card relative flex flex-col overflow-hidden p-0 shadow-sm ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/50 dark:ring-white/[0.06] dark:hover:shadow-black/50"
                            >
                                <div className="relative border-b border-slate-200/80 bg-white px-5 pb-4 pt-4 dark:border-apple-border-dark dark:bg-apple-surface-dark">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-600 transition-transform duration-300 group-hover/card:scale-[1.02] dark:border-brand-500/35 dark:bg-brand-500/15 dark:text-brand-400">
                                            <Binary size={22} strokeWidth={2.25} aria-hidden />
                </div>
                                        <div className="min-w-0 flex-1 py-0.5">
                                            <h3 className="truncate text-lg font-black leading-tight tracking-tight text-slate-900 dark:text-slate-50">
                                                {title}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative mx-4 mb-4 mt-1 rounded-2xl bg-gradient-to-b from-slate-100/90 to-slate-50/40 p-2.5 ring-1 ring-inset ring-slate-200/60 dark:from-white/[0.06] dark:to-transparent dark:ring-white/[0.07]">
                                    <button
                                        type="button"
                                        onClick={() => openIoFromHeaderCard(slot)}
                                        className={`${bessActionBtn} ${pressed ? bessActionBtnActive : ''}`}
                                    >
                                        {actionLabel('ioControl')}
                                    </button>
            </div>
                            </div>
                        );
                    })}
                </div>
            ) : activeCategory === 'diesel' ? (
                <div className="grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                    <div className="ems-card group/card relative flex flex-col overflow-hidden p-0 shadow-sm ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/50 dark:ring-white/[0.06] dark:hover:shadow-black/50">
                        <div className="relative border-b border-slate-200/80 bg-white px-5 pb-4 pt-4 dark:border-apple-border-dark dark:bg-apple-surface-dark">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-600 transition-transform duration-300 group-hover/card:scale-[1.02] dark:border-brand-500/35 dark:bg-brand-500/15 dark:text-brand-400">
                                    <Fuel size={22} strokeWidth={2.25} aria-hidden />
                                </div>
                                <div className="min-w-0 flex-1 py-0.5">
                                    <h3 className="truncate text-lg font-black leading-tight tracking-tight text-slate-900 dark:text-slate-50">
                                        {t.dieselGen.genset1}
                                    </h3>
                                </div>
                            </div>
                        </div>
                        <div className="relative mx-4 mb-4 mt-1 rounded-2xl bg-gradient-to-b from-slate-100/90 to-slate-50/40 p-2.5 ring-1 ring-inset ring-slate-200/60 dark:from-white/[0.06] dark:to-transparent dark:ring-white/[0.07]">
                            <button
                                type="button"
                                onClick={() => {
                                    setLastHit({ panel: 'diesel-genset1', action: 'dieselManual' });
                                    setDieselGenDrawerOpen(true);
                                }}
                                className={`${bessActionBtn} ${
                                    lastHit?.panel === 'diesel-genset1' && lastHit?.action === 'dieselManual'
                                        ? bessActionBtnActive
                                        : ''
                                }`}
                            >
                                {t.dieselGen.manualControl}
                            </button>
                        </div>
                    </div>
                </div>
            ) : activeCategory === 'ac' ? (
                <div className="grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                    {(['ac1', 'ac2'] as const).map((slot) => {
                        const title = slot === 'ac1' ? t.acCardAc1 : t.acCardAc2;
                        const pressed = lastHit?.panel === slot && lastHit?.action === 'ac';
                        return (
                            <div
                                key={slot}
                                className="ems-card group/card relative flex flex-col overflow-hidden p-0 shadow-sm ring-1 ring-slate-900/[0.04] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/50 dark:ring-white/[0.06] dark:hover:shadow-black/50"
                            >
                                <div className="relative border-b border-slate-200/80 bg-white px-5 pb-4 pt-4 dark:border-apple-border-dark dark:bg-apple-surface-dark">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-600 transition-transform duration-300 group-hover/card:scale-[1.02] dark:border-brand-500/35 dark:bg-brand-500/15 dark:text-brand-400">
                                            <AirVent size={22} strokeWidth={2.25} aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1 py-0.5">
                                            <h3 className="truncate text-lg font-black leading-tight tracking-tight text-slate-900 dark:text-slate-50">
                                                {title}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="relative mx-4 mb-4 mt-1 rounded-2xl bg-gradient-to-b from-slate-100/90 to-slate-50/40 p-2.5 ring-1 ring-inset ring-slate-200/60 dark:from-white/[0.06] dark:to-transparent dark:ring-white/[0.07]">
                                    <button
                                        type="button"
                                        onClick={() => openAcFromHeaderCard(slot)}
                                        className={`${bessActionBtn} ${pressed ? bessActionBtnActive : ''}`}
                                    >
                                        {actionLabel('ac')}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="ems-card overflow-hidden">
                    <div className="flex min-h-[240px] items-center justify-center p-12">
                        <p className="max-w-md text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                            {t.categoryPlaceholder}
                        </p>
                </div>
            </div>
            )}
        </div>
    );
};

export default ManualControl;
