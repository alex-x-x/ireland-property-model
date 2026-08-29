import { MortgageConfig } from './types';

export interface AmortizationResult {
  monthlyPayment: number;
  remainingBalance: number;
  cumulativeInterestPaid: number;
  cumulativePrincipalPaid: number;
}

export function getBonusAmountEur(mortgage: MortgageConfig): number {
  const base = mortgage.buyer_gross_annual_base_salary_eur || 0;
  if (mortgage.buyer_annual_bonus_pct !== undefined && mortgage.buyer_annual_bonus_pct !== null) {
    return base * mortgage.buyer_annual_bonus_pct;
  }
  if (mortgage.buyer_annual_bonus_eur !== undefined && mortgage.buyer_annual_bonus_eur !== null) {
    return mortgage.buyer_annual_bonus_eur;
  }
  return 0;
}

export function getTotalGrossSalary(mortgage: MortgageConfig): number {
  if (mortgage.buyer_gross_annual_base_salary_eur !== undefined && mortgage.buyer_gross_annual_base_salary_eur !== null) {
    const base = mortgage.buyer_gross_annual_base_salary_eur;
    const bonus = getBonusAmountEur(mortgage);
    return base + bonus;
  }
  return mortgage.buyer_gross_annual_salary_eur || 0;
}

export function calculateMonthlyMortgagePayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0) return 0;
  const n = termYears * 12;
  const r = annualRate / 12;

  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * (r * factor)) / (factor - 1);
}

export function calculateMortgageAmortization(
  principal: number,
  annualRate: number,
  termYears: number,
  monthsElapsed: number
): AmortizationResult {
  if (principal <= 0 || monthsElapsed <= 0) {
    return {
      monthlyPayment: 0,
      remainingBalance: Math.max(0, principal),
      cumulativeInterestPaid: 0,
      cumulativePrincipalPaid: 0,
    };
  }

  const monthlyPayment = calculateMonthlyMortgagePayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 12;
  const totalMonths = termYears * 12;
  const effectiveMonths = Math.min(monthsElapsed, totalMonths);

  let balance = principal;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;

  for (let m = 1; m <= effectiveMonths; m++) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(balance, monthlyPayment - interest);
    balance -= principalPaid;
    cumulativeInterest += interest;
    cumulativePrincipal += principalPaid;
    if (balance <= 0) {
      balance = 0;
      break;
    }
  }

  return {
    monthlyPayment,
    remainingBalance: balance,
    cumulativeInterestPaid: cumulativeInterest,
    cumulativePrincipalPaid: cumulativePrincipal,
  };
}

export function calculateMaxBorrowingCapacity(
  grossAnnualSalaryEur: number,
  cbiMaxLtiMultiple: number = 4.0
): number {
  return Math.max(0, grossAnnualSalaryEur * cbiMaxLtiMultiple);
}

export function getEffectiveMaxMortgage(mortgage: MortgageConfig): number {
  if (
    mortgage.approval_in_principle_amount_eur !== undefined &&
    mortgage.approval_in_principle_amount_eur !== null &&
    mortgage.approval_in_principle_amount_eur > 0
  ) {
    return mortgage.approval_in_principle_amount_eur;
  }
  const totalSalary = getTotalGrossSalary(mortgage);
  return calculateMaxBorrowingCapacity(totalSalary, mortgage.cbi_max_lti_multiple);
}
