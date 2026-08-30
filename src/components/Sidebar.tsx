import React from 'react';
import { Sliders } from 'lucide-react';
import { SimulationConfig } from '../engine/types';
import { InfoTooltip } from './InfoTooltip';

interface SidebarProps {
  config: SimulationConfig;
  onChange: (updated: SimulationConfig) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ config, onChange }) => {
  const updateProperty = (field: keyof SimulationConfig['property'], value: any) => {
    onChange({ ...config, property: { ...config.property, [field]: value } });
  };

  const updateMortgage = (field: keyof SimulationConfig['mortgage'], value: any) => {
    onChange({ ...config, mortgage: { ...config.mortgage, [field]: value } });
  };

  const updateLiquidAssets = (field: keyof SimulationConfig['liquid_assets'], value: any) => {
    onChange({ ...config, liquid_assets: { ...config.liquid_assets, [field]: value } });
  };

  const updateEquityEngine = (field: keyof SimulationConfig['equity_engine'], value: any) => {
    onChange({ ...config, equity_engine: { ...config.equity_engine, [field]: value } });
  };

  const updateMacro = (field: keyof SimulationConfig['macro'], value: any) => {
    onChange({ ...config, macro: { ...config.macro, [field]: value } });
  };

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-20 lg:self-start z-20 space-y-4">
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
          <div className="bg-slate-850/80 p-3 rounded-xl border border-purple-500/20 space-y-1.5">
            <div className="flex justify-between items-center text-slate-300 font-medium">
              <span className="text-purple-300 flex items-center gap-1">
                <span>Google Stock Growth (p.a.)</span>
                <InfoTooltip
                  title="Alphabet Stock Growth"
                  content="Annual nominal growth rate of Alphabet Inc. equity. Governs how fast unvested and retained GSU shares compound."
                />
              </span>
              <span className="font-mono font-bold text-sm text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/30">
                {(config.equity_engine.stock_yearly_growth_rate * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="-0.10"
              max="0.30"
              step="0.005"
              value={config.equity_engine.stock_yearly_growth_rate}
              onChange={(e) => updateEquityEngine('stock_yearly_growth_rate', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-10%</span>
              <span>+10%</span>
              <span>+30%</span>
            </div>
          </div>

          {/* 2. Dublin Property Inflation */}
          <div className="bg-slate-850/80 p-3 rounded-xl border border-brand-500/20 space-y-1.5">
            <div className="flex justify-between items-center text-slate-300 font-medium">
              <span className="text-brand-300 flex items-center gap-1">
                <span>Property Inflation (p.a.)</span>
                <InfoTooltip
                  title="Dublin Property Inflation"
                  content="Annual Dublin housing price appreciation. Higher rates increase the future deposit and borrowing requirements if waiting."
                />
              </span>
              <span className="font-mono font-bold text-sm text-brand-400 bg-brand-950/40 px-2 py-0.5 rounded border border-brand-500/30">
                {(config.property.yearly_growth_rate * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.15"
              step="0.005"
              value={config.property.yearly_growth_rate}
              onChange={(e) => updateProperty('yearly_growth_rate', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0%</span>
              <span>+5%</span>
              <span>+15%</span>
            </div>
          </div>

          {/* 3. Base Index Investments Return */}
          <div className="bg-slate-850/80 p-3 rounded-xl border border-sky-500/20 space-y-1.5">
            <div className="flex justify-between items-center text-slate-300 font-medium">
              <span className="text-sky-300 flex items-center gap-1">
                <span>Base Investment Yield (p.a.)</span>
                <InfoTooltip
                  title="Trading Account Yield"
                  content="Annual nominal return on non-GSU personal trading investments (e.g. global index funds / ETFs)."
                />
              </span>
              <span className="font-mono font-bold text-sm text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-500/30">
                {(config.liquid_assets.investments_yearly_growth_rate * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.20"
              step="0.005"
              value={config.liquid_assets.investments_yearly_growth_rate}
              onChange={(e) => updateLiquidAssets('investments_yearly_growth_rate', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0%</span>
              <span>+8%</span>
              <span>+20%</span>
            </div>
          </div>

          {/* 4. Mortgage Interest Rate */}
          <div className="bg-slate-850/80 p-3 rounded-xl border border-emerald-500/20 space-y-1.5">
            <div className="flex justify-between items-center text-slate-300 font-medium">
              <span className="text-emerald-300 flex items-center gap-1">
                <span>Mortgage Rate (AIB 2026)</span>
                <InfoTooltip
                  title="AIB Green Benchmark"
                  content="Fixed Green Mortgage rate benchmark (~3.50% for A-rated energy efficient Dublin homes)."
                />
              </span>
              <span className="font-mono font-bold text-sm text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                {(config.mortgage.mortgage_interest_rate * 100).toFixed(2)}%
              </span>
            </div>
            <input
              type="range"
              min="0.02"
              max="0.07"
              step="0.001"
              value={config.mortgage.mortgage_interest_rate}
              onChange={(e) => updateMortgage('mortgage_interest_rate', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>2.0%</span>
              <span>3.5%</span>
              <span>7.0%</span>
            </div>
          </div>

          {/* 5. Dublin Rent Inflation (RPZ) */}
          <div className="bg-slate-850/80 p-3 rounded-xl border border-rose-500/20 space-y-1.5">
            <div className="flex justify-between items-center text-slate-300 font-medium">
              <span className="text-rose-300 flex items-center gap-1">
                <span>Rent Inflation (Dublin RPZ)</span>
                <InfoTooltip
                  title="RPZ Statutory Rent Cap"
                  content="Dublin Rent Pressure Zone (RPZ) statutory cap limits annual rent increases to 2.0% per annum."
                />
              </span>
              <span className="font-mono font-bold text-sm text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30">
                {((config.macro.rent_yearly_growth_rate || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.08"
              step="0.005"
              value={config.macro.rent_yearly_growth_rate || 0}
              onChange={(e) => updateMacro('rent_yearly_growth_rate', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0%</span>
              <span>2.0% (Cap)</span>
              <span>8.0%</span>
            </div>
          </div>

          {/* 6. EUR/USD Drift */}
          <div className="bg-slate-850/80 p-3 rounded-xl border border-slate-750 space-y-1.5">
            <div className="flex justify-between items-center text-slate-300 font-medium">
              <span className="flex items-center gap-1">
                <span>EUR/USD Spot Drift (p.a.)</span>
                <InfoTooltip
                  title="FX Rate Drift"
                  content="Annual change in the EUR/USD exchange rate. A weakening dollar reduces the EUR value of USD-denominated stock."
                />
              </span>
              <span className="font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">
                {((config.macro.eur_usd_yearly_drift || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="-0.05"
              max="0.05"
              step="0.005"
              value={config.macro.eur_usd_yearly_drift || 0}
              onChange={(e) => updateMacro('eur_usd_yearly_drift', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-400"
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
