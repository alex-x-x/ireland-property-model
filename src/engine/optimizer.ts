import {
  SimulationConfig,
  MonthlyDataPoint,
  MortgageStrategyCandidate,
  MortgageStrategyResult,
  CuratedStrategies,
  OptimizationAnalysis,
} from './types';
import {
  calculateMortgageWithOverpayments,
  getSalaryAtDate,
} from './mortgage';
import { calculateIrishTaxBreakdown } from './tax';
import { calculateStampDuty } from './simulation';

/**
 * Calculates the exact Irish pre-tax and post-tax stock hurdle rate.
 * Mortgage interest saved is a guaranteed, tax-free return.
 * Post-vest equity gains are taxed at Irish 33% CGT.
 */
export function calculateStockHurdleRate(
  mortgageAnnualRate: number,
  cgtRate: number = 0.33
): { postTaxRate: number; preTaxStockGrowthRate: number } {
  const postTaxRate = mortgageAnnualRate;
  const effectiveCgt = Math.max(0, Math.min(0.99, cgtRate));
  const preTaxStockGrowthRate = postTaxRate / (1 - effectiveCgt);
  return {
    postTaxRate,
    preTaxStockGrowthRate,
  };
}

/**
 * Dynamically generates a structured set of mortgage strategy candidate recipes
 * based on current purchase price, borrowing capacity, and liquid wealth.
 */
export function generateCandidateStrategies(
  config: SimulationConfig,
  activePoint: MonthlyDataPoint
): MortgageStrategyCandidate[] {
  const propertyPrice = activePoint.propertyPrice;
  const statutoryMinDepositPct = config.property.minimum_deposit_pct ?? 0.10;
  const baseMinDeposit = propertyPrice * statutoryMinDepositPct;

  const minRequiredDeposit = baseMinDeposit + activePoint.borrowingShortfall;
  const stampDuty = activePoint.stampDuty;
  const legalFees = config.property.legal_and_closing_fees_eur;
  const totalSafetyBufferEur = activePoint.safetyBufferEur ?? 0;

  const usableLiquidFunds = activePoint.usableLiquidWealth ?? Math.max(0, activePoint.totalLiquidWealth - totalSafetyBufferEur);
  const maxUsableForDeposit = Math.max(minRequiredDeposit, usableLiquidFunds - (stampDuty + legalFees));

  const baseRatePct = config.mortgage.mortgage_interest_rate * 100;
  const activeSalary = getSalaryAtDate(activePoint.date, config.mortgage);
  const grossBonusEur = activeSalary.bonusEur;
  const netBonusEur = Math.round(grossBonusEur * (1 - config.equity_engine.marginal_tax_rate_ireland));

  // Determine dynamic deposit tiers
  const depositPresets: { label: string; deposit: number; type: MortgageStrategyCandidate['strategyType'] }[] = [
    {
      label: 'Min Statutory Deposit (Max Leverage)',
      deposit: Math.round(minRequiredDeposit),
      type: 'min_deposit',
    },
    {
      label: '80% LTV Green Tier',
      deposit: Math.round(propertyPrice * 0.20),
      type: 'green_80',
    },
    {
      label: '70% LTV Super-Green Tier',
      deposit: Math.round(propertyPrice * 0.30),
      type: 'super_green_70',
    },
  ];

  // Max Liquid Deposit (Deploying all unreserved liquid reserves)
  const maxLiquidDeposit = Math.round(Math.min(propertyPrice, maxUsableForDeposit));
  if (
    maxLiquidDeposit > minRequiredDeposit &&
    !depositPresets.some((p) => Math.abs(p.deposit - maxLiquidDeposit) < 5000)
  ) {
    depositPresets.push({
      label: 'Max Liquid Deposit',
      deposit: maxLiquidDeposit,
      type: 'max_deposit',
    });
  }

  // Intermediate deposit steps (15%, 25%, 35% if feasible)
  [0.15, 0.25, 0.35, 0.40].forEach((pct) => {
    const dep = Math.round(propertyPrice * pct);
    if (!depositPresets.some((p) => Math.abs(p.deposit - dep) < 5000)) {
      depositPresets.push({
        label: `${Math.round(pct * 100)}% Deposit Tier`,
        deposit: dep,
        type: 'custom',
      });
    }
  });


  const termsToTest = [15, 20, 25, 30, 35];
  const overpaymentSteps = [0, 200, 400, 750, 1200];
  const bonusRatios = [0, 0.5, 1.0];

  const candidates: MortgageStrategyCandidate[] = [];
  let candidateIndex = 1;

  for (const depPreset of depositPresets) {
    const depositAmount = depPreset.deposit;
    const loanAmount = Math.max(0, propertyPrice - depositAmount);
    const ltvPct = propertyPrice > 0 ? (loanAmount / propertyPrice) * 100 : 0;
    const depositPct = propertyPrice > 0 ? depositAmount / propertyPrice : 0;

    // Irish tiered Green interest rate modeling
    let interestRatePct = baseRatePct;
    if (ltvPct <= 70) {
      interestRatePct = Math.max(1.0, baseRatePct - 0.20); // 70% Super Green discount
    } else if (ltvPct <= 80) {
      interestRatePct = baseRatePct; // Standard Green rate
    } else {
      interestRatePct = baseRatePct + 0.35; // Standard non-green / high LTV margin
    }

    for (const termYears of termsToTest) {
      for (const monthlyOverpayment of overpaymentSteps) {
        for (const bonusRatio of bonusRatios) {
          const annualBonusLumpSum = Math.round(netBonusEur * bonusRatio);

          candidates.push({
            id: `cand_${candidateIndex++}_ltv${Math.round(ltvPct)}_t${termYears}_ov${monthlyOverpayment}_b${Math.round(bonusRatio * 100)}`,
            depositAmount,
            depositPct,
            loanAmount,
            ltvPct,
            termYears,
            interestRatePct,
            fixedRateYears: 2,
            monthlyOverpayment,
            annualBonusLumpSum,
            strategyType: depPreset.type,
          });
        }
      }
    }
  }

  return candidates;
}

