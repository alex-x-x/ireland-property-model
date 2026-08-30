import { describe, it, expect } from 'vitest';
import {
  reconcileHistoricalGrants,
  getVestingMilestonesForMonth,
  addMonthsToDate,
  getCalendarMonthOffset,
  calculateGrantVestingSummary,
  calculateSingleGrantVesting,
} from '../src/engine/vesting';
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

  it('safely handles month-end dates and non-leap February dates without date overflow', () => {
    // August 31st + 6 months -> February 28th (not March!)
    const febDate = addMonthsToDate('2026-08-31', 6);
    expect(febDate.getUTCMonth()).toBe(1); // 1 = February
    expect(febDate.getUTCDate()).toBe(28);

    // Calendar month offset should be strictly 6
    const offset = getCalendarMonthOffset('2026-08-31', febDate);
    expect(offset).toBe(6);
  });

  it('aggregates multiple simultaneous vesting events in a single month', () => {
    const grantA: Grant = {
      id: 'grant_A',
      type: 'initial',
      grant_date: '2026-08-01',
      total_shares: 1200,
      schedule_percents: [0.33, 0.33, 0.22, 0.12],
      vest_frequency_months: 1, // 33 gross shs / mo
    };
    const grantB: Grant = {
      id: 'grant_B',
      type: 'refresher',
      grant_date: '2026-08-01',
      total_shares: 240,
      schedule_percents: [0.25, 0.25, 0.25, 0.25],
      vest_frequency_months: 1, // 5 gross shs / mo
    };

    const events = getVestingMilestonesForMonth(1, '2026-08-01', [grantA, grantB], 150, 0.91, 0.52);
    expect(events.length).toBe(2);
    const totalGross = events.reduce((sum, e) => sum + e.grossShares, 0);
    expect(totalGross).toBeCloseTo(33 + 5, 1);
  });

  it('accurately calculates unvested vs past vested shares in calculateGrantVestingSummary', () => {
    // Initial grant: 1000 shares total, granted 2024-08-01 (Y1=330, Y2=330, Y3=220, Y4=120)
    // As of 2026-08-29 (24 months elapsed): Y1 (330) + Y2 (330) = 660 vested in past, 340 unvested.
    // Refresher 2025: 200 shares total, granted 2025-08-01 (quarterly 4 x 50 shares over 12 months)
    // As of 2026-08-29 (12 months elapsed): all 4 quarters (200 shares) vested in past, 0 unvested.
    const summary = calculateGrantVestingSummary([initialGrant, refresherGrant], '2026-08-29', 60);

    expect(summary.totalGrantedShares).toBe(1200);
    expect(summary.pastVestedGrossShares).toBe(660 + 200); // 860 shares
    expect(summary.unvestedGrossShares).toBe(340 + 0); // 340 shares
    expect(summary.unvestedWithinHorizonGrossShares).toBe(340);
  });

  it('calculates single grant vesting breakdown properly', () => {
    const single = calculateSingleGrantVesting(initialGrant, '2026-08-29');
    expect(single.pastGross).toBe(660);
    expect(single.unvestedGross).toBe(340);
  });

  it('accurately reconciles multi-grant portfolio summing to 3,242 granted shares', () => {
    // Realistic multi-grant Dublin Google portfolio:
    // 1. Initial Grant: 2,000 shares, granted 2023-08-01 (33/33/22/12 monthly)
    // 2. Refresher 2024: 500 shares, granted 2024-08-01 (25/25/25/25 monthly)
    // 3. Refresher 2025: 742 shares, granted 2025-08-01 (25/25/25/25 monthly)
    // Total granted = 2000 + 500 + 742 = 3242 shares
    const portfolioGrants: Grant[] = [
      {
        id: 'hire_2023',
        type: 'initial',
        grant_date: '2023-08-01',
        total_shares: 2000,
        schedule_percents: [0.33, 0.33, 0.22, 0.12],
        vest_frequency_months: 1, // Monthly Google standard
      },
      {
        id: 'ref_2024',
        type: 'refresher',
        grant_date: '2024-08-01',
        total_shares: 500,
        schedule_percents: [0.25, 0.25, 0.25, 0.25],
        vest_frequency_months: 1,
      },
      {
        id: 'ref_2025',
        type: 'refresher',
        grant_date: '2025-08-01',
        total_shares: 742,
        schedule_percents: [0.25, 0.25, 0.25, 0.25],
        vest_frequency_months: 1,
      },
    ];

    const startDate = '2026-08-29'; // Exactly 36m from 2023, 24m from 2024, 12m from 2025
    const summary = calculateGrantVestingSummary(portfolioGrants, startDate, 60);

    // Mathematical breakdown:
    // Hire 2023 (36m elapsed = Y1(33%)+Y2(33%)+Y3(22%) = 88% = 1,760 past, 12% = 240 unvested)
    // Ref 2024 (24m elapsed = Y1(25%)+Y2(25%) = 50% = 250 past, 50% = 250 unvested)
    // Ref 2025 (12m elapsed = Y1(25%) = 25% = 185.5 past, 75% = 556.5 unvested)
    // Expected Total Past = 1760 + 250 + 185.5 = 2,195.5 (~2,196)
    // Expected Total Unvested = 240 + 250 + 556.5 = 1,046.5 (~1,046)
    expect(summary.totalGrantedShares).toBe(3242);
    expect(summary.pastVestedGrossShares).toBe(2196);
    expect(summary.unvestedGrossShares).toBe(1047);
    expect(summary.pastVestedGrossShares + summary.unvestedGrossShares).toBe(3243); // 2195.5 + 1046.5 rounded independently
  });

  it('correctly handles mid-year fractional monthly vesting (e.g. 18 months into grant)', () => {
    const monthlyGrant: Grant = {
      id: 'gsu_mid',
      type: 'initial',
      grant_date: '2025-02-01',
      total_shares: 1200, // Y1=396 (33/mo), Y2=396 (33/mo), Y3=264 (22/mo), Y4=144 (12/mo)
      schedule_percents: [0.33, 0.33, 0.22, 0.12],
      vest_frequency_months: 1,
    };

    // As of 2026-08-01 (18 months elapsed from 2025-02-01):
    // Past: Y1 (396) + 6 months of Y2 (6 * 33 = 198) = 594 shares
    // Unvested: 6 months of Y2 (198) + Y3 (264) + Y4 (144) = 606 shares
    const summary = calculateGrantVestingSummary([monthlyGrant], '2026-08-01', 60);
    expect(summary.totalGrantedShares).toBe(1200);
    expect(summary.pastVestedGrossShares).toBe(594);
    expect(summary.unvestedGrossShares).toBe(606);
    expect(summary.pastVestedGrossShares + summary.unvestedGrossShares).toBe(1200);
  });

  it('handles completely future grants and completely past grants seamlessly', () => {
    const futureGrant: Grant = {
      id: 'g_future',
      type: 'refresher',
      grant_date: '2027-01-01',
      total_shares: 300,
      schedule_percents: [0.25, 0.25, 0.25, 0.25],
      vest_frequency_months: 1,
    };
    const historicalGrant: Grant = {
      id: 'g_old',
      type: 'initial',
      grant_date: '2020-01-01',
      total_shares: 800,
      schedule_percents: [0.25, 0.25, 0.25, 0.25],
      vest_frequency_months: 1,
    };

    const futureSummary = calculateSingleGrantVesting(futureGrant, '2026-08-29');
    expect(futureSummary.pastGross).toBe(0);
    expect(futureSummary.unvestedGross).toBe(300);

    const oldSummary = calculateSingleGrantVesting(historicalGrant, '2026-08-29');
    expect(oldSummary.pastGross).toBe(800);
    expect(oldSummary.unvestedGross).toBe(0);
  });

  it('correctly calculates future stock refresher grant milestones awarded after model start date', () => {
    // Model start date: 2026-08-01
    // Future refresher awarded at 2027-04-01 (Month 8 of simulation)
    // 400 shares, quarterly (25% every 3 months)
    const futureQuarterlyRefresher: Grant = {
      id: 'future_refresher_2027',
      type: 'refresher',
      grant_date: '2027-04-01',
      total_shares: 400,
      schedule_percents: [0.25, 0.25, 0.25, 0.25],
      vest_frequency_months: 3, // Vests at Month 3, 6, 9, 12 from grant date (July 2027, Oct 2027, Jan 2028, Apr 2028)
    };

    const startDate = '2026-08-01';

    // Summary as of 2026-08-01: 0 past vested, 400 unvested
    const summary = calculateSingleGrantVesting(futureQuarterlyRefresher, startDate);
    expect(summary.pastGross).toBe(0);
    expect(summary.unvestedGross).toBe(400);

    // Month 1 to 10 (Aug 2026 to May 2027): 0 vests from this grant
    for (let m = 1; m <= 10; m++) {
      const events = getVestingMilestonesForMonth(m, startDate, [futureQuarterlyRefresher], 200, 0.86, 0.52);
      expect(events.length).toBe(0);
    }

    // Month 11 (July 2027 = 3 months after 2027-04-01): 1st quarterly vest (100 gross -> 48 net shares)
    const eventsM11 = getVestingMilestonesForMonth(11, startDate, [futureQuarterlyRefresher], 200, 0.86, 0.52);
    expect(eventsM11.length).toBe(1);
    expect(eventsM11[0].grossShares).toBe(100);
    expect(eventsM11[0].netShares).toBe(48); // 100 * (1 - 0.52)
    expect(eventsM11[0].netAmountEur).toBeCloseTo(48 * 200 * 0.86, 2);

    // Month 14 (Oct 2027 = 6 months after grant): 2nd quarterly vest
    const eventsM14 = getVestingMilestonesForMonth(14, startDate, [futureQuarterlyRefresher], 210, 0.86, 0.52);
    expect(eventsM14.length).toBe(1);
    expect(eventsM14[0].grossShares).toBe(100);
    expect(eventsM14[0].netShares).toBe(48);

    // Month 17 (Jan 2028 = 9 months after grant): 3rd quarterly vest
    const eventsM17 = getVestingMilestonesForMonth(17, startDate, [futureQuarterlyRefresher], 220, 0.86, 0.52);
    expect(eventsM17.length).toBe(1);
    expect(eventsM17[0].netShares).toBe(48);

    // Month 20 (Apr 2028 = 12 months after grant): 4th and final quarterly vest
    const eventsM20 = getVestingMilestonesForMonth(20, startDate, [futureQuarterlyRefresher], 230, 0.86, 0.52);
    expect(eventsM20.length).toBe(1);
    expect(eventsM20[0].netShares).toBe(48);

    // Month 21+ (May 2028 onwards): 0 vests remaining
    const eventsM21 = getVestingMilestonesForMonth(21, startDate, [futureQuarterlyRefresher], 240, 0.86, 0.52);
    expect(eventsM21.length).toBe(0);
  });
});
