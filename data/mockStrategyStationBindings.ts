import type { StrategyStationBindings } from '../types';

/** Demo mapping: user template id -> station ids (see INITIAL_STATIONS_* in App) */
export const MOCK_STRATEGY_STATION_BINDINGS: StrategyStationBindings = {
    u1: ['ST-001', 'ST-004'],
    u2: ['ST-002'],
    u3: ['ST-005', 'ST-006'],
};
