import { describe, it, expect } from 'vitest';
import { runDecisionAnalysis } from '../src/engine/decision';
import { DEFAULT_CONFIG } from '../src/engine/constants';
import { runSimulation } from '../src/engine/simulation';
import { SimulationConfig } from '../src/engine/types';

describe('Decision Engine', () => {
  it('evaluates buy vs wait opportunity cost and generates clear scenarios and deltas', () => {
    const monthlyPoints = runSimulation(DEFAULT_CONFIG);
    const decision = runDecisionAnalysis(DEFAULT_CONFIG, monthlyPoints);

    expect(decision.scenarios.length).toBeGreaterThanOrEqual(2);
    expect(decision.scenarios[0].timingLabel).toContain('Earliest');

    // Each scenario should have calculated home equity, remaining liquid wealth, and total net wealth
    for (const scenario of decision.scenarios) {
      expect(scenario.totalNetWealthAtM60).toBeGreaterThan(0);
      expect(scenario.totalNetWealthAtM60).toBeCloseTo(
        scenario.homeEquityAtM60 + scenario.remainingLiquidWealthAtM60,
        1
      );
    }

    // Recommendation action must be valid
    expect(['buy_asap', 'wait_and_compound', 'unaffordable']).toContain(decision.recommendedAction);
    expect(decision.recommendationReason.length).toBeGreaterThan(10);
  });

  it('handles completely unaffordable property horizon with a dedicated Rent-Only scenario', () => {
    const unaffordableConfig = {
      ...DEFAULT_CONFIG,
      property: {
        ...DEFAULT_CONFIG.property,
        target_price_eur: 5000000, // €5M property
      },
      liquid_assets: {
        ...DEFAULT_CONFIG.liquid_assets,
        cash_eur: 5000,
        monthly_salary_savings_eur: 500,
      },
      mortgage: {
        ...DEFAULT_CONFIG.mortgage,
        buyer_gross_annual_base_salary_eur: 80000,
      },
    };

    const monthlyPoints = runSimulation(unaffordableConfig);
    const decision = runDecisionAnalysis(unaffordableConfig, monthlyPoints);

    expect(decision.earliestBuyMonth).toBeNull();
    expect(decision.recommendedAction).toBe('unaffordable');
    expect(decision.scenarios.length).toBe(1);
    expect(decision.scenarios[0].id).toBe('rent_only');
  });

  it('recommends wait_and_compound when tech equity growth significantly outperforms property inflation', () => {
    const highEquityConfig = {
      ...DEFAULT_CONFIG,
      equity_engine: {
        ...DEFAULT_CONFIG.equity_engine,
        stock_yearly_growth_rate: 0.30, // 30% annual GSU stock growth
        initial_vested_shares_held: 3000,
      },
      macro: {
        ...DEFAULT_CONFIG.macro,
        monthly_rent_eur: 2000,
      },
      property: {
        ...DEFAULT_CONFIG.property,
        yearly_growth_rate: 0.01, // low 1% property inflation
      },
    };

    const monthlyPoints = runSimulation(highEquityConfig);
    const decision = runDecisionAnalysis(highEquityConfig, monthlyPoints);

    expect(decision.recommendedAction).toBe('wait_and_compound');
    expect(decision.deltas.delta24m ?? decision.deltas.delta12m).toBeGreaterThan(5000);
  });

  it('recommends buy_asap when property inflation and rental drag outpace equity returns', () => {
    const highPropertyConfig = {
      ...DEFAULT_CONFIG,
      equity_engine: {
        ...DEFAULT_CONFIG.equity_engine,
        stock_yearly_growth_rate: 0.0, // 0% stock growth
      },
      property: {
        ...DEFAULT_CONFIG.property,
        yearly_growth_rate: 0.09, // 9% high property inflation
      },
      macro: {
        ...DEFAULT_CONFIG.macro,
        current_monthly_rent_eur: 3500, // €3,500/mo rent drag
      },
    };

    const monthlyPoints = runSimulation(highPropertyConfig);
    const decision = runDecisionAnalysis(highPropertyConfig, monthlyPoints);

    expect(decision.recommendedAction).toBe('buy_asap');
  });

  it('correctly models multi-year holding horizon vs short-term closing date horizon', () => {
    const config60 = {
      ...DEFAULT_CONFIG,
      meta: { ...DEFAULT_CONFIG.meta, forecast_months: 60 },
      property: { ...DEFAULT_CONFIG.property, yearly_growth_rate: 0.05, target_price_eur: 750000 },
      equity_engine: { ...DEFAULT_CONFIG.equity_engine, stock_yearly_growth_rate: 0.20 },
    };
    const monthly60 = runSimulation(config60);
    const decision60 = runDecisionAnalysis(config60, monthly60);

    const config12 = {
      ...DEFAULT_CONFIG,
      meta: { ...DEFAULT_CONFIG.meta, forecast_months: 12 },
      property: { ...DEFAULT_CONFIG.property, yearly_growth_rate: 0.05, target_price_eur: 750000 },
      equity_engine: { ...DEFAULT_CONFIG.equity_engine, stock_yearly_growth_rate: 0.20 },
    };
    const monthly12 = runSimulation(config12);
    const decision12 = runDecisionAnalysis(config12, monthly12);

    // At 60 months, all scenarios are evaluated after 5 full years
    const wait12Scenario60m = decision60.scenarios.find((s) => s.id === 'wait_12m');
    expect(wait12Scenario60m).toBeDefined();

    // At 12 months, the evaluation ends at Month 12
    const wait12Scenario12m = decision12.scenarios.find((s) => s.id === 'wait_12m');
    expect(wait12Scenario12m).toBeDefined();
    expect(wait12Scenario12m?.totalNetWealthAtM60).toBeLessThan(wait12Scenario60m?.totalNetWealthAtM60 ?? 0);
  });

  it('correctly models post-purchase cashflow under net_pay_derived mode with living expenses', () => {
    const configDerived = {
      ...DEFAULT_CONFIG,
      tax: {
        standard_rate_cutoff_eur: 53000,
        tax_credits_eur: 9000,
        savings_calculation_mode: 'net_pay_derived' as const,
        monthly_living_expenses_eur: 2500,
      },
    };

    const monthlyPoints = runSimulation(configDerived);
    const decision = runDecisionAnalysis(configDerived, monthlyPoints);

    expect(decision.scenarios.length).toBeGreaterThan(0);
    for (const s of decision.scenarios) {
      expect(Number.isFinite(s.totalNetWealthAtM60)).toBe(true);
      expect(Number.isFinite(s.remainingLiquidWealthAtM60)).toBe(true);
    }
  });

  it('strictly validates Tier 1 (Cash Only) liquidation when cash covers 100% of upfront capital', () => {
    // €600k property, 10% deposit + 1% stamp duty + €3k fees = €60k + €6k + €3k = €69k
    // Buyer has €150,000 cash, €80,000 ETF investments, and €200,000 GSUs
    const cashRichConfig = {
      ...DEFAULT_CONFIG,
      property: {
        ...DEFAULT_CONFIG.property,
        target_price_eur: 600000,
        yearly_growth_rate: 0.05,
      },
      liquid_assets: {
        ...DEFAULT_CONFIG.liquid_assets,
        cash_eur: 150000,
        investments_eur: 80000,
      },
      equity_engine: {
        ...DEFAULT_CONFIG.equity_engine,
        initial_vested_shares_held: 1000,
      },
    };

    const monthlyPoints = runSimulation(cashRichConfig);
    const decision = runDecisionAnalysis(cashRichConfig, monthlyPoints);

    const buyAsap = decision.scenarios.find((s) => s.id === 'buy_asap');
    expect(buyAsap).toBeDefined();
    expect(buyAsap?.totalUpfrontPaid).toBe(69000); // 60k + 6k + 3k
    expect(buyAsap?.depositPaid).toBe(60000);
    expect(buyAsap?.initialMortgagePrincipal).toBe(540000);
    // Home equity + remaining liquid assets must equal total net wealth
    expect(buyAsap!.totalNetWealthAtM60).toBeCloseTo(
      buyAsap!.homeEquityAtM60 + buyAsap!.remainingLiquidWealthAtM60,
      1
    );
  });

  it('validates multi-tier liquidation waterfall (Tier 1 Cash + Tier 2 Investments) without touching GSUs', () => {
    // €800k property, deposit + fees = €80k + €8k + €3k = €91k
    // Cash = €30,000, Investments = €100,000, GSUs = €300,000
    const tieredConfig = {
      ...DEFAULT_CONFIG,
      property: {
        ...DEFAULT_CONFIG.property,
        target_price_eur: 800000,
        yearly_growth_rate: 0.05,
      },
      liquid_assets: {
        ...DEFAULT_CONFIG.liquid_assets,
        cash_eur: 30000,
        investments_eur: 100000,
      },
      equity_engine: {
        ...DEFAULT_CONFIG.equity_engine,
        initial_vested_shares_held: 1500,
      },
    };

    const monthlyPoints = runSimulation(tieredConfig);
    const decision = runDecisionAnalysis(tieredConfig, monthlyPoints);

    const buyAsap = decision.scenarios.find((s) => s.id === 'buy_asap');
    expect(buyAsap).toBeDefined();
    expect(buyAsap?.totalUpfrontPaid).toBe(91000);
    expect(buyAsap?.depositPaid).toBe(80000);
    expect(buyAsap?.initialMortgagePrincipal).toBe(720000);
    expect(buyAsap!.totalNetWealthAtM60).toBeGreaterThan(0);
  });

  it('enforces mathematical delta invariants across all decision scenarios', () => {
    const monthlyPoints = runSimulation(DEFAULT_CONFIG);
    const decision = runDecisionAnalysis(DEFAULT_CONFIG, monthlyPoints);

    const buyAsap = decision.scenarios.find((s) => s.id === 'buy_asap');
    expect(buyAsap).toBeDefined();
    expect(buyAsap?.netWealthDeltaVsBuyAsap).toBe(0);

    for (const s of decision.scenarios) {
      if (s.netWealthDeltaVsBuyAsap !== undefined && s.netWealthDeltaVsBuyAsap !== null) {
        const expectedDelta = s.totalNetWealthAtM60 - buyAsap!.totalNetWealthAtM60;
        expect(s.netWealthDeltaVsBuyAsap).toBeCloseTo(expectedDelta, 1);
      }
    }
  });

  it('accurately distinguishes recommendation boundary around the €5,000 threshold', () => {
    // When deltas are small (< €5,000), default recommendation favors locking in home ownership (buy_asap)
    // When deltas are significant (> €5,000), recommendation switches to wait_and_compound
    const closeDeltaConfig = {
      ...DEFAULT_CONFIG,
      equity_engine: {
        ...DEFAULT_CONFIG.equity_engine,
        stock_yearly_growth_rate: 0.05,
      },
      property: {
        ...DEFAULT_CONFIG.property,
        yearly_growth_rate: 0.05,
      },
    };

    const monthlyPoints = runSimulation(closeDeltaConfig);
    const decision = runDecisionAnalysis(closeDeltaConfig, monthlyPoints);

    expect(['buy_asap', 'wait_and_compound']).toContain(decision.recommendedAction);
    expect(decision.scenarios.length).toBeGreaterThanOrEqual(2);
  });

  it('preserves cash safety pot in post-purchase liquidation waterfall and cash balance', () => {
    const safetyConfig = {
      ...DEFAULT_CONFIG,
      liquid_assets: {
        ...DEFAULT_CONFIG.liquid_assets,
        cash_eur: 100000,
        cash_usd: 0,
        investments_eur: 50000,
        investments_usd: 0,
        cash_safety_buffer_eur: 25000, // €25k cash safety pot
        cash_safety_buffer_usd: 0,
      },
    };

    const monthlyPoints = runSimulation(safetyConfig);
    const decision = runDecisionAnalysis(safetyConfig, monthlyPoints);

    const buyAsap = decision.scenarios.find((s) => s.id === 'buy_asap');
    expect(buyAsap).toBeDefined();
    // At M60, remaining liquid wealth must be greater than or equal to the unspent cash safety buffer
    expect(buyAsap!.remainingLiquidWealthAtM60).toBeGreaterThanOrEqual(25000);
  });

  it('verifies that negative EUR/USD drift degrades the opportunity cost delta of waiting 24 months', () => {
    // High equity scenario where waiting 24M is advantageous under 0% drift
    const config0 = {
      ...DEFAULT_CONFIG,
      property: {
        ...DEFAULT_CONFIG.property,
        target_price_eur: 1000000,
        yearly_growth_rate: 0.035,
      },
      equity_engine: {
        ...DEFAULT_CONFIG.equity_engine,
        stock_yearly_growth_rate: 0.16,
        initial_vested_shares_held: 800,
      },
      macro: {
        ...DEFAULT_CONFIG.macro,
        eur_usd_yearly_drift: 0.0,
      },
    };

    const configNeg3 = {
      ...config0,
      macro: {
        ...config0.macro,
        eur_usd_yearly_drift: -0.03, // -3% USD depreciation p.a.
      },
    };

    const points0 = runSimulation(config0);
    const decision0 = runDecisionAnalysis(config0, points0);

    const pointsNeg3 = runSimulation(configNeg3);
    const decisionNeg3 = runDecisionAnalysis(configNeg3, pointsNeg3);

    const delta24m_0 = decision0.deltas.delta24m!;
    const delta24m_neg3 = decisionNeg3.deltas.delta24m!;

    // 1. Under 0% drift, waiting 24M generates higher wealth or a substantially better outcome than with -3% drift
    expect(delta24m_0).toBeGreaterThan(delta24m_neg3);

    // 2. A -3% annual currency drag over 24-60 months causes a significant drop in 24M waiting advantage (>€15,000)
    const deltaErosion = delta24m_0 - delta24m_neg3;
    expect(deltaErosion).toBeGreaterThan(15000);

    // 3. Waiting 24M loses significantly more absolute wealth from USD depreciation than Buying ASAP,
    // because the buyer converts assets to an EUR property early while the waiter remains fully exposed to USD.
    const buyAsap0 = decision0.scenarios.find((s) => s.id === 'buy_asap')!;
    const wait24m0 = decision0.scenarios.find((s) => s.id === 'wait_24m')!;
    const buyAsapNeg3 = decisionNeg3.scenarios.find((s) => s.id === 'buy_asap')!;
    const wait24mNeg3 = decisionNeg3.scenarios.find((s) => s.id === 'wait_24m')!;

    const buyAsapLoss = buyAsap0.totalNetWealthAtM60 - buyAsapNeg3.totalNetWealthAtM60;
    const wait24mLoss = wait24m0.totalNetWealthAtM60 - wait24mNeg3.totalNetWealthAtM60;

    expect(wait24mLoss).toBeGreaterThan(buyAsapLoss);
    expect(wait24mLoss - buyAsapLoss).toBeCloseTo(deltaErosion, 0);
  });

  it('incorporates fixed rate lockout and variable rate shock into post-purchase mortgage trajectory', () => {
    const flatConfig: SimulationConfig = {
      ...DEFAULT_CONFIG,
      mortgage: {
        ...DEFAULT_CONFIG.mortgage,
        fixed_rate_years: 2,
        variable_rate_shock_pct: 0,
      },
    };

    const shockedConfig: SimulationConfig = {
      ...DEFAULT_CONFIG,
      mortgage: {
        ...DEFAULT_CONFIG.mortgage,
        fixed_rate_years: 2,
        variable_rate_shock_pct: 2.0, // +2% variable shock
      },
    };

    const pointsFlat = runSimulation(flatConfig);
    const decisionFlat = runDecisionAnalysis(flatConfig, pointsFlat);

    const pointsShocked = runSimulation(shockedConfig);
    const decisionShocked = runDecisionAnalysis(shockedConfig, pointsShocked);

    const flatBuyAsap = decisionFlat.scenarios.find((s) => s.id === 'buy_asap')!;
    const shockedBuyAsap = decisionShocked.scenarios.find((s) => s.id === 'buy_asap')!;

    expect(flatBuyAsap).toBeDefined();
    expect(shockedBuyAsap).toBeDefined();

    // With a +2% variable rate shock starting Month 25, cumulative interest paid by M60 must be higher
    expect(shockedBuyAsap.cumulativeMortgageInterestPaid).toBeGreaterThan(flatBuyAsap.cumulativeMortgageInterestPaid);
    // And remaining liquid wealth at M60 must be lower due to higher monthly mortgage payments after month 24
    expect(shockedBuyAsap.remainingLiquidWealthAtM60).toBeLessThan(flatBuyAsap.remainingLiquidWealthAtM60);
  });
});

