
// Global Types
export type Language = 'en' | 'zh' | 'fr';
export type Theme = 'light' | 'dark';

export type PriceTab = 'overview' | 'settings' | 'sources';
export type StrategyTab = 'overview' | 'settings' | 'price' | 'sources';

// Price Editor Types
export interface PriceCoefficient {
    grid: number; // A * k
    local: number; // A * k
}

export interface ChargeCoefficient {
    fromPv: number;
    fromGrid: number;
}

export interface DischargeCoefficient {
    toGrid: number;
    toLoad: number;
}

export interface Coefficients {
    pv: PriceCoefficient;
    charge: ChargeCoefficient;
    discharge: DischargeCoefficient;
}

export interface PriceRow {
    time: string;
    priceA: number;
    source: 'Manual' | 'Market';
}

export interface MarketSource {
    id: string;
    name: string;
    type: 'API' | 'File' | 'Manual';
    status: 'Active' | 'Inactive';
    lastSync: string;
    region: string;
}

// Strategy Manager Types
export interface StrategyItem {
    id: string;
    startTime: string;
    endTime: string;
    type: 'Charge' | 'Discharge' | 'Standby';
    power: number;
}

export interface ChartDataPoint {
    time: string;
    edge: number;
    cloud: number;
    recommended: number;
    socForecast1?: number;
    socForecast2?: number;
    cos?: number;
}

export interface ForecastDataPoint {
    time: string;
    solar: number;
    load: number;
    price: number;
}

export interface Template {
    id: string;
    nameKey: string;
    typeKey: 'algo' | 'staticTpl' | 'apiHook';
    scopeKey: string;
    statusKey: 'active' | 'ready' | 'inactive';
    isRemovable: boolean;
}

/** Strategy template id -> station ids that use this strategy */
export type StrategyStationBindings = Record<string, string[]>;
