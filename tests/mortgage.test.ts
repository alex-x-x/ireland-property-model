import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyMortgagePayment,
  calculateMortgageAmortization,
  calculateMaxBorrowingCapacity,
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
});