/**
 * Simulates a single mortgage strategy candidate across the complete 60-month trajectory
 * and lifetime amortization schedule.
 */
export function evaluateMortgageStrategy(
  candidate: MortgageStrategyCandidate,
  config: SimulationConfig,
  baseMonthlyPoints: MonthlyDataPoint[],
  purchaseMonth: number,
  maxMonthlyBudgetEur?: number
): MortgageStrategyResult {
  const { meta, property, mortgage, liquid_assets, equity_engine, macro, tax } = config;
  const forecastMonths = meta.forecast_months;

  const buyPoint = baseMonthlyPoints[purchaseMonth] || baseMonthlyPoints[0];
  const propertyPurchasePrice = buyPoint.propertyPrice;
  const stampDuty = calculateStampDuty(propertyPurchasePrice, property.stamp_duty_tiers);
  const closingFees = property.legal_and_closing_fees_eur;
  const totalUpfrontPaid = candidate.depositAmount + stampDuty + closingFees;

  const isFundable =
    buyPoint.totalLiquidWealth >= totalUpfrontPaid &&
    candidate.loanAmount <= buyPoint.maxMortgageAvailable + 0.01;
  const postPurchaseLiquidLeft = Math.max(0, buyPoint.totalLiquidWealth - totalUpfrontPaid);

  // Amortization simulation
  const overpaymentResult = calculateMortgageWithOverpayments(
    {
      principal: candidate.loanAmount,
      annualRate: candidate.interestRatePct / 100,
      termYears: candidate.termYears,
      fixedRateYears: candidate.fixedRateYears,
      monthlyOverpayment: candidate.monthlyOverpayment,
      annualLumpSumOverpayment: candidate.annualBonusLumpSum,
    },
    buyPoint.date
  );

  // Trajectory Simulation from purchaseMonth to forecastMonths (Month 60)
  const propMonthlyMult = Math.pow(1 + property.yearly_growth_rate, 1 / 12);
  const invMonthlyMult = Math.pow(1 + liquid_assets.investments_yearly_growth_rate, 1 / 12);
  const stockMonthlyMult = Math.pow(1 + equity_engine.stock_yearly_growth_rate, 1 / 12);

  // Capital withdrawal waterfall at purchaseMonth
  const totalSafetyBufferEur =
    (liquid_assets.cash_safety_buffer_eur || 0) +
    (liquid_assets.cash_safety_buffer_usd || 0) * (buyPoint.fxRate || macro.eur_usd_spot);

  let cashAfterBuy = buyPoint.cash;
  let invAfterBuy = buyPoint.investments;
  let gsuAfterBuy = buyPoint.gsuPool;
  let remainingNeeded = totalUpfrontPaid;

  // 1. Usable Cash
  const usableCash = Math.max(0, cashAfterBuy - totalSafetyBufferEur);
  const cashUsed = Math.min(usableCash, remainingNeeded);
  cashAfterBuy -= cashUsed;
  remainingNeeded -= cashUsed;

  // 2. Base Investments
  if (remainingNeeded > 0) {
    const invUsed = Math.min(invAfterBuy, remainingNeeded);
    invAfterBuy -= invUsed;
    remainingNeeded -= invUsed;
  }

  // 3. GSU Pool
  if (remainingNeeded > 0) {
    const gsuUsed = Math.min(gsuAfterBuy, remainingNeeded);
    gsuAfterBuy -= gsuUsed;
    remainingNeeded -= gsuUsed;
  }

  // 4. Emergency fallback
  if (remainingNeeded > 0) {
    const emergencyCash = Math.min(cashAfterBuy, remainingNeeded);
    cashAfterBuy -= emergencyCash;
    remainingNeeded -= emergencyCash;
  }

  let currentCash = cashAfterBuy;
  let currentInv = invAfterBuy;
  let currentGsu = gsuAfterBuy;
  let currentPropValue = propertyPurchasePrice;

  // Track remaining mortgage balance from the overpayment schedule
  const scheduleMap = new Map<number, number>();
  scheduleMap.set(0, candidate.loanAmount);
  for (const pt of overpaymentResult.schedule) {
    scheduleMap.set(pt.month, pt.balance);
  }

  const livingExpenses = tax?.monthly_living_expenses_eur ?? 2500;
  const activeSalary = getSalaryAtDate(buyPoint.date, mortgage);
  const taxBreakdown = calculateIrishTaxBreakdown(activeSalary.baseSalary, tax);
  const monthlyMaintenanceInitial = (propertyPurchasePrice * mortgage.yearly_maintenance_rate) / 12;
  const totalMonthlyHousingCost = overpaymentResult.standardMonthlyPayment + monthlyMaintenanceInitial;
  const freeCashflowBuffer = Math.max(0, taxBreakdown.netMonthlyTakeHome - totalMonthlyHousingCost - livingExpenses);

  const monthsUnderMortgage = forecastMonths - purchaseMonth;

  for (let m = purchaseMonth + 1; m <= forecastMonths; m++) {
    currentPropValue *= propMonthlyMult;
    currentInv *= invMonthlyMult;

    const pt = baseMonthlyPoints[m];
    const netVestEur = pt?.vestEvents ? pt.vestEvents.reduce((sum, e) => sum + e.netAmountEur, 0) : 0;
    currentGsu = currentGsu * stockMonthlyMult + netVestEur;

    const elapsedMonths = m - purchaseMonth;
    const isPaidOff = elapsedMonths > overpaymentResult.actualPayoffMonths;
    const isFixed = !isPaidOff && elapsedMonths <= candidate.fixedRateYears * 12;

    const monthlyMaintenance = (currentPropValue * mortgage.yearly_maintenance_rate) / 12;
    const activeOverpayment = isFixed || isPaidOff ? 0 : candidate.monthlyOverpayment;
    const scheduledMortgagePmt = isPaidOff ? 0 : overpaymentResult.standardMonthlyPayment;
    const totalMortgagePayment = scheduledMortgagePmt + activeOverpayment;

    let monthlySavings = liquid_assets.monthly_salary_savings_eur;
    if (tax && tax.savings_calculation_mode === 'net_pay_derived') {
      const stepSalary = getSalaryAtDate(pt ? pt.date : buyPoint.date, mortgage);
      const stepTax = calculateIrishTaxBreakdown(stepSalary.baseSalary, tax);
      monthlySavings = Math.max(0, stepTax.netMonthlyTakeHome - (totalMortgagePayment + monthlyMaintenance) - livingExpenses);
    } else {
      const savingsDelta = (pt?.monthlyRent ?? 2500) - (totalMortgagePayment + monthlyMaintenance);
      monthlySavings = Math.max(0, liquid_assets.monthly_salary_savings_eur + savingsDelta);
    }
    currentCash += monthlySavings;

    // Bonus distribution: net bonus minus lump sum overpayment (applied only when off-fixed and debt is active)
    if (pt?.netBonusReceivedEur && pt.netBonusReceivedEur > 0) {
      const bonusLumpPaid = isFixed || isPaidOff ? 0 : Math.min(pt.netBonusReceivedEur, candidate.annualBonusLumpSum);
      const netBonusRetained = Math.max(0, pt.netBonusReceivedEur - bonusLumpPaid);
      currentCash += netBonusRetained;
    }
  }

  const remainingBalanceAtM60 = scheduleMap.get(monthsUnderMortgage) ?? 0;
  const terminalHomeEquityM60 = Math.max(0, currentPropValue - remainingBalanceAtM60);
  const terminalLiquidWealthM60 = currentCash + currentInv + currentGsu;
  const terminalNetWealthM60 = terminalHomeEquityM60 + terminalLiquidWealthM60;

  // Total monthly commitment & DSTI ratio
  const totalMonthlyPayment = overpaymentResult.standardMonthlyPayment + candidate.monthlyOverpayment;
  const netMonthlyIncome = taxBreakdown.netMonthlyTakeHome;
  const dstiPct = netMonthlyIncome > 0 ? totalMonthlyPayment / netMonthlyIncome : 0;
  const exceedsBudget = maxMonthlyBudgetEur !== undefined ? totalMonthlyPayment > maxMonthlyBudgetEur + 0.01 : false;

  // Household Safety Score (0 to 100)
  // Factors:
  // 1. Emergency runway: post-purchase liquid / monthly living + mortgage (up to 12 months = 50 pts)
  // 2. Free monthly cashflow margin buffer (up to €1,500/mo = 50 pts)
  const monthlyBurn = livingExpenses + overpaymentResult.standardMonthlyPayment;
  const runwayMonths = monthlyBurn > 0 ? postPurchaseLiquidLeft / monthlyBurn : 0;
  const runwayScore = Math.min(50, (runwayMonths / 6) * 50); // 6 months = 50 pts
  const cashflowScore = Math.min(50, (freeCashflowBuffer / 1200) * 50); // €1,200/mo buffer = 50 pts
  const safetyScore = Math.round(Math.max(0, Math.min(100, runwayScore + cashflowScore)));

  return {
    candidate,
    isFundable,
    totalUpfrontPaid,
    postPurchaseLiquidLeft,
    monthlyMortgagePayment: overpaymentResult.standardMonthlyPayment,
    totalMonthlyPayment,
    dstiPct,
    exceedsBudget,
    variableMonthlyPayment: overpaymentResult.variableMonthlyPayment,
    freeCashflowBuffer,
    scheduledPayoffMonths: overpaymentResult.scheduledPayoffMonths,
    actualPayoffMonths: overpaymentResult.actualPayoffMonths,
    yearsSaved: overpaymentResult.yearsSaved,
    totalLifetimeInterest: overpaymentResult.totalInterestWithOverpayment,
    totalInterestSaved: overpaymentResult.totalInterestSaved,
    terminalNetWealthM60,
    terminalHomeEquityM60,
    terminalLiquidWealthM60,
    wealthDeltaVsMinDeposit: 0, // Assigned relative to min deposit baseline
    safetyScore,
  };
}

