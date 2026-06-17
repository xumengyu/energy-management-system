import React, { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck, User } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface UserProfileProps {
  lang: Language;
}

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

type PasswordErrors = Partial<Record<PasswordField, string>>;

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const UserProfile: React.FC<UserProfileProps> = ({ lang }) => {
  const t = translations[lang].profile;
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [success, setSuccess] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const validate = () => {
    const nextErrors: PasswordErrors = {};

    if (!form.currentPassword) {
      nextErrors.currentPassword = t.errors.currentRequired;
    }

    if (!form.newPassword) {
      nextErrors.newPassword = t.errors.newRequired;
    } else if (!strongPasswordRegex.test(form.newPassword)) {
      nextErrors.newPassword = t.errors.strongRule;
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = t.errors.confirmRequired;
    } else if (form.confirmPassword !== form.newPassword) {
      nextErrors.confirmPassword = t.errors.mismatch;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSuccess(false);

    if (!validate()) return;

    setForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setErrors({});
    setSuccess(true);
  };

  const updateField = (field: PasswordField, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSuccess(false);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const passwordInput = (
    field: PasswordField,
    label: string,
    placeholder: string,
  ) => {
    const visible = visibleFields[field];
    const error = errors[field];

    return (
      <div>
        <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
          {label}
          <span className="ml-1 text-rose-500">*</span>
        </label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type={visible ? 'text' : 'password'}
            value={form[field]}
            onChange={event => updateField(field, event.target.value)}
            placeholder={placeholder}
            className={`w-full rounded-xl border bg-slate-50 py-2 pl-9 pr-10 text-sm outline-none transition-all dark:bg-apple-surface-secondary-dark ${
              error
                ? 'border-rose-500 ring-2 ring-rose-100 dark:ring-rose-900/30'
                : 'border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-apple-border-dark dark:focus:ring-brand-900'
            }`}
          />
          <button
            type="button"
            onClick={() => setVisibleFields(prev => ({ ...prev, [field]: !visible }))}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-apple-surface-dark dark:hover:text-slate-200"
            aria-label={visible ? t.hidePassword : t.showPassword}
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {error && <p className="mt-1.5 text-[11px] font-semibold text-rose-500">{error}</p>}
      </div>
    );
  };

  return (
    <div className="ems-page-shell">
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="ems-card p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-500 to-brand-600 text-white">
                <User size={30} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black text-slate-900 dark:text-white">{t.userName}</h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">{t.role}</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-3 dark:border-brand-900/40 dark:bg-brand-900/10">
              <div className="flex items-center gap-2 text-sm font-bold text-brand-700 dark:text-brand-300">
                <ShieldCheck size={16} />
                {t.securityTitle}
              </div>
            </div>
          </section>

          <section className="ems-card p-5">
            <div className="mb-4">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{t.changePassword}</h2>
            </div>

            {success && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/15 dark:text-emerald-300">
                <CheckCircle2 size={16} />
                {t.success}
              </div>
            )}

            <form className="space-y-3" onSubmit={handleSubmit} noValidate>
              {passwordInput('currentPassword', t.currentPassword, t.currentPlaceholder)}
              {passwordInput('newPassword', t.newPassword, t.newPlaceholder)}
              {passwordInput('confirmPassword', t.confirmPassword, t.confirmPlaceholder)}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t.ruleTitle}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{t.ruleText}</p>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
                >
                  <KeyRound size={15} />
                  {t.savePassword}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
