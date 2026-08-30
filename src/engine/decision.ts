import {
  DecisionComparison,
  MonthlyDataPoint,
  PurchaseScenario,
  SimulationConfig,
} from './types';
import { calculateMortgageAmortization, getSalaryAtDate } from './mortgage';
import { getVestingMilestonesForMonth, addMonthsToDate } from './vesting';
import { calculateIrishTaxBreakdown } from './tax';

interface PostPurchaseSimulation {
  remainingLiquidWealthAtM60: number;
  cumulativeRentPaid: number;
  cumulativeMortgageInterestPaid: number;
  cumulativeMortgagePrincipalPaid: number;
  cumulativeMaintenancePaid: number;
  propertyValueAtM60: number;
  remainingMortgageBalanceAtM60: number;
  homeEquityAtM60: number;
  totalNetWealthAtM60: number;
  monthlyMortgagePayment: number;
  initialMortgagePrincipal: number;
  depositPaid: number;
  stampDutyPaid: number;
  closingFeesPaid: number;
  totalUpfrontPaid: number;
  propertyPurchasePrice: number;
}

function simulateTrajectoryForPurchaseMonth(
  buyMonth: number | null,
  config: SimulationConfig,
  baseMonthlyPoints: MonthlyDataPoint[]
): PostPurchaseSimulation {
  const { meta, property, mortgage, liquid_assets, equity_engine, macro } = config;
  const forecastMonths = meta.forecast_months;

  const propMonthlyMult = Math.pow(1 + property.yearly_growth_rate, 1 / 12);
  const invMonthlyMult = Math.pow(1 + liquid_assets.investments_yearly_growth_rate, 1 / 12);
  const stockMonthlyMult = Math.pow(1 + equity_engine.stock_yearly_growth_rate, 1 / 12);
  const rentMonthlyMult = Math.pow(1 + (macro.rent_yearly_growth_rate || 0), 1 / 12);

  // If never buy (Rent all 60 months)
  if (buyMonth === null || buyMonth > forecastMonths) {
    const endPoint = baseMonthlyPoints[forecastMonths];
    return {
      remainingLiquidWealthAtM60: endPoint.totalLiquidWealth,
      cumulativeRentPaid: endPoint.cumulativeRent,
      cumulativeMortgageInterestPaid: 0,
      cumulativeMortgagePrincipalPaid: 0,
      cumulativeMaintenancePaid: 0,
      propertyValueAtM60: 0,
      remainingMortgageBalanceAtM60: 0,
      homeEquityAtM60: 0,
      totalNetWealthAtM60: endPoint.totalLiquidWealth,
      monthlyMortgagePayment: 0,
      initialMortgagePrincipal: 0,
      depositPaid: 0,
      stampDutyPaid: 0,
      closingFeesPaid: 0,
      totalUpfrontPaid: 0,
      propertyPurchasePrice: 0,
    };
  }

  const buyPoint = baseMonthlyPoints[buyMonth];
  const propertyPurchasePrice = buyPoint.propertyPrice;
  const effectiveDepositPct =
    property.minimum_deposit_pct !== undefined && property.minimum_deposit_pct !== null
      ? property.minimum_deposit_pct
      : property.deposit_eur && property.target_price_eur > 0
      ? property.deposit_eur / property.target_price_eur
      : 0.10;
  const depositPaid = propertyPurchasePrice * effectiveDepositPct + buyPoint.borrowingShortfall;
  const stampDutyPaid = buyPoint.stampDuty;
  const closingFeesPaid = property.legal_and_closing_fees_eur;
  const totalUpfrontPaid = depositPaid + stampDutyPaid + closingFeesPaid;
  const initialMortgagePrincipal = propertyPurchasePrice - depositPaid;

  const totalSafetyBufferEur =
    (liquid_assets.cash_safety_buffer_eur || 0) +
    (liquid_assets.cash_safety_buffer_usd || 0) * (buyPoint.fxRate || macro.eur_usd_spot);

  // Capital withdrawal waterfall at buyMonth: Usable Cash -> Base Inv -> GSU Pool -> (Safety Buffer protected)
  let cashAfterBuy = buyPoint.cash;
  let invAfterBuy = buyPoint.investments;
  let gsuAfterBuy = buyPoint.gsuPool;
  let remainingNeeded = totalUpfrontPaid;

  // 1. Withdraw from Cash (protecting emergency safety pot)
  const usableCash = Math.max(0, cashAfterBuy - totalSafetyBufferEur);
  const cashUsed = Math.min(usableCash, remainingNeeded);
  cashAfterBuy -= cashUsed;
  remainingNeeded -= cashUsed;

  // 2. Withdraw from Investments
  if (remainingNeeded > 0) {
    const invUsed = Math.min(invAfterBuy, remainingNeeded);
    invAfterBuy -= invUsed;
    remainingNeeded -= invUsed;
  }

  // 3. Withdraw from GSU Pool
  if (remainingNeeded > 0) {
    const gsuUsed = Math.min(gsuAfterBuy, remainingNeeded);
    gsuAfterBuy -= gsuUsed;
    remainingNeeded -= gsuUsed;
  }

  // 4. Emergency fallback (only if total liquid < upfront needed)
  if (remainingNeeded > 0) {
    const emergencyCashUsed = Math.min(cashAfterBuy, remainingNeeded);
    cashAfterBuy -= emergencyCashUsed;
    remainingNeeded -= emergencyCashUsed;
  }

  const monthsUnderMortgage = forecastMonths - buyMonth;
  const amort = calculateMortgageAmortization(
    initialMortgagePrincipal,
    mortgage.mortgage_interest_rate,
    mortgage.mortgage_term_years,
    monthsUnderMortgage
  );

  let currentCash = cashAfterBuy;
  let currentInv = invAfterBuy;
  let currentGsu = gsuAfterBuy;
  let currentPropValue = propertyPurchasePrice;
  let currentRent = buyPoint.monthlyRent;
  let cumulativeRentPaid = buyPoint.cumulativeRent;
  let cumulativeMaintenancePaid = 0;

  for (let m = buyMonth + 1; m <= forecastMonths; m++) {
    currentPropValue *= propMonthlyMult;
    currentInv *= invMonthlyMult;

    const stockPriceAtM = equity_engine.current_share_price_usd * Math.pow(1 + equity_engine.stock_yearly_growth_rate, m / 12);
    const fxAtM = macro.eur_usd_spot * Math.pow(1 + (macro.eur_usd_yearly_drift || 0), m / 12);

    const vestEvents = getVestingMilestonesForMonth(
      m,
      meta.start_date,
      equity_engine.grants,
      stockPriceAtM,
      fxAtM,
      equity_engine.marginal_tax_rate_ireland
    );
    const netVestEur = vestEvents.reduce((sum, e) => sum + e.netAmountEur, 0);
    currentGsu = currentGsu * stockMonthlyMult + netVestEur;

    // Monthly maintenance
    const monthlyMaintenance = (currentPropValue * mortgage.yearly_maintenance_rate) / 12;
    cumulativeMaintenancePaid += monthlyMaintenance;

    // Post-purchase cashflow adjustment:
    const currentDate = addMonthsToDate(meta.start_date, m);
    const dateStr = currentDate.toISOString().slice(0, 7);
    const activeSalary = getSalaryAtDate(dateStr, mortgage);

    let monthlySavings = liquid_assets.monthly_salary_savings_eur;
    if (config.tax && config.tax.savings_calculation_mode === 'net_pay_derived') {
      const taxBreakdown = calculateIrishTaxBreakdown(activeSalary.baseSalary, config.tax);
      const livingExpenses = config.tax.monthly_living_expenses_eur ?? 2500;
      // Post-purchase savings: Net Take-Home - Mortgage - Maintenance - Living Expenses
      monthlySavings = Math.max(0, taxBreakdown.netMonthlyTakeHome - (amort.monthlyPayment + monthlyMaintenance) - livingExpenses);
    } else {
      // User stops paying rent, pays mortgage + maintenance
      const savingsDelta = currentRent - (amort.monthlyPayment + monthlyMaintenance);
      monthlySavings = Math.max(0, liquid_assets.monthly_salary_savings_eur + savingsDelta);
    }
    currentCash += monthlySavings;

    currentRent *= rentMonthlyMult;
  }

  const remainingLiquidWealthAtM60 = currentCash + currentInv + currentGsu;
  const propertyValueAtM60 = currentPropValue;
  const remainingMortgageBalanceAtM60 = amort.remainingBalance;
  const homeEquityAtM60 = Math.max(0, propertyValueAtM60 - remainingMortgageBalanceAtM60);
  const totalNetWealthAtM60 = remainingLiquidWealthAtM60 + homeEquityAtM60;

  return {
    remainingLiquidWealthAtM60,
    cumulativeRentPaid,
    cumulativeMortgageInterestPaid: amort.cumulativeInterestPaid,
    cumulativeMortgagePrincipalPaid: amort.cumulativePrincipalPaid,
    cumulativeMaintenancePaid,
    propertyValueAtM60,
    remainingMortgageBalanceAtM60,
    homeEquityAtM60,
    totalNetWealthAtM60,
    monthlyMortgagePayment: amort.monthlyPayment,
    initialMortgagePrincipal,
    depositPaid,
    stampDutyPaid,
    closingFeesPaid,
    totalUpfrontPaid,
    propertyPurchasePrice,
  };
}

