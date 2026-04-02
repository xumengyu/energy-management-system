import type { StrategyStationDeployState } from '../types';

/** Demo: per strategy set + station — 策略最后下发 / 下发状态 */
export const MOCK_STRATEGY_STATION_DEPLOY: StrategyStationDeployState = {
    u1: {
        'ST-001': { lastDeployTime: '2026-03-30 08:15', status: 'success' },
        'ST-004': { lastDeployTime: '2026-03-29 16:42', status: 'success' },
    },
    u2: {
        'ST-002': { lastDeployTime: '', status: 'never' },
    },
    u3: {
        'ST-005': { lastDeployTime: '2026-03-31 09:00', status: 'pending' },
        'ST-006': { lastDeployTime: '2026-03-28 11:20', status: 'failed' },
    },
};
