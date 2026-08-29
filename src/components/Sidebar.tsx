import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Home,
  Landmark,
  Wallet,
  Building,
  ChevronDown,
  ChevronUp,
  Sliders,
  Info,
} from 'lucide-react';
import { SimulationConfig } from '../engine/types';

interface SidebarProps {
  config: SimulationConfig;
  onChange: (updated: SimulationConfig) => void;
  isProfileLocked: boolean;
  onToggleProfileLock: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  config,
  onChange,
  isProfileLocked,
  onToggleProfileLock,
}) => {
  const [openPersonalSections, setOpenPersonalSections] = useState<Record<string, boolean>>({
    property: true,
    income: true,
    liquid: true,
    living: true,
  });

  const togglePersonal = (key: string) => {
    setOpenPersonalSections((prev) => ({ ...prev, [key]: !prev[key] }));
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
    <aside className="w-full lg:w-84 flex-shrink-0 space-y-4">
      {/* SECTION 1: ECONOMIC & MARKET DRIVERS (Always Unlocked) */}
      <div className="bg-slate-900 border-2 border-brand-500/40 rounded-2xl p-4 shadow-xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Economic & Market Drivers
              </h3>
              <p className="text-[10px] text-brand-300/80 font-medium">Active Stress-Testing Playground</p>
            </div>
          </div>
          <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
            Live Sliders
          </span>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Google GSU Stock Growth */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1 font-medium">
              <span>Google Stock Growth (p.a.)</span>
              <span className="font-bold text-purple-400">
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
          </div>

          {/* Property Inflation */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1 font-medium">
              <span>Dublin Property Inflation (p.a.)</span>
              <span className="font-bold text-brand-400">
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
          </div>

          {/* Index Investment Return */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1 font-medium">
              <span>Base Investment Return (p.a.)</span>
              <span className="font-bold text-sky-400">
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
          </div>

          {/* Mortgage Interest Rate */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1 font-medium">
              <span>Mortgage Rate (AIB 2026)</span>
              <span className="font-bold text-emerald-400">
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
          </div>

          {/* Rent Inflation */}
          <div>
            <div className="flex justify-between text-slate-300 mb-1 font-medium">
              <span>Rent Growth (Dublin RPZ)</span>
              <span className="font-bold text-rose-400">
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
          </div>
        </div>
      </div>

      {/* SECTION 2: PERSONAL FINANCIAL PROFILE (Lockable) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
        {/* Header & Lock Switch */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${
              isProfileLocked
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {isProfileLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Personal Financial Profile
              </h3>
              <p className="text-[10px] text-slate-400">Your savings, salary, rent & targets</p>
            </div>
          </div>

          <button
            onClick={onToggleProfileLock}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
              isProfileLocked
                ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
            }`}
            title={isProfileLocked ? 'Click to unlock and edit personal financial inputs' : 'Click to lock personal financial inputs'}
          >
            {isProfileLocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-slate-400" />
                <span>Unlock to Edit</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Profile</span>
              </>
            )}
          </button>
        </div>

        {/* Lock Warning / Helper Notice */}
        {isProfileLocked && (
          <div className="px-4 py-2 bg-emerald-950/20 border-b border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-300/90">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
            <span>Profile locked. Economic sliders above will model outcomes on your baseline.</span>
          </div>
        )}

        <div className={`divide-y divide-slate-800/80 ${isProfileLocked ? 'opacity-85 pointer-events-none' : ''}`}>
          {/* Target Home & Deposit */}
          <div>
            <button
              onClick={() => togglePersonal('property')}
              className="w-full px-4 py-2.5 bg-slate-850/50 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Home className="w-3.5 h-3.5 text-brand-400" />
                <span className="text-xs font-bold text-slate-200">Target Home & Deposit</span>
              </div>
              {openPersonalSections.property ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openPersonalSections.property && (
              <div className="p-4 space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Target Property Price (€)</label>
                  <input
                    type="number"
                    step="25000"
                    disabled={isProfileLocked}
                    value={config.property.target_price_eur}
                    onChange={(e) => updateProperty('target_price_eur', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-white font-bold disabled:bg-slate-900 disabled:text-slate-300 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Deposit %</label>
                    <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
                      <input
                        type="number"
                        step="1"
                        min="10"
                        max="50"
                        disabled={isProfileLocked}
                        value={Math.round(config.property.minimum_deposit_pct * 100)}
                        onChange={(e) => updateProperty('minimum_deposit_pct', (parseFloat(e.target.value) || 10) / 100)}
                        className="w-full bg-transparent text-white font-bold focus:outline-none"
                      />
                      <span className="text-slate-400 font-medium">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Legal / Fees (€)</label>
                    <input
                      type="number"
                      step="500"
                      disabled={isProfileLocked}
                      value={config.property.legal_and_closing_fees_eur}
                      onChange={(e) => updateProperty('legal_and_closing_fees_eur', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Income & CBI Borrowing */}
          <div>
            <button
              onClick={() => togglePersonal('income')}
              className="w-full px-4 py-2.5 bg-slate-850/50 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">Income & Borrowing Capacity</span>
              </div>
              {openPersonalSections.income ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openPersonalSections.income && (
              <div className="p-4 space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Gross Annual Salary (€)</label>
                  <input
                    type="number"
                    step="5000"
                    disabled={isProfileLocked}
                    value={config.mortgage.buyer_gross_annual_salary_eur}
                    onChange={(e) => updateMortgage('buyer_gross_annual_salary_eur', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-white font-bold disabled:bg-slate-900 disabled:text-slate-300 focus:outline-none"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>CBI Max Loan (4.0x):</span>
                    <span className="text-emerald-400 font-semibold">
                      €{(config.mortgage.buyer_gross_annual_salary_eur * config.mortgage.cbi_max_lti_multiple).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Mortgage Term</label>
                    <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
                      <input
                        type="number"
                        min="10"
                        max="35"
                        disabled={isProfileLocked}
                        value={config.mortgage.mortgage_term_years}
                        onChange={(e) => updateMortgage('mortgage_term_years', parseInt(e.target.value) || 25)}
                        className="w-full bg-transparent text-white font-bold focus:outline-none"
                      />
                      <span className="text-slate-400 text-[11px]">yrs</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Maint. Rate</label>
                    <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
                      <input
                        type="number"
                        step="0.1"
                        disabled={isProfileLocked}
                        value={(config.mortgage.yearly_maintenance_rate * 100).toFixed(1)}
                        onChange={(e) => updateMortgage('yearly_maintenance_rate', (parseFloat(e.target.value) || 1) / 100)}
                        className="w-full bg-transparent text-white font-bold focus:outline-none"
                      />
                      <span className="text-slate-400 font-medium">%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cash & Portfolio */}
          <div>
            <button
              onClick={() => togglePersonal('liquid')}
              className="w-full px-4 py-2.5 bg-slate-850/50 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-bold text-slate-200">Current Cash & Investments</span>
              </div>
              {openPersonalSections.liquid ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openPersonalSections.liquid && (
              <div className="p-4 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Cash EUR (€)</label>
                    <input
                      type="number"
                      step="5000"
                      disabled={isProfileLocked}
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
                      disabled={isProfileLocked}
                      value={config.liquid_assets.cash_usd}
                      onChange={(e) => updateLiquidAssets('cash_usd', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Inv. EUR (€)</label>
                    <input
                      type="number"
                      step="5000"
                      disabled={isProfileLocked}
                      value={config.liquid_assets.investments_eur}
                      onChange={(e) => updateLiquidAssets('investments_eur', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Inv. USD ($)</label>
                    <input
                      type="number"
                      step="5000"
                      disabled={isProfileLocked}
                      value={config.liquid_assets.investments_usd}
                      onChange={(e) => updateLiquidAssets('investments_usd', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Monthly Salary Savings (€)</label>
                  <input
                    type="number"
                    step="250"
                    disabled={isProfileLocked}
                    value={config.liquid_assets.monthly_salary_savings_eur}
                    onChange={(e) => updateLiquidAssets('monthly_salary_savings_eur', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Living Costs & Irish Tax */}
          <div>
            <button
              onClick={() => togglePersonal('living')}
              className="w-full px-4 py-2.5 bg-slate-850/50 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-bold text-slate-200">Rent & Irish Tax</span>
              </div>
              {openPersonalSections.living ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {openPersonalSections.living && (
              <div className="p-4 space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Current Monthly Rent (€)</label>
                  <input
                    type="number"
                    step="100"
                    disabled={isProfileLocked}
                    value={config.macro.current_monthly_rent_eur}
                    onChange={(e) => updateMacro('current_monthly_rent_eur', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-rose-400 font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Irish GSU Marginal Tax Rate</label>
                  <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
                    <input
                      type="number"
                      step="1"
                      min="20"
                      max="60"
                      disabled={isProfileLocked}
                      value={Math.round(config.equity_engine.marginal_tax_rate_ireland * 100)}
                      onChange={(e) => updateEquityEngine('marginal_tax_rate_ireland', (parseFloat(e.target.value) || 52) / 100)}
                      className="w-full bg-transparent text-white font-bold focus:outline-none"
                    />
                    <span className="text-slate-400 font-medium">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