export function runDecisionAnalysis(
  config: SimulationConfig,
  monthlyPoints: MonthlyDataPoint[]
): DecisionComparison {
  const earliestPoint = monthlyPoints.find((p) => p.isAffordable);
  const earliestBuyMonth = earliestPoint ? earliestPoint.month : null;

  if (earliestBuyMonth === null) {
    const rentSim = simulateTrajectoryForPurchaseMonth(null, config, monthlyPoints);
    return {
      earliestBuyMonth: null,
      earliestBuyDate: null,
      recommendedAction: 'unaffordable',
      recommendationReason: 'Target property is not affordable within the 60-month simulation horizon with current assets and compensation.',
      scenarios: [
        {
          id: 'rent_only',
          timingLabel: 'Rent All 60 Months',
          buyMonth: null,
          buyDate: null,
          ...rentSim,
          netWealthDeltaVsBuyAsap: 0,
        },
      ],
      deltas: { delta12m: null, delta24m: null, delta36m: null, deltaRent: null },
    };
  }

  const buyAsapSim = simulateTrajectoryForPurchaseMonth(earliestBuyMonth, config, monthlyPoints);
  const scenarios: PurchaseScenario[] = [];

  // 1. Buy ASAP
  const buyAsapScenario: PurchaseScenario = {
    id: 'buy_asap',
    timingLabel: `Buy at Month ${earliestBuyMonth} (Earliest)`,
    buyMonth: earliestBuyMonth,
    buyDate: baseMonthToDate(config.meta.start_date, earliestBuyMonth),
    ...buyAsapSim,
    netWealthDeltaVsBuyAsap: 0,
  };
  scenarios.push(buyAsapScenario);

  // 2. Wait +12 Months
  let delta12m: number | null = null;
  const m12 = earliestBuyMonth + 12;
  if (m12 <= config.meta.forecast_months) {
    const sim12 = simulateTrajectoryForPurchaseMonth(m12, config, monthlyPoints);
    delta12m = sim12.totalNetWealthAtM60 - buyAsapSim.totalNetWealthAtM60;
    scenarios.push({
      id: 'wait_12m',
      timingLabel: `Wait 12 Mo (Month ${m12})`,
      buyMonth: m12,
      buyDate: baseMonthToDate(config.meta.start_date, m12),
      ...sim12,
      netWealthDeltaVsBuyAsap: delta12m,
    });
  }

  // 3. Wait +24 Months
  let delta24m: number | null = null;
  const m24 = earliestBuyMonth + 24;
  if (m24 <= config.meta.forecast_months) {
    const sim24 = simulateTrajectoryForPurchaseMonth(m24, config, monthlyPoints);
    delta24m = sim24.totalNetWealthAtM60 - buyAsapSim.totalNetWealthAtM60;
    scenarios.push({
      id: 'wait_24m',
      timingLabel: `Wait 24 Mo (Month ${m24})`,
      buyMonth: m24,
      buyDate: baseMonthToDate(config.meta.start_date, m24),
      ...sim24,
      netWealthDeltaVsBuyAsap: delta24m,
    });
  }

  // 4. Wait +36 Months
  let delta36m: number | null = null;
  const m36 = earliestBuyMonth + 36;
  if (m36 <= config.meta.forecast_months) {
    const sim36 = simulateTrajectoryForPurchaseMonth(m36, config, monthlyPoints);
    delta36m = sim36.totalNetWealthAtM60 - buyAsapSim.totalNetWealthAtM60;
    scenarios.push({
      id: 'wait_36m',
      timingLabel: `Wait 36 Mo (Month ${m36})`,
      buyMonth: m36,
      buyDate: baseMonthToDate(config.meta.start_date, m36),
      ...sim36,
      netWealthDeltaVsBuyAsap: delta36m,
    });
  }

  // 5. Rent & Compound All 60 Months
  const rentSim = simulateTrajectoryForPurchaseMonth(null, config, monthlyPoints);
  const deltaRent = rentSim.totalNetWealthAtM60 - buyAsapSim.totalNetWealthAtM60;
  scenarios.push({
    id: 'rent_all_60m',
    timingLabel: 'Rent All 60 Months (Never Buy)',
    buyMonth: null,
    buyDate: null,
    ...rentSim,
    netWealthDeltaVsBuyAsap: deltaRent,
  });

  // Decision Recommendation Rule
  const maxWaitDelta = Math.max(delta12m ?? -Infinity, delta24m ?? -Infinity, delta36m ?? -Infinity);
  const recommendedAction = maxWaitDelta > 5000 ? 'wait_and_compound' : 'buy_asap';

  let recommendationReason = '';
  if (recommendedAction === 'wait_and_compound') {
    const bestScenario = scenarios.find((s) => s.netWealthDeltaVsBuyAsap === maxWaitDelta);
    recommendationReason = `Waiting and compounding equity delivers a net wealth advantage of +€${Math.round(maxWaitDelta).toLocaleString()} by Year 5 (${bestScenario?.timingLabel}). Tech stock and investment returns outpace Dublin property inflation and rental drag.`;
  } else {
    recommendationReason = `Purchasing at Month ${earliestBuyMonth} maximizes Year 5 wealth. Locking in property valuation and eliminating monthly rent friction saves more than potential equity appreciation.`;
  }

  return {
    earliestBuyMonth,
    earliestBuyDate: baseMonthToDate(config.meta.start_date, earliestBuyMonth),
    recommendedAction,
    recommendationReason,
    scenarios,
    deltas: {
      delta12m,
      delta24m,
      delta36m,
      deltaRent,
    },
  };
}

function baseMonthToDate(startDateStr: string, month: number): string {
  const d = addMonthsToDate(startDateStr, month);
  return d.toISOString().slice(0, 7);
}
