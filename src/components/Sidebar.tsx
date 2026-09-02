import React, { useState, useEffect, useTransition, memo, useCallback } from 'react';
import { Sliders } from 'lucide-react';
import { SimulationConfig } from '../engine/types';
import { InfoTooltip } from './InfoTooltip';
import { targetFxToYearlyDrift, yearlyDriftToTargetFx, getFxMilestones } from '../engine/currency';

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

  // Local state for immediate slider feedback
  const [stockRate, setStockRate] = useState(config.equity_engine.stock_yearly_growth_rate);
  const [propRate, setPropRate] = useState(config.property.yearly_growth_rate);
  const [invRate, setInvRate] = useState(config.liquid_assets.investments_yearly_growth_rate);
  const [mortgageRate, setMortgageRate] = useState(config.mortgage.mortgage_interest_rate);
  const [fixedRateYears, setFixedRateYears] = useState(config.mortgage.fixed_rate_years ?? 2);
  const [rateShockPct, setRateShockPct] = useState(config.mortgage.variable_rate_shock_pct ?? 1.5);
  const [fixedYearsText, setFixedYearsText] = useState(String(config.mortgage.fixed_rate_years ?? 2));
  const [rateShockText, setRateShockText] = useState(String(config.mortgage.variable_rate_shock_pct ?? 1.5));
  const [isFixedYearsFocused, setIsFixedYearsFocused] = useState(false);
  const [isRateShockFocused, setIsRateShockFocused] = useState(false);
  const [rentRate, setRentRate] = useState(config.macro.rent_yearly_growth_rate || 0);
  const [driftRate, setDriftRate] = useState(config.macro.eur_usd_yearly_drift || 0);

  // Sync local state when external presets/config change
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
    if (!isFixedYearsFocused) {
      setFixedYearsText(String(config.mortgage.fixed_rate_years ?? 2));
    }
  }, [config.mortgage.fixed_rate_years, isFixedYearsFocused]);

  useEffect(() => {
    setRateShockPct(config.mortgage.variable_rate_shock_pct ?? 1.5);
    if (!isRateShockFocused) {
      setRateShockText(String(config.mortgage.variable_rate_shock_pct ?? 1.5));
    }
  }, [config.mortgage.variable_rate_shock_pct, isRateShockFocused]);

  useEffect(() => {
    setRentRate(config.macro.rent_yearly_growth_rate || 0);
  }, [config.macro.rent_yearly_growth_rate]);

  useEffect(() => {
    setDriftRate(config.macro.eur_usd_yearly_drift || 0);
  }, [config.macro.eur_usd_yearly_drift]);

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

  const handleMortgageChange = useCallback((val: number) => {
    setMortgageRate(val);
    startTransition(() => {
      onChange({
        ...config,
        mortgage: { ...config.mortgage, mortgage_interest_rate: val },
      });
    });
  }, [config, onChange]);

  const handleFixedRateYearsChange = useCallback((val: number) => {
    setFixedRateYears(val);
    startTransition(() => {
      onChange({
        ...config,
        mortgage: { ...config.mortgage, fixed_rate_years: val },
      });
    });
  }, [config, onChange]);

  const handleRateShockChange = useCallback((val: number) => {
    setRateShockPct(val);
    startTransition(() => {
      onChange({
        ...config,
        mortgage: { ...config.mortgage, variable_rate_shock_pct: val },
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
    <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 lg:sticky lg:top-20 lg:self-start z-20 space-y-4">
      <div className="bg-slate-900 border-2 border-brand-500/40 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 shadow-md">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Financial Modeling Sliders
              </h3>
              <p className="text-[11px] text-brand-300 font-medium">Active Scenario Controls</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 animate-pulse">
            Live
          </span>
        </div>

        {/* Sliders Container */}
        <div className="space-y-3.5 text-xs">
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

          {/* 4. Mortgage Interest Rate & Irish Structure */}
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
              <span>3.5%</span>
              <span>7.0%</span>
            </div>

            {/* Irish Specific Structure: Fixed Lockout & Variable Shock */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
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
                    value={isFixedYearsFocused ? fixedYearsText : fixedRateYears}
                    onFocus={() => setIsFixedYearsFocused(true)}
                    onBlur={() => {
                      setIsFixedYearsFocused(false);
                      const parsed = parseInt(fixedYearsText, 10);
                      if (isNaN(parsed) || parsed < 0) {
                        setFixedYearsText(String(fixedRateYears));
                      } else {
                        const clamped = Math.min(10, Math.max(0, parsed));
                        setFixedYearsText(String(clamped));
                        handleFixedRateYearsChange(clamped);
                      }
                    }}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setFixedYearsText(raw);
                      const parsed = parseInt(raw, 10);
                      if (!isNaN(parsed) && parsed >= 0 && parsed <= 10) {
                        handleFixedRateYearsChange(parsed);
                      }
                    }}
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
                    value={isRateShockFocused ? rateShockText : rateShockPct}
                    onFocus={() => setIsRateShockFocused(true)}
                    onBlur={() => {
                      setIsRateShockFocused(false);
                      const parsed = parseFloat(rateShockText);
                      if (isNaN(parsed)) {
                        setRateShockText(String(rateShockPct));
                      } else {
                        const clamped = Math.min(5, Math.max(-1, parsed));
                        setRateShockText(String(clamped));
                        handleRateShockChange(clamped);
                      }
                    }}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setRateShockText(raw);
                      const parsed = parseFloat(raw);
                      if (!isNaN(parsed) && parsed >= -1 && parsed <= 5) {
                        handleRateShockChange(parsed);
                      }
                    }}
                    className="w-full bg-transparent text-amber-300 font-mono text-xs focus:outline-none"
                  />
                  <span className="text-slate-500 text-[10px]">%</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between items-center font-mono">
              <span className="text-slate-500">Post-lock rate:</span>
              <span className="text-emerald-400 font-bold">{(mortgageRate * 100 + rateShockPct).toFixed(2)}%</span>
            </div>
          </div>

          {/* 5. Ireland Rent Inflation (RPZ) */}
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

          {/* 6. EUR/USD Drift & 5-Year Target */}
          <CurrencyDriftControl
            yearlyDrift={driftRate}
            spotEurPerUsd={config.macro.eur_usd_spot}
            onChange={handleDriftChange}
          />
        </div>

      </div>
    </aside>
  );
});
