import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, RefreshCw, Search } from 'lucide-react';
import fieldsJson from '../../data/emu-realtime-detail-fields.json';
import { translations } from '../../translations';
import type { Language, Theme } from '../../types';
import {
  type EmuRealtimeDeviceTab,
  type EmuRealtimeFieldDef,
} from '../../types/emuRealtimeDetail';

const EMU_FIELD_DEFS = fieldsJson as EmuRealtimeFieldDef[];

const DEVICES_BY_TAB: Record<EmuRealtimeDeviceTab, { id: string; nameZh: string; nameEn: string }[]> = {
  ess: [
    { id: '1-1', nameZh: '2#地块PCS1-1', nameEn: 'Lot 2 PCS 1-1' },
    { id: '1-2', nameZh: '2#地块PCS1-2', nameEn: 'Lot 2 PCS 1-2' },
    { id: '2-1', nameZh: '2#地块PCS2-1', nameEn: 'Lot 2 PCS 2-1' },
    { id: '2-2', nameZh: '2#地块PCS2-2', nameEn: 'Lot 2 PCS 2-2' },
    { id: '3-1', nameZh: '3#地块PCS3-1', nameEn: 'Lot 3 PCS 3-1' },
    { id: '3-2', nameZh: '3#地块PCS3-2', nameEn: 'Lot 3 PCS 3-2' },
  ],
  pv: [
    { id: '1-1', nameZh: '1#楼光伏逆变器1-1', nameEn: 'Bldg 1 PV Inverter 1-1' },
    { id: '1-2', nameZh: '1#楼光伏逆变器1-2', nameEn: 'Bldg 1 PV Inverter 1-2' },
    { id: '2-1', nameZh: '2#楼光伏逆变器2-1', nameEn: 'Bldg 2 PV Inverter 2-1' },
    { id: '2-2', nameZh: '2#楼光伏逆变器2-2', nameEn: 'Bldg 2 PV Inverter 2-2' },
    { id: '3-1', nameZh: '3#楼光伏逆变器3-1', nameEn: 'Bldg 3 PV Inverter 3-1' },
    { id: '3-2', nameZh: '3#楼光伏逆变器3-2', nameEn: 'Bldg 3 PV Inverter 3-2' },
  ],
  evse: [
    { id: '1-1', nameZh: '充电站终端1-1', nameEn: 'EVSE Terminal 1-1' },
    { id: '1-2', nameZh: '充电站终端1-2', nameEn: 'EVSE Terminal 1-2' },
    { id: '2-1', nameZh: '充电站终端2-1', nameEn: 'EVSE Terminal 2-1' },
    { id: '2-2', nameZh: '充电站终端2-2', nameEn: 'EVSE Terminal 2-2' },
    { id: '3-1', nameZh: '充电站终端3-1', nameEn: 'EVSE Terminal 3-1' },
    { id: '3-2', nameZh: '充电站终端3-2', nameEn: 'EVSE Terminal 3-2' },
  ],
  dg: [
    { id: '1-1', nameZh: '柴发机组1-1', nameEn: 'DG Unit 1-1' },
    { id: '2-1', nameZh: '柴发机组2-1', nameEn: 'DG Unit 2-1' },
    { id: '2-2', nameZh: '柴发机组2-2', nameEn: 'DG Unit 2-2' },
  ],
};

const PAGE_SIZE = 8;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mockValueForField(deviceId: string, field: EmuRealtimeFieldDef, lang: Language): string {
  const h = hashString(`${deviceId}|${field.id}`);
  const dash = translations[lang].stationRealtime.cabinetCard.dash;

  if (field.valueType === 'enum') {
    if (field.id === 'ess_run_state') {
      return ['online', 'fault', 'offline'][h % 3];
    }
    if (field.id === 'pv_run_state') {
      const optsZh = ['并网发电', '待机', '降额运行'];
      const optsEn = ['On-grid', 'Standby', 'Curtailed'];
      return lang === 'zh' ? optsZh[h % 3] : optsEn[h % 3];
    }
    if (field.id === 'evse_gun') {
      return lang === 'zh' ? (h % 2 === 0 ? '已连接' : '未连接') : h % 2 === 0 ? 'Connected' : 'Disconnected';
    }
    if (field.id === 'dg_run_state') {
      const optsZh = ['运行', '待机', '停机'];
      const optsEn = ['Running', 'Standby', 'Stopped'];
      return lang === 'zh' ? optsZh[h % 3] : optsEn[h % 3];
    }
    return lang === 'zh' ? '—' : '—';
  }

  if (field.valueType === 'string') {
    if (field.id === 'dg_ac_u') {
      const a = 400 + (h % 3);
      return `${a} / ${a + 1} / ${a + 2} V`;
    }
    if (field.id === 'dg_ac_i') {
      const a = 90 + (h % 10);
      return `${a} / ${a - 1} / ${a - 1} A`;
    }
    return dash;
  }

  const n = (x: number, decimals = 1) => x.toFixed(decimals);

  switch (field.unit) {
    case 'V':
      return n(380 + (h % 45) + (hashString(field.id) % 10) / 10, 1);
    case 'A':
      return n(10 + (h % 120) + (h % 7) / 10, 1);
    case 'kW':
      return n((h % 500) / 10 + (h % 5) / 10, 1);
    case 'kVar':
      return n((h % 200) / 10, 1);
    case 'Hz':
      return n(49.95 + (h % 8) / 100, 2);
    case '%':
      return n(h % 100, 1);
    case '°C':
      return n(22 + (h % 18) + (h % 5) / 10, 1);
    case 'bar':
      return n(2.2 + (h % 25) / 10, 1);
    default:
      return n((h % 1000) / 10, 1);
  }
}

