export type PriceTemplate = 'market' | 'tou' | 'ppa';
export type CloudObjective = 'storage_profit' | 'green' | 'station_profit';
export type CloudStrategyMode = 'day_ahead' | 'rolling';
export type NegativePolicy = 'allow' | 'clamp_zero' | 'approval';

export type FlowKey =
  | 'grid_to_load'
  | 'grid_to_bess'
  | 'pv_to_load'
  | 'pv_to_bess'
  | 'pv_to_grid'
  | 'bess_to_load'
  | 'bess_to_grid';

export type RuleMode = 'fixed' | 'tou' | 'discount' | 'spread' | 'same';
export type RuleBase = 'market' | 'tou' | 'fixed' | 'same';

export type FlowRule = {
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

export type FlowDefinition = {
  key: FlowKey;
  label: string;
  description: string;
};

export const FLOW_DEFS: FlowDefinition[] = [
  { key: 'grid_to_load', label: '电网->负荷', description: '外购电成本' },
  { key: 'grid_to_bess', label: '电网->储能', description: '电网充电成本' },
  { key: 'pv_to_load', label: '光伏->负荷', description: '光伏自用价值' },
  { key: 'pv_to_bess', label: '光伏->储能', description: '光伏充电机会成本' },
  { key: 'pv_to_grid', label: '光伏->电网', description: '光伏上网收益' },
  { key: 'bess_to_load', label: '储能->负荷', description: '替代购电收益' },
  { key: 'bess_to_grid', label: '储能->电网', description: '储能上网收益' },
];

const FLOW_KEYS = FLOW_DEFS.map((flow) => flow.key);

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

export function defaultRules(template: PriceTemplate): Record<FlowKey, FlowRule> {
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

export function templateLabel(template: PriceTemplate): string {
  return {
    market: '市场联动折扣',
    tou: '工商业分时',
    ppa: '一口价/PPA',
  }[template];
}

export function objectiveLabel(objective: CloudObjective): string {
  return {
    storage_profit: '储能收益最大化',
    green: '绿电消纳最大化',
    station_profit: '全站收益最大化',
  }[objective];
}

export function strategyLabel(strategy: CloudStrategyMode): string {
  return strategy === 'day_ahead' ? '日前策略' : '滚动优化';
}

export function negativePolicyLabel(policy: NegativePolicy): string {
  return {
    allow: '允许负价',
    clamp_zero: '负价按0',
    approval: '负价需确认',
  }[policy];
}

function hourIndex(point: number, dtMinutes: number) {
  const h = Math.floor((point * dtMinutes) / 60) % 24;
  return Math.max(0, Math.min(23, h));
}

function basePrice(ruleValue: FlowRule, hour: number, negativePolicy: NegativePolicy) {
  let price = SAMPLE_MARKET_24[hour] ?? 0;
  if (ruleValue.base === 'tou') price = SAMPLE_TOU_24[hour] ?? 0;
  if (ruleValue.base === 'fixed') price = ruleValue.fixed;
  if (negativePolicy === 'clamp_zero' && price < 0) price = 0;
  return price;
}

function clampByRule(value: number, ruleValue: FlowRule, negativePolicy: NegativePolicy) {
  let next = value;
  if ((negativePolicy === 'clamp_zero' || !ruleValue.allowNeg) && next < 0) next = 0;
  if (typeof ruleValue.min === 'number' && Number.isFinite(ruleValue.min)) next = Math.max(next, ruleValue.min);
  if (typeof ruleValue.max === 'number' && Number.isFinite(ruleValue.max)) next = Math.min(next, ruleValue.max);
  return Math.round(next * 1000) / 1000;
}

export function calcFlowPrice(
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
    value = ruleValue.mode === 'spread'
      ? base + ruleValue.offset
      : base * ruleValue.factor + ruleValue.offset;
  }

  return clampByRule(value, ruleValue, negativePolicy);
}

export function buildFlowSeries(
  rules: Record<FlowKey, FlowRule>,
  dtMinutes: number,
  points: number,
  negativePolicy: NegativePolicy,
): Record<FlowKey, number[]> {
  const series = {} as Record<FlowKey, number[]>;
  FLOW_KEYS.forEach((key) => {
    series[key] = Array.from({ length: points }, (_, point) => (
      calcFlowPrice(rules, key, hourIndex(point, dtMinutes), negativePolicy)
    ));
  });
  return series;
}

export function buildOptimizerPriceAdapter({
  template,
  rules: ruleOverrides,
  dtMinutes,
  points,
  negativePolicy,
  objective,
}: {
  template: PriceTemplate;
  rules?: Record<FlowKey, FlowRule>;
  dtMinutes: number;
  points: number;
  negativePolicy: NegativePolicy;
  objective: CloudObjective;
}) {
  const rules = ruleOverrides ?? defaultRules(template);
  const flowSeries = buildFlowSeries(rules, Math.max(1, dtMinutes), Math.max(1, points), negativePolicy);
  const buyPrice = flowSeries.grid_to_load;
  const sellPrice = flowSeries.pv_to_grid.map((pvSell, index) => {
    const bessSell = flowSeries.bess_to_grid[index] ?? pvSell;
    return Math.max(0, Math.min(pvSell, bessSell));
  });
  const warnings: string[] = [];
  if (negativePolicy === 'approval' && SAMPLE_MARKET_24.some((price) => price < 0)) {
    warnings.push('当前样例市场价含负电价，自动下发前应进入人工确认。');
  }
  warnings.push('当前优化器为买价/卖价双曲线接口，已用 grid_to_load 作为买价，用 pv_to_grid 与 bess_to_grid 的较低值作为保守卖价。');

  return { rules, flowSeries, buyPrice, sellPrice, warnings };
}

export function previewRows(rules: Record<FlowKey, FlowRule>, negativePolicy: NegativePolicy) {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    market: negativePolicy === 'clamp_zero'
      ? Math.max(0, SAMPLE_MARKET_24[hour] ?? 0)
      : (SAMPLE_MARKET_24[hour] ?? 0),
    gridToLoad: calcFlowPrice(rules, 'grid_to_load', hour, negativePolicy),
    gridToBess: calcFlowPrice(rules, 'grid_to_bess', hour, negativePolicy),
    pvToGrid: calcFlowPrice(rules, 'pv_to_grid', hour, negativePolicy),
    bessToLoad: calcFlowPrice(rules, 'bess_to_load', hour, negativePolicy),
    bessToGrid: calcFlowPrice(rules, 'bess_to_grid', hour, negativePolicy),
  }));
}
