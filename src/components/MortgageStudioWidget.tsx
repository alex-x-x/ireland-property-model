import React, { useState, useMemo, memo } from 'react';
import {
  Calculator,
  TrendingDown,
  Zap,
  RotateCcw,
  Calendar,
  Layers,
  ShieldAlert,
  ListOrdered,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { SimulationConfig, MonthlyDataPoint, MortgageStrategyResult } from '../engine/types';
import {
  calculateMortgageWithOverpayments,
  getSalaryAtDate,
  AmortizationSchedulePoint,
} from '../engine/mortgage';
import { calculateIrishTaxBreakdown } from '../engine/tax';
import { InfoTooltip } from './InfoTooltip';
import { AmortizationScheduleModal } from './AmortizationScheduleModal';
import { FrontierOptimizerCard } from './FrontierOptimizerCard';


interface MortgageStudioWidgetProps {
  config: SimulationConfig;
  monthlyPoints: MonthlyDataPoint[];
}

export const MortgageStudioWidget: React.FC<MortgageStudioWidgetProps> = memo(({
  config,
  monthlyPoints,
}) => {
  // Find earliest affordable month as initial default, or Month 0
  const initialAffordableMonth = useMemo(() => {
    const firstAffordable = monthlyPoints.find((p) => p.isAffordable);
    return firstAffordable ? firstAffordable.month : 0;
  }, [monthlyPoints]);

  const [selectedMonth, setSelectedMonth] = useState<number>(initialAffordableMonth);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState<boolean>(false);
  const [chartViewMode, setChartViewMode] = useState<'all' | 'balance' | 'principal_interest'>('all');

  // Active timeline point at selected purchase month
  const activePoint = monthlyPoints[selectedMonth] || monthlyPoints[0];
  const propertyPrice = activePoint.propertyPrice;
  const stampDuty = activePoint.stampDuty;
  const legalFees = config.property.legal_and_closing_fees_eur;
  const usableLiquidFunds =
    activePoint.usableLiquidWealth ??
    Math.max(0, activePoint.totalLiquidWealth - (activePoint.safetyBufferEur ?? 0));
  const maxLoanAllowed = activePoint.maxMortgageAvailable;
  const statutoryMinDepositPct = config.property.minimum_deposit_pct ?? 0.10;
  const baseMinDeposit = propertyPrice * statutoryMinDepositPct;
  const minRequiredDeposit = baseMinDeposit + activePoint.borrowingShortfall;

  // Custom adjustable parameters (with reset capability)
  const defaultLoanAmount = Math.min(maxLoanAllowed, Math.max(0, propertyPrice - minRequiredDeposit));
  const [customLoanAmount, setCustomLoanAmount] = useState<number | null>(null);
  const [interestRatePct, setInterestRatePct] = useState<number>(
    config.mortgage.mortgage_interest_rate * 100
  );
  const [termYears, setTermYears] = useState<number>(config.mortgage.mortgage_term_years);
  const [fixedRateYears, setFixedRateYears] = useState<number>(2); // Irish benchmark: 2-year fixed lock
  const [monthlyOverpayment, setMonthlyOverpayment] = useState<number>(0);
  const [annualLumpSum, setAnnualLumpSum] = useState<number>(0);
  const [rateShockPct, setRateShockPct] = useState<number>(1.5);

  const activeLoanAmount = customLoanAmount !== null ? customLoanAmount : defaultLoanAmount;
  const activeDepositAmount = Math.max(0, propertyPrice - activeLoanAmount);
  const ltvPct = propertyPrice > 0 ? (activeLoanAmount / propertyPrice) * 100 : 0;
  const depositPct = propertyPrice > 0 ? (activeDepositAmount / propertyPrice) * 100 : 0;
  const totalUpfrontPaid = activeDepositAmount + stampDuty + legalFees;
  const postPurchaseLiquidLeft = Math.max(0, activePoint.totalLiquidWealth - totalUpfrontPaid);
  const isDepositFundable = activePoint.totalLiquidWealth >= totalUpfrontPaid;

  // Handle Preset Strategy Buttons
  const handleSetMinDeposit = () => {
    const loan = Math.min(maxLoanAllowed, propertyPrice - minRequiredDeposit);
    setCustomLoanAmount(Math.round(loan));
  };

  const handleSetGreen80 = () => {
    const loan = Math.min(maxLoanAllowed, propertyPrice * 0.80);
    setCustomLoanAmount(Math.round(loan));
  };

  const handleSetSuperGreen70 = () => {
    const loan = Math.min(maxLoanAllowed, propertyPrice * 0.70);
    setCustomLoanAmount(Math.round(loan));
  };

  const handleSetMaxDeposit = () => {
    const maxUsableForDeposit = Math.max(0, usableLiquidFunds - (stampDuty + legalFees));
    const deposit = Math.min(propertyPrice, maxUsableForDeposit);
    const loan = Math.max(0, propertyPrice - deposit);
    setCustomLoanAmount(Math.round(loan));
  };

  const handleResetDefaults = () => {
    setCustomLoanAmount(null);
    setInterestRatePct(config.mortgage.mortgage_interest_rate * 100);
    setTermYears(config.mortgage.mortgage_term_years);
    setFixedRateYears(2);
    setMonthlyOverpayment(0);
    setAnnualLumpSum(0);
    setRateShockPct(1.5);
  };

  const handleApplyOptimizedStrategy = React.useCallback((strategy: MortgageStrategyResult) => {
    const c = strategy.candidate;
    setCustomLoanAmount(Math.round(c.loanAmount));
    setInterestRatePct(c.interestRatePct);
    setTermYears(c.termYears);
    setFixedRateYears(c.fixedRateYears);
    setMonthlyOverpayment(c.monthlyOverpayment);
    setAnnualLumpSum(c.annualBonusLumpSum);
  }, []);

  const effectiveVariableRatePct = interestRatePct + rateShockPct;

  // Run overpayment simulation engine
  const overpaymentResult = useMemo(() => {
    return calculateMortgageWithOverpayments(
      {
        principal: activeLoanAmount,
        annualRate: interestRatePct / 100,
        termYears,
        fixedRateYears,
        variableRate: effectiveVariableRatePct / 100,
        monthlyOverpayment,
        annualLumpSumOverpayment: annualLumpSum,
      },
      activePoint.date
    );
  }, [
    activeLoanAmount,
    interestRatePct,
    effectiveVariableRatePct,
    termYears,
    fixedRateYears,
    monthlyOverpayment,
    annualLumpSum,
    activePoint.date,
  ]);

  // Cashflow & Living Expenses analysis
  const activeSalary = getSalaryAtDate(activePoint.date, config.mortgage);
  const taxBreakdown = calculateIrishTaxBreakdown(activeSalary.baseSalary, config.tax);
  const monthlyMaintenance = (propertyPrice * config.mortgage.yearly_maintenance_rate) / 12;
  const monthlyLivingExpenses = config.tax?.monthly_living_expenses_eur ?? 2500;
  const monthlyHousingCost = overpaymentResult.standardMonthlyPayment + monthlyMaintenance;
  const freeCashflowBuffer = Math.max(
    0,
    taxBreakdown.netMonthlyTakeHome - monthlyHousingCost - monthlyLivingExpenses
  );
  const maxSafeOverpayment = Math.max(0, Math.floor((freeCashflowBuffer * 0.5) / 50) * 50);

  // Bonus on file (gross vs net after Irish marginal tax)
  const grossBonusEur = activeSalary.bonusEur;
  const netBonusEur = Math.round(grossBonusEur * (1 - config.equity_engine.marginal_tax_rate_ireland));
  const halfNetBonusEur = Math.round(netBonusEur * 0.5);

  // Interest rate shock options (Irish/ECB benchmarks: 0% Flat, +0.5% Variable Bump, +1.0% Hike, +1.5%/+2.0% Central Bank Stress, +3.0% Severe)
  const RATE_SHOCK_OPTIONS = [0.0, 0.5, 1.0, 1.5, 2.0, 3.0];


  // Chart data: Sample down schedule for clear visualization (every 12 months)
  const chartData = useMemo(() => {
    const data: {
      year: number;
      standardBalance: number;
      overpaymentBalance: number;
      cumulativePrincipal: number;
      cumulativeInterest: number;
      standardPrincipal: number;
      standardInterest: number;
    }[] = [];
    const standardTotalMonths = termYears * 12;
    const fixedMonths = Math.min(standardTotalMonths, Math.max(0, fixedRateYears * 12));
    const fixedMonthlyRate = (interestRatePct / 100) / 12;
    const varMonthlyRate = (effectiveVariableRatePct / 100) / 12;
    const stdInitialPayment = overpaymentResult.standardMonthlyPayment;
    const stdVarPayment = overpaymentResult.variableMonthlyPayment ?? stdInitialPayment;

    let stdBal = activeLoanAmount;
    let stdCumInterest = 0;
    let stdCumPrincipal = 0;

    // Build standard balance and interest map
    const stdMap = new Map<number, { balance: number; cumPrincipal: number; cumInterest: number }>();
    stdMap.set(0, { balance: activeLoanAmount, cumPrincipal: 0, cumInterest: 0 });
    for (let m = 1; m <= standardTotalMonths; m++) {
      const inFixed = fixedMonths > 0 && m <= fixedMonths;
      const rateThisMonth = inFixed ? fixedMonthlyRate : varMonthlyRate;
      const scheduledPmt = inFixed ? stdInitialPayment : stdVarPayment;
      const interest = stdBal * rateThisMonth;
      const principalPaid = Math.min(stdBal, Math.max(0, scheduledPmt - interest));
      stdBal -= principalPaid;
      stdCumInterest += interest;
      stdCumPrincipal += principalPaid;
      if (stdBal <= 0.001) stdBal = 0;
      stdMap.set(m, { balance: stdBal, cumPrincipal: stdCumPrincipal, cumInterest: stdCumInterest });
    }

    // Map overpayment schedule
    const overpaymentMap = new Map<number, AmortizationSchedulePoint>();
    for (const pt of overpaymentResult.schedule) {
      overpaymentMap.set(pt.month, pt);
    }

    const maxMonths = Math.max(standardTotalMonths, overpaymentResult.actualPayoffMonths);
    for (let m = 0; m <= maxMonths; m += 12) {
      const yr = m / 12;
      const stdEntry = stdMap.get(m);
      const sBal = stdEntry?.balance ?? 0;
      const stdPrin = stdEntry?.cumPrincipal ?? activeLoanAmount;
      const stdInt = stdEntry?.cumInterest ?? overpaymentResult.totalInterestStandard;

      const pt = overpaymentMap.get(m);
      const isPastPayoff = m > overpaymentResult.actualPayoffMonths;
      const oBal = m === 0 ? activeLoanAmount : isPastPayoff ? 0 : (pt?.balance ?? 0);
      const cumPrin = m === 0 ? 0 : isPastPayoff ? activeLoanAmount : (pt?.cumulativePrincipalPaid ?? activeLoanAmount);
      const cumInt = m === 0 ? 0 : isPastPayoff ? overpaymentResult.totalInterestWithOverpayment : (pt?.cumulativeInterestPaid ?? overpaymentResult.totalInterestWithOverpayment);

      data.push({
        year: yr,
        standardBalance: Math.round(sBal),
        overpaymentBalance: Math.round(oBal),
        cumulativePrincipal: Math.round(cumPrin),
        cumulativeInterest: Math.round(cumInt),
        standardPrincipal: Math.round(stdPrin),
        standardInterest: Math.round(stdInt),
      });
    }

    return data;
  }, [activeLoanAmount, interestRatePct, effectiveVariableRatePct, termYears, fixedRateYears, overpaymentResult]);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `€${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `€${Math.round(val / 1000)}k`;
    return `€${val}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Mortgage Studio & Loan Optimizer</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Interactive Planner
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate loan vs deposit combinations at any purchase month, test Irish fixed-rate overpayments, and verify monthly cashflow safety.
          </p>
        </div>

        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors self-start sm:self-auto"
          title="Reset loan, interest rate, and term to baseline profile defaults"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset to Defaults</span>
        </button>
      </div>

      {/* 1. Timeline Purchase Month Selector & Dynamic Context */}
      <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <label className="font-bold text-slate-200 text-xs">
              Simulated Purchase Timing: <span className="text-white font-mono">Month {selectedMonth} ({activePoint.date})</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-sans">Quick Months:</span>
            {[0, 6, 12, 18, 24, 36, 48].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border transition-colors ${
                  selectedMonth === m
                    ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-750'
                }`}
              >
                M{m}
              </button>
            ))}
          </div>
        </div>

        <input
          type="range"
          min="0"
          max={config.meta.forecast_months}
          step="1"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
        />

        {/* Live Context Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[11px]">
            <span className="text-slate-400 block text-[10px]">Property Price (Inflated)</span>
            <span className="font-mono font-bold text-white">€{Math.round(propertyPrice).toLocaleString()}</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[11px]">
            <span className="text-slate-400 block text-[10px]">Max Loan Allowed (CBI 4.0x/AIP)</span>
            <span className="font-mono font-bold text-emerald-400">€{Math.round(maxLoanAllowed).toLocaleString()}</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[11px]">
            <span className="text-slate-400 block text-[10px]">Usable Liquid Capital</span>
            <span className="font-mono font-bold text-purple-300">€{Math.round(usableLiquidFunds).toLocaleString()}</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[11px]">
            <span className="text-slate-400 block text-[10px]">Min Deposit Required</span>
            <span className="font-mono font-bold text-amber-300">€{Math.round(minRequiredDeposit).toLocaleString()} ({statutoryMinDepositPct * 100}%)</span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Loan & Deposit Split Controls */}
      <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h4 className="font-bold text-slate-200 text-xs">Loan vs. Deposit Split & Leverage Presets</h4>
          </div>

          {/* Strategy Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleSetMinDeposit}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[10px] font-bold border border-slate-700 transition-colors"
              title="Borrow maximum possible loan, minimizing deposit upfront to keep stocks compounding"
            >
              ⚡ Min Deposit (Max Leverage)
            </button>
            <button
              onClick={handleSetGreen80}
              className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition-colors"
              title="80% Loan-To-Value ratio: qualifies for top Irish Green mortgage rates"
            >
              🌿 80% LTV Green Tier
            </button>
            <button
              onClick={handleSetSuperGreen70}
              className="px-2 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[10px] font-bold border border-teal-500/30 transition-colors"
              title="70% Loan-To-Value ratio: lowest bank margin tier"
            >
              🛡️ 70% Super-Green
            </button>
            <button
              onClick={handleSetMaxDeposit}
              className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-bold border border-purple-500/30 transition-colors"
              title="Deploy all usable liquid funds into deposit to minimize debt service"
            >
              🚀 Max Liquid Deposit
            </button>
          </div>
        </div>

        {/* Linked Interactive Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono font-bold">
            <span className="text-amber-300">Deposit: €{Math.round(activeDepositAmount).toLocaleString()} ({depositPct.toFixed(1)}%)</span>
            <span className="text-indigo-300">Mortgage Loan: €{Math.round(activeLoanAmount).toLocaleString()} ({ltvPct.toFixed(1)}% LTV)</span>
          </div>

          <input
            type="range"
            min={Math.max(0, propertyPrice - maxLoanAllowed)}
            max={Math.max(Math.max(0, propertyPrice - maxLoanAllowed), propertyPrice - baseMinDeposit)}
            step="5000"
            value={activeDepositAmount}
            onChange={(e) => {
              const newDeposit = parseFloat(e.target.value);
              setCustomLoanAmount(Math.round(propertyPrice - newDeposit));
            }}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-sans">
            <span>Min Deposit: €{Math.round(minRequiredDeposit).toLocaleString()}</span>
            <span>Max Loan Cap: €{Math.round(maxLoanAllowed).toLocaleString()}</span>
          </div>
        </div>

        {/* Loan Term & Interest Rate Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          <div>
            <label className="text-slate-400 block text-[11px] mb-1">Mortgage Loan (€)</label>
            <input
              type="number"
              step="5000"
              value={Math.round(activeLoanAmount)}
              onChange={(e) => setCustomLoanAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-indigo-200 font-mono font-bold text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 block text-[11px] mb-1">Deposit (€)</label>
            <input
              type="number"
              step="5000"
              value={Math.round(activeDepositAmount)}
              onChange={(e) => {
                const dep = parseFloat(e.target.value) || 0;
                setCustomLoanAmount(Math.max(0, propertyPrice - dep));
              }}
              className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-amber-200 font-mono font-bold text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 block text-[11px] mb-1">Interest Rate (%)</label>
            <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="10"
                value={interestRatePct}
                onChange={(e) => setInterestRatePct(parseFloat(e.target.value) || 3.5)}
                className="min-w-0 w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
              />
              <span className="shrink-0 whitespace-nowrap text-slate-400 text-xs">%</span>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block text-[11px] mb-1">Loan Term (Years)</label>
            <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <input
                type="number"
                min="5"
                max="35"
                value={termYears}
                onChange={(e) => setTermYears(parseInt(e.target.value, 10) || 25)}
                className="min-w-0 w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
              />
              <span className="shrink-0 whitespace-nowrap text-slate-400 text-xs font-sans">yrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Four-Card Real-Time Metrics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Monthly Payment */}
        <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs block">Monthly Mortgage Payment</span>
            <InfoTooltip
              title="Variable Rate Transition"
              content={
                fixedRateYears > 0 && rateShockPct !== 0
                  ? `Fixed lock for Years 1–${fixedRateYears} at ${interestRatePct.toFixed(2)}% (€${Math.round(overpaymentResult.standardMonthlyPayment).toLocaleString()}/mo), then transitions to variable rate ${effectiveVariableRatePct.toFixed(2)}% (€${Math.round(overpaymentResult.variableMonthlyPayment ?? overpaymentResult.standardMonthlyPayment).toLocaleString()}/mo).`
                  : `Monthly mortgage installment at ${effectiveVariableRatePct.toFixed(2)}% annual rate.`
              }
            />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-300">
            €{Math.round(overpaymentResult.standardMonthlyPayment).toLocaleString()}<span className="text-xs font-sans text-slate-400">/mo</span>
            {fixedRateYears > 0 && rateShockPct !== 0 && (
              <span className="text-xs font-sans text-slate-400 ml-1">(Fixed Y1–{fixedRateYears})</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">
            Maint: +€{Math.round(monthlyMaintenance).toLocaleString()}/mo • Total: <strong className="text-slate-200">€{Math.round(monthlyHousingCost).toLocaleString()}</strong>
          </div>
          {fixedRateYears > 0 && rateShockPct !== 0 && overpaymentResult.variableMonthlyPayment && (
            <div className={`text-[10px] font-mono mt-0.5 ${rateShockPct <= 1.0 ? 'text-sky-300' : 'text-amber-400'}`}>
              ⚡ Variable (Y{fixedRateYears + 1}+ at {effectiveVariableRatePct.toFixed(2)}%): €{Math.round(overpaymentResult.variableMonthlyPayment).toLocaleString()}/mo
              <span className="text-slate-400"> ({overpaymentResult.variableMonthlyPayment >= overpaymentResult.standardMonthlyPayment ? '+' : ''}€{Math.round(overpaymentResult.variableMonthlyPayment - overpaymentResult.standardMonthlyPayment)}/mo)</span>
            </div>
          )}
        </div>

        {/* Card 2: Free Cashflow Buffer */}
        <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs block">Free Monthly Cashflow</span>
            <InfoTooltip
              title="Net Free Monthly Cashflow"
              content="Monthly take-home salary minus Mortgage, Maintenance, and Living Expenses. Represents your monthly discretionary saving room."
            />
          </div>
          <div className={`text-xl font-bold font-mono ${
            freeCashflowBuffer >= 1500
              ? 'text-emerald-400'
              : freeCashflowBuffer >= 500
              ? 'text-amber-300'
              : 'text-rose-400'
          }`}>
            +€{Math.round(freeCashflowBuffer).toLocaleString()}<span className="text-xs font-sans text-slate-400">/mo</span>
          </div>
          <div className="text-[10px] text-slate-400 font-sans">
            {freeCashflowBuffer >= 1500 ? '✓ Healthy Buffer' : freeCashflowBuffer >= 500 ? '⚠️ Moderate Buffer' : '🚨 Tight Cashflow'} (after €{monthlyLivingExpenses} living)
          </div>
        </div>

        {/* Card 3: Post-Purchase Liquid Leftover */}
        <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-1">
          <span className="text-slate-400 text-xs block">Post-Purchase Liquid Left</span>
          <div className="text-xl font-bold font-mono text-purple-300">
            €{Math.round(postPurchaseLiquidLeft).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">
            {isDepositFundable ? (
              <span className="text-emerald-400">✓ Fully Funded with Liquid Reserves</span>
            ) : (
              <span className="text-rose-400 font-bold">⚠️ Capital Shortfall: -€{Math.round(totalUpfrontPaid - activePoint.totalLiquidWealth).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Card 4: 25-Year Total Interest */}
        <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-1">
          <span className="text-slate-400 text-xs block">Total Lifetime Interest</span>
          <div className="text-xl font-bold font-mono text-rose-300">
            €{Math.round(overpaymentResult.totalInterestStandard).toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-sans">
            Total Repaid: €{Math.round(activeLoanAmount + overpaymentResult.totalInterestStandard).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Multidimensional Pareto Frontier & Strategy Optimizer */}
      <FrontierOptimizerCard
        config={config}
        monthlyPoints={monthlyPoints}
        selectedMonth={selectedMonth}
        currentLoanAmount={activeLoanAmount}
        currentInterestRatePct={interestRatePct}
        currentTermYears={termYears}
        currentMonthlyOverpayment={monthlyOverpayment}
        currentAnnualLumpSum={annualLumpSum}
        onApplyStrategy={handleApplyOptimizedStrategy}
      />

      {/* 4. Irish Fixed-Rate Overpayment Simulator & Cashflow Integration */}
      <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">

          <div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-slate-200 text-xs">Irish Mortgage Overpayment Simulator</h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Fixed-Lock Aware
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              In Ireland, early overpayments during the initial fixed-rate period (default 2 years) are restricted. Overpayments kick in automatically once off-fixed.
            </p>
          </div>
        </div>

        {/* Overpayment Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-4 items-start">
          {/* Col 1: Fixed Rate Lock */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between h-5">
              <label className="text-slate-400 text-[11px]">Fixed Rate Period (Lockout)</label>
              <span className="text-[10px] text-sky-400 font-bold font-mono">
                {fixedRateYears > 0 ? `${fixedRateYears}y Lock` : 'Variable'}
              </span>
            </div>
            <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <input
                type="number"
                min="0"
                max="10"
                value={fixedRateYears}
                onChange={(e) => setFixedRateYears(parseInt(e.target.value, 10) || 0)}
                className="min-w-0 w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
              />
              <span className="shrink-0 whitespace-nowrap text-slate-400 text-xs font-sans">years</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {fixedRateYears > 0 ? `Overpayments start Month ${fixedRateYears * 12 + 1}` : 'Variable rate (immediate overpayments)'}
            </span>
          </div>

          {/* Col 2: Variable Rate Shock */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between h-5">
              <label className="text-slate-400 text-[11px] flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                Variable Rate Shock
              </label>
              <span className={`text-[10px] font-bold font-mono ${rateShockPct === 0 ? 'text-slate-400' : rateShockPct <= 1.0 ? 'text-sky-400' : 'text-amber-400'}`}>
                {effectiveVariableRatePct.toFixed(2)}% {rateShockPct !== 0 && `(${rateShockPct > 0 ? '+' : ''}${rateShockPct}%)`}
              </span>
            </div>
            <div className={`flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border ${rateShockPct === 0 ? 'border-slate-700' : rateShockPct <= 1.0 ? 'border-sky-500/40' : 'border-amber-500/40'}`}>
              <input
                type="number"
                step="0.25"
                min="-2"
                max="5"
                value={rateShockPct}
                onChange={(e) => setRateShockPct(parseFloat(e.target.value) || 0)}
                className={`min-w-0 w-full bg-transparent font-mono font-bold text-xs focus:outline-none ${rateShockPct === 0 ? 'text-slate-300' : rateShockPct <= 1.0 ? 'text-sky-300' : 'text-amber-300'}`}
              />
              <span className="shrink-0 whitespace-nowrap text-slate-400 text-xs">% hike</span>
            </div>
            {/* Quick-select pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {RATE_SHOCK_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setRateShockPct(opt)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                    rateShockPct === opt
                      ? opt === 0
                        ? 'bg-slate-600 text-white border-slate-500'
                        : opt <= 1.0
                        ? 'bg-sky-600 text-white border-sky-400'
                        : 'bg-amber-600 text-white border-amber-400'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  {opt === 0 ? '0% (Flat)' : `+${opt}%`}
                </button>
              ))}
            </div>
            {rateShockPct !== 0 && overpaymentResult.variableMonthlyPayment ? (
              <span className={`text-[10px] font-mono ${rateShockPct <= 1.0 ? 'text-sky-400' : 'text-amber-400'}`}>
                Var Rate: {effectiveVariableRatePct.toFixed(2)}% → €{Math.round(overpaymentResult.variableMonthlyPayment).toLocaleString()}/mo ({overpaymentResult.variableMonthlyPayment >= overpaymentResult.standardMonthlyPayment ? '+' : ''}€{Math.round(overpaymentResult.variableMonthlyPayment - overpaymentResult.standardMonthlyPayment)})
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">Applies after {fixedRateYears > 0 ? `${fixedRateYears}y lock` : 'Month 1'}</span>
            )}
          </div>

          {/* Col 3: Monthly Overpayment */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between h-5">
              <label className="text-slate-400 text-[11px]">Monthly Overpayment</label>
              {freeCashflowBuffer > 0 && (
                <button
                  onClick={() => setMonthlyOverpayment(maxSafeOverpayment)}
                  className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 transition-colors flex items-center gap-1"
                  title={`Fill 50% of free monthly cashflow buffer (safe discretionary margin: €${maxSafeOverpayment}/mo)`}
                >
                  <Zap className="w-2.5 h-2.5" />
                  <span>50% (+€{maxSafeOverpayment})</span>
                </button>
              )}
            </div>
            <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
              <input
                type="number"
                step="50"
                min="0"
                value={monthlyOverpayment}
                onChange={(e) => setMonthlyOverpayment(parseFloat(e.target.value) || 0)}
                className="min-w-0 w-full bg-transparent text-emerald-300 font-mono font-bold text-xs focus:outline-none"
                placeholder="e.g. 400"
              />
              <span className="shrink-0 whitespace-nowrap text-slate-400 text-xs">€/mo</span>
            </div>
            <span className="text-[10px] text-slate-400">
              Remaining free cash: <strong className="text-emerald-400">€{Math.max(0, Math.round(freeCashflowBuffer - monthlyOverpayment)).toLocaleString()}/mo</strong>
            </span>
          </div>

          {/* Col 4: Annual Bonus Lump Sum */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between h-5">
              <label className="text-slate-400 text-[11px]">Annual Bonus Lump Sum</label>
              {grossBonusEur > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAnnualLumpSum(netBonusEur)}
                    className="px-1.5 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-bold border border-purple-500/30 transition-colors"
                    title={`Fill 100% Net Bonus (gross €${grossBonusEur.toLocaleString()} minus 52% Irish tax = net €${netBonusEur.toLocaleString()})`}
                  >
                    100% Net (€{Math.round(netBonusEur / 1000)}k)
                  </button>
                  <button
                    onClick={() => setAnnualLumpSum(halfNetBonusEur)}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-bold border border-slate-700 transition-colors"
                    title={`Fill 50% Net Bonus (net €${halfNetBonusEur.toLocaleString()})`}
                  >
                    50% (€{Math.round(halfNetBonusEur / 1000)}k)
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <input
                type="number"
                step="1000"
                min="0"
                value={annualLumpSum}
                onChange={(e) => setAnnualLumpSum(parseFloat(e.target.value) || 0)}
                className="min-w-0 w-full bg-transparent text-purple-300 font-mono font-bold text-xs focus:outline-none"
                placeholder="e.g. 10000"
              />
              <span className="shrink-0 whitespace-nowrap text-slate-400 text-xs">€/yr</span>
            </div>
            <span className="text-[10px] text-slate-500">
              Applied every March. {grossBonusEur > 0 ? `Bonus on file: €${Math.round(grossBonusEur).toLocaleString()} gross (net €${netBonusEur.toLocaleString()} at 52% tax)` : 'Paid after fixed period'}
            </span>
          </div>
        </div>

        {/* Overpayment Impact Summary Box */}
        {(monthlyOverpayment > 0 || annualLumpSum > 0) && (
          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-emerald-300 block text-[10px] font-sans">⏱️ New Loan Term</span>
              <span className="text-base font-bold font-mono text-white">
                {(overpaymentResult.actualPayoffMonths / 12).toFixed(1)} yrs
              </span>
              <span className="text-[10px] text-emerald-400 block font-semibold">
                Shaves {overpaymentResult.yearsSaved.toFixed(1)} yrs ({overpaymentResult.monthsSaved} mos)
              </span>
            </div>

            <div>
              <span className="text-emerald-300 block text-[10px] font-sans">💰 Total Interest Saved</span>
              <span className="text-base font-bold font-mono text-emerald-300">
                +€{Math.round(overpaymentResult.totalInterestSaved).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Interest cuts from €{Math.round(overpaymentResult.totalInterestStandard / 1000)}k to €{Math.round(overpaymentResult.totalInterestWithOverpayment / 1000)}k
              </span>
            </div>

            <div>
              <span className="text-emerald-300 block text-[10px] font-sans">📅 Debt-Free Date</span>
              <span className="text-base font-bold font-mono text-white">
                {overpaymentResult.schedule[overpaymentResult.schedule.length - 1]?.dateStr || 'N/A'}
              </span>
              <span className="text-[10px] text-slate-400 block">
                vs {termYears}-yr scheduled payoff
              </span>
            </div>

            <div>
              <span className="text-emerald-300 block text-[10px] font-sans">💵 Total Overpaid</span>
              <span className="text-base font-bold font-mono text-slate-200">
                €{Math.round(overpaymentResult.totalOverpaymentsPaid).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Direct principal reduction
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Multi-Curve Debt Paydown, Principal & Interest Chart */}
      <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-sky-400" />
            <h4 className="font-bold text-slate-200 text-xs">Amortization Paydown: Debt Balance, Principal & Interest</h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px]">
              <button
                onClick={() => setChartViewMode('all')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  chartViewMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📊 All Curves
              </button>
              <button
                onClick={() => setChartViewMode('balance')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  chartViewMode === 'balance' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📉 Debt Balance
              </button>
              <button
                onClick={() => setChartViewMode('principal_interest')}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  chartViewMode === 'principal_interest' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📈 Principal vs Interest
              </button>
            </div>

            {/* Open Full Ledger Modal Button */}
            <button
              onClick={() => setIsLedgerModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 text-xs font-bold border border-indigo-500/40 transition-colors"
              title="Open full month-by-month table of all payments"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>📋 View Full Amortization Ledger ({overpaymentResult.actualPayoffMonths}m)</span>
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="year"
                stroke="#94a3b8"
                tick={{ fontSize: 10 }}
                tickFormatter={(y) => `Yr ${y}`}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 10 }}
                tickFormatter={formatCurrency}
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '11px' }}
                formatter={(value: any, name?: any) => {
                  const valNum = Number(value);
                  const key = String(name ?? '');
                  const labelMap: Record<string, string> = {
                    overpaymentBalance: 'Remaining Loan Balance',
                    standardBalance: 'Standard Remaining Balance',
                    cumulativePrincipal: 'Loan Body (Principal) Paid',
                    cumulativeInterest: 'Cumulative Interest Paid to Bank',
                    standardPrincipal: 'Standard Principal Paid',
                    standardInterest: 'Standard Interest Paid',
                  };
                  return [`€${valNum.toLocaleString()}`, labelMap[key] || key];
                }}
                labelFormatter={(label) => `Year ${label}`}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                formatter={(value?: any) => {
                  const strVal = String(value ?? '');
                  const legendLabels: Record<string, string> = {
                    overpaymentBalance: 'Remaining Debt Balance',
                    standardBalance: 'Standard Balance (No Overpayment)',
                    cumulativePrincipal: 'Loan Body (Principal) Paid',
                    cumulativeInterest: 'Cumulative Interest Paid',
                  };
                  return legendLabels[strVal] || strVal;
                }}
              />

              {/* Debt Balance Curves */}
              {(chartViewMode === 'all' || chartViewMode === 'balance') && (
                <>
                  <Area
                    type="monotone"
                    dataKey="standardBalance"
                    name="standardBalance"
                    fill="#64748b"
                    fillOpacity={0.10}
                    stroke="#64748b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  <Area
                    type="monotone"
                    dataKey="overpaymentBalance"
                    name="overpaymentBalance"
                    fill="#3b82f6"
                    fillOpacity={0.20}
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                  />
                </>
              )}

              {/* Principal & Interest Curves */}
              {(chartViewMode === 'all' || chartViewMode === 'principal_interest') && (
                <>
                  <Area
                    type="monotone"
                    dataKey="cumulativePrincipal"
                    name="cumulativePrincipal"
                    fill="#10b981"
                    fillOpacity={0.20}
                    stroke="#10b981"
                    strokeWidth={2.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeInterest"
                    name="cumulativeInterest"
                    fill="#f43f5e"
                    fillOpacity={0.15}
                    stroke="#f43f5e"
                    strokeWidth={2}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Amortization Ledger Modal */}
      <AmortizationScheduleModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        result={overpaymentResult}
        principal={activeLoanAmount}
        annualRatePct={interestRatePct}
        variableRatePct={effectiveVariableRatePct}
        termYears={termYears}
        fixedRateYears={fixedRateYears}
        monthlyOverpayment={monthlyOverpayment}
        annualLumpSum={annualLumpSum}
      />
    </div>
  );
});
