import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Home,
  Landmark,
  Wallet,
  Building,
  Award,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Info,
  Edit3,
} from 'lucide-react';
import { SimulationConfig, Grant } from '../engine/types';
import { addMonthsToDate, getCalendarMonthOffset } from '../engine/vesting';
import { getTotalGrossSalary, getEffectiveMaxMortgage } from '../engine/mortgage';

interface PersonalProfileHeaderProps {
  config: SimulationConfig;
  onChange: (updated: SimulationConfig) => void;
  isProfileLocked: boolean;
  onToggleProfileLock: () => void;
  onUpdateGrants: (grants: Grant[]) => void;
}

export const PersonalProfileHeader: React.FC<PersonalProfileHeaderProps> = ({
  config,
  onChange,
  isProfileLocked,
  onToggleProfileLock,
  onUpdateGrants,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const grants = config.equity_engine.grants;
  const totalGrantShares = grants.reduce((sum, g) => sum + g.total_shares, 0);
  const totalSalary = getTotalGrossSalary(config.mortgage);
  const cbiCalculatedLoan = totalSalary * config.mortgage.cbi_max_lti_multiple;
  const effectiveMaxLoan = getEffectiveMaxMortgage(config.mortgage);
  const hasCustomAip =
    config.mortgage.approval_in_principle_amount_eur !== undefined &&
    config.mortgage.approval_in_principle_amount_eur !== null &&
    config.mortgage.approval_in_principle_amount_eur > 0;

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

  const handleAddInitialGrant = () => {
    const newGrant: Grant = {
      id: `grant_${Date.now()}`,
      name: `Initial Grant ${new Date().getFullYear()}`,
      type: 'initial',
      grant_date: config.meta.start_date,
      total_shares: 800,
      schedule_percents: [0.33, 0.33, 0.22, 0.12],
      vest_frequency_months: 12,
    };
    onUpdateGrants([...grants, newGrant]);
  };

  const handleAddRefresherGrant = () => {
    const newGrant: Grant = {
      id: `refresher_${Date.now()}`,
      name: `Refresher ${new Date().getFullYear()}`,
      type: 'refresher',
      grant_date: config.meta.start_date,
      total_shares: 200,
      schedule_percents: [0.25, 0.25, 0.25, 0.25],
      vest_frequency_months: 3,
    };
    onUpdateGrants([...grants, newGrant]);
  };

  const handleDeleteGrant = (id: string) => {
    onUpdateGrants(grants.filter((g) => g.id !== id));
  };

  const handleUpdateGrant = (id: string, updates: Partial<Grant>) => {
    onUpdateGrants(
      grants.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mb-6">
      {/* Top Banner Bar */}
      <div className="p-4 bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl border transition-colors ${
              isProfileLocked
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            {isProfileLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">Personal Financial Profile & Baseline</h2>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                  isProfileLocked
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {isProfileLocked ? 'Profile Locked (Safe Modeling)' : 'Unlocked (Editing Mode)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Your personal assets, salary, rent, and GSU grants remain stable while stress-testing economic drivers
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Quick Summary Pill Tags when collapsed or locked */}
          {!isExpanded && (
            <div className="hidden xl:flex items-center gap-2 text-xs font-mono">
              <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                <span className="text-slate-400 text-[11px] font-sans">Home: </span>
                <span className="font-bold text-white">€{(config.property.target_price_eur / 1000000).toFixed(2)}M</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                <span className="text-slate-400 text-[11px] font-sans">Income: </span>
                <span className="font-bold text-emerald-400">€{Math.round(totalSalary / 1000)}k</span>
                <span className="text-[10px] text-slate-400 font-sans ml-1">
                  (€{Math.round((config.mortgage.buyer_gross_annual_base_salary_eur ?? totalSalary) / 1000)}k + {
                    config.mortgage.buyer_annual_bonus_pct !== undefined
                      ? `${(config.mortgage.buyer_annual_bonus_pct * 100).toFixed(1).replace(/\.0$/, '')}%`
                      : `€${Math.round((config.mortgage.buyer_annual_bonus_eur || 0) / 1000)}k`
                  } bonus)
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                <span className="text-slate-400 text-[11px] font-sans">AIP Loan: </span>
                <span className="font-bold text-emerald-300">€{Math.round(effectiveMaxLoan / 1000)}k</span>
                {hasCustomAip && <span className="text-[9px] px-1 py-0.2 rounded bg-brand-500/20 text-brand-300 ml-1">AIP</span>}
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                <span className="text-slate-400 text-[11px] font-sans">Rent: </span>
                <span className="font-bold text-rose-400">€{config.macro.current_monthly_rent_eur.toLocaleString()}/mo</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                <span className="text-slate-400 text-[11px] font-sans">GSUs: </span>
                <span className="font-bold text-purple-300">{totalGrantShares} shs</span>
              </div>
            </div>
          )}

          {/* Toggle Lock Button */}
          <button
            onClick={() => {
              onToggleProfileLock();
              if (isProfileLocked) setIsExpanded(true); // auto-expand when unlocking
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
              isProfileLocked
                ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400'
            }`}
          >
            {isProfileLocked ? (
              <>
                <Edit3 className="w-3.5 h-3.5 text-brand-400" />
                <span>Unlock to Edit Profile</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Profile</span>
              </>
            )}
          </button>

          {/* Expand/Collapse Details Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1"
          >
            <span>{isExpanded ? 'Collapse Profile' : 'View / Edit Inputs'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Profile Body */}
      {isExpanded && (
        <div className="p-5 space-y-6">
          {/* Helper alert when locked */}
          {isProfileLocked && (
            <div className="px-4 py-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Profile inputs are in read-only mode. Click "Unlock to Edit Profile" above to modify your baseline financial facts.</span>
              </div>
              <button
                onClick={onToggleProfileLock}
                className="text-xs font-bold underline hover:text-white flex-shrink-0 ml-2"
              >
                Unlock
              </button>
            </div>
          )}

          {/* 4-Column Grid for Personal Profile Inputs */}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${isProfileLocked ? 'opacity-85 pointer-events-none' : ''}`}>
            {/* Column 1: Target Home & Deposit */}
            <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3 text-xs">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                <Home className="w-4 h-4 text-brand-400" />
                <h4 className="font-bold text-slate-200">Target Home & Deposit</h4>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target Property Price (€)</label>
                <input
                  type="number"
                  step="25000"
                  disabled={isProfileLocked}
                  value={config.property.target_price_eur}
                  onChange={(e) => updateProperty('target_price_eur', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold disabled:bg-slate-900 focus:outline-none"
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

            {/* Column 2: Income Breakdown & AIP Borrowing Capacity */}
            <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3 text-xs">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                <Landmark className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-slate-200">Income & AIP Borrowing</h4>
              </div>

              {/* Base Salary and Dual Bonus % / € */}
              <div>
                <label className="text-slate-400 block mb-1">Base Salary (€)</label>
                <input
                  type="number"
                  step="5000"
                  disabled={isProfileLocked}
                  value={config.mortgage.buyer_gross_annual_base_salary_eur ?? 190000}
                  onChange={(e) => {
                    const base = parseFloat(e.target.value) || 0;
                    const bonusPct = config.mortgage.buyer_annual_bonus_pct ?? 0.1842;
                    const bonusEur = base * bonusPct;
                    onChange({
                      ...config,
                      mortgage: {
                        ...config.mortgage,
                        buyer_gross_annual_base_salary_eur: base,
                        buyer_annual_bonus_eur: bonusEur,
                        buyer_gross_annual_salary_eur: base + bonusEur,
                      },
                    });
                  }}
                  className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold disabled:bg-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Bonus %</label>
                  <div className="flex items-center bg-slate-800 px-2 py-1.5 rounded-lg border border-slate-700">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      disabled={isProfileLocked}
                      value={
                        config.mortgage.buyer_annual_bonus_pct !== undefined
                          ? Math.round(config.mortgage.buyer_annual_bonus_pct * 100)
                          : config.mortgage.buyer_gross_annual_base_salary_eur
                          ? Math.round(((config.mortgage.buyer_annual_bonus_eur || 0) / config.mortgage.buyer_gross_annual_base_salary_eur) * 100)
                          : 0
                      }
                      onChange={(e) => {
                        const pct = (parseFloat(e.target.value) || 0) / 100;
                        const base = config.mortgage.buyer_gross_annual_base_salary_eur || 0;
                        const bonusEur = base * pct;
                        onChange({
                          ...config,
                          mortgage: {
                            ...config.mortgage,
                            buyer_annual_bonus_pct: pct,
                            buyer_annual_bonus_eur: bonusEur,
                            buyer_gross_annual_salary_eur: base + bonusEur,
                          },
                        });
                      }}
                      className="w-full bg-transparent text-white font-bold focus:outline-none"
                    />
                    <span className="text-slate-400 font-medium">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Bonus (€)</label>
                  <input
                    type="number"
                    step="1000"
                    disabled={isProfileLocked}
                    value={Math.round(
                      config.mortgage.buyer_annual_bonus_eur ??
                        (config.mortgage.buyer_gross_annual_base_salary_eur || 0) * (config.mortgage.buyer_annual_bonus_pct || 0)
                    )}
                    onChange={(e) => {
                      const bonusEur = parseFloat(e.target.value) || 0;
                      const base = config.mortgage.buyer_gross_annual_base_salary_eur || 0;
                      const pct = base > 0 ? bonusEur / base : 0;
                      onChange({
                        ...config,
                        mortgage: {
                          ...config.mortgage,
                          buyer_annual_bonus_eur: bonusEur,
                          buyer_annual_bonus_pct: pct,
                          buyer_gross_annual_salary_eur: base + bonusEur,
                        },
                      });
                    }}
                    className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold disabled:bg-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Income & CBI Summary */}
              <div className="flex justify-between text-[11px] text-slate-400 bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                <span>Total: <strong className="text-white">€{totalSalary.toLocaleString()}</strong></span>
                <span>CBI 4.0x: <strong className="text-emerald-400">€{cbiCalculatedLoan.toLocaleString()}</strong></span>
              </div>

              {/* Approval in Principle (AIP) Explicit Input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 block">Approval in Principle (AIP) (€)</label>
                  {!isProfileLocked && hasCustomAip && (
                    <button
                      onClick={() => updateMortgage('approval_in_principle_amount_eur', null)}
                      className="text-[10px] text-brand-400 hover:text-brand-300 underline"
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
                    disabled={isProfileLocked}
                    placeholder={`CBI 4.0x: €${cbiCalculatedLoan.toLocaleString()}`}
                    value={config.mortgage.approval_in_principle_amount_eur ?? ''}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null;
                      updateMortgage('approval_in_principle_amount_eur', val);
                    }}
                    className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-emerald-300 font-bold placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {hasCustomAip ? '✓ Using explicit bank AIP loan cap' : '✓ Defaults to CBI 4.0x loan limit'}
                </span>
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
                    <span className="text-slate-400 text-[10px]">yrs</span>
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

            {/* Column 3: Cash & Liquid Investments */}
            <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3 text-xs">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                <Wallet className="w-4 h-4 text-sky-400" />
                <h4 className="font-bold text-slate-200">Cash & Investments</h4>
              </div>

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
                  <label className="text-slate-400 block mb-1">Inv EUR (€)</label>
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
                  <label className="text-slate-400 block mb-1">Inv USD ($)</label>
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
                  className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                />
              </div>
            </div>

            {/* Column 4: Rent & Irish Tax */}
            <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3 text-xs">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                <Building className="w-4 h-4 text-rose-400" />
                <h4 className="font-bold text-slate-200">Rent & Tax Baseline</h4>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Current Monthly Rent (€)</label>
                <input
                  type="number"
                  step="100"
                  disabled={isProfileLocked}
                  value={config.macro.current_monthly_rent_eur}
                  onChange={(e) => updateMacro('current_monthly_rent_eur', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-rose-400 font-bold focus:outline-none"
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

              <div>
                <label className="text-slate-400 block mb-1">Model Start Date</label>
                <input
                  type="date"
                  disabled={isProfileLocked}
                  value={config.meta.start_date}
                  onChange={(e) => onChange({ ...config, meta: { ...config.meta, start_date: e.target.value } })}
                  className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* GSU Grants Section directly within Personal Profile */}
          <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-purple-400" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Google Stock Unit (GSU) Grants Baseline & Future Cliffs
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Total: {totalGrantShares} gross shares across {grants.length} grants
                  </p>
                </div>
              </div>

              {!isProfileLocked && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddRefresherGrant}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-medium rounded-lg border border-purple-500/30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Refresher (25% Qtr)</span>
                  </button>
                  <button
                    onClick={handleAddInitialGrant}
                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg shadow-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Initial (33/33/22/12)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Grant Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {grants.map((grant) => (
                <div
                  key={grant.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        disabled={isProfileLocked}
                        value={grant.name || grant.id}
                        onChange={(e) => handleUpdateGrant(grant.id, { name: e.target.value })}
                        className="bg-transparent font-semibold text-xs text-white focus:outline-none focus:border-b border-purple-500 w-full"
                        placeholder="Grant Name"
                      />
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="capitalize px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[9px]">
                          {grant.type}
                        </span>
                        <span>Grant Date:</span>
                        <input
                          type="date"
                          disabled={isProfileLocked}
                          value={grant.grant_date}
                          onChange={(e) => handleUpdateGrant(grant.id, { grant_date: e.target.value })}
                          className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700 text-[10px] focus:outline-none"
                        />
                      </div>
                    </div>

                    {!isProfileLocked && (
                      <button
                        onClick={() => handleDeleteGrant(grant.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        title="Remove grant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-850 p-2 rounded-lg border border-slate-750">
                      <span className="text-[10px] text-slate-400 block font-medium">Total Shares</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          type="number"
                          disabled={isProfileLocked}
                          value={grant.total_shares}
                          onChange={(e) => handleUpdateGrant(grant.id, { total_shares: parseInt(e.target.value) || 0 })}
                          className="w-full bg-slate-800 px-1.5 py-0.5 rounded font-bold text-white border border-slate-700 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">shs</span>
                      </div>
                    </div>

                    <div className="bg-slate-850 p-2 rounded-lg border border-slate-750">
                      <span className="text-[10px] text-slate-400 block font-medium">Frequency</span>
                      <select
                        disabled={isProfileLocked}
                        value={grant.vest_frequency_months}
                        onChange={(e) => handleUpdateGrant(grant.id, { vest_frequency_months: parseInt(e.target.value) || 12 })}
                        className="w-full bg-slate-800 px-1.5 py-0.5 rounded font-semibold text-slate-200 border border-slate-700 focus:outline-none mt-0.5 text-xs"
                      >
                        <option value={12}>Annual (12m)</option>
                        <option value={6}>Semi-Annual (6m)</option>
                        <option value={3}>Quarterly (3m)</option>
                        <option value={1}>Monthly (1m)</option>
                      </select>
                    </div>
                  </div>

                  {/* Visual Timeline */}
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {grant.schedule_percents.map((pct, idx) => {
                      const milestoneMonths = (idx + 1) * grant.vest_frequency_months;
                      const milestoneDate = addMonthsToDate(grant.grant_date, milestoneMonths);
                      const offset = getCalendarMonthOffset(config.meta.start_date, milestoneDate);
                      const isPast = offset <= 0;
                      const grossShares = grant.total_shares * pct;

                      return (
                        <div
                          key={idx}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] border font-medium ${
                            isPast
                              ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                              : 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                          }`}
                          title={
                            isPast
                              ? `Vested in past on ${milestoneDate.toISOString().slice(0, 10)} (${grossShares} shs)`
                              : `Vests at Month ${offset} (${milestoneDate.toISOString().slice(0, 10)}) - ${grossShares} shs`
                          }
                        >
                          {isPast ? <CheckCircle2 className="w-2.5 h-2.5 text-slate-500" /> : <Clock className="w-2.5 h-2.5 text-purple-400" />}
                          <span>Y{idx + 1}: {Math.round(pct * 100)}% ({Math.round(grossShares)} shs)</span>
                          <span className={isPast ? 'text-slate-500' : 'text-purple-300 font-bold'}>{isPast ? 'PAST' : `M${offset}`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
