
export enum OptimizationMode {
  COST_MINIMIZATION = 'COST_MINIMIZATION',
  PROFIT_MAXIMIZATION = 'PROFIT_MAXIMIZATION',
  GREEN_ENERGY_MAX = 'GREEN_ENERGY_MAX'
}

export enum Language {
  EN = 'en',
  ZH = 'zh'
}

export interface BatteryDevice {
  id: string;
  name: string;
  maxChargePower: number;      // kW
  maxDischargePower: number;   // kW
  currentCapacity: number;     // kWh (Current energy level)
  totalCapacity: number;       // kWh
  maxChargeDepth: number;      // % (e.g., 98%)
  minDischargeDepth: number;   // % (e.g., 5%)
  efficiency: number;          // % (Decimal 0-1)
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
}

export interface PricePeriod {
  id: string;
  start: string;               // "HH:mm"
  end: string;                 // "HH:mm"
  pvGridPrice: number;         // 光伏并网价格
  pvLocalPrice: number;        // 光伏就地消纳价格
  gridSellPrice: number;       // 电网售电价格 (电网卖给用户)
  storageFromPvPrice: number;  // 储能从光伏的买电价格
  storageFromGridPrice: number; // 储能从电网的买电价格
  storageLocalPrice: number;   // 储能就地消纳价格 (储能卖给用户)
  storageGridPrice: number;    // 储能并电网价格
}

export interface SystemSettings {
  transformerCapacity: number; // kW
  antiBackflow: boolean;
  pvThreshold: number;         // kW: Trigger charging when PV exceeds this
  overDemandBuffer: number;    // kW: Safety margin before hitting transformer limit
  degradationCost: number;     // $/kWh
}

export interface PredictionStep {
  time: string;
  pvForecast: number;
  loadForecast: number;
}

export interface HistoryStep {
  time: string;
  pvActual: number;
  loadActual: number;
  pvForecast: number;          // Added for comparison
  loadForecast: number;        // Added for comparison
}

export interface HistoryPriceStep {
  time: string;
  gridSellPrice: number;
  storageFromGridPrice: number;
  storageLocalPrice: number;
}

export interface SimulationStep {
  time: string;
  pv: number;
  load: number;
  price: number;
  batteryPower: number;
  soc: number;
  gridPower: number; // Positive = Buy, Negative = Sell/Export
  netRevenue: number;
}

export interface LogEntry {
  timestamp: string;
  mode: OptimizationMode;
  action: 'CHARGE' | 'DISCHARGE' | 'IDLE';
  power: number;
  soc: number;
  revenue: number;
}

export interface SimulationResult {
  steps: SimulationStep[];
  summary: {
    totalSavings: number;
    totalProfit: number;
    totalLoss: number;
    netGain: number;
    selfSufficiency: number;
    carbonSaved: number;
  };
}