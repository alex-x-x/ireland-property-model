import { Grant, MonthlyVestEvent } from './types';

export interface MarketRateContext {
  currentSharePriceUsd: number;
  stockYearlyGrowthRate?: number;
  eurUsdSpot?: number;
  eurUsdYearlyDrift?: number;
}

export interface HistoricalReconciliation {
  totalRetainedVestedShares: number;
  pastVestsCount: number;
  remainingGrants: Grant[];
}

export interface ExpandedVestMilestone {
  milestoneMonthOffset: number; // months from grant_date
  percent: number; // fraction of total_shares
}

export function addMonthsToDate(dateStr: string, months: number): Date {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2] || '1', 10);

  // Set to 1st of month first to prevent month overflow (e.g. Aug 31 -> Feb 28)
  const d = new Date(Date.UTC(year, month + months, 1));
  const maxDaysInTargetMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, maxDaysInTargetMonth));
  return d;
}

export function getCalendarMonthOffset(startDateStr: string, targetDate: Date): number {
  const parts = startDateStr.split('-');
  const startYear = parseInt(parts[0], 10);
  const startMonth = parseInt(parts[1], 10) - 1;
  const targetYear = targetDate.getUTCFullYear();
  const targetMonth = targetDate.getUTCMonth();
  return (targetYear - startYear) * 12 + (targetMonth - startMonth);
}

export interface HistoricalRateBenchmark {
  priceUsd: number;
  fxRate: number;
  label: string;
}

