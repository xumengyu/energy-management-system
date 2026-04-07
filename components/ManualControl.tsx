import React, { useState } from 'react';
import { Search, Filter, RefreshCw, X } from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

interface ManualControlProps {
    lang: Language;
    theme: Theme;
    selectedStation: string;
}

type ControlCategory = 'dido' | 'ats' | 'diesel' | 'ac' | 'bessPv';

type BessActionKey = 'pcs' | 'bms' | 'ioControl' | 'ups' | 'dehumidifier';

type BessPanelKey = 'bess1' | 'bess2' | 'bess3' | 'bess4';

const BESS_CARD_LAYOUT: { panelKey: BessPanelKey; actions: BessActionKey[] }[] = [
    { panelKey: 'bess1', actions: ['pcs', 'bms', 'ioControl'] },
    { panelKey: 'bess2', actions: ['pcs', 'bms', 'ioControl', 'ups', 'dehumidifier'] },
    { panelKey: 'bess3', actions: ['pcs', 'bms', 'ioControl', 'ups', 'dehumidifier'] },
    { panelKey: 'bess4', actions: ['pcs', 'bms', 'ioControl', 'ups', 'dehumidifier'] },
];

const CATEGORY_ORDER: ControlCategory[] = ['bessPv', 'dido', 'ats', 'diesel', 'ac'];

const btnBlueSolid =
    'inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500';

const btnRed =
    'inline-flex flex-1 items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-800/80 dark:bg-apple-surface-dark dark:text-rose-400 dark:hover:bg-rose-950/40';

const btnGreen =
    'inline-flex flex-1 items-center justify-center rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-emerald-800/80 dark:bg-apple-surface-dark dark:text-emerald-400 dark:hover:bg-emerald-950/35';

const PcsDrawerSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-4">
        <div className="border-l-4 border-blue-600 py-0.5 pl-3 dark:border-blue-400">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">{title}</h3>
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
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-blue-400 md:text-3xl">{value}</p>
        {children ? (
            <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-apple-border-dark">
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
    if (!open || !panelKey) return null;

    return (
        <div
            className="fixed inset-0 z-[115] flex animate-in fade-in justify-end duration-200 bg-slate-900/45 backdrop-blur-[2px] dark:bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pcs-drawer-title"
        >
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
            <aside
                className="animate-in slide-in-from-right relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl duration-300 dark:border-apple-border-dark dark:bg-apple-surface-dark"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-apple-border-dark">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            {t.unitLabel.replace('{unit}', unitTitle)}
                        </p>
                        <h2 id="pcs-drawer-title" className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                            {t.title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-slate-200"
                        aria-label="Close"
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="custom-scrollbar-hide flex-1 overflow-y-auto px-4 pb-8 pt-4">
                    <div className="space-y-10">
                        <PcsDrawerSection title={t.faultStatus}>
                            <div className="ems-card p-5 md:col-span-2">
                                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-8">
                                    <div className="flex min-h-[160px] flex-col gap-4">
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.totalFault}</p>
                                            <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-blue-400 md:text-3xl">
                                                {t.valNormal}
                                            </p>
                                        </div>
                                        <div className="mt-auto border-t border-slate-100 pt-4 dark:border-apple-border-dark">
                                            <button type="button" className={btnBlueSolid}>
                                                {t.faultReset}
                                            </button>
                                        </div>
                                    </div>
                                    <div
                                        className={`flex flex-col justify-center gap-2 md:border-l md:border-slate-100 md:pl-8 dark:md:border-apple-border-dark`}
                                    >
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.totalAlarm}</p>
                                        <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-blue-400 md:text-3xl">
                                            {t.valNormal}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </PcsDrawerSection>

                        <PcsDrawerSection title={t.powerOnStatus}>
                            <PcsMetricCard label={t.powerSwitch} value={t.valCharge}>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <button type="button" className={`${btnRed} w-full sm:flex-1`}>
                                        {t.deviceShutdown}
                                    </button>
                                    <button type="button" className={`${btnGreen} w-full sm:flex-1`}>
                                        {t.deviceStartup}
                                    </button>
                                </div>
                            </PcsMetricCard>
                            <PcsMetricCard label={t.offGrid} value={t.valGridTied}>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <button type="button" className={`${btnRed} w-full sm:flex-1`}>
                                        {t.gridConnect}
                                    </button>
                                    <button type="button" className={`${btnGreen} w-full sm:flex-1`}>
                                        {t.gridDisconnect}
                                    </button>
                                </div>
                            </PcsMetricCard>
                        </PcsDrawerSection>
                    </div>
                </div>
            </aside>
        </div>
    );
};

const ManualControl: React.FC<ManualControlProps> = ({ lang, theme: _theme, selectedStation: _selectedStation }) => {
    const t = translations[lang].manualControl;
    const [activeCategory, setActiveCategory] = useState<ControlCategory>('bessPv');
    const [searchTerm, setSearchTerm] = useState('');
    const [lastHit, setLastHit] = useState<{ panel: string; action: BessActionKey } | null>(null);
    const [pcsDrawer, setPcsDrawer] = useState<{ open: boolean; panelKey: BessPanelKey | null }>({
        open: false,
        panelKey: null,
    });

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

    const outlineBtn =
        'flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark';

    const onBessAction = (panelKey: BessPanelKey, key: BessActionKey) => {
        setLastHit({ panel: panelKey, action: key });
        if (key === 'pcs') {
            setPcsDrawer({ open: true, panelKey });
        }
    };

    const drawerUnitTitle = pcsDrawer.panelKey ? t.bessPanels[pcsDrawer.panelKey] : '';

    return (
        <div className="ems-page-shell">
            <PcsControlDrawer
                open={pcsDrawer.open}
                panelKey={pcsDrawer.panelKey}
                unitTitle={drawerUnitTitle}
                onClose={() => setPcsDrawer({ open: false, panelKey: null })}
                lang={lang}
            />

            {/* 顶栏：与电价列表 PriceList 同款结构 */}
            <div className="ems-card mb-4 flex flex-col items-center justify-between gap-4 p-4 md:flex-row">
                <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row md:items-center md:gap-6">
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

                    <div className="hidden h-8 w-px shrink-0 bg-slate-200 md:block dark:bg-white/10" />

                    <div className="relative w-full md:w-64">
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

                <div className="flex w-full items-center justify-end gap-3 md:w-auto">
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                    >
                        <Filter size={16} />
                        {t.filter}
                    </button>
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark"
                        title={t.refresh}
                    >
                        <RefreshCw size={16} />
                        {t.refresh}
                    </button>
                </div>
            </div>

            {activeCategory === 'bessPv' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {BESS_CARD_LAYOUT.map(({ panelKey, actions }) => (
                        <div key={panelKey} className="ems-card flex flex-col overflow-hidden p-6">
                            <h3 className="mb-5 text-center text-base font-bold text-slate-800 dark:text-slate-200">
                                {t.bessPanels[panelKey]}
                            </h3>
                            <div className="flex flex-col gap-3">
                                {actions.map((key) => {
                                    const pressed = lastHit?.panel === panelKey && lastHit?.action === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => onBessAction(panelKey, key)}
                                            className={`${outlineBtn} ${
                                                pressed
                                                    ? 'border-blue-500 bg-blue-50/50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/20 dark:text-blue-300'
                                                    : ''
                                            }`}
                                        >
                                            {actionLabel(key)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
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
