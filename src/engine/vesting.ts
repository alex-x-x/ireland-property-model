import { Grant, MonthlyVestEvent } from './types';

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
  const d = new Date(dateStr);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  return d;
}

export function getCalendarMonthOffset(startDateStr: string, targetDate: Date): number {
  const start = new Date(startDateStr);
  return (targetDate.getFullYear() - start.getFullYear()) * 12 + (targetDate.getMonth() - start.getMonth());
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
  taxRate: number
): HistoricalReconciliation {
  let totalRetainedVestedShares = 0;
  let pastVestsCount = 0;

  for (const grant of grants) {
    const milestones = getGrantMilestones(grant);
    for (const milestone of milestones) {
      const milestoneDate = addMonthsToDate(grant.grant_date, milestone.milestoneMonthOffset);
      const offset = getCalendarMonthOffset(startDateStr, milestoneDate);
      if (offset <= 0) {
        const grossShares = grant.total_shares * milestone.percent;
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
  taxRate: number
): MonthlyVestEvent[] {
  if (simulationMonth <= 0) return [];
  const events: MonthlyVestEvent[] = [];

  for (const grant of grants) {
    const milestones = getGrantMilestones(grant);
    for (const milestone of milestones) {
      const milestoneDate = addMonthsToDate(grant.grant_date, milestone.milestoneMonthOffset);
      const diffMonths = getCalendarMonthOffset(startDateStr, milestoneDate);

      if (diffMonths === simulationMonth) {
        const grossShares = grant.total_shares * milestone.percent;
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
