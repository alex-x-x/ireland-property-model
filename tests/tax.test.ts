import { describe, it, expect } from 'vitest';
import { calculateIrishUsc, calculateIrishPrsi, calculateIrishTaxBreakdown } from '../src/engine/tax';

describe('Irish Progressive Tax Engine', () => {
  it('calculates Universal Social Charge (USC) progressively across all 4 tiers', () => {
    // €10,000: Tier 1 only (0.5% of €10k = €50)
    expect(calculateIrishUsc(10000)).toBeCloseTo(50, 1);

    // €20,000: Tier 1 (€12,012 * 0.005 = €60.06) + Tier 2 ((€20,000 - €12,012) * 0.02 = €159.76) = €219.82
    expect(calculateIrishUsc(20000)).toBeCloseTo(219.82, 1);

    // €100,000:
    // T1: 12,012 * 0.005 = 60.06
    // T2: 13,748 * 0.02 = 274.96
    // T3: 44,284 * 0.04 = 1771.36
    // T4: (100,000 - 70,044) * 0.08 = 29,956 * 0.08 = 2396.48
    // Total = 60.06 + 274.96 + 1771.36 + 2396.48 = 4502.86
    expect(calculateIrishUsc(100000)).toBeCloseTo(4502.86, 1);
  });

  it('calculates PRSI 4.0% accurately', () => {
    expect(calculateIrishPrsi(190000)).toBe(7600);
    expect(calculateIrishPrsi(0)).toBe(0);
  });

  it('calculates net take-home pay and tax liability for Married 1-Earner (€53k SRCOP, €9k credits)', () => {
    const grossSalary = 190000;
    const taxConfig = {
      standard_rate_cutoff_eur: 53000,
      tax_credits_eur: 9000,
    };

    const breakdown = calculateIrishTaxBreakdown(grossSalary, taxConfig);

    // Standard rate tax: €53,000 * 20% = €10,600
    expect(breakdown.standardRateTax).toBe(10600);

    // Higher rate tax: (€190,000 - €53,000) * 40% = €137,000 * 40% = €54,800
    expect(breakdown.higherRateTax).toBe(54800);

    // Gross income tax = €10,600 + €54,800 = €65,400
    expect(breakdown.grossIncomeTax).toBe(65400);

    // Net income tax = €65,400 - €9,000 = €56,400
    expect(breakdown.netIncomeTax).toBe(56400);

    // PRSI: €190,000 * 4% = €7,600
    expect(breakdown.prsi).toBe(7600);

    // USC on €190,000:
    // T1: 60.06 + T2: 274.96 + T3: 1771.36 + T4: (190,000 - 70,044) * 0.08 (9596.48) = €11,702.86
    expect(breakdown.usc).toBeCloseTo(11702.86, 1);

    // Total tax = €56,400 + €11,702.86 + €7,600 = €75,702.86
    expect(breakdown.totalTax).toBeCloseTo(75702.86, 1);

    // Net Annual Take-Home = €190,000 - €75,702.86 = €114,297.14
    expect(breakdown.netAnnualTakeHome).toBeCloseTo(114297.14, 1);

    // Net Monthly Take-Home = €114,297.14 / 12 = €9,524.76/mo
    expect(breakdown.netMonthlyTakeHome).toBeCloseTo(9524.76, 1);

    // Marginal tax rate for additional income (e.g. GSUs / Bonus) is 52%
    expect(breakdown.marginalTaxRate).toBe(0.52);

    // Effective overall tax rate is ~39.8%
    expect(breakdown.effectiveTaxRate).toBeCloseTo(75702.86 / 190000, 3);
  });

  it('correctly compares Single vs Married tax cut-off thresholds', () => {
    const grossSalary = 100000;
    const single = calculateIrishTaxBreakdown(grossSalary, {
      standard_rate_cutoff_eur: 44000,
      tax_credits_eur: 4000,
    });

    const married = calculateIrishTaxBreakdown(grossSalary, {
      standard_rate_cutoff_eur: 53000,
      tax_credits_eur: 9000,
    });

    // Married profile has higher SRCOP (€53k vs €44k) and higher credits (€9k vs €4k), resulting in higher net take-home
    expect(married.netAnnualTakeHome).toBeGreaterThan(single.netAnnualTakeHome);
  });

  it('handles zero, negative, and extreme edge case salary scenarios gracefully', () => {
    const zeroBreakdown = calculateIrishTaxBreakdown(0);
    expect(zeroBreakdown.totalTax).toBe(0);
    expect(zeroBreakdown.netAnnualTakeHome).toBe(0);
    expect(zeroBreakdown.netMonthlyTakeHome).toBe(0);

    const negativeBreakdown = calculateIrishTaxBreakdown(-50000);
    expect(negativeBreakdown.totalTax).toBe(0);
    expect(negativeBreakdown.netAnnualTakeHome).toBe(0);

    // Excess tax credits exceeding tax liability: netIncomeTax should clamp to 0
    const lowIncomeBreakdown = calculateIrishTaxBreakdown(15000, {
      standard_rate_cutoff_eur: 44000,
      tax_credits_eur: 9000, // 20% of €15k = €3,000 gross tax; credits = €9k -> net = 0
    });
    expect(lowIncomeBreakdown.grossIncomeTax).toBe(3000);
    expect(lowIncomeBreakdown.taxCreditsUsed).toBe(3000);
    expect(lowIncomeBreakdown.netIncomeTax).toBe(0);
    expect(lowIncomeBreakdown.totalTax).toBe(lowIncomeBreakdown.usc + lowIncomeBreakdown.prsi);
  });

  it('handles exact income threshold boundary points (€12,012, €25,760, €53,000, €70,044)', () => {
    // Exactly at USC Tier 1 boundary (€12,012): 0.5% = €60.06
    expect(calculateIrishUsc(12012)).toBeCloseTo(60.06, 2);

    // Exactly at USC Tier 2 boundary (€25,760): €60.06 + €13,748 * 0.02 (€274.96) = €335.02
    expect(calculateIrishUsc(25760)).toBeCloseTo(335.02, 2);

    // Exactly at USC Tier 3 boundary (€70,044): €335.02 + €44,284 * 0.04 (€1,771.36) = €2,106.38
    expect(calculateIrishUsc(70044)).toBeCloseTo(2106.38, 2);

    // Exactly on SRCOP (€53,000): higherRateTax must be strictly 0
    const cutoffBreakdown = calculateIrishTaxBreakdown(53000, {
      standard_rate_cutoff_eur: 53000,
      tax_credits_eur: 4000,
    });
    expect(cutoffBreakdown.higherRateTax).toBe(0);
    expect(cutoffBreakdown.standardRateTax).toBe(10600); // 20% of 53k
    expect(cutoffBreakdown.grossIncomeTax).toBe(10600);
  });

  it('confirms 52% marginal rate for high earners (€300k+) and 20% for low earners (<€44k)', () => {
    const highEarner = calculateIrishTaxBreakdown(300000);
    expect(highEarner.marginalTaxRate).toBe(0.52);

    const lowEarner = calculateIrishTaxBreakdown(35000, {
      standard_rate_cutoff_eur: 44000,
    });
    expect(lowEarner.higherRateTax).toBe(0);
  });

  it('guarantees exact mathematical identity gross = netTakeHome + totalTax across all income levels', () => {
    const salaries = [20000, 44000, 53000, 70044, 100000, 190000, 350000, 750000, 1000000];
    for (const sal of salaries) {
      const breakdown = calculateIrishTaxBreakdown(sal);
      expect(breakdown.netAnnualTakeHome + breakdown.totalTax).toBeCloseTo(sal, 2);
      expect(breakdown.netMonthlyTakeHome * 12).toBeCloseTo(breakdown.netAnnualTakeHome, 2);
    }
  });

  it('correctly computes tax when tax credits are set to zero', () => {
    const zeroCredits = calculateIrishTaxBreakdown(100000, {
      standard_rate_cutoff_eur: 53000,
      tax_credits_eur: 0,
    });
    expect(zeroCredits.taxCreditsUsed).toBe(0);
    expect(zeroCredits.netIncomeTax).toBe(zeroCredits.grossIncomeTax);
  });
});
