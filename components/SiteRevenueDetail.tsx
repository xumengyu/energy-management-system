import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Calendar, Download, TrendingUp, Coins, Gauge, Search, Filter } from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';

const COMP_COLORS = ['#819226', '#6366f1'];
const MODE_COLORS = ['#819226', '#6366f1', '#f59e0b', '#94a3b8'];

const MOCK_TREND = Array.from({ length: 24 }, (_, i) => ({
  label: `${String(i).padStart(2, '0')}`,
  arbitrage: 12 + Math.sin(i / 3) * 4 + Math.random() * 2,
  ancillary: 6 + Math.cos(i / 4) * 2.5 + Math.random() * 1.5,
}));

const MOCK_MODE = [
  { key: 'arb', v: 38 },
  { key: 'anc', v: 24 },
  { key: 'hybrid', v: 28 },
  { key: 'standby', v: 10 },
];

function makeTableRows(lang: Language) {
  const rows: {
    id: string;
    period: string;
    arb: string;
    anc: string;
    total: string;
    mode: string;
    notes: string;
  }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(2025, 8, 30 - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const arb = (8 + Math.random() * 6).toFixed(2);
    const anc = (3 + Math.random() * 4).toFixed(2);
    const tot = (parseFloat(arb) + parseFloat(anc)).toFixed(2);
    const modes = lang === 'zh' ? ['套利主导', '辅助主导', '混合', '待机'] : ['Arbitrage-led', 'Ancillary-led', 'Hybrid', 'Standby'];
    rows.push({
      id: `r-${i}`,
      period: iso,
      arb,
      anc,
      total: tot,
      mode: modes[i % 4],
      notes: lang === 'zh' ? '—' : '—',
    });
  }
  return rows;
}

interface SiteRevenueDetailProps {
  lang: Language;
  theme: Theme;
}

