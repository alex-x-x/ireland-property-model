import React, { useState, useEffect, useTransition, memo, useCallback, useMemo } from 'react';
import {
  Home,
  Landmark,
  TrendingUp,
  ChevronDown,
  ChevronUp,
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
    <div className={`bg-slate-850/80 p-3 rounded-xl border ${themeStyles.card} space-y-1.5`}>
      <div className="flex justify-between items-center text-slate-300 font-medium">
        <span className={`${themeStyles.label} flex items-center gap-1`}>
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
        className={`w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer ${themeStyles.slider}`}
      />
      {ticks && (
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
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
    <div className="bg-slate-850/80 p-3 rounded-xl border border-slate-750 space-y-2.5">
      {/* Header with Mode Toggle and Input */}
      <div className="flex justify-between items-center text-slate-300 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-200 text-xs font-bold tracking-tight">EUR/USD Drift</span>
          <InfoTooltip
            title="EUR/USD Currency Drift & 5-Year Target"
            content={
              <div className="space-y-1.5 text-xs">
                <p>
                  Controls the projected exchange rate between EUR and USD applied to your USD Google stock & USD cash.
                </p>
                <p>
                  Set your expected <strong>5-Year Target EUR/USD rate</strong> (e.g. $1.18 per €1) or switch to <strong>Annual Drift %</strong>.
                </p>
                <div className="p-1.5 rounded bg-slate-950/80 border border-slate-800 space-y-1 text-[10px]">
                  <div className="text-rose-300 font-semibold">
                    Target &gt; Today (e.g. $1.20): USD Weakens
                  </div>
                  <div className="text-slate-400 pl-2">
                    Stock converts to fewer Euros, reducing wait advantage.
                  </div>
                  <div className="text-emerald-300 font-semibold pt-0.5">
                    Target &lt; Today (e.g. $1.00): USD Strengthens
                  </div>
                  <div className="text-slate-400 pl-2">
                    Stock converts to more Euros, boosting deposit power.
                  </div>
                </div>
              </div>
            }
          />
        </div>

        {/* Mode Toggle & Input */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setMode('target')}
              className={`px-1.5 py-0.5 rounded transition-all ${
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
              className={`px-1.5 py-0.5 rounded transition-all ${
                mode === 'drift'
                  ? 'bg-brand-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Set annual percentage drift rate"
            >
              % p.a.
            </button>
          </div>

          <div className="flex items-center px-2 py-0.5 rounded border border-slate-700 bg-slate-800 focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500/40">
            {mode === 'target' && (
              <span className="font-mono font-bold text-xs text-slate-400 mr-0.5">$</span>
            )}
            <input
              type="number"
              step={mode === 'target' ? 0.01 : 0.1}
              value={textVal}
              onChange={handleTextChange}
              onFocus={() => setIsFocused(true)}
              onBlur={handleBlur}
              className="w-14 bg-transparent text-right font-mono font-bold text-xs text-slate-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title={mode === 'target' ? '5-Year Target EUR/USD rate' : 'Annual drift %'}
            />
            {mode === 'drift' && (
              <span className="font-mono font-bold text-xs text-slate-400 ml-0.5">%</span>
            )}
          </div>
        </div>
      </div>

      {/* Scenario Quick-Pill Chips */}
      <div className="grid grid-cols-4 gap-1">
        {quickPills.map((pill) => {
          const isSelected = Math.abs(currentTarget5Y - pill.target) < 0.01;
          return (
            <button
              key={pill.label}
              type="button"
              onClick={() => handleTargetSliderChange(pill.target)}
              className={`text-[10px] py-1 px-1 rounded border text-center font-medium transition-all ${
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
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
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
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-5% (USD Weaker)</span>
            <span>0%</span>
            <span>+5% (USD Stronger)</span>
          </div>
        </div>
      )}

      {/* Trajectory Milestone Strip */}
      <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800/80 space-y-1.5 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-[10px] font-semibold uppercase">Implied Annual Drift:</span>
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
            <span className="text-[10px] font-normal text-slate-400">
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
  );
});

export const Sidebar: React.FC<SidebarProps> = memo(({ config, onChange }) => {
  const [, startTransition] = useTransition();

  // Collapsible cards state (open by default)
  const [isPropertyCardOpen, setIsPropertyCardOpen] = useState<boolean>(true);
  const [isMortgageCardOpen, setIsMortgageCardOpen] = useState<boolean>(true);
  const [isMacroCardOpen, setIsMacroCardOpen] = useState<boolean>(true);

  // Local state for immediate slider/input feedback
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

  // Usable liquid cash calculation for "Max Usable" quick-pill
  const maxUsableDeposit = useMemo(() => {
    const spot = config.macro.eur_usd_spot || 0.92;
    const sharePrice = config.equity_engine.current_share_price_usd || 200;
    const vestedShares = config.equity_engine.initial_vested_shares_held || 0;
    const totalLiquid =
      (config.liquid_assets.cash_eur || 0) +
      (config.liquid_assets.cash_usd || 0) * spot +
      (config.liquid_assets.investments_eur || 0) +
      (config.liquid_assets.investments_usd || 0) * spot +
      vestedShares * sharePrice * spot;
    const safetyBuffer =
      (config.liquid_assets.cash_safety_buffer_eur || 0) +
      (config.liquid_assets.cash_safety_buffer_usd || 0) * spot;
    const availableForDeposit = Math.max(0, totalLiquid - safetyBuffer - stampDuty - legalFees);
    return Math.min(targetPrice, Math.round(availableForDeposit));
  }, [config, stampDuty, legalFees, targetPrice]);

  // Handlers for Property & Deposit changes
  const handlePropertyPriceChange = useCallback((price: number) => {
    const clampedPrice = Math.max(0, price);
    const depEur = Math.round(clampedPrice * depositPct);
    startTransition(() => {
      onChange({
        ...config,
        property: {
          ...config.property,
          target_price_eur: clampedPrice,
          deposit_eur: depEur,
          minimum_deposit_pct: depositPct,
        },
      });
    });
  }, [config, depositPct, onChange]);

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

  const propertyPricePresets = [
    { label: '€650k', val: 650000 },
    { label: '€850k', val: 850000 },
    { label: '€1.0M', val: 1000000 },
    { label: '€1.25M', val: 1250000 },
    { label: '€1.5M', val: 1500000 },
  ];

  return (
    <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 lg:sticky lg:top-20 lg:self-start z-20 space-y-4">
      {/* CARD A: 🏡 Target Property & Acquisition */}
      <div className="bg-slate-900 border-2 border-brand-500/40 rounded-2xl shadow-xl overflow-hidden transition-all">
        {/* Card Header (Collapsible Toggle) */}
        <button
          type="button"
          onClick={() => setIsPropertyCardOpen((prev) => !prev)}
          className="w-full p-3.5 bg-slate-850 flex items-center justify-between border-b border-slate-800 text-left hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30 shadow-sm">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Target Property & Deposit
              </h3>
              <p className="text-[10px] text-brand-300 font-medium">Acquisition Scenario Controls</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
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
          <div className="p-4 space-y-3.5 text-xs">
            {/* 1. Target Property Price */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-300 font-medium flex items-center gap-1">
                  <span>Target Property Price (€)</span>
                  <InfoTooltip
                    title="Target Property Price"
                    content="The purchase price of the target Irish property. Changing this dynamically scales the required deposit %, stamp duty, and mortgage loan."
                  />
                </span>
                <span className="text-brand-300 font-mono font-bold text-xs">
                  €{targetPrice.toLocaleString()}
                </span>
              </div>

              <input
                type="number"
                step="25000"
                min="100000"
                value={targetPrice}
                onChange={(e) => handlePropertyPriceChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40"
              />

              {/* Quick Price Preset Buttons */}
              <div className="grid grid-cols-5 gap-1 mt-1.5">
                {propertyPricePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePropertyPriceChange(preset.val)}
                    className={`text-[10px] py-1 px-0.5 rounded border text-center font-mono font-bold transition-all ${
                      targetPrice === preset.val
                        ? 'bg-brand-900/60 border-brand-500 text-brand-200'
                        : 'bg-slate-800/80 border-slate-700/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Deposit Strategy (% and € Dual Synchronized) */}
            <div className="bg-slate-850/80 p-3 rounded-xl border border-slate-750 space-y-2">
              <div className="flex justify-between items-center text-slate-300 font-medium">
                <span className="flex items-center gap-1 text-slate-200">
                  <Coins className="w-3.5 h-3.5 text-brand-400" />
                  <span>Deposit Strategy</span>
                  <InfoTooltip
                    title="Deposit Strategy"
                    content="First-Time Buyers (FTBs) in Ireland require a minimum 10% statutory deposit. You can increase deposit to reduce borrowing, or choose Max Usable to put all available liquid funds (excluding your safety pot)."
                  />
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block text-[10px] mb-1">Deposit %</label>
                  <div className="flex items-center bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-700 focus-within:border-brand-500">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={Math.round(depositPct * 100)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          handleDepositPctChange(val / 100);
                        }
                      }}
                      className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
                    />
                    <span className="text-slate-400 text-xs font-bold font-mono ml-0.5">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block text-[10px] mb-1">Deposit Sum (€)</label>
                  <div className="flex items-center bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-700 focus-within:border-brand-500">
                    <span className="text-slate-400 text-xs font-bold mr-0.5">€</span>
                    <input
                      type="number"
                      step="5000"
                      min="10000"
                      value={depositSum}
                      onChange={(e) => handleDepositSumChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Deposit Preset Pills */}
              <div className="grid grid-cols-3 gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleDepositPctChange(0.10)}
                  className={`text-[10px] py-1 px-1 rounded border text-center font-bold transition-all ${
                    Math.abs(depositPct - 0.10) < 0.005
                      ? 'bg-brand-900/60 border-brand-500 text-brand-200'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title="Central Bank of Ireland FTB Minimum 10%"
                >
                  10% FTB Min
                </button>
                <button
                  type="button"
                  onClick={() => handleDepositPctChange(0.20)}
                  className={`text-[10px] py-1 px-1 rounded border text-center font-bold transition-all ${
                    Math.abs(depositPct - 0.20) < 0.005
                      ? 'bg-brand-900/60 border-brand-500 text-brand-200'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title="Standard 20% Deposit (80% LTV Green Rate)"
                >
                  20% Standard
                </button>
                <button
                  type="button"
                  onClick={() => handleDepositSumChange(maxUsableDeposit)}
                  className="text-[10px] py-1 px-1 rounded border text-center font-bold bg-sky-950/40 border-sky-500/30 text-sky-300 hover:bg-sky-900/50 transition-all truncate"
                  title={`Max Usable Deposit from liquid funds (leaving safety buffer): €${maxUsableDeposit.toLocaleString()}`}
                >
                  ⚡ Max Usable
                </button>
              </div>
            </div>

            {/* 3. Approval in Principle (AIP) Explicit Loan Cap */}
            <div className="bg-slate-850/80 p-3 rounded-xl border border-slate-750 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-200 font-medium flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AIP Borrowing Cap (€)</span>
                  <InfoTooltip
                    title="Approval in Principle (AIP) Limit"
                    content="By default, borrowing capacity is calculated automatically using Central Bank of Ireland rules (4.0x total income). If your bank gave an explicit AIP letter or exemption, enter the cap here."
                  />
                </span>
                {hasCustomAip && (
                  <button
                    type="button"
                    onClick={() => handleAipChange(null)}
                    className="text-[10px] text-brand-400 hover:text-brand-300 underline font-medium"
                    title="Reset to automated CBI 4.0x loan"
                  >
                    Reset to CBI 4.0x
                  </button>
                )}
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
                  className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-emerald-300 font-bold placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span>
                  {hasCustomAip ? (
                    <strong className="text-brand-300">✓ Custom Bank AIP active</strong>
                  ) : (
                    '✓ Using CBI 4.0x income limit'
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => handleAipChange(null)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                    !hasCustomAip
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title={`CBI 4.0x: 4.0 × €${totalSalary.toLocaleString()} = €${cbiCalculatedLoan.toLocaleString()}`}
                >
                  ⚡ CBI 4.0x: €{Math.round(cbiCalculatedLoan / 1000)}k
                </button>
              </div>
            </div>

            {/* 4. Legal & Closing Fees */}
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <span>Legal & Closing Fees (€)</span>
                <InfoTooltip
                  title="Legal & Conveyancing Fees"
                  content="Estimated solicitor fees, land registry, search fees, and structural survey required at purchase (Irish standard: €2,500 – €3,500)."
                />
              </span>
              <div className="flex items-center bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 w-24">
                <span className="text-slate-400 text-xs font-bold mr-0.5">€</span>
                <input
                  type="number"
                  step="500"
                  value={legalFees}
                  onChange={(e) => handleLegalFeesChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent text-white font-mono font-bold text-xs text-right focus:outline-none"
                />
              </div>
            </div>

            {/* 5. Live Acquisition Cash Breakdown Box */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-slate-400">
                <span>Deposit ({Math.round(depositPct * 100)}%):</span>
                <span className="text-white font-mono font-bold">€{depositSum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span className="flex items-center gap-1">
                  <span>Stamp Duty:</span>
                  <span className="text-[9px] text-slate-500">(1% up to €1M, 2% excess)</span>
                </span>
                <span className="text-amber-300 font-mono font-bold">€{stampDuty.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Legal / Surveyor Fees:</span>
                <span className="text-slate-300 font-mono">€{legalFees.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 text-white font-bold">
                <span className="text-emerald-400">⚡ Total Cash to Close:</span>
                <span className="text-emerald-300 font-mono text-xs">€{totalUpfrontRequired.toLocaleString()}</span>
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
          className="w-full p-3.5 bg-slate-850 flex items-center justify-between border-b border-slate-800 text-left hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Mortgage Loan Setup
              </h3>
              <p className="text-[10px] text-emerald-300 font-medium">Interest, Term & Irish Stress Buffer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
          <div className="p-4 space-y-3.5 text-xs">
            {/* 1. Mortgage Interest Rate & Slider */}
            <div className="bg-slate-850/80 p-3 rounded-xl border border-emerald-500/20 space-y-2.5">
              <div className="flex justify-between items-center text-slate-300 font-medium">
                <span className="text-emerald-300 flex items-center gap-1">
                  <span>Mortgage Rate (AIB 2026)</span>
                  <InfoTooltip
                    title="AIB Green Benchmark"
                    content="Fixed Green Mortgage rate benchmark (~3.50% for A-rated energy efficient Irish homes)."
                  />
                </span>
                <div className="flex items-center px-2 py-0.5 rounded border transition-all bg-emerald-950/40 border-emerald-500/30 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400/40">
                  <input
                    type="number"
                    step={0.05}
                    value={(mortgageRate * 100).toFixed(2)}
                    onChange={(e) => {
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed) && parsed > 0) {
                        handleMortgageChange(parsed / 100);
                      }
                    }}
                    className="w-14 bg-transparent text-right font-mono font-bold text-xs text-emerald-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    title="Click to type a custom percentage value directly"
                  />
                  <span className="font-mono font-bold text-xs ml-0.5 text-emerald-400">%</span>
                </div>
              </div>

              <input
                type="range"
                min={0.02}
                max={0.07}
                step={0.001}
                value={mortgageRate}
                onChange={(e) => handleMortgageChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>2.0%</span>
                <span>3.5% (Green)</span>
                <span>7.0%</span>
              </div>
            </div>

            {/* 2. Mortgage Term (Years) */}
            <div className="bg-slate-850/80 p-3 rounded-xl border border-slate-750 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Mortgage Term (Years)</span>
                <div className="flex items-center bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 w-20">
                  <input
                    type="number"
                    min="5"
                    max="40"
                    value={termYears}
                    onChange={(e) => handleTermYearsChange(parseInt(e.target.value, 10) || 25)}
                    className="w-full bg-transparent text-white font-mono font-bold text-xs text-right focus:outline-none"
                  />
                  <span className="text-slate-400 text-[10px] ml-1">yrs</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {[20, 25, 30, 35].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => handleTermYearsChange(y)}
                    className={`text-[10px] py-1 px-1 rounded border text-center font-mono font-bold transition-all ${
                      termYears === y
                        ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {y} yrs
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Irish Fixed Lockout & Variable Rate Shock */}
            <div className="bg-slate-850/80 p-3 rounded-xl border border-slate-750 space-y-2.5">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400 text-[10px]">Fixed Lockout</span>
                    <span className="text-sky-400 font-mono font-bold text-[10px]">{fixedRateYears} yrs</span>
                  </div>
                  <div className="flex items-center bg-slate-900 border border-slate-750 rounded px-2 py-1">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={fixedRateYears}
                      onChange={(e) => handleFixedRateYearsChange(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-transparent text-white font-mono text-xs focus:outline-none"
                    />
                    <span className="text-slate-500 text-[10px]">yrs</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-400 text-[10px]">Variable Shock</span>
                    <span className={`font-mono font-bold text-[10px] ${rateShockPct === 0 ? 'text-slate-400' : 'text-amber-400'}`}>
                      {rateShockPct > 0 ? `+${rateShockPct}%` : `${rateShockPct}%`}
                    </span>
                  </div>
                  <div className="flex items-center bg-slate-900 border border-slate-750 rounded px-2 py-1">
                    <input
                      type="number"
                      step="0.25"
                      min="-1"
                      max="5"
                      value={rateShockPct}
                      onChange={(e) => handleRateShockChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent text-amber-300 font-mono text-xs focus:outline-none"
                    />
                    <span className="text-slate-500 text-[10px]">%</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 flex justify-between items-center font-mono pt-1 border-t border-slate-800">
                <span className="text-slate-500">Post-lock rate:</span>
                <span className="text-emerald-400 font-bold">{(mortgageRate * 100 + rateShockPct).toFixed(2)}%</span>
              </div>
            </div>

            {/* 4. Yearly Maintenance Rate (%) */}
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <span>Property Maintenance (%/yr)</span>
                <InfoTooltip
                  title="Annual Property Maintenance & Sinking Fund"
                  content="Estimated annual upkeep, insurance, and long-term maintenance cost as a % of property value (standard benchmark: 1.0%/yr)."
                />
              </span>
              <div className="flex items-center bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 w-20">
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
                  className="w-full bg-transparent text-white font-mono font-bold text-xs text-right focus:outline-none"
                />
                <span className="text-slate-400 text-xs font-bold font-mono ml-0.5">%</span>
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
          className="w-full p-3.5 bg-slate-850 flex items-center justify-between border-b border-slate-800 text-left hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Market & Macro Drivers
              </h3>
              <p className="text-[10px] text-purple-300 font-medium">Stock, Housing Inflation & FX Drift</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 animate-pulse">
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
          <div className="p-4 space-y-3.5 text-xs">
            {/* 1. Google GSU Stock Growth */}
            <SliderControl
              label="Google Stock Growth (p.a.)"
              tooltipTitle="Alphabet Stock Growth"
              tooltipContent="Annual nominal growth rate of Alphabet Inc. equity. Governs how fast unvested and retained GSU shares compound."
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

            {/* 2. Ireland Property Inflation */}
            <SliderControl
              label="Property Inflation (p.a.)"
              tooltipTitle="Ireland Property Inflation"
              tooltipContent="Annual Irish housing price appreciation. Higher rates increase the future deposit and borrowing requirements if waiting."
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

            {/* 3. Base Index Investments Return */}
            <SliderControl
              label="Base Investment Yield (p.a.)"
              tooltipTitle="Trading Account Yield"
              tooltipContent="Annual nominal return on non-GSU personal trading investments (e.g. global index funds / ETFs)."
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

            {/* 4. Ireland Rent Inflation (RPZ) */}
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

            {/* 5. EUR/USD Drift & 5-Year Target */}
            <CurrencyDriftControl
              yearlyDrift={driftRate}
              spotEurPerUsd={config.macro.eur_usd_spot}
              onChange={handleDriftChange}
            />
          </div>
        )}
      </div>
    </aside>
  );
});
export default Sidebar;
