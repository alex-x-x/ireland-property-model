import { describe, it, expect } from 'vitest';
import { runDecisionAnalysis } from '../src/engine/decision';
import { DEFAULT_CONFIG } from '../src/engine/constants';
import { runSimulation } from '../src/engine/simulation';

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
        stock_yearly_growth_rate: 0.25, // 25% annual GSU stock growth
        initial_vested_shares_held: 800,
      },
      property: {
        ...DEFAULT_CONFIG.property,
        yearly_growth_rate: 0.02, // low 2% property inflation
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
});