/**
 * Filters the multi-objective Pareto Frontier of non-dominated solutions.
 * Objective 1: Minimize Lifetime Interest Paid
 * Objective 2: Maximize Terminal Net Wealth at Month 60
 */
export function computeParetoFrontier(results: MortgageStrategyResult[]): MortgageStrategyResult[] {
  const fundable = results.filter((r) => r.isFundable && !r.exceedsBudget);
  if (fundable.length === 0) return [];

  const nonDominated: MortgageStrategyResult[] = [];

  for (let i = 0; i < fundable.length; i++) {
    const a = fundable[i];
    let isDominated = false;

    for (let j = 0; j < fundable.length; j++) {
      if (i === j) continue;
      const b = fundable[j];

      // B dominates A if B has <= Lifetime Interest AND >= Terminal Net Wealth,
      // with at least one strict inequality.
      const bHasLessOrEqualInterest = b.totalLifetimeInterest <= a.totalLifetimeInterest;
      const bHasMoreOrEqualWealth = b.terminalNetWealthM60 >= a.terminalNetWealthM60;
      const bIsStrictlyBetter =
        b.totalLifetimeInterest < a.totalLifetimeInterest ||
        b.terminalNetWealthM60 > a.terminalNetWealthM60;

      if (bHasLessOrEqualInterest && bHasMoreOrEqualWealth && bIsStrictlyBetter) {
        isDominated = true;
        break;
      }
    }

    if (!isDominated) {
      // Create copy to assign property safely
      const resultCopy = { ...a, isParetoOptimal: true };
      nonDominated.push(resultCopy);
    }
  }

  // Sort by Lifetime Interest ascending (wealth will also be monotonically ascending along the frontier)
  return nonDominated.sort((a, b) => a.totalLifetimeInterest - b.totalLifetimeInterest);
}

