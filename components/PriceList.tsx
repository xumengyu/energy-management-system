
import React, { useState } from 'react';
import { 
    Search, Plus, Filter, MoreHorizontal, Edit, MapPin, Zap, Calendar, CheckCircle2, Clock, AlertTriangle, User, Globe
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';
import { PRICE_SCHEMES_EN, PRICE_SCHEMES_ZH } from '../data/priceSchemes';

interface PriceListProps {
    lang: Language;
    theme: Theme;
}

const PriceList: React.FC<PriceListProps> = ({ lang, theme }) => {
    const t = translations[lang].priceList;
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'user' | 'api'>('user');
    
    const schemes = lang === 'zh' ? PRICE_SCHEMES_ZH : PRICE_SCHEMES_EN;

    // Filter by Tab (User vs API) AND Search Term
    const filteredSchemes = schemes.filter(item => {
        const matchesTab = activeTab === 'user' ? item.source === 'User' : item.source === 'API';
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              item.id.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        if (status === 'Active' || status === 'Connected') {
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"><CheckCircle2 size={12}/> {status === 'Connected' ? t.status.connected : t.status.active}</span>
        }
        if (status === 'Draft') {
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-apple-surface-secondary-dark text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-apple-border-dark"><Edit size={12}/> {t.status.draft}</span>
        }
        if (status === 'Error') {
            return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"><AlertTriangle size={12}/> {t.status.error}</span>
        }
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"><Clock size={12}/> {t.status.expired}</span>
    }

    return (
        <div className="ems-page-shell">
            {/* Header / Toolbar */}
            <div className="ems-card p-4 mb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Tabs & Title */}
                <div className="flex items-center gap-6 w-full md:w-auto">
                    {/* Tab Switcher */}
                    <div className="ems-segmented">
                        <button 
                            onClick={() => setActiveTab('user')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all
                            ${activeTab === 'user' 
                                ? 'bg-white dark:bg-apple-surface-dark text-blue-600 dark:text-blue-400 shadow-sm' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        >
                            <User size={16} />
                            {t.tabUser}
                        </button>
                        <button 
                            onClick={() => setActiveTab('api')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all
                            ${activeTab === 'api' 
                                ? 'bg-white dark:bg-apple-surface-dark text-purple-600 dark:text-purple-400 shadow-sm' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        >
                            <Globe size={16} />
                            {t.tabApi}
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 dark:bg-white/10 hidden md:block"></div>

                    {/* Search */}
                    <div className="relative w-full md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder={t.search} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all"
                        />
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-apple-surface-dark hover:bg-slate-50 dark:hover:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark rounded-xl transition-colors">
                        <Filter size={16} /> {t.filter}
                    </button>
                    {activeTab === 'user' && (
                        <button className="flex items-center gap-2 px-4 py-2 text-white rounded-xl shadow-md text-sm font-bold transition-all hover:-translate-y-0.5 bg-blue-600 hover:bg-blue-700 shadow-blue-500/20">
                            <Plus size={18} /> {t.add}
                        </button>
                    )}
                </div>
            </div>

            {/* List Table */}
            <div className="ems-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-apple-surface-secondary-dark/50 border-b border-slate-100 dark:border-apple-border-dark font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">{t.colName}</th>
                                <th className="px-6 py-4">{t.colRegion}</th>
                                {activeTab === 'user' && <th className="px-6 py-4">{t.colVoltage}</th>}
                                {activeTab === 'user' && <th className="px-6 py-4">{t.colType}</th>}
                                {activeTab === 'user' && <th className="px-6 py-4">{t.colValidity}</th>}
                                
                                {activeTab === 'api' && <th className="px-6 py-4">{t.colProvider}</th>}
                                {activeTab === 'api' && <th className="px-6 py-4">{t.colFrequency}</th>}

                                <th className="px-6 py-4">{t.colStatus}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                            {filteredSchemes.map((item) => (
                                <tr key={item.id} className={`transition-colors group ${activeTab === 'user' ? 'hover:bg-blue-50/30 dark:hover:bg-blue-900/10' : 'hover:bg-purple-50/30 dark:hover:bg-purple-900/10'}`}>
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {item.name}
                                            </div>
                                            <div className="text-xs text-slate-400 font-mono">{item.id}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                            <MapPin size={14} className="text-slate-400" />
                                            {item.region}
                                        </div>
                                    </td>
                                    
                                    {/* User Columns */}
                                    {activeTab === 'user' && (
                                        <>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono">{item.voltage}</td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.userType}</td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={14}/>
                                                    {item.validFrom} <span className="text-slate-300">→</span> {item.validTo}
                                                </div>
                                            </td>
                                        </>
                                    )}

                                    {/* API Columns */}
                                    {activeTab === 'api' && (
                                        <>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                                                {item.provider}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-apple-surface-secondary-dark border border-slate-200 dark:border-apple-border-dark px-2 py-1 rounded text-xs font-bold">
                                                    <Clock size={12} className="text-purple-500"/>
                                                    {item.frequency}
                                                </span>
                                            </td>
                                        </>
                                    )}

                                    <td className="px-6 py-4">
                                        {getStatusBadge(item.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Empty State / Pagination Placeholder */}
                {filteredSchemes.length === 0 && (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-apple-surface-secondary-dark rounded-full flex items-center justify-center mb-4">
                            <Search className="text-slate-300 dark:text-slate-500" size={32} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No price schemes found.</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try adjusting your search or tab.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PriceList;
