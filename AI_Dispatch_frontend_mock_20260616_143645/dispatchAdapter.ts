export type DispatchAction = 'Charge' | 'Discharge' | 'Standby';

export type OptimizerDispatchStep = {
  time: string;
  batteryPowerKW: number;
  socPct?: number;
  gridPowerKW?: number;
};

export type DispatchSegment = {
  start: string;
  end: string;
  type: DispatchAction;
  powerKW: number;
  avgSocPct: number | null;
  points: number;
};

export type DispatchStrategyDraft = {
  stationId: string;
  stationName: string;
  strategyDate: string;
  source: 'dynamic-price-optimizer';
  mode: 'day_ahead' | 'rolling';
  objective: string;
  marketSource: string;
  granularity: string;
  timezone: string;
  priceModel?: Record<string, unknown>;
  segments: DispatchSegment[];
  summary: Record<string, unknown>;
  rawPointCount: number;
};

function minutesFromHHMM(time: string) {
  const [hh, mm] = time.split(':').map((part) => Number(part));
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
}

function hhmmFromMinutes(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hh = Math.floor(normalized / 60);
  const mm = normalized % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function dispatchTypeFromPower(powerKW: number, deadbandKW = 1): DispatchAction {
  if (powerKW > deadbandKW) return 'Discharge';
  if (powerKW < -deadbandKW) return 'Charge';
  return 'Standby';
}

export function compressDispatchSegments(
  steps: OptimizerDispatchStep[],
  dtMinutes: number,
  {
    deadbandKW = 1,
    powerBucketKW = 5,
  }: {
    deadbandKW?: number;
    powerBucketKW?: number;
  } = {},
): DispatchSegment[] {
  if (!steps.length) return [];

  const bucket = Math.max(1, powerBucketKW);
  const safeDt = Math.max(1, Math.round(dtMinutes || 15));

  type Acc = DispatchSegment & {
    _socSum: number;
    _socCount: number;
  };

  const acc: Acc[] = [];

  steps.forEach((step, index) => {
    const type = dispatchTypeFromPower(step.batteryPowerKW, deadbandKW);
    const roundedPower = type === 'Standby'
      ? 0
      : Math.round(Math.abs(step.batteryPowerKW) / bucket) * bucket;
    const startMinute = minutesFromHHMM(step.time);
    const start = hhmmFromMinutes(startMinute);
    const end = hhmmFromMinutes(index === steps.length - 1 ? startMinute + safeDt : minutesFromHHMM(steps[index + 1].time));
    const soc = typeof step.socPct === 'number' && Number.isFinite(step.socPct) ? step.socPct : null;
    const prev = acc[acc.length - 1];

    if (prev && prev.type === type && Math.abs(prev.powerKW - roundedPower) <= bucket) {
      const totalPoints = prev.points + 1;
      prev.powerKW = Math.round(((prev.powerKW * prev.points) + roundedPower) / totalPoints);
      prev.end = end;
      prev.points = totalPoints;
      if (soc !== null) {
        prev._socSum += soc;
        prev._socCount += 1;
        prev.avgSocPct = Math.round((prev._socSum / prev._socCount) * 100) / 100;
      }
      return;
    }

    acc.push({
      start,
      end,
      type,
      powerKW: roundedPower,
      avgSocPct: soc,
      points: 1,
      _socSum: soc ?? 0,
      _socCount: soc === null ? 0 : 1,
    });
  });

  return acc.map(({ _socSum, _socCount, ...segment }) => segment);
}

export function buildDispatchStrategyDraft({
  stationId,
  stationName,
  strategyDate,
  mode,
  objective,
  marketSource,
  granularity,
  timezone,
  priceModel,
  dtMinutes,
  steps,
  summary,
}: {
  stationId: string;
  stationName: string;
  strategyDate: string;
  mode: 'day_ahead' | 'rolling';
  objective: string;
  marketSource: string;
  granularity: string;
  timezone: string;
  priceModel?: Record<string, unknown>;
  dtMinutes: number;
  steps: OptimizerDispatchStep[];
  summary: Record<string, unknown>;
}): DispatchStrategyDraft {
  return {
    stationId,
    stationName,
    strategyDate,
    source: 'dynamic-price-optimizer',
    mode,
    objective,
    marketSource,
    granularity,
    timezone,
    priceModel,
    segments: compressDispatchSegments(steps, dtMinutes),
    summary,
    rawPointCount: steps.length,
  };
}