// Irish Tech / Google GSU compensation standard:
// Grants issued in month M use the average closing price & ECB FX rate of preceding month (M - 1).
const PRECEDING_MONTH_BENCHMARKS: Record<string, { priceUsd: number; fxRate: number; precedingMonthName: string }> = {
  // 2023 Grants (Preceding month: Dec 2022 - Nov 2023)
  '2023-01': { priceUsd: 89.50, fxRate: 0.945, precedingMonthName: 'Dec 2022' },
  '2023-02': { priceUsd: 92.00, fxRate: 0.925, precedingMonthName: 'Jan 2023' },
  '2023-03': { priceUsd: 96.50, fxRate: 0.933, precedingMonthName: 'Feb 2023' },
  '2023-04': { priceUsd: 100.20, fxRate: 0.935, precedingMonthName: 'Mar 2023' },
  '2023-05': { priceUsd: 106.50, fxRate: 0.912, precedingMonthName: 'Apr 2023' },
  '2023-06': { priceUsd: 122.00, fxRate: 0.920, precedingMonthName: 'May 2023' },
  '2023-07': { priceUsd: 123.50, fxRate: 0.922, precedingMonthName: 'Jun 2023' },
  '2023-08': { priceUsd: 122.00, fxRate: 0.905, precedingMonthName: 'Jul 2023' },
  '2023-09': { priceUsd: 130.50, fxRate: 0.916, precedingMonthName: 'Aug 2023' },
  '2023-10': { priceUsd: 135.20, fxRate: 0.937, precedingMonthName: 'Sep 2023' },
  '2023-11': { priceUsd: 137.00, fxRate: 0.947, precedingMonthName: 'Oct 2023' },
  '2023-12': { priceUsd: 133.50, fxRate: 0.926, precedingMonthName: 'Nov 2023' },

  // 2024 Grants (Preceding month: Dec 2023 - Nov 2024)
  '2024-01': { priceUsd: 135.00, fxRate: 0.916, precedingMonthName: 'Dec 2023' },
  '2024-02': { priceUsd: 145.20, fxRate: 0.917, precedingMonthName: 'Jan 2024' },
  '2024-03': { priceUsd: 144.50, fxRate: 0.926, precedingMonthName: 'Feb 2024' },
  '2024-04': { priceUsd: 145.00, fxRate: 0.920, precedingMonthName: 'Mar 2024' },
  '2024-05': { priceUsd: 158.00, fxRate: 0.932, precedingMonthName: 'Apr 2024' },
  '2024-06': { priceUsd: 174.50, fxRate: 0.924, precedingMonthName: 'May 2024' },
  '2024-07': { priceUsd: 180.20, fxRate: 0.930, precedingMonthName: 'Jun 2024' },
  '2024-08': { priceUsd: 183.00, fxRate: 0.921, precedingMonthName: 'Jul 2024' },
  '2024-09': { priceUsd: 164.50, fxRate: 0.908, precedingMonthName: 'Aug 2024' },
  '2024-10': { priceUsd: 158.50, fxRate: 0.900, precedingMonthName: 'Sep 2024' },
  '2024-11': { priceUsd: 166.00, fxRate: 0.920, precedingMonthName: 'Oct 2024' },
  '2024-12': { priceUsd: 176.50, fxRate: 0.948, precedingMonthName: 'Nov 2024' },

  // 2025 Grants (Preceding month: Dec 2024 - Nov 2025)
  '2025-01': { priceUsd: 188.50, fxRate: 0.955, precedingMonthName: 'Dec 2024' },
  '2025-02': { priceUsd: 194.00, fxRate: 0.965, precedingMonthName: 'Jan 2025' },
  '2025-03': { priceUsd: 185.00, fxRate: 0.960, precedingMonthName: 'Feb 2025' },
  '2025-04': { priceUsd: 172.50, fxRate: 0.935, precedingMonthName: 'Mar 2025' },
  '2025-05': { priceUsd: 164.00, fxRate: 0.920, precedingMonthName: 'Apr 2025' },
  '2025-06': { priceUsd: 172.00, fxRate: 0.925, precedingMonthName: 'May 2025' },
  '2025-07': { priceUsd: 180.00, fxRate: 0.928, precedingMonthName: 'Jun 2025' },
  '2025-08': { priceUsd: 192.00, fxRate: 0.918, precedingMonthName: 'Jul 2025' },
  '2025-09': { priceUsd: 188.00, fxRate: 0.910, precedingMonthName: 'Aug 2025' },
  '2025-10': { priceUsd: 195.00, fxRate: 0.905, precedingMonthName: 'Sep 2025' },
  '2025-11': { priceUsd: 205.00, fxRate: 0.912, precedingMonthName: 'Oct 2025' },
  '2025-12': { priceUsd: 215.00, fxRate: 0.915, precedingMonthName: 'Nov 2025' },

  // 2026 Grants (Preceding month: Dec 2025 - Jul 2026)
  '2026-01': { priceUsd: 220.00, fxRate: 0.915, precedingMonthName: 'Dec 2025' },
  '2026-02': { priceUsd: 230.00, fxRate: 0.910, precedingMonthName: 'Jan 2026' },
  '2026-03': { priceUsd: 238.00, fxRate: 0.905, precedingMonthName: 'Feb 2026' },
  '2026-04': { priceUsd: 242.00, fxRate: 0.900, precedingMonthName: 'Mar 2026' },
  '2026-05': { priceUsd: 245.00, fxRate: 0.895, precedingMonthName: 'Apr 2026' },
  '2026-06': { priceUsd: 248.00, fxRate: 0.890, precedingMonthName: 'May 2026' },
  '2026-07': { priceUsd: 250.00, fxRate: 0.885, precedingMonthName: 'Jun 2026' },
  '2026-08': { priceUsd: 250.00, fxRate: 0.910, precedingMonthName: 'Jul 2026' },
};

export function getHistoricalBenchmarkRates(dateStr: string): HistoricalRateBenchmark {
  const ym = dateStr.slice(0, 7);
  const match = PRECEDING_MONTH_BENCHMARKS[ym];
  if (match) {
    return {
      priceUsd: match.priceUsd,
      fxRate: match.fxRate,
      label: `${match.precedingMonthName} Avg`,
    };
  }

  const year = parseInt(dateStr.slice(0, 4), 10);
  if (year <= 2022) {
    return { priceUsd: 90.0, fxRate: 0.945, label: 'Pre-2023 Avg' };
  }

  return { priceUsd: 185.0, fxRate: 0.910, label: 'Benchmark Avg' };
}

export function getProjectedMarketRatesAtDate(
  dateStr: string,
  startDateStr: string,
  currentSharePriceUsd: number,
  stockYearlyGrowthRate: number = 0,
  eurUsdSpot: number = 0.91,
  eurUsdYearlyDrift: number = 0
): { projectedStockPriceUsd: number; projectedFxRate: number; monthOffset: number } {
  const parts = dateStr.split('-');
  const d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2] || '1', 10)));
  const monthOffset = getCalendarMonthOffset(startDateStr, d);

  if (monthOffset < 0) {
    const historical = getHistoricalBenchmarkRates(dateStr);
    return {
      projectedStockPriceUsd: historical.priceUsd,
      projectedFxRate: historical.fxRate,
      monthOffset,
    };
  }

  const projectedStockPriceUsd = currentSharePriceUsd * Math.pow(1 + stockYearlyGrowthRate, monthOffset / 12);
  const projectedFxRate = eurUsdSpot * Math.pow(1 + eurUsdYearlyDrift, monthOffset / 12);

  return {
    projectedStockPriceUsd,
    projectedFxRate,
    monthOffset,
  };
}

