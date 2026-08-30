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

export function getHistoricalBenchmarkRates(dateStr: string): HistoricalRateBenchmark {
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1] || '1', 10);

  if (year <= 2023) {
    return { priceUsd: 130.0, fxRate: 0.92, label: '2023 Benchmark' };
  }
  if (year === 2024) {
    if (month <= 4) return { priceUsd: 145.0, fxRate: 0.92, label: 'Q1 2024 Benchmark' };
    if (month <= 8) return { priceUsd: 175.0, fxRate: 0.92, label: 'Mid 2024 Benchmark' };
    return { priceUsd: 168.0, fxRate: 0.93, label: 'Q4 2024 Benchmark' };
  }
  if (year === 2025) {
    if (month <= 4) return { priceUsd: 182.0, fxRate: 0.95, label: 'Q1 2025 Benchmark' };
    if (month <= 8) return { priceUsd: 185.0, fxRate: 0.92, label: 'Mid 2025 Benchmark' };
    return { priceUsd: 195.0, fxRate: 0.91, label: 'Q4 2025 Benchmark' };
  }
  if (year === 2026 && month <= 6) {
    return { priceUsd: 190.0, fxRate: 0.91, label: 'Early 2026 Benchmark' };
  }
  return { priceUsd: 185.0, fxRate: 0.91, label: 'Current Benchmark' };
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

  if (monthOffset <= 0) {
    const historical = getHistoricalBenchmarkRates(dateStr);
    return {
      projectedStockPriceUsd: currentSharePriceUsd || historical.priceUsd,
      projectedFxRate: eurUsdSpot || historical.fxRate,
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

