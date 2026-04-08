/** 与电价列表 PriceList 共用：用户自定义 / 系统 API 方案数据源 */

export type PriceSchemeSource = 'User' | 'API';

export interface PriceScheme {
    id: string;
    name: string;
    region: string;
    voltage: string;
    userType: string;
    validFrom: string;
    validTo: string;
    status: string;
    source: PriceSchemeSource;
    provider: string;
    frequency: string;
}

export const PRICE_SCHEMES_ZH: PriceScheme[] = [
    { id: 'SCH-001', name: 'EPEX 德国日前市场自动策略', region: 'DE-LU (德国)', voltage: '10kV', userType: '大工业', validFrom: '2025-01-01', validTo: '2025-12-31', status: 'Active', source: 'API', provider: 'EPEX SPOT', frequency: '日前 (Day-Ahead)' },
    { id: 'SCH-002', name: '慕尼黑科技园峰谷电价', region: 'DE-BY (巴伐利亚)', voltage: '20kV', userType: '一般工商业', validFrom: '2025-03-01', validTo: '长期', status: 'Active', source: 'User', provider: '-', frequency: '-' },
    { id: 'SCH-003', name: '巴黎夏季尖峰电价', region: 'FR-IDF (法兰西岛)', voltage: '10kV', userType: '商业', validFrom: '2025-07-01', validTo: '2025-09-30', status: 'Expired', source: 'User', provider: '-', frequency: '-' },
    { id: 'SCH-004', name: '2025年伦敦冬季保供电价', region: 'GB-LON (伦敦)', voltage: '11kV', userType: '大工业', validFrom: '2025-01-20', validTo: '2025-02-10', status: 'Draft', source: 'User', provider: '-', frequency: '-' },
    { id: 'SCH-005', name: '维也纳分时电价 V3', region: 'AT-WI (维也纳)', voltage: '10kV', userType: '大工业', validFrom: '2025-06-01', validTo: '长期', status: 'Active', source: 'User', provider: '-', frequency: '-' },
    { id: 'SCH-006', name: '北欧电力现货 (Nord Pool)', region: 'EU-NO (挪威)', voltage: 'N/A', userType: '批发市场', validFrom: '-', validTo: '-', status: 'Connected', source: 'API', provider: 'Nord Pool AS', frequency: '日前 (Day-Ahead)' },
    { id: 'SCH-007', name: '瑞士实时电价 API', region: 'CH-ZH (苏黎世)', voltage: '16kV', userType: '大工业', validFrom: '2025-01-01', validTo: '2025-12-31', status: 'Error', source: 'API', provider: 'Swissgrid', frequency: '实时 (15min)' },
];

export const PRICE_SCHEMES_EN: PriceScheme[] = [
    { id: 'SCH-001', name: 'EPEX Spot DE Auto Strategy', region: 'DE-LU (Germany)', voltage: '10kV', userType: 'Large Ind.', validFrom: '2025-01-01', validTo: '2025-12-31', status: 'Active', source: 'API', provider: 'EPEX SPOT', frequency: 'Day-Ahead' },
    { id: 'SCH-002', name: 'Munich Tech Hub TOU', region: 'DE-BY (Bavaria)', voltage: '20kV', userType: 'Gen. Ind.', validFrom: '2025-03-01', validTo: 'Indefinite', status: 'Active', source: 'User', provider: '-', frequency: '-' },
    { id: 'SCH-003', name: 'Paris Summer Peak', region: 'FR-IDF (Ile-de-France)', voltage: '10kV', userType: 'Commercial', validFrom: '2025-07-01', validTo: '2025-09-30', status: 'Expired', source: 'User', provider: '-', frequency: '-' },
    { id: 'SCH-004', name: '2025 London Winter Peak', region: 'GB-LON (London)', voltage: '11kV', userType: 'Large Ind.', validFrom: '2025-01-20', validTo: '2025-02-10', status: 'Draft', source: 'User', provider: '-', frequency: '-' },
    { id: 'SCH-005', name: 'Vienna TOU V3', region: 'AT-WI (Vienna)', voltage: '10kV', userType: 'Large Ind.', validFrom: '2025-06-01', validTo: 'Indefinite', status: 'Active', source: 'User', provider: '-', frequency: '-' },
    { id: 'SCH-006', name: 'Nord Pool Spot', region: 'EU-NO (Norway)', voltage: 'N/A', userType: 'Wholesale', validFrom: '-', validTo: '-', status: 'Connected', source: 'API', provider: 'Nord Pool AS', frequency: 'Day-Ahead' },
    { id: 'SCH-007', name: 'Zurich Real-time API', region: 'CH-ZH (Zurich)', voltage: '16kV', userType: 'Large Ind.', validFrom: '2025-01-01', validTo: '2025-12-31', status: 'Error', source: 'API', provider: 'Swissgrid', frequency: 'Real-time (15min)' },
];