export function resolveEffectiveGrantShares(
  grant: Grant,
  startDateStr: string,
  marketContext?: MarketRateContext
): number {
  if (grant.nomination_mode === 'eur' && grant.target_value_eur && grant.target_value_eur > 0) {
    const currentPrice = marketContext?.currentSharePriceUsd ?? 150;
    const stockGrowth = marketContext?.stockYearlyGrowthRate ?? 0;
    const spotFx = marketContext?.eurUsdSpot ?? 0.91;
    const fxDrift = marketContext?.eurUsdYearlyDrift ?? 0;

    const projected = getProjectedMarketRatesAtDate(
      grant.grant_date,
      startDateStr,
      currentPrice,
      stockGrowth,
      spotFx,
      fxDrift
    );

    const priceUsd = grant.grant_price_usd && grant.grant_price_usd > 0
      ? grant.grant_price_usd
      : projected.projectedStockPriceUsd;

    const fxRate = grant.grant_fx_rate && grant.grant_fx_rate > 0
      ? grant.grant_fx_rate
      : projected.projectedFxRate;

    if (priceUsd <= 0 || fxRate <= 0) return grant.total_shares || 0;

    const priceEur = priceUsd * fxRate;
    return Math.floor(grant.target_value_eur / priceEur);
  }

  if (grant.nomination_mode === 'usd' && grant.target_value_usd && grant.target_value_usd > 0) {
    const currentPrice = marketContext?.currentSharePriceUsd ?? 150;
    const stockGrowth = marketContext?.stockYearlyGrowthRate ?? 0;
    const spotFx = marketContext?.eurUsdSpot ?? 0.91;
    const fxDrift = marketContext?.eurUsdYearlyDrift ?? 0;

    const projected = getProjectedMarketRatesAtDate(
      grant.grant_date,
      startDateStr,
      currentPrice,
      stockGrowth,
      spotFx,
      fxDrift
    );

    const priceUsd = grant.grant_price_usd && grant.grant_price_usd > 0
      ? grant.grant_price_usd
      : projected.projectedStockPriceUsd;

    if (priceUsd <= 0) return grant.total_shares || 0;
    return Math.floor(grant.target_value_usd / priceUsd);
  }

  return grant.total_shares || 0;
}

export function getGrantMilestones(grant: Grant): ExpandedVestMilestone[] {
  // If schedule_percents has 4 elements (standard 4-year grant) and vest_frequency_months is 1 (monthly)
  if (grant.vest_frequency_months === 1 && grant.schedule_percents.length === 4) {
    const milestones: ExpandedVestMilestone[] = [];
    for (let year = 0; year < 4; year++) {
      const yearlyPct = grant.schedule_percents[year];
      const monthlyPct = yearlyPct / 12;
      for (let month = 1; month <= 12; month++) {
        milestones.push({
          milestoneMonthOffset: year * 12 + month,
          percent: monthlyPct,
        });
      }
    }
    return milestones;
  }

  // Standard direct mapping: each item in schedule_percents at (idx + 1) * vest_frequency_months
  return grant.schedule_percents.map((pct, idx) => ({
    milestoneMonthOffset: (idx + 1) * grant.vest_frequency_months,
    percent: pct,
  }));
}

export function reconcileHistoricalGrants(
  grants: Grant[],
  startDateStr: string,
  taxRate: number,
  marketContext?: MarketRateContext
): HistoricalReconciliation {
  let totalRetainedVestedShares = 0;
  let pastVestsCount = 0;

  for (const grant of grants) {
    const totalShares = resolveEffectiveGrantShares(grant, startDateStr, marketContext);
    const milestones = getGrantMilestones(grant);
    for (const milestone of milestones) {
      const milestoneDate = addMonthsToDate(grant.grant_date, milestone.milestoneMonthOffset);
      const offset = getCalendarMonthOffset(startDateStr, milestoneDate);
      if (offset <= 0) {
        const grossShares = totalShares * milestone.percent;
        const netShares = grossShares * (1 - taxRate);
        totalRetainedVestedShares += netShares;
        pastVestsCount++;
      }
    }
  }

  return {
    totalRetainedVestedShares,
    pastVestsCount,
    remainingGrants: grants,
  };
}

