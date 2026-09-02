import React, { useState, useMemo, memo, useEffect } from 'react';
import {
  Sparkles,
  Award,
  TrendingDown,
  Target,
  Zap,
  Flame,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  Sliders,
} from 'lucide-react';
import {
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
} from 'recharts';
import {
  SimulationConfig,
  MonthlyDataPoint,
  MortgageStrategyResult,
  OptimizationAnalysis,
} from '../engine/types';
import { evaluateAllCandidateStrategies, applyOptimizationBudgetFilter } from '../engine/optimizer';
import { InfoTooltip } from './InfoTooltip';

interface FrontierOptimizerCardProps {
  config: SimulationConfig;
  monthlyPoints: MonthlyDataPoint[];
  selectedMonth: number;
  currentLoanAmount: number;
  currentInterestRatePct: number;
  currentTermYears: number;
  currentMonthlyOverpayment: number;
  currentAnnualLumpSum: number;
  onApplyStrategy: (strategy: MortgageStrategyResult) => void;
  onChange?: (updatedConfig: SimulationConfig) => void;
}

export const FrontierOptimizerCard: React.FC<FrontierOptimizerCardProps> = memo(({
  config,
  monthlyPoints,
  selectedMonth,
  currentLoanAmount,
  currentInterestRatePct,
  currentTermYears,
  currentMonthlyOverpayment,
  currentAnnualLumpSum,
  onApplyStrategy,
  onChange,
}) => {
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const configuredBudget = config.mortgage.max_contractual_monthly_payment_eur ?? null;
  const [maxMonthlyBudgetEur, setMaxMonthlyBudgetEur] = useState<number | null>(configuredBudget);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const [textVal, setTextVal] = useState<string>(
    configuredBudget !== null ? String(configuredBudget) : ''
  );
  const [hideOverBudget, setHideOverBudget] = useState<boolean>(true);

  // Synchronize when config updates externally
  useEffect(() => {
    const updated = config.mortgage.max_contractual_monthly_payment_eur ?? null;
    setMaxMonthlyBudgetEur(updated);
    if (!isInputFocused) {
      setTextVal(updated !== null ? String(updated) : '');
    }
  }, [config.mortgage.max_contractual_monthly_payment_eur, isInputFocused]);

  const handleBudgetChange = (newBudget: number | null) => {
    setMaxMonthlyBudgetEur(newBudget);
    if (!isInputFocused) {
      setTextVal(newBudget !== null ? String(newBudget) : '');
    }
    if (onChange && config.mortgage.max_contractual_monthly_payment_eur !== newBudget) {
      onChange({
        ...config,
        mortgage: {
          ...config.mortgage,
          max_contractual_monthly_payment_eur: newBudget,
        },
      });
    }
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setTextVal(raw);
    if (raw === '') {
      handleBudgetChange(null);
    } else {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        handleBudgetChange(parsed);
      }
    }
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    if (textVal === '' || textVal === '0') {
      handleBudgetChange(null);
      setTextVal('');
    } else {
      const parsed = parseInt(textVal.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) {
        handleBudgetChange(parsed);
        setTextVal(String(parsed));
      } else {
        handleBudgetChange(null);
        setTextVal('');
      }
    }
  };

  // Stage 1: Expensive candidate generation & 60-month simulation (runs only when config/month changes)
  const baseEvaluations = useMemo(() => {
    return evaluateAllCandidateStrategies(config, selectedMonth, monthlyPoints);
  }, [config, selectedMonth, monthlyPoints]);

  // Stage 2: Instant budget filter & Pareto computation (<0.1ms, 60fps on slider drag)
  const analysis: OptimizationAnalysis = useMemo(() => {
    return applyOptimizationBudgetFilter(
      baseEvaluations,
      config,
      selectedMonth,
      monthlyPoints,
      maxMonthlyBudgetEur ?? undefined
    );
  }, [baseEvaluations, config, selectedMonth, monthlyPoints, maxMonthlyBudgetEur]);

  const {
    paretoFrontier,
    allResults,
    compliantResults,
    curated,
    hurdleRateStockCrossover,
    activeMortgageRate,
    netMonthlyIncomeEur,
  } = analysis;

  // Dynamic DSTI presets and responsive slider bounds
  const conservativePreset = Math.max(500, Math.round((netMonthlyIncomeEur * 0.30) / 50) * 50);
  const standardPreset = Math.max(500, Math.round((netMonthlyIncomeEur * 0.35) / 50) * 50);
  const aggressivePreset = Math.max(500, Math.round((netMonthlyIncomeEur * 0.45) / 50) * 50);

  const sliderMin = Math.max(500, Math.min(1500, Math.floor((netMonthlyIncomeEur * 0.15) / 50) * 50));
  const sliderMax = Math.max(7500, Math.ceil((netMonthlyIncomeEur * 0.65) / 50) * 50);

  // Format currency
  const formatK = (val: number) => {
    if (val >= 1000000) return `€${(val / 1000000).toFixed(2)}M`;
    return `€${Math.round(val / 1000)}k`;
  };

  // Prepare chart scatter data (filtered by hideOverBudget toggle)
  const scatterData = useMemo(() => {
    const dataSource = hideOverBudget ? compliantResults : allResults;
    return dataSource.map((r) => ({
      xInterest: Math.round(r.totalLifetimeInterest),
      yWealth: Math.round(r.terminalNetWealthM60),
      isPareto: Boolean(r.isParetoOptimal),
      exceedsBudget: Boolean(r.exceedsBudget),
      id: r.candidate.id,
      result: r,
    }));
  }, [allResults, compliantResults, hideOverBudget]);

  // Frontier line sorted by interest ascending
  const frontierLineData = useMemo(() => {
    return paretoFrontier.map((r) => ({
      xInterest: Math.round(r.totalLifetimeInterest),
      yWealth: Math.round(r.terminalNetWealthM60),
      result: r,
    }));
  }, [paretoFrontier]);

  // Helper to check if a curated strategy is currently active in the studio
  const isStrategyActive = (strat: MortgageStrategyResult | null) => {
    if (!strat) return false;
    const c = strat.candidate;
    return (
      Math.abs(c.loanAmount - currentLoanAmount) < 1000 &&
      Math.abs(c.interestRatePct - currentInterestRatePct) < 0.05 &&
      c.termYears === currentTermYears &&
      Math.abs(c.monthlyOverpayment - currentMonthlyOverpayment) < 10 &&
      Math.abs(c.annualBonusLumpSum - currentAnnualLumpSum) < 500
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Multidimensional Frontier Optimizer</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Pareto Efficient
              </span>
            </h3>
            <InfoTooltip
              title="Pareto Optimal Frontier"
              content="Evaluates combinations of Deposit %, Loan Term, Overpayments, and Bonus Allocations to find the mathematically optimal trade-off between minimizing Lifetime Interest Paid and maximizing Terminal Net Wealth."
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulates {allResults.length} parameter recipes at Month {selectedMonth} ({analysis.purchaseDate}). Discovers the non-dominated frontier and high-efficiency sweet spots.
          </p>
        </div>

        {/* Toggle Guide Button */}
        <button
          onClick={() => setIsGuideOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors self-start sm:self-auto"
        >
          <Info className="w-3.5 h-3.5 text-purple-400" />
          <span>{isGuideOpen ? 'Hide Methodology' : 'How to Read Frontier'}</span>
          {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Crossover Stock Hurdle Rate Callout */}
      <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-850 p-3.5 rounded-xl border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-200">
              Personal Stock Breakeven Hurdle Rate:{' '}
              <strong className="text-amber-300 font-mono text-sm font-extrabold">
                {(hurdleRateStockCrossover * 100).toFixed(1)}% p.a.
              </strong>
            </span>
            <p className="text-[11px] text-slate-300 mt-0.5">
              At your <span className="font-mono text-white font-bold">{(activeMortgageRate * 100).toFixed(2)}%</span> mortgage rate, paying down debt is a guaranteed, tax-free return. Keeping leverage and investing surplus in equities/GSUs wins if your pre-tax stock CAGR beats{' '}
              <span className="font-mono text-amber-300 font-bold">{(hurdleRateStockCrossover * 100).toFixed(1)}%</span> (assuming 33% Irish CGT).
            </p>
          </div>
        </div>

        <div className="shrink-0 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-750 text-[11px] font-mono text-right">
          <span className="text-slate-400 block text-[10px]">Guaranteed Net Return</span>
          <span className="text-emerald-400 font-bold">+{(activeMortgageRate * 100).toFixed(2)}% tax-free</span>
        </div>
      </div>

      {/* Comfortable Max Monthly Outlay Filter */}
      <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold text-white text-xs sm:text-sm">Max Contractual Monthly Payment (Mandatory P&I)</span>
              <p className="text-[11px] text-slate-400">
                Filters out recipes where scheduled loan payments exceed your ceiling. Discretionary overpayments are funded from remaining cashflow surplus.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-750 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all">
              <span className="text-indigo-400 font-mono font-bold text-xs mr-1 select-none">€</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={isInputFocused ? textVal : (maxMonthlyBudgetEur !== null ? maxMonthlyBudgetEur.toLocaleString() : '')}
                placeholder="Uncapped"
                onChange={handleTextInputChange}
                onFocus={() => {
                  setIsInputFocused(true);
                  setTextVal(maxMonthlyBudgetEur !== null ? String(maxMonthlyBudgetEur) : '');
                }}
                onBlur={handleInputBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-20 bg-transparent text-left font-mono font-bold text-xs text-indigo-200 focus:outline-none placeholder:text-slate-500 placeholder:font-normal"
                title="Enter custom monthly payment ceiling in EUR, or clear for uncapped"
              />
              <span className="text-slate-400 font-mono text-xs ml-0.5 select-none">/mo</span>
            </div>
            {maxMonthlyBudgetEur !== null && netMonthlyIncomeEur > 0 && (
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                (maxMonthlyBudgetEur / netMonthlyIncomeEur) <= 0.35
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : (maxMonthlyBudgetEur / netMonthlyIncomeEur) <= 0.45
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}>
                {Math.round((maxMonthlyBudgetEur / netMonthlyIncomeEur) * 100)}% DSTI
              </span>
            )}
          </div>
        </div>

        {/* Quick DSTI Presets & Interactive Slider */}
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold">Quick Presets:</span>
            <button
              onClick={() => handleBudgetChange(conservativePreset)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                maxMonthlyBudgetEur === conservativePreset
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-750'
              }`}
            >
              Conservative (30% DSTI • €{conservativePreset.toLocaleString()})
            </button>
            <button
              onClick={() => handleBudgetChange(standardPreset)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                maxMonthlyBudgetEur === standardPreset
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-750'
              }`}
            >
              Standard (35% DSTI • €{standardPreset.toLocaleString()})
            </button>
            <button
              onClick={() => handleBudgetChange(aggressivePreset)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                maxMonthlyBudgetEur === aggressivePreset
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-750'
              }`}
            >
              Aggressive (45% DSTI • €{aggressivePreset.toLocaleString()})
            </button>
            <button
              onClick={() => handleBudgetChange(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                maxMonthlyBudgetEur === null
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-750'
              }`}
            >
              Uncapped (All Recipes)
            </button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] text-slate-500 font-mono">€{sliderMin.toLocaleString()}</span>
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={50}
              value={maxMonthlyBudgetEur !== null ? Math.min(sliderMax, Math.max(sliderMin, maxMonthlyBudgetEur)) : sliderMax}
              onChange={(e) => handleBudgetChange(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-[11px] text-slate-500 font-mono">€{sliderMax.toLocaleString()}</span>
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 font-sans">
            <span>
              Showing <strong className="text-white font-mono">{compliantResults.length}</strong> of <strong className="text-slate-300 font-mono">{allResults.length}</strong> recipes within budget
            </span>
            <span>Net Take-Home Pay: <strong className="text-emerald-300 font-mono">€{Math.round(netMonthlyIncomeEur).toLocaleString()}/mo</strong></span>
          </div>
        </div>
      </div>

      {/* Collapsible Methodology / Interpretation Guide */}
      {isGuideOpen && (
        <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3 text-xs text-slate-300 animate-fadeIn">
          <h4 className="font-bold text-white flex items-center gap-1.5 text-sm">
            <Info className="w-4 h-4 text-purple-400" />
            <span>How to Read the Pareto Frontier & Strategy Recipes</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
              <strong className="text-purple-300 block">1. Non-Dominated Solutions</strong>
              <p className="text-[11px] text-slate-400 leading-normal">
                Every purple dot on the frontier line is mathematically optimal: you cannot achieve higher Terminal Net Wealth without paying more interest, nor can you reduce interest further without sacrificing wealth.
              </p>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
              <strong className="text-emerald-300 block">2. The "Knee Point" (Sweet Spot)</strong>
              <p className="text-[11px] text-slate-400 leading-normal">
                Look for the bend where the curve flattens. Past this point, committing more cash to debt yields very little marginal interest savings while starving your liquid safety reserves.
              </p>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
              <strong className="text-sky-300 block">3. One-Click Application</strong>
              <p className="text-[11px] text-slate-400 leading-normal">
                Click any dot on the chart or use the <strong>"Apply Strategy"</strong> button on any archetype card to instantly load that configuration into the live Mortgage Studio simulator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Curated Strategy Archetype Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Wealth Maximizer */}
        {curated.wealthMaximizer && (
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
            isStrategyActive(curated.wealthMaximizer)
              ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/40'
              : 'bg-slate-850 border-slate-750 hover:border-purple-500/30'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Award className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="font-bold text-white text-xs truncate">Wealth Maximizer</span>
                </div>
                <InfoTooltip
                  title="🏆 Wealth Maximizer Strategy"
                  content={
                    <div className="space-y-1.5 text-[11px]">
                      <p><strong>Goal:</strong> Maximize total balance sheet net worth by Month 60.</p>
                      <p><strong>Mechanism:</strong> Keeps maximum capital invested in high-return assets (Alphabet GSUs, global ETFs) rather than sinking all cash into upfront deposits or overpayments.</p>
                      <p className="text-purple-300"><strong>Best When:</strong> Expected post-tax equity CAGR beats your mortgage interest rate (&gt; {(hurdleRateStockCrossover * 100).toFixed(1)}% pre-tax).</p>
                      <p className="text-slate-400"><strong>Trade-off:</strong> Takes full {curated.wealthMaximizer.candidate.termYears} years to pay off, incurring more lifetime debt interest in exchange for higher asset compounding.</p>
                    </div>
                  }
                >
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 cursor-help transition-colors whitespace-nowrap">
                    Max Net Worth
                  </span>
                </InfoTooltip>
              </div>

              <div className="pt-1">
                <span className="text-[10px] text-slate-400 block">Terminal Net Wealth (M60)</span>
                <span className="text-base font-extrabold font-mono text-purple-300">
                  {formatK(curated.wealthMaximizer.terminalNetWealthM60)}
                </span>
                <span className="text-[10px] text-emerald-400 block font-mono">
                  +{formatK(curated.wealthMaximizer.wealthDeltaVsMinDeposit)} vs min deposit
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Outlay:</span>
                  <span className="text-purple-300 font-bold">
                    €{Math.round(curated.wealthMaximizer.mandatoryMonthlyPayment).toLocaleString()}/mo
                    {curated.wealthMaximizer.discretionaryMonthlyOverpayment > 0 && ` (+€${Math.round(curated.wealthMaximizer.discretionaryMonthlyOverpayment).toLocaleString()})`}
                    {' '}({Math.round(curated.wealthMaximizer.dstiPct * 100)}% DSTI)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deposit:</span>
                  <span>{formatK(curated.wealthMaximizer.candidate.depositAmount)} ({(curated.wealthMaximizer.candidate.depositPct * 100).toFixed(0)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Term:</span>
                  <span>{curated.wealthMaximizer.candidate.termYears} yrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lifetime Int:</span>
                  <span className="text-rose-300">{formatK(curated.wealthMaximizer.totalLifetimeInterest)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onApplyStrategy(curated.wealthMaximizer!)}
              className={`mt-3 w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isStrategyActive(curated.wealthMaximizer)
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-slate-700'
              }`}
            >
              {isStrategyActive(curated.wealthMaximizer) ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Active Recipe</span>
                </>
              ) : (
                <span>Apply Strategy</span>
              )}
            </button>
          </div>
        )}

        {/* Card 2: Green LTV Arbitrageur */}
        {curated.greenArbitrageur && (
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
            isStrategyActive(curated.greenArbitrageur)
              ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
              : 'bg-slate-850 border-slate-750 hover:border-emerald-500/30'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-bold text-white text-xs truncate">Green Arbitrageur</span>
                </div>
                <InfoTooltip
                  title="🌿 Green LTV Arbitrageur Strategy"
                  content={
                    <div className="space-y-1.5 text-[11px]">
                      <p><strong>Goal:</strong> Secure the bank's discounted Green Mortgage margin with minimum cash drag.</p>
                      <p><strong>Mechanism:</strong> Allocates just enough deposit to qualify for the 80% or 70% LTV Green band ({curated.greenArbitrageur.candidate.interestRatePct.toFixed(2)}% rate), keeping the remainder of liquid funds free to compound.</p>
                      {curated.wealthMaximizer?.candidate.id === curated.greenArbitrageur.candidate.id && (
                        <p className="text-amber-300"><strong>Note:</strong> In this specific scenario, the 80% Green Tier loan delivers the highest overall wealth, so this recipe matches Wealth Maximizer.</p>
                      )}
                    </div>
                  }
                >
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 cursor-help transition-colors whitespace-nowrap">
                    Rate Discount
                  </span>
                </InfoTooltip>
              </div>

              <div className="pt-1">
                <span className="text-[10px] text-slate-400 block">Terminal Net Wealth (M60)</span>
                <span className="text-base font-extrabold font-mono text-emerald-300">
                  {formatK(curated.greenArbitrageur.terminalNetWealthM60)}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono truncate">
                  LTV: {curated.greenArbitrageur.candidate.ltvPct.toFixed(0)}% (Green Tier)
                  {curated.wealthMaximizer?.candidate.id === curated.greenArbitrageur.candidate.id && (
                    <span className="text-amber-300 ml-1 font-sans">• Matches #1</span>
                  )}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Outlay:</span>
                  <span className="text-emerald-300 font-bold">
                    €{Math.round(curated.greenArbitrageur.mandatoryMonthlyPayment).toLocaleString()}/mo
                    {curated.greenArbitrageur.discretionaryMonthlyOverpayment > 0 && ` (+€${Math.round(curated.greenArbitrageur.discretionaryMonthlyOverpayment).toLocaleString()})`}
                    {' '}({Math.round(curated.greenArbitrageur.dstiPct * 100)}% DSTI)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deposit:</span>
                  <span>{formatK(curated.greenArbitrageur.candidate.depositAmount)} ({(curated.greenArbitrageur.candidate.depositPct * 100).toFixed(0)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rate:</span>
                  <span className="text-emerald-400 font-bold">{curated.greenArbitrageur.candidate.interestRatePct.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lifetime Int:</span>
                  <span className="text-rose-300">{formatK(curated.greenArbitrageur.totalLifetimeInterest)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onApplyStrategy(curated.greenArbitrageur!)}
              className={`mt-3 w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isStrategyActive(curated.greenArbitrageur)
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-slate-700'
              }`}
            >
              {isStrategyActive(curated.greenArbitrageur) ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Active Recipe</span>
                </>
              ) : (
                <span>Apply Strategy</span>
              )}
            </button>
          </div>
        )}

        {/* Card 3: Balanced Efficiency Sweet Spot */}
        {curated.sweetSpot && (
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
            isStrategyActive(curated.sweetSpot)
              ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40'
              : 'bg-slate-850 border-slate-750 hover:border-indigo-500/30'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Flame className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="font-bold text-white text-xs truncate">Balanced Sweet Spot</span>
                </div>
                <InfoTooltip
                  title="⚡ Balanced Efficiency Sweet Spot"
                  content={
                    <div className="space-y-1.5 text-[11px]">
                      <p><strong>Goal:</strong> Achieve the highest marginal return per extra euro committed to debt paydown.</p>
                      <p><strong>Mechanism:</strong> Identifies the maximum curvature ("knee point") on the Pareto Frontier, where interest reduction is steepest before diminishing returns set in.</p>
                      <p className="text-emerald-400"><strong>Balance:</strong> Saves substantial interest ({formatK(curated.sweetSpot.totalInterestSaved)}) without stripping away your liquid buffer.</p>
                    </div>
                  }
                >
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 cursor-help transition-colors whitespace-nowrap">
                    Knee Point
                  </span>
                </InfoTooltip>
              </div>

              <div className="pt-1">
                <span className="text-[10px] text-slate-400 block">Terminal Net Wealth (M60)</span>
                <span className="text-base font-extrabold font-mono text-indigo-300">
                  {formatK(curated.sweetSpot.terminalNetWealthM60)}
                </span>
                <span className="text-[10px] text-emerald-400 block font-mono">
                  Saves +{formatK(curated.sweetSpot.totalInterestSaved)} interest
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Outlay:</span>
                  <span className="text-indigo-300 font-bold">
                    €{Math.round(curated.sweetSpot.mandatoryMonthlyPayment).toLocaleString()}/mo
                    {curated.sweetSpot.discretionaryMonthlyOverpayment > 0 && ` (+€${Math.round(curated.sweetSpot.discretionaryMonthlyOverpayment).toLocaleString()})`}
                    {' '}({Math.round(curated.sweetSpot.dstiPct * 100)}% DSTI)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payoff:</span>
                  <span>{(curated.sweetSpot.actualPayoffMonths / 12).toFixed(1)} yrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bonus Lump:</span>
                  <span>{formatK(curated.sweetSpot.candidate.annualBonusLumpSum)}/yr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Safety Score:</span>
                  <span className="text-emerald-400 font-bold">{curated.sweetSpot.safetyScore}/100</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onApplyStrategy(curated.sweetSpot!)}
              className={`mt-3 w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isStrategyActive(curated.sweetSpot)
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-slate-700'
              }`}
            >
              {isStrategyActive(curated.sweetSpot) ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Active Recipe</span>
                </>
              ) : (
                <span>Apply Strategy</span>
              )}
            </button>
          </div>
        )}

        {/* Card 4: Debt-Free Accelerator */}
        {curated.debtFreeAccelerator && (
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
            isStrategyActive(curated.debtFreeAccelerator)
              ? 'bg-sky-950/40 border-sky-500/60 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/40'
              : 'bg-slate-850 border-slate-750 hover:border-sky-500/30'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <TrendingDown className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="font-bold text-white text-xs truncate">Debt-Free Crusher</span>
                </div>
                <InfoTooltip
                  title="🛡️ Debt-Free Crusher Strategy"
                  content={
                    <div className="space-y-1.5 text-[11px]">
                      <p><strong>Goal:</strong> Pay off the mortgage and become 100% debt-free in the shortest possible timeframe.</p>
                      <p><strong>Mechanism:</strong> Maximizes upfront deposit, selects a shorter term, and channels discretionary free cashflow + annual bonus directly into principal reduction.</p>
                      <p className="text-sky-300"><strong>Result:</strong> Minimizes lifetime bank interest paid ({formatK(curated.debtFreeAccelerator.totalLifetimeInterest)}), saving {curated.debtFreeAccelerator.yearsSaved.toFixed(1)} years of debt service.</p>
                      <p className="text-slate-400"><strong>Trade-off:</strong> Commits liquidity to guaranteed debt payoff instead of potential equity market compounding.</p>
                    </div>
                  }
                >
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 cursor-help transition-colors whitespace-nowrap">
                    Fastest Payoff
                  </span>
                </InfoTooltip>
              </div>

              <div className="pt-1">
                <span className="text-[10px] text-slate-400 block">Terminal Net Wealth (M60)</span>
                <span className="text-base font-extrabold font-mono text-sky-300">
                  {formatK(curated.debtFreeAccelerator.terminalNetWealthM60)}
                </span>
                <span className="text-[10px] text-sky-400 block font-mono truncate">
                  Debt-free in {(curated.debtFreeAccelerator.actualPayoffMonths / 12).toFixed(1)} yrs (Saves {curated.debtFreeAccelerator.yearsSaved.toFixed(1)} yrs)
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Outlay:</span>
                  <span className="text-sky-300 font-bold">
                    €{Math.round(curated.debtFreeAccelerator.mandatoryMonthlyPayment).toLocaleString()}/mo
                    {curated.debtFreeAccelerator.discretionaryMonthlyOverpayment > 0 && ` (+€${Math.round(curated.debtFreeAccelerator.discretionaryMonthlyOverpayment).toLocaleString()})`}
                    {' '}({Math.round(curated.debtFreeAccelerator.dstiPct * 100)}% DSTI)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Deposit:</span>
                  <span>{formatK(curated.debtFreeAccelerator.candidate.depositAmount)} ({(curated.debtFreeAccelerator.candidate.depositPct * 100).toFixed(0)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payoff:</span>
                  <span>{(curated.debtFreeAccelerator.actualPayoffMonths / 12).toFixed(1)} yrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lifetime Int:</span>
                  <span className="text-emerald-400 font-bold">{formatK(curated.debtFreeAccelerator.totalLifetimeInterest)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onApplyStrategy(curated.debtFreeAccelerator!)}
              className={`mt-3 w-full py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                isStrategyActive(curated.debtFreeAccelerator)
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-slate-800 hover:bg-sky-600/30 text-sky-300 hover:text-white border border-slate-700'
              }`}
            >
              {isStrategyActive(curated.debtFreeAccelerator) ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Active Recipe</span>
                </>
              ) : (
                <span>Apply Strategy</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Empty State Banner when no strategies qualify under tight budget */}
      {compliantResults.length === 0 && (
        <div className="p-4 rounded-xl bg-slate-850 border border-amber-500/30 text-center text-xs text-slate-300 space-y-1">
          <span className="text-amber-300 font-bold block">No strategies found within €{maxMonthlyBudgetEur?.toLocaleString()}/mo</span>
          <p className="text-slate-400">
            Increase your monthly payment budget ceiling or allocate a larger upfront deposit to view affordable recipes.
          </p>
        </div>
      )}

      {/* 2D Pareto Frontier Scatter Plot */}
      <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
              <span>2D Pareto Frontier: Lifetime Interest Paid vs. Terminal Net Wealth (M60)</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Hover over points to inspect recipes. Purple points and connecting line represent the non-dominated Pareto Frontier.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {/* Hide Over-Budget Points Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-semibold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-750 hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={hideOverBudget}
                onChange={(e) => setHideOverBudget(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 bg-slate-800"
              />
              <span>Only Show Affordable</span>
            </label>

            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-sm shadow-purple-400" />
              <span className="text-slate-300">Pareto Optimal Frontier</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <span className="text-slate-400">Dominated / Off-Frontier</span>
            </div>
            {!hideOverBudget && maxMonthlyBudgetEur !== null && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-750" />
                <span className="text-slate-500">Over Budget</span>
              </div>
            )}
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                type="number"
                dataKey="xInterest"
                name="Lifetime Interest Paid"
                stroke="#94a3b8"
                tick={{ fontSize: 10 }}
                tickFormatter={formatK}
                domain={['auto', 'auto']}
              />
              <YAxis
                type="number"
                dataKey="yWealth"
                name="Terminal Net Wealth (M60)"
                stroke="#94a3b8"
                tick={{ fontSize: 10 }}
                tickFormatter={formatK}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
                }}
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const item = payload[0].payload;
                  const res: MortgageStrategyResult = item.result;
                  if (!res) return null;
                  const c = res.candidate;

                  return (
                    <div className="p-2 space-y-1.5 font-sans min-w-[230px]">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                        <span className="font-bold text-white text-xs">
                          {c.strategyType === 'min_deposit'
                            ? 'Min Deposit Strategy'
                            : c.strategyType === 'green_80'
                            ? '80% LTV Green Strategy'
                            : c.strategyType === 'super_green_70'
                            ? '70% LTV Super-Green Strategy'
                            : c.strategyType === 'max_deposit'
                            ? 'Max Liquid Strategy'
                            : `${(c.depositPct * 100).toFixed(0)}% Deposit Strategy`}
                        </span>
                        {res.isParetoOptimal && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Pareto Optimal
                          </span>
                        )}
                      </div>

                      {res.exceedsBudget && (
                        <div className="p-1 rounded bg-rose-950/60 border border-rose-800 text-[10px] text-rose-300 font-sans">
                          ⚠️ Mandatory Payment Exceeds Budget: €{Math.round(res.mandatoryMonthlyPayment).toLocaleString()}/mo &gt; €{maxMonthlyBudgetEur?.toLocaleString()}/mo
                        </div>
                      )}

                      <div className="space-y-1 text-[11px] font-mono">
                        <div className="flex justify-between text-purple-300">
                          <span>Terminal Wealth:</span>
                          <strong>{formatK(res.terminalNetWealthM60)}</strong>
                        </div>
                        <div className="flex justify-between text-rose-300">
                          <span>Lifetime Interest:</span>
                          <strong>{formatK(res.totalLifetimeInterest)}</strong>
                        </div>
                        <div className="flex justify-between text-indigo-300">
                          <span>Mandatory PMT:</span>
                          <strong>€{Math.round(res.mandatoryMonthlyPayment).toLocaleString()}/mo ({Math.round(res.dstiPct * 100)}% DSTI)</strong>
                        </div>
                        {res.discretionaryMonthlyOverpayment > 0 && (
                          <div className="flex justify-between text-emerald-400">
                            <span>Voluntary Overpay:</span>
                            <strong>+€{Math.round(res.discretionaryMonthlyOverpayment).toLocaleString()}/mo ({Math.round((c.overpaymentSurplusPct ?? 0) * 100)}% surplus)</strong>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-300">
                          <span>Total Monthly Outlay:</span>
                          <strong>€{Math.round(res.totalMonthlyPayment).toLocaleString()}/mo ({Math.round(res.totalDstiPct * 100)}%)</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Loan / Deposit:</span>
                          <span>{formatK(c.loanAmount)} / {formatK(c.depositAmount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Term / Overpay:</span>
                          <span>{c.termYears}y (+€{c.monthlyOverpayment}/mo)</span>
                        </div>
                        <div className="flex justify-between text-emerald-400">
                          <span>Payoff Duration:</span>
                          <span>{(res.actualPayoffMonths / 12).toFixed(1)} yrs</span>
                        </div>
                        <div className="flex justify-between text-sky-300">
                          <span>Safety Score:</span>
                          <span>{res.safetyScore} / 100</span>
                        </div>
                      </div>

                      <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800 text-center">
                        👉 Click to load into Mortgage Studio
                      </div>
                    </div>
                  );
                }}
              />

              {/* Connecting Pareto Line */}
              <Line
                data={frontierLineData}
                type="monotone"
                dataKey="yWealth"
                stroke="#a855f7"
                strokeWidth={2.5}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />

              {/* All Permutations Scatter */}
              <Scatter
                data={scatterData}
                isAnimationActive={false}
                onClick={(e: unknown) => {
                  if (e && typeof e === 'object' && 'result' in e && (e as { result: MortgageStrategyResult }).result) {
                    onApplyStrategy((e as { result: MortgageStrategyResult }).result);
                  }
                }}
                cursor="pointer"
              >
                {scatterData.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={entry.exceedsBudget ? '#334155' : entry.isPareto ? '#c084fc' : '#475569'}
                    fillOpacity={entry.exceedsBudget ? 0.2 : entry.isPareto ? 0.95 : 0.4}
                    r={entry.exceedsBudget ? 2 : entry.isPareto ? 4.5 : 2.5}
                    stroke={entry.isPareto ? '#f3e8ff' : '#334155'}
                    strokeWidth={entry.isPareto ? 1.5 : 0.5}
                  />
                ))}
              </Scatter>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});


