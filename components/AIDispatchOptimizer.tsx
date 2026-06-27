import React, { useCallback, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  BatteryCharging,
  ChevronDown,
  CheckCircle2,
  DollarSign,
  Leaf,
  FileJson,
  Gauge,
  GitBranch,
  Play,
  TrendingUp,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';
import type { StationListItem } from './StationList';
import PriceSelectionModal from './PriceSelectionModal';
import { PRICE_SCHEMES_EN, PRICE_SCHEMES_ZH } from '../data/priceSchemes';

type PriceTemplate = 'market' | 'tou' | 'ppa';
type CloudObjective = 'storage_profit' | 'green' | 'station_profit';
type CloudStrategyMode = 'day_ahead' | 'rolling';
type NegativePolicy = 'allow' | 'clamp_zero' | 'approval';
type FlowKey =
  | 'grid_to_load'
  | 'grid_to_bess'
  | 'pv_to_load'
  | 'pv_to_bess'
  | 'pv_to_grid'
  | 'bess_to_load'
  | 'bess_to_grid';
type RuleMode = 'fixed' | 'tou' | 'discount' | 'spread' | 'same';
type RuleBase = 'market' | 'tou' | 'fixed' | 'same';
type TabKey = 'dashboard' | 'cloudDispatch' | 'dispatchLogs' | 'solverLogs';
type DeployStatus = 'idle' | 'confirm' | 'deployed';
type DispatchAction = 'Charge' | 'Discharge' | 'Standby';
export type OptimizerSwitchStatus = 'trial' | 'configuring' | 'on' | 'off';
type ConfigGuideStep = 'source' | 'price' | 'solver' | 'objective' | 'mode';

type FlowRule = {
  mode: RuleMode;
  base: RuleBase;
  fixed: number;
  factor: number;
  offset: number;
  min: number | null;
  max: number | null;
  ref: FlowKey | null;
  allowNeg: boolean;
};

type OptimizeStep = {
  time: string;
  pvKW: number;
  loadKW: number;
  buyPrice: number;
  sellPrice: number;
  batteryPowerKW: number;
  socPct: number;
  gridPowerKW: number;
  gridImportKW: number;
  gridExportKW: number;
  pvCurtKW: number;
  importOverKW?: number;
};

type OptimizeSummary = {
  objectiveValue: number;
  optimizedCost: number;
  baselineCost: number;
  saving: number;
  endSocPct: number;
  totalBatteryThroughputKWh: number;
  totalGridImportKWh: number;
  totalGridExportKWh: number;
  totalPvCurtKWh: number;
  maxImportOverKW?: number;
  demandPenaltyCost?: number;
};

type OptimizeResponse = {
  steps: OptimizeStep[];
  summary: OptimizeSummary;
};

type DispatchSegment = {
  start: string;
  end: string;
  type: DispatchAction;
  powerKW: number;
  avgSocPct: number | null;
  points: number;
};

type DispatchStrategyDraft = {
  stationId: string;
  stationName: string;
  strategyDate: string;
  source: 'dynamic-price-optimizer';
  mode: CloudStrategyMode;
  objective: CloudObjective;
  marketSource: string;
  granularity: string;
  timezone: string;
  priceModel: Record<string, unknown>;
  segments: DispatchSegment[];
  summary: OptimizeSummary;
  rawPointCount: number;
};

interface AIDispatchOptimizerProps {
  lang: Language;
  theme: Theme;
  selectedStation?: string;
  selectedStationData?: StationListItem;
  viewMode?: 'home' | 'setup';
  optimizerStatus?: OptimizerSwitchStatus;
  onOptimizerStatusChange?: (status: OptimizerSwitchStatus) => void;
  onStartTrial?: () => void;
  onEnabled?: () => void;
}

const FLOW_DEFS: Array<{ key: FlowKey; zh: string; en: string; descZh: string; descEn: string }> = [
  { key: 'grid_to_load', zh: '电网 -> 负荷', en: 'Grid -> Load', descZh: '外购电成本', descEn: 'Import cost' },
  { key: 'grid_to_bess', zh: '电网 -> 储能', en: 'Grid -> BESS', descZh: '电网充电成本', descEn: 'Grid charging cost' },
  { key: 'pv_to_load', zh: '光伏 -> 负荷', en: 'PV -> Load', descZh: '光伏自用价值', descEn: 'PV self-use value' },
  { key: 'pv_to_bess', zh: '光伏 -> 储能', en: 'PV -> BESS', descZh: '光伏充电机会成本', descEn: 'PV charging opportunity cost' },
  { key: 'pv_to_grid', zh: '光伏 -> 电网', en: 'PV -> Grid', descZh: '光伏上网收益', descEn: 'PV export revenue' },
  { key: 'bess_to_load', zh: '储能 -> 负荷', en: 'BESS -> Load', descZh: '替代购电收益', descEn: 'Import substitution value' },
  { key: 'bess_to_grid', zh: '储能 -> 电网', en: 'BESS -> Grid', descZh: '储能上网收益', descEn: 'BESS export revenue' },
];

const SAMPLE_MARKET_24 = [
  0.32, 0.28, 0.24, 0.18, -0.08, 0.05, 0.22, 0.45,
  0.68, 0.82, 0.76, 0.63, 0.48, 0.42, 0.38, 0.52,
  0.78, 1.05, 1.2, 1.12, 0.92, 0.7, 0.46, 0.36,
];

const SAMPLE_TOU_24 = [
  0.32, 0.32, 0.32, 0.32, 0.32, 0.32, 0.58, 0.58,
  0.75, 0.75, 0.75, 0.75, 0.75, 0.75, 0.52, 0.52,
  1.1, 1.1, 1.1, 1.1, 1.1, 0.4, 0.4, 0.4,
];

const MARKET_SOURCES = [
  '广东日前电价',
  '广东实时电价',
  '山东日前电价',
  '山西日前电价',
  '蒙西实时电价',
  '浙江工商业分时模板',
  'Excel导入日前价格',
  '手动维护价格曲线',
];

const TAB_ICONS: Record<TabKey, React.ElementType> = {
  dashboard: Gauge,
  cloudDispatch: GitBranch,
  dispatchLogs: FileJson,
  solverLogs: Zap,
};

const CONFIG_GUIDE_STEPS: ConfigGuideStep[] = ['source', 'price', 'solver', 'objective', 'mode'];

function rule(
  mode: RuleMode,
  base: RuleBase,
  fixed: number,
  factor = 1,
  offset = 0,
  min: number | null = null,
  max: number | null = null,
  ref: FlowKey | null = null,
  allowNeg = false,
): FlowRule {
  return { mode, base, fixed, factor, offset, min, max, ref, allowNeg };
}

function defaultRules(template: PriceTemplate): Record<FlowKey, FlowRule> {
  if (template === 'tou') {
    return {
      grid_to_load: rule('tou', 'tou', 0.65, 1, 0, null, null, null, true),
      grid_to_bess: rule('tou', 'tou', 0.35, 0.95, 0, 0),
      pv_to_load: rule('fixed', 'fixed', 0.45),
      pv_to_bess: rule('fixed', 'fixed', 0.3),
      pv_to_grid: rule('fixed', 'fixed', 0.28),
      bess_to_load: rule('same', 'same', 0, 1, 0, null, null, 'grid_to_load', true),
      bess_to_grid: rule('fixed', 'fixed', 0.62, 1, 0, 0),
    };
  }

  if (template === 'ppa') {
    return {
      grid_to_load: rule('fixed', 'fixed', 0.65),
      grid_to_bess: rule('fixed', 'fixed', 0.38),
      pv_to_load: rule('fixed', 'fixed', 0.45),
      pv_to_bess: rule('fixed', 'fixed', 0.3),
      pv_to_grid: rule('fixed', 'fixed', 0.28),
      bess_to_load: rule('fixed', 'fixed', 0.8),
      bess_to_grid: rule('fixed', 'fixed', 0.58, 1, 0, 0),
    };
  }

  return {
    grid_to_load: rule('tou', 'tou', 0.65, 1, 0, null, null, null, true),
    grid_to_bess: rule('discount', 'market', 0.35, 0.95, 0, null, null, null, true),
    pv_to_load: rule('fixed', 'fixed', 0.45),
    pv_to_bess: rule('fixed', 'fixed', 0.3),
    pv_to_grid: rule('fixed', 'fixed', 0.28),
    bess_to_load: rule('same', 'same', 0, 1, 0, null, null, 'grid_to_load', true),
    bess_to_grid: rule('discount', 'market', 0.62, 0.9, -0.02, 0),
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fmt(value: number | null | undefined, digits = 2) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return value.toFixed(digits);
}

function parseSeries(text: string): number[] {
  return text.trim().split(/[\s,]+/).filter(Boolean).map((item) => Number(item)).filter((value) => Number.isFinite(value));
}

function toCsv(values: number[]) {
  return values.map((value) => (Number.isFinite(value) ? String(round3(value)) : '0')).join(',');
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rng: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function makeRandomExample96(seed = 20260616, intensity = 0.85) {
  const rng = mulberry32(seed);
  const buy: number[] = [];
  const sell: number[] = [];
  const pv: number[] = [];
  const load: number[] = [];
  const valley = 0.25 + rng() * 0.25;
  const flat = 0.55 + rng() * 0.45;
  const peak = 0.9 + rng() * 0.55;
  const shoulder = 0.45 + rng() * 0.35;
  const baseLoad = 160 + rng() * 140;
  const morningAmp = 40 + rng() * 120;
  const eveningAmp = 60 + rng() * 180;
  const middayBump = 20 + rng() * 80;
  const noiseKW = (10 + rng() * 25) * intensity;
  const sunrise = 6 + rng();
  const sunset = 17 + rng() * 1.5;
  const pvPeak = (baseLoad + morningAmp * 0.3 + eveningAmp * 0.2) * (0.6 + rng() * 0.9);
  const pvShape = 1.2 + rng() * 1.2;
  let cloud = 1.0;
  let cloudTarget = 0.75 + rng() * 0.3;
  let cloudHold = 0;

  for (let i = 0; i < 96; i += 1) {
    const hour = i * 0.25;
    let buyPrice = hour < 6 ? valley : hour < 18 ? flat : hour < 22 ? peak : shoulder;
    buyPrice = clamp(buyPrice + (rng() - 0.5) * 0.12 * intensity, 0.05, 5);
    let sellPrice = buyPrice - (hour >= 18 && hour < 22 ? 0.1 + rng() * 0.1 : 0.18 + rng() * 0.12);
    sellPrice = clamp(sellPrice + (rng() - 0.5) * 0.06 * intensity, 0.01, buyPrice - 0.02);
    buy.push(round3(buyPrice));
    sell.push(round3(sellPrice));

    const g = (mu: number, sigma: number) => Math.exp(-0.5 * ((hour - mu) / sigma) ** 2);
    load.push(round2(clamp(
      baseLoad + morningAmp * g(9, 1.5) + eveningAmp * g(19.5, 2) + middayBump * g(13, 3) + randn(rng) * noiseKW,
      10,
      2000,
    )));

    let pvValue = 0;
    if (hour >= sunrise && hour <= sunset) {
      const x = (hour - sunrise) / Math.max(0.001, sunset - sunrise);
      pvValue = pvPeak * Math.pow(Math.sin(Math.PI * x), pvShape);
      if (cloudHold <= 0) {
        cloudTarget = 0.55 + rng() * 0.55;
        cloudHold = 2 + Math.floor(rng() * 10);
      }
      cloud += (cloudTarget - cloud) * (0.1 + rng() * 0.15);
      cloudHold -= 1;
      pvValue *= clamp(cloud, 0.35, 1.15) * clamp(1.0 - Math.abs(randn(rng)) * 0.1 * intensity, 0.4, 1.2);
    }
    pv.push(round2(clamp(pvValue, 0, 5000)));
  }

  return { buy, sell, pv, load };
}

function hourIndex(point: number, dtMinutes: number) {
  return clamp(Math.floor((point * dtMinutes) / 60) % 24, 0, 23);
}

function basePrice(ruleValue: FlowRule, hour: number, negativePolicy: NegativePolicy) {
  let price = SAMPLE_MARKET_24[hour] ?? 0;
  if (ruleValue.base === 'tou') price = SAMPLE_TOU_24[hour] ?? 0;
  if (ruleValue.base === 'fixed') price = ruleValue.fixed;
  return negativePolicy === 'clamp_zero' && price < 0 ? 0 : price;
}

function clampByRule(value: number, ruleValue: FlowRule, negativePolicy: NegativePolicy) {
  let next = value;
  if ((negativePolicy === 'clamp_zero' || !ruleValue.allowNeg) && next < 0) next = 0;
  if (typeof ruleValue.min === 'number' && Number.isFinite(ruleValue.min)) next = Math.max(next, ruleValue.min);
  if (typeof ruleValue.max === 'number' && Number.isFinite(ruleValue.max)) next = Math.min(next, ruleValue.max);
  return round3(next);
}

function calcFlowPrice(
  rules: Record<FlowKey, FlowRule>,
  key: FlowKey,
  hour: number,
  negativePolicy: NegativePolicy,
  visited = new Set<FlowKey>(),
): number {
  const ruleValue = rules[key];
  if (!ruleValue || visited.has(key)) return 0;
  visited.add(key);

  let value = 0;
  if (ruleValue.mode === 'fixed') {
    value = ruleValue.fixed;
  } else if (ruleValue.mode === 'same' && ruleValue.ref) {
    value = calcFlowPrice(rules, ruleValue.ref, hour, negativePolicy, visited);
  } else {
    const base = basePrice(ruleValue, hour, negativePolicy);
    value = ruleValue.mode === 'spread' ? base + ruleValue.offset : base * ruleValue.factor + ruleValue.offset;
  }

  return clampByRule(value, ruleValue, negativePolicy);
}

function buildOptimizerPriceAdapter({
  rules,
  dtMinutes,
  points,
  negativePolicy,
}: {
  rules: Record<FlowKey, FlowRule>;
  dtMinutes: number;
  points: number;
  negativePolicy: NegativePolicy;
}) {
  const flowSeries = {} as Record<FlowKey, number[]>;
  FLOW_DEFS.forEach((flow) => {
    flowSeries[flow.key] = Array.from({ length: points }, (_, point) => (
      calcFlowPrice(rules, flow.key, hourIndex(point, dtMinutes), negativePolicy)
    ));
  });
  const buyPrice = flowSeries.grid_to_load;
  const sellPrice = flowSeries.pv_to_grid.map((pvSell, index) => Math.max(0, Math.min(pvSell, flowSeries.bess_to_grid[index] ?? pvSell)));
  return {
    flowSeries,
    buyPrice,
    sellPrice,
    warnings: negativePolicy === 'approval'
      ? ['negative-price-approval', 'buy-sell-adapter']
      : ['buy-sell-adapter'],
  };
}

function quantile(values: number[], ratio: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)))] ?? 0;
}