/**
 * Extracts the 4 curated strategic archetypes from the evaluated results:
 * 1. 🏆 Wealth Maximizer (Highest Terminal Net Wealth)
 * 2. 🌿 Green LTV Arbitrageur (Optimal 80% or 70% LTV efficiency)
 * 3. 🎯 Algorithmic Sweet Spot (Knee-point / Maximum efficiency per euro committed)
 * 4. 🛡️ Debt-Free Accelerator (Lowest payoff time and lifetime interest)
 */
export function identifyCuratedArchetypes(
  results: MortgageStrategyResult[]
): CuratedStrategies {
  const fundable = results.filter((r) => r.isFundable && !r.exceedsBudget);
  if (fundable.length === 0) {
    return {
      wealthMaximizer: null,
      greenArbitrageur: null,
      sweetSpot: null,
      debtFreeAccelerator: null,
    };
  }

  // 1. 🏆 Wealth Maximizer: Highest Terminal Net Wealth M60
  const wealthMaximizer = fundable.reduce((best, curr) =>
    curr.terminalNetWealthM60 > best.terminalNetWealthM60 ? curr : best
  );

  // 2. 🌿 Green LTV Arbitrageur: Best LTV <= 80% strategy with minimal upfront cash drag
  const greenCandidates = fundable.filter((r) => r.candidate.ltvPct <= 80);
  const greenArbitrageur =
    greenCandidates.length > 0
      ? greenCandidates.reduce((best, curr) => {
          // Balance high net wealth while keeping high liquidity
          const scoreCurr = curr.terminalNetWealthM60 + curr.postPurchaseLiquidLeft * 0.2;
          const scoreBest = best.terminalNetWealthM60 + best.postPurchaseLiquidLeft * 0.2;
          return scoreCurr > scoreBest ? curr : best;
        })
      : wealthMaximizer;

  // 3. 🛡️ Debt-Free Accelerator: Shortest payoff duration & lowest lifetime interest
  const debtFreeAccelerator = fundable.reduce((best, curr) => {
    if (curr.actualPayoffMonths < best.actualPayoffMonths) return curr;
    if (curr.actualPayoffMonths === best.actualPayoffMonths) {
      return curr.totalLifetimeInterest < best.totalLifetimeInterest ? curr : best;
    }
    return best;
  });

  // 4. 🎯 Algorithmic Sweet Spot (Knee Point):
  // Maximizes marginal interest saved per euro committed, penalized if safety score is poor
  const minDepositCandidate = fundable.find((r) => r.candidate.strategyType === 'min_deposit') || fundable[0];
  const sweetSpot = fundable.reduce((best, curr) => {
    const upfrontDelta = Math.max(0, curr.totalUpfrontPaid - minDepositCandidate.totalUpfrontPaid);
    const extraCapital = Math.max(
      1,
      upfrontDelta + curr.candidate.monthlyOverpayment * 12 * 5 + curr.candidate.annualBonusLumpSum * 5
    );
    const interestSaved = Math.max(0, minDepositCandidate.totalLifetimeInterest - curr.totalLifetimeInterest);
    const marginalEfficiency = (interestSaved / extraCapital) * (curr.safetyScore / 100);

    const bestUpfrontDelta = Math.max(0, best.totalUpfrontPaid - minDepositCandidate.totalUpfrontPaid);
    const bestExtra = Math.max(
      1,
      bestUpfrontDelta + best.candidate.monthlyOverpayment * 12 * 5 + best.candidate.annualBonusLumpSum * 5
    );
    const bestSaved = Math.max(0, minDepositCandidate.totalLifetimeInterest - best.totalLifetimeInterest);
    const bestEfficiency = (bestSaved / bestExtra) * (best.safetyScore / 100);

    return marginalEfficiency > bestEfficiency ? curr : best;
  }, wealthMaximizer);

  return {
    wealthMaximizer,
    greenArbitrageur,
    sweetSpot,
    debtFreeAccelerator,
  };
}

