import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyMortgagePayment,
  calculateMortgageAmortization,
  calculateMaxBorrowingCapacity,
  getTotalGrossSalary,
  getEffectiveMaxMortgage,
  getSalaryAtDate,
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

  it('correctly models planned salary step-ups starting from specific effective dates', () => {
    const mortgageWithStepUps = {
      mortgage_interest_rate: 0.035,
      mortgage_term_years: 25,
      yearly_maintenance_rate: 0.01,
      buyer_gross_annual_base_salary_eur: 180000,
      buyer_annual_bonus_pct: 0.15, // €27,000 bonus -> €207k total
      cbi_max_lti_multiple: 4.0,
      salary_adjustments: [
        {
          id: 'adj_1',
          effective_date: '2027-04-01',
          base_salary_eur: 210000,
          bonus_pct: 0.20, // €42,000 bonus -> €252k total
          note: 'L6 Promotion',
        },
        {
          id: 'adj_2',
          effective_date: '2028-04-01',
          base_salary_eur: 230000,
          bonus_pct: 0.25, // €57,500 bonus -> €287.5k total
          note: 'Staff / L7 Promotion',
        },
      ],
    };

    // Before promo 1 (e.g. 2026-06-01)
    const sal2026 = getSalaryAtDate('2026-06-01', mortgageWithStepUps);
    expect(sal2026.baseSalary).toBe(180000);
    expect(sal2026.bonusEur).toBe(27000);
    expect(sal2026.totalGrossSalary).toBe(207000);
    expect(getEffectiveMaxMortgage(mortgageWithStepUps, '2026-06-01')).toBe(828000); // 4.0 * €207,000

    // After promo 1, before promo 2 (e.g. 2027-05-01)
    const sal2027 = getSalaryAtDate('2027-05-01', mortgageWithStepUps);
    expect(sal2027.baseSalary).toBe(210000);
    expect(sal2027.bonusEur).toBe(42000);
    expect(sal2027.totalGrossSalary).toBe(252000);
    expect(getEffectiveMaxMortgage(mortgageWithStepUps, '2027-05-01')).toBe(1008000); // 4.0 * €252,000

    // After promo 2 (e.g. 2028-06-01)
    const sal2028 = getSalaryAtDate('2028-06-01', mortgageWithStepUps);
    expect(sal2028.baseSalary).toBe(230000);
    expect(sal2028.bonusEur).toBe(57500);
    expect(sal2028.totalGrossSalary).toBe(287500);
    expect(getEffectiveMaxMortgage(mortgageWithStepUps, '2028-06-01')).toBe(1150000); // 4.0 * €287,500
  });

  it('handles 0% interest rate, zero principal, and post-term amortization boundary cases', () => {
    // Zero principal
    expect(calculateMonthlyMortgagePayment(0, 0.035, 25)).toBe(0);
    const zeroAmort = calculateMortgageAmortization(0, 0.035, 25, 12);
    expect(zeroAmort.monthlyPayment).toBe(0);
    expect(zeroAmort.remainingBalance).toBe(0);

    // 0% Interest Rate: linear division (e.g. €300,000 / 300 months = €1,000/mo)
    const zeroRatePayment = calculateMonthlyMortgagePayment(300000, 0, 25);
    expect(zeroRatePayment).toBe(1000);

    const zeroRateAmort = calculateMortgageAmortization(300000, 0, 25, 50);
    expect(zeroRateAmort.remainingBalance).toBe(250000);
    expect(zeroRateAmort.cumulativePrincipalPaid).toBe(50000);
    expect(zeroRateAmort.cumulativeInterestPaid).toBe(0);

    // Months elapsed beyond 25 years (e.g. 350 months > 300 months)
    const fullyPaidAmort = calculateMortgageAmortization(500000, 0.035, 25, 350);
    expect(fullyPaidAmort.remainingBalance).toBe(0);
    expect(fullyPaidAmort.cumulativePrincipalPaid).toBeCloseTo(500000, 0);
  });

  it('correctly sorts out-of-order salary adjustments', () => {
    const unSortedMortgage = {
      buyer_gross_annual_base_salary_eur: 150000,
      cbi_max_lti_multiple: 4.0,
      mortgage_interest_rate: 0.035,
      mortgage_term_years: 25,
      yearly_maintenance_rate: 0.01,
      salary_adjustments: [
        { id: '2', effective_date: '2028-01-01', base_salary_eur: 220000 },
        { id: '1', effective_date: '2027-01-01', base_salary_eur: 180000 },
      ],
    };

    expect(getSalaryAtDate('2026-06-01', unSortedMortgage).baseSalary).toBe(150000);
    expect(getSalaryAtDate('2027-06-01', unSortedMortgage).baseSalary).toBe(180000);
    expect(getSalaryAtDate('2028-06-01', unSortedMortgage).baseSalary).toBe(220000);
  });

  it('correctly calculates dynamic bonus and CBI 4.0x borrowing capacity on future salary increases', () => {
    // Initial: €160,000 base, 15% bonus (€24k) -> €184,000 total -> Max CBI Loan €736,000
    // Step 1 at 2027-07-01: Base increases to €190,000 with percentage bonus increased to 20% (€38k) -> €228k total -> Max CBI Loan €912,000
    // Step 2 at 2028-01-01: Base increases to €220,000 with fixed bonus €50,000 -> €270k total -> Max CBI Loan €1,080,000
    const configWithDynamicBonus = {
      mortgage_interest_rate: 0.035,
      mortgage_term_years: 25,
      yearly_maintenance_rate: 0.01,
      buyer_gross_annual_base_salary_eur: 160000,
      buyer_annual_bonus_pct: 0.15,
      cbi_max_lti_multiple: 4.0,
      salary_adjustments: [
        {
          id: 'step_1',
          effective_date: '2027-07-01',
          base_salary_eur: 190000,
          bonus_pct: 0.20,
        },
        {
          id: 'step_2',
          effective_date: '2028-01-01',
          base_salary_eur: 220000,
          bonus_eur: 50000,
        },
      ],
    };

    // Prior to Step 1 (e.g. 2027-01-01)
    const salEarly = getSalaryAtDate('2027-01-01', configWithDynamicBonus);
    expect(salEarly.baseSalary).toBe(160000);
    expect(salEarly.bonusEur).toBe(24000);
    expect(salEarly.totalGrossSalary).toBe(184000);
    expect(getEffectiveMaxMortgage(configWithDynamicBonus, '2027-01-01')).toBe(736000);

    // After Step 1 (e.g. 2027-08-01)
    const salStep1 = getSalaryAtDate('2027-08-01', configWithDynamicBonus);
    expect(salStep1.baseSalary).toBe(190000);
    expect(salStep1.bonusEur).toBe(38000);
    expect(salStep1.totalGrossSalary).toBe(228000);
    expect(getEffectiveMaxMortgage(configWithDynamicBonus, '2027-08-01')).toBe(912000);

    // After Step 2 (e.g. 2028-03-01)
    const salStep2 = getSalaryAtDate('2028-03-01', configWithDynamicBonus);
    expect(salStep2.baseSalary).toBe(220000);
    expect(salStep2.bonusEur).toBe(50000);
    expect(salStep2.bonusPct).toBeCloseTo(50000 / 220000, 4);
    expect(salStep2.totalGrossSalary).toBe(270000);
    expect(getEffectiveMaxMortgage(configWithDynamicBonus, '2028-03-01')).toBe(1080000);
  });
});
