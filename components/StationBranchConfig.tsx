
import React, { useMemo, useState, useEffect } from 'react';
import { GitBranch, Plus, Trash2, Gauge, Cpu, X, GripVertical, Pencil } from 'lucide-react';
import { Language, Theme } from '../types';

const DND_DEVICE_MIME = 'text/plain';
import { translations } from '../translations';
import type { StationListItem } from './StationList';

export interface FeederBranch {
  id: string;
  name: string;
  meterId: string;
}

export interface StationFeederConfig {
  branches: FeederBranch[];
  assignments: Record<string, string>;
}

interface StationDevice {
  id: string;
  label: string;
}

const METER_OPTIONS: { id: string; labelEn: string; labelZh: string }[] = [
  { id: 'MTR-PCC', labelEn: 'PCC — Grid interconnection meter', labelZh: 'PCC — 并网点总表' },
  { id: 'MTR-FEED-A', labelEn: 'Feeder A — multifunction meter', labelZh: '馈线 A — 多功能表' },
  { id: 'MTR-FEED-B', labelEn: 'Feeder B — multifunction meter', labelZh: '馈线 B — 多功能表' },
  { id: 'MTR-LOAD', labelEn: 'Main load metering', labelZh: '主负荷计量表' },
  { id: 'MTR-PV', labelEn: 'PV generation meter', labelZh: '光伏发电表' },
  { id: 'MTR-ESS', labelEn: 'BESS PCS meter', labelZh: '储能 PCS 表' },
];

function buildStationDevices(station: StationListItem, lang: Language): StationDevice[] {
  const types = station.deviceTypes?.length ? station.deviceTypes : [];
  const defs: { type: string; en: string; zh: string }[] = [
    { type: 'ess', en: 'BESS system', zh: '储能系统' },
    { type: 'pv', en: 'PV array', zh: '光伏阵列' },
    { type: 'dg', en: 'Diesel generator', zh: '柴油发电机' },
    { type: 'evse', en: 'EV charging piles', zh: '充电桩组' },
  ];
  const out: StationDevice[] = [];
  for (const d of defs) {
    if (types.includes(d.type)) {
      out.push({
        id: `${station.id}::${d.type}`,
        label: lang === 'zh' ? d.zh : d.en,
      });
    }
  }
  if (out.length === 0) {
    out.push({
      id: `${station.id}::generic`,
      label: lang === 'zh' ? '站点汇总设备' : 'Station aggregate',
    });
  }
  const demoExtras: { idSuffix: string; en: string; zh: string }[] = [
    { idSuffix: 'hvac-chiller', en: 'HVAC — chiller plant', zh: '暖通 — 冷水机组' },
    { idSuffix: 'ups-critical', en: 'UPS / critical load', zh: 'UPS / 关键负荷' },
    { idSuffix: 'heat-pump', en: 'Air-source heat pump', zh: '空气源热泵' },
    { idSuffix: 'lighting-bms', en: 'Lighting circuit (BMS)', zh: '照明回路（BMS）' },
    { idSuffix: 'water-heat', en: 'Commercial water heating', zh: '商业热水系统' },
    { idSuffix: 'elevator', en: 'Elevator bank', zh: '电梯组' },
    { idSuffix: 'vent-fan', en: 'Ventilation — AHU fan wall', zh: '通风 — AHU 风机墙' },
    { idSuffix: 'data-rack', en: 'IT / data rack PDU', zh: 'IT 机柜 PDU' },
  ];
  for (const d of demoExtras) {
    out.push({
      id: `${station.id}::demo::${d.idSuffix}`,
      label: lang === 'zh' ? d.zh : d.en,
    });
  }
  return out;
}

interface StationBranchConfigProps {
  lang: Language;
  theme: Theme;
  station: StationListItem;
  initialConfig: StationFeederConfig;
  onBack: () => void;
  onSave: (stationId: string, config: StationFeederConfig) => void;
}

