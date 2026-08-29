import { describe, it, expect } from 'vitest';
import { calculateStampDuty, runSimulation } from '../src/engine/simulation';
import { DEFAULT_CONFIG } from '../src/engine/constants';

describe('Simulation Engine', () => {
  it('calculates Irish Stamp Duty accurately across tiers', () => {
    expect(calculateStampDuty(800000)).toBe(8000);
    expect(calculateStampDuty(1000000)).toBe(10000);
    expect(calculateStampDuty(1200000)).toBe(14000);
    expect(calculateStampDuty(1500000)).toBe(20000);
  });

  it('runs 60-month chronological simulation and computes earliest affordable purchase month', () => {
    const simulation = runSimulation(DEFAULT_CONFIG);

    expect(simulation.length).toBe(61);
    expect(simulation[0].month).toBe(0);
    expect(simulation[60].month).toBe(60);

    expect(simulation[0].propertyPrice).toBe(1000000);
    expect(simulation[12].propertyPrice).toBeCloseTo(1050000, -1);

    const expectedInitialCash = 50000 + 10000 * 0.91;
    expect(simulation[0].cash).toBeCloseTo(expectedInitialCash, 1);
    expect(simulation[60].totalLiquidWealth).toBeGreaterThan(simulation[0].totalLiquidWealth);
  });

  it('adjusts required target capital upward when CBI LTI caps mortgage borrowing', () => {
    // €1,000,000 property requires €900,000 mortgage at 10% deposit.
    // If salary is €150,000, max 4x borrowing is €600,000 (shortfall = €300,000).
    const cappedConfig = {
      ...DEFAULT_CONFIG,
      mortgage: {
        ...DEFAULT_CONFIG.mortgage,
        buyer_gross_annual_base_salary_eur: 125000,
        buyer_annual_bonus_eur: 25000,
        buyer_gross_annual_salary_eur: 150000,
        cbi_max_lti_multiple: 4.0,
        approval_in_principle_amount_eur: null,
      },
    };

    const sim = runSimulation(cappedConfig);
    // Target capital at M0 should include 10% deposit (€100k) + Stamp Duty (€10k) + Fees (€3k) + Shortfall (€300k) = €413,000
    expect(sim[0].targetCapital).toBe(413000);
    expect(sim[0].borrowingShortfall).toBe(300000);
  });
});
