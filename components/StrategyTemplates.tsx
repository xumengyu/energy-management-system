
import React, { useState } from 'react';
import { 
    LayoutTemplate, Search, Plus, Upload, Filter, MoreHorizontal, Edit, Trash2, Copy, CheckCircle2, Clock, Zap, Lock, Shield
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

// Mock Data for Templates
const TEMPLATES_ZH = [
    { id: 'SYS-001', name: '收益最大化 AI 策略', type: 'algo', created: '2024-01-01', author: '系统内置', status: 'published', isSystem: true },
    { id: 'TPL-001', name: '夏季削峰填谷策略', type: 'time', created: '2025-05-10', author: '管理员', status: 'published', isSystem: false },
    { id: 'TPL-002', name: '应急备电 (台风模式)', type: 'event', created: '2025-06-15', author: '张工', status: 'published', isSystem: false },
    { id: 'TPL-003', name: '需量控制优先', type: 'algo', created: '2025-08-20', author: 'AI 助手', status: 'draft', isSystem: false },
    { id: 'TPL-004', name: '春节保电策略', type: 'time', created: '2025-01-20', author: '管理员', status: 'published', isSystem: false },
    { id: 'TPL-005', name: '光储协同优化 V2', type: 'algo', created: '2025-09-01', author: '李工', status: 'draft', isSystem: false },
];

const TEMPLATES_EN = [
    { id: 'SYS-001', name: 'Profit Maximization AI', type: 'algo', created: '2024-01-01', author: 'System', status: 'published', isSystem: true },
    { id: 'TPL-001', name: 'Summer Peak Shaving', type: 'time', created: '2025-05-10', author: 'Admin', status: 'published', isSystem: false },
    { id: 'TPL-002', name: 'Emergency Backup (Storm)', type: 'event', created: '2025-06-15', author: 'Eng. Zhang', status: 'published', isSystem: false },
    { id: 'TPL-003', name: 'Demand Control Priority', type: 'algo', created: '2025-08-20', author: 'AI Assistant', status: 'draft', isSystem: false },
    { id: 'TPL-004', name: 'Holiday Power Keep', type: 'time', created: '2025-01-20', author: 'Admin', status: 'published', isSystem: false },
    { id: 'TPL-005', name: 'PV-BESS Opt V2', type: 'algo', created: '2025-09-01', author: 'Eng. Li', status: 'draft', isSystem: false },
];

interface StrategyTemplatesProps {
    lang: Language;
    theme: Theme;
}

const StrategyTemplates: React.FC<StrategyTemplatesProps> = ({ lang, theme }) => {
    const t = translations[lang].strategyTemplates;
    const [searchTerm, setSearchTerm] = useState('');
    
    const templates = lang === 'zh' ? TEMPLATES_ZH : TEMPLATES_EN;

    const filteredTemplates = templates.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTypeLabel = (type: string) => {
        return t.types[type as keyof typeof t.types] || type;
    };

    const getTypeIcon = (type: string) => {
        if (type === 'time') return <Clock size={16} className="text-blue-500" />;
        if (type === 'event') return <Zap size={16} className="text-amber-500" />;
        return <LayoutTemplate size={16} className="text-purple-500" />;
    };

    return (
        <div className="ems-page-shell">
            {/* Header / Toolbar */}
            <div className="ems-card p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-xl">
                            <LayoutTemplate size={24} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{t.title}</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total: {templates.length}</p>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden md:block mx-2"></div>
                    <div className="relative w-full md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder={t.search} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-apple-surface-dark hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-xl transition-colors">
                        <Upload size={16} /> {t.import}
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md shadow-brand-500/20 text-sm font-bold transition-all hover:-translate-y-0.5">
                        <Plus size={18} /> {t.create}
                    </button>
                </div>
            </div>

            {/* Template List Table */}
            <div className="ems-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-apple-surface-secondary-dark/50 border-b border-slate-100 dark:border-apple-border-dark font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">{t.colName}</th>
                                <th className="px-6 py-4">{t.colType}</th>
                                <th className="px-6 py-4">{t.colCreated}</th>
                                <th className="px-6 py-4">{t.colAuthor}</th>
                                <th className="px-6 py-4">{t.colStatus}</th>
                                <th className="px-6 py-4 text-right">{t.colAction}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                            {filteredTemplates.map((tpl) => (
                                <tr key={tpl.id} className={`group transition-colors ${tpl.isSystem ? 'bg-slate-50/30 dark:bg-brand-900/5' : 'hover:bg-brand-50/30 dark:hover:bg-brand-900/10'}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${tpl.isSystem ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400' : 'bg-slate-100 dark:bg-apple-surface-secondary-dark border-slate-200 dark:border-apple-border-dark text-slate-500 dark:text-slate-400'}`}>
                                                {tpl.isSystem ? <Shield size={20}/> : <LayoutTemplate size={20}/>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-2">
                                                    {tpl.name}
                                                    {tpl.isSystem && <span title="System Locked"><Lock size={12} className="text-slate-400" /></span>}
                                                </div>
                                                <div className="text-xs text-slate-400 font-mono">{tpl.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium bg-slate-50 dark:bg-apple-surface-secondary-dark px-2 py-1 rounded-md w-fit border border-slate-100 dark:border-apple-border-dark">
                                            {getTypeIcon(tpl.type)}
                                            {getTypeLabel(tpl.type)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">
                                        {tpl.created}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${tpl.isSystem ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                                {tpl.author.charAt(0)}
                                            </div>
                                            <span className={`font-medium ${tpl.isSystem ? 'text-brand-700 dark:text-brand-400' : 'text-slate-700 dark:text-slate-300'}`}>{tpl.author}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
                                            ${tpl.status === 'published' 
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' 
                                                : 'bg-slate-100 dark:bg-apple-surface-secondary-dark text-slate-500 dark:text-slate-400 border-slate-200 dark:border-apple-border-dark'}`}>
                                            {tpl.status === 'published' ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                                            {tpl.status === 'published' ? t.status.published : t.status.draft}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                            {tpl.isSystem ? (
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-apple-surface-secondary-dark px-2 py-1 rounded border border-slate-200 dark:border-apple-border-dark select-none cursor-not-allowed">
                                                    System
                                                </span>
                                            ) : (
                                                <>
                                                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded-lg text-slate-500 hover:text-blue-600 transition-colors" title={t.actions.edit}>
                                                        <Edit size={16} />
                                                    </button>
                                                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-apple-surface-secondary-dark rounded-lg text-slate-500 hover:text-brand-600 transition-colors" title={t.actions.duplicate}>
                                                        <Copy size={16} />
                                                    </button>
                                                    <button className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-500 hover:text-red-600 transition-colors" title={t.actions.delete}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Empty State / Pagination Placeholder */}
                {filteredTemplates.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        No templates found matching your search.
                    </div>
                )}
            </div>
        </div>
    );
};

export default StrategyTemplates;
