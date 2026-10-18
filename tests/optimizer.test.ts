import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../src/engine/constants';
import { runSimulation } from '../src/engine/simulation';
import {
  generateCandidateStrategies,
  evaluateMortgageStrategy,
  computeParetoFrontier,
  identifyCuratedArchetypes,
  calculateStockHurdleRate,
  runMortgageOptimization,
} from '../src/engine/optimizer';
import { MortgageStrategyCandidate, SimulationConfig } from '../src/engine/types';

describe('Mortgage & Terminal Net Wealth Frontier Optimizer', () => {
  const config: SimulationConfig = { ...DEFAULT_CONFIG };
  const monthlyPoints = runSimulation(config);
  const purchaseMonth = 0; // Purchase at Month 0
  const activePoint = monthlyPoints[purchaseMonth];

  describe('generateCandidateStrategies', () => {
    it('generates a rich, structured set of candidate strategies across LTVs, terms, and overpayments', () => {
      const candidates = generateCandidateStrategies(config, activePoint);
      expect(candidates.length).toBeGreaterThan(20);

      // Verify presence of standard LTV tiers
      const ltvPcts = candidates.map((c) => Math.round(c.ltvPct));
      expect(ltvPcts).toContain(80);
      expect(ltvPcts).toContain(70);

      // Verify presence of multiple terms
      const terms = new Set(candidates.map((c) => c.termYears));
      expect(terms.has(25)).toBe(true);
      expect(terms.has(30)).toBe(true);

      // Verify all candidates have non-negative loan amounts and valid IDs
      candidates.forEach((c) => {
        expect(c.loanAmount).toBeGreaterThanOrEqual(0);
        expect(c.depositAmount).toBeGreaterThanOrEqual(0);
        expect(c.id).toBeTruthy();
      });
    });

    it('strictly uses the user-configured mortgage interest rate without hidden LTV tier adjustments', () => {
      // Test with default 3.5%
      const candidates35 = generateCandidateStrategies(config, activePoint);
      candidates35.forEach((c) => {
        expect(c.interestRatePct).toBe(3.5);
      });

      // Test with custom 3.25%
      const config325: SimulationConfig = {
        ...config,
        mortgage: {
          ...config.mortgage,
          mortgage_interest_rate: 0.0325,
        },
      };
      const candidates325 = generateCandidateStrategies(config325, activePoint);
      candidates325.forEach((c) => {
        expect(c.interestRatePct).toBe(3.25);
      });

      // Test with custom 4.80%
      const config48: SimulationConfig = {
        ...config,
        mortgage: {
          ...config.mortgage,
          mortgage_interest_rate: 0.048,
        },
      };
      const candidates48 = generateCandidateStrategies(config48, activePoint);
      candidates48.forEach((c) => {
        expect(c.interestRatePct).toBe(4.8);
      });
    });
  });

  describe('evaluateMortgageStrategy', () => {
    it('accurately evaluates financial trajectory, lifetime interest, and Terminal Net Wealth at M60', () => {
      const candidate: MortgageStrategyCandidate = {
        id: 'test_candidate_1',
        depositAmount: 160000, // 20% deposit on €800k
        depositPct: 0.20,
        loanAmount: 640000,
        ltvPct: 80,
        termYears: 25,
        interestRatePct: 3.5,
        fixedRateYears: 2,
        monthlyOverpayment: 300,
        annualBonusLumpSum: 0,
        strategyType: 'green_80',
      };

      const result = evaluateMortgageStrategy(candidate, config, monthlyPoints, purchaseMonth);

      expect(result.candidate.id).toBe('test_candidate_1');
      expect(result.monthlyMortgagePayment).toBeGreaterThan(2000);
      expect(result.totalLifetimeInterest).toBeGreaterThan(0);
      expect(result.actualPayoffMonths).toBeLessThan(25 * 12); // Overpayment reduces payoff time
      expect(result.yearsSaved).toBeGreaterThan(0);
      expect(result.terminalNetWealthM60).toBeGreaterThan(0);
      expect(result.safetyScore).toBeGreaterThanOrEqual(0);
      expect(result.safetyScore).toBeLessThanOrEqual(100);
    });

    it('flags unfundable candidates when upfront costs exceed total liquid wealth', () => {
      const candidate: MortgageStrategyCandidate = {
        id: 'unfundable_candidate',
        depositAmount: 900000, // Exceeds available liquid funds
        depositPct: 1.125,
        loanAmount: 0,
        ltvPct: 0,
        termYears: 25,
        interestRatePct: 3.5,
        fixedRateYears: 2,
        monthlyOverpayment: 0,
        annualBonusLumpSum: 0,
        strategyType: 'max_deposit',
      };

      const result = evaluateMortgageStrategy(candidate, config, monthlyPoints, purchaseMonth);
      expect(result.isFundable).toBe(false);
    });

    it('incorporates fixed_rate_years from config and applies variable rate shock to lifetime interest and monthly payment', () => {
      const customConfig: SimulationConfig = {
        ...config,
        mortgage: {
          ...config.mortgage,
          fixed_rate_years: 3,
          variable_rate_shock_pct: 1.5,
        },
      };

      const candidates = generateCandidateStrategies(customConfig, activePoint);
      expect(candidates[0].fixedRateYears).toBe(3);

      const candidate: MortgageStrategyCandidate = {
        id: 'shock_test_candidate',
        depositAmount: 160000,
        depositPct: 0.20,
        loanAmount: 640000,
        ltvPct: 80,
        termYears: 25,
        interestRatePct: 3.5,
        fixedRateYears: 3,
        monthlyOverpayment: 0,
        annualBonusLumpSum: 0,
        strategyType: 'green_80',
      };

      const flatConfig: SimulationConfig = {
        ...customConfig,
        mortgage: {
          ...customConfig.mortgage,
          variable_rate_shock_pct: 0,
        },
      };

      const resultFlat = evaluateMortgageStrategy(candidate, flatConfig, monthlyPoints, purchaseMonth);
      const resultShocked = evaluateMortgageStrategy(candidate, customConfig, monthlyPoints, purchaseMonth);

      // Shocked lifetime interest must be significantly higher than flat rate
      expect(resultShocked.totalLifetimeInterest).toBeGreaterThan(resultFlat.totalLifetimeInterest);
      expect(resultShocked.totalLifetimeInterest - resultFlat.totalLifetimeInterest).toBeGreaterThan(50000);

      // Variable monthly payment should be populated and higher than standard fixed payment
      expect(resultShocked.variableMonthlyPayment).toBeDefined();
      expect(resultShocked.variableMonthlyPayment!).toBeGreaterThan(resultShocked.mandatoryMonthlyPayment);

      // Post-fixed trajectory impact: at M60, terminal liquid wealth should be lower due to higher variable monthly payments
      expect(resultShocked.terminalLiquidWealthM60).toBeLessThan(resultFlat.terminalLiquidWealthM60);
    });
  });

  describe('computeParetoFrontier', () => {
    it('extracts non-dominated solutions optimizing for Lifetime Interest and Terminal Net Wealth', () => {
      const candidates = generateCandidateStrategies(config, activePoint);
      const evaluated = candidates.map((c) => evaluateMortgageStrategy(c, config, monthlyPoints, purchaseMonth));
      const frontier = computeParetoFrontier(evaluated);

      expect(frontier.length).toBeGreaterThan(0);
      expect(frontier.length).toBeLessThanOrEqual(evaluated.length);

      // Verify frontier is sorted by lifetime interest ascending
      for (let i = 1; i < frontier.length; i++) {
        expect(frontier[i].totalLifetimeInterest).toBeGreaterThanOrEqual(frontier[i - 1].totalLifetimeInterest);
        // On a 2D Pareto frontier of min(Interest) vs max(Wealth), wealth must also increase with interest
        expect(frontier[i].terminalNetWealthM60).toBeGreaterThanOrEqual(frontier[i - 1].terminalNetWealthM60);
      }
    });
  });

  describe('identifyCuratedArchetypes', () => {
    it('successfully extracts 4 distinct strategic archetypes', () => {
      const candidates = generateCandidateStrategies(config, activePoint);
      const evaluated = candidates.map((c) => evaluateMortgageStrategy(c, config, monthlyPoints, purchaseMonth));
      const directCurated = identifyCuratedArchetypes(evaluated);

      expect(directCurated.wealthMaximizer).not.toBeNull();
      expect(directCurated.greenArbitrageur).not.toBeNull();
      expect(directCurated.sweetSpot).not.toBeNull();
      expect(directCurated.debtFreeAccelerator).not.toBeNull();

      const analysis = runMortgageOptimization(config, purchaseMonth, monthlyPoints);

      expect(analysis.curated.wealthMaximizer).not.toBeNull();
      expect(analysis.curated.greenArbitrageur).not.toBeNull();
      expect(analysis.curated.sweetSpot).not.toBeNull();
      expect(analysis.curated.debtFreeAccelerator).not.toBeNull();

      // Debt-free accelerator should have lowest payoff time or lowest interest
      const debtFree = analysis.curated.debtFreeAccelerator!;
      const wealthMax = analysis.curated.wealthMaximizer!;

      expect(debtFree.actualPayoffMonths).toBeLessThanOrEqual(wealthMax.actualPayoffMonths);
    });
  });

  describe('calculateStockHurdleRate', () => {
    it('calculates mathematically sound pre-tax and post-tax crossover hurdle rates', () => {
      const mortgageRate = 0.035; // 3.5%
      const cgtRate = 0.33; // 33% Irish CGT
      const hurdle = calculateStockHurdleRate(mortgageRate, cgtRate);

      expect(hurdle.postTaxRate).toBeCloseTo(0.035, 3);
      // Pre-tax stock growth needed = mortgageRate / (1 - CGT) = 0.035 / 0.67 ~= 0.0522 (5.22%)
      expect(hurdle.preTaxStockGrowthRate).toBeCloseTo(0.035 / 0.67, 3);
    });
  });

  describe('Budget Constraints & DSTI (Debt-Service-to-Income)', () => {
    it('computes totalMonthlyPayment and dstiPct correctly for evaluated strategies', () => {
      const analysis = runMortgageOptimization(config, purchaseMonth, monthlyPoints);
      expect(analysis.netMonthlyIncomeEur).toBeGreaterThan(0);
      expect(analysis.allResults.length).toBeGreaterThan(0);

      const first = analysis.allResults[0];
      expect(first.totalMonthlyPayment).toBeGreaterThan(0);
      expect(first.dstiPct).toBeGreaterThan(0);
      expect(first.totalMonthlyPayment).toBeCloseTo(
        first.monthlyMortgagePayment + first.candidate.monthlyOverpayment,
        1
      );
    });

    it('filters out strategies where mandatoryMonthlyPayment exceeds maxMonthlyBudgetEur and adjusts archetypes', () => {
      // Run unconstrained first
      const unconstrained = runMortgageOptimization(config, purchaseMonth, monthlyPoints);
      const maxMandatory = Math.max(...unconstrained.allResults.map((r) => r.mandatoryMonthlyPayment));

      // Set a tight budget that eliminates high mandatory payments (e.g. 15-year terms)
      const tightBudget = Math.round(maxMandatory * 0.7);
      expect(maxMandatory).toBeGreaterThan(tightBudget);
      const constrained = runMortgageOptimization(config, purchaseMonth, monthlyPoints, tightBudget);

      expect(constrained.maxMonthlyBudgetEur).toBe(tightBudget);
      expect(constrained.compliantResults.length).toBeLessThan(constrained.allResults.length);
      expect(constrained.compliantResults.every((r) => r.mandatoryMonthlyPayment <= tightBudget + 0.01)).toBe(true);

      // All Pareto frontier points must respect the tight mandatory budget
      expect(constrained.paretoFrontier.every((r) => r.mandatoryMonthlyPayment <= tightBudget + 0.01)).toBe(true);

      // Curated archetypes that are non-null must respect the tight mandatory budget
      if (constrained.curated.wealthMaximizer) {
        expect(constrained.curated.wealthMaximizer.mandatoryMonthlyPayment).toBeLessThanOrEqual(tightBudget + 0.01);
      }
      if (constrained.curated.sweetSpot) {
        expect(constrained.curated.sweetSpot.mandatoryMonthlyPayment).toBeLessThanOrEqual(tightBudget + 0.01);
      }
      if (constrained.curated.debtFreeAccelerator) {
        expect(constrained.curated.debtFreeAccelerator.mandatoryMonthlyPayment).toBeLessThanOrEqual(tightBudget + 0.01);
      }
    });

    it('generates overpayments scaled to free monthly surplus without causing negative buffer', () => {
      const candidates = generateCandidateStrategies(config, activePoint);
      candidates.forEach((c) => {
        expect(c.monthlyOverpayment).toBeGreaterThanOrEqual(0);
        if (c.overpaymentSurplusPct !== undefined) {
          expect(c.overpaymentSurplusPct).toBeGreaterThanOrEqual(0);
          expect(c.overpaymentSurplusPct).toBeLessThanOrEqual(0.75);
        }
      });
    });

    it('accurately tags isParetoOptimal on corresponding items in allResults', () => {
      const analysis = runMortgageOptimization(config, purchaseMonth, monthlyPoints);
      const paretoIds = new Set(analysis.paretoFrontier.map((p) => p.candidate.id));

      const taggedParetoItems = analysis.allResults.filter((r) => r.isParetoOptimal);
      expect(taggedParetoItems.length).toBe(analysis.paretoFrontier.length);
      expect(taggedParetoItems.every((r) => paretoIds.has(r.candidate.id))).toBe(true);
    });

    it('handles zero-compliance extreme low budget (€100/mo) gracefully without exceptions', () => {
      const impossibleBudget = 100;
      const analysis = runMortgageOptimization(config, purchaseMonth, monthlyPoints, impossibleBudget);

      expect(analysis.compliantResults).toHaveLength(0);
      expect(analysis.paretoFrontier).toHaveLength(0);
      expect(analysis.curated.wealthMaximizer).toBeNull();
      expect(analysis.curated.greenArbitrageur).toBeNull();
      expect(analysis.curated.sweetSpot).toBeNull();
      expect(analysis.curated.debtFreeAccelerator).toBeNull();
    });

    it('defaults max_contractual_monthly_payment_eur to null in DEFAULT_CONFIG and supports budget persistence', () => {
      expect(DEFAULT_CONFIG.mortgage.max_contractual_monthly_payment_eur).toBeNull();

      const customConfig: SimulationConfig = {
        ...DEFAULT_CONFIG,
        mortgage: {
          ...DEFAULT_CONFIG.mortgage,
          max_contractual_monthly_payment_eur: 2800,
        },
      };

      const customAnalysis = runMortgageOptimization(
        customConfig,
        purchaseMonth,
        monthlyPoints,
        customConfig.mortgage.max_contractual_monthly_payment_eur ?? undefined
      );

      expect(customAnalysis.maxMonthlyBudgetEur).toBe(2800);
      expect(customAnalysis.compliantResults.every((r) => r.mandatoryMonthlyPayment <= 2800 + 0.01)).toBe(true);
    });
  });

  describe('Optimizer Enhancements: Max Term, Fixed Loan Mode & Fixed Rate Allowance', () => {
    it('caps candidate mortgage terms using maxTermYears (e.g. 26 years)', () => {
      const candidates26 = generateCandidateStrategies(config, activePoint, { maxTermYears: 26 });
      const terms = Array.from(new Set(candidates26.map((c) => c.termYears))).sort((a, b) => a - b);

      expect(terms).toEqual([15, 20, 25, 26]);
      expect(terms).not.toContain(30);
      expect(terms).not.toContain(35);
      candidates26.forEach((c) => {
        expect(c.termYears).toBeLessThanOrEqual(26);
      });
    });

    it('generates candidates exclusively for a fixed loan amount in fixed_loan mode', () => {
      const targetLoan = 650000;
      const candidatesFixed = generateCandidateStrategies(config, activePoint, {
        loanMode: 'fixed_loan',
        fixedLoanAmountEur: targetLoan,
        maxTermYears: 26,
      });

      expect(candidatesFixed.length).toBeGreaterThan(0);
      // All candidates must have the exact target loan amount
      candidatesFixed.forEach((c) => {
        expect(c.loanAmount).toBe(targetLoan);
        expect(c.depositAmount).toBe(activePoint.propertyPrice - targetLoan);
      });

      // Candidates should still vary across terms and overpayment surplus ratios
      const terms = new Set(candidatesFixed.map((c) => c.termYears));
      expect(terms.size).toBe(4); // 15, 20, 25, 26
    });

    it('includes Max AIP loan candidate in all_tiers mode', () => {
      const candidatesAll = generateCandidateStrategies(config, activePoint, { loanMode: 'all_tiers' });
      const statutoryMinDeposit = activePoint.propertyPrice * (config.property.minimum_deposit_pct ?? 0.10);
      const expectedMaxAipLoan = Math.min(activePoint.maxMortgageAvailable, activePoint.propertyPrice - statutoryMinDeposit);

      const hasMaxAip = candidatesAll.some(
        (c) => Math.abs(c.loanAmount - expectedMaxAipLoan) < 500
      );
      expect(hasMaxAip).toBe(true);
    });

    it('clamps fixed loan amount so it never exceeds max AIP capacity or statutory minimum deposit', () => {
      // Attempting €2,000,000 loan on a €950,000 property
      const impossibleHighLoan = 2000000;
      const candidates = generateCandidateStrategies(config, activePoint, {
        loanMode: 'fixed_loan',
        fixedLoanAmountEur: impossibleHighLoan,
      });

      expect(candidates.length).toBeGreaterThan(0);
      const statutoryMinDeposit = activePoint.propertyPrice * (config.property.minimum_deposit_pct ?? 0.10);
      const expectedMaxLoan = Math.min(activePoint.maxMortgageAvailable, activePoint.propertyPrice - statutoryMinDeposit);

      candidates.forEach((c) => {
        expect(c.loanAmount).toBeLessThanOrEqual(expectedMaxLoan);
        expect(c.depositAmount).toBeGreaterThanOrEqual(statutoryMinDeposit);
      });
    });

    it('supports custom loan amounts distinct from sidebar deposit and AIP within statutory 90% LTV', () => {
      const fixedConfig: SimulationConfig = {
        ...config,
        liquid_assets: {
          ...config.liquid_assets,
          cash_eur: 300000,
        },
        property: {
          ...config.property,
          target_price_eur: 710000,
          deposit_eur: 213000, // Sidebar loan = 497,000
        },
      };

      const pts = runSimulation(fixedConfig);
      const customLoan = 550000; // Higher than sidebar loan €497k, within statutory 90% (€639k)
      const analysis = runMortgageOptimization(fixedConfig, 0, pts, undefined, {
        loanMode: 'fixed_loan',
        fixedLoanAmountEur: customLoan,
      });

      expect(analysis.allResults.length).toBeGreaterThan(0);
      expect(analysis.compliantResults.length).toBeGreaterThan(0);
      expect(analysis.compliantResults[0].candidate.loanAmount).toBe(customLoan);
      expect(analysis.compliantResults[0].candidate.depositAmount).toBe(710000 - customLoan);
      expect(analysis.compliantResults[0].isFundable).toBe(true);
    });

    it('demonstrates single dominant Pareto point in fixed loan mode when debt paydown strictly beats uninvested cash', () => {
      const fixedConfig: SimulationConfig = {
        ...config,
        liquid_assets: {
          ...config.liquid_assets,
          cash_eur: 300000,
        },
        property: {
          ...config.property,
          target_price_eur: 710000,
          deposit_eur: 213000,
        },
        mortgage: {
          ...config.mortgage,
          max_mortgage_term_years: 26,
          fixed_rate_annual_overpayment_allowance_eur: 0,
        },
      };

      const pts = runSimulation(fixedConfig);
      const analysis = runMortgageOptimization(fixedConfig, 0, pts, 2800, {
        loanMode: 'fixed_loan',
        fixedLoanAmountEur: 497000,
        maxTermYears: 26,
        fixedAnnualAllowanceEur: 0,
        investSurplusCashflow: false,
      });

      // With cash earning 0%, paying off 3.95% debt earlier saves interest AND preserves/grows net worth,
      // so the fastest affordable payoff strictly dominates slower alternatives in both dimensions.
      expect(analysis.compliantResults.length).toBeGreaterThan(1);
      expect(analysis.paretoFrontier.length).toBe(1);
      expect(analysis.paretoFrontier[0].isParetoOptimal).toBe(true);
      expect(analysis.curated.wealthMaximizer?.candidate.id).toBe(analysis.paretoFrontier[0].candidate.id);
    });

    it('evaluates fixed-rate overpayment allowance in runMortgageOptimization', () => {
      const analysisStrict = runMortgageOptimization(config, purchaseMonth, monthlyPoints, undefined, {
        fixedAnnualAllowanceEur: 0,
      });
      const analysisAib = runMortgageOptimization(config, purchaseMonth, monthlyPoints, undefined, {
        fixedAnnualAllowanceEur: 5000,
      });

      expect(analysisAib.fixedAnnualAllowanceEur).toBe(5000);
      expect(analysisStrict.fixedAnnualAllowanceEur).toBe(0);
    });
  });

  describe('Invest vs. Overpay Surplus Cashflow Allocation', () => {
    const fixedConfig: SimulationConfig = {
      ...config,
      liquid_assets: {
        ...config.liquid_assets,
        cash_eur: 300000,
      },
      property: {
        ...config.property,
        target_price_eur: 710000,
        deposit_eur: 213000,
      },
      mortgage: {
        ...config.mortgage,
        max_mortgage_term_years: 26,
        fixed_rate_annual_overpayment_allowance_eur: 0,
      },
    };
    const pts = runSimulation(fixedConfig);

    it('generates a multi-point Pareto frontier in fixed loan mode when surplus cashflow is invested at market yield > mortgage rate', () => {
      const analysisInvest = runMortgageOptimization(fixedConfig, 0, pts, 2800, {
        loanMode: 'fixed_loan',
        fixedLoanAmountEur: 497000,
        maxTermYears: 26,
        fixedAnnualAllowanceEur: 0,
        investSurplusCashflow: true,
        surplusInvestmentYieldPct: 12.0,
      });

      // Investing at 12% > 3.95% mortgage rate must produce multiple non-dominated Pareto frontier points
      expect(analysisInvest.compliantResults.length).toBeGreaterThan(1);
      expect(analysisInvest.paretoFrontier.length).toBeGreaterThan(1);

      // On a valid 2D Pareto frontier, higher interest paid must correspond to higher terminal net wealth
      for (let i = 1; i < analysisInvest.paretoFrontier.length; i++) {
        expect(analysisInvest.paretoFrontier[i].totalLifetimeInterest).toBeGreaterThanOrEqual(
          analysisInvest.paretoFrontier[i - 1].totalLifetimeInterest
        );
        expect(analysisInvest.paretoFrontier[i].terminalNetWealthM60).toBeGreaterThanOrEqual(
          analysisInvest.paretoFrontier[i - 1].terminalNetWealthM60
        );
      }
    });

    it('gracefully collapses to a single dominant recipe when investSurplusCashflow is false or yield is 0%', () => {
      const analysisCash = runMortgageOptimization(fixedConfig, 0, pts, 2800, {
        loanMode: 'fixed_loan',
        fixedLoanAmountEur: 497000,
        maxTermYears: 26,
        fixedAnnualAllowanceEur: 0,
        investSurplusCashflow: false,
        surplusInvestmentYieldPct: 0,
      });

      expect(analysisCash.paretoFrontier.length).toBe(1);
    });

    it('monotonically scales terminal net wealth with higher surplus investment yield', () => {
      const analysis8 = runMortgageOptimization(fixedConfig, 0, pts, 2800, {
        loanMode: 'fixed_loan',
        fixedLoanAmountEur: 497000,
        maxTermYears: 26,
        investSurplusCashflow: true,
        surplusInvestmentYieldPct: 8.0,
      });
      const analysis12 = runMortgageOptimization(fixedConfig, 0, pts, 2800, {
        loanMode: 'fixed_loan',
        fixedLoanAmountEur: 497000,
        maxTermYears: 26,
        investSurplusCashflow: true,
        surplusInvestmentYieldPct: 12.0,
      });

      // Terminal wealth for Wealth Maximizer should be strictly higher under 12% yield than 8% yield
      expect(analysis12.curated.wealthMaximizer!.terminalNetWealthM60).toBeGreaterThan(
        analysis8.curated.wealthMaximizer!.terminalNetWealthM60
      );
    });
  });
});



