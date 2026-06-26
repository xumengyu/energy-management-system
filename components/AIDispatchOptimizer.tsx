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
  CheckCircle2,
  FileJson,
  Gauge,
  GitBranch,
  Play,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { Language, Theme } from '../types';
import { translations } from '../translations';
import type { StationListItem } from './StationList';

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
type TabKey = 'overview' | 'price' | 'forecast' | 'result' | 'dispatch' | 'config';
type DeployStatus = 'idle' | 'confirm' | 'deployed';
type DispatchAction = 'Charge' | 'Discharge' | 'Standby';
type OptimizerSwitchStatus = 'trial' | 'on' | 'off';

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
  overview: Gauge,
  price: SlidersHorizontal,
  forecast: Zap,
  result: BatteryCharging,
  dispatch: GitBranch,
  config: FileJson,
};

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

function strategyLabel(strategy: CloudStrategyMode, lang: Language) {
  return strategy === 'day_ahead'
    ? (lang === 'zh' ? '日前策略' : 'Day-ahead')
    : (lang === 'zh' ? '滚动优化' : 'Rolling');
}

const AIDispatchOptimizer: React.FC<AIDispatchOptimizerProps> = ({ lang, theme, selectedStation, selectedStationData }) => {
  const copy = translations[lang].aiDispatchOptimizer;
  const isDark = theme === 'dark';
  const tx = useCallback((zh: string, en: string) => (lang === 'zh' ? zh : en), [lang]);
  const activeStationId = selectedStationData?.id ?? 'ST-002';
  const activeStationName = selectedStationData?.name ?? selectedStation ?? tx('站点 #2 (慕尼黑)', 'Station #2 (Munich)');
  const chartColors = useMemo(() => ({
    grid: isDark ? '#38404c' : '#e2e8f0',
    text: isDark ? '#94a3b8' : '#64748b',
    card: isDark ? '#1e2128' : '#ffffff',
    tooltip: isDark ? '#252a32' : '#ffffff',
  }), [isDark]);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [priceTemplate, setPriceTemplate] = useState<PriceTemplate>('market');
  const [priceRules, setPriceRules] = useState<Record<FlowKey, FlowRule>>(() => defaultRules('market'));
  const [marketSource, setMarketSource] = useState(MARKET_SOURCES[0]);
  const [granularity, setGranularity] = useState('15分钟');
  const [negativePolicy, setNegativePolicy] = useState<NegativePolicy>('allow');
  const [objective, setObjective] = useState<CloudObjective>('storage_profit');
  const [strategyMode, setStrategyMode] = useState<CloudStrategyMode>('day_ahead');
  const [dtMinutes, setDtMinutes] = useState(15);
  const [capKWh, setCapKWh] = useState(1000);
  const [soc0Pct, setSoc0Pct] = useState(48);
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
  const [optimizerStatus, setOptimizerStatus] = useState<OptimizerSwitchStatus>('trial');
  const isOptimizerEnabled = optimizerStatus === 'on';

  const optimizerStatusText = useMemo(() => {
    if (optimizerStatus === 'trial') return copy.statusControl.trial;
    return optimizerStatus === 'on' ? copy.statusControl.on : copy.statusControl.off;
  }, [copy.statusControl.off, copy.statusControl.on, copy.statusControl.trial, optimizerStatus]);

  const toggleOptimizerStatus = () => {
    setOptimizerStatus((status) => (status === 'on' ? 'off' : 'on'));
    setError('');
    setMessage('');
  };

  const startTrial = () => {
    setOptimizerStatus('on');
    setError('');
    setMessage('');
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
      currentSocPct: soc0Pct,
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
    strategyMode,
    dispatchDraft,
  }, null, 2), [
    capKWh, curtPenalty, cycleCost, demandLimit, demandPenalty, dispatchDraft, dtMinutes, etaRoundTrip,
    exportLimit, importLimit, objective, pChMax, pDisMax, priceModelSnapshot, soc0Pct, socEndPct, socMaxPct,
    socMinPct, strategyMode,
  ]);

  const setTemplate = (template: PriceTemplate) => {
    setPriceTemplate(template);
    setPriceRules(defaultRules(template));
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

  const generateDispatch = () => {
    setMessage('');
    const warnings = validate();
    if (warnings.length) {
      setError(warnings.join(' '));
      return;
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
    setActiveTab('overview');
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <StatusPill label={copy.labels.station} value={activeStationName} />
        <StatusPill label={copy.labels.market} value={marketSourceLabel(marketSource, lang)} />
        <StatusPill label={copy.labels.priceModel} value={templateLabel(priceTemplate, lang)} />
        <StatusPill label={copy.labels.deploy} value={deployStatusLabel} />
      </div>
    </div>
  );

  const renderPrice = () => (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="ems-card p-4">
        <SectionTitle title={copy.priceKeyConfig} subtitle={copy.priceKeyConfigHint} />
        <div className="mt-4 space-y-4">
          <div>
            <Label>{copy.labels.priceTemplate}</Label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(['market', 'tou', 'ppa'] as PriceTemplate[]).map((template) => (
                <React.Fragment key={template}>
                  <SegmentButton active={priceTemplate === template} onClick={() => setTemplate(template)}>
                    {templateLabel(template, lang)}
                  </SegmentButton>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px]">
            <SelectField label={copy.labels.marketSource} value={marketSource} onChange={setMarketSource} options={MARKET_SOURCES.map((source) => ({ value: source, label: marketSourceLabel(source, lang) }))} />
            <SelectField label={copy.labels.granularity} value={granularity} onChange={setGranularity} options={['5分钟', '15分钟', '30分钟', '1小时'].map((value) => ({ value, label: granularityLabel(value, lang) }))} />
          </div>
          <SelectField
            label={copy.labels.negativePolicy}
            value={negativePolicy}
            onChange={(value) => setNegativePolicy(value as NegativePolicy)}
            options={[
              { value: 'allow', label: tx('允许负价', 'Allow Negative Price') },
              { value: 'clamp_zero', label: tx('负价按 0', 'Clamp to Zero') },
              { value: 'approval', label: tx('负价需确认', 'Require Approval') },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={syncCloudPrices} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200">
              {copy.syncPrices}
            </button>
            <button type="button" onClick={generateDispatch} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-black text-white hover:bg-brand-500">
              {copy.applyGenerate}
            </button>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {adapter.warnings.map((warning) => (
              <div key={warning}>{warning === 'negative-price-approval' ? copy.warnings.negativeApproval : copy.warnings.adapter}</div>
            ))}
          </div>
        </div>
      </div>

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
        <div className="ems-card p-4">
          <SectionTitle title={copy.flowMatrix} subtitle={copy.flowMatrixHint} />
          <div className="mt-3 grid grid-cols-1 gap-2">
            {FLOW_DEFS.map((flow) => {
              const current = priceRules[flow.key];
              return (
                <div key={flow.key} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 p-3 dark:border-apple-border-dark lg:grid-cols-[1.1fr_130px_100px_100px]">
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">{lang === 'zh' ? flow.zh : flow.en}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{lang === 'zh' ? flow.descZh : flow.descEn}</div>
                  </div>
                  <select value={current.mode} onChange={(event) => setPriceRules((rules) => ({ ...rules, [flow.key]: { ...rules[flow.key], mode: event.target.value as RuleMode } }))} className={selectClass}>
                    <option value="fixed">{tx('固定', 'Fixed')}</option>
                    <option value="tou">{tx('分时', 'TOU')}</option>
                    <option value="discount">{tx('折扣', 'Discount')}</option>
                    <option value="spread">{tx('价差', 'Spread')}</option>
                    <option value="same">{tx('同价', 'Same')}</option>
                  </select>
                  <NumberInput value={current.factor} onChange={(value) => setPriceRules((rules) => ({ ...rules, [flow.key]: { ...rules[flow.key], factor: value } }))} />
                  <NumberInput value={current.fixed} onChange={(value) => setPriceRules((rules) => ({ ...rules, [flow.key]: { ...rules[flow.key], fixed: value } }))} />
                </div>
              );
            })}
          </div>
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
            <Field label={copy.fields.currentSoc} value={soc0Pct} onChange={setSoc0Pct} />
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

  const renderConfig = () => (
    <div className="ems-card overflow-hidden">
      <CardHeader title={copy.configAudit} subtitle={copy.configAuditHint} />
      <pre className="max-h-[620px] overflow-auto p-4 text-xs text-slate-700 dark:text-slate-300">
        {configJson}
      </pre>
    </div>
  );

  return (
    <div className="ems-page-shell">
      <div className="mx-auto w-full max-w-[1720px] space-y-4">
        <div className="overflow-hidden rounded-2xl bg-[#071006] px-5 py-5 dark:bg-[#071006]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">{copy.title}</h1>
              <p className="mt-1 text-sm font-semibold text-slate-400">{copy.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{copy.statusControl.label}</span>
                <span className={`rounded-lg px-2 py-1 text-xs font-black ${
                  optimizerStatus === 'on'
                    ? 'bg-brand-400 text-[#171a20]'
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
                className={`relative h-9 w-16 rounded-full border transition-colors ${
                  optimizerStatus === 'on'
                    ? 'border-brand-300 bg-brand-400'
                    : 'border-white/10 bg-white/10'
                }`}
                title={copy.statusControl.switch}
              >
                <span
                  className={`absolute top-1 h-7 w-7 rounded-full bg-white transition-transform ${
                    optimizerStatus === 'on' ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
              {isOptimizerEnabled && (
                <button type="button" onClick={generateDispatch} className="inline-flex items-center gap-2 rounded-xl bg-brand-400 px-4 py-2 text-xs font-black text-[#171a20] hover:bg-brand-300">
                  <Play size={14} />
                  {copy.generate}
                </button>
              )}
            </div>
          </div>
        </div>

        {isOptimizerEnabled && error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {isOptimizerEnabled && message && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:border-brand-400/30 dark:bg-brand-400/10 dark:text-brand-200">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            {message}
          </div>
        )}

        {isOptimizerEnabled ? (
          <>
            <div className="ems-card p-2">
              <div className="flex gap-1 overflow-x-auto">
                {(['overview', 'price', 'forecast', 'result', 'dispatch', 'config'] as TabKey[]).map(renderTabButton)}
              </div>
            </div>

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'price' && renderPrice()}
            {activeTab === 'forecast' && renderForecast()}
            {activeTab === 'result' && renderResult()}
            {activeTab === 'dispatch' && renderDispatch()}
            {activeTab === 'config' && renderConfig()}
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
  );
};

const selectClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-brand-500 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200';
const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-brand-500 dark:border-apple-border-dark dark:bg-apple-surface-secondary-dark dark:text-slate-200';

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

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <select className={`${selectClass} mt-2`} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
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
