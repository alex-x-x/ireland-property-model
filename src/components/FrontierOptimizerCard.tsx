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
  Lock,
  Unlock,
  Layers,
  Calendar,
  ShieldCheck,
  TrendingUp,
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
  OptimizerOptions,
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

  // Active purchase point metrics & presets
  const activePoint = monthlyPoints[selectedMonth] || monthlyPoints[0];
  const propertyPrice = activePoint.propertyPrice;
  // Central Bank of Ireland (CBI) statutory FTB minimum deposit floor is 10% (max 90% LTV ceiling)
  const statutoryMinDepositPct = 0.10;
  const baseMinDeposit = Math.round(propertyPrice * statutoryMinDepositPct);
  const maxStatutoryLoan = Math.max(0, propertyPrice - baseMinDeposit);
  const maxAipAvailable = activePoint.maxMortgageAvailable;
  const maxAipLoan = Math.min(maxAipAvailable, maxStatutoryLoan);

  const sidebarDeposit =
    config.property.deposit_eur !== undefined && config.property.deposit_eur > 0
      ? config.property.deposit_eur
      : config.property.minimum_deposit_pct !== undefined
      ? Math.round(propertyPrice * config.property.minimum_deposit_pct)
      : Math.round(propertyPrice * 0.10);
  const sidebarLoan = Math.min(maxAipAvailable, Math.max(0, propertyPrice - sidebarDeposit));

  // Loan Strategy Mode: 'fixed_loan' (default) vs 'all_tiers'
  const [loanMode, setLoanMode] = useState<'fixed_loan' | 'all_tiers'>(
    config.mortgage.optimizer_loan_mode ?? 'fixed_loan'
  );
  const [loanPresetType, setLoanPresetType] = useState<'sidebar' | 'max_aip' | 'custom'>(
    config.mortgage.optimizer_loan_preset ?? 'sidebar'
  );
  const initialCustomLoan = config.mortgage.optimizer_custom_loan_eur ?? sidebarLoan;
  const [customLoanValue, setCustomLoanValue] = useState<number>(initialCustomLoan);
  const [isCustomLoanFocused, setIsCustomLoanFocused] = useState<boolean>(false);
  const [customLoanText, setCustomLoanText] = useState<string>(String(initialCustomLoan));

  // Max mortgage term horizon (defaulting to 26 or configured term)
  const initialMaxTerm = config.mortgage.max_mortgage_term_years ?? config.mortgage.mortgage_term_years ?? 26;
  const [maxTermYears, setMaxTermYears] = useState<number>(initialMaxTerm);

  // Fixed-rate annual overpayment allowance (free-form, defaulting to €5,000/yr)
  const initialAllowance = config.mortgage.fixed_rate_annual_overpayment_allowance_eur ?? 5000;
  const [fixedAnnualAllowanceEur, setFixedAnnualAllowanceEur] = useState<number>(initialAllowance);
  const [allowanceText, setAllowanceText] = useState<string>(String(initialAllowance));
  const [isAllowanceFocused, setIsAllowanceFocused] = useState<boolean>(false);

  // Surplus cashflow allocation (Invest vs Overpay)
  const initialYieldPct = config.mortgage.surplus_investment_yield_pct !== undefined && config.mortgage.surplus_investment_yield_pct !== null
    ? config.mortgage.surplus_investment_yield_pct
    : config.liquid_assets.investments_yearly_growth_rate !== undefined
    ? Math.round(config.liquid_assets.investments_yearly_growth_rate * 1000) / 10
    : 8.0;
  const [investSurplusCashflow, setInvestSurplusCashflow] = useState<boolean>(
    config.mortgage.invest_surplus_cashflow !== undefined ? config.mortgage.invest_surplus_cashflow : true
  );
  const [surplusInvestmentYieldPct, setSurplusInvestmentYieldPct] = useState<number>(initialYieldPct);
  const [yieldText, setYieldText] = useState<string>(String(initialYieldPct));
  const [isYieldFocused, setIsYieldFocused] = useState<boolean>(false);

  // Persistence update handlers
  const handleLoanModeChange = (mode: 'fixed_loan' | 'all_tiers') => {
    setLoanMode(mode);
    if (onChange && config.mortgage.optimizer_loan_mode !== mode) {
      onChange({
        ...config,
        mortgage: {
          ...config.mortgage,
          optimizer_loan_mode: mode,
        },
      });
    }
  };

  const handleLoanPresetChange = (preset: 'sidebar' | 'max_aip' | 'custom') => {
    setLoanPresetType(preset);
    if (preset === 'custom') {
      setCustomLoanText(String(customLoanValue));
    }
    if (onChange) {
      onChange({
        ...config,
        mortgage: {
          ...config.mortgage,
          optimizer_loan_preset: preset,
          optimizer_custom_loan_eur: preset === 'custom' ? customLoanValue : config.mortgage.optimizer_custom_loan_eur,
        },
      });
    }
  };

  const handleCustomLoanConfirm = (val: number) => {
    setCustomLoanValue(val);
    setCustomLoanText(String(val));
    if (onChange) {
      onChange({
        ...config,
        mortgage: {
          ...config.mortgage,
          optimizer_loan_preset: 'custom',
          optimizer_custom_loan_eur: val,
        },
      });
    }
  };

  const handleMaxTermChange = (term: number) => {
    setMaxTermYears(term);
    if (onChange && config.mortgage.max_mortgage_term_years !== term) {
      onChange({
        ...config,
        mortgage: {
          ...config.mortgage,
          max_mortgage_term_years: term,
        },
      });
    }
  };

  const handleAllowanceChange = (allowance: number) => {
    setFixedAnnualAllowanceEur(allowance);
    setAllowanceText(String(allowance));
    if (onChange && config.mortgage.fixed_rate_annual_overpayment_allowance_eur !== allowance) {
      onChange({
        ...config,
        mortgage: {
          ...config.mortgage,
          fixed_rate_annual_overpayment_allowance_eur: allowance,
        },
      });
    }
  };

  const handleInvestToggle = (invest: boolean) => {
    setInvestSurplusCashflow(invest);
    if (onChange && config.mortgage.invest_surplus_cashflow !== invest) {
      onChange({
        ...config,
        mortgage: {
          ...config.mortgage,
          invest_surplus_cashflow: invest,
        },
      });
    }
  };

  const handleYieldChange = (val: number) => {
    setSurplusInvestmentYieldPct(val);
    setYieldText(String(val));
    if (onChange && config.mortgage.surplus_investment_yield_pct !== val) {
      onChange({
        ...config,
        mortgage: {
          ...config.mortgage,
          surplus_investment_yield_pct: val,
        },
      });
    }
  };

  // Synchronize when config updates externally
  useEffect(() => {
    if (config.mortgage.max_mortgage_term_years !== undefined) {
      setMaxTermYears(config.mortgage.max_mortgage_term_years ?? config.mortgage.mortgage_term_years ?? 26);
    }
  }, [config.mortgage.max_mortgage_term_years, config.mortgage.mortgage_term_years]);

  useEffect(() => {
    if (config.mortgage.fixed_rate_annual_overpayment_allowance_eur !== undefined) {
      const val = config.mortgage.fixed_rate_annual_overpayment_allowance_eur ?? 5000;
      setFixedAnnualAllowanceEur(val);
      if (!isAllowanceFocused) {
        setAllowanceText(String(val));
      }
    }
  }, [config.mortgage.fixed_rate_annual_overpayment_allowance_eur, isAllowanceFocused]);

  useEffect(() => {
    if (config.mortgage.invest_surplus_cashflow !== undefined) {
      setInvestSurplusCashflow(config.mortgage.invest_surplus_cashflow);
    }
  }, [config.mortgage.invest_surplus_cashflow]);

  useEffect(() => {
    if (config.mortgage.surplus_investment_yield_pct !== undefined && config.mortgage.surplus_investment_yield_pct !== null && !isYieldFocused) {
      setSurplusInvestmentYieldPct(config.mortgage.surplus_investment_yield_pct);
      setYieldText(String(config.mortgage.surplus_investment_yield_pct));
    }
  }, [config.mortgage.surplus_investment_yield_pct, isYieldFocused]);

  useEffect(() => {
    if (config.mortgage.optimizer_loan_mode !== undefined) {
      setLoanMode(config.mortgage.optimizer_loan_mode);
    }
  }, [config.mortgage.optimizer_loan_mode]);

  useEffect(() => {
    if (config.mortgage.optimizer_loan_preset !== undefined) {
      setLoanPresetType(config.mortgage.optimizer_loan_preset);
    }
  }, [config.mortgage.optimizer_loan_preset]);

  // Sync custom loan value when sidebar changes and user is on sidebar preset
  useEffect(() => {
    if (loanPresetType === 'sidebar' && !isCustomLoanFocused && config.mortgage.optimizer_custom_loan_eur == null) {
      setCustomLoanValue(sidebarLoan);
      setCustomLoanText(String(sidebarLoan));
    }
  }, [sidebarLoan, loanPresetType, isCustomLoanFocused, config.mortgage.optimizer_custom_loan_eur]);

  const effectiveFixedLoan = useMemo(() => {
    if (loanPresetType === 'sidebar') return sidebarLoan;
    if (loanPresetType === 'max_aip') return maxAipLoan;
    return Math.min(maxStatutoryLoan, Math.max(0, customLoanValue));
  }, [loanPresetType, sidebarLoan, maxAipLoan, maxStatutoryLoan, customLoanValue]);

  const optimizerOptions: OptimizerOptions = useMemo(() => ({
    loanMode,
    fixedLoanAmountEur: loanMode === 'fixed_loan' ? effectiveFixedLoan : null,
    maxTermYears,
    fixedAnnualAllowanceEur,
    investSurplusCashflow,
    surplusInvestmentYieldPct: investSurplusCashflow ? surplusInvestmentYieldPct : 0,
  }), [loanMode, effectiveFixedLoan, maxTermYears, fixedAnnualAllowanceEur, investSurplusCashflow, surplusInvestmentYieldPct]);

  // Stage 1: Candidate generation & 60-month simulation
  const baseEvaluations = useMemo(() => {
    return evaluateAllCandidateStrategies(config, selectedMonth, monthlyPoints, optimizerOptions);
  }, [config, selectedMonth, monthlyPoints, optimizerOptions]);

  // Stage 2: Instant budget filter & Pareto computation (<0.1ms, 60fps on slider drag)
  const analysis: OptimizationAnalysis = useMemo(() => {
    return applyOptimizationBudgetFilter(
      baseEvaluations,
      config,
      selectedMonth,
      monthlyPoints,
      maxMonthlyBudgetEur ?? undefined,
      optimizerOptions
    );
  }, [baseEvaluations, config, selectedMonth, monthlyPoints, maxMonthlyBudgetEur, optimizerOptions]);

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

      {/* 1. Model Assumptions & Search Scope Summary */}
      <div className="bg-slate-850/80 p-3 rounded-xl border border-slate-750 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] text-slate-400">
          <span className="font-bold text-slate-300 flex items-center gap-1">
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>Fixed Inputs:</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono">
            🏠 €{Math.round(propertyPrice).toLocaleString()}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono">
            🏦 {(activeMortgageRate * 100).toFixed(2)}%
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono">
            📜 AIP: €{Math.round(maxAipAvailable).toLocaleString()}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 font-mono">
            📈 Stocks: {(config.equity_engine.stock_yearly_growth_rate * 100).toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono self-end md:self-auto">
          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
            {allResults.length} recipes evaluated
          </span>
        </div>
      </div>

      {/* 2. Loan Mode & Parameter Modeling Controls */}
      <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3.5 text-xs">
        {/* Top: Mode Selection & Quick Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="font-bold text-white text-xs sm:text-sm">Loan Strategy & Modelling Scope</span>
              <InfoTooltip
                title="Loan Strategy Mode"
                content="Choose whether to fix your loan size (e.g. to your sidebar preference or maximum AIP capacity) to evaluate repayment schedules, or explore across all LTV tiers simultaneously."
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {loanMode === 'fixed_loan'
                ? `Loan fixed at €${Math.round(effectiveFixedLoan).toLocaleString()} (${((effectiveFixedLoan / propertyPrice) * 100).toFixed(0)}% LTV). Optimizer dynamically searches optimal term (up to ${maxTermYears}y) and overpayment allocations.`
                : 'Sweeps across standard LTV tiers (Min deposit, 20%, 30%, Max AIP, Max liquid) to find global non-dominated trade-offs.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-750 shrink-0 self-start lg:self-auto">
            <button
              onClick={() => handleLoanModeChange('fixed_loan')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                loanMode === 'fixed_loan'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Fixed Loan Mode</span>
            </button>
            <button
              onClick={() => handleLoanModeChange('all_tiers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                loanMode === 'all_tiers'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Explore All Tiers</span>
            </button>
          </div>
        </div>

        {/* Fixed Loan Controls */}
        {loanMode === 'fixed_loan' && (
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Select Loan:</span>
              <button
                onClick={() => handleLoanPresetChange('sidebar')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                  loanPresetType === 'sidebar'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-750'
                }`}
              >
                Sidebar Loan (€{Math.round(sidebarLoan).toLocaleString()})
              </button>
              <button
                onClick={() => handleLoanPresetChange('max_aip')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                  loanPresetType === 'max_aip'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-750'
                }`}
              >
                Max AIP Leverage (€{Math.round(maxAipLoan).toLocaleString()})
              </button>
              <button
                onClick={() => handleLoanPresetChange('custom')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                  loanPresetType === 'custom'
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-750'
                }`}
              >
                Custom Loan €
              </button>
            </div>

            {loanPresetType === 'custom' && (
              <div className="flex items-center bg-slate-900 px-2.5 py-1 rounded-lg border border-purple-500/50">
                <span className="text-purple-400 font-mono font-bold text-xs mr-1">€</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={isCustomLoanFocused ? customLoanText : customLoanValue.toLocaleString()}
                  onFocus={() => {
                    setIsCustomLoanFocused(true);
                    setCustomLoanText(String(customLoanValue));
                  }}
                  onBlur={() => {
                    setIsCustomLoanFocused(false);
                    const parsed = parseInt(customLoanText.replace(/[^0-9]/g, ''), 10);
                    if (!isNaN(parsed) && parsed >= 0) {
                      const clamped = Math.min(maxStatutoryLoan, parsed);
                      handleCustomLoanConfirm(clamped);
                    } else {
                      handleCustomLoanConfirm(sidebarLoan);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setCustomLoanText(raw);
                    const parsed = parseInt(raw, 10);
                    if (!isNaN(parsed) && parsed >= 0) {
                      const clamped = Math.min(maxStatutoryLoan, parsed);
                      setCustomLoanValue(clamped);
                    }
                  }}
                  className="w-24 bg-transparent text-left font-mono font-bold text-xs text-purple-200 focus:outline-none"
                />
                <span className="text-slate-500 text-[10px] ml-1.5 font-mono">
                  (Deposit: €{Math.round(Math.max(0, propertyPrice - customLoanValue)).toLocaleString()} • {propertyPrice > 0 ? Math.round((customLoanValue / propertyPrice) * 100) : 0}% LTV)
                </span>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Horizon & Allowance Controls */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Max Mortgage Term */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-300">Max Mortgage Term:</span>
              <InfoTooltip
                title="Max Mortgage Term Horizon"
                content="Caps evaluated repayment terms to your personal ceiling (e.g. 26 years due to retirement age 65-70 limits). Filters out unrealistic 30 or 35 year horizons."
              />
            </div>
            <div className="flex items-center gap-1">
              {[20, 25, 26, 30, 35].map((t) => (
                <button
                  key={t}
                  onClick={() => handleMaxTermChange(t)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                    maxTermYears === t
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-750'
                  }`}
                >
                  {t}y
                </button>
              ))}
            </div>
          </div>

          {/* Fixed-Rate Overpayment Allowance */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-300">Fixed-Rate Allowance:</span>
              <InfoTooltip
                title="Fixed-Rate Annual Overpayment Allowance"
                content="Annual penalty-free overpayment limit during the initial fixed-rate period (e.g. €5,000/yr for lenders like AIB/Haven, or €0 for strict lockouts). Once the fixed term concludes, overpayments are completely unrestricted."
              />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-slate-900 px-2 py-0.5 rounded border border-slate-750 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30">
                <span className="text-emerald-400 font-mono font-bold text-[11px] mr-1">€</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={isAllowanceFocused ? allowanceText : fixedAnnualAllowanceEur.toLocaleString()}
                  onFocus={() => {
                    setIsAllowanceFocused(true);
                    setAllowanceText(String(fixedAnnualAllowanceEur));
                  }}
                  onBlur={() => {
                    setIsAllowanceFocused(false);
                    const parsed = parseInt(allowanceText.replace(/[^0-9]/g, ''), 10);
                    const val = !isNaN(parsed) && parsed >= 0 ? parsed : 5000;
                    handleAllowanceChange(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    setAllowanceText(raw);
                  }}
                  className="w-16 bg-transparent text-left font-mono font-bold text-[11px] text-emerald-200 focus:outline-none"
                />
                <span className="text-slate-500 text-[10px] ml-0.5 font-mono">/yr</span>
              </div>
              <button
                onClick={() => handleAllowanceChange(0)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                  fixedAnnualAllowanceEur === 0
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-750'
                }`}
              >
                Strict €0
              </button>
              <button
                onClick={() => handleAllowanceChange(5000)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                  fixedAnnualAllowanceEur === 5000
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-750'
                }`}
              >
                €5k
              </button>
            </div>
          </div>
        </div>

        {/* Surplus Cashflow Allocation: Invest vs Overpay */}
        <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            {/* Left title & mode toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-300">Surplus Cashflow Strategy:</span>
                <InfoTooltip
                  title="Surplus Cashflow Allocation (Invest vs Overpay)"
                  content="Simulates how unspent monthly salary savings and retained annual bonuses are deployed. When set to 'Invest in Market', surplus compounds at your chosen investment yield — revealing the Pareto trade-off between debt elimination (saving guaranteed mortgage interest) vs. market growth. When set to 'Hold in Cash (0%)', conservative debt paydown strictly dominates cash holding."
                />
              </div>

              <div className="flex items-center bg-slate-950 p-0.5 rounded-md border border-slate-750">
                <button
                  type="button"
                  onClick={() => handleInvestToggle(true)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    investSurplusCashflow
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Invest in Market
                </button>
                <button
                  type="button"
                  onClick={() => handleInvestToggle(false)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    !investSurplusCashflow
                      ? 'bg-slate-700 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Hold in Cash (0%)
                </button>
              </div>
            </div>

            {/* Right: Yield input & Presets (active when investSurplusCashflow is true) */}
            {investSurplusCashflow ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-medium">Surplus Yield:</span>
                <div className="flex items-center bg-slate-900 px-2 py-0.5 rounded border border-slate-750 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/30">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={isYieldFocused ? yieldText : surplusInvestmentYieldPct}
                    onFocus={() => {
                      setIsYieldFocused(true);
                      setYieldText(String(surplusInvestmentYieldPct));
                    }}
                    onBlur={() => {
                      setIsYieldFocused(false);
                      const parsed = parseFloat(yieldText);
                      const val = !isNaN(parsed) && parsed >= 0 ? Math.min(100, Math.max(0, Math.round(parsed * 10) / 10)) : initialYieldPct;
                      handleYieldChange(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    onChange={(e) => {
                      setYieldText(e.target.value);
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed) && parsed >= 0) {
                        setSurplusInvestmentYieldPct(Math.min(100, parsed));
                      }
                    }}
                    className="w-12 bg-transparent text-left font-mono font-bold text-[11px] text-amber-200 focus:outline-none"
                  />
                  <span className="text-amber-400 font-mono font-bold text-[11px] select-none">%</span>
                </div>

                <div className="flex items-center gap-1">
                  {[
                    { label: '6%', val: 6.0 },
                    { label: '8%', val: 8.0 },
                    { label: '10%', val: 10.0 },
                    { label: '12%', val: 12.0 },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => handleYieldChange(p.val)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                        surplusInvestmentYieldPct === p.val
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'bg-slate-850 hover:bg-slate-800 text-slate-400 border-slate-750'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                0.0% Cash Yield • Debt Elimination Dominates
              </span>
            )}
          </div>

          {/* Dynamic Insight Spread Callout */}
          {investSurplusCashflow && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-950/60 border border-slate-850 text-[10.5px]">
              {surplusInvestmentYieldPct > (activeMortgageRate * 100) ? (
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Market yield (<strong>{surplusInvestmentYieldPct.toFixed(1)}%</strong>) beats mortgage rate (<strong>{(activeMortgageRate * 100).toFixed(2)}%</strong>) by <strong>+{(surplusInvestmentYieldPct - activeMortgageRate * 100).toFixed(2)}% spread</strong>. Multiple non-dominated Pareto frontier strategies emerge across the debt-vs-investment spectrum.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Mortgage rate (<strong>{(activeMortgageRate * 100).toFixed(2)}%</strong>) exceeds or matches market yield (<strong>{surplusInvestmentYieldPct.toFixed(1)}%</strong>). Aggressive debt paydown strictly dominates market investing.
                  </span>
                </div>
              )}
            </div>
          )}
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

        {/* Card 2: Balanced Leverage (80% LTV) */}
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
                  <span className="font-bold text-white text-xs truncate">Balanced Leverage</span>
                </div>
                <InfoTooltip
                  title="⚖️ Balanced Leverage Strategy (80% LTV)"
                  content={
                    <div className="space-y-1.5 text-[11px]">
                      <p><strong>Goal:</strong> Balance borrowing reduction with liquid wealth compounding.</p>
                      <p><strong>Mechanism:</strong> Commits a 20% deposit (80% LTV) to manage debt size while leaving the majority of liquid reserves invested in high-return assets.</p>
                      {curated.wealthMaximizer?.candidate.id === curated.greenArbitrageur.candidate.id && (
                        <p className="text-amber-300"><strong>Note:</strong> In this specific scenario, the 80% LTV loan delivers the highest overall wealth, so this recipe matches Wealth Maximizer.</p>
                      )}
                    </div>
                  }
                >
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 cursor-help transition-colors whitespace-nowrap">
                    80% LTV
                  </span>
                </InfoTooltip>
              </div>

              <div className="pt-1">
                <span className="text-[10px] text-slate-400 block">Terminal Net Wealth (M60)</span>
                <span className="text-base font-extrabold font-mono text-emerald-300">
                  {formatK(curated.greenArbitrageur.terminalNetWealthM60)}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono truncate">
                  LTV: {curated.greenArbitrageur.candidate.ltvPct.toFixed(0)}% (20% Deposit)
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
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1">
                    Safety Score:
                    <InfoTooltip
                      title="🛡️ Household Safety Score (0–100)"
                      content={
                        <div className="space-y-1.5 text-[11px]">
                          <p>Composite financial resilience index evaluated at purchase date:</p>
                          <p><strong>• Emergency Runway (max 50 pts):</strong> Months of living costs + mortgage covered by remaining liquid assets post-purchase (6+ months = 50 pts).</p>
                          <p><strong>• Cashflow Buffer (max 50 pts):</strong> Free uncommitted monthly cashflow margin after living costs &amp; mortgage payment (€1,200+/mo = 50 pts).</p>
                        </div>
                      }
                    />
                  </span>
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
            <h4 className="font-bold text-white text-xs sm:text-sm flex flex-wrap items-center gap-2">
              <span>2D Pareto Frontier: Lifetime Interest Paid vs. Terminal Net Wealth (M60)</span>
              {paretoFrontier.length === 1 && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Single Dominant Recipe
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-400">
              {paretoFrontier.length === 1
                ? 'With loan fixed and cash earning 0%, paying off 3.95% debt earlier strictly beats holding cash on both metrics (least interest & highest wealth), dominating slower alternatives. Switch to "Explore All Tiers" to see the equity-compounding trade-off curve across LTVs.'
                : 'Hover over points to inspect recipes. Purple points and connecting line represent the non-dominated Pareto Frontier.'}
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
                            : c.strategyType === 'deposit_20' || c.strategyType === 'green_80'
                            ? '20% Deposit (80% LTV) Strategy'
                            : c.strategyType === 'deposit_30' || c.strategyType === 'super_green_70'
                            ? '30% Deposit (70% LTV) Strategy'
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
                        {res.monthlyInvestedEur !== undefined && res.monthlyInvestedEur > 0 && (
                          <div className="flex justify-between text-amber-300">
                            <span>Market Invested:</span>
                            <strong>+€{Math.round(res.monthlyInvestedEur).toLocaleString()}/mo ({(analysis.surplusInvestmentYieldPct !== undefined && analysis.surplusInvestmentYieldPct !== null ? analysis.surplusInvestmentYieldPct : (config.liquid_assets.investments_yearly_growth_rate * 100)).toFixed(1)}% yield)</strong>
                          </div>
                        )}
                        {res.terminalInvestmentPortfolioM60 !== undefined && res.terminalInvestmentPortfolioM60 > 0 && (
                          <div className="flex justify-between text-amber-200">
                            <span>Investments (M60):</span>
                            <span>{formatK(res.terminalInvestmentPortfolioM60)}</span>
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
                        <div
                          className="flex justify-between text-sky-300"
                          title="Household Safety Score (0–100): Combines post-purchase emergency runway (up to 6 months = 50 pts) and free monthly cashflow buffer (up to €1,200/mo = 50 pts)"
                        >
                          <span className="flex items-center gap-1 cursor-help">
                            Safety Score
                            <span className="text-[10px] text-slate-400 font-sans">ⓘ</span>:
                          </span>
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


