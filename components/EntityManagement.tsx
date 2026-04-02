
import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, ShieldCheck, Network, Mail, CreditCard, Lock, ArrowLeft, Search, Plus, 
    MoreVertical, UserMinus, ShieldAlert, Edit2, ChevronRight, Building, CheckCircle2,
    DollarSign, FileText, Smartphone, Key, Monitor, Activity, ExternalLink, 
    Tag, Briefcase, Info, Check, Copy, Trash2, ArrowRight, Loader2,
    ChevronLeft, ChevronDown, Zap, Clock, ChevronDownCircle, PlusCircle, Trash,
    LayoutDashboard, GitBranch, DollarSign as TradingIcon, Factory, Filter, CheckSquare, Square
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

interface EntityManagementProps {
    lang: Language;
    theme: Theme;
    onBack: () => void;
}

type ManagementModule = 'admins' | 'structure' | 'invitations' | 'subscription' | 'bills' | 'security';

const EntityManagement: React.FC<EntityManagementProps> = ({ lang, theme, onBack }) => {
    const t = translations[lang].entityMgmt;
    const [activeModule, setActiveModule] = useState<ManagementModule>('admins');

    // --- Sidebar Menu Groups ---
    const menuGroups = [
        {
            title: t.menu.personnel,
            items: [
                { id: 'admins', label: t.menu.admins, icon: Users },
                { id: 'structure', label: t.menu.structure, icon: Network },
                { id: 'invitations', label: t.menu.invitations, icon: Mail },
            ]
        },
        {
            title: t.menu.billing,
            items: [
                { id: 'subscription', label: t.menu.subscription, icon: CreditCard },
                { id: 'bills', label: t.menu.bills, icon: DollarSign },
            ]
        },
        {
            title: t.menu.security,
            items: [
                { id: 'security', label: t.menu.security, icon: Lock },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-apple-bg-light dark:bg-apple-bg-dark flex animate-in fade-in duration-500 overflow-hidden text-slate-800 dark:text-slate-100">
            {/* Left Management Sidebar - 保持结构不变 */}
            <aside className="w-64 bg-white dark:bg-apple-surface-dark border-r border-slate-200 dark:border-apple-border-dark flex flex-col h-screen shrink-0">
                <div className="p-4 border-b border-slate-100 dark:border-apple-border-dark bg-slate-50/50 dark:bg-apple-surface-secondary-dark/30">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors mb-3 group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        {t.backToEms}
                    </button>
                    <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="text-brand-500" size={20}/>
                        {t.title}
                    </h1>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
                    {menuGroups.map((group, idx) => (
                        <div key={idx}>
                            <h3 className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{group.title}</h3>
                            <div className="space-y-0.5">
                                {group.items.map(item => {
                                    const isActive = activeModule === item.id;
                                    return (
                                        <button 
                                            key={item.id}
                                            onClick={() => setActiveModule(item.id as ManagementModule)}
                                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all
                                                ${activeModule === item.id 
                                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' 
                                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark hover:text-slate-900 dark:hover:text-slate-200'}`}
                                        >
                                            <item.icon size={16} className={activeModule === item.id ? 'text-white' : 'text-slate-400'} />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-apple-border-dark bg-slate-50/50 dark:bg-apple-surface-secondary-dark/30 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-sm font-black text-sm">EC</div>
                        <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">EcoWatt Ltd.</div>
                            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Enterprise ID: 8849</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Content Area - 已清空内容部分 */}
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-apple-bg-light dark:bg-apple-bg-dark">
                {/* 此区域现已清空，仅作为空白展示 */}
            </main>
        </div>
    );
};

export default EntityManagement;
