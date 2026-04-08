
import React, { useMemo, useState } from 'react';
import {
    X,
    DollarSign,
    User,
    Globe,
    Search,
    MapPin,
    Calendar,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Edit,
} from 'lucide-react';
import { Language } from '../types';
import type { PriceScheme } from '../data/priceSchemes';
import { translations } from '../translations';

interface PriceSelectionModalProps {
    lang: Language;
    isOpen: boolean;
    onClose: () => void;
    modalPriceTab: 'user' | 'api';
    setModalPriceTab: (tab: 'user' | 'api') => void;
    userSchemes: PriceScheme[];
    systemSchemes: PriceScheme[];
    selectedPriceSchemeId: string;
    setSelectedPriceSchemeId: (id: string) => void;
}

const PriceSelectionModal: React.FC<PriceSelectionModalProps> = ({
    lang,
    isOpen,
    onClose,
    modalPriceTab,
    setModalPriceTab,
    userSchemes,
    systemSchemes,
    selectedPriceSchemeId,
    setSelectedPriceSchemeId,
}) => {
    const tPList = translations[lang].priceList;
    const [searchTerm, setSearchTerm] = useState('');

    const rows = modalPriceTab === 'user' ? userSchemes : systemSchemes;

    const filteredRows = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter(
            (item) =>
                item.name.toLowerCase().includes(q) ||
                item.id.toLowerCase().includes(q) ||
                item.region.toLowerCase().includes(q),
        );
    }, [rows, searchTerm]);

    const getStatusBadge = (status: string) => {
        if (status === 'Active' || status === 'Connected') {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 size={12} /> {status === 'Connected' ? tPList.status.connected : tPList.status.active}
                </span>
            );
        }
        if (status === 'Draft') {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-400">
                    <Edit size={12} /> {tPList.status.draft}
                </span>
            );
        }
        if (status === 'Error') {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <AlertTriangle size={12} /> {tPList.status.error}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-600 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                <Clock size={12} /> {tPList.status.expired}
            </span>
        );
    };

    if (!isOpen) return null;

    const activeTab = modalPriceTab;

    return (
        <div className="fixed inset-0 z-[100] flex animate-in items-center justify-center bg-apple-bg-dark/40 p-4 backdrop-blur-md duration-300 fade-in">
            <div className="flex max-h-[90vh] w-full max-w-6xl animate-in flex-col overflow-hidden rounded-[32px] border border-apple-border-light bg-apple-surface-light shadow-2xl duration-300 zoom-in-95 dark:border-apple-border-dark dark:bg-apple-surface-dark">
                <div className="flex items-center justify-between border-b border-apple-border-light bg-apple-bg-light/50 p-6 dark:border-apple-border-dark dark:bg-apple-bg-dark/50">
                    <div className="flex items-center gap-4">
                        <div className="rounded-2xl bg-brand-600 p-3 text-white shadow-lg shadow-brand-500/20">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold tracking-tight text-apple-text-primary-light dark:text-apple-text-primary-dark">
                                {lang === 'zh' ? '配置关联电价' : 'Configure Price Scheme'}
                            </h3>
                            <p className="mt-1 text-sm text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                                {lang === 'zh'
                                    ? '为当前策略选择基准电价，以进行收益优化与经济分析'
                                    : 'Select a base price scheme for revenue optimization and analysis.'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-apple-text-tertiary-light transition-all hover:rotate-90 hover:bg-apple-surface-secondary-light dark:text-apple-text-tertiary-dark dark:hover:bg-apple-surface-secondary-dark"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* 工具条：与电价列表同款分段 + 搜索 */}
                <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 dark:border-apple-border-dark md:flex-row md:items-center md:justify-between">
                    <div className="ems-segmented w-fit">
                        <button 
                            type="button"
                            onClick={() => setModalPriceTab('user')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                                activeTab === 'user'
                                    ? 'bg-white text-blue-600 shadow-sm dark:bg-apple-surface-dark dark:text-blue-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <User size={16} />
                            {tPList.tabUser}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setModalPriceTab('api')}
                            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                                activeTab === 'api'
                                    ? 'bg-white text-purple-600 shadow-sm dark:bg-apple-surface-dark dark:text-purple-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                        >
                            <Globe size={16} />
                            {tPList.tabApi}
                        </button>
                    </div>
                    <div className="relative w-full md:max-w-xs">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={tPList.search}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-100 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:focus:ring-blue-900"
                        />
                    </div>
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto px-0 pb-2 pt-0">
                    <div className="ems-card mx-4 mb-4 overflow-hidden border-slate-200 dark:border-apple-border-dark">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-4">{tPList.colName}</th>
                                        <th className="px-6 py-4">{tPList.colRegion}</th>
                                        {activeTab === 'user' && <th className="px-6 py-4">{tPList.colVoltage}</th>}
                                        {activeTab === 'user' && <th className="px-6 py-4">{tPList.colType}</th>}
                                        {activeTab === 'user' && <th className="px-6 py-4">{tPList.colValidity}</th>}
                                        {activeTab === 'api' && <th className="px-6 py-4">{tPList.colProvider}</th>}
                                        {activeTab === 'api' && <th className="px-6 py-4">{tPList.colFrequency}</th>}
                                        <th className="px-6 py-4">{tPList.colStatus}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                                    {filteredRows.map((item) => {
                                        const isSelected = selectedPriceSchemeId === item.id;
                                return (
                                            <tr
                                                key={item.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setSelectedPriceSchemeId(item.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        setSelectedPriceSchemeId(item.id);
                                                    }
                                                }}
                                                className={`cursor-pointer transition-colors group ${
                                                    activeTab === 'user'
                                                        ? 'hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
                                                        : 'hover:bg-purple-50/30 dark:hover:bg-purple-900/10'
                                                } ${isSelected ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-400/30 dark:bg-blue-900/20' : ''}`}
                                            >
                                                <td className="px-6 py-4">
                                                <div>
                                                        <div
                                                            className={`font-bold text-slate-800 transition-colors dark:text-slate-200 ${
                                                                activeTab === 'user'
                                                                    ? 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                                                    : 'group-hover:text-purple-600 dark:group-hover:text-purple-400'
                                                            }`}
                                                        >
                                                            {item.name}
                                                </div>
                                                        <div className="font-mono text-xs text-slate-400">{item.id}</div>
                                            </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                                        <MapPin size={14} className="text-slate-400" />
                                                        {item.region}
                                        </div>
                                                </td>
                                                {activeTab === 'user' && (
                                                    <>
                                                        <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{item.voltage}</td>
                                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.userType}</td>
                                                        <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar size={14} />
                                                                {item.validFrom} <span className="text-slate-300">→</span> {item.validTo}
                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                                {activeTab === 'api' && (
                                                    <>
                                                        <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">{item.provider}</td>
                                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                            <span className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-bold dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark">
                                                                <Clock size={12} className="text-purple-500" />
                                                                {item.frequency}
                                                            </span>
                                                        </td>
                                                    </>
                                                )}
                                                <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                                            </tr>
                                );
                            })}
                                </tbody>
                            </table>
                        </div>
                        {filteredRows.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-apple-surface-secondary-dark">
                                    <Search className="text-slate-300 dark:text-slate-500" size={32} />
                                                </div>
                                <p className="font-medium text-slate-500 dark:text-slate-400">
                                    {lang === 'zh' ? '暂无匹配的电价方案' : 'No matching price schemes found.'}
                                </p>
                                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                    {lang === 'zh' ? '请尝试调整搜索或切换标签。' : 'Try adjusting your search or tab.'}
                                </p>
                        </div>
                    )}
                        </div>
                </div>

                <div className="flex flex-col items-center justify-between gap-6 border-t border-apple-border-light bg-apple-bg-light/50 p-6 dark:border-apple-border-dark dark:bg-apple-bg-dark/50 sm:flex-row">
                    <div className="text-sm font-semibold text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                        {lang === 'zh' ? '已选择：' : 'Selected: '}
                        <span className="ml-2 text-base font-bold text-brand-600 dark:text-brand-400">
                            {[...userSchemes, ...systemSchemes].find((s) => s.id === selectedPriceSchemeId)?.name || '-'}
                        </span>
                    </div>
                    <div className="flex w-full gap-4 sm:w-auto">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="h-10 flex-1 rounded-full border border-apple-border-light px-8 font-bold text-apple-text-secondary-light transition-all hover:bg-apple-surface-secondary-light dark:border-apple-border-dark dark:text-apple-text-secondary-dark dark:hover:bg-apple-surface-secondary-dark sm:flex-none"
                        >
                            {lang === 'zh' ? '取消' : 'Cancel'}
                        </button>
                        <button 
                            type="button"
                            onClick={onClose}
                            className="h-10 flex-1 rounded-full bg-brand-600 px-10 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-500 sm:flex-none"
                        >
                            {lang === 'zh' ? '确定应用' : 'Apply Scheme'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PriceSelectionModal;
