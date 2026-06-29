import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { PredictionStep, SimulationStep } from './types';
import PredictionChart from './components/PredictionChart';
import EnergyChart from './components/EnergyChart';
import { buildDispatchStrategyDraft, type DispatchStrategyDraft } from './dispatchAdapter';
import {
  buildOptimizerPriceAdapter,
  defaultRules,
  FLOW_DEFS,
  negativePolicyLabel,
  objectiveLabel,
  previewRows,
  strategyLabel,
  templateLabel,
  type CloudObjective,
  type CloudStrategyMode,
  type FlowKey,
  type FlowRule,
  type NegativePolicy,
  type PriceTemplate,
  type RuleMode,
} from './cloudPriceModel';

declare const __USE_MOCK_OPTIMIZER__: boolean;

type OptimizeSummary = {
  objectiveValue: number;
  dtMinutes: number;
  optimizedCost: number;
  baselineCost: number;
  saving: number;
  endSocPct: number;
  totalBatteryThroughputKWh: number;
  totalGridImportKWh: number;
  totalGridExportKWh: number;
  totalPvCurtKWh: number;
  // 需量软上限（允许超限但会被重罚）
  maxImportOverKW?: number;
  demandOverKWh?: number;
  demandPenaltyCost?: number;
  demandLimitKW?: number | null;
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

type OptimizeResponse = {
  steps: OptimizeStep[];
  summary: OptimizeSummary;
};

type Step6View = 'summary' | 'price' | 'prediction' | 'result' | 'ems' | 'config';
type DeployStatus = 'idle' | 'confirm' | 'deployed';
type Locale = 'zh' | 'en';

const step6ViewLabels: Record<Step6View, Record<Locale, string>> = {
  summary: { zh: '执行预览', en: 'Execution Preview' },
  price: { zh: '价格模型', en: 'Price Model' },
  prediction: { zh: '预测边界', en: 'Forecast & Limits' },
  result: { zh: '优化结果', en: 'Optimization Result' },
  ems: { zh: '云调度', en: 'Cloud Dispatch' },
  config: { zh: '配置审计', en: 'Config Audit' },
};

const emsGroupLabels: Record<string, Record<Locale, string>> = {
  OVERVIEW: { zh: '概述', en: 'OVERVIEW' },
  MANAGEMENT: { zh: '管理', en: 'MANAGEMENT' },
  'PRICE & TRADING': { zh: '价格与交易', en: 'PRICE & TRADING' },
  CONTROL: { zh: '控制', en: 'CONTROL' },
};

const emsItemLabels: Record<string, Record<Locale, string>> = {
  'Asset Overview': { zh: '资产概览', en: 'Asset Overview' },
  'Station List': { zh: '站点列表', en: 'Station List' },
  'Architecture Map': { zh: '架构地图', en: 'Architecture Map' },
  'Real-time Overview': { zh: '实时概览', en: 'Real-time Overview' },
  'Data Analysis': { zh: '数据分析', en: 'Data Analysis' },
  'Execution View': { zh: '执行视图', en: 'Execution View' },
  'AI Dispatch': { zh: 'AI 调度', en: 'AI Dispatch' },
  'Manual Dispatch': { zh: '人工调度', en: 'Manual Dispatch' },
  'Price List': { zh: '价格表', en: 'Price List' },
  'Manual Control': { zh: '手动控制', en: 'Manual Control' },
  'MD Strategy': { zh: 'MD 策略', en: 'MD Strategy' },
  'Protection Strategy': { zh: '保护策略', en: 'Protection Strategy' },
};

function pickLocaleText(locale: Locale, zh: string, en: string) {
  return locale === 'zh' ? zh : en;
}

function parseSeries(text: string): number[] {
  const t = (text || '').trim();
  if (!t) return [];
  return t.split(/[\s,]+/).filter(Boolean).map((x) => Number(x));
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '-';
  return (Math.round(n * 100) / 100).toFixed(2);
}

function toCsv(arr: number[]): string {
  return arr.map((v) => (Number.isFinite(v) ? String(v) : '0')).join(',');
}

// ---------- Random example generator (96 points) ----------
// 可复现：给 seed；可调：intensity 0~1（越大波动越强）
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

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function randn(rng: () => number) {
  // Box–Muller
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

function makeRandomExample96(seed?: number, intensity: number = 0.85) {
  const T = 96; // 96点 = 24h * 4 (dt=15min)
  const usedSeed = Number.isFinite(seed) ? (seed as number) : (Math.floor(Date.now() % 2_000_000_000) >>> 0);
  const rng = mulberry32(usedSeed);

  // 价格（元/kWh）：谷/平/峰 + 小扰动（便于验证“低买高用/套利”）
  const valley = 0.25 + rng() * 0.25;      // 0.25~0.50
  const flat = 0.55 + rng() * 0.45;        // 0.55~1.00
  const peak = 0.90 + rng() * 0.55;        // 0.90~1.45
  const shoulder = 0.45 + rng() * 0.35;    // 0.45~0.80

  const buy: number[] = [];
  const sell: number[] = [];
  const pv: number[] = [];
  const load: number[] = [];

  // 负荷：基线 + 双峰（早/晚） + 噪声
  const baseLoad = 160 + rng() * 140;      // 160~300
  const morningAmp = 40 + rng() * 120;     // 40~160
  const eveningAmp = 60 + rng() * 180;     // 60~240
  const middayBump = 20 + rng() * 80;      // 20~100
  const noiseKW = (10 + rng() * 25) * intensity; // 10~35 * intensity

  // PV：日照窗口 + 云量扰动
  const sunrise = 6 + rng() * 1.0;         // 6~7
  const sunset = 17 + rng() * 1.5;         // 17~18.5
  const pvPeak = (baseLoad + morningAmp * 0.3 + eveningAmp * 0.2) * (0.6 + rng() * 0.9); // ~0.6~1.5倍负荷尺度
  const pvShape = 1.2 + rng() * 1.2;       // 指数，越大越尖

  // 云量因子：分段缓慢变化
  let cloud = 1.0;
  let cloudTarget = 0.75 + rng() * 0.3; // 0.75~1.05
  let cloudHold = 0;

  for (let i = 0; i < T; i++) {
    const h = i * 0.25; // hour, dt=15min

    // buy price
    let bp = flat;
    if (h >= 0 && h < 6) bp = valley;
    else if (h >= 6 && h < 18) bp = flat;
    else if (h >= 18 && h < 22) bp = peak;
    else bp = shoulder;

    bp += (rng() - 0.5) * 0.12 * intensity; // +/-0.06 * intensity
    bp = clamp(bp, 0.05, 5);

    // sell price（比买价低一档，避免无限套利）
    let sp = bp - (0.18 + rng() * 0.12);
    if (h >= 18 && h < 22) sp = bp - (0.10 + rng() * 0.10);
    sp += (rng() - 0.5) * 0.06 * intensity;
    sp = clamp(sp, 0.01, bp - 0.02);

    buy.push(round2(bp));
    sell.push(round2(sp));

    // load profile
    const g = (mu: number, sigma: number) => Math.exp(-0.5 * ((h - mu) / sigma) ** 2);
    const morning = morningAmp * g(9.0, 1.5);
    const evening = eveningAmp * g(19.5, 2.0);
    const midday = middayBump * g(13.0, 3.0);
    const l = clamp(baseLoad + morning + evening + midday + randn(rng) * noiseKW, 10, 2000);
    load.push(round2(l));

    // PV profile
    let p = 0;
    if (h >= sunrise && h <= sunset) {
      const x = (h - sunrise) / Math.max(0.001, (sunset - sunrise)); // 0~1
      // bell
      p = pvPeak * Math.pow(Math.sin(Math.PI * x), pvShape);

      // cloud evolution
      if (cloudHold <= 0) {
        cloudTarget = 0.55 + rng() * 0.55; // 0.55~1.10
        cloudHold = 2 + Math.floor(rng() * 10); // hold 2~11 steps
      }
      cloud += (cloudTarget - cloud) * (0.10 + rng() * 0.15); // smooth toward target
      cloudHold -= 1;

      const cloudNoise = 1.0 - Math.abs(randn(rng)) * 0.10 * intensity;
      p = p * clamp(cloud, 0.35, 1.15) * clamp(cloudNoise, 0.4, 1.2);
    }
    pv.push(round2(clamp(p, 0, 5000)));
  }

  return { seed: usedSeed, buy, sell, pv, load };
}

type MockOptimizerPayload = {
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
};

function quantile(values: number[], ratio: number) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * ratio)));
  return sorted[index];
}

function buildMockOptimization(payload: MockOptimizerPayload): OptimizeResponse {
  const count = Math.min(
    payload.buyPrice.length,
    payload.sellPrice.length,
    payload.pvForecastKW.length,
    payload.loadForecastKW.length,
  );
  const dtMinutes = Math.max(1, Number(payload.dtMinutes) || 15);
  const dtH = dtMinutes / 60;
  const cap = Math.max(0.0001, payload.battery.totalCapacityKWh);
  const socMin = clamp(payload.battery.socMinPct, 0, 100);
  const socMax = clamp(payload.battery.socMaxPct, socMin, 100);
  const minEnergy = cap * socMin / 100;
  const maxEnergy = cap * socMax / 100;
  const eta = clamp(payload.battery.etaRoundTrip || 0.9, 0.000001, 1);
  const etaCharge = Math.sqrt(eta);
  const etaDischarge = Math.sqrt(eta);
  const pChargeMax = Math.max(0, payload.battery.maxChargePowerKW);
  const pDischargeMax = Math.max(0, payload.battery.maxDischargePowerKW);
  const importLimit = payload.importLimitKW === null ? Infinity : Math.max(0, payload.importLimitKW);
  const exportLimit = payload.exportLimitKW === null ? Infinity : Math.max(0, payload.exportLimitKW);
  const lowPrice = quantile(payload.buyPrice.slice(0, count), 0.35);
  const highPrice = quantile(payload.buyPrice.slice(0, count), 0.65);

  let energy = clamp(cap * payload.battery.currentSocPct / 100, minEnergy, maxEnergy);
  const steps: OptimizeStep[] = [];
  let optimizedCost = 0;
  let baselineCost = 0;
  let totalBatteryThroughputKWh = 0;
  let totalGridImportKWh = 0;
  let totalGridExportKWh = 0;
  let totalPvCurtKWh = 0;
  let maxImportOverKW = 0;
  let demandOverKWh = 0;
  let demandPenaltyCost = 0;

  for (let i = 0; i < count; i++) {
    const buy = payload.buyPrice[i] ?? 0;
    const sell = payload.sellPrice[i] ?? 0;
    const pv = Math.max(0, payload.pvForecastKW[i] ?? 0);
    const load = Math.max(0, payload.loadForecastKW[i] ?? 0);
    const netLoad = load - pv;
    const demandLimit = payload.demandLimitSeriesKW?.[i] ?? payload.demandLimitKW ?? null;
    const activeDemandLimit = demandLimit === null ? Infinity : Math.max(0, demandLimit);

    const baselineImport = Math.max(0, netLoad);
    const baselineSurplus = Math.max(0, -netLoad);
    const baselineExport = Math.min(exportLimit, baselineSurplus);
    const baselineCurt = Math.max(0, baselineSurplus - baselineExport);
    const baselineOver = Math.max(0, baselineImport - activeDemandLimit);
    baselineCost += (
      baselineImport * buy
      - baselineExport * sell
      + baselineCurt * payload.curtailPenalty
      + baselineOver * payload.demandViolationCostPerKWh
    ) * dtH;

    let batteryPowerKW = 0; // positive = discharge, negative = charge
    let gridImportKW = 0;
    let gridExportKW = 0;
    let pvCurtKW = 0;
    const chargeRoomKW = Math.max(0, (maxEnergy - energy) / Math.max(dtH * etaCharge, 0.000001));
    const dischargeRoomKW = Math.max(0, (energy - minEnergy) * etaDischarge / dtH);
    const maxChargeKW = Math.min(pChargeMax, chargeRoomKW);
    const maxDischargeKW = Math.min(pDischargeMax, dischargeRoomKW);

    if (netLoad < 0) {
      const surplus = -netLoad;
      const chargeKW = Math.min(maxChargeKW, surplus);
      batteryPowerKW = -chargeKW;
      energy += chargeKW * dtH * etaCharge;
      const remainingSurplus = Math.max(0, surplus - chargeKW);
      gridExportKW = Math.min(exportLimit, remainingSurplus);
      pvCurtKW = Math.max(0, remainingSurplus - gridExportKW);
    } else {
      const overDemandKW = Math.max(0, netLoad - activeDemandLimit);
      const shouldDischarge = buy >= highPrice || overDemandKW > 0;
      if (shouldDischarge) {
        const targetDischargeKW = overDemandKW > 0 ? overDemandKW : netLoad;
        const dischargeKW = Math.min(maxDischargeKW, netLoad, targetDischargeKW);
        batteryPowerKW = dischargeKW;
        energy -= dischargeKW * dtH / etaDischarge;
        gridImportKW = Math.max(0, netLoad - dischargeKW);
      } else if (buy <= lowPrice) {
        const effectiveImportLimit = Math.min(importLimit, activeDemandLimit);
        const gridChargeHeadroomKW = Number.isFinite(effectiveImportLimit)
          ? Math.max(0, effectiveImportLimit - netLoad)
          : maxChargeKW;
        const chargeKW = Math.min(maxChargeKW, gridChargeHeadroomKW);
        batteryPowerKW = -chargeKW;
        energy += chargeKW * dtH * etaCharge;
        gridImportKW = netLoad + chargeKW;
      } else {
        gridImportKW = netLoad;
      }
    }

    energy = clamp(energy, minEnergy, maxEnergy);
    gridImportKW = Math.min(importLimit, Math.max(0, gridImportKW));
    const importOverKW = Math.max(0, gridImportKW - activeDemandLimit);
    maxImportOverKW = Math.max(maxImportOverKW, importOverKW);
    demandOverKWh += importOverKW * dtH;
    demandPenaltyCost += importOverKW * payload.demandViolationCostPerKWh * dtH;
    totalBatteryThroughputKWh += Math.abs(batteryPowerKW) * dtH;
    totalGridImportKWh += gridImportKW * dtH;
    totalGridExportKWh += gridExportKW * dtH;
    totalPvCurtKWh += pvCurtKW * dtH;
    optimizedCost += (
      gridImportKW * buy
      - gridExportKW * sell
      + Math.abs(batteryPowerKW) * payload.cycleCostPerKWh
      + pvCurtKW * payload.curtailPenalty
      + importOverKW * payload.demandViolationCostPerKWh
    ) * dtH;

    const hour = Math.floor((i * dtMinutes) / 60);
    const minute = (i * dtMinutes) % 60;
    steps.push({
      time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      pvKW: round2(pv),
      loadKW: round2(load),
      buyPrice: round2(buy),
      sellPrice: round2(sell),
      batteryPowerKW: round2(batteryPowerKW),
      socPct: round2(energy / cap * 100),
      gridPowerKW: round2(gridImportKW - gridExportKW),
      gridImportKW: round2(gridImportKW),
      gridExportKW: round2(gridExportKW),
      pvCurtKW: round2(pvCurtKW),
      importOverKW: round2(importOverKW),
    });
  }

  const saving = baselineCost - optimizedCost;
  return {
    steps,
    summary: {
      objectiveValue: round2(optimizedCost),
      dtMinutes,
      optimizedCost: round2(optimizedCost),
      baselineCost: round2(baselineCost),
      saving: round2(saving),
      endSocPct: steps.length ? steps[steps.length - 1].socPct : round2(energy / cap * 100),
      totalBatteryThroughputKWh: round2(totalBatteryThroughputKWh),
      totalGridImportKWh: round2(totalGridImportKWh),
      totalGridExportKWh: round2(totalGridExportKWh),
      totalPvCurtKWh: round2(totalPvCurtKWh),
      maxImportOverKW: round2(maxImportOverKW),
      demandOverKWh: round2(demandOverKWh),
      demandPenaltyCost: round2(demandPenaltyCost),
      demandLimitKW: payload.demandLimitKW,
    },
  };
}


