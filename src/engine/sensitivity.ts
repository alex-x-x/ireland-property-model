import { SimulationConfig } from './types';
import { runSimulation } from './simulation';
import { runDecisionAnalysis, simulateTrajectoryForPurchaseMonth } from './decision';

export type SensitivityWaitMode = 'optimal' | 'rent' | number;

export interface SensitivityCellDetails {
  buyAsapNetWealth: number;
  waitNetWealth: number;
  buyMonth: number;
  waitBuyMonth: number | null;
  propertyPriceBuyAsap: number;
  propertyPriceWait: number;
  depositPaidBuyAsap: number;
  depositPaidWait: number;
  cumulativeRentPaidBuyAsap: number;
  cumulativeRentPaidWait: number;
  monthlyMortgageBuyAsap: number;
  monthlyMortgageWait: number;
  liquidWealthBuyAsap: number;
  liquidWealthWait: number;
  homeEquityBuyAsap: number;
  homeEquityWait: number;
}

export interface SensitivityCell {
  stockRate: number;
  propRate: number;
  delta: number;
  winner: 'wait_and_compound' | 'buy_asap' | 'unaffordable';
  isAffordable: boolean;
  strategyLabel?: string;
  details?: SensitivityCellDetails;
}

export interface SensitivityRow {
  stockRate: number;
  cells: SensitivityCell[];
}

export const SENSITIVITY_STOCK_RATES = [-0.20, -0.15, -0.10, -0.05, 0.00, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30];
export const SENSITIVITY_PROP_RATES = [-0.03, 0.00, 0.03, 0.05, 0.08];

export const DEFAULT_PROP_TOLERANCE = 0.0025; // 0.25%
export const DEFAULT_STOCK_TOLERANCE = 0.0025; // 0.25% (allows deliberate 0.5% slider steps)

export interface DynamicRatesResult {
  stockRates: number[];
  propRates: number[];
  isInjectedStock: boolean;
  isInjectedProp: boolean;
  userStockRate: number;
  userPropRate: number;
}

function injectRateIntoAxis(baseRates: number[], userRate: number, tolerance: number) {
  const matches = baseRates.some((r) => Math.abs(r - userRate) <= tolerance);
  if (matches) {
    return { rates: baseRates, isInjected: false };
  }
  return {
    rates: [...baseRates, userRate].sort((a, b) => a - b),
    isInjected: true,
  };
}

/**
 * Derives sensitivity axes (rows and columns) dynamically based on the user's sidebar configuration.
 * If the user's Property Inflation or Stock Growth falls between the standard steps,
 * it injects the exact user value into the evaluation array in sorted order.
 *
 * Deduplication tolerance:
 * - Property: 0.25% (0.0025)
 * - Stock: 0.25% (0.0025)
 */
export function getDynamicSensitivityRates(
  userStockRate: number,
  userPropRate: number,
  baseStockRates: number[] = SENSITIVITY_STOCK_RATES,
  basePropRates: number[] = SENSITIVITY_PROP_RATES,
  stockTolerance: number = DEFAULT_STOCK_TOLERANCE,
  propTolerance: number = DEFAULT_PROP_TOLERANCE
): DynamicRatesResult {
  if (!Number.isFinite(userStockRate) || !Number.isFinite(userPropRate)) {
    return {
      stockRates: baseStockRates,
      propRates: basePropRates,
      isInjectedStock: false,
      isInjectedProp: false,
      userStockRate,
      userPropRate,
    };
  }

  const { rates: propRates, isInjected: isInjectedProp } = injectRateIntoAxis(
    basePropRates,
    userPropRate,
    propTolerance
  );

  const { rates: stockRates, isInjected: isInjectedStock } = injectRateIntoAxis(
    baseStockRates,
    userStockRate,
    stockTolerance
  );

  return {
    stockRates,
    propRates,
    isInjectedStock,
    isInjectedProp,
    userStockRate,
    userPropRate,
  };
}

/**
 * Pure functional evaluation of 55 economic permutations (stock growth vs property growth).
 * All scenarios are evaluated at Month 60 (Year 5) terminal wealth to ensure a fair,
 * un-distorted apples-to-apples comparison.
 *
 * @param config Base simulation configuration
 * @param waitMode 'optimal' | 'rent' | number (months to wait before purchasing)
 * @param stockRates Array of annual stock growth rates to test
 * @param propRates Array of annual property growth rates to test
 */
