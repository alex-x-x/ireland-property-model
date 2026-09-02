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

    it('filters out strategies exceeding maxMonthlyBudgetEur and adjusts archetypes', () => {
      // Run unconstrained first
      const unconstrained = runMortgageOptimization(config, purchaseMonth, monthlyPoints);
      const maxPayment = Math.max(...unconstrained.allResults.map((r) => r.totalMonthlyPayment));

      // Now set a tight budget (e.g. €2,200/mo) that eliminates 15-year / heavy overpayment recipes
      const tightBudget = 2200;
      expect(maxPayment).toBeGreaterThan(tightBudget);
      const constrained = runMortgageOptimization(config, purchaseMonth, monthlyPoints, tightBudget);

      expect(constrained.maxMonthlyBudgetEur).toBe(tightBudget);
      expect(constrained.compliantResults.length).toBeLessThan(constrained.allResults.length);
      expect(constrained.compliantResults.every((r) => r.totalMonthlyPayment <= tightBudget + 0.01)).toBe(true);

      // All Pareto frontier points must respect the tight budget
      expect(constrained.paretoFrontier.every((r) => r.totalMonthlyPayment <= tightBudget + 0.01)).toBe(true);

      // Curated archetypes that are non-null must respect the tight budget
      if (constrained.curated.wealthMaximizer) {
        expect(constrained.curated.wealthMaximizer.totalMonthlyPayment).toBeLessThanOrEqual(tightBudget + 0.01);
      }
      if (constrained.curated.sweetSpot) {
        expect(constrained.curated.sweetSpot.totalMonthlyPayment).toBeLessThanOrEqual(tightBudget + 0.01);
      }
      if (constrained.curated.debtFreeAccelerator) {
        expect(constrained.curated.debtFreeAccelerator.totalMonthlyPayment).toBeLessThanOrEqual(tightBudget + 0.01);
      }
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
  });
});


