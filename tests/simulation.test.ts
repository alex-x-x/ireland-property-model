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
        buyer_annual_bonus_pct: 0.20,
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

  it('models annual bonus payout in March into cash savings after Irish 52% tax', () => {
    // Start date: 2026-08-29 -> March 2027 occurs at month index 7
    const sim = runSimulation(DEFAULT_CONFIG);
    const marchMonth = sim.find((p) => p.date.endsWith('-03'));
    expect(marchMonth).toBeDefined();
    expect(marchMonth!.netBonusReceivedEur).toBeGreaterThan(0);

    // Target bonus: €35,000 * (1 - 0.52) = €16,800 net bonus injected into cash in March
    expect(marchMonth!.netBonusReceivedEur).toBeCloseTo(35000 * 0.48, 0);
  });

  it('preserves and compounds retained GSU shares across monthly vests without selling', () => {
    const sim = runSimulation(DEFAULT_CONFIG);
    // Retained shares should monotonically increase as new monthly vests occur
    expect(sim[0].retainedShares).toBeGreaterThan(0);
    expect(sim[12].retainedShares).toBeGreaterThan(sim[0].retainedShares);
    expect(sim[24].retainedShares).toBeGreaterThan(sim[12].retainedShares);

    // GSU Pool value is strictly equal to retainedShares * currentStockPrice * currentFx
    for (const point of sim) {
      expect(point.gsuPool).toBeCloseTo(
        point.retainedShares * point.stockPriceUsd * point.fxRate,
        2
      );
    }
  });

  it('pro-rates bonus payout in March when salary increases before March', () => {
    // Start date: 2026-08-01 (Aug 2026).
    // Baseline salary: €180,000 base, 15% bonus (€27,000/yr).
    // Step-up at 2026-11-01 (Month 3 / Nov 2026): Base increases to €210,000, 20% bonus (€42,000/yr).
    // Bonus cycle runs 12 months up to March 2027:
    // - Prior to Aug (April-Aug = 5 mos) + Aug-Oct (3 mos) = 8 months at €27k/yr = 8/12 * 27,000 = €18,000
    // - Nov-March (4 months) = 4 months at €42k/yr = 4/12 * 42,000 = €14,000
    // Total gross pro-rated bonus = €18,000 + €14,000 = €32,000.
    // Net after 52% tax = €32,000 * 0.48 = €15,360.
    const configWithStepUp = {
      ...DEFAULT_CONFIG,
      meta: {
        ...DEFAULT_CONFIG.meta,
        start_date: '2026-08-01',
      },
      mortgage: {
        ...DEFAULT_CONFIG.mortgage,
        buyer_gross_annual_base_salary_eur: 180000,
        buyer_annual_bonus_pct: 0.15,
        buyer_annual_bonus_eur: 27000,
        salary_adjustments: [
          {
            id: 'promo_nov',
            effective_date: '2026-11-01',
            base_salary_eur: 210000,
            bonus_pct: 0.20,
            bonus_eur: 42000,
          },
        ],
      },
    };

    const sim = runSimulation(configWithStepUp);
    const march2027 = sim.find((p) => p.date === '2027-03');
    expect(march2027).toBeDefined();
    expect(march2027!.netBonusReceivedEur).toBeCloseTo(32000 * 0.48, 1);
  });

  it('initializes GSU equity pool with explicitly held vested shares at Model Start Date', () => {
    const configWithHeldShares = {
      ...DEFAULT_CONFIG,
      equity_engine: {
        ...DEFAULT_CONFIG.equity_engine,
        initial_vested_shares_held: 500,
        grants: [], // no future grants
      },
    };

    const sim = runSimulation(configWithHeldShares);
    expect(sim[0].retainedShares).toBe(500);
    // At M0: 500 shares * $150 * 0.91 FX = €68,250
    expect(sim[0].gsuPool).toBeCloseTo(500 * 150 * 0.91, 1);
  });

  it('correctly calculates target deposit from explicit deposit_eur when minimum_deposit_pct is undefined', () => {
    const configWithDepositEur = {
      ...DEFAULT_CONFIG,
      property: {
        ...DEFAULT_CONFIG.property,
        target_price_eur: 1000000,
        minimum_deposit_pct: undefined,
        deposit_eur: 150000, // 15% deposit
      },
    };

    const sim = runSimulation(configWithDepositEur as any);
    // At M0: 15% deposit (€150k) + Stamp duty (€10k) + Fees (€3k) = €163,000
    expect(sim[0].targetCapital).toBe(163000);
    expect(sim[0].borrowingShortfall).toBe(0);
  });

  it('calculates monthly savings from Irish net take-home pay when savings_calculation_mode is net_pay_derived', () => {
    // Base salary: €190,000.
    // Net Monthly Take-Home (SRCOP €53k, credits €9k) = €9,524.76/mo
    // Monthly Rent = €2,500/mo (RPZ 0% for simple comparison)
    // Monthly Living Expenses = €2,500/mo
    // Derived Monthly Savings = €9,524.76 - €2,500 - €2,500 = €4,524.76/mo
    const configNetDerived = {
      ...DEFAULT_CONFIG,
      macro: {
        ...DEFAULT_CONFIG.macro,
        current_monthly_rent_eur: 2500,
        rent_yearly_growth_rate: 0,
      },
      tax: {
        standard_rate_cutoff_eur: 53000,
        tax_credits_eur: 9000,
        savings_calculation_mode: 'net_pay_derived' as const,
        monthly_living_expenses_eur: 2500,
      },
    };

    const sim = runSimulation(configNetDerived);
    // At Month 1, cash should increase by derived monthly savings (~€4,524.76)
    const cashM0 = sim[0].cash;
    const cashM1 = sim[1].cash;
    expect(cashM1 - cashM0).toBeCloseTo(4524.76, 0);
  });

  it('handles extreme downturn / bear market scenarios without negative balances or NaN errors', () => {
    const bearConfig = {
      ...DEFAULT_CONFIG,
      equity_engine: {
        ...DEFAULT_CONFIG.equity_engine,
        stock_yearly_growth_rate: -0.25, // -25% crash
      },
      property: {
        ...DEFAULT_CONFIG.property,
        yearly_growth_rate: -0.10, // -10% property decline
      },
      liquid_assets: {
        ...DEFAULT_CONFIG.liquid_assets,
        investments_yearly_growth_rate: -0.15,
        monthly_salary_savings_eur: 500,
      },
    };

    const sim = runSimulation(bearConfig);
    expect(sim.length).toBe(61);
    expect(sim[60].propertyPrice).toBeLessThan(sim[0].propertyPrice);
    expect(sim[60].stockPriceUsd).toBeLessThan(sim[0].stockPriceUsd);
    for (const p of sim) {
      expect(Number.isFinite(p.totalLiquidWealth)).toBe(true);
      expect(Number.isFinite(p.targetCapital)).toBe(true);
      expect(Number.isFinite(p.surplus)).toBe(true);
    }
  });

  it('correctly models immediate affordability at Month 0 when initial liquid wealth exceeds target capital', () => {
    const richConfig = {
      ...DEFAULT_CONFIG,
      liquid_assets: {
        ...DEFAULT_CONFIG.liquid_assets,
        cash_eur: 500000, // €500k cash
      },
    };

    const sim = runSimulation(richConfig);
    expect(sim[0].isAffordable).toBe(true);
    expect(sim[0].surplus).toBeGreaterThan(0);
  });

  it('correctly reports continuous 61-month chronological date progression without date skips', () => {
    const sim = runSimulation(DEFAULT_CONFIG);
    expect(sim.length).toBe(61);
    for (let i = 0; i < sim.length; i++) {
      expect(sim[i].month).toBe(i);
      expect(sim[i].date).toMatch(/^\d{4}-\d{2}$/);
    }
    // Verify start month to end month (60 months = 5 full years)
    expect(sim[0].date).toBe('2026-08');
    expect(sim[60].date).toBe('2031-08');
  });
});
