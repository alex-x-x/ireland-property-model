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
});
