import { MonthlyDataPoint, SimulationConfig, StampDutyTier } from './types';
import { reconcileHistoricalGrants, getVestingMilestonesForMonth, addMonthsToDate } from './vesting';
import { calculateMaxBorrowingCapacity } from './mortgage';

export function calculateStampDuty(
  propertyPrice: number,
  tiers?: StampDutyTier[]
): number {
  if (propertyPrice <= 0) return 0;
  if (!tiers || tiers.length === 0) {
    if (propertyPrice <= 1000000) {
      return propertyPrice * 0.01;
    }
    return 1000000 * 0.01 + (propertyPrice - 1000000) * 0.02;
  }

  let totalDuty = 0;
  let previousLimit = 0;

  for (const tier of tiers) {
    if (tier.up_to !== null) {
      if (propertyPrice > previousLimit) {
        const taxableAmount = Math.min(propertyPrice, tier.up_to) - previousLimit;
        totalDuty += taxableAmount * tier.rate;
        previousLimit = tier.up_to;
      }
    } else {
      if (propertyPrice > previousLimit) {
        const taxableAmount = propertyPrice - previousLimit;
        totalDuty += taxableAmount * tier.rate;
      }
    }
  }

  return totalDuty;
}

export function runSimulation(config: SimulationConfig): MonthlyDataPoint[] {
  const points: MonthlyDataPoint[] = [];
  const { meta, property, mortgage, liquid_assets, equity_engine, macro } = config;

  const propMonthlyMult = Math.pow(1 + property.yearly_growth_rate, 1 / 12);
  const invMonthlyMult = Math.pow(1 + liquid_assets.investments_yearly_growth_rate, 1 / 12);
  const stockMonthlyMult = Math.pow(1 + equity_engine.stock_yearly_growth_rate, 1 / 12);
  const rentMonthlyMult = Math.pow(1 + (macro.rent_yearly_growth_rate || 0), 1 / 12);

  // Month 0 Initialization
  const recon = reconcileHistoricalGrants(
    equity_engine.grants,
    meta.start_date,
    equity_engine.marginal_tax_rate_ireland
  );

  let currentPropPrice = property.target_price_eur;
  let currentStockPrice = equity_engine.current_share_price_usd;
  let currentFx = macro.eur_usd_spot;
  let currentCash = liquid_assets.cash_eur + liquid_assets.cash_usd * currentFx;
  let currentInv = liquid_assets.investments_eur + liquid_assets.investments_usd * currentFx;
  let currentGsuPool = recon.totalRetainedVestedShares * currentStockPrice * currentFx;
  let currentRent = macro.current_monthly_rent_eur;
  let cumulativeRent = 0;

  const maxMortgage = calculateMaxBorrowingCapacity(
    mortgage.buyer_gross_annual_salary_eur,
    mortgage.cbi_max_lti_multiple
  );

  for (let m = 0; m <= meta.forecast_months; m++) {
    const currentDate = addMonthsToDate(meta.start_date, m);
    const dateStr = currentDate.toISOString().slice(0, 7); // YYYY-MM

    if (m > 0) {
      currentPropPrice *= propMonthlyMult;
      currentStockPrice = equity_engine.current_share_price_usd * Math.pow(1 + equity_engine.stock_yearly_growth_rate, m / 12);
      currentFx = macro.eur_usd_spot * Math.pow(1 + (macro.eur_usd_yearly_drift || 0), m / 12);
      currentInv *= invMonthlyMult;
      currentCash += liquid_assets.monthly_salary_savings_eur;
      currentRent *= rentMonthlyMult;
      cumulativeRent += currentRent;
    }

    const vestEvents = getVestingMilestonesForMonth(
      m,
      meta.start_date,
      equity_engine.grants,
      currentStockPrice,
      currentFx,
      equity_engine.marginal_tax_rate_ireland
    );

    const netVestEur = vestEvents.reduce((sum, e) => sum + e.netAmountEur, 0);
    if (m > 0) {
      currentGsuPool = currentGsuPool * stockMonthlyMult + netVestEur;
    }

    const retainedShares = currentStockPrice * currentFx > 0 ? currentGsuPool / (currentStockPrice * currentFx) : 0;
    const totalLiquidWealth = currentCash + currentInv + currentGsuPool;

    const stampDuty = calculateStampDuty(currentPropPrice, property.stamp_duty_tiers);
    const baseRequiredDeposit = currentPropPrice * property.minimum_deposit_pct;
    const requiredLoan = currentPropPrice - baseRequiredDeposit;
    const borrowingShortfall = Math.max(0, requiredLoan - maxMortgage);
    const targetCapital = baseRequiredDeposit + stampDuty + property.legal_and_closing_fees_eur + borrowingShortfall;

    const surplus = totalLiquidWealth - targetCapital;
    const isAffordable = surplus >= 0;

    points.push({
      month: m,
      date: dateStr,
      propertyPrice: currentPropPrice,
      stampDuty,
      targetCapital,
      cash: currentCash,
      investments: currentInv,
      gsuPool: currentGsuPool,
      retainedShares,
      stockPriceUsd: currentStockPrice,
      fxRate: currentFx,
      totalLiquidWealth,
      surplus,
      isAffordable,
      vestEvents,
      monthlyRent: currentRent,
      cumulativeRent,
      maxMortgageAvailable: maxMortgage,
      borrowingShortfall,
    });
  }

  return points;
}