function makeExample96() {
  const T = 96;
  const buy: number[] = [];
  const sell: number[] = [];
  const pv: number[] = [];
  const load: number[] = [];
  for (let i = 0; i < T; i++) {
    const h = i * 0.25; // hour
    const isPeak = h >= 18 && h < 22;
    const isValley = h >= 0 && h < 6;

    buy.push(isPeak ? 1.2 : isValley ? 0.4 : 0.8);
    sell.push(isPeak ? 1.0 : 0.3);

    let p = 0;
    if (h >= 6 && h <= 18) {
      const x = ((h - 6) / 12) * Math.PI;
      p = 300 * Math.sin(x);
    }
    pv.push(Math.round(p * 100) / 100);

    let l = 200;
    if (h >= 18 && h < 22) l += 180;
    if (h >= 8 && h < 17) l += 50;
    load.push(l);
  }
  return { buy, sell, pv, load };
}

const labels = {
  // charts
  pvForecast: 'PV预测',
  loadForecast: '负荷预测',
  solarPv: '光伏(PV)',
  loadDemand: '负荷(Load)',
  storagePower: '储能功率(kW)',
  batterySoc: 'SOC(%)',
  gridInteraction: '电网功率(kW)',
  energyPrice: '电价',
  // unused but required by other chart components in repo (kept for compatibility)
  pvActual: 'PV',
  loadActual: '负荷',
  soc: 'SOC',
  power: '功率',
  priceUnit: '元/kWh',
  gridSellPrice: '卖电价',
  storageFromGridPrice: '购电价',
  storageLocalPrice: '本地价',
};

const chartLabelsByLocale: Record<Locale, typeof labels> = {
  zh: labels,
  en: {
    pvForecast: 'PV Forecast',
    loadForecast: 'Load Forecast',
    solarPv: 'Solar PV',
    loadDemand: 'Load',
    storagePower: 'Storage Power (kW)',
    batterySoc: 'SOC(%)',
    gridInteraction: 'Grid Power (kW)',
    energyPrice: 'Price',
    pvActual: 'PV',
    loadActual: 'Load',
    soc: 'SOC',
    power: 'Power',
    priceUnit: 'CNY/kWh',
    gridSellPrice: 'Sell Price',
    storageFromGridPrice: 'Buy Price',
    storageLocalPrice: 'Local Price',
  },
};

const ruleModeLabelsByLocale: Record<RuleMode, Record<Locale, string>> = {
  fixed: { zh: '固定一口价', en: 'Fixed Price' },
  tou: { zh: '分时电价', en: 'TOU Price' },
  discount: { zh: '市场价折扣', en: 'Market Discount' },
  spread: { zh: '市场价+价差', en: 'Market + Spread' },
  same: { zh: '等同价', en: 'Same As Flow' },
};

const templateLabelsByLocale: Record<PriceTemplate, Record<Locale, string>> = {
  market: { zh: '市场联动折扣', en: 'Market-linked Discount' },
  tou: { zh: '工商业分时', en: 'C&I TOU' },
  ppa: { zh: '一口价/PPA', en: 'Fixed / PPA' },
};

const objectiveLabelsByLocale: Record<CloudObjective, Record<Locale, string>> = {
  storage_profit: { zh: '储能收益最大化', en: 'Maximize Storage Profit' },
  green: { zh: '绿电消纳最大化', en: 'Maximize Green Consumption' },
  station_profit: { zh: '全站收益最大化', en: 'Maximize Station Profit' },
};

const strategyLabelsByLocale: Record<CloudStrategyMode, Record<Locale, string>> = {
  day_ahead: { zh: '日前策略', en: 'Day-ahead Strategy' },
  rolling: { zh: '滚动优化', en: 'Rolling Optimization' },
};

const negativePolicyLabelsByLocale: Record<NegativePolicy, Record<Locale, string>> = {
  allow: { zh: '允许负价', en: 'Allow Negative Price' },
  clamp_zero: { zh: '负价按0', en: 'Clamp Negative to 0' },
  approval: { zh: '负价需确认', en: 'Require Approval' },
};

const flowTextByLocale: Record<FlowKey, Record<Locale, { label: string; description: string }>> = {
  grid_to_load: {
    zh: { label: '电网->负荷', description: '外购电成本' },
    en: { label: 'Grid -> Load', description: 'Grid purchase cost' },
  },
  grid_to_bess: {
    zh: { label: '电网->储能', description: 'Grid charging cost' },
    en: { label: 'Grid -> BESS', description: 'Grid charging cost' },
  },
  pv_to_load: {
    zh: { label: '光伏->负荷', description: '光伏自用价值' },
    en: { label: 'PV -> Load', description: 'PV self-consumption value' },
  },
  pv_to_bess: {
    zh: { label: '光伏->储能', description: '光伏充电机会成本' },
    en: { label: 'PV -> BESS', description: 'PV charging opportunity cost' },
  },
  pv_to_grid: {
    zh: { label: '光伏->电网', description: '光伏上网收益' },
    en: { label: 'PV -> Grid', description: 'PV export revenue' },
  },
  bess_to_load: {
    zh: { label: '储能->负荷', description: '替代购电收益' },
    en: { label: 'BESS -> Load', description: 'Avoided purchase revenue' },
  },
  bess_to_grid: {
    zh: { label: '储能->电网', description: '储能上网收益' },
    en: { label: 'BESS -> Grid', description: 'Storage export revenue' },
  },
};

const marketSourceLabelsByLocale: Record<string, Record<Locale, string>> = {
  '广东电力现货-日前市场': { zh: '广东电力现货-日前市场', en: 'Guangdong Spot - Day-ahead' },
  '广东电力现货-实时市场': { zh: '广东电力现货-实时市场', en: 'Guangdong Spot - Real-time' },
  '山东电力现货-日前市场': { zh: '山东电力现货-日前市场', en: 'Shandong Spot - Day-ahead' },
  '山西电力现货-日前市场': { zh: '山西电力现货-日前市场', en: 'Shanxi Spot - Day-ahead' },
  '蒙西电力现货-实时市场': { zh: '蒙西电力现货-实时市场', en: 'West Inner Mongolia Spot - Real-time' },
  '浙江工商业分时模板': { zh: '浙江工商业分时模板', en: 'Zhejiang C&I TOU Template' },
  'Excel导入日前价格': { zh: 'Excel导入日前价格', en: 'Excel-imported Day-ahead Price' },
  '手动维护价格曲线': { zh: '手动维护价格曲线', en: 'Manual Price Curve' },
};

const granularityLabelsByLocale: Record<string, Record<Locale, string>> = {
  '5分钟': { zh: '5分钟', en: '5 min' },
  '15分钟': { zh: '15分钟', en: '15 min' },
  '30分钟': { zh: '30分钟', en: '30 min' },
  '1小时': { zh: '1小时', en: '1 h' },
};

function uiTemplateLabel(template: PriceTemplate, locale: Locale) {
  return templateLabelsByLocale[template]?.[locale] ?? templateLabel(template);
}

function uiObjectiveLabel(objective: CloudObjective, locale: Locale) {
  return objectiveLabelsByLocale[objective]?.[locale] ?? objectiveLabel(objective);
}

function uiStrategyLabel(strategy: CloudStrategyMode, locale: Locale) {
  return strategyLabelsByLocale[strategy]?.[locale] ?? strategyLabel(strategy);
}

function uiNegativePolicyLabel(policy: NegativePolicy, locale: Locale) {
  return negativePolicyLabelsByLocale[policy]?.[locale] ?? negativePolicyLabel(policy);
}

function uiFlowText(flow: { key: FlowKey; label: string; description: string }, locale: Locale) {
  return flowTextByLocale[flow.key]?.[locale] ?? { label: flow.label, description: flow.description };
}

function uiMarketSourceLabel(source: string, locale: Locale) {
  return marketSourceLabelsByLocale[source]?.[locale] ?? source;
}

function uiGranularityLabel(value: string, locale: Locale) {
  return granularityLabelsByLocale[value]?.[locale] ?? value;
}

function uiAdapterWarning(warning: string, locale: Locale) {
  if (locale === 'zh') return warning;
  if (warning.includes('负电价')) return 'The sample market price contains negative values; manual approval is recommended before automatic deployment.';
  if (warning.includes('买价/卖价双曲线接口')) return 'The current optimizer uses buy/sell price curves: grid_to_load is used as buyPrice, and the lower of pv_to_grid / bess_to_grid is used as conservative sellPrice.';
  return warning;
}

function normalizeRuleForMode(rule: FlowRule, mode: RuleMode): FlowRule {
  if (mode === 'fixed') {
    return { ...rule, mode, base: 'fixed', factor: 1, offset: 0, ref: null };
  }
  if (mode === 'tou') {
    return { ...rule, mode, base: 'tou', factor: 1, offset: 0, ref: null };
  }
  if (mode === 'discount') {
    return {
      ...rule,
      mode,
      base: rule.base === 'tou' ? 'tou' : 'market',
      factor: rule.factor === 1 ? 0.95 : rule.factor,
      ref: null,
    };
  }
  if (mode === 'spread') {
    return { ...rule, mode, base: rule.base === 'tou' ? 'tou' : 'market', factor: 1, ref: null };
  }
  return { ...rule, mode, base: 'same', factor: 1, offset: 0, ref: rule.ref ?? 'grid_to_load' };
}

const wizardSteps = [
  { id: 1, title: '功率来源设置', desc: '绑定负荷、光伏、储能、并网点和SOC点位' },
  { id: 2, title: '电站价格模型', desc: '选择价格源、计价规则和能量流向' },
  { id: 3, title: '求解器边界参数', desc: '配置SOC、容量、功率、购售电与需量限制' },
  { id: 4, title: '电站优化目标', desc: '选择储能收益、绿电消纳或全站收益目标' },
  { id: 5, title: '策略生成与下发', desc: '日前策略或滚动优化，并保留实时修正兜底' },
  { id: 6, title: '策略预览与执行', desc: '预览策略、调用模型、检查结果后下发' },
];

const dataSourceOptions = {
  load: ['Load_P_Total_kW', 'Meter_Load_ActivePower', 'AC_Load_P'],
  pv: ['PV_P_Total_kW', 'Inverter_Total_Power', 'PV_AC_P'],
  bess: ['BESS_P_Total_kW', 'PCS_Total_ActivePower', 'ESS_AC_P'],
  grid: ['Grid_PCC_Power', 'PCC_ActivePower', 'Meter_Grid_P'],
  soc: ['BESS_SOC_Avg', 'BMS_SOC', 'ESS_SOC'],
};

const marketPriceSourceOptions = [
  '广东电力现货-日前市场',
  '广东电力现货-实时市场',
  '山东电力现货-日前市场',
  '山西电力现货-日前市场',
  '蒙西电力现货-实时市场',
  '浙江工商业分时模板',
  'Excel导入日前价格',
  '手动维护价格曲线',
];

const step6Views: Array<{ id: Step6View }> = [
  { id: 'summary' },
  { id: 'price' },
  { id: 'prediction' },
  { id: 'result' },
  { id: 'ems' },
  { id: 'config' },
];

const emsNavGroups = [
  {
    title: 'OVERVIEW',
    items: ['Asset Overview', 'Station List'],
  },
  {
    title: 'MANAGEMENT',
    items: ['Architecture Map', 'Real-time Overview', 'Data Analysis'],
  },
  {
    title: 'PRICE & TRADING',
    items: ['Execution View', 'AI Dispatch', 'Manual Dispatch', 'Price List'],
  },
  {
    title: 'CONTROL',
    items: ['Manual Control', 'MD Strategy', 'Protection Strategy'],
  },
];

function clampWizardStep(value: number) {
  return Math.min(wizardSteps.length, Math.max(1, Math.trunc(value)));
}

function readInitialStep() {
  return 6;
}

function readInitialStep6View(): Step6View {
  if (typeof window === 'undefined') return 'summary';
  const raw = new URLSearchParams(window.location.search).get('view');
  return step6Views.some((view) => view.id === raw) ? raw as Step6View : 'summary';
}

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
  const params = new URLSearchParams(window.location.search);
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem('ai-dispatch-locale');
  } catch {
    stored = null;
  }
  const raw = params.get('lang') ?? stored;
  return raw === 'en' ? 'en' : 'zh';
}

function replaceSearchParams(updates: Record<string, string | null>) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

