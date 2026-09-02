import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyMortgagePayment,
  calculateMortgageAmortization,
  calculateMaxBorrowingCapacity,
  getTotalGrossSalary,
  getEffectiveMaxMortgage,
  getSalaryAtDate,
  calculateMortgageWithOverpayments,
} from '../src/engine/mortgage';
import { DEFAULT_CONFIG } from '../src/engine/constants';

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

  it('handles short mortgage terms (e.g. 3 years) that are fully paid off before the 60-month horizon', () => {
    // 3-year term (36 months), €180,000 principal at 3.5%
    const termYears = 3;
    const principal = 180000;
    const rate = 0.035;

    // At month 36 (exact payoff date):
    const amort36 = calculateMortgageAmortization(principal, rate, termYears, 36);
    expect(amort36.remainingBalance).toBe(0);
    expect(amort36.cumulativePrincipalPaid).toBeCloseTo(principal, 0);

    // At month 60 (24 months after payoff):
    const amort60 = calculateMortgageAmortization(principal, rate, termYears, 60);
    expect(amort60.remainingBalance).toBe(0);
    expect(amort60.cumulativePrincipalPaid).toBeCloseTo(principal, 0);
    // Interest stops accumulating once loan is paid off:
    expect(amort60.cumulativeInterestPaid).toBeCloseTo(amort36.cumulativeInterestPaid, 1);
  });

  it('ensures Approval in Principle (AIP) strictly overrides salary-based CBI limits across step-ups', () => {
    const configWithAipAndStepUp = {
      mortgage_interest_rate: 0.035,
      mortgage_term_years: 25,
      yearly_maintenance_rate: 0.01,
      buyer_gross_annual_base_salary_eur: 150000,
      cbi_max_lti_multiple: 4.0,
      approval_in_principle_amount_eur: 550000, // Explicit bank letter
      salary_adjustments: [
        {
          id: 'step_1',
          effective_date: '2027-01-01',
          base_salary_eur: 250000, // Would yield €1,000,000 CBI max loan
        },
      ],
    };

    // Before step-up: AIP of €550,000 is used instead of €600k CBI
    expect(getEffectiveMaxMortgage(configWithAipAndStepUp, '2026-06-01')).toBe(550000);

    // After step-up: AIP remains strictly €550,000
    expect(getEffectiveMaxMortgage(configWithAipAndStepUp, '2027-06-01')).toBe(550000);
  });

  it('safely handles negative principal, zero term, and negative elapsed months without throwing', () => {
    expect(calculateMonthlyMortgagePayment(-50000, 0.035, 25)).toBe(0);
    expect(calculateMonthlyMortgagePayment(500000, 0.035, 0)).toBe(0);

    const negAmort = calculateMortgageAmortization(-50000, 0.035, 25, -12);
    expect(negAmort.monthlyPayment).toBe(0);
    expect(negAmort.remainingBalance).toBe(0);
    expect(negAmort.cumulativeInterestPaid).toBe(0);
  });

  describe('Mortgage Overpayment Simulator', () => {
    it('returns exact standard metrics when overpayment is zero', () => {
      const result = calculateMortgageWithOverpayments({
        principal: 500000,
        annualRate: 0.035,
        termYears: 25,
        fixedRateYears: 2,
        monthlyOverpayment: 0,
        annualLumpSumOverpayment: 0,
      });

      expect(result.actualPayoffMonths).toBe(300);
      expect(result.monthsSaved).toBe(0);
      expect(result.yearsSaved).toBe(0);
      expect(result.totalInterestSaved).toBe(0);
      expect(result.totalInterestWithOverpayment).toBeCloseTo(result.totalInterestStandard, 1);
      expect(result.schedule.length).toBe(300);
    });

    it('strictly enforces fixed-rate lockout (zero overpayment during fixed term)', () => {
      const result = calculateMortgageWithOverpayments({
        principal: 600000,
        annualRate: 0.035,
        termYears: 25,
        fixedRateYears: 2, // 24 months fixed
        monthlyOverpayment: 500,
      });

      // Months 1 to 24: marked as isFixedPeriod, overpaymentPaid must be 0
      for (let m = 1; m <= 24; m++) {
        expect(result.schedule[m - 1].isFixedPeriod).toBe(true);
        expect(result.schedule[m - 1].overpaymentPaid).toBe(0);
      }

      // Month 25: first month off fixed rate -> overpayment is applied
      expect(result.schedule[24].isFixedPeriod).toBe(false);
      expect(result.schedule[24].overpaymentPaid).toBe(500);
    });

    it('shaves significant years and interest off a 25-year mortgage with regular overpayments', () => {
      const result = calculateMortgageWithOverpayments({
        principal: 500000,
        annualRate: 0.035,
        termYears: 25,
        fixedRateYears: 2,
        monthlyOverpayment: 400, // +€400/mo after year 2
      });

      expect(result.actualPayoffMonths).toBeLessThan(300);
      expect(result.monthsSaved).toBeGreaterThan(48); // Shaves >4 years
      expect(result.totalInterestSaved).toBeGreaterThan(30000); // Saves >€30k interest
      expect(result.totalInterestWithOverpayment + result.totalInterestSaved).toBeCloseTo(result.totalInterestStandard, 1);
    });

    it('handles annual lump sum overpayments aligned with March bonus month', () => {
      const result = calculateMortgageWithOverpayments(
        {
          principal: 500000,
          annualRate: 0.035,
          termYears: 25,
          fixedRateYears: 2, // 24 months fixed lock (ends 2028-08)
          monthlyOverpayment: 0,
          annualLumpSumOverpayment: 10000, // €10k annual bonus payment
          lumpSumMonth: 3, // March
        },
        '2026-08-01'
      );

      // Month 7 (2027-03): Fixed period active -> lump sum is 0
      expect(result.schedule[6].dateStr).toBe('2027-03');
      expect(result.schedule[6].overpaymentPaid).toBe(0);

      // Month 19 (2028-03): Fixed period active -> lump sum is 0
      expect(result.schedule[18].dateStr).toBe('2028-03');
      expect(result.schedule[18].overpaymentPaid).toBe(0);

      // Month 31 (2029-03): First March off fixed rate -> lump sum €10k kicks in!
      expect(result.schedule[30].dateStr).toBe('2029-03');
      expect(result.schedule[30].overpaymentPaid).toBe(10000);
      expect(result.schedule[30].isLumpSumApplied).toBe(true);
      expect(result.yearsSaved).toBeGreaterThan(4);

      // Cumulative tracking assertions
      expect(result.schedule[30].cumulativePrincipalPaid).toBeGreaterThan(40000);
      expect(result.schedule[30].cumulativeInterestPaid).toBeGreaterThan(30000);
    });

    it('safely handles zero and negative mortgage parameters in overpayment simulation', () => {
      const zeroResult = calculateMortgageWithOverpayments({
        principal: 0,
        annualRate: 0.035,
        termYears: 25,
      });
      expect(zeroResult.standardMonthlyPayment).toBe(0);
      expect(zeroResult.actualPayoffMonths).toBe(0);
      expect(zeroResult.schedule).toHaveLength(0);
    });

    it('enforces mathematical conservation of cashflow across all simulated months', () => {
      // €650k loan, 3.75%, 25y with €350/mo overpayment and €12k March bonus
      const result = calculateMortgageWithOverpayments(
        {
          principal: 650000,
          annualRate: 0.0375,
          termYears: 25,
          fixedRateYears: 2,
          monthlyOverpayment: 350,
          annualLumpSumOverpayment: 12000,
          lumpSumMonth: 3,
        },
        '2026-08-01'
      );

      let totalPrincipalPaidSum = 0;
      let totalInterestPaidSum = 0;
      let totalCashflowSum = 0;

      for (const pt of result.schedule) {
        // Invariant 1: Total Payment in each month === Principal Paid + Extra Overpayment + Interest Paid
        const monthPrincipalTotal = pt.principalPaid + pt.overpaymentPaid;
        expect(pt.totalPayment).toBeCloseTo(monthPrincipalTotal + pt.interestPaid, 2);

        totalPrincipalPaidSum += monthPrincipalTotal;
        totalInterestPaidSum += pt.interestPaid;
        totalCashflowSum += pt.totalPayment;
      }

      // Invariant 2: Total Principal repaid across the whole life of the loan must equal original principal
      expect(totalPrincipalPaidSum).toBeCloseTo(650000, 1);
      expect(result.totalPrincipalPaid).toBeCloseTo(650000, 1);

      // Invariant 3: Total Interest paid must equal the sum of month-by-month interest charges
      expect(totalInterestPaidSum).toBeCloseTo(result.totalInterestWithOverpayment, 1);

      // Invariant 4: Total cash outflows === Principal + Interest
      expect(totalCashflowSum).toBeCloseTo(650000 + result.totalInterestWithOverpayment, 1);

      // Invariant 5: Final balance is exactly 0
      const finalPoint = result.schedule[result.schedule.length - 1];
      expect(finalPoint.balance).toBe(0);
      expect(result.actualPayoffMonths).toBe(result.schedule.length);
    });

    it('models Dual-Turbo Mode (Simultaneous Monthly + March Annual Bonus) with massive interest reduction', () => {
      const standard = calculateMortgageWithOverpayments({
        principal: 600000,
        annualRate: 0.035,
        termYears: 25,
        fixedRateYears: 2,
        monthlyOverpayment: 0,
        annualLumpSumOverpayment: 0,
      });

      const dualTurbo = calculateMortgageWithOverpayments(
        {
          principal: 600000,
          annualRate: 0.035,
          termYears: 25,
          fixedRateYears: 2,
          monthlyOverpayment: 500, // +€500/mo
          annualLumpSumOverpayment: 15000, // +€15k every March
          lumpSumMonth: 3,
        },
        '2026-08-01'
      );

      // 25-year mortgage (300 months) is compressed to ~14.4 years (173 months), saving >10 years!
      expect(dualTurbo.actualPayoffMonths).toBeLessThan(180);
      expect(dualTurbo.yearsSaved).toBeGreaterThan(10);

      // Saves over €125,000 in interest!
      expect(dualTurbo.totalInterestSaved).toBeGreaterThan(120000);
      expect(dualTurbo.totalInterestWithOverpayment).toBeLessThan(180000);
      expect(dualTurbo.totalInterestWithOverpayment).toBeLessThan(standard.totalInterestStandard);
      expect(dualTurbo.totalInterestWithOverpayment + dualTurbo.totalInterestSaved).toBeCloseTo(
        standard.totalInterestStandard,
        1
      );
    });

    it('models Variable Rate mode (0-Year Fixed Lock) where extra payments begin immediately in Month 1', () => {
      const varResult = calculateMortgageWithOverpayments(
        {
          principal: 450000,
          annualRate: 0.035,
          termYears: 25,
          fixedRateYears: 0, // No fixed lockout
          monthlyOverpayment: 300,
          annualLumpSumOverpayment: 8000,
          lumpSumMonth: 3,
        },
        '2026-08-01'
      );

      // Month 1: immediately active
      expect(varResult.schedule[0].isFixedPeriod).toBe(false);
      expect(varResult.schedule[0].overpaymentPaid).toBe(300);

      // Month 7 (2027-03): First March -> lump sum applies in Year 1!
      expect(varResult.schedule[6].dateStr).toBe('2027-03');
      expect(varResult.schedule[6].overpaymentPaid).toBe(300 + 8000);
      expect(varResult.schedule[6].isLumpSumApplied).toBe(true);
    });

    it('accurately evaluates Irish CBI LTI ratios (3.5x Second-Time Buyer vs 4.0x FTB vs 4.5x Exception)', () => {
      const income = 180000;

      // 1. First-Time Buyer (FTB) standard multiple: 4.0x
      expect(calculateMaxBorrowingCapacity(income, 4.0)).toBe(720000);

      // 2. Second-Time Buyer (Mover) standard multiple: 3.5x
      expect(calculateMaxBorrowingCapacity(income, 3.5)).toBe(630000);

      // 3. Central Bank Discretionary Exception: 4.5x
      expect(calculateMaxBorrowingCapacity(income, 4.5)).toBe(810000);
    });

    it('evaluates term boundaries from 10 to 35 years with exact annuity payments', () => {
      const principal = 500000;
      const rate = 0.035;

      const terms = [10, 15, 20, 25, 30, 35];
      let prevPayment = Infinity;
      let prevInterest = 0;

      for (const term of terms) {
        const payment = calculateMonthlyMortgagePayment(principal, rate, term);
        const amort = calculateMortgageAmortization(principal, rate, term, term * 12);

        // As term increases, monthly payment decreases monotonically
        expect(payment).toBeLessThan(prevPayment);
        prevPayment = payment;

        // As term increases, total interest paid increases monotonically
        expect(amort.cumulativeInterestPaid).toBeGreaterThan(prevInterest);
        prevInterest = amort.cumulativeInterestPaid;

        // Loan must be fully paid off at term end
        expect(amort.remainingBalance).toBe(0);
        expect(amort.cumulativePrincipalPaid).toBeCloseTo(principal, 0);
      }
    });

    it('stress tests rate shocks from 1.5% Green discounts up to 10.0% stagflation extremes', () => {
      const principal = 600000;
      const term = 25;

      const rates = [0.015, 0.035, 0.050, 0.065, 0.100];
      let prevPayment = 0;

      for (const rate of rates) {
        const payment = calculateMonthlyMortgagePayment(principal, rate, term);
        expect(payment).toBeGreaterThan(prevPayment);
        prevPayment = payment;

        const overpay = calculateMortgageWithOverpayments({
          principal,
          annualRate: rate,
          termYears: term,
          fixedRateYears: 2,
          monthlyOverpayment: 200,
        });

        expect(overpay.standardMonthlyPayment).toBeCloseTo(payment, 2);
        expect(overpay.schedule[overpay.schedule.length - 1].balance).toBe(0);
      }
    });

    it('dynamically applies Variable Rate after fixed-rate lockout, altering standard payment and total lifetime interest', () => {
      const principal = 500000;
      const fixedRate = 0.035; // 3.5%
      const variableRate = 0.050; // 5.0% (+1.5% hike)
      const termYears = 25;
      const fixedRateYears = 2; // 24 months

      const flatResult = calculateMortgageWithOverpayments({
        principal,
        annualRate: fixedRate,
        termYears,
        fixedRateYears,
        variableRate: fixedRate, // 3.5% flat
        monthlyOverpayment: 0,
      });

      const variableResult = calculateMortgageWithOverpayments({
        principal,
        annualRate: fixedRate,
        termYears,
        fixedRateYears,
        variableRate: variableRate, // 5.0% variable after year 2
        monthlyOverpayment: 0,
      });

      // 1. Fixed payment during months 1-24 should be identical
      expect(variableResult.standardMonthlyPayment).toBeCloseTo(flatResult.standardMonthlyPayment, 2);
      expect(variableResult.standardMonthlyPayment).toBeCloseTo(2503.12, 1);

      // 2. Variable payment starting Month 25 should be higher due to 5.0% rate on remaining balance (~€473k over 23 yrs)
      expect(variableResult.variableMonthlyPayment).toBeDefined();
      expect(variableResult.variableMonthlyPayment).toBeGreaterThan(variableResult.standardMonthlyPayment);
      expect(variableResult.variableMonthlyPayment).toBeCloseTo(2893.73, 1);

      // 3. Total lifetime interest MUST be significantly higher with 5.0% variable rate
      expect(variableResult.totalInterestStandard).toBeGreaterThan(flatResult.totalInterestStandard);
      expect(variableResult.totalInterestStandard - flatResult.totalInterestStandard).toBeGreaterThan(90000); // >€90k extra interest

      // 4. Verify schedule metadata tags for fixed vs variable periods
      // Month 1 (Fixed)
      expect(variableResult.schedule[0].isFixedPeriod).toBe(true);
      expect(variableResult.schedule[0].isVariableRate).toBe(false);
      expect(variableResult.schedule[0].interestRate).toBe(0.035);

      // Month 24 (Last Fixed Month)
      expect(variableResult.schedule[23].isFixedPeriod).toBe(true);
      expect(variableResult.schedule[23].isVariableRate).toBe(false);
      expect(variableResult.schedule[23].interestRate).toBe(0.035);

      // Month 25 (First Variable Month)
      expect(variableResult.schedule[24].isFixedPeriod).toBe(false);
      expect(variableResult.schedule[24].isVariableRate).toBe(true);
      expect(variableResult.schedule[24].interestRate).toBe(0.050);

      // 5. Loan amortizes to 0 at month 300
      expect(variableResult.schedule[299].balance).toBe(0);
      expect(variableResult.actualPayoffMonths).toBe(300);
    });

    it('correctly calculates pure variable mortgage (0-year fixed lock) with variable rate from Month 1', () => {
      const principal = 400000;
      const fixedRate = 0.035;
      const variableRate = 0.045; // 4.5%
      const termYears = 20;

      const result = calculateMortgageWithOverpayments({
        principal,
        annualRate: fixedRate,
        termYears,
        fixedRateYears: 0,
        variableRate,
        monthlyOverpayment: 0,
      });

      // Standard payment should immediately reflect 4.5% rate
      const expectedPayment = calculateMonthlyMortgagePayment(principal, variableRate, termYears);
      expect(result.standardMonthlyPayment).toBeCloseTo(expectedPayment, 2);
      expect(result.variableMonthlyPayment).toBeCloseTo(expectedPayment, 2);

      // All months should be tagged as variable rate
      expect(result.schedule[0].isFixedPeriod).toBe(false);
      expect(result.schedule[0].isVariableRate).toBe(true);
      expect(result.schedule[0].interestRate).toBe(0.045);
    });

    it('maintains cashflow conservation with variable rate and active overpayments', () => {
      const principal = 600000;
      const result = calculateMortgageWithOverpayments(
        {
          principal,
          annualRate: 0.035, // 3.5%
          termYears: 25,
          fixedRateYears: 2,
          variableRate: 0.0475, // 4.75%
          monthlyOverpayment: 400,
          annualLumpSumOverpayment: 10000,
          lumpSumMonth: 3,
        },
        '2026-08-01'
      );

      let totalPrincipalPaid = 0;
      let totalInterestPaid = 0;

      for (const pt of result.schedule) {
        totalPrincipalPaid += pt.principalPaid + pt.overpaymentPaid;
        totalInterestPaid += pt.interestPaid;
        expect(pt.totalPayment).toBeCloseTo(pt.principalPaid + pt.overpaymentPaid + pt.interestPaid, 2);
      }

      expect(totalPrincipalPaid).toBeCloseTo(principal, 1);
      expect(totalInterestPaid).toBeCloseTo(result.totalInterestWithOverpayment, 1);
      expect(result.totalInterestSaved).toBe(result.totalInterestStandard - result.totalInterestWithOverpayment);
      expect(result.totalInterestSaved).toBeGreaterThan(0);
    });

    it('persists and calculates variable rate shock correctly from configuration defaults', () => {
      const fixedYears = DEFAULT_CONFIG.mortgage.fixed_rate_years ?? 2;
      const rateShock = DEFAULT_CONFIG.mortgage.variable_rate_shock_pct ?? 1.5;
      const initialRate = DEFAULT_CONFIG.mortgage.mortgage_interest_rate;
      const effectiveVarRate = initialRate + rateShock / 100;

      expect(fixedYears).toBe(2);
      expect(rateShock).toBe(1.5);
      expect(effectiveVarRate).toBeCloseTo(0.05, 3); // 3.50% + 1.50% = 5.00%

      const result = calculateMortgageWithOverpayments(
        {
          principal: 500000,
          annualRate: initialRate,
          termYears: 25,
          fixedRateYears: fixedYears,
          variableRate: effectiveVarRate,
          monthlyOverpayment: 0,
        },
        DEFAULT_CONFIG.meta.start_date
      );

      expect(result.variableMonthlyPayment).toBeGreaterThan(result.standardMonthlyPayment);
      expect(result.schedule[0].interestRate).toBeCloseTo(initialRate, 4);
      expect(result.schedule[fixedYears * 12 + 1].interestRate).toBeCloseTo(effectiveVarRate, 4);
    });
  });
});
