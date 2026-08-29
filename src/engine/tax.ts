import { IrishTaxConfig } from './types';

export interface IrishTaxBreakdown {
  grossAnnualSalary: number;
  standardRateTax: number; // 20% on income up to SRCOP
  higherRateTax: number;   // 40% on income above SRCOP
  grossIncomeTax: number;  // standardRateTax + higherRateTax
  taxCreditsUsed: number;  // min(grossIncomeTax, taxCredits)
  netIncomeTax: number;    // grossIncomeTax - taxCreditsUsed
  usc: number;             // Universal Social Charge
  prsi: number;            // PRSI Class A
  totalTax: number;        // netIncomeTax + usc + prsi
  netAnnualTakeHome: number;
  netMonthlyTakeHome: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
}

export function calculateIrishUsc(grossSalary: number): number {
  if (grossSalary <= 0) return 0;
  // 2026 Ireland USC Thresholds & Rates:
  // Tier 1: 0.5% on first €12,012
  // Tier 2: 2.0% on next €13,748 (up to €25,760)
  // Tier 3: 4.0% on next €44,284 (up to €70,044)
  // Tier 4: 8.0% on balance over €70,044
  let usc = 0;
  const t1 = Math.min(grossSalary, 12012);
  usc += t1 * 0.005;

  if (grossSalary > 12012) {
    const t2 = Math.min(grossSalary - 12012, 13748);
    usc += t2 * 0.02;
  }

  if (grossSalary > 25760) {
    const t3 = Math.min(grossSalary - 25760, 44284);
    usc += t3 * 0.04;
  }

  if (grossSalary > 70044) {
    const t4 = grossSalary - 70044;
    usc += t4 * 0.08;
  }

  return usc;
}

export function calculateIrishPrsi(grossSalary: number): number {
  if (grossSalary <= 0) return 0;
  // Standard Irish Class A PRSI employee contribution (4.0%)
  return grossSalary * 0.04;
}

export function calculateIrishTaxBreakdown(
  grossAnnualSalary: number,
  taxConfig: Partial<IrishTaxConfig> = {}
): IrishTaxBreakdown {
  const srcop = taxConfig.standard_rate_cutoff_eur ?? 53000;
  const taxCredits = taxConfig.tax_credits_eur ?? 9000;

  if (grossAnnualSalary <= 0) {
    return {
      grossAnnualSalary: 0,
      standardRateTax: 0,
      higherRateTax: 0,
      grossIncomeTax: 0,
      taxCreditsUsed: 0,
      netIncomeTax: 0,
      usc: 0,
      prsi: 0,
      totalTax: 0,
      netAnnualTakeHome: 0,
      netMonthlyTakeHome: 0,
      effectiveTaxRate: 0,
      marginalTaxRate: 0.20,
    };
  }

  // 1. Income Tax (PAYE)
  const standardPortion = Math.min(grossAnnualSalary, srcop);
  const higherPortion = Math.max(0, grossAnnualSalary - srcop);
  const standardRateTax = standardPortion * 0.20;
  const higherRateTax = higherPortion * 0.40;
  const grossIncomeTax = standardRateTax + higherRateTax;
  const taxCreditsUsed = Math.min(grossIncomeTax, taxCredits);
  const netIncomeTax = Math.max(0, grossIncomeTax - taxCreditsUsed);

  // 2. USC & PRSI
  const usc = calculateIrishUsc(grossAnnualSalary);
  const prsi = calculateIrishPrsi(grossAnnualSalary);

  const totalTax = netIncomeTax + usc + prsi;
  const netAnnualTakeHome = grossAnnualSalary - totalTax;
  const netMonthlyTakeHome = netAnnualTakeHome / 12;
  const effectiveTaxRate = grossAnnualSalary > 0 ? totalTax / grossAnnualSalary : 0;

  // Marginal Tax Rate on supplemental income (GSUs / Annual Bonus)
  // For salary above €70k & above SRCOP, marginal rate is exactly 40% PAYE + 8% USC + 4% PRSI = 52%
  const marginalTaxRate = grossAnnualSalary >= 70044 && grossAnnualSalary >= srcop ? 0.52 : 0.40;

  return {
    grossAnnualSalary,
    standardRateTax,
    higherRateTax,
    grossIncomeTax,
    taxCreditsUsed,
    netIncomeTax,
    usc,
    prsi,
    totalTax,
    netAnnualTakeHome,
    netMonthlyTakeHome,
    effectiveTaxRate,
    marginalTaxRate,
  };
}