export function getVestingMilestonesForMonth(
  simulationMonth: number,
  startDateStr: string,
  grants: Grant[],
  sharePriceUsd: number,
  fxRate: number,
  taxRate: number,
  marketContext?: MarketRateContext
): MonthlyVestEvent[] {
  if (simulationMonth <= 0) return [];
  const events: MonthlyVestEvent[] = [];

  const ctx: MarketRateContext = marketContext ?? {
    currentSharePriceUsd: sharePriceUsd,
    eurUsdSpot: fxRate,
  };

  for (const grant of grants) {
    const totalShares = resolveEffectiveGrantShares(grant, startDateStr, ctx);
    const milestones = getGrantMilestones(grant);
    for (const milestone of milestones) {
      const milestoneDate = addMonthsToDate(grant.grant_date, milestone.milestoneMonthOffset);
      const diffMonths = getCalendarMonthOffset(startDateStr, milestoneDate);

      if (diffMonths === simulationMonth) {
        const grossShares = totalShares * milestone.percent;
        const netShares = grossShares * (1 - taxRate);
        const netAmountEur = netShares * sharePriceUsd * fxRate;

        events.push({
          grantId: grant.id,
          grantType: grant.type,
          grossShares,
          netShares,
          sharePriceUsd,
          netAmountEur,
        });
      }
    }
  }

  return events;
}

export interface GrantVestingSummary {
  totalGrantedShares: number;
  pastVestedGrossShares: number;
  unvestedGrossShares: number;
  unvestedWithinHorizonGrossShares: number;
  // Multi-currency valuation totals
  totalGrantedEur: number;
  totalGrantedUsd: number;
  unvestedGrossEur: number;
  unvestedGrossUsd: number;
  unvestedNetEur: number;
  unvestedNetUsd: number;
  pastVestedGrossEur: number;
  pastVestedGrossUsd: number;
  pastVestedNetEur: number;
  pastVestedNetUsd: number;
}

