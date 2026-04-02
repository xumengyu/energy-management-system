
import React from 'react';
import { X, Coins } from 'lucide-react';
import { Language, Coefficients } from '../types';
import { translations } from '../translations';

interface CoefficientsEditModalProps {
    lang: Language;
    isOpen: boolean;
    onClose: () => void;
    coeffs: Coefficients;
    handleCoeffChange: (category: keyof Coefficients, field: string, value: string) => void;
}

const CoefficientsEditModal: React.FC<CoefficientsEditModalProps> = ({
    lang,
    isOpen,
    onClose,
    coeffs,
    handleCoeffChange
}) => {
    const tPrice = translations[lang].priceEditor;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-apple-bg-dark/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-apple-surface-light dark:bg-apple-surface-dark w-full max-w-4xl rounded-[32px] shadow-2xl border border-apple-border-light dark:border-apple-border-dark overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                <div className="p-8 border-b border-apple-border-light dark:border-apple-border-dark flex justify-between items-center bg-apple-bg-light/50 dark:bg-apple-bg-dark/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-500 text-white rounded-2xl shadow-lg shadow-brand-500/20">
                            <Coins size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark text-2xl tracking-tight">
                                {lang === 'zh' ? '编辑发电收益与成本系数' : 'Edit Generation Revenue & Cost Coefficients'}
                            </h3>
                            <p className="text-sm text-apple-text-secondary-light dark:text-apple-text-secondary-dark mt-1">
                                {lang === 'zh' ? '调整各环节的转换系数，以影响策略生成时的经济权重' : 'Adjust coefficients to influence the economic weights in strategy generation.'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark rounded-full text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark transition-all hover:rotate-90">
                        <X size={28} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark flex items-center gap-2 pb-3 border-b border-apple-border-light dark:border-apple-border-dark">
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></span>
                                {tPrice.pvCoeffs}
                            </h4>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest">{tPrice.gridPrice}</label>
                                    <div className="flex items-center border border-apple-border-light dark:border-apple-border-dark rounded-2xl bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                                        <span className="px-4 py-3 text-xs font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark border-r border-apple-border-light dark:border-apple-border-dark bg-apple-bg-light/50 dark:bg-apple-bg-dark/50 shrink-0 font-mono">Ax</span>
                                        <input type="number" step="0.1" value={coeffs.pv.grid} onChange={(e) => handleCoeffChange('pv', 'grid', e.target.value)} className="w-full py-3 px-4 text-sm font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark bg-transparent outline-none"/>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest">{tPrice.localUse}</label>
                                    <div className="flex items-center border border-apple-border-light dark:border-apple-border-dark rounded-2xl bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                                        <span className="px-4 py-3 text-xs font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark border-r border-apple-border-light dark:border-apple-border-dark bg-apple-bg-light/50 dark:bg-apple-bg-dark/50 shrink-0 font-mono">Ax</span>
                                        <input type="number" step="0.1" value={coeffs.pv.local} onChange={(e) => handleCoeffChange('pv', 'local', e.target.value)} className="w-full py-3 px-4 text-sm font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark bg-transparent outline-none"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark flex items-center gap-2 pb-3 border-b border-apple-border-light dark:border-apple-border-dark">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                                {tPrice.storageCharge}
                            </h4>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest">{tPrice.fromPv}</label>
                                    <div className="flex items-center border border-apple-border-light dark:border-apple-border-dark rounded-2xl bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                                        <span className="px-4 py-3 text-xs font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark border-r border-apple-border-light dark:border-apple-border-dark bg-apple-bg-light/50 dark:bg-apple-bg-dark/50 shrink-0 font-mono">Ax</span>
                                        <input type="number" step="0.1" value={coeffs.charge.fromPv} onChange={(e) => handleCoeffChange('charge', 'fromPv', e.target.value)} className="w-full py-3 px-4 text-sm font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark bg-transparent outline-none"/>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest">{tPrice.fromGrid}</label>
                                    <div className="flex items-center border border-apple-border-light dark:border-apple-border-dark rounded-2xl bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                                        <span className="px-4 py-3 text-xs font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark border-r border-apple-border-light dark:border-apple-border-dark bg-apple-bg-light/50 dark:bg-apple-bg-dark/50 shrink-0 font-mono">Ax</span>
                                        <input type="number" step="0.1" value={coeffs.charge.fromGrid} onChange={(e) => handleCoeffChange('charge', 'fromGrid', e.target.value)} className="w-full py-3 px-4 text-sm font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark bg-transparent outline-none"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-sm font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark flex items-center gap-2 pb-3 border-b border-apple-border-light dark:border-apple-border-dark">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
                                {tPrice.storageDischarge}
                            </h4>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest">{tPrice.toGrid}</label>
                                    <div className="flex items-center border border-apple-border-light dark:border-apple-border-dark rounded-2xl bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                                        <span className="px-4 py-3 text-xs font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark border-r border-apple-border-light dark:border-apple-border-dark bg-apple-bg-light/50 dark:bg-apple-bg-dark/50 shrink-0 font-mono">Ax</span>
                                        <input type="number" step="0.1" value={coeffs.discharge.toGrid} onChange={(e) => handleCoeffChange('discharge', 'toGrid', e.target.value)} className="w-full py-3 px-4 text-sm font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark bg-transparent outline-none"/>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest">{tPrice.toLoad}</label>
                                    <div className="flex items-center border border-apple-border-light dark:border-apple-border-dark rounded-2xl bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                                        <span className="px-4 py-3 text-xs font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark border-r border-apple-border-light dark:border-apple-border-dark bg-apple-bg-light/50 dark:bg-apple-bg-dark/50 shrink-0 font-mono">Ax</span>
                                        <input type="number" step="0.1" value={coeffs.discharge.toLoad} onChange={(e) => handleCoeffChange('discharge', 'toLoad', e.target.value)} className="w-full py-3 px-4 text-sm font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark bg-transparent outline-none"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-apple-border-light dark:border-apple-border-dark flex justify-end gap-4 bg-apple-bg-light/50 dark:bg-apple-bg-dark/50">
                    <button 
                        onClick={onClose}
                        className="px-8 h-10 border border-apple-border-light dark:border-apple-border-dark text-apple-text-secondary-light dark:text-apple-text-secondary-dark rounded-full font-bold hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark transition-all"
                    >
                        {lang === 'zh' ? '取消' : 'Cancel'}
                    </button>
                    <button 
                        onClick={onClose}
                        className="px-10 h-10 bg-brand-600 text-white rounded-full text-sm font-bold hover:bg-brand-500 transition-all shadow-lg shadow-brand-500/20"
                    >
                        {lang === 'zh' ? '确定保存' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CoefficientsEditModal;