const SiteRevenueDetail: React.FC<SiteRevenueDetailProps> = ({ lang, theme }) => {
  const t = translations[lang].siteRevenueDetail;
  const isDark = theme === 'dark';
  const chartGrid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const chartText = isDark ? '#86868b' : '#6e6e73';

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 8;

  const tableRows = useMemo(() => makeTableRows(lang), [lang]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return tableRows;
    return tableRows.filter(
      (r) =>
        r.period.toLowerCase().includes(q) ||
        r.mode.toLowerCase().includes(q) ||
        r.arb.includes(q) ||
        r.anc.includes(q) ||
        r.total.includes(q)
    );
  }, [tableRows, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, lang]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageSlice = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const composition = useMemo(
    () => [
      { name: t.structure.arbitrage, value: 62, key: 'arb' },
      { name: t.structure.ancillary, value: 38, key: 'anc' },
    ],
    [t]
  );

  const modeData = useMemo(
    () =>
      MOCK_MODE.map((m) => ({
        name:
          m.key === 'arb'
            ? t.mode.arb
            : m.key === 'anc'
              ? t.mode.anc
              : m.key === 'hybrid'
                ? t.mode.hybrid
                : t.mode.standby,
        value: m.v,
      })),
    [t]
  );

  const tooltipStyle = {
    contentStyle: {
      borderRadius: '12px',
      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
      backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.96)',
      fontSize: '12px',
    },
  };

  const exportCsv = () => {
    const header = [t.table.period, t.table.arb, t.table.ancillary, t.table.total, t.table.mode, t.table.notes].join(',');
    const lines = tableRows.map((r) => [r.period, r.arb, r.anc, r.total, r.mode, r.notes].join(','));
    const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'revenue-detail.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpiItems: {
    title: string;
    value: string;
    unit: string;
    icon: React.ReactNode;
    blur: string;
    iconWrap: string;
  }[] = [
    {
      title: t.kpi.today,
      value: '2,842',
      unit: 'EUR',
      icon: <Coins size={16} />,
      blur: 'bg-brand-50 dark:bg-brand-900/10',
      iconWrap: 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400',
    },
    {
      title: t.kpi.month,
      value: '68,410',
      unit: 'EUR',
      icon: <Calendar size={16} />,
      blur: 'bg-emerald-50 dark:bg-emerald-900/10',
      iconWrap: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    },
    {
      title: t.kpi.cumulative,
      value: '512,906',
      unit: 'EUR',
      icon: <TrendingUp size={16} />,
      blur: 'bg-blue-50 dark:bg-blue-900/10',
      iconWrap: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    },
    {
      title: t.kpi.unit,
      value: '48.6',
      unit: 'EUR/MWh',
      icon: <Gauge size={16} />,
      blur: 'bg-amber-50 dark:bg-amber-900/10',
      iconWrap: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    },
  ];

  return (
    <div className="ems-page-shell">
      {/* Header / Toolbar — 与电价列表同款 */}
      <div className="ems-card mb-4 flex flex-col items-center justify-between gap-4 p-4 md:flex-row">
        <div className="flex w-full flex-col items-stretch gap-4 md:w-auto md:flex-row md:items-center md:gap-6">
          <h2 className="shrink-0 text-lg font-bold tracking-tight text-slate-900 dark:text-white">{t.pageTitle}</h2>
          <div className="hidden h-8 w-px shrink-0 bg-slate-200 dark:bg-white/10 md:block" />
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
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
          >
            <Download size={18} />
            {t.table.export}
          </button>
        </div>
      </div>

      {/* KPI — 与数据总览同款 */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiItems.map((k) => (
          <div key={k.title} className="ems-card group relative overflow-hidden p-4 transition-all hover:shadow-md">
            <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-50 blur-2xl ${k.blur}`} />
            <div className="relative z-10">
              <div className="mb-2 flex items-start justify-between">
                <div className={`rounded-xl p-2 ${k.iconWrap}`}>{k.icon}</div>
              </div>
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{k.title}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{k.value}</span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{k.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 收益趋势 */}
      <div className="ems-card mb-4 flex flex-col overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <span className="rounded-xl bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
              <TrendingUp size={16} />
            </span>
            {t.structure.trendTitle}
          </h3>
        </div>
        <div className="p-4 md:p-6">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_TREND} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: chartText }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: chartText }} tickLine={false} axisLine={false} width={48} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ paddingTop: 16 }} />
                <Line type="monotone" dataKey="arbitrage" name={t.structure.arbitrage} stroke={COMP_COLORS[0]} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="ancillary" name={t.structure.ancillary} stroke={COMP_COLORS[1]} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 运行模式 + 收益构成 */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="ems-card flex min-h-[260px] flex-col overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <span className="rounded-xl bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                <Gauge size={16} />
              </span>
              {t.mode.title}
            </h3>
          </div>
          <div className="flex flex-1 flex-col p-4">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
                  <Pie
                    data={modeData}
                    dataKey="value"
                    nameKey="name"
                    cx="36%"
                    cy="50%"
                    outerRadius={72}
                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {modeData.map((_, i) => (
                      <Cell key={i} fill={MODE_COLORS[i % MODE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingLeft: 4 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="ems-card flex min-h-[260px] flex-col overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50">
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <span className="rounded-xl bg-brand-50 p-1.5 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                <Coins size={16} />
              </span>
              {t.structure.title}
            </h3>
          </div>
          <div className="flex flex-1 flex-col p-4">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
                  <Pie
                    data={composition}
                    dataKey="value"
                    nameKey="name"
                    cx="36%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={86}
                    paddingAngle={2}
                  >
                    {composition.map((_, i) => (
                      <Cell key={i} fill={COMP_COLORS[i % COMP_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingLeft: 4 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* 明细表 — 与电价列表表格壳一致 */}
      <div className="ems-card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/50 p-4 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/30 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.table.title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">{t.table.period}</th>
                <th className="px-6 py-4 text-right">{t.table.arb}</th>
                <th className="px-6 py-4 text-right">{t.table.ancillary}</th>
                <th className="px-6 py-4 text-right">{t.table.total}</th>
                <th className="px-6 py-4">{t.table.mode}</th>
                <th className="px-6 py-4">{t.table.notes}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {pageSlice.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                  <td className="px-6 py-4 font-mono text-xs text-slate-700 dark:text-slate-300">{row.period}</td>
                  <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-300">{row.arb}</td>
                  <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-300">{row.anc}</td>
                  <td className="px-6 py-4 text-right font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{row.total}</td>
                  <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">{row.mode}</td>
                  <td className="px-6 py-4 text-xs text-slate-400 dark:text-slate-500">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-apple-surface-secondary-dark">
              <Search className="text-slate-300 dark:text-slate-500" size={32} />
            </div>
            <p className="font-medium text-slate-500 dark:text-slate-400">{t.emptyList}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t.emptyHint}</p>
          </div>
        )}

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/20 sm:flex-row">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredRows.length === 0
              ? '—'
              : t.table.showing
                  .replace('{from}', String((page - 1) * pageSize + 1))
                  .replace('{to}', String(Math.min(page * pageSize, filteredRows.length)))
                  .replace('{total}', String(filteredRows.length))}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || filteredRows.length === 0}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-bold transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:border-apple-border-dark dark:hover:bg-apple-surface-secondary-dark"
            >
              {t.table.prev}
            </button>
            <span className="font-mono text-sm text-slate-400 dark:text-slate-500">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || filteredRows.length === 0}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-bold transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:border-apple-border-dark dark:hover:bg-apple-surface-secondary-dark"
            >
              {t.table.next}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteRevenueDetail;
