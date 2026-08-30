import { MortgageConfig } from './types';

export interface AmortizationResult {
  monthlyPayment: number;
  remainingBalance: number;
  cumulativeInterestPaid: number;
  cumulativePrincipalPaid: number;
}

export interface ActiveSalaryInfo {
  baseSalary: number;
  bonusEur: number;
  bonusPct: number;
  totalGrossSalary: number;
}

export function getSalaryAtDate(
  currentDateStr: string,
  mortgage: MortgageConfig
): ActiveSalaryInfo {
  let base = mortgage.buyer_gross_annual_base_salary_eur ?? mortgage.buyer_gross_annual_salary_eur ?? 0;
  let bonusPct = mortgage.buyer_annual_bonus_pct ?? 0;
  let bonusEur = mortgage.buyer_annual_bonus_eur ?? (base * bonusPct);

  // If there are salary adjustments, sort chronologically and pick the latest one on or before currentDateStr
  if (mortgage.salary_adjustments && mortgage.salary_adjustments.length > 0) {
    const sortedAdjustments = [...mortgage.salary_adjustments].sort((a, b) =>
      a.effective_date.localeCompare(b.effective_date)
    );
    for (const adj of sortedAdjustments) {
      const adjMonth = adj.effective_date.slice(0, 7);
      const targetMonth = currentDateStr.slice(0, 7);
      if (adjMonth <= targetMonth) {
        base = adj.base_salary_eur;
        if (adj.bonus_pct !== undefined && adj.bonus_pct !== null) {
          bonusPct = adj.bonus_pct;
          bonusEur = base * bonusPct;
        } else if (adj.bonus_eur !== undefined && adj.bonus_eur !== null) {
          bonusEur = adj.bonus_eur;
          bonusPct = base > 0 ? bonusEur / base : 0;
        } else {
          // preserve current bonus percentage
          bonusEur = base * bonusPct;
        }
      }
    }
  }

  const total = base + bonusEur;
  return {
    baseSalary: base,
    bonusEur,
    bonusPct,
    totalGrossSalary: total,
  };
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
  if (principal <= 0 || termYears <= 0) return 0;
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
  if (principal <= 0 || monthsElapsed <= 0 || termYears <= 0) {
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
    if (balance <= 0.001) {
      balance = 0;
      break;
    }
  }

  return {
    monthlyPayment,
    remainingBalance: balance <= 0.001 ? 0 : balance,
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

export function getEffectiveMaxMortgage(
  mortgage: MortgageConfig,
  currentDateStr?: string
): number {
  if (
    mortgage.approval_in_principle_amount_eur !== undefined &&
    mortgage.approval_in_principle_amount_eur !== null &&
    mortgage.approval_in_principle_amount_eur > 0
  ) {
    return mortgage.approval_in_principle_amount_eur;
  }
  const totalSalary = currentDateStr
    ? getSalaryAtDate(currentDateStr, mortgage).totalGrossSalary
    : getTotalGrossSalary(mortgage);
  return calculateMaxBorrowingCapacity(totalSalary, mortgage.cbi_max_lti_multiple);
}

export interface MortgageOverpaymentOptions {
  principal: number;
  annualRate: number;
  termYears: number;
  fixedRateYears?: number; // Initial fixed lock period where overpayments are 0 (e.g. 2 years)
  monthlyOverpayment?: number; // Regular monthly overpayment amount after fixed period
  annualLumpSumOverpayment?: number; // Optional annual lump sum after fixed period
  lumpSumMonth?: number; // Calendar month (1-12) when annual bonus lump sum is paid (default: 3 for March)
}

export interface AmortizationSchedulePoint {
  month: number;
  dateStr?: string;
  balance: number;
  interestPaid: number;
  principalPaid: number;
  overpaymentPaid: number;
  totalPayment: number;
  cumulativeInterestPaid: number;
  cumulativePrincipalPaid: number;
  isFixedPeriod: boolean;
  isLumpSumApplied?: boolean;
}

export interface MortgageOverpaymentResult {
  standardMonthlyPayment: number;
  effectiveMonthlyPayment: number;
  scheduledPayoffMonths: number;
  actualPayoffMonths: number;
  yearsSaved: number;
  monthsSaved: number;
  totalInterestStandard: number;
  totalInterestWithOverpayment: number;
  totalInterestSaved: number;
  totalPrincipalPaid: number;
  totalOverpaymentsPaid: number;
  schedule: AmortizationSchedulePoint[];
}

export function calculateMortgageWithOverpayments(
  options: MortgageOverpaymentOptions,
  startDateStr: string = '2026-08-01'
): MortgageOverpaymentResult {
  const {
    principal,
    annualRate,
    termYears,
    fixedRateYears = 2,
    monthlyOverpayment = 0,
    annualLumpSumOverpayment = 0,
    lumpSumMonth = 3, // Default March for Google/Dublin tech annual bonuses
  } = options;

  if (principal <= 0 || termYears <= 0) {
    return {
      standardMonthlyPayment: 0,
      effectiveMonthlyPayment: 0,
      scheduledPayoffMonths: 0,
      actualPayoffMonths: 0,
      yearsSaved: 0,
      monthsSaved: 0,
      totalInterestStandard: 0,
      totalInterestWithOverpayment: 0,
      totalInterestSaved: 0,
      totalPrincipalPaid: 0,
      totalOverpaymentsPaid: 0,
      schedule: [],
    };
  }

  const standardMonthlyPayment = calculateMonthlyMortgagePayment(principal, annualRate, termYears);
  const totalStandardMonths = termYears * 12;
  const standardAmort = calculateMortgageAmortization(principal, annualRate, termYears, totalStandardMonths);
  const totalInterestStandard = standardAmort.cumulativeInterestPaid;

  const monthlyRate = annualRate / 12;
  const fixedMonths = Math.max(0, fixedRateYears * 12);
  const schedule: AmortizationSchedulePoint[] = [];

  let balance = principal;
  let cumulativeInterestWithOverpayment = 0;
  let cumulativePrincipal = 0;
  let cumulativeOverpayments = 0;
  let actualPayoffMonths = totalStandardMonths;

  const [startYear, startMonth] = startDateStr.split('-').map((v) => parseInt(v, 10));

  for (let m = 1; m <= totalStandardMonths; m++) {
    // Date computation
    const curYear = startYear + Math.floor((startMonth - 1 + m) / 12);
    const curMonthNum = ((startMonth - 1 + m) % 12) + 1;
    const dateStr = `${curYear}-${String(curMonthNum).padStart(2, '0')}`;

    const isFixedPeriod = m <= fixedMonths;
    const regularOverpayment = isFixedPeriod ? 0 : Math.max(0, monthlyOverpayment);
    const isLumpSumMonth = !isFixedPeriod && curMonthNum === lumpSumMonth;
    const lumpSumOverpayment = isLumpSumMonth ? Math.max(0, annualLumpSumOverpayment) : 0;
    const targetOverpayment = regularOverpayment + lumpSumOverpayment;

    const interest = balance * monthlyRate;
    const scheduledPrincipal = Math.min(balance, Math.max(0, standardMonthlyPayment - interest));
    const extraPrincipal = Math.min(Math.max(0, balance - scheduledPrincipal), targetOverpayment);
    const principalPaidThisMonth = scheduledPrincipal + extraPrincipal;

    balance -= principalPaidThisMonth;
    cumulativeInterestWithOverpayment += interest;
    cumulativePrincipal += principalPaidThisMonth;
    cumulativeOverpayments += extraPrincipal;

    schedule.push({
      month: m,
      dateStr,
      balance: balance <= 0.001 ? 0 : balance,
      interestPaid: interest,
      principalPaid: scheduledPrincipal,
      overpaymentPaid: extraPrincipal,
      totalPayment: interest + principalPaidThisMonth,
      cumulativeInterestPaid: cumulativeInterestWithOverpayment,
      cumulativePrincipalPaid: cumulativePrincipal,
      isFixedPeriod,
      isLumpSumApplied: isLumpSumMonth && extraPrincipal > regularOverpayment,
    });

    if (balance <= 0.001) {
      actualPayoffMonths = m;
      balance = 0;
      break;
    }
  }

  const monthsSaved = Math.max(0, totalStandardMonths - actualPayoffMonths);
  const yearsSaved = Math.floor(monthsSaved / 12) + (monthsSaved % 12) / 12;
  const totalInterestSaved = Math.max(0, totalInterestStandard - cumulativeInterestWithOverpayment);

  return {
    standardMonthlyPayment,
    effectiveMonthlyPayment: standardMonthlyPayment + Math.max(0, monthlyOverpayment),
    scheduledPayoffMonths: totalStandardMonths,
    actualPayoffMonths,
    yearsSaved,
    monthsSaved,
    totalInterestStandard,
    totalInterestWithOverpayment: cumulativeInterestWithOverpayment,
    totalInterestSaved,
    totalPrincipalPaid: cumulativePrincipal,
    totalOverpaymentsPaid: cumulativeOverpayments,
    schedule,
  };
}
