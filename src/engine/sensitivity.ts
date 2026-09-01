import { SimulationConfig } from './types';
import { runSimulation } from './simulation';
import { runDecisionAnalysis } from './decision';

export interface SensitivityCell {
  stockRate: number;
  propRate: number;
  delta: number;
  winner: 'wait_and_compound' | 'buy_asap' | 'unaffordable';
  isAffordable: boolean;
}

export interface SensitivityRow {
  stockRate: number;
  cells: SensitivityCell[];
}

export const SENSITIVITY_STOCK_RATES = [-0.20, -0.15, -0.10, -0.05, 0.00, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30];
export const SENSITIVITY_PROP_RATES = [-0.03, 0.00, 0.03, 0.05, 0.08];

/**
 * Pure functional evaluation of 55 economic permutations (stock growth vs property growth)
 * across a selected comparison horizon (1 to 60 months).
 */
export function computeSensitivityMatrix(
  config: SimulationConfig,
  horizonMonths: number = 60,
  stockRates: number[] = SENSITIVITY_STOCK_RATES,
  propRates: number[] = SENSITIVITY_PROP_RATES
): SensitivityRow[] {
  return stockRates.map((stockRate) => {
    const row: SensitivityCell[] = propRates.map((propRate) => {
      const testConfig: SimulationConfig = {
        ...config,
        meta: {
          ...config.meta,
          forecast_months: horizonMonths,
        },
        property: {
          ...config.property,
          yearly_growth_rate: propRate,
        },
        equity_engine: {
          ...config.equity_engine,
          stock_yearly_growth_rate: stockRate,
        },
      };

      const monthly = runSimulation(testConfig);
      const decision = runDecisionAnalysis(testConfig, monthly);
      const waitScenarios = decision.scenarios.filter((s) => s.id !== 'buy_asap');
      let delta = 0;
      if (waitScenarios.length > 0) {
        const maxWaitScenario = waitScenarios.reduce((best, s) =>
          (s.netWealthDeltaVsBuyAsap ?? -Infinity) > (best.netWealthDeltaVsBuyAsap ?? -Infinity) ? s : best
        );
        delta = maxWaitScenario.netWealthDeltaVsBuyAsap ?? 0;
      }
      const winner = decision.recommendedAction;

      return {
        stockRate,
        propRate,
        delta,
        winner,
        isAffordable: decision.earliestBuyMonth !== null,
      };
    });

    return { stockRate, cells: row };
  });
}
