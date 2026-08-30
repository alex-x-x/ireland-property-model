import React, { useState, useEffect, useTransition } from 'react';
import { Sliders } from 'lucide-react';
import { SimulationConfig } from '../engine/types';
import { InfoTooltip } from './InfoTooltip';

interface SidebarProps {
  config: SimulationConfig;
  onChange: (updated: SimulationConfig) => void;
}

interface SliderControlProps {
  label: string;
  tooltipTitle: string;
  tooltipContent: string;
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

const SliderControl: React.FC<SliderControlProps> = ({
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
};

export const Sidebar: React.FC<SidebarProps> = ({ config, onChange }) => {
  const [, startTransition] = useTransition();

  // Local state for immediate slider feedback
  const [stockRate, setStockRate] = useState(config.equity_engine.stock_yearly_growth_rate);
  const [propRate, setPropRate] = useState(config.property.yearly_growth_rate);
  const [invRate, setInvRate] = useState(config.liquid_assets.investments_yearly_growth_rate);
  const [mortgageRate, setMortgageRate] = useState(config.mortgage.mortgage_interest_rate);
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
    setRentRate(config.macro.rent_yearly_growth_rate || 0);
  }, [config.macro.rent_yearly_growth_rate]);

  useEffect(() => {
    setDriftRate(config.macro.eur_usd_yearly_drift || 0);
  }, [config.macro.eur_usd_yearly_drift]);

  const handleStockChange = (val: number) => {
    setStockRate(val);
    startTransition(() => {
      onChange({
        ...config,
        equity_engine: { ...config.equity_engine, stock_yearly_growth_rate: val },
      });
    });
  };

  const handlePropChange = (val: number) => {
    setPropRate(val);
    startTransition(() => {
      onChange({
        ...config,
        property: { ...config.property, yearly_growth_rate: val },
      });
    });
  };

  const handleInvChange = (val: number) => {
    setInvRate(val);
    startTransition(() => {
      onChange({
        ...config,
        liquid_assets: { ...config.liquid_assets, investments_yearly_growth_rate: val },
      });
    });
  };

  const handleMortgageChange = (val: number) => {
    setMortgageRate(val);
    startTransition(() => {
      onChange({
        ...config,
        mortgage: { ...config.mortgage, mortgage_interest_rate: val },
      });
    });
  };

  const handleRentChange = (val: number) => {
    setRentRate(val);
    startTransition(() => {
      onChange({
        ...config,
        macro: { ...config.macro, rent_yearly_growth_rate: val },
      });
    });
  };

  const handleDriftChange = (val: number) => {
    setDriftRate(val);
    startTransition(() => {
      onChange({
        ...config,
        macro: { ...config.macro, eur_usd_yearly_drift: val },
      });
    });
  };

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

          {/* 2. Dublin Property Inflation */}
          <SliderControl
            label="Property Inflation (p.a.)"
            tooltipTitle="Dublin Property Inflation"
            tooltipContent="Annual Dublin housing price appreciation. Higher rates increase the future deposit and borrowing requirements if waiting."
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

          {/* 4. Mortgage Interest Rate */}
          <SliderControl
            label="Mortgage Rate (AIB 2026)"
            tooltipTitle="AIB Green Benchmark"
            tooltipContent="Fixed Green Mortgage rate benchmark (~3.50% for A-rated energy efficient Dublin homes)."
            value={mortgageRate}
            min={0.02}
            max={0.07}
            step={0.001}
            inputStep={0.05}
            precision={2}
            colorTheme="emerald"
            ticks={['2.0%', '3.5%', '7.0%']}
            onChange={handleMortgageChange}
          />

          {/* 5. Dublin Rent Inflation (RPZ) */}
          <SliderControl
            label="Rent Inflation (Dublin RPZ)"
            tooltipTitle="RPZ Statutory Rent Cap"
            tooltipContent="Dublin Rent Pressure Zone (RPZ) statutory cap limits annual rent increases to 2.0% per annum."
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

          {/* 6. EUR/USD Drift */}
          <SliderControl
            label="EUR/USD Spot Drift (p.a.)"
            tooltipTitle="FX Rate Drift"
            tooltipContent="Annual change in the EUR/USD exchange rate. A weakening dollar reduces the EUR value of USD-denominated stock."
            value={driftRate}
            min={-0.05}
            max={0.05}
            step={0.005}
            inputStep={0.1}
            precision={1}
            colorTheme="slate"
            ticks={['-5%', '0%', '+5%']}
            onChange={handleDriftChange}
          />
        </div>
      </div>
    </aside>
  );
};