const StationBranchConfig: React.FC<StationBranchConfigProps> = ({
  lang,
  theme,
  station,
  initialConfig,
  onBack,
  onSave,
}) => {
  const t = translations[lang].branchConfig;
  const devices = useMemo(() => buildStationDevices(station, lang), [station, lang]);

  const [branches, setBranches] = useState<FeederBranch[]>(() =>
    initialConfig.branches.length ? initialConfig.branches : []
  );
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const next = { ...initialConfig.assignments };
    for (const d of devices) {
      if (next[d.id] === undefined) next[d.id] = '';
    }
    return next;
  });

  const unconfiguredList = useMemo(
    () => devices.filter((d) => !(assignments[d.id] ?? '').trim()),
    [devices, assignments]
  );

  const devicesOnBranch = (branchId: string) =>
    devices.filter((d) => (assignments[d.id] ?? '').trim() === branchId);

  const meterLabel = (meterId: string) => {
    const m = METER_OPTIONS.find((x) => x.id === meterId);
    if (!m) return meterId;
    return lang === 'zh' ? m.labelZh : m.labelEn;
  };

  type BranchFormModal =
    | { open: false }
    | { open: true; mode: 'create' }
    | { open: true; mode: 'edit'; branchId: string };

  const [formModal, setFormModal] = useState<BranchFormModal>({ open: false });
  const [draftName, setDraftName] = useState('');
  const [draftMeterId, setDraftMeterId] = useState(METER_OPTIONS[0]?.id ?? '');

  const closeFormModal = () => setFormModal({ open: false });

  const openCreateModal = () => {
    setDraftName('');
    setDraftMeterId(METER_OPTIONS[0]?.id ?? '');
    setFormModal({ open: true, mode: 'create' });
  };

  const openEditModal = (b: FeederBranch) => {
    setDraftName(b.name);
    setDraftMeterId(b.meterId || (METER_OPTIONS[0]?.id ?? ''));
    setFormModal({ open: true, mode: 'edit', branchId: b.id });
  };

  const formModalOpen = formModal.open;

  const [deleteConfirmBranchId, setDeleteConfirmBranchId] = useState<string | null>(null);
  const pendingDeleteBranch = deleteConfirmBranchId
    ? branches.find((b) => b.id === deleteConfirmBranchId)
    : undefined;
  const closeDeleteConfirm = () => setDeleteConfirmBranchId(null);

  useEffect(() => {
    if (!formModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFormModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [formModalOpen]);

  useEffect(() => {
    if (!deleteConfirmBranchId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDeleteConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteConfirmBranchId]);

  const confirmFormModal = () => {
    if (!formModal.open) return;
    const meter = draftMeterId || (METER_OPTIONS[0]?.id ?? '');
    if (formModal.mode === 'create') {
      const id = `br-${Date.now()}`;
      setBranches((prev) => [...prev, { id, name: draftName.trim(), meterId: meter }]);
    } else {
      const { branchId } = formModal;
      setBranches((prev) =>
        prev.map((b) =>
          b.id === branchId ? { ...b, name: draftName.trim(), meterId: meter } : b
        )
      );
    }
    closeFormModal();
  };

  const removeBranch = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
    setAssignments((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (next[k] === id) next[k] = '';
      }
      return next;
    });
  };

  const confirmDeleteBranch = () => {
    if (!deleteConfirmBranchId) return;
    removeBranch(deleteConfirmBranchId);
    closeDeleteConfirm();
  };

  const handleSave = () => {
    onSave(station.id, { branches, assignments });
    onBack();
  };

  const [isDraggingDevice, setIsDraggingDevice] = useState(false);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  const readDragDeviceId = (e: React.DragEvent) => e.dataTransfer.getData(DND_DEVICE_MIME).trim();

  const handleDeviceDragStart = (e: React.DragEvent, deviceId: string) => {
    e.dataTransfer.setData(DND_DEVICE_MIME, deviceId);
    e.dataTransfer.effectAllowed = 'move';
    setIsDraggingDevice(true);
    setActiveDropZone(null);
  };

  const handleDeviceDragEnd = () => {
    setIsDraggingDevice(false);
    setActiveDropZone(null);
  };

  const handleDropOnBranch = (e: React.DragEvent, branchId: string) => {
    e.preventDefault();
    const deviceId = readDragDeviceId(e);
    if (!deviceId || !devices.some((d) => d.id === deviceId)) return;
    setAssignments((prev) => ({ ...prev, [deviceId]: branchId }));
    handleDeviceDragEnd();
  };

  const handleDropOnPool = (e: React.DragEvent) => {
    e.preventDefault();
    const deviceId = readDragDeviceId(e);
    if (!deviceId) return;
    setAssignments((prev) => ({ ...prev, [deviceId]: '' }));
    handleDeviceDragEnd();
  };

  const allowDeviceDragOver = (e: React.DragEvent) =>
    [...e.dataTransfer.types].includes('text/plain');

  const branchDropOverCapture = (e: React.DragEvent, branchId: string) => {
    if (!allowDeviceDragOver(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setActiveDropZone(branchId);
  };

  const poolDropOverCapture = (e: React.DragEvent) => {
    if (!allowDeviceDragOver(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setActiveDropZone('pool');
  };

  return (
    <div className="ems-page-shell">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
            <GitBranch className="text-brand-600 dark:text-brand-400" size={22} />
            {t.title}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {station.name}
            <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
            <span className="font-mono">{station.id}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-all hover:bg-brand-700"
        >
          {t.save}
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{t.subtitle}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="ems-card p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Gauge size={18} className="text-slate-500 dark:text-slate-400" />
              {t.branchesSection}
            </h2>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-900/25 dark:text-brand-300 dark:hover:bg-brand-900/40"
            >
              <Plus size={14} />
              {t.addBranch}
            </button>
          </div>

          {branches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-8 text-center text-sm text-slate-500 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/50 dark:text-slate-400">
              {t.emptyBranches}
            </p>
          ) : (
            <ul className="space-y-3">
              {branches.map((b, idx) => {
                const attached = devicesOnBranch(b.id);
                const branchHighlighted = isDraggingDevice && activeDropZone === b.id;
                return (
                  <li
                    key={b.id}
                    onDragOverCapture={(e) => branchDropOverCapture(e, b.id)}
                    onDrop={(e) => handleDropOnBranch(e, b.id)}
                    className={`rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-shadow dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/40 ${
                      branchHighlighted
                        ? 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-apple-surface-dark'
                        : ''
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {t.branchNumber.replace('{n}', String(idx + 1))}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(b)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-brand-400"
                            title={t.actionEditBranch}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmBranchId(b.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
                            title={t.removeBranch}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                        <div className="min-w-0">
                          <div className="mb-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {t.branchName}
                          </div>
                          <div className="rounded-lg border border-slate-100 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-apple-surface-dark/80 dark:text-slate-100">
                            {b.name?.trim() ? (
                              <span className="line-clamp-2">{b.name.trim()}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">{t.unnamedBranch}</span>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="mb-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {t.bindMeter}
                          </div>
                          <div className="rounded-lg border border-slate-100 bg-white/90 px-3 py-2 text-sm font-medium leading-snug text-slate-700 dark:border-white/10 dark:bg-apple-surface-dark/80 dark:text-slate-200">
                            <span className="line-clamp-3">{meterLabel(b.meterId)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-slate-200 pt-3 dark:border-apple-border-dark">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {t.branchAttached}
                      </p>
                      <div
                        className={`min-h-[52px] space-y-2 rounded-lg border border-dashed p-2 transition-colors dark:border-white/15 ${
                          branchHighlighted ? 'border-brand-400 bg-brand-50/40 dark:bg-brand-900/20' : 'border-slate-200 bg-white/40 dark:bg-apple-surface-dark/40'
                        }`}
                      >
                        {attached.length === 0 ? (
                          <p className="py-3 text-center text-xs text-slate-400 dark:text-slate-500">
                            {t.branchDropHint}
                          </p>
                        ) : (
                          <ul className="space-y-1.5">
                            {attached.map((d) => (
                              <li
                                key={d.id}
                                className="flex items-center gap-2 rounded-lg bg-white/90 px-2 py-1.5 dark:bg-apple-surface-dark/90"
                              >
                                <div
                                  draggable
                                  onDragStart={(e) => handleDeviceDragStart(e, d.id)}
                                  onDragEnd={handleDeviceDragEnd}
                                  className="flex min-w-0 flex-1 cursor-grab items-center gap-2 active:cursor-grabbing"
                                >
                                  <GripVertical
                                    size={16}
                                    className="shrink-0 text-slate-400"
                                    aria-hidden
                                  />
                                  <span className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {d.label}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  title={t.removeFromBranch}
                                  onClick={() =>
                                    setAssignments((prev) => ({ ...prev, [d.id]: '' }))
                                  }
                                  className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-rose-400"
                                >
                                  <X size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          className="ems-card p-5"
          onDragOverCapture={poolDropOverCapture}
          onDrop={handleDropOnPool}
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Cpu size={18} className="text-slate-500 dark:text-slate-400" />
            {t.unconfiguredDevices}
          </h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t.devicesHint}</p>
          <div
            className={`min-h-[160px] rounded-xl border-2 border-dashed p-3 transition-colors dark:border-white/15 ${
              isDraggingDevice && activeDropZone === 'pool'
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/15'
                : 'border-slate-200 bg-slate-50/40 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/30'
            }`}
          >
            {unconfiguredList.length === 0 ? (
              <p className="flex min-h-[120px] items-center justify-center px-2 text-center text-sm text-slate-500 dark:text-slate-400">
                {isDraggingDevice ? t.poolDropHint : t.emptyUnconfigured}
              </p>
            ) : (
              <ul className="space-y-2">
                {unconfiguredList.map((d) => (
                  <li key={d.id}>
                    <div
                      draggable
                      onDragStart={(e) => handleDeviceDragStart(e, d.id)}
                      onDragEnd={handleDeviceDragEnd}
                      className="flex cursor-grab items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-all active:cursor-grabbing dark:border-apple-border-dark dark:bg-apple-surface-dark"
                    >
                      <GripVertical size={16} className="shrink-0 text-slate-400" aria-hidden />
                      <span className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">
                        {d.label}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {formModal.open && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-slate-900/45 backdrop-blur-[2px] dark:bg-black/55"
            aria-hidden
            onClick={closeFormModal}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[101] w-[min(100%,560px)] -translate-x-1/2 -translate-y-1/2 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="branch-form-modal-title"
          >
            <div
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-apple-border-dark dark:bg-apple-surface-dark"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3
                  id="branch-form-modal-title"
                  className="text-base font-black text-slate-900 dark:text-white"
                >
                  {formModal.mode === 'create' ? t.createBranchTitle : t.editBranchTitle}
                </h3>
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-slate-200"
                  aria-label={t.createBranchCancel}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="min-w-0">
                  <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    {t.branchName}
                  </label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder={t.branchNamePh}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-100 dark:focus:ring-brand-900/30"
                    autoFocus
                  />
                </div>
                <div className="min-w-0">
                  <label className="mb-1 block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    {t.bindMeter}
                  </label>
                  <select
                    value={draftMeterId}
                    onChange={(e) => setDraftMeterId(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-brand-100 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-100"
                  >
                    {METER_OPTIONS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {lang === 'zh' ? m.labelZh : m.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-300 dark:hover:bg-apple-bg-dark"
                >
                  {t.createBranchCancel}
                </button>
                <button
                  type="button"
                  onClick={confirmFormModal}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-colors hover:bg-brand-700"
                >
                  {formModal.mode === 'create' ? t.createBranchConfirm : t.editBranchConfirm}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {deleteConfirmBranchId && pendingDeleteBranch && (
        <>
          <div
            className="fixed inset-0 z-[102] bg-slate-900/45 backdrop-blur-[2px] dark:bg-black/55"
            aria-hidden
            onClick={closeDeleteConfirm}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[103] w-[min(100%,420px)] -translate-x-1/2 -translate-y-1/2 px-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="branch-delete-modal-title"
            aria-describedby="branch-delete-modal-desc"
          >
            <div
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-apple-border-dark dark:bg-apple-surface-dark"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <h3
                  id="branch-delete-modal-title"
                  className="text-base font-black text-slate-900 dark:text-white"
                >
                  {t.deleteBranchTitle}
                </h3>
                <button
                  type="button"
                  onClick={closeDeleteConfirm}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-slate-200"
                  aria-label={t.createBranchCancel}
                >
                  <X size={18} />
                </button>
              </div>
              <p
                id="branch-delete-modal-desc"
                className="text-sm leading-relaxed text-slate-600 dark:text-slate-400"
              >
                {t.deleteBranchBody.replace(
                  '{name}',
                  pendingDeleteBranch.name?.trim() ? pendingDeleteBranch.name.trim() : t.unnamedBranch
                )}
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDeleteConfirm}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-300 dark:hover:bg-apple-bg-dark"
                >
                  {t.createBranchCancel}
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteBranch}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-rose-500/20 transition-colors hover:bg-rose-700"
                >
                  {t.deleteBranchConfirmBtn}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StationBranchConfig;