function formatFieldDisplay(
  deviceId: string,
  field: EmuRealtimeFieldDef,
  lang: Language,
): { paramText: string; valueText: string } {
  const dash = translations[lang].stationRealtime.cabinetCard.dash;
  const label = lang === 'zh' ? field.labelZh : field.labelEn;
  const raw = mockValueForField(deviceId, field, lang);
  const map = field.meta?.enumMap as Record<string, string> | undefined;

  let paramText = label;
  if (field.unit && field.valueType !== 'enum') {
    paramText = lang === 'zh' ? `${label} [${field.unit}]` : `${label} [${field.unit}]`;
  }

  if (field.valueType === 'enum' && map && map[raw]) {
    return { paramText, valueText: map[raw] };
  }
  if (field.valueType === 'enum') {
    return { paramText, valueText: raw };
  }
  // 参数列已带 [单位] 时，数值列不再重复单位
  const valueText = raw === '' ? dash : String(raw).trim();
  return { paramText, valueText };
}

function flattenFieldsForTab(activeTab: EmuRealtimeDeviceTab): EmuRealtimeFieldDef[] {
  const filtered = EMU_FIELD_DEFS.filter((f) => f.deviceTypes.includes(activeTab));
  return [...filtered].sort((a, b) => {
    if (a.sectionOrder !== b.sectionOrder) return a.sectionOrder - b.sectionOrder;
    if (a.section !== b.section) return a.section.localeCompare(b.section);
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });
}

function chunkTriple<T>(arr: T[]): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < arr.length; i += 3) {
    rows.push([arr[i] ?? null, arr[i + 1] ?? null, arr[i + 2] ?? null]);
  }
  return rows;
}

export interface RealtimeEmuDetailViewProps {
  deviceId: string;
  activeTab: EmuRealtimeDeviceTab;
  lang: Language;
  theme: Theme;
  onBack: () => void;
}