export const BUDGET_EPSILON_EUR = 0.01;

/**
 * Stage 1: Generates and executes 60-month amortization and wealth trajectory simulation
 * for all candidate strategies. Depends strictly on macro config and selected purchase month.
 */
export function evaluateAllCandidateStrategies(
  config: SimulationConfig,
  purchaseMonth: number,
  baseMonthlyPoints: MonthlyDataPoint[]
): MortgageStrategyResult[] {
  const activePoint = baseMonthlyPoints[purchaseMonth] || baseMonthlyPoints[0];
  const candidates = generateCandidateStrategies(config, activePoint);
  const minDepositBaseline = candidates.find((c) => c.strategyType === 'min_deposit') || candidates[0];
  const baselineResult = evaluateMortgageStrategy(minDepositBaseline, config, baseMonthlyPoints, purchaseMonth);

  return candidates.map((c) => {
    const res = evaluateMortgageStrategy(c, config, baseMonthlyPoints, purchaseMonth);
    res.wealthDeltaVsMinDeposit = res.terminalNetWealthM60 - baselineResult.terminalNetWealthM60;
    return res;
  });
}

/**
 * Stage 2: Fast budget filtering, Pareto frontier extraction, and archetype curation.
 * Executes in <0.1ms, enabling 60fps instant UI updates when scrubbing budget sliders.
 */