export default function App() {
  const [currentStep, setCurrentStep] = useState(readInitialStep);
  const [locale, setLocale] = useState<Locale>(readInitialLocale);
  const t = useCallback((zh: string, en: string) => pickLocaleText(locale, zh, en), [locale]);
  const activeChartLabels = useMemo(() => chartLabelsByLocale[locale], [locale]);

  // --------- Inputs (battery & system) ----------
  const [capKWh, setCapKWh] = useState(1000);
  const [soc0Pct, setSoc0Pct] = useState(48);
  const [socMinPct, setSocMinPct] = useState(15);
  const [socMaxPct, setSocMaxPct] = useState(95);
  const [pChMax, setPChMax] = useState(500);
  const [pDisMax, setPDisMax] = useState(500);
  const [etaRoundTrip, setEtaRoundTrip] = useState(0.9);
  const [socEndPct, setSocEndPct] = useState(30);

  const [dtMinutes, setDtMinutes] = useState(15);
  const [cycleCost, setCycleCost] = useState(0.02);
  const [curtPenalty, setCurtPenalty] = useState(0.05);
  const [exportLimit, setExportLimit] = useState<string>('300'); // empty = unlimited
  const [importLimit, setImportLimit] = useState<string>('800');
  // 需量软上限：人工设置上限（kW），允许超但会被重罚，保证模型不无解
  const [demandLimit, setDemandLimit] = useState<string>('700'); // 空=不启用
  const [demandPenalty, setDemandPenalty] = useState<number>(200); // 元/kWh，越大越不超
  const [demandSeriesText, setDemandSeriesText] = useState<string>(''); // 可选：分时上限（数组）

  // --------- Cloud platform strategy config ----------
  const [priceTemplate, setPriceTemplate] = useState<PriceTemplate>('market');
  const [priceRules, setPriceRules] = useState<Record<FlowKey, FlowRule>>(() => defaultRules('market'));
  const [marketPriceSource, setMarketPriceSource] = useState(marketPriceSourceOptions[0]);
  const [marketGranularity, setMarketGranularity] = useState('15分钟');
  const [cloudObjective, setCloudObjective] = useState<CloudObjective>('storage_profit');
  const [cloudStrategy, setCloudStrategy] = useState<CloudStrategyMode>('day_ahead');
  const [negativePolicy, setNegativePolicy] = useState<NegativePolicy>('allow');
  const [showRawInputs, setShowRawInputs] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [step6View, setStep6View] = useState<Step6View>(readInitialStep6View);
  const [deployStatus, setDeployStatus] = useState<DeployStatus>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    try {
      window.localStorage.setItem('ai-dispatch-locale', locale);
    } catch {
      // URL lang remains the source of truth when storage is unavailable.
    }
  }, [locale]);

  // --------- Data source bindings ----------
  const [loadSource, setLoadSource] = useState(dataSourceOptions.load[0]);
  const [pvSource, setPvSource] = useState(dataSourceOptions.pv[0]);
  const [bessSource, setBessSource] = useState(dataSourceOptions.bess[0]);
  const [gridSource, setGridSource] = useState(dataSourceOptions.grid[0]);
  const [socSource, setSocSource] = useState(dataSourceOptions.soc[0]);
  const [dataInterval, setDataInterval] = useState('5秒');

  // --------- Objective / strategy details ----------
  const [wProfit, setWProfit] = useState(60);
  const [wGreen, setWGreen] = useState(30);
  const [wDemand, setWDemand] = useState(10);
  const [dayGenTime, setDayGenTime] = useState('00:05');
  const [dayHorizon, setDayHorizon] = useState('未来24小时');
  const [dayDispatch, setDayDispatch] = useState('定时自动下发');
  const [rollingInterval, setRollingInterval] = useState('15分钟');
  const [rollingHorizon, setRollingHorizon] = useState('未来24小时');
  const [rollingDispatch, setRollingDispatch] = useState('每次重算后自动下发');
  const [rtSoc, setRtSoc] = useState(true);
  const [rtGrid, setRtGrid] = useState(true);
  const [rtFault, setRtFault] = useState(true);
  const [rtPrice, setRtPrice] = useState(true);
  const [rtSocMinBoundary, setRtSocMinBoundary] = useState('15');
  const [rtSocMaxBoundary, setRtSocMaxBoundary] = useState('95');
  const [rtGridImportBoundary, setRtGridImportBoundary] = useState('800');
  const [rtGridExportBoundary, setRtGridExportBoundary] = useState('300');
  const [rtDeratePowerFloor, setRtDeratePowerFloor] = useState('80');
  const [rtPriceJumpThreshold, setRtPriceJumpThreshold] = useState('30');

  // --------- 96 point series (raw text) ----------
  const [buyText, setBuyText] = useState('');
  const [sellText, setSellText] = useState('');
  const [pvText, setPvText] = useState('');
  const [loadText, setLoadText] = useState('');

  // --------- Results ----------
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [lastSeed, setLastSeed] = useState<number | null>(null);
  const [seedInput, setSeedInput] = useState<string>(''); // 可选：固定seed复现随机数据
  const [randIntensity, setRandIntensity] = useState<number>(0.85); // 0~1，越大随机越强

  const seriesLengths = useMemo(() => {
    const buy = parseSeries(buyText).length;
    const sell = parseSeries(sellText).length;
    const pv = parseSeries(pvText).length;
    const load = parseSeries(loadText).length;
    return { buy, sell, pv, load, points: Math.max(buy, sell, pv, load, 96) };
  }, [buyText, sellText, pvText, loadText]);

  const cloudAdapter = useMemo(() => (
    buildOptimizerPriceAdapter({
      template: priceTemplate,
      rules: priceRules,
      dtMinutes,
      points: seriesLengths.points,
      negativePolicy,
      objective: cloudObjective,
    })
  ), [cloudObjective, dtMinutes, negativePolicy, priceRules, priceTemplate, seriesLengths.points]);

  const cloudPreviewRows = useMemo(() => (
    previewRows(priceRules, negativePolicy)
  ), [negativePolicy, priceRules]);

  const cloudConfigSnapshot = useMemo(() => {
    const snapshot = {
      version: 'integrated_price_model_v1',
      data_sources: {
        load: loadSource,
        pv: pvSource,
        bess: bessSource,
        grid: gridSource,
        soc: socSource,
        interval: dataInterval,
        direction: {
          load: 'positive_consumption',
          pv: 'positive_generation',
          bess: 'positive_discharge_negative_charge',
          grid: 'positive_import_negative_export',
        },
      },
      price_model: {
        template: priceTemplate,
        template_label: templateLabel(priceTemplate),
        source: {
          market: marketPriceSource,
          granularity: marketGranularity,
          timezone: 'Asia/Shanghai',
        },
        negative_policy: negativePolicy,
        negative_policy_label: negativePolicyLabel(negativePolicy),
        flow_rules: cloudAdapter.rules,
        adapter: {
          buyPrice: 'grid_to_load',
          sellPrice: 'min(pv_to_grid,bess_to_grid)',
        },
      },
      solver: {
        round_trip_efficiency: etaRoundTrip,
        cycle_cost: cycleCost,
        curtailment_penalty: curtPenalty,
        soc_min: socMinPct,
        soc_max: socMaxPct,
        end_soc_min: socEndPct,
        p_charge_max_kw: pChMax,
        p_discharge_max_kw: pDisMax,
        capacity_kwh: capKWh,
        export_limit_kw: exportLimit,
        import_limit_kw: importLimit,
        demand_limit_kw: demandLimit,
      },
      objective: {
        type: cloudObjective,
        label: objectiveLabel(cloudObjective),
      },
      strategy: cloudStrategy === 'day_ahead'
        ? {
          mode: 'day_ahead',
          generation_time: dayGenTime,
          horizon: dayHorizon,
          dispatch: dayDispatch,
        }
        : {
          mode: 'rolling',
          interval: rollingInterval,
          horizon: rollingHorizon,
          dispatch: rollingDispatch,
        },
      realtime_correction: {
        enabled: true,
        soc: rtSoc,
        grid_limit: rtGrid,
        equipment_derating: rtFault,
        price_abnormal: rtPrice,
        boundaries: {
          soc_min_pct: rtSocMinBoundary,
          soc_max_pct: rtSocMaxBoundary,
          grid_import_limit_kw: rtGridImportBoundary,
          grid_export_limit_kw: rtGridExportBoundary,
          device_available_power_floor_pct: rtDeratePowerFloor,
          price_jump_threshold_pct: rtPriceJumpThreshold,
        },
      },
    };
    return snapshot;
  }, [
    capKWh, cloudAdapter.rules, cloudObjective, cloudStrategy, curtPenalty, cycleCost,
    dataInterval, dayDispatch, dayGenTime, dayHorizon, demandLimit, etaRoundTrip,
    exportLimit, gridSource, importLimit, loadSource, marketGranularity, marketPriceSource,
    negativePolicy, pChMax, pDisMax, priceTemplate, pvSource, rollingDispatch, rollingHorizon, rollingInterval,
    rtDeratePowerFloor, rtFault, rtGrid, rtGridExportBoundary, rtGridImportBoundary,
    rtPrice, rtPriceJumpThreshold, rtSoc, rtSocMaxBoundary, rtSocMinBoundary,
    socEndPct, socMaxPct, socMinPct, socSource,
    bessSource, wDemand, wGreen, wProfit,
  ]);

  const dispatchPriceModelSnapshot = useMemo(() => ({
    phase: 'phase_2_embedded_price_model',
    version: cloudConfigSnapshot.version,
    template: priceTemplate,
    templateLabel: templateLabel(priceTemplate),
    marketSource: marketPriceSource,
    granularity: marketGranularity,
    timezone: 'Asia/Shanghai',
    negativePolicy,
    negativePolicyLabel: negativePolicyLabel(negativePolicy),
    flowRules: cloudAdapter.rules,
    adapter: {
      buyPrice: 'grid_to_load',
      sellPrice: 'min(pv_to_grid,bess_to_grid)',
      optimizerInterface: 'buyPrice/sellPrice',
    },
    preview24h: cloudPreviewRows,
    warnings: cloudAdapter.warnings,
  }), [
    cloudAdapter.rules, cloudAdapter.warnings, cloudConfigSnapshot.version, cloudPreviewRows,
    marketGranularity, marketPriceSource, negativePolicy, priceTemplate,
  ]);

  const cloudConfigJson = useMemo(() => (
    JSON.stringify(cloudConfigSnapshot, null, 2)
  ), [cloudConfigSnapshot]);

  const predictionData: PredictionStep[] = useMemo(() => {
    const pv = parseSeries(pvText);
    const load = parseSeries(loadText);
    const T = Math.min(pv.length, load.length);
    const dt = Math.max(1, Number(dtMinutes) || 15);
    const rows: PredictionStep[] = [];
    for (let i = 0; i < T; i++) {
      const minutes = i * dt;
      const hh = String(Math.floor(minutes / 60) % 24).padStart(2, '0');
      const mm = String(minutes % 60).padStart(2, '0');
      rows.push({ time: `${hh}:${mm}`, pvForecast: pv[i] ?? 0, loadForecast: load[i] ?? 0 });
    }
    return rows;
  }, [pvText, loadText, dtMinutes]);

  const predictionPreviewRows = useMemo(() => {
    const buy = parseSeries(buyText);
    const sell = parseSeries(sellText);
    return predictionData.map((row, index) => ({
      ...row,
      buyPrice: buy[index] ?? 0,
      sellPrice: sell[index] ?? 0,
      netLoadKW: row.loadForecast - row.pvForecast,
    }));
  }, [buyText, predictionData, sellText]);

  const predictionSummary = useMemo(() => {
    const dtH = Math.max(1, Number(dtMinutes) || 15) / 60;
    if (!predictionPreviewRows.length) {
      return {
        points: 0,
        pvPeakKW: 0,
        loadPeakKW: 0,
        netLoadPeakKW: 0,
        pvEnergyKWh: 0,
        loadEnergyKWh: 0,
      };
    }

    return {
      points: predictionPreviewRows.length,
      pvPeakKW: Math.max(...predictionPreviewRows.map((row) => row.pvForecast)),
      loadPeakKW: Math.max(...predictionPreviewRows.map((row) => row.loadForecast)),
      netLoadPeakKW: Math.max(...predictionPreviewRows.map((row) => row.netLoadKW)),
      pvEnergyKWh: predictionPreviewRows.reduce((sum, row) => sum + row.pvForecast * dtH, 0),
      loadEnergyKWh: predictionPreviewRows.reduce((sum, row) => sum + row.loadForecast * dtH, 0),
    };
  }, [dtMinutes, predictionPreviewRows]);

  const simData: SimulationStep[] = useMemo(() => {
    if (!result) return [];
    return result.steps.map((s) => ({
      time: s.time,
      pv: s.pvKW,
      load: s.loadKW,
      price: s.buyPrice,
      batteryPower: s.batteryPowerKW,
      soc: s.socPct,
      gridPower: s.gridPowerKW, // + = buy
      netRevenue: 0, // 这里不做逐点利润拆分（后端 summary 已提供净节省/收益）
    }));
  }, [result]);

  const emsDispatchDraft: DispatchStrategyDraft | null = useMemo(() => {
    if (!result) return null;
    return buildDispatchStrategyDraft({
      stationId: 'ST-002',
      stationName: 'Station #2 (Munich)',
      strategyDate: new Date().toISOString().slice(0, 10),
      mode: cloudStrategy,
      objective: cloudObjective,
      marketSource: marketPriceSource,
      granularity: marketGranularity,
      timezone: 'Asia/Shanghai',
      priceModel: dispatchPriceModelSnapshot,
      dtMinutes: Math.max(1, Number(dtMinutes) || 15),
      steps: result.steps,
      summary: result.summary as unknown as Record<string, unknown>,
    });
  }, [cloudObjective, cloudStrategy, dispatchPriceModelSnapshot, dtMinutes, marketGranularity, marketPriceSource, result]);

  const deployStatusLabel = useMemo(() => {
    if (!emsDispatchDraft) return t('待生成', 'Pending');
    if (deployStatus === 'confirm') return t('待确认', 'Confirm');
    if (deployStatus === 'deployed') return t('已下发', 'Deployed');
    return t('待下发', 'Ready to Deploy');
  }, [deployStatus, emsDispatchDraft, t]);

  const requestDeployStrategy = useCallback(() => {
    if (!emsDispatchDraft) {
      setErr(`INPUT:${t('请先生成 Cloud Dispatch 策略草稿，再执行 Deploy Strategy。', 'Generate a Cloud Dispatch draft before deploying the strategy.')}`);
      return;
    }
    setDeployStatus('confirm');
    setProfileMessage(t('Deploy Strategy 待确认：请检查策略时段、价格模型和收益摘要后确认下发。', 'Deploy Strategy is waiting for confirmation. Review the periods, price model, and revenue summary before deployment.'));
  }, [emsDispatchDraft, t]);

  const cancelDeployStrategy = useCallback(() => {
    setDeployStatus('idle');
    setProfileMessage(t('已取消下发确认，Cloud Dispatch 草稿仍保留。', 'Deployment confirmation was cancelled. The Cloud Dispatch draft is still kept.'));
  }, [t]);

  const confirmDeployStrategy = useCallback(() => {
    if (!emsDispatchDraft) return;
    setDeployStatus('deployed');
    setProfileMessage(t(
      `Deploy Strategy 已模拟下发：${emsDispatchDraft.stationId} / ${emsDispatchDraft.strategyDate} / ${emsDispatchDraft.segments.length} 个时段。`,
      `Deploy Strategy simulated: ${emsDispatchDraft.stationId} / ${emsDispatchDraft.strategyDate} / ${emsDispatchDraft.segments.length} segments.`,
    ));
  }, [emsDispatchDraft, t]);

  const fillExample = useCallback(() => {
    const seed = seedInput.trim() === '' ? undefined : Number(seedInput);
    const ex = makeRandomExample96(Number.isFinite(seed) ? seed : undefined, randIntensity);
    setLastSeed(ex.seed);
    setBuyText(toCsv(ex.buy));
    setSellText(toCsv(ex.sell));
    setPvText(toCsv(ex.pv));
    setLoadText(toCsv(ex.load));
    setErr('');
    setResult(null);
    setDeployStatus('idle');
  }, [randIntensity, seedInput]);

  // 页面首次打开自动填充一组示例数据，避免空输入
  useEffect(() => {
    fillExample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToStep = useCallback((nextStep: number) => {
    const bounded = clampWizardStep(nextStep);
    setErr('');
    setCurrentStep(bounded);
    replaceSearchParams({ step: String(bounded) });
  }, []);

  const selectStep6View = useCallback((view: Step6View) => {
    setStep6View(view);
    replaceSearchParams({ module: 'ai-dispatch', step: null, view });
  }, []);

  const toggleLocale = useCallback(() => {
    const nextLocale: Locale = locale === 'zh' ? 'en' : 'zh';
    setLocale(nextLocale);
    replaceSearchParams({ lang: nextLocale });
  }, [locale]);

  const getStepWarnings = useCallback((step = currentStep) => {
    const warnings: string[] = [];
    if (step === 1) {
      if (!loadSource || !pvSource || !bessSource || !gridSource || !socSource) {
        warnings.push('请先完成负荷、光伏、储能、并网点和SOC点位绑定。');
      }
      const pv = parseSeries(pvText);
      const load = parseSeries(loadText);
      if (!pv.length || !load.length) warnings.push('请生成或输入PV/负荷预测曲线。');
      if (pv.length && load.length && pv.length !== load.length) warnings.push('PV预测和负荷预测点数必须一致。');
    }
    if (step === 3) {
      if (socMinPct >= socMaxPct) warnings.push('SOC最小值必须小于SOC最大值。');
      if (socEndPct < socMinPct) warnings.push('期末SOC下限不能低于SOC最小值。');
      if (etaRoundTrip <= 0 || etaRoundTrip > 1) warnings.push('往返效率必须在0到1之间。');
      if (capKWh <= 0 || pChMax <= 0 || pDisMax <= 0) warnings.push('容量、最大充电功率和最大放电功率必须大于0。');
      if (exportLimit !== '' && Number(exportLimit) < 0) warnings.push('外送上限不能小于0。');
      if (importLimit !== '' && Number(importLimit) < 0) warnings.push('购电上限不能小于0。');
      if (demandLimit !== '' && Number(demandLimit) < 0) warnings.push('需量上限不能小于0。');
    }
    if (step === 5) {
      const rtSocMin = Number(rtSocMinBoundary);
      const rtSocMax = Number(rtSocMaxBoundary);
      const rtImport = Number(rtGridImportBoundary);
      const rtExport = Number(rtGridExportBoundary);
      const rtDerate = Number(rtDeratePowerFloor);
      const rtPriceJump = Number(rtPriceJumpThreshold);

      if (rtSoc && (!Number.isFinite(rtSocMin) || !Number.isFinite(rtSocMax) || rtSocMin < 0 || rtSocMax > 100 || rtSocMin >= rtSocMax)) {
        warnings.push('实时SOC保护边界需满足 0 <= 下限 < 上限 <= 100。');
      }
      if (rtGrid && (!Number.isFinite(rtImport) || !Number.isFinite(rtExport) || rtImport < 0 || rtExport < 0)) {
        warnings.push('实时并网购电/外送边界不能小于0。');
      }
      if (rtFault && (!Number.isFinite(rtDerate) || rtDerate <= 0 || rtDerate > 100)) {
        warnings.push('设备降额可用功率下限需在 0~100% 之间。');
      }
      if (rtPrice && (!Number.isFinite(rtPriceJump) || rtPriceJump <= 0)) {
        warnings.push('价格异常跳变阈值必须大于0。');
      }
    }
    if (step === 6) {
      const pv = parseSeries(pvText);
      const load = parseSeries(loadText);
      if (!pv.length || !load.length) warnings.push('缺少PV/负荷预测，无法生成策略。');
      if (pv.length && load.length && pv.length !== load.length) warnings.push('PV/负荷预测长度不一致，无法调用优化器。');
    }
    return warnings;
  }, [
    bessSource, capKWh, cloudObjective, currentStep, demandLimit, etaRoundTrip,
    exportLimit, gridSource, importLimit, loadSource, loadText, pChMax, pDisMax,
    pvSource, pvText, rtDeratePowerFloor, rtFault, rtGrid, rtGridExportBoundary,
    rtGridImportBoundary, rtPrice, rtPriceJumpThreshold, rtSoc, rtSocMaxBoundary,
    rtSocMinBoundary, socEndPct, socMaxPct, socMinPct, socSource, wDemand,
    wGreen, wProfit,
  ]);

  const goNext = useCallback(() => {
    const warnings = getStepWarnings(currentStep);
    if (warnings.length) {
      setErr(`INPUT:${warnings.join(' ')}`);
      return;
    }
    setErr('');
    goToStep(currentStep + 1);
  }, [currentStep, getStepWarnings, goToStep]);

  const goPrev = useCallback(() => {
    goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  const applyPriceTemplate = useCallback((template: PriceTemplate) => {
    setPriceTemplate(template);
    setPriceRules(defaultRules(template));
    setResult(null);
    setDeployStatus('idle');
    setProfileMessage(t(
      `${uiTemplateLabel(template, 'zh')} 已应用，可继续逐条修改能量流向价格。`,
      `${uiTemplateLabel(template, 'en')} applied. You can continue adjusting each energy-flow price.`,
    ));
  }, [t]);

  const updatePriceRule = useCallback((key: FlowKey, patch: Partial<FlowRule>) => {
    setPriceRules((rules) => ({
      ...rules,
      [key]: { ...rules[key], ...patch },
    }));
    setResult(null);
    setDeployStatus('idle');
  }, []);

  const updatePriceRuleMode = useCallback((key: FlowKey, mode: RuleMode) => {
    setPriceRules((rules) => ({
      ...rules,
      [key]: normalizeRuleForMode(rules[key], mode),
    }));
    setResult(null);
    setDeployStatus('idle');
  }, []);

  const submitOptimization = useCallback(async ({
    buy,
    sell,
    pv,
    load,
    demandLimitOverride,
  }: {
    buy: number[];
    sell: number[];
    pv: number[];
    load: number[];
    demandLimitOverride?: string;
  }) => {
    setErr('');
    setResult(null);

    if (!(buy.length && sell.length && pv.length && load.length)) {
      setErr('INPUT:请先输入 buy/sell/PV/load 四个数组（建议 96 点），或点击“填充示例”。');
      return false;
    }
    if (!(buy.length === sell.length && buy.length === pv.length && buy.length === load.length)) {
      setErr(`INPUT:数组长度不一致：buy=${buy.length}, sell=${sell.length}, pv=${pv.length}, load=${load.length}。必须一致。`);
      return false;
    }

    const exp = exportLimit.trim() === '' ? null : Math.max(0, Number(exportLimit));
    const imp = importLimit.trim() === '' ? null : Math.max(0, Number(importLimit));
    const demandText = demandLimitOverride ?? demandLimit;
    const dem = demandText.trim() === '' ? null : Math.max(0, Number(demandText));
    const demSeries = demandSeriesText.trim() === '' ? null : parseSeries(demandSeriesText);

    if (demSeries && demSeries.length !== buy.length) {
      setErr(`INPUT:分时需量上限数组长度不一致：demandSeries=${demSeries.length}, buy=${buy.length}。请填空或确保长度一致。`);
      return false;
    }

    const payload: MockOptimizerPayload = {
      dtMinutes: Math.max(1, Number(dtMinutes) || 15),
      buyPrice: buy,
      sellPrice: sell,
      pvForecastKW: pv,
      loadForecastKW: load,
      battery: {
        totalCapacityKWh: Math.max(0.0001, Number(capKWh) || 0),
        currentSocPct: Math.min(100, Math.max(0, Number(soc0Pct) || 0)),
        socMinPct: Math.min(100, Math.max(0, Number(socMinPct) || 0)),
        socMaxPct: Math.min(100, Math.max(0, Number(socMaxPct) || 0)),
        maxChargePowerKW: Math.max(0, Number(pChMax) || 0),
        maxDischargePowerKW: Math.max(0, Number(pDisMax) || 0),
        etaRoundTrip: Math.min(1, Math.max(0.000001, Number(etaRoundTrip) || 0.9)),
        endSocTargetPct: Math.min(100, Math.max(0, Number(socEndPct) || 0)),
      },
      exportLimitKW: exp,
      importLimitKW: imp,
      demandLimitKW: dem,
      demandLimitSeriesKW: demSeries,
      demandViolationCostPerKWh: Math.max(0, Number(demandPenalty) || 0),
      cycleCostPerKWh: Math.max(0, Number(cycleCost) || 0),
      curtailPenalty: Math.max(0, Number(curtPenalty) || 0),
    };

    setLoading(true);
    try {
      if (__USE_MOCK_OPTIMIZER__) {
        await new Promise((resolve) => setTimeout(resolve, 180));
        const data = buildMockOptimization(payload);
        setResult(data);
        return true;
      }

      // 推荐使用相对路径：配合 vite proxy，避免 CORS
      const resp = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}\n${txt}`);
      }
      const data = (await resp.json()) as OptimizeResponse;
      setResult(data);
      return true;
    } catch (e: any) {
      setErr(String(e?.message || e));
      return false;
    } finally {
      setLoading(false);
    }
  }, [
    dtMinutes, capKWh, soc0Pct, socMinPct, socMaxPct, pChMax, pDisMax, etaRoundTrip, socEndPct,
    exportLimit, importLimit, demandLimit, demandPenalty, demandSeriesText, cycleCost, curtPenalty,
  ]);

  const run = useCallback(async () => {
    setProfileMessage('');
    await submitOptimization({
      buy: parseSeries(buyText),
      sell: parseSeries(sellText),
      pv: parseSeries(pvText),
      load: parseSeries(loadText),
    });
  }, [buyText, loadText, pvText, sellText, submitOptimization]);

  const syncCloudPrices = useCallback(() => {
    setBuyText(toCsv(cloudAdapter.buyPrice));
    setSellText(toCsv(cloudAdapter.sellPrice));
    setProfileMessage(t(
      `${uiTemplateLabel(priceTemplate, 'zh')} 已同步到底层买价/卖价数组，弃光惩罚保持求解器边界参数中的固定值。`,
      `${uiTemplateLabel(priceTemplate, 'en')} synced to the underlying buy/sell arrays. Curtailment penalty remains fixed in solver limits.`,
    ));
  }, [cloudAdapter.buyPrice, cloudAdapter.sellPrice, priceTemplate, t]);

  const runCloudStrategy = useCallback(async () => {
    setDeployStatus('idle');
    const allWarnings = wizardSteps.flatMap((step) => getStepWarnings(step.id));
    if (allWarnings.length) {
      setErr(`INPUT:${[...new Set(allWarnings)].join(' ')}`);
      return;
    }

    const pv = parseSeries(pvText);
    const load = parseSeries(loadText);
    if (!pv.length || !load.length) {
      setErr('INPUT:请先生成或输入 PV/负荷预测，再运行云平台策略。');
      return;
    }
    if (pv.length !== load.length) {
      setErr(`INPUT:PV/负荷长度不一致：pv=${pv.length}, load=${load.length}。`);
      return;
    }

    const adapter = buildOptimizerPriceAdapter({
      template: priceTemplate,
      rules: priceRules,
      dtMinutes,
      points: pv.length,
      negativePolicy,
      objective: cloudObjective,
    });

    setBuyText(toCsv(adapter.buyPrice));
    setSellText(toCsv(adapter.sellPrice));
    setProfileMessage(t(
      `${uiStrategyLabel(cloudStrategy, 'zh')} / ${uiTemplateLabel(priceTemplate, 'zh')} / ${uiMarketSourceLabel(marketPriceSource, 'zh')} / ${uiObjectiveLabel(cloudObjective, 'zh')} 已生成并调用优化器。`,
      `${uiStrategyLabel(cloudStrategy, 'en')} / ${uiTemplateLabel(priceTemplate, 'en')} / ${uiMarketSourceLabel(marketPriceSource, 'en')} / ${uiObjectiveLabel(cloudObjective, 'en')} generated and sent to the optimizer.`,
    ));
    setStep6View('summary');
    replaceSearchParams({ module: 'ai-dispatch', step: null, view: 'summary' });

    const ok = await submitOptimization({
      buy: adapter.buyPrice,
      sell: adapter.sellPrice,
      pv,
      load,
    });
    if (!ok) {
      setStep6View('price');
      replaceSearchParams({ module: 'ai-dispatch', step: null, view: 'price' });
    }
  }, [
    cloudObjective, cloudStrategy, dtMinutes, loadText, marketPriceSource,
    getStepWarnings, negativePolicy, priceRules, priceTemplate, pvText, submitOptimization,
    t,
  ]);

  return (
    <div className="ems-theme min-h-screen bg-slate-50 text-slate-900" data-testid="ai-dispatch-workbench">
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur">
        <div className="w-full px-4 sm:px-6 2xl:px-8 py-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black">E</div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-black tracking-tight leading-tight">{t('生态瓦特 AI 调度', 'EcoWatt AI Dispatch')}</div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.22em] leading-snug font-black text-slate-400 break-words">{t('2号站 · 云端调度 · 价格模型', 'Station #2 · Cloud Dispatch · Price Model')}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              data-testid="language-toggle"
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              onClick={toggleLocale}
              type="button"
            >
              {locale === 'zh' ? 'EN' : '中文'}
            </button>
            {__USE_MOCK_OPTIMIZER__ && (
              <div data-testid="mock-mode-badge" className="px-3 py-2 text-xs font-black rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
                {t('模拟数据', 'Mock Data')}
              </div>
            )}
            <button
              className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              onClick={fillExample}
              type="button"
            >
              {t('生成随机（96点）', 'Generate Sample (96 pts)')}
            </button>
            <button
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => selectStep6View('prediction')}
              type="button"
            >
              {t('拉取最新', 'Fetch Latest')}
            </button>
            <div className="flex flex-wrap items-center gap-2 px-0 sm:px-2 min-w-0">
              <div className="text-[11px] font-black text-slate-500">{t('随机强度', 'Randomness')}</div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(randIntensity * 100)}
                onChange={(e) => setRandIntensity(Number(e.target.value) / 100)}
                className="w-28 accent-indigo-600"
              />
              <div className="text-[11px] font-mono text-slate-500 w-10 text-right">{Math.round(randIntensity * 100)}%</div>
              <div className="hidden md:block text-[11px] font-mono text-slate-500">{lastSeed ? `seed=${lastSeed}` : ''}</div>
              <div className="flex items-center gap-1">
                <div className="text-[11px] font-black text-slate-500">{t('种子', 'Seed')}</div>
                <input
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                  placeholder={t('可空', 'Optional')}
                  className="w-20 sm:w-24 px-2 py-1 text-[11px] rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <button
              className="px-3 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              onClick={() => selectStep6View('price')}
              disabled={loading}
              type="button"
            >
              {t('价格模型', 'Price Model')}
            </button>
            <button
              data-testid="header-generate-cloud-dispatch"
              className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              onClick={runCloudStrategy}
              disabled={loading}
              type="button"
            >
              {loading ? t('生成中…', 'Generating…') : t('生成云端调度', 'Generate Cloud Dispatch')}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full p-4 sm:p-6 2xl:p-8 space-y-4">
        {err && (() => {
          const isInput = err.startsWith('INPUT:');
          const msg = isInput ? err.replace(/^INPUT:/, '') : err;
          return (
            <div className="border border-rose-200 bg-rose-50 text-rose-700 rounded-2xl px-4 py-3 text-sm">
              <b className="font-black">错误：</b> {msg}
              {!isInput && (
                <div className="text-xs text-rose-600 mt-1">
                  提示：请确认<strong>后端</strong>已启动（FastAPI/uvicorn 8000端口），且 Vite 代理已配置（/api → 127.0.0.1:8000）。
                </div>
              )}
            </div>
          );
        })()}

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 p-4 max-h-[460px] overflow-auto lg:max-h-none">
              <div className="text-[11px] uppercase tracking-[0.22em] font-black text-emerald-600">{t('生态瓦特', 'EcoWatt')}</div>
              <h1 className="text-lg font-black mt-1">{t('AI 调度', 'AI Dispatch')}</h1>
              <div className="mt-4 space-y-4">
                {emsNavGroups.map((group) => (
                  <div key={group.title}>
                    <div className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-500 mb-2">{emsGroupLabels[group.title]?.[locale] ?? group.title}</div>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const active = item === 'AI Dispatch';
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => active ? selectStep6View('summary') : undefined}
                            className={[
                              'w-full text-left rounded-xl border px-3 py-2.5 transition text-xs font-bold',
                              active
                                ? 'bg-white border-emerald-300 shadow-sm text-emerald-700'
                                : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100',
                            ].join(' ')}
                          >
                            {emsItemLabels[item]?.[locale] ?? item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-black text-slate-500">{t('2号站', 'STATION #2')}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <StatusPill label={t('电站', 'Station')} value={t('慕尼黑', 'Munich')} />
                  <StatusPill label={t('边缘', 'Edge')} value={t('已启用', 'Enabled')} />
                  <StatusPill label={t('云端', 'Cloud')} value={emsDispatchDraft ? t('草稿就绪', 'Draft Ready') : t('待生成', 'Pending')} />
                  <StatusPill label={t('下发', 'Deploy')} value={deployStatusLabel} />
                  <StatusPill label={t('市场来源', 'Market')} value={uiMarketSourceLabel(marketPriceSource, locale)} />
                  <StatusPill label={t('价格模型', 'Price Model')} value={uiTemplateLabel(priceTemplate, locale)} />
                </div>
              </div>
            </aside>

            <div className="p-4 sm:p-6 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-[11px] font-black text-slate-400">{t('价格与交易 / AI 调度', 'PRICE & TRADING / AI DISPATCH')}</div>
                  <h2 className="text-xl font-black mt-1">{t('2号站 — AI 调度', 'Station #2 — AI Dispatch')}</h2>
                  <p className="text-sm text-slate-500 mt-1">{t('用动态电价优化器替换原云端调度策略生成，保留原下发链路。', 'Use the dynamic price optimizer to replace cloud dispatch strategy generation while keeping the existing deploy flow.')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill label={t('当前边缘策略', 'Current Edge')} value={t('收益最大化', 'Profit Maximization')} />
                  <StatusPill label={t('调度模式', 'Dispatch Mode')} value={t('自动', 'Auto')} />
                  <StatusPill label={t('云端草稿', 'Cloud Draft')} value={loading ? t('生成中', 'Generating') : emsDispatchDraft ? t('就绪', 'Ready') : t('待生成', 'Pending')} />
                  <StatusPill label={t('下发', 'Deploy')} value={deployStatusLabel} />
                </div>
              </div>

              {getStepWarnings(6).length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                  {getStepWarnings(6).join(' ')}
                </div>
              )}

              {currentStep === 1 && (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <SelectField label="负荷功率数据源" value={loadSource} onChange={setLoadSource} options={dataSourceOptions.load} />
                    <SelectField label="光伏功率数据源" value={pvSource} onChange={setPvSource} options={dataSourceOptions.pv} />
                    <SelectField label="储能功率数据源" value={bessSource} onChange={setBessSource} options={dataSourceOptions.bess} />
                    <SelectField label="并网点功率数据源" value={gridSource} onChange={setGridSource} options={dataSourceOptions.grid} />
                    <SelectField label="储能SOC数据源" value={socSource} onChange={setSocSource} options={dataSourceOptions.soc} />
                    <SelectField label="数据刷新周期" value={dataInterval} onChange={setDataInterval} options={['1秒', '5秒', '15秒', '1分钟']} />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700">功率方向定义</div>
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            ['负荷', '用电为正', '用于预测负荷和替代购电收益'],
                            ['光伏', '发电为正', '用于消纳、上网和弃光计算'],
                            ['储能', '放电为正', '充电为负，放电为正'],
                            ['电网', '购电为正', '售电或外送为负'],
                          ].map((row) => (
                            <tr key={row[0]} className="odd:bg-white even:bg-slate-50">
                              <td className="px-3 py-2 border-b border-slate-100 font-black">{row[0]}</td>
                              <td className="px-3 py-2 border-b border-slate-100">{row[1]}</td>
                              <td className="px-3 py-2 border-b border-slate-100 text-slate-500">{row[2]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ControlGroup title="价格模板">
                      <div className="grid grid-cols-3 gap-2">
                        {(['market', 'tou', 'ppa'] as PriceTemplate[]).map((template) => (
                          <SegmentButton key={template} active={priceTemplate === template} label={uiTemplateLabel(template, locale)} onClick={() => applyPriceTemplate(template)} />
                        ))}
                      </div>
                    </ControlGroup>
                    <ControlGroup title="市场电价来源">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-2">
                        <select
                          data-testid="market-price-source"
                          value={marketPriceSource}
                          onChange={(event) => {
                            setMarketPriceSource(event.target.value);
                            setResult(null);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {marketPriceSourceOptions.map((source) => (
                            <option key={source} value={source}>{uiMarketSourceLabel(source, locale)}</option>
                          ))}
                        </select>
                        <select
                          data-testid="market-granularity"
                          value={marketGranularity}
                          onChange={(event) => {
                            setMarketGranularity(event.target.value);
                            setResult(null);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {['5分钟', '15分钟', '30分钟', '1小时'].map((item) => (
                            <option key={item} value={item}>{uiGranularityLabel(item, locale)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500">
                        计价方式选择“市场价折扣”或“市场价+价差”的流向，将使用这里配置的市场价格源。
                      </div>
                    </ControlGroup>
                    <ControlGroup title="价格异常处理">
                      <select
                        value={negativePolicy}
                        onChange={(event) => {
                          setNegativePolicy(event.target.value as NegativePolicy);
                          setResult(null);
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {(['allow', 'clamp_zero', 'approval'] as NegativePolicy[]).map((policy) => (
                          <option key={policy} value={policy}>{uiNegativePolicyLabel(policy, locale)}</option>
                        ))}
                      </select>
                    </ControlGroup>
                  </div>

                  <PriceRuleMatrix
                    rules={priceRules}
                    onRuleChange={updatePriceRule}
                    onModeChange={updatePriceRuleMode}
                    locale={locale}
                  />

                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-4">
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700">24小时流向价格预览</div>
                      <div className="max-h-[340px] overflow-auto">
                        <table className="w-full text-[11px]">
                          <thead className="sticky top-0 bg-white text-slate-500">
                            <tr>
                              <th className="text-left px-3 py-2 border-b border-slate-200">时间</th>
                              <th className="text-right px-3 py-2 border-b border-slate-200">市场</th>
                              <th className="text-right px-3 py-2 border-b border-slate-200">买价</th>
                              <th className="text-right px-3 py-2 border-b border-slate-200">充电</th>
                              <th className="text-right px-3 py-2 border-b border-slate-200">PV上网</th>
                              <th className="text-right px-3 py-2 border-b border-slate-200">放电</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cloudPreviewRows.map((row) => (
                              <tr key={row.hour} className="odd:bg-white even:bg-slate-50">
                                <td className="text-left px-3 py-2 border-b border-slate-100">{row.hour}</td>
                                <td className="text-right px-3 py-2 border-b border-slate-100">{fmt(row.market)}</td>
                                <td className="text-right px-3 py-2 border-b border-slate-100">{fmt(row.gridToLoad)}</td>
                                <td className="text-right px-3 py-2 border-b border-slate-100">{fmt(row.gridToBess)}</td>
                                <td className="text-right px-3 py-2 border-b border-slate-100">{fmt(row.pvToGrid)}</td>
                                <td className="text-right px-3 py-2 border-b border-slate-100">{fmt(Math.max(row.bessToLoad, row.bessToGrid))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800 space-y-1">
                        {cloudAdapter.warnings.map((warning) => <div key={warning}>{warning}</div>)}
                      </div>
                      <button className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800" onClick={syncCloudPrices} type="button">
                        同步到模型输入
                      </button>
                      <details className="rounded-xl border border-slate-200 bg-slate-50">
                        <summary className="cursor-pointer px-3 py-2 text-xs font-black text-slate-700">导出价格配置 JSON</summary>
                        <pre className="max-h-[260px] overflow-auto px-3 pb-3 text-[11px] text-slate-600 whitespace-pre-wrap">{cloudConfigJson}</pre>
                      </details>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <Field label="储能总容量 (kWh)" value={capKWh} onChange={setCapKWh} />
                    <Field label="当前SOC (%)" value={soc0Pct} onChange={setSoc0Pct} />
                    <Field label="SOC最小 (%)" value={socMinPct} onChange={setSocMinPct} />
                    <Field label="SOC最大 (%)" value={socMaxPct} onChange={setSocMaxPct} />
                    <Field label="最大充电功率 (kW)" value={pChMax} onChange={setPChMax} />
                    <Field label="最大放电功率 (kW)" value={pDisMax} onChange={setPDisMax} />
                    <Field label="往返效率 eta" value={etaRoundTrip} onChange={setEtaRoundTrip} step="0.01" />
                    <Field label="期末SOC下限 (%)" value={socEndPct} onChange={setSocEndPct} />
                    <Field label="优化步长 (分钟)" value={dtMinutes} onChange={setDtMinutes} />
                    <TextField label="外送上限 (kW，空=不限制)" value={exportLimit} onChange={setExportLimit} placeholder="例如 300" />
                    <TextField label="购电上限 (kW，空=不限制)" value={importLimit} onChange={setImportLimit} placeholder="例如 800" />
                    <TextField label="需量软上限 (kW，空=不启用)" value={demandLimit} onChange={setDemandLimit} placeholder="例如 700" />
                    <Field label="超限惩罚 (元/kWh)" value={demandPenalty} onChange={setDemandPenalty} step="10" />
                    <Field label="循环惩罚 (元/kWh)" value={cycleCost} onChange={setCycleCost} step="0.01" />
                    <Field label="弃光惩罚 (元/kWh)" value={curtPenalty} onChange={setCurtPenalty} step="0.01" />
                  </div>
                  <details className="rounded-xl border border-slate-200 bg-slate-50">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-black text-slate-700">分时需量上限</summary>
                    <div className="p-3">
                      <Area label="demandLimitSeriesKW，可选，点数需等于价格数组" value={demandSeriesText} onChange={setDemandSeriesText} />
                    </div>
                  </details>
                </div>
              )}

              {currentStep === 4 && (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(['storage_profit', 'green', 'station_profit'] as CloudObjective[]).map((objective) => (
                      <button
                        key={objective}
                        type="button"
                        onClick={() => setCloudObjective(objective)}
                        className={[
                          'rounded-xl border px-4 py-4 text-left transition',
                          cloudObjective === objective ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <div className="text-sm font-black text-slate-900">{uiObjectiveLabel(objective, locale)}</div>
                        <div className="text-xs text-slate-500 mt-2">
                          {{
                            storage_profit: '围绕储能充放电价差，优先提升储能套利收益。',
                            green: '提高光伏自用和储能消纳，减少弃光。',
                            station_profit: '从全站购售电、光伏和储能协同角度优化净收益。',
                          }[objective]}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      className={[
                        'rounded-xl border px-4 py-4 text-left',
                        cloudStrategy === 'day_ahead' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white',
                      ].join(' ')}
                      type="button"
                      onClick={() => setCloudStrategy('day_ahead')}
                    >
                      <div className="text-sm font-black">日前策略</div>
                      <div className="text-xs text-slate-500 mt-2">固定时间生成未来一天策略。</div>
                    </button>
                    <button
                      className={[
                        'rounded-xl border px-4 py-4 text-left',
                        cloudStrategy === 'rolling' ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white',
                      ].join(' ')}
                      type="button"
                      onClick={() => setCloudStrategy('rolling')}
                    >
                      <div className="text-sm font-black">滚动优化</div>
                      <div className="text-xs text-slate-500 mt-2">周期重算未来窗口策略。</div>
                    </button>
                  </div>
                  {cloudStrategy === 'day_ahead' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <TextField label="生成时间" value={dayGenTime} onChange={setDayGenTime} placeholder="00:05" />
                      <SelectField label="策略周期" value={dayHorizon} onChange={setDayHorizon} options={['未来24小时', '未来48小时']} />
                      <SelectField label="下发方式" value={dayDispatch} onChange={setDayDispatch} options={['定时自动下发', '人工确认后下发', '只生成不下发']} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <SelectField label="优化周期" value={rollingInterval} onChange={setRollingInterval} options={['5分钟', '15分钟', '30分钟', '1小时']} />
                      <SelectField label="滚动窗口" value={rollingHorizon} onChange={setRollingHorizon} options={['未来6小时', '未来12小时', '未来24小时', '未来48小时']} />
                      <SelectField label="下发方式" value={rollingDispatch} onChange={setRollingDispatch} options={['每次重算后自动下发', '偏差超限才下发', '人工确认后下发']} />
                    </div>
                  )}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm font-black">实时修正兜底</div>
                        <div className="text-xs text-slate-500 mt-1">明确触发边界，越界时进入拦截、重算或降额下发。</div>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">interval={dataInterval}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
                      <ToggleLine label="SOC越界" checked={rtSoc} onChange={setRtSoc} />
                      <ToggleLine label="并网限制" checked={rtGrid} onChange={setRtGrid} />
                      <ToggleLine label="设备降额" checked={rtFault} onChange={setRtFault} />
                      <ToggleLine label="价格异常" checked={rtPrice} onChange={setRtPrice} />
                    </div>
                    <div className="mt-4 border-t border-slate-200 pt-4 space-y-4">
                      <div>
                        <div className="text-[11px] font-black text-slate-500">SOC保护边界</div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <TextField label="SOC下限保护 (%)" value={rtSocMinBoundary} onChange={setRtSocMinBoundary} placeholder="例如 15" />
                          <TextField label="SOC上限保护 (%)" value={rtSocMaxBoundary} onChange={setRtSocMaxBoundary} placeholder="例如 95" />
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-black text-slate-500">并网功率边界</div>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <TextField label="实时购电硬上限 (kW)" value={rtGridImportBoundary} onChange={setRtGridImportBoundary} placeholder="例如 800" />
                          <TextField label="实时外送硬上限 (kW)" value={rtGridExportBoundary} onChange={setRtGridExportBoundary} placeholder="例如 300" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-[11px] font-black text-slate-500">设备降额边界</div>
                          <div className="mt-2">
                            <TextField label="可用功率下限 (%额定)" value={rtDeratePowerFloor} onChange={setRtDeratePowerFloor} placeholder="例如 80" />
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-black text-slate-500">价格异常边界</div>
                          <div className="mt-2">
                            <TextField label="相邻时段跳变阈值 (%)" value={rtPriceJumpThreshold} onChange={setRtPriceJumpThreshold} placeholder="例如 30" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 6 && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-black text-slate-900">{t('云调度生成器', 'Cloud Dispatch Generator')}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {emsDispatchDraft ? `${emsDispatchDraft.segments.length} ${t('段', 'segments')} / ${deployStatusLabel}` : t('暂无云端草稿', 'No cloud draft')}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button data-testid="generate-cloud-dispatch" className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60" onClick={runCloudStrategy} disabled={loading} type="button">
                        {loading ? t('生成中…', 'Generating…') : t('生成云端调度', 'Generate Cloud Dispatch')}
                      </button>
                      <button
                        data-testid="deploy-strategy"
                        className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        onClick={requestDeployStrategy}
                        disabled={!emsDispatchDraft || loading || deployStatus === 'deployed'}
                        type="button"
                      >
                        {t('下发策略', 'Deploy Strategy')}
                      </button>
                    </div>
                  </div>

                  {profileMessage && <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{profileMessage}</div>}

                  {deployStatus === 'confirm' && emsDispatchDraft && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800 flex items-center justify-between gap-3 flex-wrap" data-testid="deploy-confirmation">
                      <div>
                        <b className="font-black">{t('下发策略确认：', 'Deploy Strategy Confirmation:')}</b>
                        {t('将下发', 'Deploying')} {emsDispatchDraft.segments.length} {t('个云调度时段，价格模型为', 'cloud dispatch segments with price model')} {uiTemplateLabel(priceTemplate, locale)} / {uiMarketSourceLabel(marketPriceSource, locale)}。
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700" onClick={cancelDeployStrategy} type="button">
                          {t('取消', 'Cancel')}
                        </button>
                        <button data-testid="confirm-deploy-strategy" className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white" onClick={confirmDeployStrategy} type="button">
                          {t('确认下发', 'Confirm Deploy')}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <div className="inline-flex min-w-full sm:min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1" role="tablist" aria-label="策略预览内容切换">
                      {step6Views.map((view) => {
                        const active = step6View === view.id;
                        return (
                          <button
                            key={view.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            data-testid={`step6-tab-${view.id}`}
                            onClick={() => selectStep6View(view.id)}
                            className={[
                              'shrink-0 px-3 py-2 rounded-lg text-xs font-black transition',
                              active ? 'bg-white text-emerald-700 shadow-sm border border-emerald-100' : 'text-slate-600 hover:bg-white',
                            ].join(' ')}
                          >
                            {step6ViewLabels[view.id][locale]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {step6View === 'summary' && (
                    <div className="space-y-4" data-testid="step6-summary-panel">
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                          <div className="px-3 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-black text-slate-900">{t('当前边缘策略', 'Current Edge Strategy')}</h3>
                              <p className="text-xs text-slate-500 mt-1">{t('当前边缘侧正在执行的策略。', 'The strategy currently running on the edge side.')}</p>
                            </div>
                            <StatusPill label={t('状态', 'Status')} value={t('已启用', 'Enabled')} />
                          </div>
                          <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <StatusPill label={t('策略', 'Strategy')} value={t('收益最大化', 'Profit Maximization')} />
                            <StatusPill label={t('模式', 'Mode')} value={t('自动', 'Auto')} />
                            <StatusPill label={t('上次同步', 'Last Sync')} value="14:30:00" />
                          </div>
                          <div className="max-h-[220px] overflow-auto border-t border-slate-200">
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-white text-slate-600">
                                <tr>
                                  <th className="text-left px-3 py-2 border-b border-slate-200">START</th>
                                  <th className="text-left px-3 py-2 border-b border-slate-200">END</th>
                                  <th className="text-left px-3 py-2 border-b border-slate-200">TYPE</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">POWER</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  ['00:00', '06:00', 'Charge', '120 kW'],
                                  ['06:00', '12:00', 'Standby', '0 kW'],
                                  ['12:00', '16:00', 'Discharge', '180 kW'],
                                  ['16:00', '22:00', 'Charge', '160 kW'],
                                ].map((row) => (
                                  <tr key={row.join('-')} className="odd:bg-white even:bg-slate-50">
                                    <td className="px-3 py-2 border-b border-slate-200 font-mono">{row[0]}</td>
                                    <td className="px-3 py-2 border-b border-slate-200 font-mono">{row[1]}</td>
                                    <td className="px-3 py-2 border-b border-slate-200">{row[2]}</td>
                                    <td className="px-3 py-2 border-b border-slate-200 text-right font-mono">{row[3]}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                          <div className="px-3 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-black text-slate-900">{t('云端优化策略', 'Cloud Optimized Strategy')}</h3>
                              <p className="text-xs text-slate-500 mt-1">{t('云端求解后准备替换边缘侧的新策略。', 'The cloud-optimized strategy prepared to replace the edge strategy.')}</p>
                            </div>
                            <StatusPill label={t('状态', 'Status')} value={loading ? t('求解中', 'Solving') : emsDispatchDraft ? t('就绪', 'Ready') : t('待生成', 'Pending')} />
                          </div>
                        {result ? (
                            <>
                              <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                                <KPI k="节省/收益(元)" v={result.summary.saving} />
                                <KPI k="优化后电费(元)" v={result.summary.optimizedCost} />
                                <KPI k="期末SOC(%)" v={result.summary.endSocPct} />
                              </div>
                              {emsDispatchDraft && (
                                <div className="max-h-[220px] overflow-auto border-t border-slate-200">
                                  <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-white text-slate-600">
                                      <tr>
                                        <th className="text-left px-3 py-2 border-b border-slate-200">START</th>
                                        <th className="text-left px-3 py-2 border-b border-slate-200">END</th>
                                        <th className="text-left px-3 py-2 border-b border-slate-200">TYPE</th>
                                        <th className="text-right px-3 py-2 border-b border-slate-200">POWER</th>
                                        <th className="hidden sm:table-cell text-right px-3 py-2 border-b border-slate-200">AVG SOC</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {emsDispatchDraft.segments.slice(0, 6).map((segment) => (
                                        <tr key={`${segment.start}-${segment.end}-${segment.type}`} className="odd:bg-white even:bg-slate-50">
                                          <td className="px-3 py-2 border-b border-slate-200 font-mono">{segment.start}</td>
                                          <td className="px-3 py-2 border-b border-slate-200 font-mono">{segment.end}</td>
                                          <td className="px-3 py-2 border-b border-slate-200">{segment.type}</td>
                                          <td className="px-3 py-2 border-b border-slate-200 text-right font-mono whitespace-nowrap">{fmt(segment.powerKW)} kW</td>
                                          <td className="hidden sm:table-cell px-3 py-2 border-b border-slate-200 text-right font-mono whitespace-nowrap">{segment.avgSocPct === null ? '-' : `${fmt(segment.avgSocPct)}%`}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              <div className="p-3 flex flex-wrap gap-2 border-t border-slate-200">
                                <button className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700" onClick={() => selectStep6View('result')} type="button">
                                  {t('查看完整优化结果', 'View Full Result')}
                                </button>
                                <button className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700" onClick={() => selectStep6View('ems')} type="button">
                                  {t('查看下发表格', 'View Dispatch Table')}
                                </button>
                                <button
                                  className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white disabled:opacity-60"
                                  onClick={requestDeployStrategy}
                                  disabled={!emsDispatchDraft || loading || deployStatus === 'deployed'}
                                  type="button"
                                >
                                  {t('下发策略', 'Deploy Strategy')}
                                </button>
                              </div>
                            </>
                        ) : (
                            <div className="p-4">
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="text-sm font-black text-slate-900">{t('暂无云端策略', 'No Cloud Strategy')}</div>
                                <div className="text-xs text-slate-500 mt-1">{t('生成后在这里直接对比当前边缘策略和云端优化策略。', 'After generation, compare the current edge strategy with the cloud-optimized strategy here.')}</div>
                                <button data-testid="summary-generate-cloud-dispatch" className="mt-3 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white disabled:opacity-60" onClick={runCloudStrategy} disabled={loading} type="button">
                                  {loading ? t('生成中…', 'Generating…') : t('生成云端调度', 'Generate Cloud Dispatch')}
                                </button>
                              </div>
                            </div>
                        )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-black text-slate-500">{t('二级页面', 'Secondary Pages')}</span>
                        <button data-testid="secondary-link-price" className="px-2 py-1 rounded-lg text-slate-700 hover:bg-slate-100 font-bold" onClick={() => selectStep6View('price')} type="button">{step6ViewLabels.price[locale]}</button>
                        <button data-testid="secondary-link-prediction" className="px-2 py-1 rounded-lg text-slate-700 hover:bg-slate-100 font-bold" onClick={() => selectStep6View('prediction')} type="button">{step6ViewLabels.prediction[locale]}</button>
                        <button data-testid="secondary-link-result" className="px-2 py-1 rounded-lg text-slate-700 hover:bg-slate-100 font-bold" onClick={() => selectStep6View('result')} type="button">{step6ViewLabels.result[locale]}</button>
                        <button data-testid="secondary-link-ems" className="px-2 py-1 rounded-lg text-slate-700 hover:bg-slate-100 font-bold" onClick={() => selectStep6View('ems')} type="button">{step6ViewLabels.ems[locale]}</button>
                        <button data-testid="secondary-link-config" className="px-2 py-1 rounded-lg text-slate-700 hover:bg-slate-100 font-bold" onClick={() => selectStep6View('config')} type="button">{step6ViewLabels.config[locale]}</button>
                      </div>
                    </div>
                  )}

                  {step6View === 'price' && (
                    <div className="space-y-4" data-testid="step6-price-panel">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <h3 className="text-sm font-black text-slate-900">{t('嵌入式价格模型配置', 'Embedded Price Model Configuration')}</h3>
                            <p className="text-xs text-slate-500 mt-1">
                              {t('先完成模板、市场来源和负价策略；高级能量流向规则可在下方展开。', 'Configure the template, market source, and negative-price policy first. Advanced flow pricing rules are available below.')}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusPill label={t('模板', 'Template')} value={uiTemplateLabel(priceTemplate, locale)} />
                            <StatusPill label={t('市场', 'Market')} value={uiMarketSourceLabel(marketPriceSource, locale)} />
                            <StatusPill label={t('负价', 'Negative Price')} value={uiNegativePolicyLabel(negativePolicy, locale)} />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-4">
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" data-testid="price-key-config">
                          <div className="px-3 py-3 bg-slate-50 border-b border-slate-200">
                              <h3 className="text-sm font-black text-slate-900">{t('关键配置', 'Key Configuration')}</h3>
                              <p className="text-xs text-slate-500 mt-1">{t('这三项会直接决定云调度使用的买价 / 卖价曲线。', 'These settings directly determine the buyPrice / sellPrice curves used by Cloud Dispatch.')}</p>
                          </div>
                          <div className="p-3 space-y-4">
                            <div>
                              <div className="text-[11px] font-black text-slate-500 mb-2">{t('价格模板', 'Price Template')}</div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {(['market', 'tou', 'ppa'] as PriceTemplate[]).map((template) => (
                                <SegmentButton key={template} active={priceTemplate === template} label={uiTemplateLabel(template, locale)} onClick={() => applyPriceTemplate(template)} />
                              ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3">
                              <label className="block">
                                <span className="text-[11px] font-black text-slate-500">{t('市场电价来源', 'Market Price Source')}</span>
                                <select
                                  data-testid="embedded-market-price-source"
                                  value={marketPriceSource}
                                  onChange={(event) => {
                                    setMarketPriceSource(event.target.value);
                                    setResult(null);
                                  }}
                                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                  {marketPriceSourceOptions.map((source) => (
                                    <option key={source} value={source}>{uiMarketSourceLabel(source, locale)}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className="text-[11px] font-black text-slate-500">{t('价格粒度', 'Granularity')}</span>
                                <select
                                  data-testid="embedded-market-granularity"
                                  value={marketGranularity}
                                  onChange={(event) => {
                                    setMarketGranularity(event.target.value);
                                    setResult(null);
                                  }}
                                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                  {['5分钟', '15分钟', '30分钟', '1小时'].map((item) => (
                                    <option key={item} value={item}>{uiGranularityLabel(item, locale)}</option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <label className="block">
                              <span className="text-[11px] font-black text-slate-500">{t('负价与异常处理', 'Negative Price Handling')}</span>
                              <select
                                data-testid="embedded-negative-policy"
                                value={negativePolicy}
                                onChange={(event) => {
                                  setNegativePolicy(event.target.value as NegativePolicy);
                                  setResult(null);
                                }}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                {(['allow', 'clamp_zero', 'approval'] as NegativePolicy[]).map((policy) => (
                                  <option key={policy} value={policy}>{uiNegativePolicyLabel(policy, locale)}</option>
                                ))}
                              </select>
                              <span className="mt-2 block text-[11px] text-slate-500">
                                {t('该策略会写入 priceModel，并影响市场价为负时的买价/卖价曲线。', 'This policy is written into priceModel and affects buy/sell curves when market prices are negative.')}
                              </span>
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={syncCloudPrices} type="button">
                                {t('同步价格数组', 'Sync Price Arrays')}
                              </button>
                              <button className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60" onClick={runCloudStrategy} disabled={loading} type="button">
                                {loading ? t('计算中…', 'Solving…') : t('应用并生成策略', 'Apply & Generate Strategy')}
                              </button>
                            </div>

                            {cloudAdapter.warnings.length > 0 && (
                              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800 space-y-1">
                                {cloudAdapter.warnings.map((warning) => <div key={warning}>{uiAdapterWarning(warning, locale)}</div>)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" data-testid="price-preview-card">
                          <div className="px-3 py-3 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-black text-slate-900">{t('价格曲线预览', 'Price Curve Preview')}</h3>
                              <p className="text-xs text-slate-500 mt-1">{t('展示优化器真正使用的买价/卖价输入。', 'Shows the buy/sell price inputs actually used by the optimizer.')}</p>
                            </div>
                            <StatusPill label={t('适配器', 'Adapter')} value="buy/sell" />
                          </div>
                          <div className="p-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <StatusPill label={t('买价', 'Buy Price')} value="grid_to_load" />
                            <StatusPill label={t('卖价', 'Sell Price')} value={t('PV/BESS上网', 'PV/BESS export')} />
                            <StatusPill label={t('预览', 'Preview')} value={`${cloudPreviewRows.length}${t('小时', 'h')}`} />
                          </div>
                          <div className="max-h-[360px] overflow-auto border-t border-slate-200">
                              <table className="w-full table-fixed text-[11px]">
                                <thead className="sticky top-0 bg-white text-slate-500">
                                  <tr>
                                    <th className="w-1/4 text-left px-2 py-2 border-b border-slate-200">{t('时间', 'Time')}</th>
                                    <th className="w-1/4 text-right px-2 py-2 border-b border-slate-200">{t('市场', 'Market')}</th>
                                    <th className="w-1/4 text-right px-2 py-2 border-b border-slate-200">{t('买价', 'Buy')}</th>
                                    <th className="w-1/4 text-right px-2 py-2 border-b border-slate-200">{t('卖价', 'Sell')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cloudPreviewRows.map((row) => (
                                    <tr key={row.hour} className="odd:bg-white even:bg-slate-50">
                                      <td className="text-left px-2 py-2 border-b border-slate-100 font-mono">{row.hour}</td>
                                      <td className="text-right px-2 py-2 border-b border-slate-100 font-mono">{fmt(row.market)}</td>
                                      <td className="text-right px-2 py-2 border-b border-slate-100 font-mono">{fmt(row.gridToLoad)}</td>
                                      <td className="text-right px-2 py-2 border-b border-slate-100 font-mono">{fmt(Math.min(row.pvToGrid, row.bessToGrid))}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                          </div>

                          <details className="border-t border-slate-200 bg-slate-50">
                            <summary className="cursor-pointer px-3 py-2 text-xs font-black text-slate-700">{t('查看嵌入到调度草稿的 priceModel', 'View priceModel embedded in dispatch draft')}</summary>
                            <pre className="max-h-[260px] overflow-auto px-3 pb-3 text-[11px] text-slate-600 whitespace-pre-wrap">
                              {JSON.stringify(dispatchPriceModelSnapshot, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>

                      <details className="rounded-xl border border-slate-200 bg-white overflow-hidden" data-testid="advanced-price-rules">
                        <summary className="cursor-pointer px-3 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                          <span>
                            <span className="block text-sm font-black text-slate-900">{t('高级：能量流向计价规则', 'Advanced: Energy Flow Pricing Rules')}</span>
                            <span className="block text-xs text-slate-500 mt-1">{t('需要精细调整充放电、光伏上网和本地消纳价格时再展开。', 'Open only when fine-tuning charge/discharge, PV export, and local-consumption prices.')}</span>
                          </span>
                          <span className="text-[11px] font-black text-slate-500">{FLOW_DEFS.length}{t('条规则', ' rules')}</span>
                        </summary>
                        <div className="p-3">
                          <PriceRuleMatrix
                            rules={priceRules}
                            onRuleChange={updatePriceRule}
                            onModeChange={updatePriceRuleMode}
                            locale={locale}
                          />
                        </div>
                      </details>
                    </div>
                  )}

                  {step6View === 'prediction' && (
                    <div className="space-y-4" data-testid="step6-prediction-panel">
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <div className="px-3 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <h3 className="text-sm font-black text-slate-900">{t('预测边界工作台', 'Forecast & Limits Workbench')}</h3>
                            <p className="text-xs text-slate-500 mt-1">{t('先确认预测点位，再检查储能与并网边界，曲线和明细放在下方。', 'Confirm forecast points first, then check storage and grid limits. Curves and details are below.')}</p>
                          </div>
                          <div className="text-xs font-mono text-slate-500">{predictionSummary.points} {t('点', 'pts')} / {dtMinutes}{t('分钟', 'min')}</div>
                        </div>
                        <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2" data-testid="prediction-boundary-summary">
                          <StatusPill label={t('预测点数', 'Forecast Points')} value={String(predictionSummary.points)} />
                          <StatusPill label={t('SOC范围', 'SOC Range')} value={`${socMinPct}% - ${socMaxPct}%`} />
                          <StatusPill label={t('储能功率', 'BESS Power')} value={`${pChMax}/${pDisMax} kW`} />
                          <StatusPill label={t('并网边界', 'Grid Limits')} value={`${importLimit || '∞'} / ${exportLimit || '∞'} kW`} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
                        <div className="space-y-4 min-w-0">
                          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" data-testid="prediction-source-card">
                            <div className="px-3 py-3 bg-slate-50 border-b border-slate-200">
                              <h3 className="text-sm font-black text-slate-900">{t('预测数据来源', 'Forecast Data Sources')}</h3>
                              <p className="text-xs text-slate-500 mt-1">{t('用户先确认负荷、光伏和 SOC 点位是否接入正确。', 'First confirm the load, PV, and SOC points are mapped correctly.')}</p>
                            </div>
                            <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                              <SelectField label={t('负荷预测点位', 'Load Forecast Point')} value={loadSource} onChange={setLoadSource} options={dataSourceOptions.load} />
                              <SelectField label={t('光伏预测点位', 'PV Forecast Point')} value={pvSource} onChange={setPvSource} options={dataSourceOptions.pv} />
                              <SelectField label={t('SOC点位', 'SOC Point')} value={socSource} onChange={setSocSource} options={dataSourceOptions.soc} />
                            </div>
                          </div>

                          {predictionPreviewRows.length > 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" data-testid="prediction-chart-card">
                              <div className="px-3 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                  <h3 className="text-sm font-black text-slate-900">{t('预测曲线', 'Forecast Curves')}</h3>
                                  <p className="text-xs text-slate-500 mt-1">{t('用于判断光伏、负荷趋势是否适合进入优化器。', 'Use this to judge whether PV and load trends are suitable for optimization.')}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <StatusPill label={t('PV峰值', 'PV Peak')} value={`${fmt(predictionSummary.pvPeakKW)} kW`} />
                                  <StatusPill label={t('负荷峰值', 'Load Peak')} value={`${fmt(predictionSummary.loadPeakKW)} kW`} />
                                </div>
                              </div>
                              <div className="p-3 min-w-0">
                                <PredictionChart data={predictionData} labels={activeChartLabels} />
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                              {t('暂无预测数据。请先生成预测样例或输入 PV/负荷预测曲线。', 'No forecast data yet. Generate sample data or enter PV/load forecast curves first.')}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4 min-w-0">
                          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" data-testid="prediction-boundary-card">
                            <div className="px-3 py-3 bg-slate-50 border-b border-slate-200">
                              <h3 className="text-sm font-black text-slate-900">{t('边界参数', 'Boundary Parameters')}</h3>
                              <p className="text-xs text-slate-500 mt-1">{t('这些限制会直接约束云端策略的可执行性。', 'These limits directly constrain whether the cloud strategy is executable.')}</p>
                            </div>
                            <div className="p-3 space-y-4">
                              <div>
                                <div className="text-[11px] font-black text-slate-500 mb-2">{t('SOC 与容量', 'SOC & Capacity')}</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                                  <Field label={t('当前SOC (%)', 'Current SOC (%)')} value={soc0Pct} onChange={setSoc0Pct} />
                                  <Field label={t('SOC最小 (%)', 'SOC Min (%)')} value={socMinPct} onChange={setSocMinPct} />
                                  <Field label={t('SOC最大 (%)', 'SOC Max (%)')} value={socMaxPct} onChange={setSocMaxPct} />
                                  <Field label={t('储能容量 (kWh)', 'BESS Capacity (kWh)')} value={capKWh} onChange={setCapKWh} />
                                </div>
                              </div>

                              <div>
                                <div className="text-[11px] font-black text-slate-500 mb-2">{t('功率与并网限制', 'Power & Grid Limits')}</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                                  <Field label={t('最大充电功率 (kW)', 'Max Charge Power (kW)')} value={pChMax} onChange={setPChMax} />
                                  <Field label={t('最大放电功率 (kW)', 'Max Discharge Power (kW)')} value={pDisMax} onChange={setPDisMax} />
                                  <TextField label={t('购电上限 (kW，空=不限制)', 'Import Limit (kW, blank = unlimited)')} value={importLimit} onChange={setImportLimit} placeholder={t('例如 800', 'e.g. 800')} />
                                  <TextField label={t('外送上限 (kW，空=不限制)', 'Export Limit (kW, blank = unlimited)')} value={exportLimit} onChange={setExportLimit} placeholder={t('例如 300', 'e.g. 300')} />
                                  <TextField label={t('需量软上限 (kW，空=不启用)', 'Demand Soft Limit (kW, blank = disabled)')} value={demandLimit} onChange={setDemandLimit} placeholder={t('例如 700', 'e.g. 700')} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {predictionPreviewRows.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-white p-3 grid grid-cols-2 gap-2" data-testid="prediction-quality-card">
                              <StatusPill label={t('净负荷峰值', 'Net Load Peak')} value={`${fmt(predictionSummary.netLoadPeakKW)} kW`} />
                              <StatusPill label={t('PV电量', 'PV Energy')} value={`${fmt(predictionSummary.pvEnergyKWh)} kWh`} />
                              <StatusPill label={t('负荷电量', 'Load Energy')} value={`${fmt(predictionSummary.loadEnergyKWh)} kWh`} />
                              <StatusPill label={t('粒度', 'Granularity')} value={`${dtMinutes}${t('分钟', 'min')}`} />
                            </div>
                          )}
                        </div>
                      </div>

                      {predictionPreviewRows.length > 0 && (
                        <details className="rounded-xl border border-slate-200 bg-white overflow-hidden" data-testid="prediction-detail-table">
                          <summary className="cursor-pointer px-3 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                            <span>
                              <span className="block text-sm font-black text-slate-900">{t('预测明细表', 'Forecast Detail Table')}</span>
                              <span className="block text-xs text-slate-500 mt-1">{t('需要核查逐点数值时再展开。', 'Open when you need to inspect point-by-point values.')}</span>
                            </span>
                            <span className="text-[11px] font-black text-slate-500">{predictionPreviewRows.length} {t('点', 'pts')}</span>
                          </summary>
                          <div className="max-h-[280px] overflow-auto">
                            <table className="w-full min-w-[640px] text-xs">
                              <thead className="sticky top-0 bg-white">
                                <tr className="text-slate-600">
                                  <th className="text-left px-3 py-2 border-b border-slate-200">{t('时间', 'Time')}</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">{t('PV预测(kW)', 'PV Forecast (kW)')}</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">{t('负荷预测(kW)', 'Load Forecast (kW)')}</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">{t('净负荷(kW)', 'Net Load (kW)')}</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">{t('买价', 'Buy')}</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">{t('卖价', 'Sell')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {predictionPreviewRows.map((row, idx) => (
                                  <tr key={`${row.time}-${idx}`} className={idx % 2 ? 'bg-slate-50' : 'bg-white'}>
                                    <td className="text-left px-3 py-2 border-b border-slate-200">{row.time}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(row.pvForecast)}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(row.loadForecast)}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(row.netLoadKW)}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(row.buyPrice)}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(row.sellPrice)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      )}
                    </div>
                  )}

                  {step6View === 'result' && (
                    <div className="space-y-4" data-testid="step6-result-panel">
                      {result ? (
                        <>
                          <div className="flex flex-wrap gap-2">
                            <KPI k="无储能基线电费(元)" v={result.summary.baselineCost} />
                            <KPI k="优化后电费(元)" v={result.summary.optimizedCost} />
                            <KPI k="节省/收益(元)" v={result.summary.saving} />
                            <KPI k="期末SOC(%)" v={result.summary.endSocPct} />
                            <KPI k="吞吐量(kWh)" v={result.summary.totalBatteryThroughputKWh} />
                            <KPI k="弃光(kWh)" v={result.summary.totalPvCurtKWh} />
                          </div>
                          <EnergyChart data={simData} labels={activeChartLabels} />
                          <div className="max-h-[360px] overflow-auto rounded-xl border border-slate-200">
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-white">
                                <tr className="text-slate-600">
                                  <th className="text-left px-3 py-2 border-b border-slate-200">时间</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">PV(kW)</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">负荷(kW)</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">买价</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">卖价</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">电池功率(kW)</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">SOC(%)</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">购电(kW)</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">外送(kW)</th>
                                  <th className="text-right px-3 py-2 border-b border-slate-200">弃光(kW)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {result.steps.map((r, idx) => (
                                  <tr key={idx} className={idx % 2 ? 'bg-slate-50' : 'bg-white'}>
                                    <td className="text-left px-3 py-2 border-b border-slate-200">{r.time}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.pvKW)}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.loadKW)}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.buyPrice)}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.sellPrice)}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.batteryPowerKW)}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.socPct)}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.gridImportKW)}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.gridExportKW)}</td>
                                    <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.pvCurtKW)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          当前还没有优化结果。点击“生成并运行策略”后显示策略曲线、收益指标和执行表格。
                        </div>
                      )}
                    </div>
                  )}

                  {step6View === 'ems' && (
                    <div className="space-y-4" data-testid="step6-ems-panel">
                      {emsDispatchDraft ? (
                        <>
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <h3 className="text-sm font-black text-slate-900">原 EMS Cloud Dispatch 策略草稿</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                  第一阶段替换调度输出，第二阶段随策略草稿嵌入价格模型配置，保留原系统 Deploy Strategy 下发链路。
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <StatusPill label="Station" value={emsDispatchDraft.stationId} />
                                <StatusPill label="Source" value="dynamic-price" />
                                <StatusPill label="Segments" value={String(emsDispatchDraft.segments.length)} />
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                              <StatusPill label="电站" value={emsDispatchDraft.stationName} />
                              <StatusPill label="策略日期" value={emsDispatchDraft.strategyDate} />
                              <StatusPill label="市场来源" value={emsDispatchDraft.marketSource.replace('电力现货-', '')} />
                              <StatusPill label="粒度" value={emsDispatchDraft.granularity} />
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <h3 className="text-sm font-black text-slate-900">Embedded Price Model</h3>
                                <p className="text-xs text-slate-500 mt-1">
                                  第二期嵌入配置：价格模板、市场来源、负价策略和能量流向规则会随 Cloud Dispatch 一起传给原 EMS。
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <StatusPill label={t('模板', 'Template')} value={uiTemplateLabel(priceTemplate, locale)} />
                                <StatusPill label={t('规则', 'Rules')} value={`${FLOW_DEFS.length}${t('条', '')}`} />
                                <StatusPill label="Phase" value="2 embedded" />
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                              <StatusPill label={t('市场来源', 'Market Source')} value={uiMarketSourceLabel(marketPriceSource, locale)} />
                              <StatusPill label={t('价格粒度', 'Granularity')} value={uiGranularityLabel(marketGranularity, locale)} />
                              <StatusPill label={t('负价策略', 'Negative Price Policy')} value={uiNegativePolicyLabel(negativePolicy, locale)} />
                              <StatusPill label={t('适配器', 'Adapter')} value={t('buy/sell曲线', 'buy/sell curves')} />
                            </div>
                            {emsDispatchDraft.priceModel && (
                              <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50">
                                <summary className="cursor-pointer px-3 py-2 text-xs font-black text-slate-700">查看随策略下发的 priceModel JSON</summary>
                                <pre className="max-h-[240px] overflow-auto px-3 pb-3 text-[11px] text-slate-600 whitespace-pre-wrap">
                                  {JSON.stringify(emsDispatchDraft.priceModel, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700">
                              Cloud Dispatch 表格兼容输出
                            </div>
                            <div className="max-h-[360px] overflow-auto">
                              <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-white">
                                  <tr className="text-slate-600">
                                    <th className="text-left px-3 py-2 border-b border-slate-200">START</th>
                                    <th className="text-left px-3 py-2 border-b border-slate-200">END</th>
                                    <th className="text-left px-3 py-2 border-b border-slate-200">TYPE</th>
                                    <th className="text-right px-3 py-2 border-b border-slate-200">POWER</th>
                                    <th className="text-right px-3 py-2 border-b border-slate-200">AVG SOC</th>
                                    <th className="text-right px-3 py-2 border-b border-slate-200">POINTS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {emsDispatchDraft.segments.map((segment, idx) => {
                                    const tone = segment.type === 'Charge'
                                      ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                                      : segment.type === 'Discharge'
                                        ? 'text-blue-700 bg-blue-50 border-blue-100'
                                        : 'text-slate-600 bg-slate-50 border-slate-200';
                                    return (
                                      <tr key={`${segment.start}-${segment.end}-${idx}`} className={idx % 2 ? 'bg-slate-50' : 'bg-white'}>
                                        <td className="text-left px-3 py-2 border-b border-slate-200 font-mono">{segment.start}</td>
                                        <td className="text-left px-3 py-2 border-b border-slate-200 font-mono">{segment.end}</td>
                                        <td className="text-left px-3 py-2 border-b border-slate-200">
                                          <span className={`inline-flex px-2 py-1 rounded-lg border text-[11px] font-black ${tone}`}>{segment.type}</span>
                                        </td>
                                        <td className="text-right px-3 py-2 border-b border-slate-200 font-mono">{segment.powerKW} kW</td>
                                        <td className="text-right px-3 py-2 border-b border-slate-200">{segment.avgSocPct === null ? '-' : `${fmt(segment.avgSocPct)}%`}</td>
                                        <td className="text-right px-3 py-2 border-b border-slate-200">{segment.points}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <details className="rounded-xl border border-slate-200 bg-slate-50">
                            <summary className="cursor-pointer px-3 py-2 text-xs font-black text-slate-700">查看给原 EMS 的策略 JSON</summary>
                            <pre className="max-h-[320px] overflow-auto px-3 pb-3 text-[11px] text-slate-600 whitespace-pre-wrap">
                              {JSON.stringify(emsDispatchDraft, null, 2)}
                            </pre>
                          </details>
                        </>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                          当前还没有 EMS 调度草稿。点击“生成并运行策略”后，系统会把优化曲线压缩为原 EMS 的 Cloud Dispatch 时段表。
                        </div>
                      )}
                    </div>
                  )}

                  {step6View === 'config' && (
                    <div className="space-y-4" data-testid="step6-config-panel">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <button className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={() => setShowRawInputs((value) => !value)} type="button">
                          {showRawInputs ? '收起底层数组' : '查看底层数组'}
                        </button>
                        {showRawInputs && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Area label="买电价 buyPrice" value={buyText} onChange={setBuyText} />
                            <Area label="卖电价 sellPrice" value={sellText} onChange={setSellText} />
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-200 text-xs font-black text-slate-700">完整配置 JSON</div>
                        <pre className="max-h-[360px] overflow-auto px-3 py-3 text-[11px] text-slate-600 whitespace-pre-wrap">{cloudConfigJson}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap gap-2">
                  <StatusPill label={t('云端草稿', 'Cloud Draft')} value={emsDispatchDraft ? `${emsDispatchDraft.segments.length} ${t('时段', 'Segments')}` : t('待生成', 'Pending')} />
                  <StatusPill label={t('下发状态', 'Deploy Status')} value={deployStatusLabel} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    onClick={() => selectStep6View('price')}
                    type="button"
                  >
                    {t('配置价格模型', 'Configure Price Model')}
                  </button>
                  <button className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60" onClick={runCloudStrategy} disabled={loading} type="button">
                    {loading ? t('生成中…', 'Generating…') : t('生成云端调度', 'Generate Cloud Dispatch')}
                  </button>
                  <button
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    onClick={requestDeployStrategy}
                    disabled={!emsDispatchDraft || deployStatus === 'deployed'}
                    type="button"
                  >
                    {t('下发策略', 'Deploy Strategy')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {false && (
          <>

        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] font-black text-emerald-600">Cloud EMS</div>
              <h2 className="text-base font-black mt-1">云平台动态电价策略配置</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill label="价格模型" value={uiTemplateLabel(priceTemplate, locale)} />
              <StatusPill label="优化目标" value={uiObjectiveLabel(cloudObjective, locale)} />
              <StatusPill label="策略" value={uiStrategyLabel(cloudStrategy, locale)} />
              <StatusPill label="实时修正" value={t('开启', 'On')} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4 mt-5">
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ControlGroup title="价格模板">
                  <div className="grid grid-cols-3 gap-2">
                    {(['market', 'tou', 'ppa'] as PriceTemplate[]).map((template) => (
                      <SegmentButton
                        key={template}
                        active={priceTemplate === template}
                        label={uiTemplateLabel(template, locale)}
                        onClick={() => setPriceTemplate(template)}
                      />
                    ))}
                  </div>
                </ControlGroup>

                <ControlGroup title="优化目标">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-2">
                    {(['storage_profit', 'green', 'station_profit'] as CloudObjective[]).map((objective) => (
                      <SegmentButton
                        key={objective}
                        active={cloudObjective === objective}
                        label={uiObjectiveLabel(objective, locale)}
                        onClick={() => setCloudObjective(objective)}
                      />
                    ))}
                  </div>
                </ControlGroup>

                <ControlGroup title="策略模式">
                  <div className="grid grid-cols-2 gap-2">
                    {(['day_ahead', 'rolling'] as CloudStrategyMode[]).map((strategy) => (
                      <SegmentButton
                        key={strategy}
                        active={cloudStrategy === strategy}
                        label={uiStrategyLabel(strategy, locale)}
                        onClick={() => setCloudStrategy(strategy)}
                      />
                    ))}
                  </div>
                </ControlGroup>

                <ControlGroup title="价格异常">
                  <select
                    value={negativePolicy}
                    onChange={(event) => setNegativePolicy(event.target.value as NegativePolicy)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {(['allow', 'clamp_zero', 'approval'] as NegativePolicy[]).map((policy) => (
                      <option key={policy} value={policy}>{uiNegativePolicyLabel(policy, locale)}</option>
                    ))}
                  </select>
                </ControlGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {FLOW_DEFS.map((flow) => {
                  const rule = cloudAdapter.rules[flow.key];
                  return (
                    <div key={flow.key} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="text-xs font-black text-slate-800">{flow.label}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{flow.description}</div>
                      <div className="text-[11px] font-mono text-slate-600 mt-2">
                        {rule.mode}
                        {rule.mode === 'same' && rule.ref ? `:${rule.ref}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                  onClick={syncCloudPrices}
                  type="button"
                >
                  同步价格模型
                </button>
                <button
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  onClick={runCloudStrategy}
                  disabled={loading}
                  type="button"
                >
                  {loading ? '计算中…' : '生成并运行策略'}
                </button>
                <button
                  className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowRawInputs((value) => !value)}
                  type="button"
                >
                  {showRawInputs ? '收起底层数组' : '查看底层数组'}
                </button>
                {profileMessage && (
                  <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    {profileMessage}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800 space-y-1">
                {cloudAdapter.warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-700">
                  24小时流向价格预览
                </div>
                <div className="max-h-[300px] overflow-auto">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-white text-slate-500">
                      <tr>
                        <th className="text-left px-3 py-2 border-b border-slate-200">时间</th>
                        <th className="text-right px-3 py-2 border-b border-slate-200">市场</th>
                        <th className="text-right px-3 py-2 border-b border-slate-200">买价</th>
                        <th className="text-right px-3 py-2 border-b border-slate-200">充电</th>
                        <th className="text-right px-3 py-2 border-b border-slate-200">PV上网</th>
                        <th className="text-right px-3 py-2 border-b border-slate-200">放电</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cloudPreviewRows.map((row) => (
                        <tr key={row.hour} className="odd:bg-white even:bg-slate-50">
                          <td className="text-left px-3 py-2 border-b border-slate-100">{row.hour}</td>
                          <td className="text-right px-3 py-2 border-b border-slate-100">{fmt(row.market)}</td>
                          <td className="text-right px-3 py-2 border-b border-slate-100">{fmt(row.gridToLoad)}</td>
                          <td className="text-right px-3 py-2 border-b border-slate-100">{fmt(row.gridToBess)}</td>
                          <td className="text-right px-3 py-2 border-b border-slate-100">{fmt(row.pvToGrid)}</td>
                          <td className="text-right px-3 py-2 border-b border-slate-100">{fmt(Math.max(row.bessToLoad, row.bessToGrid))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <details className="rounded-xl border border-slate-200 bg-slate-50">
                <summary className="cursor-pointer px-3 py-2 text-xs font-black text-slate-700">导出配置 JSON</summary>
                <pre className="max-h-[260px] overflow-auto px-3 pb-3 text-[11px] text-slate-600 whitespace-pre-wrap">{cloudConfigJson}</pre>
              </details>
            </div>
          </div>
        </section>

        <div className={`grid grid-cols-1 ${showRawInputs ? 'lg:grid-cols-2' : ''} gap-4`}>
          {/* 左：参数 */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-black">电池与系统参数</h2>
            <p className="text-xs text-slate-500 mt-1">目标：最小化净电费（购电 - 售电 + 循环惩罚 + 弃光惩罚）。</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <Field label="总容量 (kWh)" value={capKWh} onChange={setCapKWh} />
              <Field label="当前 SOC (%)" value={soc0Pct} onChange={setSoc0Pct} />
              <Field label="SOC 最小 (%)" value={socMinPct} onChange={setSocMinPct} />
              <Field label="SOC 最大 (%)" value={socMaxPct} onChange={setSocMaxPct} />
              <Field label="最大充电功率 (kW)" value={pChMax} onChange={setPChMax} />
              <Field label="最大放电功率 (kW)" value={pDisMax} onChange={setPDisMax} />
              <Field label="往返效率 η (0~1)" value={etaRoundTrip} onChange={setEtaRoundTrip} step="0.01" />
              <Field label="期末 SOC 下限 (%)" value={socEndPct} onChange={setSocEndPct} />
              <Field label="步长 (分钟)" value={dtMinutes} onChange={setDtMinutes} />
              <Field label="循环惩罚 (元/kWh)" value={cycleCost} onChange={setCycleCost} step="0.01" />
              <TextField label="外送上限 (kW，空=不限制)" value={exportLimit} onChange={setExportLimit} placeholder="例如 0 / 500" />
              <TextField label="购电上限 (kW，空=不限制)" value={importLimit} onChange={setImportLimit} placeholder="例如 1000" />
              <TextField label="需量软上限 (kW，空=不启用)" value={demandLimit} onChange={setDemandLimit} placeholder="例如 800（表示希望不超过 800kW）" />
              <Field label="超限惩罚 (元/kWh，越大越不超)" value={demandPenalty} onChange={setDemandPenalty} step="10" />
              <Field label="弃光惩罚 (元/kWh)" value={curtPenalty} onChange={setCurtPenalty} step="0.01" />
              <div className="md:col-span-2">
                <Area
                  label="分时需量上限 demandLimitSeriesKW（可选，96点；若填写则优先使用；长度必须等于 buyPrice）"
                  value={demandSeriesText}
                  onChange={setDemandSeriesText}
                />
              </div>
            </div>
          </section>

          {showRawInputs && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-black">96点输入</h2>
              <p className="text-xs text-slate-500 mt-1">支持逗号 / 空格 / 换行分隔。四个数组长度必须一致（建议 96）。</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <Area label="买电价 buyPrice (元/kWh)" value={buyText} onChange={setBuyText} />
                <Area label="卖电价 sellPrice (元/kWh)" value={sellText} onChange={setSellText} />
                <Area label="PV 预测 pvForecastKW (kW)" value={pvText} onChange={setPvText} />
                <Area label="负荷预测 loadForecastKW (kW)" value={loadText} onChange={setLoadText} />
              </div>
            </section>
          )}
        </div>

        {/* 输入预测曲线 */}
        {(predictionData.length > 0) && (
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black">输入预测曲线</h2>
                <p className="text-xs text-slate-500 mt-1">展示 PV/负荷预测（用于优化）。</p>
              </div>
              <div className="text-xs text-slate-500">点数：{predictionData.length}</div>
            </div>
            <div className="mt-4">
              <PredictionChart data={predictionData} labels={activeChartLabels} />
            </div>
          </section>
        )}

        {/* 结果 */}
        {result && (
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-sm font-black">优化结果</h2>
                <p className="text-xs text-slate-500 mt-1">展示：电池功率（放电为正）、电网功率（购电为正）、SOC。</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <KPI k="无储能基线电费(元)" v={result.summary.baselineCost} />
                <KPI k="优化后电费(元)" v={result.summary.optimizedCost} />
                <KPI k="节省/收益(元)" v={result.summary.saving} />
                <KPI k="期末SOC(%)" v={result.summary.endSocPct} />
                <KPI k="吞吐量(kWh)" v={result.summary.totalBatteryThroughputKWh} />
                <KPI k="弃光(kWh)" v={result.summary.totalPvCurtKWh} />
                {typeof result.summary.maxImportOverKW === 'number' && <KPI k="最大超限(kW)" v={result.summary.maxImportOverKW} />}
                {typeof result.summary.demandOverKWh === 'number' && <KPI k="超限电量(kWh)" v={result.summary.demandOverKWh} />}
                {typeof result.summary.demandPenaltyCost === 'number' && <KPI k="超限惩罚成本(元)" v={result.summary.demandPenaltyCost} />}
              </div>
            </div>

            <div className="mt-4">
              <EnergyChart data={simData} labels={activeChartLabels} />
            </div>

            <div className="mt-4 max-h-[360px] overflow-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-slate-600">
                    <th className="text-left px-3 py-2 border-b border-slate-200">时间</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">PV(kW)</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">负荷(kW)</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">买价</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">卖价</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">电池功率(kW)</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">SOC(%)</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">购电(kW)</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">外送(kW)</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">弃光(kW)</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">超限(kW)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.steps.map((r, idx) => (
                    <tr key={idx} className={idx % 2 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="text-left px-3 py-2 border-b border-slate-200">{r.time}</td>
                      <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.pvKW)}</td>
                      <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.loadKW)}</td>
                      <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.buyPrice)}</td>
                      <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.sellPrice)}</td>
                      <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.batteryPowerKW)}</td>
                      <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.socPct)}</td>
                      <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.gridImportKW)}</td>
                      <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.gridExportKW)}</td>
                      <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.pvCurtKW)}</td>
                      <td className="text-right px-3 py-2 border-b border-slate-200">{fmt(r.importOverKW ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs text-slate-500 mt-3">
              后端接口：<span className="font-mono">POST /api/optimize</span>（建议用 Vite proxy 转发到 127.0.0.1:8000）。
            </div>
          </section>
        )}
          </>
        )}
      </main>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-400">{label}</div>
      <div className="text-xs font-black text-slate-800 mt-0.5">{value}</div>
    </div>
  );
}

function ControlGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-black text-slate-600 mb-2">{title}</div>
      {children}
    </div>
  );
}

function SegmentButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        'px-3 py-2 rounded-xl border text-xs font-black transition',
        active
          ? 'bg-emerald-600 border-emerald-600 text-white'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100',
      ].join(' ')}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-600">{label}</label>
      <select
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleLine({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-emerald-600"
      />
    </label>
  );
}

function PriceRuleMatrix({
  rules,
  onRuleChange,
  onModeChange,
  locale,
}: {
  rules: Record<FlowKey, FlowRule>;
  onRuleChange: (key: FlowKey, patch: Partial<FlowRule>) => void;
  onModeChange: (key: FlowKey, mode: RuleMode) => void;
  locale: Locale;
}) {
  const parseOptionalNumber = (value: string) => (value.trim() === '' ? null : Number(value));
  const numberValue = (value: number | null) => (value === null ? '' : String(value));

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
        <div className="text-xs font-black text-slate-700">{pickLocaleText(locale, '能量流向价格矩阵', 'Energy Flow Price Matrix')}</div>
        <div className="text-[11px] text-slate-500 mt-1">{pickLocaleText(locale, '最终价格 = 基准价格 x 系数 + 价差，并受上下限与负价策略约束。', 'Final price = base price x factor + spread, constrained by limits and the negative-price policy.')}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full text-[11px]">
          <thead className="bg-white text-slate-500">
            <tr>
              <th className="text-left px-3 py-2 border-b border-slate-200 w-[150px]">{pickLocaleText(locale, '能量流向', 'Energy Flow')}</th>
              <th className="text-left px-3 py-2 border-b border-slate-200">{pickLocaleText(locale, '计价方式', 'Pricing Mode')}</th>
              <th className="text-left px-3 py-2 border-b border-slate-200">{pickLocaleText(locale, '基准价格源', 'Base Source')}</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">{pickLocaleText(locale, '固定价', 'Fixed')}</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">{pickLocaleText(locale, '系数', 'Factor')}</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">{pickLocaleText(locale, '价差', 'Spread')}</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">{pickLocaleText(locale, '下限', 'Min')}</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">{pickLocaleText(locale, '上限', 'Max')}</th>
              <th className="text-left px-3 py-2 border-b border-slate-200">{pickLocaleText(locale, '等同于', 'Same As')}</th>
              <th className="text-left px-3 py-2 border-b border-slate-200">{pickLocaleText(locale, '负价', 'Negative')}</th>
            </tr>
          </thead>
          <tbody>
            {FLOW_DEFS.map((flow) => {
              const rule = rules[flow.key];
              const isFixed = rule.mode === 'fixed';
              const isSame = rule.mode === 'same';
              const flowText = uiFlowText(flow, locale);
              return (
                <tr key={flow.key} data-flow-key={flow.key} className="odd:bg-white even:bg-slate-50">
                  <td className="px-3 py-2 border-b border-slate-100">
                    <div className="font-black text-slate-800">{flowText.label}</div>
                    <div className="text-slate-500 mt-0.5">{flowText.description}</div>
                  </td>
                  <td className="px-3 py-2 border-b border-slate-100">
                    <select
                      value={rule.mode}
                      onChange={(event) => onModeChange(flow.key, event.target.value as RuleMode)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-bold"
                    >
                      {Object.entries(ruleModeLabelsByLocale).map(([mode, label]) => (
                        <option key={mode} value={mode}>{label[locale]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 border-b border-slate-100">
                    <select
                      value={rule.base}
                      onChange={(event) => onRuleChange(flow.key, { base: event.target.value as FlowRule['base'] })}
                      disabled={isFixed || isSame || rule.mode === 'tou'}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="market">{pickLocaleText(locale, '市场电价', 'Market Price')}</option>
                      <option value="tou">{pickLocaleText(locale, '分时电价', 'TOU Price')}</option>
                      <option value="fixed">{pickLocaleText(locale, '固定价', 'Fixed Price')}</option>
                      <option value="same">{pickLocaleText(locale, '引用流向', 'Reference Flow')}</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 border-b border-slate-100">
                    <input
                      type="number"
                      value={rule.fixed}
                      onChange={(event) => onRuleChange(flow.key, { fixed: Number(event.target.value) })}
                      disabled={!isFixed && rule.base !== 'fixed'}
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </td>
                  <td className="px-3 py-2 border-b border-slate-100">
                    <input
                      type="number"
                      step="0.01"
                      value={rule.factor}
                      onChange={(event) => onRuleChange(flow.key, { factor: Number(event.target.value) })}
                      disabled={!['discount', 'tou'].includes(rule.mode)}
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </td>
                  <td className="px-3 py-2 border-b border-slate-100">
                    <input
                      type="number"
                      step="0.01"
                      value={rule.offset}
                      onChange={(event) => onRuleChange(flow.key, { offset: Number(event.target.value) })}
                      disabled={!['discount', 'spread', 'tou'].includes(rule.mode)}
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </td>
                  <td className="px-3 py-2 border-b border-slate-100">
                    <input
                      type="number"
                      step="0.01"
                      value={numberValue(rule.min)}
                      onChange={(event) => onRuleChange(flow.key, { min: parseOptionalNumber(event.target.value) })}
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 border-b border-slate-100">
                    <input
                      type="number"
                      step="0.01"
                      value={numberValue(rule.max)}
                      onChange={(event) => onRuleChange(flow.key, { max: parseOptionalNumber(event.target.value) })}
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 border-b border-slate-100">
                    <select
                      value={rule.ref ?? 'grid_to_load'}
                      onChange={(event) => onRuleChange(flow.key, { ref: event.target.value as FlowKey })}
                      disabled={!isSame}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {FLOW_DEFS.filter((item) => item.key !== flow.key).map((item) => (
                        <option key={item.key} value={item.key}>{uiFlowText(item, locale).label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 border-b border-slate-100">
                    <select
                      value={rule.allowNeg ? 'allow' : 'clamp'}
                      onChange={(event) => onRuleChange(flow.key, { allowNeg: event.target.value === 'allow' })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5"
                    >
                      <option value="allow">{pickLocaleText(locale, '允许', 'Allow')}</option>
                      <option value="clamp">{pickLocaleText(locale, '按0', 'Clamp to 0')}</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({ k, v }: { k: string; v: number }) {
  return (
    <div className="px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50">
      <div className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-400">{k}</div>
      <div className="text-base font-black text-slate-900">{fmt(v)}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-600">{label}</label>
      <input
        type="number"
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-600">{label}</label>
      <input
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-600">{label}</label>
      <textarea
        className="mt-1 w-full h-40 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
