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
    // - Prior to Aug (April-Aug = 5 mos) + Aug-Oct (2 mos) = 7 months at €27k/yr = 7/12 * 27,000 = €15,750
    // - Nov-March (5 months) = 5 months at €42k/yr = 5/12 * 42,000 = €17,500
    // Total gross pro-rated bonus = €15,750 + €17,500 = €33,250.
    // Net after 52% tax = €33,250 * 0.48 = €15,960.
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
    expect(march2027!.netBonusReceivedEur).toBeCloseTo(33250 * 0.48, 1);
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

  it('dynamically scales monthly cash savings when salary increases under net_pay_derived mode', () => {
    // Start Date: 2026-08-01
    // Initial Base: €140,000. Net Monthly Take-Home (SRCOP €53k, credits €9k) = €7,324.76/mo.
    // Monthly Rent = €2,000/mo, Living Expenses = €2,500/mo.
    // Derived Monthly Savings (M1-M11) = €7,324.76 - €2,000 - €2,500 = €2,824.76/mo.
    // Step-up at Month 12 (2027-08-01): Base increases to €180,000 (+€40k/yr).
    // Net Monthly Take-Home from €180k = €9,084.76/mo (Δ = +€1,760/mo).
    // Derived Monthly Savings (M12+) = €9,084.76 - €2,000 - €2,500 = €4,584.76/mo.
    const configSalaryStepSavings = {
      ...DEFAULT_CONFIG,
      meta: {
        ...DEFAULT_CONFIG.meta,
        start_date: '2026-08-01',
      },
      macro: {
        ...DEFAULT_CONFIG.macro,
        current_monthly_rent_eur: 2000,
        rent_yearly_growth_rate: 0,
      },
      tax: {
        standard_rate_cutoff_eur: 53000,
        tax_credits_eur: 9000,
        savings_calculation_mode: 'net_pay_derived' as const,
        monthly_living_expenses_eur: 2500,
      },
      mortgage: {
        ...DEFAULT_CONFIG.mortgage,
        buyer_gross_annual_base_salary_eur: 140000,
        buyer_annual_bonus_pct: 0,
        buyer_annual_bonus_eur: 0,
        salary_adjustments: [
          {
            id: 'promo_m12',
            effective_date: '2027-08-01', // Month 12
            base_salary_eur: 180000,
            bonus_pct: 0,
          },
        ],
      },
    };

    const sim = runSimulation(configSalaryStepSavings);

    // M1 cash increment:
    expect(sim[1].cash - sim[0].cash).toBeCloseTo(3024.76, 0);

    // M11 cash increment (before step-up):
    expect(sim[11].cash - sim[10].cash).toBeCloseTo(3024.76, 0);

    // M12 cash increment (after step-up to €180k):
    // Jump from €3,024.76 to €4,624.76 (+€1,600/mo after 52% marginal tax)!
    expect(sim[12].cash - sim[11].cash).toBeCloseTo(4624.76, 0);
    expect(sim[13].cash - sim[12].cash).toBeCloseTo(4624.76, 0);
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

  it('simulates future stock refresher grants accurately within full 60-month chronological runway', () => {
    // Model start date: 2026-08-01.
    // Initial: 0 held shares, 0 initial grants.
    // A future refresher is awarded at 2027-02-01 (Month 6) for 400 shares, vesting quarterly (25% every 3 months).
    // Vests at:
    // - Month 9 (May 2027): 100 gross * (1 - 0.52) = 48 net shares
    // - Month 12 (Aug 2027): 48 net shares -> 96 total
    // - Month 15 (Nov 2027): 48 net shares -> 144 total
    // - Month 18 (Feb 2028): 48 net shares -> 192 total
    const configWithFutureRefresher = {
      ...DEFAULT_CONFIG,
      meta: {
        ...DEFAULT_CONFIG.meta,
        start_date: '2026-08-01',
      },
      equity_engine: {
        ...DEFAULT_CONFIG.equity_engine,
        initial_vested_shares_held: 0,
        current_share_price_usd: 200,
        stock_yearly_growth_rate: 0.12, // 12% stock growth
        marginal_tax_rate_ireland: 0.52,
        grants: [
          {
            id: 'refresher_feb_2027',
            type: 'refresher' as const,
            grant_date: '2027-02-01',
            total_shares: 400,
            schedule_percents: [0.25, 0.25, 0.25, 0.25],
            vest_frequency_months: 3,
          },
        ],
      },
      macro: {
        ...DEFAULT_CONFIG.macro,
        eur_usd_spot: 0.86,
        eur_usd_yearly_drift: 0,
      },
    };

    const sim = runSimulation(configWithFutureRefresher);

    // Months 0 through 8: 0 retained shares and 0 GSU pool
    for (let m = 0; m <= 8; m++) {
      expect(sim[m].retainedShares).toBe(0);
      expect(sim[m].gsuPool).toBe(0);
      expect(sim[m].vestEvents.length).toBe(0);
    }

    // Month 9 (May 2027): 1st quarterly vest
    expect(sim[9].retainedShares).toBe(48);
    expect(sim[9].vestEvents.length).toBe(1);
    expect(sim[9].vestEvents[0].grossShares).toBe(100);
    expect(sim[9].vestEvents[0].netShares).toBe(48);
    expect(sim[9].gsuPool).toBeCloseTo(48 * sim[9].stockPriceUsd * 0.86, 2);

    // Month 12 (Aug 2027): 2nd quarterly vest
    expect(sim[12].retainedShares).toBe(96);
    expect(sim[12].gsuPool).toBeCloseTo(96 * sim[12].stockPriceUsd * 0.86, 2);

    // Month 15 (Nov 2027): 3rd quarterly vest
    expect(sim[15].retainedShares).toBe(144);
    expect(sim[15].gsuPool).toBeCloseTo(144 * sim[15].stockPriceUsd * 0.86, 2);

    // Month 18 (Feb 2028): 4th and final quarterly vest
    expect(sim[18].retainedShares).toBe(192);
    expect(sim[18].gsuPool).toBeCloseTo(192 * sim[18].stockPriceUsd * 0.86, 2);

    // Month 19 through 60: Retained shares remain at 192, and GSU pool keeps compounding with stock growth
    expect(sim[60].retainedShares).toBe(192);
    expect(sim[60].gsuPool).toBeCloseTo(192 * sim[60].stockPriceUsd * 0.86, 2);
    expect(sim[60].gsuPool).toBeGreaterThan(sim[18].gsuPool);
  });

  it('simulates future salary increases accurately by expanding CBI borrowing capacity and reducing deposit shortfalls', () => {
    // €1,000,000 property (requires €100k 10% deposit, €900k loan).
    // Initial salary: €150,000 base + 0% bonus -> Max CBI 4.0x loan = €600,000 (Shortfall = €300,000).
    // Target Capital at M0 = €100k + €10k stamp duty + €3k fees + €300k shortfall = €413,000.
    // Step-up at Month 12 (2027-08-01): Base increases to €225,000 -> Max CBI 4.0x loan = €900,000 (Shortfall = €0).
    const configWithSalaryStepUp = {
      ...DEFAULT_CONFIG,
      meta: {
        ...DEFAULT_CONFIG.meta,
        start_date: '2026-08-01',
      },
      property: {
        ...DEFAULT_CONFIG.property,
        target_price_eur: 1000000,
        yearly_growth_rate: 0, // 0% growth to isolate salary step-up mechanics
        legal_and_closing_fees_eur: 3000,
      },
      mortgage: {
        ...DEFAULT_CONFIG.mortgage,
        buyer_gross_annual_base_salary_eur: 150000,
        buyer_annual_bonus_pct: 0,
        buyer_annual_bonus_eur: 0,
        cbi_max_lti_multiple: 4.0,
        approval_in_principle_amount_eur: null,
        salary_adjustments: [
          {
            id: 'l6_promo',
            effective_date: '2027-08-01', // Month 12
            base_salary_eur: 225000,
            bonus_pct: 0,
          },
        ],
      },
    };

    const sim = runSimulation(configWithSalaryStepUp);

    // Month 0 to 11: Borrowing shortfall is €300,000
    for (let m = 0; m <= 11; m++) {
      expect(sim[m].maxMortgageAvailable).toBe(600000);
      expect(sim[m].borrowingShortfall).toBe(300000);
      expect(sim[m].targetCapital).toBe(413000);
    }

    // Month 12 (2027-08-01): Borrowing capacity expands to €900,000, shortfall drops to €0!
    expect(sim[12].maxMortgageAvailable).toBe(900000);
    expect(sim[12].borrowingShortfall).toBe(0);
    // Target Capital drops from €413,000 to €113,000 (€100k deposit + €10k stamp duty + €3k fees)
    expect(sim[12].targetCapital).toBe(113000);
  });

  it('proves combined synergy of future salary increase and future stock refresher triggering property affordability', () => {
    // Model starts with modest cash (€60k), needing €113k minimum deposit + fees for a €1M home.
    // At Month 0: Liquid wealth = €60k < Target Capital €413k (unaffordable).
    // Month 12:
    // 1. Salary step-up from €150k to €225k eliminates the €300k CBI shortfall.
    // 2. Refresher vest of 200 gross shares (96 net shares @ $350 * 0.86 = €28,896) + accumulated cash savings crosses the finish line!
    const synergyConfig = {
      ...DEFAULT_CONFIG,
      meta: {
        ...DEFAULT_CONFIG.meta,
        start_date: '2026-08-01',
      },
      property: {
        ...DEFAULT_CONFIG.property,
        target_price_eur: 1000000,
        yearly_growth_rate: 0,
      },
      liquid_assets: {
        ...DEFAULT_CONFIG.liquid_assets,
        cash_eur: 65000,
        cash_usd: 0,
        investments_eur: 0,
        investments_usd: 0,
        monthly_salary_savings_eur: 2000, // saves €24k over 12 months -> €89k cash
      },
      equity_engine: {
        ...DEFAULT_CONFIG.equity_engine,
        initial_vested_shares_held: 0,
        current_share_price_usd: 350,
        stock_yearly_growth_rate: 0,
        marginal_tax_rate_ireland: 0.52,
        grants: [
          {
            id: 'future_refresher',
            type: 'refresher' as const,
            grant_date: '2027-05-01', // Month 9
            total_shares: 200,
            schedule_percents: [1.0], // 100% vests at 3 months (Month 12 / Aug 2027)
            vest_frequency_months: 3,
          },
        ],
      },
      mortgage: {
        ...DEFAULT_CONFIG.mortgage,
        buyer_gross_annual_base_salary_eur: 150000,
        buyer_annual_bonus_pct: 0,
        buyer_annual_bonus_eur: 0,
        cbi_max_lti_multiple: 4.0,
        approval_in_principle_amount_eur: null,
        salary_adjustments: [
          {
            id: 'promo_m12',
            effective_date: '2027-08-01', // Month 12
            base_salary_eur: 225000,
            bonus_pct: 0,
          },
        ],
      },
      macro: {
        ...DEFAULT_CONFIG.macro,
        eur_usd_spot: 0.86,
      },
    };

    const sim = runSimulation(synergyConfig);

    // Month 11: Unaffordable (Target capital €413k, liquid wealth ~€87k)
    expect(sim[11].isAffordable).toBe(false);
    expect(sim[11].surplus).toBeLessThan(0);

    // Month 12:
    // Liquid wealth = €89k cash + (96 net shares * $350 * 0.86 = €28,896) = €117,896 > €113,000
    // Target capital = €113,000 (0 shortfall).
    // Surplus = €4,896 and isAffordable flips to true!
    expect(sim[12].isAffordable).toBe(true);
    expect(sim[12].targetCapital).toBe(113000);
    expect(sim[12].retainedShares).toBe(96);
    expect(sim[12].totalLiquidWealth).toBeGreaterThan(sim[12].targetCapital);
  });
});