export function calculateGrantVestingSummary(
  grants: Grant[],
  startDateStr: string,
  horizonMonths: number = 60,
  marketContext?: MarketRateContext,
  taxRate: number = 0.52
): GrantVestingSummary {
  let totalGrantedShares = 0;
  let pastVestedGrossShares = 0;
  let unvestedGrossShares = 0;
  let unvestedWithinHorizonGrossShares = 0;

  let totalGrantedEur = 0;
  let totalGrantedUsd = 0;
  let unvestedGrossEur = 0;
  let unvestedGrossUsd = 0;
  let pastVestedGrossEur = 0;
  let pastVestedGrossUsd = 0;

  const currentPrice = marketContext?.currentSharePriceUsd ?? 150;
  const stockGrowth = marketContext?.stockYearlyGrowthRate ?? 0;
  const spotFx = marketContext?.eurUsdSpot ?? 0.91;
  const fxDrift = marketContext?.eurUsdYearlyDrift ?? 0;

  for (const grant of grants) {
    const totalShares = resolveEffectiveGrantShares(grant, startDateStr, marketContext);
    totalGrantedShares += totalShares;

    const projected = getProjectedMarketRatesAtDate(
      grant.grant_date,
      startDateStr,
      currentPrice,
      stockGrowth,
      spotFx,
      fxDrift
    );

    const priceUsd = grant.grant_price_usd && grant.grant_price_usd > 0
      ? grant.grant_price_usd
      : projected.projectedStockPriceUsd;

    const fxRate = grant.grant_fx_rate && grant.grant_fx_rate > 0
      ? grant.grant_fx_rate
      : projected.projectedFxRate;

    const grantValUsd = totalShares * priceUsd;
    const grantValEur = grantValUsd * fxRate;
    totalGrantedUsd += grantValUsd;
    totalGrantedEur += grantValEur;

    const milestones = getGrantMilestones(grant);
    for (const milestone of milestones) {
      const milestoneDate = addMonthsToDate(grant.grant_date, milestone.milestoneMonthOffset);
      const offset = getCalendarMonthOffset(startDateStr, milestoneDate);
      const grossShares = totalShares * milestone.percent;
      const milestoneUsd = grossShares * priceUsd;
      const milestoneEur = milestoneUsd * fxRate;

      if (offset <= 0) {
        pastVestedGrossShares += grossShares;
        pastVestedGrossUsd += milestoneUsd;
        pastVestedGrossEur += milestoneEur;
      } else {
        unvestedGrossShares += grossShares;
        unvestedGrossUsd += milestoneUsd;
        unvestedGrossEur += milestoneEur;
        if (offset <= horizonMonths) {
          unvestedWithinHorizonGrossShares += grossShares;
        }
      }
    }
  }

  const unvestedNetUsd = unvestedGrossUsd * (1 - taxRate);
  const unvestedNetEur = unvestedGrossEur * (1 - taxRate);
  const pastVestedNetUsd = pastVestedGrossUsd * (1 - taxRate);
  const pastVestedNetEur = pastVestedGrossEur * (1 - taxRate);

  return {
    totalGrantedShares: Math.round(totalGrantedShares),
    pastVestedGrossShares: Math.round(pastVestedGrossShares),
    unvestedGrossShares: Math.round(unvestedGrossShares),
    unvestedWithinHorizonGrossShares: Math.round(unvestedWithinHorizonGrossShares),
    totalGrantedEur: Math.round(totalGrantedEur),
    totalGrantedUsd: Math.round(totalGrantedUsd),
    unvestedGrossEur: Math.round(unvestedGrossEur),
    unvestedGrossUsd: Math.round(unvestedGrossUsd),
    unvestedNetEur: Math.round(unvestedNetEur),
    unvestedNetUsd: Math.round(unvestedNetUsd),
    pastVestedGrossEur: Math.round(pastVestedGrossEur),
    pastVestedGrossUsd: Math.round(pastVestedGrossUsd),
    pastVestedNetEur: Math.round(pastVestedNetEur),
    pastVestedNetUsd: Math.round(pastVestedNetUsd),
  };
}

export interface SingleGrantVestingBreakdown {
  totalShares: number;
  pastGross: number;
  unvestedGross: number;
  pastNet: number;
  unvestedNet: number;
  grantPriceUsd: number;
  grantFxRate: number;
  grantPriceEur: number;
  isHistorical: boolean;
  benchmarkPriceUsd: number;
  benchmarkFxRate: number;
  benchmarkLabel: string;
  totalGrossEur: number;
  totalGrossUsd: number;
  totalNetEur: number;
  totalNetUsd: number;
  unvestedGrossEur: number;
  unvestedGrossUsd: number;
  unvestedNetEur: number;
  unvestedNetUsd: number;
}