export function computeSensitivityMatrix(
  config: SimulationConfig,
  waitMode: SensitivityWaitMode = 'optimal',
  stockRates: number[] = SENSITIVITY_STOCK_RATES,
  propRates: number[] = SENSITIVITY_PROP_RATES
): SensitivityRow[] {
  return stockRates.map((stockRate) => {
    const row: SensitivityCell[] = propRates.map((propRate) => {
      const testConfig: SimulationConfig = {
        ...config,
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
      const earliestPoint = monthly.find((p) => p.isAffordable);
      const isAffordable = !!earliestPoint;

      if (!isAffordable || earliestPoint === undefined) {
        return {
          stockRate,
          propRate,
          delta: 0,
          winner: 'unaffordable',
          isAffordable: false,
          strategyLabel: 'Unaffordable',
        };
      }

      const earliestBuyMonth = earliestPoint.month;

      let delta = 0;
      let winner: 'wait_and_compound' | 'buy_asap' = 'buy_asap';
      let strategyLabel = 'Wait & Compound';
      let details: SensitivityCellDetails;

      if (waitMode === 'optimal') {
        const decision = runDecisionAnalysis(testConfig, monthly);
        const buyAsapScenario = decision.scenarios.find((s) => s.id === 'buy_asap')!;
        const waitScenarios = decision.scenarios.filter((s) => s.id !== 'buy_asap');
        const bestWait =
          waitScenarios.length > 0
            ? waitScenarios.reduce((best, s) =>
                (s.netWealthDeltaVsBuyAsap ?? -Infinity) > (best.netWealthDeltaVsBuyAsap ?? -Infinity) ? s : best
              )
            : null;

        delta = bestWait?.netWealthDeltaVsBuyAsap ?? 0;
        winner = delta > 5000 ? 'wait_and_compound' : 'buy_asap';
        strategyLabel = bestWait ? bestWait.timingLabel : 'Wait & Compound';

        details = {
          buyAsapNetWealth: buyAsapScenario.totalNetWealthAtM60,
          waitNetWealth: bestWait ? bestWait.totalNetWealthAtM60 : buyAsapScenario.totalNetWealthAtM60,
          buyMonth: earliestBuyMonth,
          waitBuyMonth: bestWait?.buyMonth ?? null,
          propertyPriceBuyAsap: buyAsapScenario.propertyPurchasePrice,
          propertyPriceWait: bestWait?.propertyPurchasePrice ?? 0,
          depositPaidBuyAsap: buyAsapScenario.depositPaid,
          depositPaidWait: bestWait?.depositPaid ?? 0,
          cumulativeRentPaidBuyAsap: buyAsapScenario.cumulativeRentPaid,
          cumulativeRentPaidWait: bestWait?.cumulativeRentPaid ?? 0,
          monthlyMortgageBuyAsap: buyAsapScenario.monthlyMortgagePayment,
          monthlyMortgageWait: bestWait?.monthlyMortgagePayment ?? 0,
          liquidWealthBuyAsap: buyAsapScenario.remainingLiquidWealthAtM60,
          liquidWealthWait: bestWait?.remainingLiquidWealthAtM60 ?? 0,
          homeEquityBuyAsap: buyAsapScenario.homeEquityAtM60,
          homeEquityWait: bestWait?.homeEquityAtM60 ?? 0,
        };
      } else {
        const buyAsapSim = simulateTrajectoryForPurchaseMonth(earliestBuyMonth, testConfig, monthly);

        if (waitMode === 'rent') {
          const rentSim = simulateTrajectoryForPurchaseMonth(null, testConfig, monthly);
          delta = rentSim.totalNetWealthAtM60 - buyAsapSim.totalNetWealthAtM60;
          winner = delta > 5000 ? 'wait_and_compound' : 'buy_asap';
          strategyLabel = 'Rent All 5Y';

          details = {
            buyAsapNetWealth: buyAsapSim.totalNetWealthAtM60,
            waitNetWealth: rentSim.totalNetWealthAtM60,
            buyMonth: earliestBuyMonth,
            waitBuyMonth: null,
            propertyPriceBuyAsap: buyAsapSim.propertyPurchasePrice,
            propertyPriceWait: 0,
            depositPaidBuyAsap: buyAsapSim.depositPaid,
            depositPaidWait: 0,
            cumulativeRentPaidBuyAsap: buyAsapSim.cumulativeRentPaid,
            cumulativeRentPaidWait: rentSim.cumulativeRentPaid,
            monthlyMortgageBuyAsap: buyAsapSim.monthlyMortgagePayment,
            monthlyMortgageWait: 0,
            liquidWealthBuyAsap: buyAsapSim.remainingLiquidWealthAtM60,
            liquidWealthWait: rentSim.remainingLiquidWealthAtM60,
            homeEquityBuyAsap: buyAsapSim.homeEquityAtM60,
            homeEquityWait: 0,
          };
        } else {
          // Specific wait duration in months
          const waitMonths = waitMode;
          const targetBuyMonth = earliestBuyMonth + waitMonths;
          const isBeyondHorizon = targetBuyMonth >= testConfig.meta.forecast_months;
          const waitSim = simulateTrajectoryForPurchaseMonth(
            isBeyondHorizon ? null : targetBuyMonth,
            testConfig,
            monthly
          );

          delta = waitSim.totalNetWealthAtM60 - buyAsapSim.totalNetWealthAtM60;
          winner = delta > 5000 ? 'wait_and_compound' : 'buy_asap';
          strategyLabel = isBeyondHorizon
            ? 'Rent All 5Y (Wait exceeds horizon)'
            : `Wait ${waitMonths}M (Buy M${targetBuyMonth})`;

          details = {
            buyAsapNetWealth: buyAsapSim.totalNetWealthAtM60,
            waitNetWealth: waitSim.totalNetWealthAtM60,
            buyMonth: earliestBuyMonth,
            waitBuyMonth: isBeyondHorizon ? null : targetBuyMonth,
            propertyPriceBuyAsap: buyAsapSim.propertyPurchasePrice,
            propertyPriceWait: isBeyondHorizon ? 0 : waitSim.propertyPurchasePrice,
            depositPaidBuyAsap: buyAsapSim.depositPaid,
            depositPaidWait: isBeyondHorizon ? 0 : waitSim.depositPaid,
            cumulativeRentPaidBuyAsap: buyAsapSim.cumulativeRentPaid,
            cumulativeRentPaidWait: waitSim.cumulativeRentPaid,
            monthlyMortgageBuyAsap: buyAsapSim.monthlyMortgagePayment,
            monthlyMortgageWait: isBeyondHorizon ? 0 : waitSim.monthlyMortgagePayment,
            liquidWealthBuyAsap: buyAsapSim.remainingLiquidWealthAtM60,
            liquidWealthWait: waitSim.remainingLiquidWealthAtM60,
            homeEquityBuyAsap: buyAsapSim.homeEquityAtM60,
            homeEquityWait: waitSim.homeEquityAtM60,
          };
        }
      }

      return {
        stockRate,
        propRate,
        delta,
        winner,
        isAffordable: true,
        strategyLabel,
        details,
      };
    });

    return { stockRate, cells: row };
  });
}

export interface BreakevenResult {
  hurdleRate: number | null;
  status: 'always_wait' | 'always_buy' | 'crossing' | 'unaffordable';
  closestPropRate: number;
}

/**
 * Calculates the exact breakeven stock return (hurdle rate) where the net wealth difference
 * between waiting and buying ASAP crosses zero (indifference point) for a given property growth rate.
 */
export function calculateBreakevenStockRate(
  grid: SensitivityRow[],
  targetPropRate: number
): BreakevenResult | null {
  if (!grid || grid.length === 0 || !grid[0].cells || grid[0].cells.length === 0) {
    return null;
  }

  // Find column closest to targetPropRate
  let bestColIdx = 0;
  let minDiff = Infinity;
  grid[0].cells.forEach((cell, idx) => {
    const diff = Math.abs(cell.propRate - targetPropRate);
    if (diff < minDiff) {
      minDiff = diff;
      bestColIdx = idx;
    }
  });

  const closestPropRate = grid[0].cells[bestColIdx].propRate;

  // Filter out unaffordable scenarios to prevent false crossing points
  const affordablePoints = grid
    .map((row) => {
      const cell = row.cells[bestColIdx];
      return {
        stockRate: row.stockRate,
        delta: cell?.delta ?? 0,
        isAffordable: cell?.isAffordable ?? false,
      };
    })
    .filter((p) => p.isAffordable)
    .sort((a, b) => a.stockRate - b.stockRate);

  if (affordablePoints.length === 0) {
    return { hurdleRate: null, status: 'unaffordable', closestPropRate };
  }

  const allPositive = affordablePoints.every((p) => p.delta > 0);
  if (allPositive) {
    return { hurdleRate: affordablePoints[0].stockRate, status: 'always_wait', closestPropRate };
  }

  const allNegative = affordablePoints.every((p) => p.delta <= 0);
  if (allNegative) {
    return { hurdleRate: null, status: 'always_buy', closestPropRate };
  }

  // Search zero-crossing
  for (let i = 0; i < affordablePoints.length - 1; i++) {
    const p1 = affordablePoints[i];
    const p2 = affordablePoints[i + 1];
    if (p1.delta <= 0 && p2.delta > 0) {
      const denom = p2.delta - p1.delta;
      const fraction = denom !== 0 ? (0 - p1.delta) / denom : 0;
      const hurdleRate = p1.stockRate + fraction * (p2.stockRate - p1.stockRate);
      return { hurdleRate, status: 'crossing', closestPropRate };
    }
  }

  return { hurdleRate: null, status: 'always_buy', closestPropRate };
}
