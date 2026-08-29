import { Grant, MonthlyVestEvent } from './types';

export interface HistoricalReconciliation {
  totalRetainedVestedShares: number;
  pastVestsCount: number;
  remainingGrants: Grant[];
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

export function reconcileHistoricalGrants(
  grants: Grant[],
  startDateStr: string,
  taxRate: number
): HistoricalReconciliation {
  let totalRetainedVestedShares = 0;
  let pastVestsCount = 0;

  for (const grant of grants) {
    grant.schedule_percents.forEach((pct, idx) => {
      const milestoneMonths = (idx + 1) * grant.vest_frequency_months;
      const milestoneDate = addMonthsToDate(grant.grant_date, milestoneMonths);

      // If milestone date occurred on or before the start date month
      const offset = getCalendarMonthOffset(startDateStr, milestoneDate);
      if (offset <= 0) {
        const grossShares = grant.total_shares * pct;
        const netShares = grossShares * (1 - taxRate);
        totalRetainedVestedShares += netShares;
        pastVestsCount++;
      }
    });
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
    grant.schedule_percents.forEach((pct, idx) => {
      const milestoneMonths = (idx + 1) * grant.vest_frequency_months;
      const milestoneDate = addMonthsToDate(grant.grant_date, milestoneMonths);
      const diffMonths = getCalendarMonthOffset(startDateStr, milestoneDate);

      if (diffMonths === simulationMonth) {
        const grossShares = grant.total_shares * pct;
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
    });
  }

  return events;
}
