import React, { useState } from 'react';
import {
  Home,
  Landmark,
  Wallet,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SimulationConfig } from '../engine/types';

interface SidebarProps {
  config: SimulationConfig;
  onChange: (updated: SimulationConfig) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ config, onChange }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    property: true,
    mortgage: true,
    assets: true,
    macro: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
    <aside className="w-full lg:w-80 flex-shrink-0 space-y-4">
      {/* Property Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <button
          onClick={() => toggleSection('property')}
          className="w-full px-4 py-3 bg-slate-850 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400">
              <Home className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Property & Deposit</span>
          </div>
          {openSections.property ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.property && (
          <div className="p-4 space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-medium">
                <span>Target Home Price</span>
                <span className="font-bold text-white">€{config.property.target_price_eur.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="400000"
                max="2500000"
                step="25000"
                value={config.property.target_price_eur}
                onChange={(e) => updateProperty('target_price_eur', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-medium">
                <span>Property Inflation (p.a.)</span>
                <span className="font-bold text-white">{(config.property.yearly_growth_rate * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.15"
                step="0.005"
                value={config.property.yearly_growth_rate}
                onChange={(e) => updateProperty('yearly_growth_rate', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Min Deposit %</label>
                <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="50"
                    value={Math.round(config.property.minimum_deposit_pct * 100)}
                    onChange={(e) => updateProperty('minimum_deposit_pct', (parseFloat(e.target.value) || 10) / 100)}
                    className="w-full bg-transparent text-white font-bold focus:outline-none"
                  />
                  <span className="text-slate-400 font-medium">%</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Legal / Closing</label>
                <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
                  <span className="text-slate-400 font-medium mr-1">€</span>
                  <input
                    type="number"
                    step="500"
                    value={config.property.legal_and_closing_fees_eur}
                    onChange={(e) => updateProperty('legal_and_closing_fees_eur', parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-white font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mortgage & CBI LTI Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <button
          onClick={() => toggleSection('mortgage')}
          className="w-full px-4 py-3 bg-slate-850 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Landmark className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Mortgage & CBI Rules</span>
          </div>
          {openSections.mortgage ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.mortgage && (
          <div className="p-4 space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-medium">
                <span>Mortgage Rate (AIB 2026)</span>
                <span className="font-bold text-white">{(config.mortgage.mortgage_interest_rate * 100).toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.07"
                step="0.001"
                value={config.mortgage.mortgage_interest_rate}
                onChange={(e) => updateMortgage('mortgage_interest_rate', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Amortization Term</label>
                <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
                  <input
                    type="number"
                    min="10"
                    max="35"
                    value={config.mortgage.mortgage_term_years}
                    onChange={(e) => updateMortgage('mortgage_term_years', parseInt(e.target.value) || 25)}
                    className="w-full bg-transparent text-white font-bold focus:outline-none"
                  />
                  <span className="text-slate-400 text-[11px]">yrs</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Maint. Rate (p.a.)</label>
                <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="3"
                    value={(config.mortgage.yearly_maintenance_rate * 100).toFixed(1)}
                    onChange={(e) => updateMortgage('yearly_maintenance_rate', (parseFloat(e.target.value) || 1) / 100)}
                    className="w-full bg-transparent text-white font-bold focus:outline-none"
                  />
                  <span className="text-slate-400 font-medium">%</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-medium">
                <span>Buyer Gross Salary</span>
                <span className="font-bold text-white">€{config.mortgage.buyer_gross_annual_salary_eur.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="80000"
                max="400000"
                step="5000"
                value={config.mortgage.buyer_gross_annual_salary_eur}
                onChange={(e) => updateMortgage('buyer_gross_annual_salary_eur', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>CBI Max Loan (4.0x):</span>
                <span className="text-emerald-400 font-semibold">
                  €{(config.mortgage.buyer_gross_annual_salary_eur * config.mortgage.cbi_max_lti_multiple).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Liquid Assets & Savings Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <button
          onClick={() => toggleSection('assets')}
          className="w-full px-4 py-3 bg-slate-850 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Cash & Portfolio</span>
          </div>
          {openSections.assets ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.assets && (
          <div className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Cash EUR (€)</label>
                <input
                  type="number"
                  step="5000"
                  value={config.liquid_assets.cash_eur}
                  onChange={(e) => updateLiquidAssets('cash_eur', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Cash USD ($)</label>
                <input
                  type="number"
                  step="5000"
                  value={config.liquid_assets.cash_usd}
                  onChange={(e) => updateLiquidAssets('cash_usd', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Investments EUR (€)</label>
                <input
                  type="number"
                  step="5000"
                  value={config.liquid_assets.investments_eur}
                  onChange={(e) => updateLiquidAssets('investments_eur', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Investments USD ($)</label>
                <input
                  type="number"
                  step="5000"
                  value={config.liquid_assets.investments_usd}
                  onChange={(e) => updateLiquidAssets('investments_usd', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-medium">
                <span>Investment Return (p.a.)</span>
                <span className="font-bold text-white">{(config.liquid_assets.investments_yearly_growth_rate * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.20"
                step="0.005"
                value={config.liquid_assets.investments_yearly_growth_rate}
                onChange={(e) => updateLiquidAssets('investments_yearly_growth_rate', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-medium">
                <span>Monthly Salary Savings</span>
                <span className="font-bold text-white">€{config.liquid_assets.monthly_salary_savings_eur.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="500"
                max="8000"
                step="250"
                value={config.liquid_assets.monthly_salary_savings_eur}
                onChange={(e) => updateLiquidAssets('monthly_salary_savings_eur', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Equity & Macro Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <button
          onClick={() => toggleSection('macro')}
          className="w-full px-4 py-3 bg-slate-850 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">Equity Growth & Rent</span>
          </div>
          {openSections.macro ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.macro && (
          <div className="p-4 space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-medium">
                <span>Google Stock Growth (p.a.)</span>
                <span className="font-bold text-purple-400">{(config.equity_engine.stock_yearly_growth_rate * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="-0.10"
                max="0.30"
                step="0.01"
                value={config.equity_engine.stock_yearly_growth_rate}
                onChange={(e) => updateEquityEngine('stock_yearly_growth_rate', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1 font-medium">
                <span>Current Monthly Rent</span>
                <span className="font-bold text-rose-400">€{config.macro.current_monthly_rent_eur.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="1200"
                max="5000"
                step="100"
                value={config.macro.current_monthly_rent_eur}
                onChange={(e) => updateMacro('current_monthly_rent_eur', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block mb-1">Rent Growth (RPZ)</label>
                <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={((config.macro.rent_yearly_growth_rate || 0) * 100).toFixed(1)}
                    onChange={(e) => updateMacro('rent_yearly_growth_rate', (parseFloat(e.target.value) || 0) / 100)}
                    className="w-full bg-transparent text-white font-bold focus:outline-none"
                  />
                  <span className="text-slate-400 font-medium">%</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Irish GSU Tax</label>
                <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
                  <input
                    type="number"
                    step="1"
                    min="20"
                    max="60"
                    value={Math.round(config.equity_engine.marginal_tax_rate_ireland * 100)}
                    onChange={(e) => updateEquityEngine('marginal_tax_rate_ireland', (parseFloat(e.target.value) || 52) / 100)}
                    className="w-full bg-transparent text-white font-bold focus:outline-none"
                  />
                  <span className="text-slate-400 font-medium">%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