function buildMockOptimization(payload: {
  dtMinutes: number;
  buyPrice: number[];
  sellPrice: number[];
  pvForecastKW: number[];
  loadForecastKW: number[];
  battery: {
    totalCapacityKWh: number;
    currentSocPct: number;
    socMinPct: number;
    socMaxPct: number;
    maxChargePowerKW: number;
    maxDischargePowerKW: number;
    etaRoundTrip: number;
    endSocTargetPct: number;
  };
  exportLimitKW: number | null;
  importLimitKW: number | null;
  demandLimitKW: number | null;
  demandLimitSeriesKW: number[] | null;
  demandViolationCostPerKWh: number;
  cycleCostPerKWh: number;
  curtailPenalty: number;
}): OptimizeResponse {
  const count = Math.min(payload.buyPrice.length, payload.sellPrice.length, payload.pvForecastKW.length, payload.loadForecastKW.length);
  const dtH = Math.max(1, payload.dtMinutes) / 60;
  const chargeEta = Math.sqrt(clamp(payload.battery.etaRoundTrip, 0.000001, 1));
  const dischargeEta = chargeEta;
  const cap = Math.max(0.0001, payload.battery.totalCapacityKWh);
  const socMinEnergy = cap * clamp(payload.battery.socMinPct, 0, 100) / 100;
  const socMaxEnergy = cap * clamp(payload.battery.socMaxPct, 0, 100) / 100;
  let energy = cap * clamp(payload.battery.currentSocPct, 0, 100) / 100;
  energy = clamp(energy, socMinEnergy, socMaxEnergy);
  const lowPrice = quantile(payload.buyPrice.slice(0, count), 0.35);
  const highPrice = quantile(payload.buyPrice.slice(0, count), 0.65);
  const steps: OptimizeStep[] = [];
  let baselineCost = 0;
  let optimizedCost = 0;
  let throughput = 0;
  let importEnergy = 0;
  let exportEnergy = 0;
  let pvCurtEnergy = 0;
  let demandPenaltyCost = 0;
  let maxImportOverKW = 0;

  for (let i = 0; i < count; i += 1) {
    const buy = payload.buyPrice[i] ?? 0;
    const sell = payload.sellPrice[i] ?? 0;
    const pv = Math.max(0, payload.pvForecastKW[i] ?? 0);
    const load = Math.max(0, payload.loadForecastKW[i] ?? 0);
    const netLoad = load - pv;
    const demandLimit = payload.demandLimitSeriesKW?.[i] ?? payload.demandLimitKW;
    const overDemandKW = typeof demandLimit === 'number' ? Math.max(0, netLoad - demandLimit) : 0;
    let batteryPowerKW = 0;
    const canChargeKW = Math.max(0, (socMaxEnergy - energy) / Math.max(dtH * chargeEta, 0.000001));
    const canDischargeKW = Math.max(0, ((energy - socMinEnergy) * dischargeEta) / Math.max(dtH, 0.000001));
    const pvSurplus = Math.max(0, pv - load);

    if ((buy >= highPrice || overDemandKW > 0) && canDischargeKW > 0) {
      batteryPowerKW = Math.min(payload.battery.maxDischargePowerKW, canDischargeKW, Math.max(netLoad, overDemandKW, payload.battery.maxDischargePowerKW * 0.35));
    } else if ((buy <= lowPrice || pvSurplus > 0) && canChargeKW > 0) {
      batteryPowerKW = -Math.min(payload.battery.maxChargePowerKW, canChargeKW, Math.max(pvSurplus, payload.battery.maxChargePowerKW * 0.35));
    }

    if (batteryPowerKW < 0) {
      energy += Math.abs(batteryPowerKW) * dtH * chargeEta;
    } else if (batteryPowerKW > 0) {
      energy -= batteryPowerKW * dtH / dischargeEta;
    }
    energy = clamp(energy, socMinEnergy, socMaxEnergy);

    let gridPowerKW = load - pv - batteryPowerKW;
    let gridImportKW = Math.max(0, gridPowerKW);
    let gridExportKW = Math.max(0, -gridPowerKW);
    let pvCurtKW = 0;
    if (payload.importLimitKW !== null && gridImportKW > payload.importLimitKW) {
      gridImportKW = payload.importLimitKW;
      gridPowerKW = gridImportKW;
    }
    if (payload.exportLimitKW !== null && gridExportKW > payload.exportLimitKW) {
      pvCurtKW = gridExportKW - payload.exportLimitKW;
      gridExportKW = payload.exportLimitKW;
      gridPowerKW = -gridExportKW;
    }

    const importOverKW = typeof demandLimit === 'number' ? Math.max(0, gridImportKW - demandLimit) : 0;
    maxImportOverKW = Math.max(maxImportOverKW, importOverKW);
    demandPenaltyCost += importOverKW * dtH * payload.demandViolationCostPerKWh;
    baselineCost += Math.max(0, netLoad) * buy * dtH - Math.max(0, -netLoad) * sell * dtH;
    optimizedCost += gridImportKW * buy * dtH - gridExportKW * sell * dtH
      + Math.abs(batteryPowerKW) * dtH * payload.cycleCostPerKWh
      + pvCurtKW * dtH * payload.curtailPenalty
      + importOverKW * dtH * payload.demandViolationCostPerKWh;
    throughput += Math.abs(batteryPowerKW) * dtH;
    importEnergy += gridImportKW * dtH;
    exportEnergy += gridExportKW * dtH;
    pvCurtEnergy += pvCurtKW * dtH;

    const minutes = i * payload.dtMinutes;
    steps.push({
      time: `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
      pvKW: round2(pv),
      loadKW: round2(load),
      buyPrice: round3(buy),
      sellPrice: round3(sell),
      batteryPowerKW: round2(batteryPowerKW),
      socPct: round2((energy / cap) * 100),
      gridPowerKW: round2(gridPowerKW),
      gridImportKW: round2(gridImportKW),
      gridExportKW: round2(gridExportKW),
      pvCurtKW: round2(pvCurtKW),
      importOverKW: round2(importOverKW),
    });
  }

  return {
    steps,
    summary: {
      objectiveValue: round2(optimizedCost),
      optimizedCost: round2(optimizedCost),
      baselineCost: round2(baselineCost),
      saving: round2(baselineCost - optimizedCost),
      endSocPct: steps.length ? steps[steps.length - 1].socPct : payload.battery.currentSocPct,
      totalBatteryThroughputKWh: round2(throughput),
      totalGridImportKWh: round2(importEnergy),
      totalGridExportKWh: round2(exportEnergy),
      totalPvCurtKWh: round2(pvCurtEnergy),
      maxImportOverKW: round2(maxImportOverKW),
      demandPenaltyCost: round2(demandPenaltyCost),
    },
  };
}

function minutesFromHHMM(time: string) {
  const [hh, mm] = time.split(':').map((part) => Number(part));
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
}

function hhmmFromMinutes(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

function dispatchTypeFromPower(powerKW: number, deadbandKW = 1): DispatchAction {
  if (powerKW > deadbandKW) return 'Discharge';
  if (powerKW < -deadbandKW) return 'Charge';
  return 'Standby';
}

function compressDispatchSegments(steps: OptimizeStep[], dtMinutes: number): DispatchSegment[] {
  if (!steps.length) return [];
  const segments: Array<DispatchSegment & { socSum: number; socCount: number }> = [];
  steps.forEach((step, index) => {
    const type = dispatchTypeFromPower(step.batteryPowerKW);
    const roundedPower = type === 'Standby' ? 0 : Math.round(Math.abs(step.batteryPowerKW) / 5) * 5;
    const startMinute = minutesFromHHMM(step.time);
    const end = hhmmFromMinutes(index === steps.length - 1 ? startMinute + dtMinutes : minutesFromHHMM(steps[index + 1].time));
    const prev = segments[segments.length - 1];
    if (prev && prev.type === type && Math.abs(prev.powerKW - roundedPower) <= 5) {
      const nextPoints = prev.points + 1;
      prev.powerKW = Math.round(((prev.powerKW * prev.points) + roundedPower) / nextPoints);
      prev.end = end;
      prev.points = nextPoints;
      prev.socSum += step.socPct;
      prev.socCount += 1;
      prev.avgSocPct = round2(prev.socSum / prev.socCount);
      return;
    }
    segments.push({
      start: hhmmFromMinutes(startMinute),
      end,
      type,
      powerKW: roundedPower,
      avgSocPct: round2(step.socPct),
      points: 1,
      socSum: step.socPct,
      socCount: 1,
    });
  });
  return segments.map(({ socSum: _socSum, socCount: _socCount, ...segment }) => segment);
}

function templateLabel(template: PriceTemplate, lang: Language) {
  const key = lang === 'zh' ? 'zh' : 'en';
  const labels = {
    market: { en: 'Market Discount', zh: '市场联动折扣' },
    tou: { en: 'Industrial TOU', zh: '工商业分时' },
    ppa: { en: 'Fixed / PPA', zh: '一口价/PPA' },
  };
  return labels[template][key];
}

function objectiveLabel(objective: CloudObjective, lang: Language) {
  const key = lang === 'zh' ? 'zh' : 'en';
  const labels = {
    storage_profit: { en: 'Storage Profit', zh: '储能收益最大化' },
    green: { en: 'Green Energy', zh: '绿电消纳最大化' },
    station_profit: { en: 'Station Profit', zh: '全站收益最大化' },
  };
  return labels[objective][key];
}

const AIDispatchOptimizer: React.FC<AIDispatchOptimizerProps> = ({
  lang,
  theme,
  selectedStation,
  selectedStationData,
  viewMode = 'home',
  optimizerStatus: controlledOptimizerStatus,
  onOptimizerStatusChange,
  onStartTrial,
  onEnabled,
}) => {
  const copy = translations[lang].aiDispatchOptimizer;
  const isDark = theme === 'dark';
  const tx = useCallback((zh: string, en: string) => (lang === 'zh' ? zh : en), [lang]);
  const activeStationId = selectedStationData?.id ?? 'ST-002';
  const activeStationName = selectedStationData?.name ?? selectedStation ?? tx('站点 #2 (慕尼黑)', 'Station #2 (Munich)');
  const stationTypeValue = (() => {
    const type = selectedStationData?.type;
    if (!type) return '-';
    if (['Industrial', 'Commercial', '工业', '商业'].includes(type)) return 'Commercial & Industrial BESS';
    if (['Microgrid', '微电网'].includes(type)) return 'Utility-Scale BESS';
    return type;
  })();
  const activeStationMeta = [
    { label: tx('站点类型', 'Station Type'), value: stationTypeValue },
    { label: tx('时区', 'Timezone'), value: selectedStationData?.timezone || 'Asia/Shanghai' },
    { label: tx('位置', 'Location'), value: selectedStationData?.location || '-' },
  ];
  const objectiveOptions = useMemo(() => ([
    {
      key: 'storage_profit' as CloudObjective,
      icon: BatteryCharging,
      title: tx('储能收益最大化', 'Storage Profit'),
      description: tx('优先捕捉低充高放价差，提升储能单体套利收益。', 'Prioritize charge-discharge spreads to improve battery arbitrage returns.'),
      metric: tx('价差套利', 'Spread Capture'),
      accent: 'from-brand-400/20 to-emerald-400/10 text-brand-700 dark:text-brand-200',
    },
    {
      key: 'green' as CloudObjective,
      icon: Leaf,
      title: tx('绿电消纳最大化', 'Green Energy'),
      description: tx('优先吸收光伏富余电量，减少弃光并提高绿电利用率。', 'Prioritize PV surplus absorption to reduce curtailment and improve green usage.'),
      metric: tx('弃光降低', 'Curtailment Down'),
      accent: 'from-emerald-400/20 to-lime-300/10 text-emerald-700 dark:text-emerald-200',
    },
    {
      key: 'station_profit' as CloudObjective,
      icon: TrendingUp,
      title: tx('全站收益最大化', 'Station Profit'),
      description: tx('综合购售电、需量惩罚与循环成本，优化全站收益。', 'Balance energy trading, demand penalties and cycling cost for station-level profit.'),
      metric: tx('全站最优', 'Station Optimum'),
      accent: 'from-amber-300/25 to-brand-300/10 text-amber-700 dark:text-amber-200',
    },
  ]), [tx]);
  const chartColors = useMemo(() => ({
    grid: isDark ? '#38404c' : '#e2e8f0',
    text: isDark ? '#94a3b8' : '#64748b',
    card: isDark ? '#1e2128' : '#ffffff',
    tooltip: isDark ? '#252a32' : '#ffffff',
  }), [isDark]);

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [priceTemplate, setPriceTemplate] = useState<PriceTemplate>('market');
  const [priceRules, setPriceRules] = useState<Record<FlowKey, FlowRule>>(() => defaultRules('market'));
  const [marketSource, setMarketSource] = useState(MARKET_SOURCES[0]);
  const [granularity, setGranularity] = useState('15分钟');
  const [negativePolicy, setNegativePolicy] = useState<NegativePolicy>('allow');
  const [objective, setObjective] = useState<CloudObjective>('storage_profit');
  const [strategyMode, setStrategyMode] = useState<CloudStrategyMode>('rolling');
  const [optimizationPeriod, setOptimizationPeriod] = useState('15分钟');
  const [rollingWindow, setRollingWindow] = useState('24h');
  const [dispatchMethod, setDispatchMethod] = useState('auto_after_recalc');
  const [dtMinutes, setDtMinutes] = useState(15);
  const [capKWh, setCapKWh] = useState(1000);
  const soc0Pct = 48;
  const [socMinPct, setSocMinPct] = useState(15);
  const [socMaxPct, setSocMaxPct] = useState(95);
  const [socEndPct, setSocEndPct] = useState(30);
  const [pChMax, setPChMax] = useState(500);
  const [pDisMax, setPDisMax] = useState(500);
  const [etaRoundTrip, setEtaRoundTrip] = useState(0.9);
  const [exportLimit, setExportLimit] = useState('300');
  const [importLimit, setImportLimit] = useState('800');
  const [demandLimit, setDemandLimit] = useState('700');
  const [demandPenalty, setDemandPenalty] = useState(200);
  const [cycleCost, setCycleCost] = useState(0.02);
  const [curtPenalty, setCurtPenalty] = useState(0.05);
  const [demandSeriesText, setDemandSeriesText] = useState('');
  const example = useMemo(() => makeRandomExample96(), []);
  const [buyText, setBuyText] = useState(() => toCsv(example.buy));
  const [sellText, setSellText] = useState(() => toCsv(example.sell));
  const [pvText, setPvText] = useState(() => toCsv(example.pv));
  const [loadText, setLoadText] = useState(() => toCsv(example.load));
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [error, setError] = useState('');
  const [deployStatus, setDeployStatus] = useState<DeployStatus>('idle');
  const [message, setMessage] = useState('');
  const [internalOptimizerStatus, setInternalOptimizerStatus] = useState<OptimizerSwitchStatus>('trial');
  const [guideStep, setGuideStep] = useState(0);
  const [openSourceDropdown, setOpenSourceDropdown] = useState<string | null>(null);
  const [openMatrixDropdown, setOpenMatrixDropdown] = useState<string | null>(null);
  const [activePriceFlow, setActivePriceFlow] = useState<FlowKey>('grid_to_load');
  const [pvToBessPricingMode, setPvToBessPricingMode] = useState<'fixed' | 'user_discount' | 'none'>('fixed');
  const [showPriceSelectionModal, setShowPriceSelectionModal] = useState(false);
  const [selectedPriceSchemeId, setSelectedPriceSchemeId] = useState('SCH-001');
  const [modalPriceTab, setModalPriceTab] = useState<'user' | 'api'>('user');
  const optimizerStatus = controlledOptimizerStatus ?? internalOptimizerStatus;
  const setOptimizerStatusValue = (status: OptimizerSwitchStatus) => {
    setInternalOptimizerStatus(status);
    onOptimizerStatusChange?.(status);
  };
  const isSetupPage = viewMode === 'setup';
  const isOptimizerEnabled = optimizerStatus === 'on';
  const isConfiguring = optimizerStatus === 'configuring';
  const { userSchemes, systemSchemes, selectedPriceScheme } = useMemo(() => {
    const schemes = lang === 'zh' ? PRICE_SCHEMES_ZH : PRICE_SCHEMES_EN;
    return {
      userSchemes: schemes.filter((scheme) => scheme.source === 'User'),
      systemSchemes: schemes.filter((scheme) => scheme.source === 'API'),
      selectedPriceScheme: schemes.find((scheme) => scheme.id === selectedPriceSchemeId) ?? schemes[0],
    };
  }, [lang, selectedPriceSchemeId]);

  const optimizerStatusText = useMemo(() => {
    if (optimizerStatus === 'trial') return copy.statusControl.trial;
    if (optimizerStatus === 'configuring') return copy.statusControl.configuring;
    return optimizerStatus === 'on' ? copy.statusControl.on : copy.statusControl.off;
  }, [copy.statusControl.configuring, copy.statusControl.off, copy.statusControl.on, copy.statusControl.trial, optimizerStatus]);

  const toggleOptimizerStatus = () => {
    if (optimizerStatus === 'on') {
      setOptimizerStatusValue('off');
    } else {
      startTrial();
    }
    setError('');
    setMessage('');
  };

  const startTrial = () => {
    setOptimizerStatusValue('configuring');
    setGuideStep(0);
    setError('');
    setMessage('');
    onStartTrial?.();
  };

  const series = useMemo(() => ({
    buy: parseSeries(buyText),
    sell: parseSeries(sellText),
    pv: parseSeries(pvText),
    load: parseSeries(loadText),
  }), [buyText, sellText, pvText, loadText]);

  const adapter = useMemo(() => buildOptimizerPriceAdapter({
    rules: priceRules,
    dtMinutes,
    points: Math.max(series.pv.length, series.load.length, 96),
    negativePolicy,
  }), [dtMinutes, negativePolicy, priceRules, series.load.length, series.pv.length]);

  const pricePreviewRows = useMemo(() => Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    market: negativePolicy === 'clamp_zero' ? Math.max(0, SAMPLE_MARKET_24[hour] ?? 0) : SAMPLE_MARKET_24[hour] ?? 0,
    buy: calcFlowPrice(priceRules, 'grid_to_load', hour, negativePolicy),
    charge: calcFlowPrice(priceRules, 'grid_to_bess', hour, negativePolicy),
    pvSell: calcFlowPrice(priceRules, 'pv_to_grid', hour, negativePolicy),
    bessSell: calcFlowPrice(priceRules, 'bess_to_grid', hour, negativePolicy),
  })), [negativePolicy, priceRules]);

  const predictionRows = useMemo(() => {
    const count = Math.min(series.pv.length, series.load.length);
    return Array.from({ length: count }, (_, index) => {
      const minutes = index * dtMinutes;
      return {
        time: `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
        pvForecast: series.pv[index] ?? 0,
        loadForecast: series.load[index] ?? 0,
        netLoad: (series.load[index] ?? 0) - (series.pv[index] ?? 0),
        buyPrice: series.buy[index] ?? adapter.buyPrice[index] ?? 0,
        sellPrice: series.sell[index] ?? adapter.sellPrice[index] ?? 0,
      };
    });
  }, [adapter.buyPrice, adapter.sellPrice, dtMinutes, series]);

  const simRows = useMemo(() => (result?.steps ?? []).map((step) => ({
    ...step,
    priceScaled: step.buyPrice * 100,
  })), [result]);
  const dashboardRows = useMemo(() => {
    const rows = result?.steps.length ? result.steps : predictionRows.map((row, index) => {
      const surplus = Math.max(0, row.pvForecast - row.loadForecast);
      const chargeWindow = index < 20 || (index >= 48 && index < 64);
      const dischargeWindow = index >= 32 && index < 44;
      return {
        time: row.time,
        pvKW: row.pvForecast,
        loadKW: row.loadForecast,
        batteryPowerKW: chargeWindow ? -Math.min(pChMax, 80 + surplus * 0.45) : dischargeWindow ? Math.min(pDisMax, 120 + row.loadForecast * 0.2) : 0,
        buyPrice: row.buyPrice,
        sellPrice: row.sellPrice,
        socPct: clamp(55 + Math.sin(index / 96 * Math.PI * 2) * 28 + (chargeWindow ? 18 : 0) - (dischargeWindow ? 16 : 0), socMinPct, socMaxPct),
        gridPowerKW: row.netLoad,
        gridImportKW: Math.max(0, row.netLoad),
        gridExportKW: Math.max(0, -row.netLoad),
        pvCurtKW: 0,
      };
    });

    return rows.map((row, index) => ({
      ...row,
      userPriceEurMWh: round2((row.buyPrice ?? 0) * 100),
      marketPriceEurMWh: round2((row.sellPrice ?? row.buyPrice ?? 0) * 100),
      socMinLine: socMinPct,
      socMaxLine: socMaxPct,
      socEndLine: socEndPct,
      timeIndex: index,
    }));
  }, [pChMax, pDisMax, predictionRows, result, socEndPct, socMaxPct, socMinPct]);
  const dashboardSummary = useMemo(() => {
    const throughput = result?.summary.totalBatteryThroughputKWh ?? 999.8;
    return {
      throughputKWh: round2(throughput),
      cycles: round2(throughput / Math.max(capKWh * 2, 1)),
    };
  }, [capKWh, result]);

  const priceModelSnapshot = useMemo(() => ({
    phase: 'phase_2_embedded_price_model',
    version: 'integrated_price_model_v1',
    template: priceTemplate,
    templateLabel: templateLabel(priceTemplate, lang),
    marketSource,
    granularity,
    timezone: 'Asia/Shanghai',
    negativePolicy,
    flowRules: priceRules,
    adapter: {
      buyPrice: 'grid_to_load',
      sellPrice: 'min(pv_to_grid,bess_to_grid)',
      optimizerInterface: 'buyPrice/sellPrice',
    },
    warnings: adapter.warnings,
  }), [adapter.warnings, granularity, lang, marketSource, negativePolicy, priceRules, priceTemplate]);

  const dispatchDraft: DispatchStrategyDraft | null = useMemo(() => {
    if (!result) return null;
    return {
      stationId: activeStationId,
      stationName: activeStationName,
      strategyDate: new Date().toISOString().slice(0, 10),
      source: 'dynamic-price-optimizer',
      mode: strategyMode,
      objective,
      marketSource,
      granularity,
      timezone: 'Asia/Shanghai',
      priceModel: priceModelSnapshot,
      segments: compressDispatchSegments(result.steps, dtMinutes),
      summary: result.summary,
      rawPointCount: result.steps.length,
    };
  }, [activeStationId, activeStationName, dtMinutes, granularity, marketSource, objective, priceModelSnapshot, result, strategyMode]);

  const deployStatusLabel = useMemo(() => {
    if (!dispatchDraft) return copy.status.pending;
    if (deployStatus === 'confirm') return copy.status.confirm;
    if (deployStatus === 'deployed') return copy.status.deployed;
    return copy.status.ready;
  }, [copy.status.confirm, copy.status.deployed, copy.status.pending, copy.status.ready, deployStatus, dispatchDraft]);

  const configJson = useMemo(() => JSON.stringify({
    dataSources: {
      load: 'Load_P_Total_kW',
      pv: 'PV_P_Total_kW',
      bess: 'BESS_P_Total_kW',
      grid: 'Grid_PCC_Power',
      soc: 'BESS_SOC_Avg',
    },
    priceModel: priceModelSnapshot,
    solver: {
      dtMinutes,
      totalCapacityKWh: capKWh,
      socMinPct,
      socMaxPct,
      endSocTargetPct: socEndPct,
      maxChargePowerKW: pChMax,
      maxDischargePowerKW: pDisMax,
      etaRoundTrip,
      exportLimitKW: exportLimit,
      importLimitKW: importLimit,
      demandLimitKW: demandLimit,
      demandPenalty,
      cycleCost,
      curtailPenalty: curtPenalty,
    },
    objective,
    strategyMode: {
      mode: strategyMode,
      optimizationPeriod,
      rollingWindow,
      dispatchMethod,
    },
    dispatchDraft,
  }, null, 2), [
    capKWh, curtPenalty, cycleCost, demandLimit, demandPenalty, dispatchDraft, dispatchMethod, dtMinutes, etaRoundTrip,
    exportLimit, importLimit, objective, pChMax, pDisMax, priceModelSnapshot, soc0Pct, socEndPct, socMaxPct,
    socMinPct, optimizationPeriod, rollingWindow, strategyMode,
  ]);

  const setTemplate = (template: PriceTemplate) => {
    setPriceTemplate(template);
    setPriceRules(defaultRules(template));
    setActivePriceFlow('grid_to_load');
    setResult(null);
    setDeployStatus('idle');
    setMessage(tx(`${templateLabel(template, lang)} 已应用。`, `${templateLabel(template, lang)} applied.`));
  };

  const syncCloudPrices = () => {
    setBuyText(toCsv(adapter.buyPrice));
    setSellText(toCsv(adapter.sellPrice));
    setMessage(copy.messages.priceSynced);
  };

  const validate = () => {
    const warnings: string[] = [];
    if (!series.pv.length || !series.load.length) warnings.push(copy.errors.missingForecast);
    if (series.pv.length && series.load.length && series.pv.length !== series.load.length) warnings.push(copy.errors.forecastLength);
    if (socMinPct >= socMaxPct) warnings.push(copy.errors.socRange);
    if (socEndPct < socMinPct) warnings.push(copy.errors.endSoc);
    if (etaRoundTrip <= 0 || etaRoundTrip > 1) warnings.push(copy.errors.eta);
    if (capKWh <= 0 || pChMax <= 0 || pDisMax <= 0) warnings.push(copy.errors.capacity);
    const demandSeries = demandSeriesText.trim() ? parseSeries(demandSeriesText) : null;
    if (demandSeries && demandSeries.length !== series.pv.length) warnings.push(copy.errors.demandSeries);
    return warnings;
  };

  const runOptimization = (nextTab: TabKey = 'dashboard') => {
    setMessage('');
    const warnings = validate();
    if (warnings.length) {
      setError(warnings.join(' '));
      return false;
    }

    const demandSeries = demandSeriesText.trim() ? parseSeries(demandSeriesText) : null;
    const payload = {
      dtMinutes,
      buyPrice: adapter.buyPrice.slice(0, series.pv.length),
      sellPrice: adapter.sellPrice.slice(0, series.pv.length),
      pvForecastKW: series.pv,
      loadForecastKW: series.load,
      battery: {
        totalCapacityKWh: capKWh,
        currentSocPct: soc0Pct,
        socMinPct,
        socMaxPct,
        maxChargePowerKW: pChMax,
        maxDischargePowerKW: pDisMax,
        etaRoundTrip,
        endSocTargetPct: socEndPct,
      },
      exportLimitKW: exportLimit.trim() === '' ? null : Math.max(0, Number(exportLimit)),
      importLimitKW: importLimit.trim() === '' ? null : Math.max(0, Number(importLimit)),
      demandLimitKW: demandLimit.trim() === '' ? null : Math.max(0, Number(demandLimit)),
      demandLimitSeriesKW: demandSeries,
      demandViolationCostPerKWh: Math.max(0, demandPenalty),
      cycleCostPerKWh: Math.max(0, cycleCost),
      curtailPenalty: Math.max(0, curtPenalty),
    };
    setBuyText(toCsv(payload.buyPrice));
    setSellText(toCsv(payload.sellPrice));
    setResult(buildMockOptimization(payload));
    setError('');
    setDeployStatus('idle');
    setActiveTab(nextTab);
    return true;
  };

  const generateDispatch = () => {
    runOptimization('dashboard');
  };

  const keepGuideConfiguration = () => {
    setError('');
    setMessage(copy.messages.configSaved);
  };

  const saveAndEnableGuide = () => {
    if (!runOptimization('dashboard')) return;
    setOptimizerStatusValue('on');
    setMessage('');
    onEnabled?.();
  };

  const requestDeploy = () => {
    if (!dispatchDraft) {
      setError(copy.errors.noDraft);
      return;
    }
    setDeployStatus('confirm');
    setMessage(copy.messages.deployConfirm);
  };

  const confirmDeploy = () => {
    if (!dispatchDraft) return;
    setDeployStatus('deployed');
    setMessage(copy.messages.deployed.replace('{count}', String(dispatchDraft.segments.length)));
  };

  const regenerateExample = () => {
    const next = makeRandomExample96(Math.floor(Date.now() % 2_000_000_000));
    setBuyText(toCsv(next.buy));
    setSellText(toCsv(next.sell));
    setPvText(toCsv(next.pv));
    setLoadText(toCsv(next.load));
    setResult(null);
    setDeployStatus('idle');
    setError('');
    setMessage(copy.messages.sampleReady);
  };

  const renderTabButton = (tab: TabKey) => {
    const Icon = TAB_ICONS[tab];
    const active = activeTab === tab;
    return (
      <button
        key={tab}
        type="button"
        onClick={() => setActiveTab(tab)}
        className={`flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition-all ${
          active
            ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/45 dark:text-brand-300'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-apple-surface-secondary-dark dark:hover:text-slate-100'
        }`}
      >
        <Icon size={16} />
        {copy.tabs[tab]}
      </button>
    );
  };

  const renderDashboard = () => {
    const selectedObjective = objectiveOptions.find((item) => item.key === objective) ?? objectiveOptions[0];
    const Icon = selectedObjective.icon;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-100 dark:bg-apple-surface-dark dark:ring-white/5">
              <DashboardChartHeader
                title={tx('调度功率预测', 'Dispatch Power Forecast')}
                subtitle={tx('光伏、负荷与储能功率统一趋势，储能正值为放电，负值为充电。', 'Unified trend for PV, load and BESS power. Positive BESS values discharge, negative values charge.')}
                items={[
                  { color: '#f59e0b', label: tx('光伏', 'PV') },
                  { color: '#ef4444', label: tx('负荷', 'Load') },
                  { color: '#3b82f6', label: tx('储能功率', 'BESS Power') },
                ]}
              />
              <div className="mt-4 h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dashboardRows} margin={{ top: 10, right: 20, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: chartColors.text }} interval={11} stroke={chartColors.text} />
                    <YAxis tick={{ fill: chartColors.text }} stroke={chartColors.text} />
                    <Tooltip contentStyle={{ backgroundColor: chartColors.tooltip, border: '1px solid rgba(148,163,184,.25)', borderRadius: 12, color: chartColors.text }} />
                    <Area type="monotone" dataKey="loadKW" name={copy.chart.loadForecast} stroke="#ef4444" fill="#ef4444" fillOpacity={0.08} strokeWidth={2} />
                    <Area type="monotone" dataKey="pvKW" name={copy.chart.pvForecast} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                    <Area type="monotone" dataKey="batteryPowerKW" name={tx('储能功率', 'BESS Power')} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DashboardSmallChart
                title={tx('电价趋势', 'Price Trend')}
                subtitle={tx('市场电价与用户综合电价。', 'Market price and user blended price.')}
                items={[{ color: '#8b5cf6', label: tx('市场', 'Market') }, { color: '#ef4444', label: tx('用户综合', 'User blended') }]}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dashboardRows} margin={{ top: 8, right: 14, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: chartColors.text }} interval={15} stroke={chartColors.text} />
                    <YAxis tick={{ fill: chartColors.text, fontSize: 10 }} stroke={chartColors.text} />
                    <Tooltip contentStyle={{ backgroundColor: chartColors.tooltip, border: '1px solid rgba(148,163,184,.25)', borderRadius: 12, color: chartColors.text }} />
                    <Line type="monotone" dataKey="marketPriceEurMWh" name={tx('市场电价', 'Market Price')} stroke="#8b5cf6" dot={false} strokeWidth={2.5} />
                    <Line type="monotone" dataKey="userPriceEurMWh" name={tx('用户综合电价', 'User Blended Price')} stroke="#ef4444" dot={false} strokeWidth={2.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </DashboardSmallChart>

              <DashboardSmallChart
                title={tx('SOC 运行边界', 'SOC Operating Bounds')}
                subtitle={tx('SOC 与最小/最大/期末下限。', 'SOC with min/max/end lower bounds.')}
                items={[{ color: '#22c55e', label: 'SOC' }, { color: '#60a5fa', label: tx('最小', 'Min') }, { color: '#f59e0b', label: tx('最大', 'Max') }, { color: '#a855f7', label: tx('期末', 'End') }]}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dashboardRows} margin={{ top: 8, right: 14, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: chartColors.text }} interval={15} stroke={chartColors.text} />
                    <YAxis domain={[0, 100]} tick={{ fill: chartColors.text, fontSize: 10 }} stroke={chartColors.text} />
                    <Tooltip contentStyle={{ backgroundColor: chartColors.tooltip, border: '1px solid rgba(148,163,184,.25)', borderRadius: 12, color: chartColors.text }} />
                    <Line type="monotone" dataKey="socPct" name="SOC" stroke="#22c55e" dot={false} strokeWidth={3} />
                    <Line type="monotone" dataKey="socMinLine" name={tx('SOC最小', 'SOC Min')} stroke="#60a5fa" dot={false} strokeDasharray="6 6" />
                    <Line type="monotone" dataKey="socMaxLine" name={tx('SOC最大', 'SOC Max')} stroke="#f59e0b" dot={false} strokeDasharray="6 6" />
                    <Line type="monotone" dataKey="socEndLine" name={tx('末期下限', 'End Min')} stroke="#a855f7" dot={false} strokeDasharray="6 6" />
                  </ComposedChart>
                </ResponsiveContainer>
              </DashboardSmallChart>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-brand-100 dark:bg-white/10 dark:text-brand-200 dark:ring-white/10">
                <Icon size={22} />
              </div>
              <span className="rounded-full bg-brand-600 px-2 py-1 text-[10px] font-black text-white">SELECTED</span>
            </div>
            <div className="mt-5 text-base font-black text-slate-900 dark:text-white">{selectedObjective.title}</div>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500 dark:text-slate-400">{selectedObjective.description}</p>
            <div className="mt-4 flex items-center gap-2 text-xs font-black text-brand-700 dark:text-brand-200">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {selectedObjective.metric}
            </div>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-100 dark:bg-apple-surface-dark dark:ring-white/5">
            <div className="text-xl font-black text-slate-900 dark:text-white">{selectedPriceScheme?.name ?? '-'}</div>
            <div className="mt-2 font-mono text-sm font-black text-slate-400">{selectedPriceScheme?.id ?? 'SCH-001'}</div>
            </div>
            <DashboardMetricCard tone="blue" label={tx('预测BESS充放电', 'Forecast BESS Throughput')} value={dashboardSummary.throughputKWh} suffix="kWh" />
            <DashboardMetricCard tone="green" label={tx('循环次数', 'Cycle Count')} value={dashboardSummary.cycles} suffix={tx('次', 'cycles')} />
          </div>
        </div>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="ems-card overflow-hidden">
          <CardHeader title={copy.currentEdge} subtitle={copy.currentEdgeHint} />
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
            <StatusPill label={copy.labels.strategy} value={tx('收益最大化', 'Profit Maximization')} />
            <StatusPill label={copy.labels.mode} value={tx('自动', 'Auto')} />
            <StatusPill label={copy.labels.lastSync} value="14:30:00" />
          </div>
          <MiniDispatchTable
            rows={[
              ['00:00', '06:00', 'Charge', '120 kW'],
              ['06:00', '12:00', 'Standby', '0 kW'],
              ['12:00', '16:00', 'Discharge', '180 kW'],
              ['16:00', '22:00', 'Charge', '160 kW'],
            ]}
          />
        </div>

        <div className="ems-card overflow-hidden">
          <CardHeader
            title={copy.cloudOptimized}
            subtitle={copy.cloudOptimizedHint}
            right={<StatusPill label={copy.labels.status} value={dispatchDraft ? copy.status.ready : copy.status.pending} />}
          />
          {result ? (
            <>
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
                <Metric label={copy.metrics.saving} value={result.summary.saving} suffix={copy.units.currency} />
                <Metric label={copy.metrics.optimizedCost} value={result.summary.optimizedCost} suffix={copy.units.currency} />
                <Metric label={copy.metrics.endSoc} value={result.summary.endSocPct} suffix="%" />
              </div>
              {dispatchDraft && (
                <DispatchSegmentTable segments={dispatchDraft.segments.slice(0, 6)} compact />
              )}
            </>
          ) : (
            <div className="p-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-300">
                <div className="font-black text-slate-900 dark:text-white">{copy.noCloudStrategy}</div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{copy.noCloudStrategyHint}</p>
                <button type="button" onClick={generateDispatch} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white hover:bg-brand-500">
                  <Play size={14} />
                  {copy.generate}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const updatePriceRule = (key: FlowKey, patch: Partial<FlowRule>) => {
    setPriceRules((rules) => ({ ...rules, [key]: { ...rules[key], ...patch } }));
  };

  const setRuleMode = (key: FlowKey, mode: RuleMode) => {
    setActivePriceFlow(key);
    setPriceRules((rules) => {
      const current = rules[key];
      const next: FlowRule = { ...current, mode };
      if (mode === 'fixed') {
        next.base = 'fixed';
        next.factor = 1;
        next.offset = 0;
        next.ref = null;
      } else if (mode === 'tou') {
        next.base = 'tou';
        next.ref = null;
      } else if (mode === 'same') {
        next.base = 'same';
        next.factor = 1;
        next.ref = current.ref ?? 'grid_to_load';
      } else {
        next.base = current.base === 'fixed' || current.base === 'same' ? 'market' : current.base;
        next.ref = null;
      }
      return { ...rules, [key]: next };
    });
  };

  const setFlowFixed = (key: FlowKey, fixed = priceRules[key].fixed) => {
    updatePriceRule(key, { mode: 'fixed', base: 'fixed', fixed, factor: 1, offset: 0, ref: null });
  };

  const setFlowMarketSpread = (key: FlowKey, offset = priceRules[key].offset) => {
    updatePriceRule(key, { mode: 'spread', base: 'market', factor: 1, offset, ref: null, allowNeg: true });
  };

  const setFlowMarketDiscount = (key: FlowKey, factor = priceRules[key].factor) => {
    updatePriceRule(key, { mode: 'discount', base: 'market', factor, offset: 0, ref: null, allowNeg: true });
  };

  const setFlowUserDiscount = (key: FlowKey, factor = priceRules[key].factor) => {
    updatePriceRule(key, { mode: 'discount', base: 'market', factor, offset: 0, ref: 'grid_to_load', allowNeg: true });
  };

  const setExportMode = (mode: 'fixed' | 'market_discount') => {
    if (mode === 'fixed') {
      setFlowFixed('pv_to_grid', priceRules.pv_to_grid.fixed);
      setFlowFixed('bess_to_grid', priceRules.bess_to_grid.fixed);
    } else {
      setFlowMarketDiscount('pv_to_grid', priceRules.pv_to_grid.factor || 0.9);
      setFlowMarketDiscount('bess_to_grid', priceRules.bess_to_grid.factor || 0.9);
    }
  };

  const setPvToBessMode = (mode: 'fixed' | 'user_discount' | 'none') => {
    setPvToBessPricingMode(mode);
    if (mode === 'fixed') setFlowFixed('pv_to_bess', priceRules.pv_to_bess.fixed || 0.3);
    if (mode === 'user_discount') setFlowUserDiscount('pv_to_bess', priceRules.pv_to_bess.factor || 0.9);
    if (mode === 'none') updatePriceRule('pv_to_bess', { mode: 'fixed', base: 'fixed', fixed: 0, factor: 1, offset: 0, ref: null });
  };

  const exportMode = priceRules.pv_to_grid.mode === 'fixed' ? 'fixed' : 'market_discount';
  const pvToLoadMode = priceRules.pv_to_load.mode === 'fixed' ? 'fixed' : 'user_discount';
  const pvToBessMode = pvToBessPricingMode;

  const renderPriceMatrixWizard = (_compact = false) => (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-apple-border-dark dark:bg-apple-surface-dark">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 p-3 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/45 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-wider text-slate-400">{tx('市场电价', 'Market Price')}</div>
          <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{tx('选择用于价格矩阵计算的市场电价曲线', 'Select the market price curve used by the price matrix')}</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SelectedPriceMiniPreview schemeName={selectedPriceScheme?.name ?? '-'} schemeId={selectedPriceScheme?.id ?? 'SCH-001'} />
          <button
            type="button"
            onClick={() => setShowPriceSelectionModal(true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-black text-white transition-colors hover:bg-brand-500"
          >
            <DollarSign size={17} />
            {tx('配置市场电价', 'Configure Market Price')}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-xs">
          <thead className="bg-white text-xs font-black uppercase tracking-wider text-slate-500 dark:bg-apple-surface-dark dark:text-slate-400">
            <tr>
              <th className="border-b border-slate-300 px-3 py-3 text-left dark:border-apple-border-dark">{tx('电价类型', 'Price Type')}</th>
              <th className="border-b border-slate-300 px-3 py-3 text-left dark:border-apple-border-dark">{tx('能量流向', 'Energy Flow')}</th>
              <th className="border-b border-slate-300 px-3 py-3 text-left dark:border-apple-border-dark">{tx('计价方式', 'Pricing Method')}</th>
              <th className="border-b border-slate-300 px-3 py-3 text-left dark:border-apple-border-dark">{tx('参数', 'Parameter')}</th>
            </tr>
          </thead>
          <tbody>
            <PriceMatrixRow
              group={tx('下网电价（用户侧综合电价）', 'Import Price (User-side Blended Price)')}
              flow={tx('电网 →', 'Grid →')}
              method={(
                <CompactSelect id="grid-to-load-method" value="market_surcharge" openId={openMatrixDropdown} onOpenChange={setOpenMatrixDropdown} onChange={() => setFlowMarketSpread('grid_to_load')} options={[{ value: 'market_surcharge', label: tx('市场电价 + 附加费', 'Market Price + Surcharge') }]} />
              )}
              parameter={<LabeledInlineInput label={tx('附加费', 'Surcharge')}><CompactNumberInput value={priceRules.grid_to_load.offset} onChange={(value) => setFlowMarketSpread('grid_to_load', value)} /></LabeledInlineInput>}
            />
            <PriceMatrixRow
              group={tx('上网电价', 'Export Price')}
              flow={tx('→ 电网', '→ Grid')}
              method={(
                <CompactSelect
                  id="export-method"
                  value={exportMode}
                  openId={openMatrixDropdown}
                  onOpenChange={setOpenMatrixDropdown}
                  onChange={(value) => setExportMode(value as 'fixed' | 'market_discount')}
                  options={[{ value: 'fixed', label: tx('一口价', 'Fixed Price') }, { value: 'market_discount', label: tx('市场电价 + 折扣', 'Market Price + Discount') }]}
                />
              )}
              parameter={exportMode === 'fixed'
                ? <LabeledInlineInput label={tx('一口价', 'Fixed Price')}><CompactNumberInput value={priceRules.pv_to_grid.fixed} onChange={(value) => { setFlowFixed('pv_to_grid', value); setFlowFixed('bess_to_grid', value); }} /></LabeledInlineInput>
                : <LabeledInlineInput label={tx('折扣', 'Discount')}><CompactPercentInput value={priceRules.pv_to_grid.factor} onChange={(value) => { setFlowMarketDiscount('pv_to_grid', value); setFlowMarketDiscount('bess_to_grid', value); }} /></LabeledInlineInput>
              }
            />
            <PriceMatrixRow
              group={tx('内部结算电价', 'Internal Settlement Price')}
              groupRowSpan={3}
              flow="PV → Load"
              method={(
                <CompactSelect
                  id="pv-to-load-method"
                  value={pvToLoadMode}
                  openId={openMatrixDropdown}
                  onOpenChange={setOpenMatrixDropdown}
                  onChange={(value) => {
                    if (value === 'fixed') setFlowFixed('pv_to_load', priceRules.pv_to_load.fixed);
                    else setFlowUserDiscount('pv_to_load', priceRules.pv_to_load.factor || 0.9);
                  }}
                  options={[{ value: 'fixed', label: tx('一口价', 'Fixed Price') }, { value: 'user_discount', label: tx('用户侧综合电价 + 折扣', 'User-side Price + Discount') }]}
                />
              )}
              parameter={pvToLoadMode === 'fixed'
                ? <LabeledInlineInput label={tx('一口价', 'Fixed Price')}><CompactNumberInput value={priceRules.pv_to_load.fixed} onChange={(value) => setFlowFixed('pv_to_load', value)} /></LabeledInlineInput>
                : <LabeledInlineInput label={tx('折扣', 'Discount')}><CompactPercentInput value={priceRules.pv_to_load.factor} onChange={(value) => setFlowUserDiscount('pv_to_load', value)} /></LabeledInlineInput>
              }
            />
            <PriceMatrixRow
              flow="PV → BESS"
              method={(
                <CompactSelect
                  id="pv-to-bess-method"
                  value={pvToBessMode}
                  openId={openMatrixDropdown}
                  onOpenChange={setOpenMatrixDropdown}
                  onChange={(value) => setPvToBessMode(value as 'fixed' | 'user_discount' | 'none')}
                  options={[{ value: 'fixed', label: tx('一口价', 'Fixed Price') }, { value: 'user_discount', label: tx('用户侧综合电价 + 折扣', 'User-side Price + Discount') }, { value: 'none', label: tx('不结算', 'No Settlement') }]}
                />
              )}
              parameter={pvToBessMode === 'fixed'
                ? <LabeledInlineInput label={tx('一口价', 'Fixed Price')}><CompactNumberInput value={priceRules.pv_to_bess.fixed} onChange={(value) => setFlowFixed('pv_to_bess', value)} /></LabeledInlineInput>
                : pvToBessMode === 'user_discount'
                  ? <LabeledInlineInput label={tx('折扣', 'Discount')}><CompactPercentInput value={priceRules.pv_to_bess.factor} onChange={(value) => setFlowUserDiscount('pv_to_bess', value)} /></LabeledInlineInput>
                  : <DisabledCell>{tx('不结算', 'No Settlement')}</DisabledCell>
              }
            />
            <PriceMatrixRow
              flow="BESS → Load"
              method={(
                <CompactSelect id="bess-to-load-method" value="user_discount" openId={openMatrixDropdown} onOpenChange={setOpenMatrixDropdown} onChange={() => setFlowUserDiscount('bess_to_load')} options={[{ value: 'user_discount', label: tx('用户侧综合电价 + 折扣', 'User-side Price + Discount') }]} />
              )}
              parameter={<LabeledInlineInput label={tx('折扣', 'Discount')}><CompactPercentInput value={priceRules.bess_to_load.factor} onChange={(value) => setFlowUserDiscount('bess_to_load', value)} /></LabeledInlineInput>}
            />
          </tbody>
        </table>
      </div>
    </div>
  );


  const renderPrice = () => (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      {renderPriceMatrixWizard(true)}

      <div className="space-y-4">
        <div className="ems-card overflow-hidden">
          <CardHeader title={copy.pricePreview} subtitle={copy.pricePreviewHint} />
          <div className="max-h-[340px] overflow-auto">
            <table className="w-full min-w-[650px] text-xs">
              <thead className="sticky top-0 bg-white text-slate-500 dark:bg-apple-surface-dark dark:text-slate-400">
                <tr>
                  {[copy.table.time, copy.table.market, copy.table.buy, copy.table.charge, copy.table.pvSell, copy.table.discharge].map((head) => (
                    <th key={head} className="border-b border-slate-200 px-3 py-2 text-right first:text-left dark:border-apple-border-dark">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pricePreviewRows.map((row) => (
                  <tr key={row.hour} className="odd:bg-slate-50/70 dark:odd:bg-apple-surface-secondary-dark/30">
                    <td className="border-b border-slate-100 px-3 py-2 font-mono dark:border-apple-border-dark">{row.hour}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.market, 3)}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.buy, 3)}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.charge, 3)}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.pvSell, 3)}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(Math.max(row.bessSell, row.buy), 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-100 dark:bg-apple-surface-dark dark:ring-white/5">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={syncCloudPrices} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200">
              {copy.syncPrices}
            </button>
            <button type="button" onClick={generateDispatch} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white hover:bg-brand-500">
              {copy.applyGenerate}
            </button>
          </div>
          {adapter.warnings.length > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {adapter.warnings.map((warning) => (
                <div key={warning}>{warning === 'negative-price-approval' ? copy.warnings.negativeApproval : copy.warnings.adapter}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderForecast = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.85fr]">
        <div className="ems-card p-4">
          <SectionTitle title={copy.forecastTitle} subtitle={copy.forecastHint} />
          <div className="mt-4 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={predictionRows} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: chartColors.text }} interval={7} stroke={chartColors.text} />
                <YAxis tick={{ fill: chartColors.text }} stroke={chartColors.text} />
                <Tooltip contentStyle={{ backgroundColor: chartColors.tooltip, border: '1px solid rgba(148,163,184,.25)', borderRadius: 12, color: chartColors.text }} />
                <Legend />
                <Area type="monotone" dataKey="pvForecast" name={copy.chart.pvForecast} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.14} strokeWidth={2} />
                <Area type="monotone" dataKey="loadForecast" name={copy.chart.loadForecast} stroke="#ef4444" fill="#ef4444" fillOpacity={0.12} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="ems-card p-4">
          <SectionTitle title={copy.solverLimits} subtitle={copy.solverLimitsHint} />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={copy.fields.capacity} value={capKWh} onChange={setCapKWh} />
            <Field label={copy.fields.socMin} value={socMinPct} onChange={setSocMinPct} />
            <Field label={copy.fields.socMax} value={socMaxPct} onChange={setSocMaxPct} />
            <Field label={copy.fields.chargePower} value={pChMax} onChange={setPChMax} />
            <Field label={copy.fields.dischargePower} value={pDisMax} onChange={setPDisMax} />
            <Field label={copy.fields.efficiency} value={etaRoundTrip} onChange={setEtaRoundTrip} step={0.01} />
            <Field label={copy.fields.endSoc} value={socEndPct} onChange={setSocEndPct} />
            <Field label={copy.fields.dt} value={dtMinutes} onChange={setDtMinutes} />
            <TextField label={copy.fields.exportLimit} value={exportLimit} onChange={setExportLimit} />
            <TextField label={copy.fields.importLimit} value={importLimit} onChange={setImportLimit} />
            <TextField label={copy.fields.demandLimit} value={demandLimit} onChange={setDemandLimit} />
            <Field label={copy.fields.demandPenalty} value={demandPenalty} onChange={setDemandPenalty} />
            <Field label={copy.fields.cycleCost} value={cycleCost} onChange={setCycleCost} step={0.01} />
            <Field label={copy.fields.curtailPenalty} value={curtPenalty} onChange={setCurtPenalty} step={0.01} />
          </div>
        </div>
      </div>
      <div className="ems-card p-4">
        <SectionTitle title={copy.rawSeries} subtitle={copy.rawSeriesHint} />
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <AreaInput label="PV Forecast KW" value={pvText} onChange={setPvText} />
          <AreaInput label="Load Forecast KW" value={loadText} onChange={setLoadText} />
          <AreaInput label="buyPrice" value={buyText} onChange={setBuyText} />
          <AreaInput label="sellPrice" value={sellText} onChange={setSellText} />
          <AreaInput label="demandLimitSeriesKW" value={demandSeriesText} onChange={setDemandSeriesText} />
        </div>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="space-y-4">
      {result ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Metric label={copy.metrics.baselineCost} value={result.summary.baselineCost} suffix={copy.units.currency} />
            <Metric label={copy.metrics.optimizedCost} value={result.summary.optimizedCost} suffix={copy.units.currency} />
            <Metric label={copy.metrics.saving} value={result.summary.saving} suffix={copy.units.currency} />
            <Metric label={copy.metrics.endSoc} value={result.summary.endSocPct} suffix="%" />
            <Metric label={copy.metrics.throughput} value={result.summary.totalBatteryThroughputKWh} suffix="kWh" />
            <Metric label={copy.metrics.curtailment} value={result.summary.totalPvCurtKWh} suffix="kWh" />
          </div>
          <div className="ems-card p-4">
            <div className="h-[430px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={simRows} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: chartColors.text }} interval={7} stroke={chartColors.text} />
                  <YAxis yAxisId="left" tick={{ fill: chartColors.text }} stroke={chartColors.text} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: chartColors.text }} stroke={chartColors.text} />
                  <Tooltip contentStyle={{ backgroundColor: chartColors.tooltip, border: '1px solid rgba(148,163,184,.25)', borderRadius: 12, color: chartColors.text }} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="pvKW" name="PV" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.14} />
                  <Line yAxisId="left" type="monotone" dataKey="loadKW" name={copy.chart.loadForecast} stroke="#ef4444" dot={false} strokeWidth={2} />
                  <Bar yAxisId="left" dataKey="batteryPowerKW" name={copy.chart.batteryPower} fill="#3b82f6" radius={[4, 4, 4, 4]} />
                  <Line yAxisId="right" type="monotone" dataKey="socPct" name="SOC %" stroke="#22c55e" dot={false} strokeWidth={2} />
                  <Line yAxisId="right" type="stepAfter" dataKey="priceScaled" name={copy.chart.energyPrice} stroke="#a855f7" dot={false} strokeDasharray="4 4" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <ResultTable rows={result.steps} copy={copy} />
        </>
      ) : (
        <EmptyState title={copy.noResult} description={copy.noResultHint} actionLabel={copy.generate} onAction={generateDispatch} />
      )}
    </div>
  );

  const renderDispatch = () => (
    <div className="space-y-4">
      {dispatchDraft ? (
        <>
          <div className="ems-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionTitle title={copy.dispatchDraft} subtitle={copy.dispatchDraftHint} />
              <div className="flex flex-wrap gap-2">
                <StatusPill label="Station" value={dispatchDraft.stationId} />
                <StatusPill label="Segments" value={String(dispatchDraft.segments.length)} />
                <StatusPill label={copy.labels.deploy} value={deployStatusLabel} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <StatusPill label={copy.labels.station} value={dispatchDraft.stationName} />
              <StatusPill label={copy.labels.strategyDate} value={dispatchDraft.strategyDate} />
              <StatusPill label={copy.labels.market} value={marketSourceLabel(dispatchDraft.marketSource, lang)} />
              <StatusPill label={copy.labels.granularity} value={granularityLabel(dispatchDraft.granularity, lang)} />
            </div>
          </div>

          {deployStatus === 'confirm' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <span>{copy.deployConfirmText.replace('{count}', String(dispatchDraft.segments.length))}</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDeployStatus('idle')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200">{copy.cancel}</button>
                <button type="button" onClick={confirmDeploy} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white">{copy.confirmDeploy}</button>
              </div>
            </div>
          )}

          <div className="ems-card overflow-hidden">
            <CardHeader title={copy.dispatchTable} subtitle={copy.dispatchTableHint} />
            <DispatchSegmentTable segments={dispatchDraft.segments} />
          </div>
        </>
      ) : (
        <EmptyState title={copy.noDraft} description={copy.noDraftHint} actionLabel={copy.generate} onAction={generateDispatch} />
      )}
    </div>
  );

  const renderDispatchLogs = () => {
    const rows = [
      {
        time: '14:30:12',
        strategyId: dispatchDraft ? `CD-${dispatchDraft.strategyDate.replaceAll('-', '')}-001` : 'CD-20260627-001',
        target: `${activeStationId} / Edge EMS`,
        segments: dispatchDraft?.segments.length ?? 0,
        method: dispatchMethod === 'draft_only' ? tx('生成草稿不下发', 'Draft only') : tx('自动下发', 'Auto dispatch'),
        status: deployStatus === 'deployed' ? tx('成功', 'Success') : deployStatus === 'confirm' ? tx('待确认', 'Confirming') : tx('待下发', 'Pending'),
        duration: deployStatus === 'deployed' ? '1.8s' : '-',
        errorText: '-',
      },
      {
        time: '13:45:08',
        strategyId: 'CD-20260627-000',
        target: `${activeStationId} / Edge EMS`,
        segments: 12,
        method: tx('自动下发', 'Auto dispatch'),
        status: tx('成功', 'Success'),
        duration: '2.1s',
        errorText: '-',
      },
      {
        time: '12:15:40',
        strategyId: 'CD-20260627-ROLLBACK',
        target: `${activeStationId} / Edge EMS`,
        segments: 8,
        method: tx('自动下发', 'Auto dispatch'),
        status: tx('重试成功', 'Retry success'),
        duration: '4.6s',
        errorText: tx('EMS 短暂繁忙，已重试', 'EMS busy temporarily, retried'),
      },
    ];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatusPill label={tx('当前下发状态', 'Current Delivery Status')} value={deployStatusLabel} />
          <StatusPill label={tx('边缘 EMS', 'Edge EMS')} value={`${activeStationId}-EMS`} />
          <StatusPill label={tx('最近下发', 'Latest Delivery')} value={deployStatus === 'deployed' ? '14:30:12' : tx('待下发', 'Pending')} />
        </div>
        <LogTable
          title={tx('调度下发日志', 'Dispatch Delivery Logs')}
          subtitle={tx('记录每一次将策略下发给边缘 EMS 的执行结果。', 'Execution results for every strategy delivery to edge EMS.')}
          headers={[tx('时间', 'Time'), tx('策略 ID', 'Strategy ID'), tx('目标 EMS', 'Target EMS'), tx('时段数', 'Segments'), tx('下发方式', 'Method'), tx('状态', 'Status'), tx('耗时', 'Duration'), tx('错误信息', 'Error')]}
          rows={rows.map((row) => [row.time, row.strategyId, row.target, String(row.segments), row.method, row.status, row.duration, row.errorText])}
        />
      </div>
    );
  };

  const renderSolverLogs = () => {
    const rows = [
      ['14:30:09', 'SOL-20260627-143009', tx('优化求解', 'Optimize'), 'healthy', '1.42s', tx('正常', 'OK'), '-'],
      ['14:15:09', 'SOL-20260627-141509', tx('滚动重算', 'Rolling recalc'), 'healthy', '1.36s', tx('正常', 'OK'), '-'],
      ['13:45:04', 'SOL-20260627-134504', tx('优化求解', 'Optimize'), 'healthy', '1.58s', tx('正常', 'OK'), '-'],
      ['12:15:34', 'SOL-20260627-121534', tx('策略校验', 'Strategy check'), 'degraded', '3.88s', tx('异常后恢复', 'Recovered'), tx('首次响应超时，备用实例返回正常', 'Primary timeout, standby instance returned OK')],
    ];
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <StatusPill label={tx('连接状态', 'Connection')} value={tx('已连接', 'Connected')} />
          <StatusPill label={tx('存活状态', 'Liveness')} value={tx('Healthy', 'Healthy')} />
          <StatusPill label={tx('当前实例', 'Active Instance')} value="solver-cn-01" />
          <StatusPill label={tx('最近心跳', 'Last Heartbeat')} value="5s ago" />
        </div>
        <LogTable
          title={tx('求解器日志', 'Solver Logs')}
          subtitle={tx('记录云平台调用求解器的状态、耗时、返回结果和异常原因。', 'Cloud solver calls, latency, return status and error details.')}
          headers={[tx('时间', 'Time'), tx('请求 ID', 'Request ID'), tx('调用类型', 'Call Type'), tx('实例状态', 'Instance'), tx('耗时', 'Latency'), tx('返回', 'Return'), tx('异常原因', 'Error')]}
          rows={rows}
        />
      </div>
    );
  };

  const renderConfig = () => (
    <div className="ems-card overflow-hidden">
      <CardHeader title={copy.configAudit} subtitle={copy.configAuditHint} />
      <pre className="max-h-[620px] overflow-auto p-4 text-xs text-slate-700 dark:text-slate-300">
        {configJson}
      </pre>
    </div>
  );

  const renderGuideBody = (step: ConfigGuideStep) => {
    switch (step) {
      case 'source':
        return (
          <div className="space-y-5">
            <GuideStepHeader
              stepPrefix={copy.setupGuide.stepPrefix}
              current={guideStep + 1}
              total={CONFIG_GUIDE_STEPS.length}
              title={copy.setupGuide.steps.source}
              subtitle={copy.setupGuide.stepHints.source}
            />

            <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="flex h-full flex-col rounded-2xl bg-white p-4 ring-1 ring-slate-100 dark:bg-apple-surface-dark dark:ring-white/5">
                <div className="mb-4 flex min-h-[72px] items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-apple-surface-secondary-dark/50">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">{copy.setupGuide.sourceConfig.configTitle}</h3>
                    <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">{copy.setupGuide.sourceConfig.configHint}</p>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
                  <SourceDropdown id="load" label={copy.setupGuide.sourceConfig.load} value="Load_P_Total_kW" options={[{ value: 'Load_P_Total_kW', label: 'Load_P_Total_kW' }]} openId={openSourceDropdown} onOpenChange={setOpenSourceDropdown} />
                  <SourceDropdown id="pv" label={copy.setupGuide.sourceConfig.pv} value="PV_P_Total_kW" options={[{ value: 'PV_P_Total_kW', label: 'PV_P_Total_kW' }]} openId={openSourceDropdown} onOpenChange={setOpenSourceDropdown} />
                  <SourceDropdown id="bess" label={copy.setupGuide.sourceConfig.bess} value="BESS_P_Total_kW" options={[{ value: 'BESS_P_Total_kW', label: 'BESS_P_Total_kW' }]} openId={openSourceDropdown} onOpenChange={setOpenSourceDropdown} />
                  <SourceDropdown id="grid" label={copy.setupGuide.sourceConfig.grid} value="Grid_PCC_Power" options={[{ value: 'Grid_PCC_Power', label: 'Grid_PCC_Power' }]} openId={openSourceDropdown} onOpenChange={setOpenSourceDropdown} />
                  <SourceDropdown id="soc" label={copy.setupGuide.sourceConfig.soc} value="BESS_SOC_Avg" options={[{ value: 'BESS_SOC_Avg', label: 'BESS_SOC_Avg' }]} openId={openSourceDropdown} onOpenChange={setOpenSourceDropdown} />
                  <SourceDropdown id="refresh" label={copy.setupGuide.sourceConfig.refresh} value="5s" options={[{ value: '5s', label: lang === 'zh' ? '5秒' : '5 sec' }]} openId={openSourceDropdown} onOpenChange={setOpenSourceDropdown} />
                </div>
              </div>

              <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-brand-50/60 ring-1 ring-brand-100/80 dark:bg-brand-500/10 dark:ring-brand-500/20">
                <div className="flex min-h-[72px] flex-col justify-center bg-brand-100/50 px-4 py-3 dark:bg-brand-500/10">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-brand-900 dark:text-brand-100">{copy.setupGuide.sourceConfig.directionTitle}</h3>
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand-700 dark:bg-white/10 dark:text-brand-200">
                      {copy.setupGuide.sourceConfig.readonly}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-bold leading-snug text-brand-700/70 dark:text-brand-100/70">{copy.setupGuide.sourceConfig.directionHint}</p>
                </div>
                <div className="flex-1 overflow-x-auto">
                <table className="w-full min-w-[460px] text-xs">
                  <thead className="bg-white/35 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:bg-white/[0.03]">
                    <tr>
                      <th className="px-3 py-2 text-left">{copy.setupGuide.sourceConfig.asset}</th>
                      <th className="px-3 py-2 text-left">{copy.setupGuide.sourceConfig.convention}</th>
                      <th className="px-3 py-2 text-left">{copy.setupGuide.sourceConfig.usage}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-100/60 dark:divide-white/5">
                    {(['load', 'pv', 'bess', 'grid'] as const).map((key) => {
                      const row = copy.setupGuide.sourceConfig.rows[key];
                      return (
                        <tr key={key} className="bg-white/55 dark:bg-white/5">
                          <td className="whitespace-nowrap px-3 py-2 font-black text-slate-900 dark:text-white">{row[0]}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{row[1]}</td>
                          <td className="px-3 py-2 font-bold leading-snug text-slate-500 dark:text-slate-400">{row[2]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          </div>
        );
      case 'price':
        return (
          <div className="space-y-5">
            <GuideStepHeader
              stepPrefix={copy.setupGuide.stepPrefix}
              current={guideStep + 1}
              total={CONFIG_GUIDE_STEPS.length}
              title={copy.setupGuide.steps.price}
              subtitle={copy.setupGuide.stepHints.price}
            />
            {renderPriceMatrixWizard()}
          </div>
        );
      case 'solver':
        return (
          <div className="space-y-5">
            <GuideStepHeader
              stepPrefix={copy.setupGuide.stepPrefix}
              current={guideStep + 1}
              total={CONFIG_GUIDE_STEPS.length}
              title={copy.setupGuide.steps.solver}
              subtitle={copy.setupGuide.stepHints.solver}
            />
            <div className="rounded-3xl bg-white p-3 ring-1 ring-slate-100 dark:bg-apple-surface-dark dark:ring-white/5">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <div className="rounded-2xl bg-slate-50/80 p-3 dark:bg-apple-surface-secondary-dark/45">
                  <SolverGroupTitle index="01" title={tx('设备参数', 'Asset')} subtitle={tx('容量、功率与效率', 'Capacity, power and efficiency')} />
                  <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    <Field label={copy.fields.capacity} value={capKWh} onChange={setCapKWh} />
                    <Field label={copy.fields.chargePower} value={pChMax} onChange={setPChMax} />
                    <Field label={copy.fields.dischargePower} value={pDisMax} onChange={setPDisMax} />
                    <Field label={copy.fields.efficiency} value={etaRoundTrip} onChange={setEtaRoundTrip} step={0.01} />
                  </div>
                </div>

                <div className="rounded-2xl bg-brand-50/70 p-3 ring-1 ring-brand-100/70 dark:bg-brand-500/10 dark:ring-brand-500/20">
                  <SolverGroupTitle index="02" title={tx('SOC策略', 'Battery Strategy')} subtitle={tx('运行边界与期末要求', 'Operating bounds and end target')} accent />
                  <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    <Field label={copy.fields.socMin} value={socMinPct} onChange={setSocMinPct} />
                    <Field label={copy.fields.socMax} value={socMaxPct} onChange={setSocMaxPct} />
                    <Field label={copy.fields.endSoc} value={socEndPct} onChange={setSocEndPct} />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50/80 p-3 dark:bg-apple-surface-secondary-dark/45">
                  <SolverGroupTitle index="03" title={tx('电网约束', 'Grid Constraints')} subtitle={tx('外送、购电与需量限制', 'Export, import and demand limits')} />
                  <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    <TextField label={copy.fields.exportLimit} value={exportLimit} onChange={setExportLimit} />
                    <TextField label={copy.fields.importLimit} value={importLimit} onChange={setImportLimit} />
                    <TextField label={copy.fields.demandLimit} value={demandLimit} onChange={setDemandLimit} />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50/80 p-3 dark:bg-apple-surface-secondary-dark/45">
                  <SolverGroupTitle index="04" title={tx('优化与经济参数', 'Optimizer & Economics')} subtitle={tx('步长、惩罚成本与策略偏好', 'Interval, penalty costs and preferences')} />
                  <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    <Field label={copy.fields.dt} value={dtMinutes} onChange={setDtMinutes} />
                    <Field label={copy.fields.demandPenalty} value={demandPenalty} onChange={setDemandPenalty} />
                    <Field label={copy.fields.cycleCost} value={cycleCost} onChange={setCycleCost} step={0.01} />
                    <Field label={copy.fields.curtailPenalty} value={curtPenalty} onChange={setCurtPenalty} step={0.01} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'objective':
        return (
          <div className="space-y-5">
            <GuideStepHeader
              stepPrefix={copy.setupGuide.stepPrefix}
              current={guideStep + 1}
              total={CONFIG_GUIDE_STEPS.length}
              title={copy.setupGuide.steps.objective}
              subtitle={copy.setupGuide.stepHints.objective}
            />
            <div className="rounded-3xl bg-white p-3 ring-1 ring-slate-100 dark:bg-apple-surface-dark dark:ring-white/5">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                {objectiveOptions.map((item) => (
                  <React.Fragment key={item.key}>
                    <ObjectiveCard
                      active={objective === item.key}
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      metric={item.metric}
                      accent={item.accent}
                      onClick={() => setObjective(item.key)}
                    />
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <ObjectiveHint label={tx('优化优先级', 'Optimization Priority')} value={objectiveOptions.find((item) => item.key === objective)?.title ?? objectiveLabel(objective, lang)} />
                <ObjectiveHint label={tx('约束处理', 'Constraint Handling')} value={tx('SOC / 并网 / 需量边界优先满足', 'SOC / grid / demand bounds first')} />
                <ObjectiveHint label={tx('输出策略', 'Dispatch Output')} value={tx('生成可下发时段策略', 'Dispatchable time-block strategy')} />
              </div>
            </div>
          </div>
        );
      case 'mode':
        return (
          <div className="space-y-5">
            <GuideStepHeader
              stepPrefix={copy.setupGuide.stepPrefix}
              current={guideStep + 1}
              total={CONFIG_GUIDE_STEPS.length}
              title={copy.setupGuide.steps.mode}
              subtitle={copy.setupGuide.stepHints.mode}
            />
            <div className="grid grid-cols-1 gap-3">
                <StrategyModeCard
                  active={strategyMode === 'rolling'}
                  title={tx('滚动优化', 'Rolling Optimization')}
                  description={tx('周期重算未来窗口策略。', 'Periodically recalculate the future rolling window.')}
                  onClick={() => setStrategyMode('rolling')}
                />
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              <SourceDropdown
                id="mode-optimization-period"
                label={tx('优化周期', 'Optimization Period')}
                value={optimizationPeriod}
                onChange={setOptimizationPeriod}
                openId={openSourceDropdown}
                onOpenChange={setOpenSourceDropdown}
                options={[
                  { value: '5分钟', label: tx('5分钟', '5 min') },
                  { value: '15分钟', label: tx('15分钟', '15 min') },
                  { value: '30分钟', label: tx('30分钟', '30 min') },
                  { value: '60分钟', label: tx('60分钟', '60 min') },
                ]}
              />
              <SourceDropdown
                id="mode-rolling-window"
                label={tx('滚动窗口', 'Rolling Window')}
                value={rollingWindow}
                onChange={setRollingWindow}
                openId={openSourceDropdown}
                onOpenChange={setOpenSourceDropdown}
                options={[
                  { value: '12h', label: tx('未来12小时', 'Next 12 hours') },
                  { value: '24h', label: tx('未来24小时', 'Next 24 hours') },
                  { value: '48h', label: tx('未来48小时', 'Next 48 hours') },
                ]}
              />
              <SourceDropdown
                id="mode-dispatch-method"
                label={tx('下发方式', 'Dispatch Method')}
                value={dispatchMethod}
                onChange={setDispatchMethod}
                openId={openSourceDropdown}
                onOpenChange={setOpenSourceDropdown}
                options={[
                  { value: 'auto_after_recalc', label: tx('自动下发', 'Auto Dispatch') },
                  { value: 'draft_only', label: tx('生成草稿不下发', 'Generate Draft without Dispatch') },
                ]}
              />
            </div>

          </div>
        );
      default:
        return null;
    }
  };

  const renderSetupGuide = () => {
    const stepKey = CONFIG_GUIDE_STEPS[guideStep];
    const isLastStep = guideStep === CONFIG_GUIDE_STEPS.length - 1;

    return (
      <div className="relative rounded-2xl bg-white p-4 pb-28 dark:bg-apple-surface-dark">
        <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-apple-surface-secondary-dark/45">
          <SectionTitle title={copy.setupGuide.title} subtitle={copy.setupGuide.subtitle} />
        </div>
        <div className="grid grid-cols-1 gap-4 pt-4 xl:grid-cols-[280px_1fr]">
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-apple-surface-secondary-dark/50">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400">{copy.labels.station}</div>
            <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{activeStationName}</div>
            <div className="mt-3 space-y-2 rounded-xl bg-white/70 p-3 dark:bg-apple-surface-dark/60">
              {activeStationMeta.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-3 text-xs">
                  <span className="shrink-0 font-black text-slate-400">{item.label}</span>
                  <span className="text-right font-bold text-slate-700 dark:text-slate-200">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {CONFIG_GUIDE_STEPS.map((item, index) => {
                const active = index === guideStep;
                const done = index < guideStep;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGuideStep(index)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-black transition-colors ${
                      active
                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/45 dark:text-brand-200'
                        : done
                          ? 'text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-apple-surface-dark'
                          : 'text-slate-400 hover:bg-white dark:text-slate-500 dark:hover:bg-apple-surface-dark'
                    }`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                      active || done ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {done ? <CheckCircle2 size={14} /> : index + 1}
                    </span>
                    {copy.setupGuide.steps[item]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {renderGuideBody(stepKey)}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-40 border-t border-slate-200/70 bg-white/92 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-apple-surface-dark/92 xl:left-[312px]">
          <div className="mx-auto flex max-w-[1720px] flex-col gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-apple-surface-secondary-dark/70 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setGuideStep((step) => Math.max(0, step - 1))}
              disabled={guideStep === 0}
              className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-apple-surface-dark dark:text-slate-200 dark:hover:bg-slate-700/50"
            >
              {copy.setupGuide.prev}
            </button>
            {isLastStep ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={keepGuideConfiguration} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-brand-700 ring-1 ring-brand-100 transition-colors hover:bg-brand-50 dark:bg-apple-surface-dark dark:text-brand-200 dark:ring-brand-500/20">
                  {copy.setupGuide.keep}
                </button>
                <button type="button" onClick={saveAndEnableGuide} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-brand-500">
                  {copy.setupGuide.saveEnable}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setGuideStep((step) => Math.min(CONFIG_GUIDE_STEPS.length - 1, step + 1))} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-brand-500">
                {copy.setupGuide.next}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <div className="ems-page-shell">
      <div className="mx-auto w-full max-w-[1720px] space-y-4">
        {!isSetupPage && (
          <div className="overflow-hidden rounded-2xl bg-[#071006] px-5 py-5 dark:bg-[#071006]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white">{activeStationName}</h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeStationMeta.map((item) => (
                    <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{item.label}</div>
                      <div className="mt-1 text-sm font-black text-slate-100">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{copy.statusControl.label}</span>
                  <span className={`rounded-lg px-2 py-1 text-xs font-black ${
                    optimizerStatus === 'on'
                      ? 'bg-brand-400 text-[#171a20]'
                      : optimizerStatus === 'configuring'
                        ? 'bg-amber-300 text-[#171a20]'
                      : optimizerStatus === 'off'
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-amber-300 text-[#171a20]'
                  }`}>
                    {optimizerStatusText}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={optimizerStatus === 'on'}
                  onClick={toggleOptimizerStatus}
                  className={`relative h-9 w-16 shrink-0 rounded-full border transition-colors ${
                    optimizerStatus === 'on'
                      ? 'border-brand-300 bg-brand-400'
                      : optimizerStatus === 'configuring'
                        ? 'border-amber-300 bg-amber-300/70'
                      : 'border-white/10 bg-white/10'
                  }`}
                  title={copy.statusControl.switch}
                >
                  <span
                    className={`absolute left-1 top-1 h-7 w-7 rounded-full bg-white transition-transform ${
                      optimizerStatus === 'on' ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {(isOptimizerEnabled || isSetupPage) && error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {(isOptimizerEnabled || isSetupPage) && message && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-brand-400/30 dark:bg-brand-400/10 dark:text-brand-200">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            {message}
          </div>
        )}

        {isSetupPage ? (
          renderSetupGuide()
        ) : isOptimizerEnabled ? (
          <>
            <div className="ems-card p-2">
              <div className="flex gap-1 overflow-x-auto">
                {(['dashboard', 'cloudDispatch', 'dispatchLogs', 'solverLogs'] as TabKey[]).map(renderTabButton)}
              </div>
            </div>

            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'cloudDispatch' && renderOverview()}
            {activeTab === 'dispatchLogs' && renderDispatchLogs()}
            {activeTab === 'solverLogs' && renderSolverLogs()}
          </>
        ) : (
          <EmptyState
            title={copy.trialEmpty.title}
            description={copy.trialEmpty.description}
            actionLabel={copy.statusControl.trial}
            onAction={startTrial}
          />
        )}
      </div>
    </div>
    <PriceSelectionModal
      lang={lang}
      isOpen={showPriceSelectionModal}
      onClose={() => setShowPriceSelectionModal(false)}
      modalPriceTab={modalPriceTab}
      setModalPriceTab={setModalPriceTab}
      userSchemes={userSchemes}
      systemSchemes={systemSchemes}
      selectedPriceSchemeId={selectedPriceSchemeId}
      setSelectedPriceSchemeId={setSelectedPriceSchemeId}
    />
    </>
  );
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200 dark:focus:border-brand-500/70';

function marketSourceLabel(source: string, lang: Language) {
  if (lang !== 'zh') {
    return ({
      '广东日前电价': 'Guangdong Day-ahead',
      '广东实时电价': 'Guangdong Real-time',
      '山东日前电价': 'Shandong Day-ahead',
      '山西日前电价': 'Shanxi Day-ahead',
      '蒙西实时电价': 'Mengxi Real-time',
      '浙江工商业分时模板': 'Zhejiang Industrial TOU',
      'Excel导入日前价格': 'Excel-imported Day-ahead',
      '手动维护价格曲线': 'Manual Price Curve',
    } as Record<string, string>)[source] ?? source;
  }
  return source;
}

function granularityLabel(value: string, lang: Language) {
  if (lang === 'zh') return value;
  return value.replace('分钟', ' min').replace('小时', ' hour');
}

function ruleModeLabel(mode: RuleMode, lang: Language) {
  const labels: Record<RuleMode, { zh: string; en: string }> = {
    fixed: { zh: '固定一口价', en: 'Fixed Price' },
    tou: { zh: '分时计价', en: 'TOU' },
    discount: { zh: '基准折扣', en: 'Base Discount' },
    spread: { zh: '基准价差', en: 'Base Spread' },
    same: { zh: '等同其他流向', en: 'Same as Flow' },
  };
  return lang === 'zh' ? labels[mode].zh : labels[mode].en;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{children}</div>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}

function GuideStepHeader({ title, subtitle, right }: { stepPrefix: string; current: number; total: number; title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-2 text-base font-bold text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

function SolverGroupTitle({ index, title, subtitle, accent = false }: { index: string; title: string; subtitle: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${accent ? 'bg-white text-brand-700 dark:bg-white/10 dark:text-brand-100' : 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'}`}>
        {index}
      </span>
      <div className="min-w-0">
        <h3 className={`text-sm font-black ${accent ? 'text-brand-900 dark:text-brand-100' : 'text-slate-900 dark:text-white'}`}>{title}</h3>
        <p className={`text-[10px] font-bold leading-tight ${accent ? 'text-brand-700/70 dark:text-brand-100/70' : 'text-slate-400'}`}>{subtitle}</p>
      </div>
    </div>
  );
}

function ObjectiveCard({
  active,
  icon: Icon,
  title,
  description,
  metric,
  accent,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  title: string;
  description: string;
  metric: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
        active
          ? 'border-brand-400 bg-brand-50 shadow-[inset_0_0_0_1px_rgba(163,196,43,0.25)] dark:border-brand-400/60 dark:bg-brand-500/12'
          : 'border-slate-200 bg-slate-50/70 hover:border-brand-200 hover:bg-white dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/65 dark:hover:border-brand-500/40'
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-br ${accent} opacity-70`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-700 ring-1 ring-slate-100 dark:bg-white/10 dark:text-brand-200 dark:ring-white/10`}>
            <Icon size={22} />
          </div>
          <span className={`rounded-full px-2 py-1 text-[10px] font-black ${active ? 'bg-brand-500 text-white' : 'bg-white text-slate-400 ring-1 ring-slate-100 dark:bg-white/10 dark:ring-white/10'}`}>
            {active ? 'SELECTED' : metric}
          </span>
        </div>
        <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-2 min-h-[44px] text-sm font-bold leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
        <div className="mt-4 flex items-center gap-2 text-xs font-black text-brand-700 dark:text-brand-200">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {metric}
        </div>
      </div>
    </button>
  );
}

function ObjectiveHint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-apple-surface-secondary-dark/60">
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-black text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}

function DashboardLegend({ title, items }: { title: string; items: Array<{ color: string; label: string }> }) {
  return (
    <div>
      <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 text-sm font-black text-slate-600 dark:text-slate-300">
            <span className="h-3 w-8 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardChartHeader({ title, subtitle, items }: { title: string; subtitle: string; items: Array<{ color: string; label: string }> }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600 dark:bg-white/5 dark:text-slate-300">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function DashboardSmallChart({ title, subtitle, items, children }: { title: string; subtitle: string; items: Array<{ color: string; label: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-100 dark:bg-apple-surface-dark dark:ring-white/5">
      <DashboardChartHeader title={title} subtitle={subtitle} items={items} />
      <div className="mt-4 h-[250px]">{children}</div>
    </div>
  );
}

function DashboardMetricCard({ tone, label, value, suffix }: { tone: 'blue' | 'rose' | 'green'; label: string; value: number; suffix: string }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200',
  };
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-100 dark:bg-apple-surface-dark dark:ring-white/5">
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${styles[tone]}`}>
        <BatteryCharging size={22} />
      </div>
      <div className="mt-4 text-base font-black text-slate-700 dark:text-slate-200">{label}</div>
      <div className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
        {fmt(value)}
        <span className="ml-2 text-sm text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}

function LogTable({ title, subtitle, headers, rows }: { title: string; subtitle: string; headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100 dark:bg-apple-surface-dark dark:ring-white/5">
      <CardHeader title={title} subtitle={subtitle} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-400 dark:bg-apple-surface-secondary-dark/45">
            <tr>
              {headers.map((header) => (
                <th key={header} className="border-b border-slate-100 px-4 py-3 text-left dark:border-apple-border-dark">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-apple-surface-dark dark:even:bg-apple-surface-secondary-dark/30">
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className="border-b border-slate-100 px-4 py-3 font-bold text-slate-700 dark:border-apple-border-dark dark:text-slate-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SelectedPriceMiniPreview({ schemeName, schemeId }: { schemeName: string; schemeId: string }) {
  const points = useMemo(() => {
    const seed = Array.from(schemeId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return Array.from({ length: 18 }, (_, index) => {
      const hour = index / 17;
      const wave = Math.sin((hour * Math.PI * 2) + seed * 0.03) * 0.24;
      const peak = Math.exp(-((hour - 0.78) ** 2) / 0.025) * 0.36;
      const valley = Math.exp(-((hour - 0.18) ** 2) / 0.02) * -0.18;
      return 0.52 + wave + peak + valley;
    });
  }, [schemeId]);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const path = points.map((value, index) => {
    const x = (index / Math.max(1, points.length - 1)) * 92 + 4;
    const y = 46 - ((value - min) / Math.max(0.001, max - min)) * 36;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="flex h-14 min-w-[260px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 dark:border-apple-border-dark dark:bg-apple-surface-dark">
      <svg width="124" height="50" viewBox="0 0 104 50" className="shrink-0">
        <path d="M4 46H100" stroke="currentColor" className="text-slate-200 dark:text-white/10" strokeWidth="1" />
        <path d={path} fill="none" stroke="currentColor" className="text-brand-500 dark:text-brand-300" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="min-w-0">
        <div className="truncate text-sm font-black text-slate-900 dark:text-white">{schemeName}</div>
        <div className="mt-0.5 font-mono text-[10px] font-bold text-slate-400">{schemeId}</div>
      </div>
    </div>
  );
}

function CardHeader({ title, subtitle, right }: { title: string; subtitle: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark/45">
      <SectionTitle title={title} subtitle={subtitle} />
      {right}
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark">
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

function Metric({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="ems-card p-4">
      <div className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-black text-brand-600 dark:text-brand-300">{fmt(value)}</span>
        {suffix && <span className="text-xs font-bold text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}

function SegmentButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-3 text-sm font-black transition-all ${
        active
          ? 'border-brand-300 bg-brand-100 text-brand-700 dark:border-brand-500/50 dark:bg-brand-900/40 dark:text-brand-200'
          : 'border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:text-slate-900 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

function StrategyModeCard({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-all ${
        active
          ? 'border-brand-400 bg-brand-50 text-slate-900 dark:border-brand-400/60 dark:bg-brand-500/12 dark:text-white'
          : 'border-slate-200 bg-white text-slate-900 hover:border-brand-200 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-white'
      }`}
    >
      <div className="text-base font-black">{title}</div>
      <div className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{description}</div>
    </button>
  );
}

function SourceDropdown({
  id,
  label,
  value,
  options,
  openId,
  onOpenChange,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  onChange?: (value: string) => void;
}) {
  const open = openId === id;
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="relative">
      <Label>{label}</Label>
      <button
        type="button"
        onClick={() => onOpenChange(open ? null : id)}
        className={`mt-2 flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm font-black text-slate-800 transition-all hover:border-brand-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/15 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-100 dark:hover:border-brand-500/50 dark:hover:bg-apple-surface-dark ${
          open ? 'border-brand-400 bg-white ring-2 ring-brand-500/15 dark:border-brand-500/70 dark:bg-apple-surface-dark' : ''
        }`}
      >
        <span className="min-w-0 truncate">{selected?.label ?? value}</span>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 transition-all dark:bg-white/10 ${open ? 'rotate-180 text-brand-600 dark:text-brand-300' : ''}`}>
          <ChevronDown size={16} />
        </span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-apple-border-dark dark:bg-apple-surface-dark">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange?.(option.value);
                  onOpenChange(null);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-black transition-colors ${
                  active
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {active && <CheckCircle2 size={15} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input className={`${inputClass} mt-2`} type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function PercentField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:focus-within:border-brand-500/70">
        <input
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-bold text-slate-700 outline-none dark:text-slate-200"
          type="number"
          step={1}
          value={Math.round(value * 100)}
          onChange={(event) => onChange(Number(event.target.value) / 100)}
        />
        <span className="flex items-center border-l border-slate-200 px-3 text-sm font-black text-slate-400 dark:border-apple-border-dark">%</span>
      </div>
    </label>
  );
}

function MatrixCell({ children, className = '', rowSpan, colSpan }: { children: React.ReactNode; className?: string; rowSpan?: number; colSpan?: number }) {
  return (
    <td rowSpan={rowSpan} colSpan={colSpan} className={`border border-slate-300 px-3 py-3 align-middle dark:border-apple-border-dark ${className}`}>
      {children}
    </td>
  );
}

function PriceMatrixRow({
  group,
  groupRowSpan,
  flow,
  method,
  parameter,
}: {
  group?: string;
  groupRowSpan?: number;
  flow: string;
  method: React.ReactNode;
  parameter: React.ReactNode;
}) {
  return (
    <tr className="bg-white dark:bg-apple-surface-dark">
      {group && (
        <MatrixCell rowSpan={groupRowSpan} className="w-48 bg-slate-100 text-sm font-black text-slate-900 dark:bg-apple-surface-secondary-dark/55 dark:text-white">
          {group}
        </MatrixCell>
      )}
      <MatrixCell className="w-32 text-sm font-black text-slate-900 dark:text-white">
        {flow}
      </MatrixCell>
      <MatrixCell className="w-56">{method}</MatrixCell>
      <MatrixCell className="w-44">{parameter}</MatrixCell>
    </tr>
  );
}

function DisabledCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-9 items-center rounded-lg border border-slate-300 bg-slate-100 px-2.5 text-xs font-black text-slate-400 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-500">
      <span className="truncate">{children}</span>
    </div>
  );
}

function CompactSelect({
  id,
  value,
  options,
  openId,
  onOpenChange,
  onChange,
}: {
  id: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  onChange: (value: string) => void;
}) {
  const open = openId === id;
  const selected = options.find((option) => option.value === value) ?? options[0];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(open ? null : id)}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-2.5 text-left text-xs font-black text-slate-900 outline-none transition-all hover:border-brand-300 focus:ring-2 focus:ring-brand-500/15 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-white dark:hover:border-brand-500/50 ${
          open ? 'border-brand-400 ring-2 ring-brand-500/15 dark:border-brand-500/70' : ''
        }`}
      >
        <span className="min-w-0 truncate">{selected?.label ?? value}</span>
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-all dark:bg-white/10 ${open ? 'rotate-180 text-brand-600 dark:text-brand-300' : ''}`}>
          <ChevronDown size={13} />
        </span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-apple-border-dark dark:bg-apple-surface-dark">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  onOpenChange(null);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-black transition-colors ${
                  active
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-apple-surface-secondary-dark'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {active && <CheckCircle2 size={13} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LabeledInlineInput({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[64px_1fr] items-center gap-2">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function CompactNumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-black text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-white dark:focus:border-brand-500/70"
      type="number"
      step={0.01}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

function NullableCompactNumberInput({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
  return (
    <input
      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-black text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:text-white dark:focus:border-brand-500/70"
      type="number"
      step={0.01}
      value={value ?? ''}
      onChange={(event) => {
        const next = event.target.value.trim();
        onChange(next === '' ? null : Number(next));
      }}
    />
  );
}

function CompactPercentInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex h-9 max-w-[88px] overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus:ring-brand-500/15 dark:border-apple-border-dark dark:bg-apple-surface-dark dark:focus-within:border-brand-500/70">
      <input
        className="min-w-0 flex-1 bg-transparent px-2 text-center text-xs font-black text-slate-900 outline-none dark:text-white"
        type="number"
        step={1}
        value={Math.round(value * 100)}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
      <span className="flex items-center border-l border-slate-300 px-2 text-xs font-black text-slate-400 dark:border-apple-border-dark">%</span>
    </div>
  );
}

function PriceConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 border-b border-slate-200 last:border-b-0 dark:border-apple-border-dark lg:grid-cols-[220px_1fr]">
      <div className="bg-slate-50 px-4 py-4 text-base font-black text-slate-900 dark:bg-apple-surface-secondary-dark/45 dark:text-white">
        {title}
      </div>
      <div className="p-4">
        {children}
      </div>
    </section>
  );
}

function PriceChoiceGroup({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm font-black transition-all ${
              selected
                ? 'border-brand-300 bg-brand-50 text-brand-800 ring-2 ring-brand-500/10 dark:border-brand-500/60 dark:bg-brand-500/10 dark:text-brand-100'
                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-slate-900 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-300'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function InternalPriceRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-apple-surface-secondary-dark/45 lg:grid-cols-[140px_220px_1fr] lg:items-start">
      <div className="pt-2 text-base font-black text-slate-900 dark:text-white">{title}</div>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input className={`${inputClass} mt-2`} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <input className={inputClass} type="number" step={0.01} value={value} onChange={(event) => onChange(Number(event.target.value))} />;
}

function NullableNumberInput({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <input
        className={`${inputClass} mt-2`}
        type="number"
        step={0.01}
        value={value ?? ''}
        onChange={(event) => {
          const next = event.target.value.trim();
          onChange(next === '' ? null : Number(next));
        }}
      />
    </label>
  );
}

function AreaInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <textarea className={`${inputClass} mt-2 min-h-24 font-mono text-xs`} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function EmptyState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="ems-card flex min-h-64 items-center justify-center p-8 text-center">
      <div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          <Zap size={24} />
        </div>
        <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
        <button type="button" onClick={onAction} className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-black text-white hover:bg-brand-500">
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function MiniDispatchTable({ rows }: { rows: string[][] }) {
  return (
    <div className="max-h-[220px] overflow-auto border-t border-slate-100 dark:border-apple-border-dark">
      <table className="w-full text-xs">
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('-')} className="odd:bg-slate-50/70 dark:odd:bg-apple-surface-secondary-dark/30">
              {row.map((cell, index) => (
                <td key={cell} className={`border-b border-slate-100 px-3 py-2 dark:border-apple-border-dark ${index === 3 ? 'text-right font-mono' : index < 2 ? 'font-mono' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DispatchSegmentTable({ segments, compact = false }: { segments: DispatchSegment[]; compact?: boolean }) {
  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="w-full min-w-[650px] text-xs">
        <thead className="sticky top-0 bg-white text-slate-500 dark:bg-apple-surface-dark dark:text-slate-400">
          <tr>
            {['START', 'END', 'TYPE', 'POWER', 'AVG SOC', 'POINTS'].slice(0, compact ? 5 : 6).map((head) => (
              <th key={head} className="border-b border-slate-200 px-3 py-2 text-right first:text-left dark:border-apple-border-dark">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {segments.map((segment, index) => {
            const tone = segment.type === 'Charge'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200'
              : segment.type === 'Discharge'
                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200'
                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-300';
            return (
              <tr key={`${segment.start}-${segment.end}-${index}`} className="odd:bg-slate-50/70 dark:odd:bg-apple-surface-secondary-dark/30">
                <td className="border-b border-slate-100 px-3 py-2 font-mono dark:border-apple-border-dark">{segment.start}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-right font-mono dark:border-apple-border-dark">{segment.end}</td>
                <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark"><span className={`inline-flex rounded-lg border px-2 py-1 text-[11px] font-black ${tone}`}>{segment.type}</span></td>
                <td className="border-b border-slate-100 px-3 py-2 text-right font-mono dark:border-apple-border-dark">{fmt(segment.powerKW)} kW</td>
                <td className="border-b border-slate-100 px-3 py-2 text-right font-mono dark:border-apple-border-dark">{segment.avgSocPct === null ? '-' : `${fmt(segment.avgSocPct)}%`}</td>
                {!compact && <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{segment.points}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResultTable({ rows, copy }: { rows: OptimizeStep[]; copy: any }) {
  return (
    <div className="ems-card max-h-[420px] overflow-auto">
      <table className="w-full min-w-[980px] text-xs">
        <thead className="sticky top-0 bg-white text-slate-500 dark:bg-apple-surface-dark dark:text-slate-400">
          <tr>
            {[copy.table.time, 'PV(kW)', copy.table.load, copy.table.buy, copy.table.sell, copy.table.battery, 'SOC(%)', copy.table.import, copy.table.export, copy.table.curtailment].map((head) => (
              <th key={head} className="border-b border-slate-200 px-3 py-2 text-right first:text-left dark:border-apple-border-dark">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.time}-${index}`} className="odd:bg-slate-50/70 dark:odd:bg-apple-surface-secondary-dark/30">
              <td className="border-b border-slate-100 px-3 py-2 font-mono dark:border-apple-border-dark">{row.time}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.pvKW)}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.loadKW)}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.buyPrice, 3)}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.sellPrice, 3)}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.batteryPowerKW)}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.socPct)}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.gridImportKW)}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.gridExportKW)}</td>
              <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-apple-border-dark">{fmt(row.pvCurtKW)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AIDispatchOptimizer;
