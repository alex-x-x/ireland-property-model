import { describe, it, expect } from 'vitest';
import { reconcileHistoricalGrants, getVestingMilestonesForMonth } from '../src/engine/vesting';
import { Grant } from '../src/engine/types';

describe('Vesting Engine', () => {
  const initialGrant: Grant = {
    id: 'initial_grant',
    type: 'initial',
    grant_date: '2024-08-01',
    total_shares: 1000,
    schedule_percents: [0.33, 0.33, 0.22, 0.12],
    vest_frequency_months: 12,
  };

  const refresherGrant: Grant = {
    id: 'refresher_2025',
    type: 'refresher',
    grant_date: '2025-08-01',
    total_shares: 200,
    schedule_percents: [0.25, 0.25, 0.25, 0.25],
    vest_frequency_months: 3,
  };

  it('reconciles historical vests prior to start_date accurately', () => {
    const startDate = '2026-08-29';
    const reconciliation = reconcileHistoricalGrants([initialGrant, refresherGrant], startDate, 0.52);

    expect(reconciliation.totalRetainedVestedShares).toBeCloseTo(412.8, 1);
    expect(reconciliation.pastVestsCount).toBe(6);
  });

  it('correctly maps future vesting milestones for simulation months', () => {
    const startDate = '2026-08-29';
    // For Month 12 (~August 2027), initial grant Year 3 vest (22% = 220 shares) should trigger
    const eventsM12 = getVestingMilestonesForMonth(12, startDate, [initialGrant], 150, 0.91, 0.52);
    expect(eventsM12.length).toBe(1);
    expect(eventsM12[0].grossShares).toBeCloseTo(220, 1);
    expect(eventsM12[0].netShares).toBeCloseTo(105.6, 1); // 220 * 0.48
    expect(eventsM12[0].netAmountEur).toBeCloseTo(105.6 * 150 * 0.91, 1);
  });

  it('handles brand new future grant with zero past vests', () => {
    const futureGrant: Grant = {
      id: 'future_2027',
      type: 'refresher',
      grant_date: '2027-01-01',
      total_shares: 400,
      schedule_percents: [0.25, 0.25, 0.25, 0.25],
      vest_frequency_months: 3,
    };
    const reconciliation = reconcileHistoricalGrants([futureGrant], '2026-08-29', 0.52);
    expect(reconciliation.totalRetainedVestedShares).toBe(0);
    expect(reconciliation.pastVestsCount).toBe(0);

    // 1st vest occurs in April 2027 (Month 8 from Aug 2026)
    const eventsM8 = getVestingMilestonesForMonth(8, '2026-08-29', [futureGrant], 200, 0.90, 0.52);
    expect(eventsM8.length).toBe(1);
    expect(eventsM8[0].grossShares).toBe(100);
    expect(eventsM8[0].netShares).toBe(48);
  });

  it('correctly models monthly vesting schedule (12 vests/yr) for Google GSUs', () => {
    const monthlyGrant: Grant = {
      id: 'google_initial',
      type: 'initial',
      grant_date: '2026-08-01',
      total_shares: 1200, // 33% = 396 shs in Yr 1 (33 shs/mo)
      schedule_percents: [0.33, 0.33, 0.22, 0.12],
      vest_frequency_months: 1, // Monthly
    };

    // Month 1 (Sept 2026): 33 gross shares vest
    const eventsM1 = getVestingMilestonesForMonth(1, '2026-08-01', [monthlyGrant], 160, 0.90, 0.52);
    expect(eventsM1.length).toBe(1);
    expect(eventsM1[0].grossShares).toBeCloseTo(33, 1);
    expect(eventsM1[0].netShares).toBeCloseTo(33 * 0.48, 1); // 15.84 net retained shares
  });
});
