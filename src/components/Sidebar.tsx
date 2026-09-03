import React, { useState, useEffect, useTransition, memo, useCallback, useMemo } from 'react';
import {
  Home,
  Landmark,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Coins,
} from 'lucide-react';
import { SimulationConfig } from '../engine/types';
import { InfoTooltip } from './InfoTooltip';
import { targetFxToYearlyDrift, yearlyDriftToTargetFx, getFxMilestones } from '../engine/currency';
import { calculateStampDuty } from '../engine/simulation';
import { getTotalGrossSalary } from '../engine/mortgage';

interface SidebarProps {
  config: SimulationConfig;
  onChange: (updated: SimulationConfig) => void;
}

interface SliderControlProps {
  label: string;
  tooltipTitle: string;
  tooltipContent: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  inputStep?: number;
  precision?: number;
  colorTheme: 'purple' | 'brand' | 'sky' | 'emerald' | 'rose' | 'slate';
  ticks?: [string, string, string];
  onChange: (val: number) => void;
}

const SliderControl: React.FC<SliderControlProps> = memo(({
  label,
  tooltipTitle,
  tooltipContent,
  value,
  min,
  max,
  step,
  inputStep = 0.1,
  precision = 1,
  colorTheme,
  ticks,
  onChange,
}) => {
  const [textVal, setTextVal] = useState<string>((value * 100).toFixed(precision));
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused) {
      setTextVal((value * 100).toFixed(precision));
    }
  }, [value, precision, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextVal(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(parsed / 100);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(textVal);
    if (isNaN(parsed)) {
      setTextVal((value * 100).toFixed(precision));
    } else {
      setTextVal(parsed.toFixed(precision));
    }
  };

  const themeStyles = {
    purple: {
      card: 'border-purple-500/20',
      label: 'text-purple-300',
      box: 'bg-purple-950/40 border-purple-500/30 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400/40',
      input: 'text-purple-300',
      suffix: 'text-purple-400',
      slider: 'accent-purple-500',
    },
    brand: {
      card: 'border-brand-500/20',
      label: 'text-brand-300',
      box: 'bg-brand-950/40 border-brand-500/30 focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-400/40',
      input: 'text-brand-300',
      suffix: 'text-brand-400',
      slider: 'accent-brand-500',
    },
    sky: {
      card: 'border-sky-500/20',
      label: 'text-sky-300',
      box: 'bg-sky-950/40 border-sky-500/30 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-400/40',
      input: 'text-sky-300',
      suffix: 'text-sky-400',
      slider: 'accent-sky-500',
    },
    emerald: {
      card: 'border-emerald-500/20',
      label: 'text-emerald-300',
      box: 'bg-emerald-950/40 border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/40',
      input: 'text-emerald-300',
      suffix: 'text-emerald-400',
      slider: 'accent-emerald-500',
    },
    rose: {
      card: 'border-rose-500/20',
      label: 'text-rose-300',
      box: 'bg-rose-950/40 border-rose-500/30 focus-within:border-rose-400 focus-within:ring-1 focus-within:ring-rose-400/40',
      input: 'text-rose-300',
      suffix: 'text-rose-400',
      slider: 'accent-rose-500',
    },
    slate: {
      card: 'border-slate-750',
      label: 'text-slate-300',
      box: 'bg-slate-800 border-slate-700 focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500/40',
      input: 'text-slate-200',
      suffix: 'text-slate-400',
      slider: 'accent-slate-400',
    },
  }[colorTheme];

  return (
    <div className={`bg-slate-850/60 p-2.5 rounded-xl border ${themeStyles.card} space-y-1.5`}>
      <div className="flex justify-between items-center text-slate-300 font-medium">
        <span className={`${themeStyles.label} flex items-center gap-1 text-xs font-semibold`}>
          <span>{label}</span>
          <InfoTooltip title={tooltipTitle} content={tooltipContent} />
        </span>
        <div className={`flex items-center px-2 py-0.5 rounded border transition-all ${themeStyles.box}`}>
          <input
            type="number"
            step={inputStep}
            value={textVal}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            className={`w-14 bg-transparent text-right font-mono font-bold text-xs ${themeStyles.input} focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            title="Click to type a custom percentage value directly"
          />
          <span className={`font-mono font-bold text-xs ml-0.5 ${themeStyles.suffix}`}>%</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          setTextVal((val * 100).toFixed(precision));
          onChange(val);
        }}
        className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer ${themeStyles.slider}`}
      />
      {ticks && (
        <div className="flex justify-between text-[9.5px] text-slate-500 font-mono">
          <span>{ticks[0]}</span>
          <span>{ticks[1]}</span>
          <span>{ticks[2]}</span>
        </div>
      )}
    </div>
  );
});

interface CurrencyDriftControlProps {
  yearlyDrift: number;
  spotEurPerUsd: number;
  onChange: (drift: number) => void;
}

