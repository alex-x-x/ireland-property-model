import { describe, it, expect } from 'vitest';
import {
  targetFxToYearlyDrift,
  yearlyDriftToTargetFx,
  getFxMilestones,
} from '../src/engine/currency';

describe('Currency Helpers (5-Year Target & Drift)', () => {
  const spotEurPerUsd = 0.90; // €0.90 per $1 -> 1 EUR = $1.1111 USD

  it('converts unchanged target rate (1.1111) to 0% drift and vice versa', () => {
    const spotUsdPerEur = 1 / spotEurPerUsd; // 1.111111...
    const drift = targetFxToYearlyDrift(spotUsdPerEur, spotEurPerUsd, 5);
    expect(drift).toBeCloseTo(0.0, 6);

    const targetBack = yearlyDriftToTargetFx(0.0, spotEurPerUsd, 5);
    expect(targetBack).toBeCloseTo(spotUsdPerEur, 4);
  });

  it('converts dollar weakening target ($1.20 in 5Y) to correct negative drift', () => {
    // If 1 EUR moves from $1.1111 to $1.2000 in 5 years, USD is weakening
    const drift = targetFxToYearlyDrift(1.20, spotEurPerUsd, 5);
    // (1.1111 / 1.20)^0.2 - 1 = 0.9259^0.2 - 1 = -0.01529 (~ -1.53% p.a.)
    expect(drift).toBeCloseTo(-0.01529, 4);

    // Invert back
    const targetBack = yearlyDriftToTargetFx(drift, spotEurPerUsd, 5);
    expect(targetBack).toBeCloseTo(1.20, 4);
  });

  it('converts dollar parity target ($1.00 in 5Y) to correct positive drift', () => {
    // If 1 EUR moves to $1.00 in 5 years, USD is strengthening
    const drift = targetFxToYearlyDrift(1.00, spotEurPerUsd, 5);
    // (1.1111 / 1.00)^0.2 - 1 = 1.02131 (~ +2.13% p.a.)
    expect(drift).toBeCloseTo(0.02131, 4);

    const targetBack = yearlyDriftToTargetFx(drift, spotEurPerUsd, 5);
    expect(targetBack).toBeCloseTo(1.00, 4);
  });

  it('computes accurate multi-year milestones including Month 24 and Month 60', () => {
    // Test at -3.0% drift p.a.
    const drift = -0.03;
    const milestones = getFxMilestones(drift, spotEurPerUsd);

    expect(milestones.now).toBeCloseTo(1 / 0.90, 4); // $1.1111
    // At Year 2 (24M): 1.1111 / (1 - 0.03)^2 = 1.1111 / 0.9409 = 1.1809
    expect(milestones.year2).toBeCloseTo((1 / 0.90) / Math.pow(0.97, 2), 4);
    // At Year 5 (60M): 1.1111 / (1 - 0.03)^5 = 1.1111 / 0.8587 = 1.2939
    expect(milestones.year5).toBeCloseTo((1 / 0.90) / Math.pow(0.97, 5), 4);
  });
});