export function calculateSingleGrantVesting(
  grant: Grant,
  startDateStr: string,
  marketContext?: MarketRateContext,
  taxRate: number = 0.52
): SingleGrantVestingBreakdown {
  const totalShares = resolveEffectiveGrantShares(grant, startDateStr, marketContext);
  const currentPrice = marketContext?.currentSharePriceUsd ?? 150;
  const stockGrowth = marketContext?.stockYearlyGrowthRate ?? 0;
  const spotFx = marketContext?.eurUsdSpot ?? 0.91;
  const fxDrift = marketContext?.eurUsdYearlyDrift ?? 0;

  const projected = getProjectedMarketRatesAtDate(
    grant.grant_date,
    startDateStr,
    currentPrice,
    stockGrowth,
    spotFx,
    fxDrift
  );

  const historical = getHistoricalBenchmarkRates(grant.grant_date);
  const isHistorical = projected.monthOffset <= 0;

  const grantPriceUsd = grant.grant_price_usd && grant.grant_price_usd > 0
    ? grant.grant_price_usd
    : projected.projectedStockPriceUsd;

  const grantFxRate = grant.grant_fx_rate && grant.grant_fx_rate > 0
    ? grant.grant_fx_rate
    : projected.projectedFxRate;

  const grantPriceEur = grantPriceUsd * grantFxRate;

  const milestones = getGrantMilestones(grant);
  let pastGross = 0;
  let unvestedGross = 0;
  for (const milestone of milestones) {
    const milestoneDate = addMonthsToDate(grant.grant_date, milestone.milestoneMonthOffset);
    const offset = getCalendarMonthOffset(startDateStr, milestoneDate);
    const grossShares = totalShares * milestone.percent;
    if (offset <= 0) {
      pastGross += grossShares;
    } else {
      unvestedGross += grossShares;
    }
  }

  const pastNet = Math.round(pastGross * (1 - taxRate));
  const unvestedNet = Math.round(unvestedGross * (1 - taxRate));

  const totalGrossUsd = totalShares * grantPriceUsd;
  const totalGrossEur = totalGrossUsd * grantFxRate;
  const totalNetEur = totalGrossEur * (1 - taxRate);
  const totalNetUsd = totalGrossUsd * (1 - taxRate);

  const unvestedGrossUsd = unvestedGross * grantPriceUsd;
  const unvestedGrossEur = unvestedGrossUsd * grantFxRate;
  const unvestedNetEur = unvestedGrossEur * (1 - taxRate);
  const unvestedNetUsd = unvestedGrossUsd * (1 - taxRate);

  return {
    totalShares: Math.round(totalShares),
    pastGross: Math.round(pastGross),
    unvestedGross: Math.round(unvestedGross),
    pastNet,
    unvestedNet,
    grantPriceUsd,
    grantFxRate,
    grantPriceEur,
    isHistorical,
    benchmarkPriceUsd: historical.priceUsd,
    benchmarkFxRate: historical.fxRate,
    benchmarkLabel: historical.label,
    totalGrossEur: Math.round(totalGrossEur),
    totalGrossUsd: Math.round(totalGrossUsd),
    totalNetEur: Math.round(totalNetEur),
    totalNetUsd: Math.round(totalNetUsd),
    unvestedGrossEur: Math.round(unvestedGrossEur),
    unvestedGrossUsd: Math.round(unvestedGrossUsd),
    unvestedNetEur: Math.round(unvestedNetEur),
    unvestedNetUsd: Math.round(unvestedNetUsd),
  };
}

export interface GrantLifecycleEvent {
  month: number;
  date: string;
  type: 'grant_awarded' | 'grant_completed';
  grantId: string;
  grantName: string;
  grantType: 'initial' | 'refresher' | 'custom';
  totalShares: number;
  description: string;
}

export function getGrantLifecycleEvents(
  grants: Grant[],
  startDateStr: string,
  forecastMonths: number = 60,
  marketContext?: MarketRateContext
): GrantLifecycleEvent[] {
  const events: GrantLifecycleEvent[] = [];

  for (const grant of grants) {
    const totalShares = resolveEffectiveGrantShares(grant, startDateStr, marketContext);
    const grantName = grant.name || (grant.type === 'initial' ? 'Initial Hire Grant' : 'Refresher Grant');
    
    // 1. Grant Award Event (if within simulation horizon, m >= 0 and m <= forecastMonths)
    const grantAwardDateStr = grant.grant_date.slice(0, 7);
    const awardOffset = getCalendarMonthOffset(startDateStr, addMonthsToDate(grant.grant_date, 0));
    if (awardOffset >= 0 && awardOffset <= forecastMonths) {
      events.push({
        month: awardOffset,
        date: grantAwardDateStr,
        type: 'grant_awarded',
        grantId: grant.id,
        grantName,
        grantType: grant.type,
        totalShares,
        description: `New Grant Awarded: ${grantName} (${totalShares} shs)`,
      });
    }

    // 2. Grant Completion / Final Vest Event
    const milestones = getGrantMilestones(grant);
    if (milestones.length > 0) {
      const lastMilestone = milestones[milestones.length - 1];
      const finalDate = addMonthsToDate(grant.grant_date, lastMilestone.milestoneMonthOffset);
      const completionOffset = getCalendarMonthOffset(startDateStr, finalDate);
      const completionDateStr = finalDate.toISOString().slice(0, 7);

      if (completionOffset >= 0 && completionOffset <= forecastMonths) {
        events.push({
          month: completionOffset,
          date: completionDateStr,
          type: 'grant_completed',
          grantId: grant.id,
          grantName,
          grantType: grant.type,
          totalShares,
          description: `Grant Completed (Final Vest): ${grantName} (${totalShares} total shs)`,
        });
      }
    }
  }

  // Sort chronologically
  return events.sort((a, b) => a.month - b.month);
}

