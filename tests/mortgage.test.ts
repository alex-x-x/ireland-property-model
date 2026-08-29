import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyMortgagePayment,
  calculateMortgageAmortization,
  calculateMaxBorrowingCapacity,
  getTotalGrossSalary,
  getEffectiveMaxMortgage,
} from '../src/engine/mortgage';

describe('Mortgage Engine', () => {
  it('calculates monthly mortgage payments accurately using standard annuity formula', () => {
    const loanAmount = 900000;
    const annualRate = 0.035; // 3.5%
    const termYears = 25; // 300 months

    const payment = calculateMonthlyMortgagePayment(loanAmount, annualRate, termYears);
    // Standard formula check: M = 900,000 * (0.035/12 * (1 + 0.035/12)^300) / ((1 + 0.035/12)^300 - 1) ≈ €4,505.61
    expect(payment).toBeCloseTo(4505.61, 1);
  });

  it('calculates loan amortization and remaining balance correctly after N months', () => {
    const loanAmount = 900000;
    const annualRate = 0.035;
    const termYears = 25;
    const monthsElapsed = 36; // 3 years

    const schedule = calculateMortgageAmortization(loanAmount, annualRate, termYears, monthsElapsed);
    expect(schedule.remainingBalance).toBeLessThan(loanAmount);
    expect(schedule.cumulativePrincipalPaid + schedule.remainingBalance).toBeCloseTo(loanAmount, 1);
    expect(schedule.cumulativeInterestPaid).toBeGreaterThan(0);
  });

  it('enforces Central Bank of Ireland 4.0x Loan-To-Income borrowing rules', () => {
    const grossSalary = 200000;
    const maxLtiMultiple = 4.0;

    const maxBorrowing = calculateMaxBorrowingCapacity(grossSalary, maxLtiMultiple);
    expect(maxBorrowing).toBe(800000);
  });

  it('correctly calculates total income from base salary and bonus and handles explicit AIP limits', () => {
    const mortgageConfigWithoutAip = {
      mortgage_interest_rate: 0.035,
      mortgage_term_years: 25,
      yearly_maintenance_rate: 0.01,
      buyer_gross_annual_base_salary_eur: 190000,
      buyer_annual_bonus_eur: 35000,
      cbi_max_lti_multiple: 4.0,
      approval_in_principle_amount_eur: null,
    };

    expect(getTotalGrossSalary(mortgageConfigWithoutAip)).toBe(225000);
    // Defaults to CBI 4.0x: 4.0 * 225,000 = €900,000
    expect(getEffectiveMaxMortgage(mortgageConfigWithoutAip)).toBe(900000);

    // With explicit Approval in Principle (AIP)
    const mortgageConfigWithAip = {
      ...mortgageConfigWithoutAip,
      approval_in_principle_amount_eur: 850000,
    };
    expect(getEffectiveMaxMortgage(mortgageConfigWithAip)).toBe(850000);

    // With bonus percentage (20% on €200k base = €40k bonus, €240k total)
    const mortgageWithPctBonus = {
      ...mortgageConfigWithoutAip,
      buyer_gross_annual_base_salary_eur: 200000,
      buyer_annual_bonus_pct: 0.20,
      buyer_annual_bonus_eur: undefined,
    };
    expect(getTotalGrossSalary(mortgageWithPctBonus)).toBe(240000);
    expect(getEffectiveMaxMortgage(mortgageWithPctBonus)).toBe(960000); // 4.0 * €240k
  });
});
