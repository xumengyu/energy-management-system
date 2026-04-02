
import React from 'react';
import { X, ShieldCheck, AlertCircle, Loader2, Download, CheckCircle2 } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface DeployModalProps {
    lang: Language;
    isOpen: boolean;
    onClose: () => void;
    verificationCode: string;
    inputCode: string;
    setInputCode: (code: string) => void;
    onVerify: () => void;
    error: boolean;
    success: boolean;
}

const DeployModal: React.FC<DeployModalProps> = ({
    lang,
    isOpen,
    onClose,
    verificationCode,
    inputCode,
    setInputCode,
    onVerify,
    error,
    success
}) => {
    const t = translations[lang].strategyManager.deployModal;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-apple-bg-dark/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-apple-surface-light dark:bg-apple-surface-dark w-full max-w-md rounded-[32px] shadow-2xl border border-apple-border-light dark:border-apple-border-dark overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-apple-border-light dark:border-apple-border-dark flex justify-between items-center bg-apple-bg-light/50 dark:bg-apple-bg-dark/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl shadow-lg transition-colors ${success ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-brand-600 shadow-brand-500/20'}`}>
                            <ShieldCheck size={20} className="text-white" />
                        </div>
                        <h3 className="font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark tracking-tight">
                            {success ? t.success : t.title}
                        </h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark rounded-full text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark transition-all hover:rotate-90"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {success ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={40} />
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark">{t.success}</h4>
                                <p className="text-sm text-apple-text-secondary-light dark:text-apple-text-secondary-dark mt-2">
                                    {lang === 'zh' ? '策略已成功下发至边缘网关。' : 'Strategy has been successfully deployed to the edge gateway.'}
                                </p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="mt-4 px-8 h-12 bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark text-apple-text-primary-light dark:text-apple-text-primary-dark rounded-2xl font-bold hover:bg-apple-border-light dark:hover:bg-apple-border-dark transition-all"
                            >
                                {lang === 'zh' ? '关闭' : 'Close'}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark p-4 rounded-2xl border border-apple-border-light dark:border-apple-border-dark">
                                <p className="text-sm text-apple-text-secondary-light dark:text-apple-text-secondary-dark leading-relaxed">
                                    {t.desc}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col items-center justify-center p-6 bg-apple-bg-light dark:bg-apple-bg-dark rounded-[24px] border border-apple-border-light dark:border-apple-border-dark border-dashed">
                                    <span className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest mb-2">
                                        {t.code}
                                    </span>
                                    <span className="text-4xl font-mono font-bold tracking-[0.5em] text-brand-600 dark:text-brand-400 ml-[0.5em]">
                                        {verificationCode}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark uppercase tracking-widest px-1">
                                        {t.input}
                                    </label>
                                    <input 
                                        type="text"
                                        value={inputCode}
                                        onChange={(e) => setInputCode(e.target.value)}
                                        maxLength={4}
                                        placeholder="----"
                                        className={`w-full h-14 bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark border rounded-2xl text-center text-2xl font-mono font-bold tracking-[0.5em] outline-none transition-all
                                            ${error 
                                                ? 'border-red-500 ring-4 ring-red-500/10 text-red-600' 
                                                : 'border-apple-border-light dark:border-apple-border-dark focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-apple-text-primary-light dark:text-apple-text-primary-dark'}`}
                                    />
                                    {error && (
                                        <div className="flex items-center gap-2 text-red-500 text-xs font-bold px-1 animate-in slide-in-from-top-1">
                                            <AlertCircle size={14} />
                                            {t.error}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2">
                                <button 
                                    onClick={onVerify}
                                    className="w-full h-14 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-brand-500/25 flex items-center justify-center gap-3 active:scale-[0.98]"
                                >
                                    <Download size={20} />
                                    {t.confirm}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeployModal;