export const RealtimeEmuDetailView: React.FC<RealtimeEmuDetailViewProps> = ({
  deviceId: initialDeviceId,
  activeTab,
  lang,
  theme: _theme,
  onBack,
}) => {
  const t = translations[lang].stationRealtime;
  const emu = t.emuDetail;
  const dash = t.cabinetCard.dash;

  const allDevices = DEVICES_BY_TAB[activeTab] ?? [];
  const [selectedId, setSelectedId] = useState(initialDeviceId);
  const [search, setSearch] = useState('');
  const [listPage, setListPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(() =>
    new Date().toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  );

  useEffect(() => {
    setSelectedId(initialDeviceId);
  }, [initialDeviceId, activeTab]);

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allDevices;
    return allDevices.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.nameZh.toLowerCase().includes(q) ||
        d.nameEn.toLowerCase().includes(q),
    );
  }, [allDevices, search]);

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / PAGE_SIZE));
  const safePage = Math.min(listPage, totalPages);
  const pagedDevices = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredDevices.slice(start, start + PAGE_SIZE);
  }, [filteredDevices, safePage]);

  useEffect(() => {
    setListPage(1);
  }, [search, activeTab]);

  /** 从卡片进入时：按完整设备列表定位分页（避免随搜索 filtered 误跳页） */
  useEffect(() => {
    const idx = allDevices.findIndex((d) => d.id === initialDeviceId);
    if (idx >= 0) {
      setListPage(Math.floor(idx / PAGE_SIZE) + 1);
    }
  }, [initialDeviceId, activeTab, allDevices]);

  const selectedMeta = useMemo(
    () => allDevices.find((d) => d.id === selectedId) ?? allDevices[0] ?? { id: selectedId, nameZh: selectedId, nameEn: selectedId },
    [allDevices, selectedId],
  );

  const displayName = lang === 'zh' ? selectedMeta.nameZh : selectedMeta.nameEn;

  const flatFields = useMemo(() => flattenFieldsForTab(activeTab), [activeTab]);
  const tripleRows = useMemo(() => chunkTriple(flatFields), [flatFields]);

  const handleRefresh = useCallback(() => {
    setLastUpdated(
      new Date().toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    );
  }, [lang]);

  const handleExportCsv = useCallback(() => {
    const header = lang === 'zh' ? '参数,数值' : 'Parameter,Value';
    const lines = [header];
    for (const f of flatFields) {
      const { paramText, valueText } = formatFieldDisplay(selectedId, f, lang);
      const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
      lines.push(`${esc(paramText)},${esc(valueText)}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emu-${selectedId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [flatFields, lang, selectedId]);

  return (
    <div className="animate-in fade-in space-y-3 duration-300">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200 dark:hover:bg-white/10"
        >
          <ChevronLeft size={18} />
          {emu.backToList}
        </button>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch">
        {/* 左侧设备列表 */}
        <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-apple-border-dark dark:bg-apple-surface-dark xl:w-72">
          <div className="border-b border-slate-200 px-3 py-3 text-sm font-bold text-slate-900 dark:border-white/10 dark:text-white">
            {emu.equipmentList}
          </div>
          <div className="border-b border-slate-100 p-2 dark:border-white/10">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={emu.searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200 dark:border-white/10 dark:bg-apple-surface-secondary-dark dark:text-slate-100 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
              />
            </div>
          </div>
          <ul className="max-h-[min(480px,50vh)] flex-1 overflow-y-auto custom-scrollbar">
            {pagedDevices.map((d) => {
              const name = lang === 'zh' ? d.nameZh : d.nameEn;
              const sel = d.id === selectedId;
              return (
                <li key={d.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setSelectedId(d.id)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                      sel
                        ? 'border-l-[3px] border-l-brand-500 bg-brand-500/10 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200'
                        : 'border-l-[3px] border-l-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" aria-hidden />
                    <span className="min-w-0 truncate">{name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2.5 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
            <span className="font-medium">{emu.totalDevices.replace('{count}', String(filteredDevices.length))}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-slate-200 px-2 py-1 font-bold text-slate-600 disabled:opacity-40 dark:border-white/10 dark:text-slate-300"
              >
                ‹
              </button>
              <span className="tabular-nums">
                {safePage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border border-slate-200 px-2 py-1 font-bold text-slate-600 disabled:opacity-40 dark:border-white/10 dark:text-slate-300"
              >
                ›
              </button>
            </div>
          </div>
        </aside>

        {/* 右侧实时数据 */}
        <main className="min-w-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-apple-border-dark dark:bg-apple-surface-dark">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between dark:border-white/10">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{displayName}</h2>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {emu.lastUpdated}: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{lastUpdated}</span>
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-apple-surface-dark dark:text-slate-200 dark:hover:bg-white/5"
              >
                <RefreshCw size={14} />
                {emu.refresh}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
            <span className="text-base font-bold text-slate-900 dark:text-white">{emu.realtimeData}</span>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center justify-center rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-500/20 dark:text-brand-300"
            >
              {emu.exportCsv}
            </button>
          </div>

          <div className="overflow-x-auto p-3 sm:p-4">
            {flatFields.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">{dash}</div>
            ) : (
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-white/5">
                    {[0, 1, 2].map((i) => (
                      <React.Fragment key={i}>
                        <th className="border border-slate-200 px-2 py-2 text-center text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-400">
                          {emu.param}
                        </th>
                        <th className="border border-slate-200 px-2 py-2 text-center text-xs font-bold text-slate-600 dark:border-white/10 dark:text-slate-400">
                          {emu.value}
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tripleRows.map((triple, ri) => (
                    <tr key={ri} className="bg-white/80 dark:bg-white/[0.02]">
                      {triple.map((field, ci) => {
                        if (!field) {
                          return (
                            <React.Fragment key={`e-${ci}`}>
                              <td className="border border-slate-100 px-2 py-2 dark:border-white/5" />
                              <td className="border border-slate-100 px-2 py-2 dark:border-white/5" />
                            </React.Fragment>
                          );
                        }
                        const { paramText, valueText } = formatFieldDisplay(selectedId, field, lang);
                        return (
                          <React.Fragment key={field.id}>
                            <td className="border border-slate-100 px-2 py-2 align-top text-xs font-medium leading-snug text-slate-500 dark:border-white/5 dark:text-slate-400">
                              {paramText}
                            </td>
                            <td className="border border-slate-100 px-2 py-2 align-top text-right text-sm font-bold tabular-nums text-slate-900 dark:border-white/5 dark:text-white">
                              {valueText}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
