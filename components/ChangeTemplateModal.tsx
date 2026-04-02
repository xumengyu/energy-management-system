import React from 'react';
import { X, LayoutTemplate, Check } from 'lucide-react';
import { Template, Language } from '../types';
import { translations } from '../translations';

interface ChangeTemplateModalProps {
    lang: Language;
    isOpen: boolean;
    onClose: () => void;
    templates: Template[];
    activeTemplateId: string;
    onSelect: (id: string) => void;
    getTemplateName: (key: string) => string;
    /** When set, used for list labels (e.g. match AI 调度策略 card titles by template id). */
    getTemplateLabel?: (tpl: Template) => string;
}

const ChangeTemplateModal: React.FC<ChangeTemplateModalProps> = ({
    lang,
    isOpen,
    onClose,
    templates,
    activeTemplateId,
    onSelect,
    getTemplateName,
    getTemplateLabel,
}) => {
    const t = translations[lang].strategyManager;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-apple-bg-dark/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-apple-surface-light dark:bg-apple-surface-dark w-full max-w-sm rounded-[24px] border border-apple-border-light dark:border-apple-border-dark shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-apple-border-light dark:border-apple-border-dark flex justify-between items-center bg-apple-bg-light/50 dark:bg-apple-bg-dark/50">
                    <h3 className="font-bold text-apple-text-primary-light dark:text-apple-text-primary-dark uppercase tracking-widest text-[10px]">{t.changeTemplate}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-apple-surface-secondary-light dark:hover:bg-apple-surface-secondary-dark rounded-full text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 space-y-2">
                    {templates.map(tpl => {
                        const isActive = activeTemplateId === tpl.id;
                        const title = getTemplateLabel ? getTemplateLabel(tpl) : getTemplateName(tpl.nameKey);
                        return (
                            <button 
                                key={tpl.id}
                                onClick={() => {
                                    onSelect(tpl.id);
                                    onClose();
                                }}
                                className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group
                                    ${isActive 
                                        ? 'bg-brand-500/10 border-brand-500/30' 
                                        : 'bg-apple-surface-secondary-light dark:bg-apple-surface-secondary-dark border-apple-border-light dark:border-apple-border-dark hover:border-brand-500/30'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-brand-500 text-white' : 'bg-apple-surface-light dark:bg-apple-surface-dark text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark group-hover:text-brand-500'}`}>
                                        <LayoutTemplate size={18} />
                                    </div>
                                    <div className="text-left">
                                        <p className={`text-sm font-semibold ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-apple-text-primary-light dark:text-apple-text-primary-dark'}`}>
                                            {title}
                                        </p>
                                        <p className="text-[10px] text-apple-text-tertiary-light dark:text-apple-text-tertiary-dark font-medium uppercase tracking-wider mt-0.5">
                                            {tpl.typeKey === 'algo' ? 'AI Algorithm' : 'Static Template'}
                                        </p>
                                    </div>
                                </div>
                                {isActive && <Check size={18} className="text-brand-500" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ChangeTemplateModal;
