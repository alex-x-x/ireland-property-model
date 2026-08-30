import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingDown,
  Zap,
  RotateCcw,
  Calendar,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { SimulationConfig, MonthlyDataPoint } from '../engine/types';
import {
  calculateMortgageWithOverpayments,
  calculateMonthlyMortgagePayment,
  getSalaryAtDate,
} from '../engine/mortgage';
import { calculateIrishTaxBreakdown } from '../engine/tax';
import { InfoTooltip } from './InfoTooltip';

interface MortgageStudioWidgetProps {
  config: SimulationConfig;
  monthlyPoints: MonthlyDataPoint[];
}

export const MortgageStudioWidget: React.FC<MortgageStudioWidgetProps> = ({
  config,
  monthlyPoints,
}) => {
  // Find earliest affordable month as initial default, or Month 0
  const initialAffordableMonth = useMemo(() => {
    const firstAffordable = monthlyPoints.find((p) => p.isAffordable);
    return firstAffordable ? firstAffordable.month : 0;
  }, [monthlyPoints]);

  const [selectedMonth, setSelectedMonth] = useState<number>(initialAffordableMonth);

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

  // Run overpayment simulation engine
  const overpaymentResult = useMemo(() => {
    return calculateMortgageWithOverpayments(
      {
        principal: activeLoanAmount,
        annualRate: interestRatePct / 100,
        termYears,
        fixedRateYears,
        monthlyOverpayment,
        annualLumpSumOverpayment: annualLumpSum,
      },
      activePoint.date
    );
  }, [
    activeLoanAmount,
    interestRatePct,
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

  // Interest rate shock analysis
  const shockedPayment = calculateMonthlyMortgagePayment(
    activeLoanAmount,
    (interestRatePct + rateShockPct) / 100,
    termYears
  );
  const shockPaymentDelta = shockedPayment - overpaymentResult.standardMonthlyPayment;

  // Chart data: Sample down schedule for clear visualization (every 12 months)
  const chartData = useMemo(() => {
    const data: { year: number; standardBalance: number; overpaymentBalance: number }[] = [];
    const standardTotalMonths = termYears * 12;
    const monthlyRate = (interestRatePct / 100) / 12;
    const standardPayment = overpaymentResult.standardMonthlyPayment;

    let stdBal = activeLoanAmount;

    // Build standard balance map
    const stdBalanceMap = new Map<number, number>();
    stdBalanceMap.set(0, activeLoanAmount);
    for (let m = 1; m <= standardTotalMonths; m++) {
      const interest = stdBal * monthlyRate;
      const principalPaid = Math.min(stdBal, standardPayment - interest);
      stdBal -= principalPaid;
      if (stdBal <= 0.001) stdBal = 0;
      stdBalanceMap.set(m, stdBal);
    }

    // Map overpayment schedule
    const overpaymentMap = new Map<number, number>();
    overpaymentMap.set(0, activeLoanAmount);
    for (const pt of overpaymentResult.schedule) {
      overpaymentMap.set(pt.month, pt.balance);
    }

    const maxMonths = Math.max(standardTotalMonths, overpaymentResult.actualPayoffMonths);
    for (let m = 0; m <= maxMonths; m += 12) {
      const yr = m / 12;
      const sBal = stdBalanceMap.get(m) ?? 0;
      const oBal = m > overpaymentResult.actualPayoffMonths ? 0 : (overpaymentMap.get(m) ?? 0);
      data.push({
        year: yr,
        standardBalance: Math.round(sBal),
        overpaymentBalance: Math.round(oBal),
      });
    }

    return data;
  }, [activeLoanAmount, interestRatePct, termYears, overpaymentResult]);

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
            max={propertyPrice - baseMinDeposit}
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
                className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
              />
              <span className="text-slate-400 text-xs">%</span>
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
                className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
              />
              <span className="text-slate-400 text-xs font-sans">yrs</span>
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
            <button
              onClick={() => setRateShockPct((prev) => (prev === 1.0 ? 1.5 : prev === 1.5 ? 2.0 : prev === 2.0 ? 3.0 : 1.0))}
              className="flex items-center gap-1 text-[10px] text-amber-400 font-mono bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 transition-colors cursor-pointer"
              title={`Simulated +${rateShockPct}% rate increase at fixed renewal: €${Math.round(shockedPayment).toLocaleString()}/mo (+€${Math.round(shockPaymentDelta).toLocaleString()}). Click to cycle shock level (+1.0%, +1.5%, +2.0%, +3.0%).`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>+{rateShockPct}%: €{Math.round(shockedPayment).toLocaleString()}</span>
            </button>
          </div>
          <div className="text-xl font-bold font-mono text-indigo-300">
            €{Math.round(overpaymentResult.standardMonthlyPayment).toLocaleString()}<span className="text-xs font-sans text-slate-400">/mo</span>
          </div>
          <div className="text-[10px] text-slate-400 font-sans">
            Maint: +€{Math.round(monthlyMaintenance).toLocaleString()}/mo • Total: <strong className="text-slate-200">€{Math.round(monthlyHousingCost).toLocaleString()}</strong>
          </div>
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

          {freeCashflowBuffer > 0 && (
            <button
              onClick={() => setMonthlyOverpayment(maxSafeOverpayment)}
              className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-colors flex items-center gap-1 self-start sm:self-auto"
              title="Set overpayment to 50% of free monthly cashflow buffer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Safe Overpayment (+€{maxSafeOverpayment}/mo)</span>
            </button>
          )}
        </div>

        {/* Overpayment Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-slate-400 block text-[11px] mb-1">
              Fixed Rate Period (Lockout)
            </label>
            <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <input
                type="number"
                min="0"
                max="10"
                value={fixedRateYears}
                onChange={(e) => setFixedRateYears(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
              />
              <span className="text-slate-400 text-xs font-sans">years</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {fixedRateYears > 0 ? `Overpayments start Month ${fixedRateYears * 12 + 1}` : 'Variable rate (immediate overpayments)'}
            </span>
          </div>

          <div>
            <label className="text-slate-400 block text-[11px] mb-1">
              Monthly Overpayment (€/mo)
            </label>
            <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
              <input
                type="number"
                step="50"
                min="0"
                value={monthlyOverpayment}
                onChange={(e) => setMonthlyOverpayment(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent text-emerald-300 font-mono font-bold text-xs focus:outline-none"
                placeholder="e.g. 400"
              />
              <span className="text-slate-400 text-xs">€/mo</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Remaining free cash: <strong className="text-emerald-400">€{Math.max(0, Math.round(freeCashflowBuffer - monthlyOverpayment)).toLocaleString()}/mo</strong>
            </span>
          </div>

          <div>
            <label className="text-slate-400 block text-[11px] mb-1">
              Annual Lump Sum Overpayment (€/yr)
            </label>
            <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
              <input
                type="number"
                step="1000"
                min="0"
                value={annualLumpSum}
                onChange={(e) => setAnnualLumpSum(parseFloat(e.target.value) || 0)}
                className="w-full bg-transparent text-purple-300 font-mono font-bold text-xs focus:outline-none"
                placeholder="e.g. 10000 (from March bonus)"
              />
              <span className="text-slate-400 text-xs">€/yr</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Applied each December after fixed period
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

      {/* 5. 5-Year & Full-Term Debt Amortization Chart */}
      <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-sky-400" />
            <h4 className="font-bold text-slate-200 text-xs">Remaining Mortgage Debt Paydown Trajectory</h4>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-400 font-sans">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
              Standard Amortization
            </span>
            {(monthlyOverpayment > 0 || annualLumpSum > 0) && (
              <span className="flex items-center gap-1.5 text-emerald-400 font-sans font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                With Overpayments
              </span>
            )}
          </div>
        </div>

        <div className="h-56 w-full">
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
                formatter={(value: any, name: string) => [
                  `€${Number(value).toLocaleString()}`,
                  name === 'standardBalance' ? 'Standard Balance' : 'Overpayment Balance',
                ]}
                labelFormatter={(label) => `Year ${label}`}
              />
              <Area
                type="monotone"
                dataKey="standardBalance"
                name="standardBalance"
                fill="#64748b"
                fillOpacity={0.15}
                stroke="#64748b"
                strokeWidth={2}
              />
              {(monthlyOverpayment > 0 || annualLumpSum > 0) && (
                <Area
                  type="monotone"
                  dataKey="overpaymentBalance"
                  name="overpaymentBalance"
                  fill="#10b981"
                  fillOpacity={0.25}
                  stroke="#10b981"
                  strokeWidth={2.5}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