export function applyOptimizationBudgetFilter(
  allResults: MortgageStrategyResult[],
  config: SimulationConfig,
  purchaseMonth: number,
  baseMonthlyPoints: MonthlyDataPoint[],
  maxMonthlyBudgetEur?: number
): OptimizationAnalysis {
  const activePoint = baseMonthlyPoints[purchaseMonth] || baseMonthlyPoints[0];
  const activeSalary = getSalaryAtDate(activePoint.date, config.mortgage);
  const taxBreakdown = calculateIrishTaxBreakdown(activeSalary.baseSalary, config.tax);
  const netMonthlyIncomeEur = taxBreakdown.netMonthlyTakeHome;

  const hasBudgetLimit = typeof maxMonthlyBudgetEur === 'number' && maxMonthlyBudgetEur > 0;

  // 1. Flag budget compliance
  const evaluatedResults = allResults.map((r) => ({
    ...r,
    exceedsBudget: hasBudgetLimit ? r.totalMonthlyPayment > maxMonthlyBudgetEur + BUDGET_EPSILON_EUR : false,
    isParetoOptimal: false,
  }));

  const compliantResults = evaluatedResults.filter((r) => r.isFundable && !r.exceedsBudget);
  const paretoFrontier = computeParetoFrontier(compliantResults);
  const curated = identifyCuratedArchetypes(compliantResults);

  // 2. Mark isParetoOptimal on matching items in evaluatedResults for scatter rendering & tooltips
  const paretoIds = new Set(paretoFrontier.map((p) => p.candidate.id));
  for (const item of evaluatedResults) {
    if (paretoIds.has(item.candidate.id)) {
      item.isParetoOptimal = true;
    }
  }

  const hurdle = calculateStockHurdleRate(config.mortgage.mortgage_interest_rate);

  return {
    purchaseMonth,
    purchaseDate: activePoint.date,
    propertyPrice: activePoint.propertyPrice,
    maxMonthlyBudgetEur: hasBudgetLimit ? maxMonthlyBudgetEur : undefined,
    netMonthlyIncomeEur,
    allResults: evaluatedResults,
    compliantResults,
    paretoFrontier,
    curated,
    hurdleRateStockCrossover: hurdle.preTaxStockGrowthRate,
    activeMortgageRate: config.mortgage.mortgage_interest_rate,
  };
}

/**
 * Main entrance to run full multidimensional mortgage and terminal net wealth optimization.
 */
export function runMortgageOptimization(
  config: SimulationConfig,
  purchaseMonth: number,
  baseMonthlyPoints: MonthlyDataPoint[],
  maxMonthlyBudgetEur?: number
): OptimizationAnalysis {
  const allResults = evaluateAllCandidateStrategies(config, purchaseMonth, baseMonthlyPoints);
  return applyOptimizationBudgetFilter(allResults, config, purchaseMonth, baseMonthlyPoints, maxMonthlyBudgetEur);
}


