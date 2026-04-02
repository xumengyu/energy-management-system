
import React from 'react';
import { X, DollarSign, User, Globe, FileText, CheckCircle2, Database } from 'lucide-react';
import { Language, PriceRow } from '../types';
import { translations } from '../translations';

interface PriceSelectionModalProps {
    lang: Language;
    isOpen: boolean;
    onClose: () => void;
    modalPriceTab: 'user' | 'api';
    setModalPriceTab: (tab: 'user' | 'api') => void;
    userSchemes: PriceRow[];
    systemSchemes: PriceRow[];
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
    setSelectedPriceSchemeId
}) => {
    const tPList = translations[lang].priceList;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-apple-bg-dark/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-apple-surface-light dark:bg-apple-surface-dark w-full max-w-4xl rounded-[32px] shadow-2xl border border-apple-border-light dark:border-apple-border-dark overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-apple-border-light dark:border-apple-border-dark flex justify-between items-center bg-apple-bg-light/50 dark:bg-apple-bg-dark/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-500/20">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark text-xl tracking-tight">
                                {lang === 'zh' ? '配置关联电价' : 'Configure Price Scheme'}
                            </h3>
                            <p className="text-sm text-apple-text-secondary-light dark:text-apple-text-secondary-dark mt-1">
                                {lang === 'zh' ? '为当前策略选择基准电价，以进行收益优化与经济分析' : 'Select a base price scheme for revenue optimization and analysis.'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark rounded-full text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark transition-all hover:rotate-90">
                        <X size={24} />
                    </button>
                </div>

                <div className="px-6 pt-6 pb-2">
                    <div className="flex bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark p-1 rounded-2xl border border-apple-border-light dark:border-apple-border-dark w-fit shadow-sm">
                        <button 
                            onClick={() => setModalPriceTab('user')}
                            className={`px-8 h-9 rounded-xl text-[10px] font-bold flex items-center gap-2 transition-all uppercase tracking-widest
                            ${modalPriceTab === 'user' 
                                ? 'bg-apple-surface-light dark:bg-apple-surface-dark text-blue-600 dark:text-blue-400 shadow-sm border border-apple-border-light dark:border-apple-border-dark' 
                                : 'text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:text-apple-text-primary-light dark:hover:text-apple-text-primary-dark'}`}
                        >
                            <User size={14} />
                            {tPList.tabUser}
                        </button>
                        <button 
                            onClick={() => setModalPriceTab('api')}
                            className={`px-8 h-9 rounded-xl text-[10px] font-bold flex items-center gap-2 transition-all uppercase tracking-widest
                            ${modalPriceTab === 'api' 
                                ? 'bg-apple-surface-light dark:bg-apple-surface-dark text-purple-600 dark:text-purple-400 shadow-sm border border-apple-border-light dark:border-apple-border-dark' 
                                : 'text-apple-text-secondary-light dark:text-apple-text-secondary-dark hover:text-apple-text-primary-light dark:hover:text-apple-text-primary-dark'}`}
                        >
                            <Globe size={14} />
                            {tPList.tabApi}
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {modalPriceTab === 'user' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {userSchemes.map(scheme => {
                                const isSelected = selectedPriceSchemeId === scheme.id;
                                return (
                                    <button 
                                        key={scheme.id}
                                        onClick={() => setSelectedPriceSchemeId(scheme.id)}
                                        className={`group p-6 rounded-[24px] transition-all text-left border flex flex-col justify-between min-h-[180px] shadow-sm
                                            ${isSelected 
                                                ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500 ring-1 ring-blue-500' 
                                                : 'bg-apple-surface-light dark:bg-apple-surface-dark text-apple-text-secondary-light dark:text-apple-text-secondary-dark border-apple-border-light dark:border-apple-border-dark hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark border border-apple-border-light dark:border-apple-border-dark'}`}>
                                                    <FileText size={24}/>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 tracking-tight text-apple-text-primary-light dark:text-apple-text-primary-dark">{scheme.name}</div>
                                                    <div className="text-[10px] font-mono font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest mt-2">ID: {scheme.id}</div>
                                                </div>
                                            </div>
                                            {isSelected && <CheckCircle2 size={28} className="text-blue-600 shrink-0"/>}
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-apple-border-light dark:border-apple-border-dark">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest mb-1">{tPList.colRegion}</span>
                                                <span className="text-xs font-bold truncate text-apple-text-primary-light dark:text-apple-text-primary-dark">{scheme.region}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest mb-1">{tPList.colVoltage}</span>
                                                <span className="text-xs font-bold truncate text-apple-text-primary-light dark:text-apple-text-primary-dark">{scheme.voltage}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest mb-1">{tPList.colType}</span>
                                                <span className="text-xs font-bold truncate text-apple-text-primary-light dark:text-apple-text-primary-dark">{scheme.type}</span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {systemSchemes.map(scheme => {
                                const isSelected = selectedPriceSchemeId === scheme.id;
                                return (
                                    <button 
                                        key={scheme.id}
                                        onClick={() => setSelectedPriceSchemeId(scheme.id)}
                                        className={`group p-6 rounded-[24px] transition-all text-left border flex flex-col justify-between min-h-[180px] shadow-sm
                                            ${isSelected 
                                                ? 'bg-purple-500/5 dark:bg-purple-500/10 border-purple-500 ring-1 ring-purple-500' 
                                                : 'bg-apple-surface-light dark:bg-apple-surface-dark text-apple-text-secondary-light dark:text-apple-text-secondary-dark border-apple-border-light dark:border-apple-border-dark hover:border-purple-500/50 dark:hover:border-purple-500/50 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark'}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl ${isSelected ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark border border-apple-border-light dark:border-apple-border-dark'}`}>
                                                    <Globe size={24}/>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 tracking-tight text-apple-text-primary-light dark:text-apple-text-primary-dark">{scheme.name}</div>
                                                    <div className="text-[10px] font-mono font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest mt-2">ID: {scheme.id}</div>
                                                </div>
                                            </div>
                                            {isSelected && <CheckCircle2 size={28} className="text-purple-600 shrink-0"/>}
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-apple-border-light dark:border-apple-border-dark">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest mb-1">{tPList.colRegion}</span>
                                                <span className="text-xs font-bold truncate text-apple-text-primary-light dark:text-apple-text-primary-dark">{scheme.region}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest mb-1">{tPList.colProvider}</span>
                                                <span className="text-xs font-bold truncate text-apple-text-primary-light dark:text-apple-text-primary-dark">{scheme.provider}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest mb-1">{tPList.colFrequency}</span>
                                                <span className="text-xs font-bold truncate text-apple-text-primary-light dark:text-apple-text-primary-dark">{scheme.frequency}</span>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {((modalPriceTab === 'user' && userSchemes.length === 0) || (modalPriceTab === 'api' && systemSchemes.length === 0)) && (
                        <div className="h-48 flex flex-col items-center justify-center text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark">
                            <Database size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-semibold">{lang === 'zh' ? '暂无匹配的电价方案' : 'No matching price schemes found.'}</p>
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-apple-border-light dark:border-apple-border-dark flex flex-col sm:flex-row justify-between items-center gap-6 bg-apple-bg-light/50 dark:bg-apple-bg-dark/50">
                    <div className="text-sm font-semibold text-apple-text-secondary-light dark:text-apple-text-secondary-dark">
                        {lang === 'zh' ? '已选择：' : 'Selected: '}
                        <span className="font-bold text-brand-600 dark:text-brand-400 ml-2 text-base">
                            {[...userSchemes, ...systemSchemes].find(s => s.id === selectedPriceSchemeId)?.name || '-'}
                        </span>
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <button 
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-8 h-10 border border-apple-border-light dark:border-apple-border-dark text-apple-text-secondary-light dark:text-apple-text-secondary-dark rounded-full font-bold hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark transition-all"
                        >
                            {lang === 'zh' ? '取消' : 'Cancel'}
                        </button>
                        <button 
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-10 h-10 bg-brand-600 text-white rounded-full text-sm font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/20"
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