const CurrencyDriftControl: React.FC<CurrencyDriftControlProps> = memo(({
  yearlyDrift,
  spotEurPerUsd,
  onChange,
}) => {
  const [mode, setMode] = useState<'target' | 'drift'>('target');
  const [isExpanded, setIsExpanded] = useState<boolean>(false); // Collapsible by default
  const spotUsdPerEur = spotEurPerUsd > 0 ? 1 / spotEurPerUsd : 1.1111;
  const currentTarget5Y = yearlyDriftToTargetFx(yearlyDrift, spotEurPerUsd, 5);

  const [textVal, setTextVal] = useState<string>(
    mode === 'target' ? currentTarget5Y.toFixed(2) : (yearlyDrift * 100).toFixed(1)
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setTextVal(
        mode === 'target'
          ? currentTarget5Y.toFixed(2)
          : (yearlyDrift * 100).toFixed(1)
      );
    }
  }, [currentTarget5Y, yearlyDrift, mode, isFocused]);

  const milestones = getFxMilestones(yearlyDrift, spotEurPerUsd);

  const handleTargetSliderChange = (targetVal: number) => {
    const computedDrift = targetFxToYearlyDrift(targetVal, spotEurPerUsd, 5);
    onChange(computedDrift);
  };

  const handleDriftSliderChange = (driftVal: number) => {
    onChange(driftVal);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextVal(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      if (mode === 'target') {
        if (parsed > 0) {
          onChange(targetFxToYearlyDrift(parsed, spotEurPerUsd, 5));
        }
      } else {
        onChange(parsed / 100);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(textVal);
    if (isNaN(parsed)) {
      setTextVal(
        mode === 'target'
          ? currentTarget5Y.toFixed(2)
          : (yearlyDrift * 100).toFixed(1)
      );
    } else {
      setTextVal(parsed.toFixed(mode === 'target' ? 2 : 1));
    }
  };

  const quickPills = [
    { label: 'Parity ($1.00)', target: 1.00 },
    { label: `Today ($${spotUsdPerEur.toFixed(2)})`, target: spotUsdPerEur },
    { label: 'Fair ($1.18)', target: 1.18 },
    { label: 'Weak $ ($1.25)', target: 1.25 },
  ];

  return (
    <div className="bg-slate-850/80 rounded-xl border border-slate-750 overflow-hidden transition-all">
      {/* Collapsible Sub-header Button */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-brand-400" />
          <span className="text-slate-200 text-xs font-bold tracking-tight">EUR/USD Drift</span>
          <InfoTooltip
            title="EUR/USD Currency Drift & 5-Year Target"
            content="Controls the projected exchange rate between EUR and USD applied to your USD Google stock & USD cash."
          />
        </div>

        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-[10px] text-slate-400">
            ({yearlyDrift > 0 ? '+' : ''}{(yearlyDrift * 100).toFixed(1)}%/yr)
          </span>
          <span className="px-1.5 py-0.5 rounded bg-brand-950/60 text-brand-300 border border-brand-500/40 font-bold">
            ${currentTarget5Y.toFixed(2)}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          )}
        </div>
      </button>

      {/* Expanded Widget Body */}
      {isExpanded && (
        <div className="p-3 pt-1 border-t border-slate-800 space-y-2.5 text-xs">
          {/* Mode Switcher & Direct Input */}
          <div className="flex justify-between items-center">
            <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setMode('target')}
                className={`px-2 py-0.5 rounded transition-all ${
                  mode === 'target'
                    ? 'bg-brand-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Set terminal 5-year target exchange rate"
              >
                5Y Rate
              </button>
              <button
                type="button"
                onClick={() => setMode('drift')}
                className={`px-2 py-0.5 rounded transition-all ${
                  mode === 'drift'
                    ? 'bg-brand-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Set annual percentage drift rate"
              >
                % p.a.
              </button>
            </div>

            <div className="flex items-center px-2 py-0.5 rounded border border-slate-700 bg-slate-800 focus-within:border-brand-500">
              {mode === 'target' && (
                <span className="font-mono font-bold text-xs text-slate-400 mr-1">$</span>
              )}
              <input
                type="number"
                step={mode === 'target' ? 0.01 : 0.1}
                value={textVal}
                onChange={handleTextChange}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                className="w-14 bg-transparent text-right font-mono font-bold text-xs text-slate-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {mode === 'drift' && (
                <span className="font-mono font-bold text-xs text-slate-400 ml-1">%</span>
              )}
            </div>
          </div>

          {/* Quick Scenario Pills */}
          <div className="grid grid-cols-4 gap-1">
            {quickPills.map((pill) => {
              const isSelected = Math.abs(currentTarget5Y - pill.target) < 0.01;
              return (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => handleTargetSliderChange(pill.target)}
                  className={`text-[9.5px] py-1 px-0.5 rounded border text-center font-medium transition-all ${
                    isSelected
                      ? 'bg-brand-900/60 border-brand-500 text-brand-200 font-bold'
                      : 'bg-slate-800/80 border-slate-700/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Slider */}
          {mode === 'target' ? (
            <div className="space-y-1">
              <input
                type="range"
                min={0.95}
                max={1.30}
                step={0.01}
                value={currentTarget5Y}
                onChange={(e) => handleTargetSliderChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
              <div className="flex justify-between text-[9.5px] text-slate-500 font-mono">
                <span>$0.95 (Strong $)</span>
                <span>${spotUsdPerEur.toFixed(2)} (Spot)</span>
                <span>$1.30 (Weak $)</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <input
                type="range"
                min={-0.05}
                max={0.05}
                step={0.005}
                value={yearlyDrift}
                onChange={(e) => handleDriftSliderChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
              />
              <div className="flex justify-between text-[9.5px] text-slate-500 font-mono">
                <span>-5% (USD Weaker)</span>
                <span>0%</span>
                <span>+5% (USD Stronger)</span>
              </div>
            </div>
          )}

          {/* Trajectory Milestone Strip */}
          <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-slate-400 font-semibold uppercase">Implied Annual Drift:</span>
              <span
                className={`font-mono font-bold ${
                  Math.abs(yearlyDrift) < 0.001
                    ? 'text-slate-300'
                    : yearlyDrift < 0
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}
              >
                {yearlyDrift > 0 ? '+' : ''}
                {(yearlyDrift * 100).toFixed(1)}% p.a.{' '}
                <span className="font-normal text-slate-400">
                  ({yearlyDrift < -0.001 ? 'USD weakens' : yearlyDrift > 0.001 ? 'USD strengthens' : 'flat'})
                </span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
              <div className="bg-slate-800/70 p-1 rounded border border-slate-750">
                <span className="text-slate-400 block text-[9px]">Today</span>
                <span className="font-bold text-slate-200">${milestones.now.toFixed(2)}</span>
              </div>
              <div className="bg-amber-950/30 p-1 rounded border border-amber-500/30">
                <span className="text-amber-400 block text-[9px]">Month 24</span>
                <span className="font-bold text-amber-300">${milestones.year2.toFixed(2)}</span>
              </div>
              <div className="bg-slate-800/70 p-1 rounded border border-slate-750">
                <span className="text-slate-400 block text-[9px]">Year 5</span>
                <span className="font-bold text-slate-200">${milestones.year5.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export const Sidebar: React.FC<SidebarProps> = memo(({ config, onChange }) => {
  const [, startTransition] = useTransition();

  // Collapsible cards state (open by default)
  const [isPropertyCardOpen, setIsPropertyCardOpen] = useState<boolean>(true);
  const [isMortgageCardOpen, setIsMortgageCardOpen] = useState<boolean>(true);
  const [isMacroCardOpen, setIsMacroCardOpen] = useState<boolean>(true);

  // Local state for immediate input feedback
  const [stockRate, setStockRate] = useState(config.equity_engine.stock_yearly_growth_rate);
  const [propRate, setPropRate] = useState(config.property.yearly_growth_rate);
  const [invRate, setInvRate] = useState(config.liquid_assets.investments_yearly_growth_rate);
  const [mortgageRate, setMortgageRate] = useState(config.mortgage.mortgage_interest_rate);
  const [fixedRateYears, setFixedRateYears] = useState(config.mortgage.fixed_rate_years ?? 2);
  const [rateShockPct, setRateShockPct] = useState(config.mortgage.variable_rate_shock_pct ?? 1.5);
  const [termYears, setTermYears] = useState(config.mortgage.mortgage_term_years ?? 25);
  const [maintRate, setMaintRate] = useState(config.mortgage.yearly_maintenance_rate ?? 0.01);
  const [rentRate, setRentRate] = useState(config.macro.rent_yearly_growth_rate || 0);
  const [driftRate, setDriftRate] = useState(config.macro.eur_usd_yearly_drift || 0);

  // Sync local state when external config changes
  useEffect(() => {
    setStockRate(config.equity_engine.stock_yearly_growth_rate);
  }, [config.equity_engine.stock_yearly_growth_rate]);

  useEffect(() => {
    setPropRate(config.property.yearly_growth_rate);
  }, [config.property.yearly_growth_rate]);

  useEffect(() => {
    setInvRate(config.liquid_assets.investments_yearly_growth_rate);
  }, [config.liquid_assets.investments_yearly_growth_rate]);

  useEffect(() => {
    setMortgageRate(config.mortgage.mortgage_interest_rate);
  }, [config.mortgage.mortgage_interest_rate]);

  useEffect(() => {
    setFixedRateYears(config.mortgage.fixed_rate_years ?? 2);
  }, [config.mortgage.fixed_rate_years]);

  useEffect(() => {
    setRateShockPct(config.mortgage.variable_rate_shock_pct ?? 1.5);
  }, [config.mortgage.variable_rate_shock_pct]);

  useEffect(() => {
    setTermYears(config.mortgage.mortgage_term_years ?? 25);
  }, [config.mortgage.mortgage_term_years]);

  useEffect(() => {
    setMaintRate(config.mortgage.yearly_maintenance_rate ?? 0.01);
  }, [config.mortgage.yearly_maintenance_rate]);

  useEffect(() => {
    setRentRate(config.macro.rent_yearly_growth_rate || 0);
  }, [config.macro.rent_yearly_growth_rate]);

  useEffect(() => {
    setDriftRate(config.macro.eur_usd_yearly_drift || 0);
  }, [config.macro.eur_usd_yearly_drift]);

  // Derived financial figures for Card A (Property & Acquisition)
  const targetPrice = config.property.target_price_eur || 0;
  const depositPct = config.property.minimum_deposit_pct !== undefined
    ? config.property.minimum_deposit_pct
    : targetPrice > 0
    ? (config.property.deposit_eur || 0) / targetPrice
    : 0.10;
  const depositSum = config.property.deposit_eur !== undefined
    ? config.property.deposit_eur
    : Math.round(targetPrice * depositPct);
  const legalFees = config.property.legal_and_closing_fees_eur ?? 3000;
  const stampDuty = useMemo(
    () => calculateStampDuty(targetPrice, config.property.stamp_duty_tiers),
    [targetPrice, config.property.stamp_duty_tiers]
  );
  const totalUpfrontRequired = depositSum + stampDuty + legalFees;

  // CBI 4.0x vs explicit AIP calculation
  const totalSalary = useMemo(() => getTotalGrossSalary(config.mortgage), [config.mortgage]);
  const cbiCalculatedLoan = totalSalary * (config.mortgage.cbi_max_lti_multiple || 4.0);
  const hasCustomAip =
    config.mortgage.approval_in_principle_amount_eur !== undefined &&
    config.mortgage.approval_in_principle_amount_eur !== null &&
    config.mortgage.approval_in_principle_amount_eur > 0;

  // Deposit Strategy Mode tracking ('ftb10' | 'std20' | 'max_loan' | 'max_usable' | 'custom_pct' | 'custom_sum')
  const [depositMode, setDepositMode] = useState<'ftb10' | 'std20' | 'max_loan' | 'max_usable' | 'custom_pct' | 'custom_sum'>(() => {
    const pct = config.property.minimum_deposit_pct ?? 0.10;
    if (Math.abs(pct - 0.10) < 0.005) return 'ftb10';
    if (Math.abs(pct - 0.20) < 0.005) return 'std20';
    return 'custom_pct';
  });

  // Effective Max Loan based on custom AIP override or CBI 4.0x income limit
  const effectiveMaxLoan = useMemo(() => {
    if (hasCustomAip && config.mortgage.approval_in_principle_amount_eur) {
      return config.mortgage.approval_in_principle_amount_eur;
    }
    return cbiCalculatedLoan;
  }, [hasCustomAip, config.mortgage.approval_in_principle_amount_eur, cbiCalculatedLoan]);

  // Max Loan Deposit calculation (Price minus Max Bank Loan, clamped to minimum 10% FTB)
  const maxLoanDeposit = useMemo(() => {
    const minFtbDeposit = Math.round(targetPrice * 0.10);
    const shortfallDeposit = Math.max(0, targetPrice - effectiveMaxLoan);
    return Math.max(minFtbDeposit, shortfallDeposit);
  }, [targetPrice, effectiveMaxLoan]);

  // Usable liquid cash calculation for "Max Usable" quick-pill
  const totalLiquidCashAndInvestments = useMemo(() => {
    const spot = config.macro.eur_usd_spot || 0.92;
    const sharePrice = config.equity_engine.current_share_price_usd || 200;
    const vestedShares = config.equity_engine.initial_vested_shares_held || 0;
    return (
      (config.liquid_assets.cash_eur || 0) +
      (config.liquid_assets.cash_usd || 0) * spot +
      (config.liquid_assets.investments_eur || 0) +
      (config.liquid_assets.investments_usd || 0) * spot +
      vestedShares * sharePrice * spot
    );
  }, [config.liquid_assets, config.equity_engine, config.macro.eur_usd_spot]);

  const safetyBufferTotal = useMemo(() => {
    const spot = config.macro.eur_usd_spot || 0.92;
    return (
      (config.liquid_assets.cash_safety_buffer_eur || 0) +
      (config.liquid_assets.cash_safety_buffer_usd || 0) * spot
    );
  }, [config.liquid_assets, config.macro.eur_usd_spot]);

  const maxUsableDeposit = useMemo(() => {
    const availableForDeposit = Math.max(0, totalLiquidCashAndInvestments - safetyBufferTotal - stampDuty - legalFees);
    return Math.min(targetPrice, Math.round(availableForDeposit));
  }, [totalLiquidCashAndInvestments, safetyBufferTotal, stampDuty, legalFees, targetPrice]);

  // Handlers for Property & Deposit changes
  const handlePropertyPriceChange = useCallback((price: number) => {
    const clampedPrice = Math.max(0, price);
    let newDepEur = depositSum;
    let newDepPct = depositPct;

    if (depositMode === 'max_loan') {
      const minFtb = Math.round(clampedPrice * 0.10);
      newDepEur = Math.max(minFtb, clampedPrice - effectiveMaxLoan);
      newDepPct = clampedPrice > 0 ? newDepEur / clampedPrice : 0.10;
    } else if (depositMode === 'custom_sum') {
      const minFtb = Math.round(clampedPrice * 0.10);
      newDepEur = Math.min(clampedPrice, Math.max(minFtb, depositSum));
      newDepPct = clampedPrice > 0 ? newDepEur / clampedPrice : 0.10;
    } else if (depositMode === 'max_usable') {
      const minFtb = Math.round(clampedPrice * 0.10);
      const newStamp = calculateStampDuty(clampedPrice, config.property.stamp_duty_tiers);
      const newMaxUsable = Math.max(0, totalLiquidCashAndInvestments - safetyBufferTotal - newStamp - legalFees);
      newDepEur = Math.min(clampedPrice, Math.max(minFtb, Math.round(newMaxUsable)));
      newDepPct = clampedPrice > 0 ? newDepEur / clampedPrice : 0.10;
    } else if (depositMode === 'std20') {
      newDepPct = 0.20;
      newDepEur = Math.round(clampedPrice * 0.20);
    } else {
      // 'ftb10' or 'custom_pct'
      newDepPct = depositMode === 'ftb10' ? 0.10 : depositPct;
      newDepEur = Math.round(clampedPrice * newDepPct);
    }

    startTransition(() => {
      onChange({
        ...config,
        property: {
          ...config.property,
          target_price_eur: clampedPrice,
          deposit_eur: newDepEur,
          minimum_deposit_pct: newDepPct,
        },
      });
    });
  }, [
    config,
    depositMode,
    depositSum,
    depositPct,
    effectiveMaxLoan,
    totalLiquidCashAndInvestments,
    safetyBufferTotal,
    legalFees,
    onChange,
  ]);

  const handleDepositPctChange = useCallback((pct: number) => {
    const clampedPct = Math.max(0.0, Math.min(1.0, pct));
    const depEur = Math.round(targetPrice * clampedPct);
    startTransition(() => {
      onChange({
        ...config,
        property: {
          ...config.property,
          minimum_deposit_pct: clampedPct,
          deposit_eur: depEur,
        },
      });
    });
  }, [config, targetPrice, onChange]);

  const handleDepositSumChange = useCallback((depEur: number) => {
    const clampedEur = Math.max(0, depEur);
    const pct = targetPrice > 0 ? clampedEur / targetPrice : 0.10;
    startTransition(() => {
      onChange({
        ...config,
        property: {
          ...config.property,
          deposit_eur: clampedEur,
          minimum_deposit_pct: pct,
        },
      });
    });
  }, [config, targetPrice, onChange]);

  const handleLegalFeesChange = useCallback((fees: number) => {
    startTransition(() => {
      onChange({
        ...config,
        property: {
          ...config.property,
          legal_and_closing_fees_eur: Math.max(0, fees),
        },
      });
    });
  }, [config, onChange]);

  const handleAipChange = useCallback((val: number | null) => {
    startTransition(() => {
      onChange({
        ...config,
        mortgage: {
          ...config.mortgage,
          approval_in_principle_amount_eur: val !== null && val > 0 ? val : null,
        },
      });
    });
  }, [config, onChange]);

  // Handlers for Mortgage parameters
  const handleMortgageChange = useCallback((val: number) => {
    setMortgageRate(val);
    startTransition(() => {
      onChange({
        ...config,
        mortgage: { ...config.mortgage, mortgage_interest_rate: val },
      });
    });
  }, [config, onChange]);

  const handleTermYearsChange = useCallback((yrs: number) => {
    const clamped = Math.min(40, Math.max(5, yrs));
    setTermYears(clamped);
    startTransition(() => {
      onChange({
        ...config,
        mortgage: { ...config.mortgage, mortgage_term_years: clamped },
      });
    });
  }, [config, onChange]);

  const handleFixedRateYearsChange = useCallback((val: number) => {
    const clamped = Math.min(10, Math.max(0, val));
    setFixedRateYears(clamped);
    startTransition(() => {
      onChange({
        ...config,
        mortgage: { ...config.mortgage, fixed_rate_years: clamped },
      });
    });
  }, [config, onChange]);

  const handleRateShockChange = useCallback((val: number) => {
    const clamped = Math.min(5, Math.max(-1, val));
    setRateShockPct(clamped);
    startTransition(() => {
      onChange({
        ...config,
        mortgage: { ...config.mortgage, variable_rate_shock_pct: clamped },
      });
    });
  }, [config, onChange]);

  const handleMaintRateChange = useCallback((rate: number) => {
    const clamped = Math.max(0, Math.min(0.05, rate));
    setMaintRate(clamped);
    startTransition(() => {
      onChange({
        ...config,
        mortgage: { ...config.mortgage, yearly_maintenance_rate: clamped },
      });
    });
  }, [config, onChange]);

  // Handlers for Macro sliders
  const handleStockChange = useCallback((val: number) => {
    setStockRate(val);
    startTransition(() => {
      onChange({
        ...config,
        equity_engine: { ...config.equity_engine, stock_yearly_growth_rate: val },
      });
    });
  }, [config, onChange]);

  const handlePropChange = useCallback((val: number) => {
    setPropRate(val);
    startTransition(() => {
      onChange({
        ...config,
        property: { ...config.property, yearly_growth_rate: val },
      });
    });
  }, [config, onChange]);

  const handleInvChange = useCallback((val: number) => {
    setInvRate(val);
    startTransition(() => {
      onChange({
        ...config,
        liquid_assets: { ...config.liquid_assets, investments_yearly_growth_rate: val },
      });
    });
  }, [config, onChange]);

  const handleRentChange = useCallback((val: number) => {
    setRentRate(val);
    startTransition(() => {
      onChange({
        ...config,
        macro: { ...config.macro, rent_yearly_growth_rate: val },
      });
    });
  }, [config, onChange]);

  const handleDriftChange = useCallback((val: number) => {
    setDriftRate(val);
    startTransition(() => {
      onChange({
        ...config,
        macro: { ...config.macro, eur_usd_yearly_drift: val },
      });
    });
  }, [config, onChange]);

  return (
    <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 lg:sticky lg:top-20 lg:self-start z-20">
      {/* Scrollable Container with Custom Scrollbar */}
      <div className="max-h-[calc(100vh-5.5rem)] overflow-y-auto custom-scrollbar space-y-3 pr-1 pb-4">
        
        {/* CARD A: 🏡 Target Property & Acquisition */}
        <div className="bg-slate-900 border-2 border-brand-500/40 rounded-2xl shadow-xl overflow-hidden transition-all">
          {/* Card Header (Collapsible Toggle) */}
          <button
            type="button"
            onClick={() => setIsPropertyCardOpen((prev) => !prev)}
            className="w-full p-3 bg-slate-850 flex items-center justify-between border-b border-slate-800 text-left hover:bg-slate-800/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
                <Home className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Target Property & Deposit
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-brand-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                €{(targetPrice / 1000000).toFixed(2)}M
              </span>
              {isPropertyCardOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {isPropertyCardOpen && (
            <div className="p-3.5 space-y-3 text-xs">
              {/* 1. Target Property Price */}
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium text-xs flex items-center gap-1 font-semibold">
                  <span>Target Property Price</span>
                  <InfoTooltip
                    title="Target Property Price"
                    content="The purchase price of the target Irish property. Scales required deposit %, stamp duty, and mortgage loan."
                  />
                </span>
                <div className="flex items-center bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 focus-within:border-brand-500 w-36">
                  <span className="text-slate-400 font-mono text-xs mr-1">€</span>
                  <input
                    type="number"
                    step="25000"
                    min="100000"
                    value={targetPrice}
                    onChange={(e) => handlePropertyPriceChange(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-white font-mono font-bold text-xs text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 2. Deposit Strategy (% and € Dual Synchronized Inputs) */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-slate-300 font-medium">
                  <span className="flex items-center gap-1 text-slate-200 font-semibold">
                    <Coins className="w-3.5 h-3.5 text-brand-400" />
                    <span>Deposit Strategy</span>
                    <InfoTooltip
                      title="Deposit Strategy"
                      content="First-Time Buyers (FTBs) in Ireland require a minimum 10% statutory deposit. Standard Green mortgages benchmark at 20% (80% LTV)."
                    />
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">Deposit %</label>
                    <div className="flex items-center bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 focus-within:border-brand-500">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={Math.round(depositPct * 100)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            setDepositMode('custom_pct');
                            handleDepositPctChange(val / 100);
                          }
                        }}
                        className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-slate-400 text-xs font-bold font-mono ml-1">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block text-[10px] mb-1">Deposit Sum (€)</label>
                    <div className="flex items-center bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 focus-within:border-brand-500">
                      <span className="text-slate-400 text-xs font-bold mr-1">€</span>
                      <input
                        type="number"
                        step="5000"
                        min="0"
                        value={depositSum}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            setDepositMode('custom_sum');
                            handleDepositSumChange(val);
                          }
                        }}
                        className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 4 Quick Deposit Strategy Preset Pills */}
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDepositMode('ftb10');
                      handleDepositPctChange(0.10);
                    }}
                    className={`text-[9.5px] py-1 px-0.5 rounded border text-center font-bold transition-all ${
                      depositMode === 'ftb10' || (depositMode !== 'custom_sum' && Math.abs(depositPct - 0.10) < 0.005)
                        ? 'bg-brand-900/60 border-brand-500 text-brand-200'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                    title="Central Bank of Ireland FTB Minimum 10% Deposit"
                  >
                    10% FTB
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDepositMode('std20');
                      handleDepositPctChange(0.20);
                    }}
                    className={`text-[9.5px] py-1 px-0.5 rounded border text-center font-bold transition-all ${
                      depositMode === 'std20' || (depositMode !== 'custom_sum' && Math.abs(depositPct - 0.20) < 0.005)
                        ? 'bg-brand-900/60 border-brand-500 text-brand-200'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                    title="Standard 20% Deposit (80% LTV Green Mortgage Rate)"
                  >
                    20% Std
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDepositMode('max_loan');
                      handleDepositSumChange(maxLoanDeposit);
                    }}
                    className={`text-[9.5px] py-1 px-0.5 rounded border text-center font-bold transition-all truncate ${
                      depositMode === 'max_loan' || Math.abs(depositSum - maxLoanDeposit) < 50
                        ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                    title={`Max Bank Loan (€${Math.round(effectiveMaxLoan / 1000)}k): Puts down minimum deposit needed (€${maxLoanDeposit.toLocaleString()}) to borrow at your maximum mortgage capacity.`}
                  >
                    ⚡ Max Loan
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDepositMode('max_usable');
                      handleDepositSumChange(maxUsableDeposit);
                    }}
                    className={`text-[9.5px] py-1 px-0.5 rounded border text-center font-bold transition-all truncate ${
                      depositMode === 'max_usable' || Math.abs(depositSum - maxUsableDeposit) < 50
                        ? 'bg-sky-900/60 border-sky-500 text-sky-200'
                        : 'bg-sky-950/40 border-sky-500/30 text-sky-300 hover:bg-sky-900/50'
                    }`}
                    title={`Max Usable Deposit from liquid funds (leaving safety buffer): €${maxUsableDeposit.toLocaleString()}`}
                  >
                    ⚡ Max Usable
                  </button>
                </div>
              </div>

              {/* 3. Approval in Principle (AIP) Explicit Loan Cap */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium text-xs flex items-center gap-1 font-semibold">
                    <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                    <span>AIP Borrowing Cap</span>
                    <InfoTooltip
                      title="Approval in Principle (AIP) Limit"
                      content={
                        <div className="space-y-1 text-xs">
                          <p>Central Bank of Ireland limit: 4.0x Total Gross Salary (€{totalSalary.toLocaleString()}) = <strong>€{cbiCalculatedLoan.toLocaleString()}</strong>.</p>
                          <p>If your bank gave an explicit AIP letter or exemption, enter the cap here.</p>
                        </div>
                      }
                    />
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAipChange(null)}
                    className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold border transition-colors ${
                      !hasCustomAip
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                    title="Reset to automated CBI 4.0x loan"
                  >
                    ⚡ CBI: €{Math.round(cbiCalculatedLoan / 1000)}k
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="10000"
                    placeholder={`Auto CBI 4.0x: €${cbiCalculatedLoan.toLocaleString()}`}
                    value={config.mortgage.approval_in_principle_amount_eur ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null;
                      handleAipChange(val);
                    }}
                    className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-emerald-300 font-bold placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* 4. Legal Fees & Property Maintenance */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-slate-400 flex items-center gap-1 text-[10px] mb-1 font-medium">
                    <span>Legal Fees (€)</span>
                    <InfoTooltip
                      title="Legal & Conveyancing Fees"
                      content="Solicitor conveyancing fees, property survey, land registry, and commissioner for oaths (standard benchmark: €3,000)."
                    />
                  </label>
                  <div className="flex items-center bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 focus-within:border-brand-500">
                    <span className="text-slate-400 font-mono text-xs mr-1">€</span>
                    <input
                      type="number"
                      step="500"
                      min="0"
                      value={legalFees}
                      onChange={(e) => handleLegalFeesChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 flex items-center gap-1 text-[10px] mb-1 font-medium">
                    <span>Maint (%/yr)</span>
                    <InfoTooltip
                      title="Property Maintenance & Sinking Fund"
                      content="Estimated annual upkeep, insurance, and sinking fund reserve as a percentage of property value (industry standard: 1.0%/yr of property price)."
                    />
                  </label>
                  <div className="flex items-center bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 focus-within:border-brand-500">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={(maintRate * 100).toFixed(1)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          handleMaintRateChange(val / 100);
                        }
                      }}
                      className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-slate-400 text-xs font-bold font-mono ml-1">%</span>
                  </div>
                </div>
              </div>

              {/* 5. Live Cash to Close Pill with Rich Hover Breakdown */}
              <div className="pt-2 border-t border-slate-800">
                <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs transition-all hover:border-brand-500/40">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-bold text-[11px]">⚡ Cash to Close:</span>
                    <span className="text-emerald-300 font-mono font-extrabold text-xs">
                      €{totalUpfrontRequired.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <InfoTooltip
                      title="Total Cash to Close Breakdown"
                      content={
                        <div className="space-y-1.5 text-xs font-sans">
                          <div className="flex justify-between gap-4 text-slate-300">
                            <span>Deposit ({Math.round(depositPct * 100)}%):</span>
                            <strong className="font-mono text-white">€{depositSum.toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-300">
                            <span>Stamp Duty (1% / 2% excess):</span>
                            <strong className="font-mono text-amber-300">€{stampDuty.toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between gap-4 text-slate-300">
                            <span>Legal & Closing Fees:</span>
                            <strong className="font-mono text-slate-200">€{legalFees.toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 text-white font-bold">
                            <span className="text-emerald-400">Total Wire on Closing:</span>
                            <span className="font-mono text-emerald-300">€{totalUpfrontRequired.toLocaleString()}</span>
                          </div>
                        </div>
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CARD B: 🏦 Mortgage Loan Setup */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-xl overflow-hidden transition-all">
          {/* Card Header (Collapsible Toggle) */}
          <button
            type="button"
            onClick={() => setIsMortgageCardOpen((prev) => !prev)}
            className="w-full p-3 bg-slate-850 flex items-center justify-between border-b border-slate-800 text-left hover:bg-slate-800/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Landmark className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Mortgage Loan Setup
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {(mortgageRate * 100).toFixed(2)}% • {termYears}y
              </span>
              {isMortgageCardOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {isMortgageCardOpen && (
            <div className="p-3.5 space-y-3 text-xs">
              {/* 1. Mortgage Term on TOP (clean input) */}
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium text-xs flex items-center gap-1 font-semibold">
                  <span>Mortgage Term</span>
                  <InfoTooltip
                    title="Mortgage Term"
                    content="Standard mortgage repayment duration in Ireland (typically 25 to 30 years for primary residences)."
                  />
                </span>
                <div className="flex items-center bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 focus-within:border-emerald-500 w-24">
                  <input
                    type="number"
                    min="5"
                    max="40"
                    value={termYears}
                    onChange={(e) => handleTermYearsChange(parseInt(e.target.value, 10) || 25)}
                    className="w-full bg-transparent text-white font-mono font-bold text-xs text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-slate-400 text-xs font-mono ml-1">yrs</span>
                </div>
              </div>

              {/* 2. Compact Mortgage Rate (No slider, no quick buttons, direct input + AIB benchmark hints) */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-slate-300 font-medium text-xs flex items-center gap-1 font-semibold">
                  <span>Mortgage Interest Rate</span>
                  <InfoTooltip
                    title="Irish Mortgage Rate Benchmarks (2026)"
                    content={
                      <div className="space-y-2 text-xs">
                        <p>Current representative Irish lender rates (AIB, BOI, PTSB):</p>
                        <div className="p-2 rounded bg-slate-950 border border-slate-800 space-y-1 font-mono text-[11px]">
                          <div className="flex justify-between text-emerald-300">
                            <span>🌿 AIB Green Fixed (≤80% LTV, BER A):</span>
                            <strong>3.45% - 3.55%</strong>
                          </div>
                          <div className="flex justify-between text-slate-300">
                            <span>🏠 Standard Fixed (≤80% LTV, BER B-G):</span>
                            <strong>3.75% - 4.15%</strong>
                          </div>
                          <div className="flex justify-between text-amber-300">
                            <span>📊 High LTV Fixed (&gt;80% to 90% LTV):</span>
                            <strong>4.15% - 4.45%</strong>
                          </div>
                          <div className="flex justify-between text-rose-300">
                            <span>🔄 Standard Variable Rate (SVR):</span>
                            <strong>4.15% - 4.75%</strong>
                          </div>
                        </div>
                        <p className="text-slate-400 text-[10.5px]">
                          Type your quoted mortgage rate directly.
                        </p>
                      </div>
                    }
                  />
                </span>
                <div className="flex items-center bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 focus-within:border-emerald-500 w-24">
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    max="15"
                    value={(mortgageRate * 100).toFixed(2)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) {
                        handleMortgageChange(val / 100);
                      }
                    }}
                    className="w-full bg-transparent text-emerald-300 font-mono font-bold text-xs text-right focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-slate-400 text-xs font-mono ml-1">%</span>
                </div>
              </div>

              {/* 3. Irish Structure: Fixed Lockout & Rate Shock with Hints */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-400 flex items-center gap-0.5 text-[9.5px] mb-1 font-medium">
                      <span>Fixed Lock</span>
                      <InfoTooltip
                        title="Fixed Rate Lock Period"
                        content="Duration of the initial fixed-interest period (e.g. 2, 3, or 5 years) during which your interest rate and monthly repayment are strictly locked."
                      />
                    </label>
                    <div className="flex items-center bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 focus-within:border-slate-500">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={fixedRateYears}
                        onChange={(e) => handleFixedRateYearsChange(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-transparent text-white font-mono text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-slate-500 text-[10px] ml-1">yrs</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 flex items-center gap-0.5 text-[9.5px] mb-1 font-medium">
                      <span>Rate Shock</span>
                      <InfoTooltip
                        title="Variable Rate Shock Stress Buffer"
                        content="The projected interest rate increase after the fixed lock period expires and transitions to the lender's Standard Variable Rate (central bank stress benchmark: +1.50%)."
                      />
                    </label>
                    <div className="flex items-center bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 focus-within:border-amber-500">
                      <input
                        type="number"
                        step="0.25"
                        min="-1"
                        max="5"
                        value={rateShockPct}
                        onChange={(e) => handleRateShockChange(parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent text-amber-300 font-mono text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-slate-500 text-[10px] ml-1">%</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10.5px] text-slate-400 flex justify-between items-center font-mono pt-1 border-t border-slate-800/60">
                  <span className="text-slate-500">Post-lock rate:</span>
                  <span className="text-emerald-400 font-bold">{(mortgageRate * 100 + rateShockPct).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CARD C: 📈 Market & Macro Drivers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all">
          {/* Card Header (Collapsible Toggle) */}
          <button
            type="button"
            onClick={() => setIsMacroCardOpen((prev) => !prev)}
            className="w-full p-3 bg-slate-850 flex items-center justify-between border-b border-slate-800 text-left hover:bg-slate-800/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Market & Macro Drivers
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Live
              </span>
              {isMacroCardOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {isMacroCardOpen && (
            <div className="p-3.5 space-y-3 text-xs">
              {/* 1. Google Stock Growth */}
              <SliderControl
                label="Google Stock Growth (p.a.)"
                tooltipTitle="Alphabet Stock Growth"
                tooltipContent="Annual nominal growth rate of Alphabet Inc. equity (GOOGL)."
                value={stockRate}
                min={-0.10}
                max={0.30}
                step={0.005}
                inputStep={0.1}
                precision={1}
                colorTheme="purple"
                ticks={['-10%', '+10%', '+30%']}
                onChange={handleStockChange}
              />

              {/* 2. Property Inflation */}
              <SliderControl
                label="Property Inflation (p.a.)"
                tooltipTitle="Ireland Property Inflation"
                tooltipContent="Annual Irish housing price appreciation."
                value={propRate}
                min={0.0}
                max={0.15}
                step={0.005}
                inputStep={0.1}
                precision={1}
                colorTheme="brand"
                ticks={['0%', '+5%', '+15%']}
                onChange={handlePropChange}
              />

              {/* 3. Base Investment Return */}
              <SliderControl
                label="Base Investment Yield (p.a.)"
                tooltipTitle="Trading Account Yield"
                tooltipContent="Annual nominal return on non-GSU personal trading investments (ETFs)."
                value={invRate}
                min={0.0}
                max={0.20}
                step={0.005}
                inputStep={0.1}
                precision={1}
                colorTheme="sky"
                ticks={['0%', '+8%', '+20%']}
                onChange={handleInvChange}
              />

              {/* 4. Rent Inflation (RPZ) */}
              <SliderControl
                label="Rent Inflation (Irish RPZ)"
                tooltipTitle="RPZ Statutory Rent Cap"
                tooltipContent="Irish Rent Pressure Zone (RPZ) statutory cap limits annual rent increases to 2.0% per annum."
                value={rentRate}
                min={0.0}
                max={0.08}
                step={0.005}
                inputStep={0.1}
                precision={1}
                colorTheme="rose"
                ticks={['0%', '2.0% (Cap)', '8.0%']}
                onChange={handleRentChange}
              />

              {/* 5. Rich Collapsible EUR/USD Drift Widget (Collapsed by default) */}
              <CurrencyDriftControl
                yearlyDrift={driftRate}
                spotEurPerUsd={config.macro.eur_usd_spot}
                onChange={handleDriftChange}
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
});
export default Sidebar;
