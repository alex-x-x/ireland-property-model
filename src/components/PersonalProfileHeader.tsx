import React, { useState, memo } from 'react';
import {
  Lock,
  Unlock,
  Landmark,
  Wallet,
  Building,
  Award,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit3,
  TrendingUp,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { SimulationConfig, Grant, SalaryAdjustment } from '../engine/types';
import {
  addMonthsToDate,
  getCalendarMonthOffset,
  calculateGrantVestingSummary,
  calculateSingleGrantVesting,
  resolveEffectiveGrantShares,
  MarketRateContext,
} from '../engine/vesting';
import { getTotalGrossSalary, getEffectiveMaxMortgage } from '../engine/mortgage';
import { calculateIrishTaxBreakdown } from '../engine/tax';
import { InfoTooltip } from './InfoTooltip';

interface PersonalProfileHeaderProps {
  config: SimulationConfig;
  onChange: (updated: SimulationConfig) => void;
  isProfileLocked: boolean;
  onToggleProfileLock: () => void;
  onUpdateGrants: (grants: Grant[]) => void;
}

export const PersonalProfileHeader: React.FC<PersonalProfileHeaderProps> = memo(({
  config,
  onChange,
  isProfileLocked,
  onToggleProfileLock,
  onUpdateGrants,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const marketContext: MarketRateContext = {
    currentSharePriceUsd: config.equity_engine.current_share_price_usd,
    stockYearlyGrowthRate: config.equity_engine.stock_yearly_growth_rate,
    eurUsdSpot: config.macro.eur_usd_spot,
    eurUsdYearlyDrift: config.macro.eur_usd_yearly_drift,
  };

  const grants = config.equity_engine.grants;
  const vestingSummary = calculateGrantVestingSummary(
    grants,
    config.meta.start_date,
    config.meta.forecast_months,
    marketContext
  );
  const totalSalary = getTotalGrossSalary(config.mortgage);
  const cbiCalculatedLoan = totalSalary * (config.mortgage.cbi_max_lti_multiple || 4.0);
  const effectiveMaxLoan = getEffectiveMaxMortgage(config.mortgage);
  const hasCustomAip =
    config.mortgage.approval_in_principle_amount_eur !== undefined &&
    config.mortgage.approval_in_principle_amount_eur !== null &&
    config.mortgage.approval_in_principle_amount_eur > 0;

  const spot = config.macro.eur_usd_spot || 0.92;
  const stockPrice = config.equity_engine.current_share_price_usd || 200;
  const vestedSharesHeld = config.equity_engine.initial_vested_shares_held || 0;
  const totalStartingLiquid =
    (config.liquid_assets.cash_eur || 0) +
    (config.liquid_assets.cash_usd || 0) * spot +
    (config.liquid_assets.investments_eur || 0) +
    (config.liquid_assets.investments_usd || 0) * spot +
    vestedSharesHeld * stockPrice * spot;

  const totalSafetyPot =
    (config.liquid_assets.cash_safety_buffer_eur || 0) +
    (config.liquid_assets.cash_safety_buffer_usd || 0) * spot;

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

  const updateTax = (field: keyof NonNullable<SimulationConfig['tax']>, value: any) => {
    onChange({
      ...config,
      tax: {
        ...(config.tax || {
          standard_rate_cutoff_eur: 53000,
          tax_credits_eur: 9000,
          savings_calculation_mode: 'explicit',
          monthly_living_expenses_eur: 2500,
        }),
        [field]: value,
      },
    });
  };

  const baseSalary = config.mortgage.buyer_gross_annual_base_salary_eur ?? 190000;
  const taxBreakdown = calculateIrishTaxBreakdown(baseSalary, config.tax);
  const livingExpenses = config.tax?.monthly_living_expenses_eur ?? 2500;
  const currentRent = config.macro.current_monthly_rent_eur || 0;
  const derivedMonthlySavings = Math.max(0, taxBreakdown.netMonthlyTakeHome - currentRent - livingExpenses);
  const isNetPayDerived = config.tax?.savings_calculation_mode !== 'explicit';
  const activeMonthlySavings = isNetPayDerived ? derivedMonthlySavings : config.liquid_assets.monthly_salary_savings_eur;

  // Date Presets
  const getTodayDateStr = () => new Date().toISOString().slice(0, 10);
  const getFirstOfCurrentMonthStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  };
  const getFirstOfNextMonthStr = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const handleAddInitialGrant = () => {
    const newGrant: Grant = {
      id: `grant_${Date.now()}`,
      name: `Initial Hire Grant ${new Date().getFullYear()}`,
      type: 'initial',
      grant_date: config.meta.start_date,
      nomination_mode: 'shares',
      total_shares: 800,
      schedule_percents: [0.33, 0.33, 0.22, 0.12],
      vest_frequency_months: 1, // Monthly vesting (Google standard)
    };
    onUpdateGrants([...grants, newGrant]);
  };

  const handleAddRefresherGrant = () => {
    const newGrant: Grant = {
      id: `refresher_${Date.now()}`,
      name: `Annual Refresher ${new Date().getFullYear()}`,
      type: 'refresher',
      grant_date: config.meta.start_date,
      nomination_mode: 'eur',
      target_value_eur: 80000,
      total_shares: 0,
      schedule_percents: [0.25, 0.25, 0.25, 0.25],
      vest_frequency_months: 3, // Quarterly vesting
    };
    onUpdateGrants([...grants, newGrant]);
  };

  const handleDeleteGrant = (id: string) => {
    onUpdateGrants(grants.filter((g) => g.id !== id));
  };

  const handleUpdateGrant = (id: string, updates: Partial<Grant>) => {
    onUpdateGrants(
      grants.map((g) => {
        if (g.id !== id) return g;
        const updated = { ...g, ...updates };
        const effectiveShares = resolveEffectiveGrantShares(updated, config.meta.start_date, marketContext);
        return {
          ...updated,
          total_shares: updated.nomination_mode === 'shares' ? (updated.total_shares || 0) : effectiveShares,
        };
      })
    );
  };

  const salaryAdjustments = config.mortgage.salary_adjustments || [];

  const handleAddSalaryAdjustment = () => {
    const nextYearDate = addMonthsToDate(config.meta.start_date, (salaryAdjustments.length + 1) * 12)
      .toISOString()
      .slice(0, 10);
    const newAdjustment: SalaryAdjustment = {
      id: `salary_adj_${Date.now()}`,
      effective_date: nextYearDate,
      base_salary_eur: Math.round((config.mortgage.buyer_gross_annual_base_salary_eur || 190000) * 1.1),
      bonus_pct: config.mortgage.buyer_annual_bonus_pct ?? 0.20,
      bonus_eur: Math.round(
        (config.mortgage.buyer_gross_annual_base_salary_eur || 190000) * 1.1 * (config.mortgage.buyer_annual_bonus_pct ?? 0.20)
      ),
      note: 'Annual Review / Promo',
    };
    updateMortgage('salary_adjustments', [...salaryAdjustments, newAdjustment]);
  };

  const handleUpdateSalaryAdjustment = (id: string, updates: Partial<SalaryAdjustment>) => {
    const updated = salaryAdjustments.map((a) => {
      if (a.id !== id) return a;
      const merged = { ...a, ...updates };
      if (updates.base_salary_eur !== undefined || updates.bonus_pct !== undefined) {
        const base = merged.base_salary_eur;
        const pct = merged.bonus_pct ?? 0.20;
        merged.bonus_eur = Math.round(base * pct);
      }
      return merged;
    });
    updateMortgage('salary_adjustments', updated);
  };

  const handleDeleteSalaryAdjustment = (id: string) => {
    updateMortgage('salary_adjustments', salaryAdjustments.filter((a) => a.id !== id));
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
            <div className="flex items-center gap-2 flex-wrap">
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
              <span
                className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                title="All calculations run locally in your browser. Zero financial numbers are sent to any external server."
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                100% Private & In-Browser
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Your personal assets, salary, tax band, rent, and GSU grants remain stable while stress-testing economic drivers
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Quick Summary Pill Tags when collapsed */}
          {!isExpanded && (
            <div className="hidden xl:flex items-center gap-2 text-xs font-mono">
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
                {salaryAdjustments.length > 0 && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 ml-1 font-sans font-bold">
                    +{salaryAdjustments.length} step-up{salaryAdjustments.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                <span className="text-slate-400 text-[11px] font-sans">CBI 4.0x: </span>
                <span className="font-bold text-emerald-300">€{Math.round(effectiveMaxLoan / 1000)}k</span>
                {hasCustomAip && <span className="text-[9px] px-1 py-0.2 rounded bg-brand-500/20 text-brand-300 ml-1 font-sans font-bold">AIP</span>}
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                <span className="text-slate-400 text-[11px] font-sans">Liquid Net: </span>
                <span className="font-bold text-sky-400">€{Math.round(totalStartingLiquid / 1000)}k</span>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                <span className="text-slate-400 text-[11px] font-sans">Rent: </span>
                <span className="font-bold text-rose-400">€{config.macro.current_monthly_rent_eur.toLocaleString()}/mo</span>
              </div>

              <div
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300"
                title={`Monthly Savings: €${Math.round(activeMonthlySavings).toLocaleString()}/mo (${isNetPayDerived ? 'Dynamic Net-Pay Derived' : 'Fixed Explicit'})`}
              >
                <span className="text-slate-400 text-[11px] font-sans">Savings: </span>
                <span className="font-bold text-sky-300">€{Math.round(activeMonthlySavings).toLocaleString()}/mo</span>
                {isNetPayDerived && <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 ml-1 font-sans">auto</span>}
              </div>

              {/* Start Date Indicator in Banner */}
              <div className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-purple-500/30 text-purple-200 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-purple-400" />
                <span className="text-slate-400 text-[11px] font-sans">Start: </span>
                <span className="font-bold">{config.meta.start_date}</span>
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
            <span>{isExpanded ? 'Collapse Profile' : 'View / Edit Baseline'}</span>
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
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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

          {/* 3-Column Grid for Personal Profile Baseline */}
          <div className={`grid grid-cols-1 lg:grid-cols-3 gap-5 ${isProfileLocked ? 'opacity-85 pointer-events-none' : ''}`}>
            {/* COLUMN 1: Employment & Income Baseline */}
            <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-slate-200">Employment & Income Baseline</h4>
                </div>
                <InfoTooltip
                  title="Income & Borrowing Limits"
                  content="Enter Base Salary and Annual Bonus. Central Bank of Ireland rules cap standard borrowing at 4.0x Loan-To-Income (LTI). Future career promotions can be planned via Step-Ups below."
                />
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
                  className="w-full bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-white font-bold disabled:bg-slate-900 focus:outline-none"
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
              <div className="flex justify-between text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span>Total Gross: <strong className="text-white">€{totalSalary.toLocaleString()}</strong></span>
                <span>CBI 4.0x Limit: <strong className="text-emerald-400">€{cbiCalculatedLoan.toLocaleString()}</strong></span>
              </div>

              {/* Planned Future Salary Increases & Step-Ups */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-bold text-slate-300">Future Career Step-Ups ({salaryAdjustments.length})</span>
                  </div>
                  {!isProfileLocked && (
                    <button
                      onClick={handleAddSalaryAdjustment}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30"
                    >
                      <Plus className="w-3 h-3" /> Add Step-Up
                    </button>
                  )}
                </div>

                {salaryAdjustments.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">
                    No future salary adjustments configured. Compensation remains steady at baseline.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {salaryAdjustments.map((adj) => {
                      const offsetMonths = getCalendarMonthOffset(config.meta.start_date, new Date(adj.effective_date));
                      const bonusEur = adj.bonus_eur ?? adj.base_salary_eur * (adj.bonus_pct ?? 0.20);
                      const adjTotal = adj.base_salary_eur + bonusEur;
                      const adjCbi = adjTotal * (config.mortgage.cbi_max_lti_multiple || 4.0);
                      return (
                        <div
                          key={adj.id}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono text-[10px]">
                                {offsetMonths >= 0 ? `M${offsetMonths}` : 'Past'}
                              </span>
                              <input
                                type="date"
                                disabled={isProfileLocked}
                                value={adj.effective_date}
                                onChange={(e) => handleUpdateSalaryAdjustment(adj.id, { effective_date: e.target.value })}
                                className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-200 text-[10px] focus:outline-none"
                              />
                            </div>
                            {!isProfileLocked && (
                              <button
                                onClick={() => handleDeleteSalaryAdjustment(adj.id)}
                                className="text-slate-500 hover:text-rose-400 p-0.5"
                                title="Delete Step-Up"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <div>
                              <label className="text-slate-500 block text-[9px]">Base (€)</label>
                              <input
                                type="number"
                                step="5000"
                                disabled={isProfileLocked}
                                value={adj.base_salary_eur}
                                onChange={(e) =>
                                  handleUpdateSalaryAdjustment(adj.id, { base_salary_eur: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-white font-bold text-[10px] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 block text-[9px]">Bonus %</label>
                              <input
                                type="number"
                                step="1"
                                min="0"
                                max="100"
                                disabled={isProfileLocked}
                                value={Math.round((adj.bonus_pct ?? 0.20) * 100)}
                                onChange={(e) =>
                                  handleUpdateSalaryAdjustment(adj.id, { bonus_pct: (parseFloat(e.target.value) || 0) / 100 })
                                }
                                className="w-full bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-white font-bold text-[10px] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 block text-[9px]">Note / Event</label>
                              <input
                                type="text"
                                disabled={isProfileLocked}
                                placeholder="e.g. Promo"
                                value={adj.note || ''}
                                onChange={(e) => handleUpdateSalaryAdjustment(adj.id, { note: e.target.value })}
                                className="w-full bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-200 text-[10px] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/60">
                            <span>Total: <strong className="text-white">€{Math.round(adjTotal).toLocaleString()}</strong></span>
                            <span>New CBI 4.0x: <strong className="text-emerald-400">€{Math.round(adjCbi).toLocaleString()}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: Irish Tax & Cost of Living */}
            <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3.5 text-xs">
              <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800">
                <Building className="w-4 h-4 text-rose-400" />
                <h4 className="font-bold text-slate-200">Irish Tax & Living Baseline</h4>
              </div>

              {/* Current Monthly Rent */}
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

              {/* Standard Rate Cut-Off Point (SRCOP) with Quick Presets */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 block">Standard Rate Cut-Off (20% Band) (€)</label>
                  {!isProfileLocked && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateTax('standard_rate_cutoff_eur', 44000)}
                        className="text-[9px] px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        title="Single Person: €44,000"
                      >
                        Single €44k
                      </button>
                      <button
                        onClick={() => updateTax('standard_rate_cutoff_eur', 53000)}
                        className="text-[9px] px-1 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        title="Married (1 Earner): €53,000"
                      >
                        Married €53k
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  step="1000"
                  disabled={isProfileLocked}
                  value={config.tax?.standard_rate_cutoff_eur ?? 53000}
                  onChange={(e) => updateTax('standard_rate_cutoff_eur', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                />
              </div>

              {/* Annual Tax Credits */}
              <div>
                <label className="text-slate-400 block mb-1">Annual Tax Credits (€)</label>
                <input
                  type="number"
                  step="500"
                  disabled={isProfileLocked}
                  value={config.tax?.tax_credits_eur ?? 9000}
                  onChange={(e) => updateTax('tax_credits_eur', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                />
              </div>

              {/* Monthly Living Expenses & Dynamic Savings Mode */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1">
                    Monthly Living Expenses (€)
                    <InfoTooltip
                      title="Monthly Living Spend"
                      content="Groceries, dining, utilities, broadband, transport, gym, subscriptions (excluding rent and mortgage)."
                    />
                  </label>
                  {!isProfileLocked && (
                    <button
                      onClick={() =>
                        updateTax(
                          'savings_calculation_mode',
                          isNetPayDerived ? 'explicit' : 'net_pay_derived'
                        )
                      }
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold border transition-colors ${
                        isNetPayDerived
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      }`}
                      title={
                        isNetPayDerived
                          ? 'Click to switch to manual fixed savings input'
                          : 'Click to switch to automatic net-pay derived savings'
                      }
                    >
                      {isNetPayDerived ? '⚡ Auto-Derived' : 'Fixed Manual'}
                    </button>
                  )}
                </div>

                <input
                  type="number"
                  step="100"
                  min="0"
                  disabled={isProfileLocked}
                  value={config.tax?.monthly_living_expenses_eur ?? 2500}
                  onChange={(e) =>
                    updateTax('monthly_living_expenses_eur', parseFloat(e.target.value) || 0)
                  }
                  className="w-full bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                  placeholder="e.g. 2500"
                />

                {isNetPayDerived ? (
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-sky-500/20 space-y-1 text-[11px] font-sans">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Net Base Pay:</span>
                      <span className="text-emerald-300 font-mono">€{Math.round(taxBreakdown.netMonthlyTakeHome).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Rent Paid:</span>
                      <span className="text-rose-400 font-mono">-€{currentRent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Living Expenses:</span>
                      <span className="text-amber-300 font-mono">-€{livingExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-white font-bold">
                      <span className="text-sky-300">⚡ Dynamic Monthly Savings:</span>
                      <span className="text-sky-300 font-mono text-xs">€{Math.round(derivedMonthlySavings).toLocaleString()}/mo</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-slate-400 block mb-1">Fixed Manual Savings (€)</label>
                    <input
                      type="number"
                      step="250"
                      disabled={isProfileLocked}
                      value={config.liquid_assets.monthly_salary_savings_eur}
                      onChange={(e) =>
                        updateLiquidAssets('monthly_salary_savings_eur', parseFloat(e.target.value) || 0)
                      }
                      className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-amber-500/30 text-amber-200 font-bold focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Model Start Date with Quick Presets */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 block font-semibold text-purple-300 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>Model Start Date</span>
                  </label>
                  {!isProfileLocked && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => onChange({ ...config, meta: { ...config.meta, start_date: getTodayDateStr() } })}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
                        title="Set to today's date"
                      >
                        ⚡ Today
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange({ ...config, meta: { ...config.meta, start_date: getFirstOfCurrentMonthStr() } })}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
                        title="Set to 1st of current month"
                      >
                        ⚡ 1st Mth
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange({ ...config, meta: { ...config.meta, start_date: getFirstOfNextMonthStr() } })}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
                        title="Set to 1st of next month"
                      >
                        ⚡ Next Mth
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="date"
                  disabled={isProfileLocked}
                  value={config.meta.start_date}
                  onChange={(e) => onChange({ ...config, meta: { ...config.meta, start_date: e.target.value } })}
                  className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* COLUMN 3: Cash, Liquid Investments & Safety Pot */}
            <div className="bg-slate-850 p-4 rounded-xl border border-slate-750 space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-sky-400" />
                  <h4 className="font-bold text-slate-200">Liquid Assets & Safety Pot</h4>
                </div>
                <InfoTooltip
                  title="Liquid Wealth Portfolio"
                  content="Bank cash, personal trading accounts (ETFs/stocks), and already-vested company shares held at 0% tax. The safety pot is reserved and never spent on purchase."
                />
              </div>

              {/* Liquid Cash */}
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

              {/* Separate Trading Accounts */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Trading Inv EUR (€)</label>
                  <input
                    type="number"
                    step="5000"
                    disabled={isProfileLocked}
                    value={config.liquid_assets.investments_eur}
                    onChange={(e) => updateLiquidAssets('investments_eur', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                    title="Liquid funds & ETF investments in separate EUR trading account"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Trading Inv USD ($)</label>
                  <input
                    type="number"
                    step="5000"
                    disabled={isProfileLocked}
                    value={config.liquid_assets.investments_usd}
                    onChange={(e) => updateLiquidAssets('investments_usd', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 text-white font-bold focus:outline-none"
                    title="Liquid stocks & instruments in separate USD trading account"
                  />
                </div>
              </div>

              {/* Currently Held Vested RSUs / GOOGL Shares */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400 block font-semibold text-purple-300">
                    Vested {config.meta.stock_symbol || 'GOOGL'} Held (at Start)
                  </label>
                  <span className="text-[10px] text-purple-300 font-mono font-bold">
                    €{Math.round((config.equity_engine.initial_vested_shares_held ?? 0) * config.equity_engine.current_share_price_usd * config.macro.eur_usd_spot).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center bg-slate-800 px-2.5 py-1.5 rounded-lg border border-purple-500/30">
                  <input
                    type="number"
                    step="10"
                    min="0"
                    disabled={isProfileLocked}
                    value={config.equity_engine.initial_vested_shares_held ?? 300}
                    onChange={(e) => updateEquityEngine('initial_vested_shares_held', parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-purple-200 font-bold focus:outline-none"
                  />
                  <span className="text-slate-400 text-[10px] ml-1">shares</span>
                </div>
              </div>

              {/* Cash Safety Pot (Untouchable Emergency Buffer) */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-slate-300 font-semibold flex items-center gap-1">
                    <span className="text-sky-300">🛡️ Cash Safety Pot</span>
                    <InfoTooltip
                      title="Cash Safety Pot (Emergency Buffer)"
                      content="Reserved liquid cash in EUR and USD that will NEVER be spent on property deposits, stamp duty, or legal fees. The model guarantees this cash buffer remains untouched in your bank account post-purchase."
                    />
                  </label>
                  {!isProfileLocked && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => {
                          const totalMonthlyBurn = (config.tax?.monthly_living_expenses_eur ?? 2500) + currentRent;
                          const sixMonthsBurn = Math.round(totalMonthlyBurn * 6);
                          onChange({
                            ...config,
                            liquid_assets: {
                              ...config.liquid_assets,
                              cash_safety_buffer_eur: sixMonthsBurn,
                            },
                          });
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded font-bold border bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30 transition-colors"
                        title="Set emergency buffer to 6 months essential burn"
                      >
                        ⚡ 6M Burn
                      </button>

                      <button
                        onClick={() => {
                          const sixMonthsNetPay = Math.round(taxBreakdown.netMonthlyTakeHome * 6);
                          onChange({
                            ...config,
                            liquid_assets: {
                              ...config.liquid_assets,
                              cash_safety_buffer_eur: sixMonthsNetPay,
                            },
                          });
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded font-bold border bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30 transition-colors"
                        title="Set emergency buffer to 6 months net take-home pay"
                      >
                        ⚡ 6M Net Pay
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Safety Pot EUR (€)</label>
                    <input
                      type="number"
                      step="2500"
                      min="0"
                      disabled={isProfileLocked}
                      placeholder="e.g. 15000"
                      value={config.liquid_assets.cash_safety_buffer_eur ?? 0}
                      onChange={(e) => updateLiquidAssets('cash_safety_buffer_eur', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-sky-500/30 text-sky-200 font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Safety Pot USD ($)</label>
                    <input
                      type="number"
                      step="2500"
                      min="0"
                      disabled={isProfileLocked}
                      placeholder="e.g. 0"
                      value={config.liquid_assets.cash_safety_buffer_usd ?? 0}
                      onChange={(e) => updateLiquidAssets('cash_safety_buffer_usd', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-800 px-2.5 py-1.5 rounded-lg border border-sky-500/30 text-sky-200 font-bold focus:outline-none"
                    />
                  </div>
                </div>

                {((config.liquid_assets.cash_safety_buffer_eur || 0) > 0 || (config.liquid_assets.cash_safety_buffer_usd || 0) > 0) && (
                  <div className="flex justify-between items-center text-[10.5px] bg-sky-950/40 px-2 py-1 rounded border border-sky-800/40 text-sky-300">
                    <span>Protected Reserve:</span>
                    <span className="font-mono font-bold">
                      €{Math.round(totalSafetyPot).toLocaleString()}
                    </span>
                  </div>
                )}
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
                    <strong className="text-purple-300 font-semibold">{vestingSummary.unvestedGrossShares.toLocaleString()} unvested shs</strong> (≈ €{vestingSummary.unvestedGrossEur.toLocaleString()} / ${vestingSummary.unvestedGrossUsd.toLocaleString()} • Net: €{vestingSummary.unvestedNetEur.toLocaleString()}) across {grants.length} grants •
                    {config.macro.use_manual_market_override ? (
                      <span className="text-rose-400 font-semibold ml-1 font-mono">
                        [OVERRIDE: ${config.equity_engine.current_share_price_usd.toFixed(1)}/sh @ {config.macro.eur_usd_spot.toFixed(3)} €/$]
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium ml-1 font-mono">
                        [MARKET FEED: ${config.equity_engine.current_share_price_usd.toFixed(1)}/sh @ {config.macro.eur_usd_spot.toFixed(3)} €/$]
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {!isProfileLocked ? (
                <div className="flex items-center flex-wrap gap-2">
                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-purple-500/30 text-xs">
                    <span className="text-purple-300 text-[11px]">Price: $</span>
                    <input
                      type="number"
                      step="1"
                      value={config.equity_engine.current_share_price_usd}
                      onChange={(e) => {
                        updateEquityEngine('current_share_price_usd', parseFloat(e.target.value) || 0);
                        updateMacro('use_manual_market_override', true);
                      }}
                      className="w-16 bg-transparent text-white font-bold font-mono focus:outline-none"
                      title="Set custom stock price (activates manual override)"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-purple-500/30 text-xs">
                    <span className="text-purple-300 text-[11px]">€/$:</span>
                    <input
                      type="number"
                      step="0.005"
                      value={config.macro.eur_usd_spot}
                      onChange={(e) => {
                        updateMacro('eur_usd_spot', parseFloat(e.target.value) || 0);
                        updateMacro('use_manual_market_override', true);
                      }}
                      className="w-16 bg-transparent text-white font-bold font-mono focus:outline-none"
                      title="Set custom EUR/USD spot rate (activates manual override)"
                    />
                  </div>

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
              ) : null}
            </div>

            {/* Grant Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {grants.map((grant) => {
                const mode = grant.nomination_mode || 'shares';
                const breakdown = calculateSingleGrantVesting(
                  grant,
                  config.meta.start_date,
                  marketContext,
                  config.equity_engine.marginal_tax_rate_ireland
                );

                const effectiveShares = breakdown.totalShares;
                const activeGrantPrice = breakdown.grantPriceUsd;
                const activeFxRate = breakdown.grantFxRate;
                const netShares = breakdown.pastNet + breakdown.unvestedNet;

                return (
                  <div
                    key={grant.id}
                    className="bg-slate-850 border border-slate-750 hover:border-purple-500/30 rounded-xl p-3 space-y-2 transition-all"
                  >
                    {/* 1. Header Line: Title, Type badge, Grant Date, Unvested, Delete */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="text"
                          disabled={isProfileLocked}
                          value={grant.name || grant.id}
                          onChange={(e) => handleUpdateGrant(grant.id, { name: e.target.value })}
                          className="bg-transparent font-semibold text-xs text-white focus:outline-none focus:border-b border-purple-500 truncate"
                          placeholder="Grant Name"
                        />
                        <span className="capitalize px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[9px] shrink-0">
                          {grant.type}
                        </span>
                        <input
                          type="date"
                          disabled={isProfileLocked}
                          value={grant.grant_date}
                          onChange={(e) => handleUpdateGrant(grant.id, { grant_date: e.target.value })}
                          className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700 text-[10px] focus:outline-none shrink-0"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-purple-300 font-mono font-semibold bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">
                          {breakdown.unvestedGross.toLocaleString()} unvested
                        </span>
                        {!isProfileLocked && (
                          <button
                            onClick={() => handleDeleteGrant(grant.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove grant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2. Mode Switcher & 3-Currency Equivalence Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-[10px] font-semibold mr-1">Mode:</span>
                        <button
                          type="button"
                          disabled={isProfileLocked}
                          onClick={() => handleUpdateGrant(grant.id, {
                            nomination_mode: 'eur',
                            target_value_eur: grant.target_value_eur || breakdown.totalGrossEur || 80000,
                          })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            mode === 'eur'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          EUR (€)
                        </button>
                        <button
                          type="button"
                          disabled={isProfileLocked}
                          onClick={() => handleUpdateGrant(grant.id, {
                            nomination_mode: 'usd',
                            target_value_usd: grant.target_value_usd || breakdown.totalGrossUsd || 100000,
                          })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            mode === 'usd'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          USD ($)
                        </button>
                        <button
                          type="button"
                          disabled={isProfileLocked}
                          onClick={() => handleUpdateGrant(grant.id, {
                            nomination_mode: 'shares',
                            total_shares: effectiveShares || 200,
                          })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                            mode === 'shares'
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Shares (#)
                        </button>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                        <span>
                          €<strong className="text-purple-200">{Math.round(breakdown.totalGrossEur / 1000)}k</strong>{' '}
                          <span className="text-[10px] text-emerald-400 font-normal">(€{Math.round(breakdown.totalNetEur / 1000)}k net)</span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>
                          $<strong className="text-slate-200">{Math.round(breakdown.totalGrossUsd / 1000)}k</strong>{' '}
                          <span className="text-[10px] text-slate-400 font-normal">(${Math.round(breakdown.totalNetUsd / 1000)}k net)</span>
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>
                          <strong className="text-amber-300">{effectiveShares}</strong>{' '}
                          <span className="text-[10px] text-amber-400 font-normal">({netShares} net)</span>
                        </span>
                      </div>
                    </div>

                    {/* 3. Input & Reference Pricing Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Left Column: Active Value Input + Presets */}
                      <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800 space-y-1.5">
                        {mode === 'eur' && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-medium">Target EUR (€)</span>
                              <div className="flex items-center gap-1">
                                {[40, 60, 80, 100, 120].map((k) => (
                                  <button
                                    key={k}
                                    type="button"
                                    disabled={isProfileLocked}
                                    onClick={() => handleUpdateGrant(grant.id, { target_value_eur: k * 1000 })}
                                    className={`px-1 py-0.2 rounded text-[9px] font-bold border transition-colors ${
                                      grant.target_value_eur === k * 1000
                                        ? 'bg-purple-500/30 text-purple-200 border-purple-500/50'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                    }`}
                                  >
                                    €{k}k
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex-1">
                                <span className="text-purple-400 font-bold text-xs mr-1">€</span>
                                <input
                                  type="number"
                                  step="5000"
                                  min="0"
                                  disabled={isProfileLocked}
                                  value={grant.target_value_eur || 0}
                                  onChange={(e) => handleUpdateGrant(grant.id, { target_value_eur: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-transparent font-mono font-bold text-xs text-white focus:outline-none"
                                />
                              </div>
                              <select
                                disabled={isProfileLocked}
                                value={grant.vest_frequency_months}
                                onChange={(e) => handleUpdateGrant(grant.id, { vest_frequency_months: parseInt(e.target.value) || 12 })}
                                className="bg-slate-800 px-2 py-0.5 rounded text-xs font-semibold text-slate-200 border border-slate-700 focus:outline-none"
                              >
                                <option value={12}>12m (Yr)</option>
                                <option value={6}>6m (Half)</option>
                                <option value={3}>3m (Qtr)</option>
                                <option value={1}>1m (Mth)</option>
                              </select>
                            </div>
                          </>
                        )}

                        {mode === 'usd' && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-medium">Target USD ($)</span>
                              <div className="flex items-center gap-1">
                                {[50, 75, 100, 125, 150].map((k) => (
                                  <button
                                    key={k}
                                    type="button"
                                    disabled={isProfileLocked}
                                    onClick={() => handleUpdateGrant(grant.id, { target_value_usd: k * 1000 })}
                                    className={`px-1 py-0.2 rounded text-[9px] font-bold border transition-colors ${
                                      grant.target_value_usd === k * 1000
                                        ? 'bg-purple-500/30 text-purple-200 border-purple-500/50'
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                                    }`}
                                  >
                                    ${k}k
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex-1">
                                <span className="text-purple-400 font-bold text-xs mr-1">$</span>
                                <input
                                  type="number"
                                  step="5000"
                                  min="0"
                                  disabled={isProfileLocked}
                                  value={grant.target_value_usd || 0}
                                  onChange={(e) => handleUpdateGrant(grant.id, { target_value_usd: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-transparent font-mono font-bold text-xs text-white focus:outline-none"
                                />
                              </div>
                              <select
                                disabled={isProfileLocked}
                                value={grant.vest_frequency_months}
                                onChange={(e) => handleUpdateGrant(grant.id, { vest_frequency_months: parseInt(e.target.value) || 12 })}
                                className="bg-slate-800 px-2 py-0.5 rounded text-xs font-semibold text-slate-200 border border-slate-700 focus:outline-none"
                              >
                                <option value={12}>12m (Yr)</option>
                                <option value={6}>6m (Half)</option>
                                <option value={3}>3m (Qtr)</option>
                                <option value={1}>1m (Mth)</option>
                              </select>
                            </div>
                          </>
                        )}

                        {mode === 'shares' && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-medium">Total Granted Shares</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {breakdown.pastGross > 0 ? `${breakdown.pastGross} past • ` : ''}{breakdown.unvestedGross} unvested
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center bg-slate-800 px-2 py-0.5 rounded border border-slate-700 flex-1">
                                <input
                                  type="number"
                                  disabled={isProfileLocked}
                                  value={grant.total_shares}
                                  onChange={(e) => handleUpdateGrant(grant.id, { total_shares: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-transparent font-mono font-bold text-xs text-white focus:outline-none"
                                />
                                <span className="text-xs text-slate-400 font-mono ml-1">shs</span>
                              </div>
                              <select
                                disabled={isProfileLocked}
                                value={grant.vest_frequency_months}
                                onChange={(e) => handleUpdateGrant(grant.id, { vest_frequency_months: parseInt(e.target.value) || 12 })}
                                className="bg-slate-800 px-2 py-0.5 rounded text-xs font-semibold text-slate-200 border border-slate-700 focus:outline-none"
                              >
                                <option value={12}>12m (Yr)</option>
                                <option value={6}>6m (Half)</option>
                                <option value={3}>3m (Qtr)</option>
                                <option value={1}>1m (Mth)</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Right Column: Date Reference Price ($) & FX (€/$) */}
                      <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800 space-y-1.5 flex flex-col justify-center">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-medium flex items-center gap-1">
                            {breakdown.isHistorical ? (
                              <span className="text-amber-400 font-semibold">📅 Historical Price at Grant:</span>
                            ) : (
                              <span className="text-indigo-300 font-semibold">📈 Projected Price at Grant:</span>
                            )}
                          </span>
                          {breakdown.isHistorical && (
                            <button
                              type="button"
                              disabled={isProfileLocked}
                              onClick={() => handleUpdateGrant(grant.id, {
                                grant_price_usd: breakdown.benchmarkPriceUsd,
                                grant_fx_rate: breakdown.benchmarkFxRate,
                              })}
                              className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 transition-colors font-mono"
                              title={`Fill historical average closing for GOOGL (${breakdown.benchmarkLabel}: $${breakdown.benchmarkPriceUsd} @ ${breakdown.benchmarkFxRate} €/$)`}
                            >
                              ⚡ Use {breakdown.benchmarkLabel}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <div className="flex items-center bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 flex-1">
                            <span className="text-slate-400 text-[10px] mr-1">$</span>
                            <input
                              type="number"
                              step="1"
                              min="0"
                              disabled={isProfileLocked}
                              value={grant.grant_price_usd ?? ''}
                              placeholder={activeGrantPrice.toFixed(1)}
                              onChange={(e) => handleUpdateGrant(grant.id, { grant_price_usd: e.target.value ? parseFloat(e.target.value) : undefined })}
                              className="w-full bg-transparent font-bold text-slate-200 placeholder-slate-500 focus:outline-none text-[11px]"
                              title="Stock Price ($ USD) at Grant Date"
                            />
                          </div>

                          <span className="text-slate-500">@</span>

                          <div className="flex items-center bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 flex-1">
                            <span className="text-slate-400 text-[10px] mr-1">€</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              disabled={isProfileLocked}
                              value={grant.grant_fx_rate ?? ''}
                              placeholder={activeFxRate.toFixed(2)}
                              onChange={(e) => handleUpdateGrant(grant.id, { grant_fx_rate: e.target.value ? parseFloat(e.target.value) : undefined })}
                              className="w-full bg-transparent font-bold text-slate-200 placeholder-slate-500 focus:outline-none text-[11px]"
                              title="EUR/USD FX Rate (€ per $) at Grant Date"
                            />
                          </div>

                          <div className="bg-purple-950/40 border border-purple-500/30 px-1.5 py-0.5 rounded text-[11px] text-purple-200 font-bold shrink-0">
                            = €{(activeGrantPrice * activeFxRate).toFixed(1)}/sh
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Compact Milestones Visual Timeline */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {grant.schedule_percents.map((pct, idx) => {
                        const milestoneMonths = (idx + 1) * grant.vest_frequency_months;
                        const milestoneDate = addMonthsToDate(grant.grant_date, milestoneMonths);
                        const offset = getCalendarMonthOffset(config.meta.start_date, milestoneDate);
                        const isPast = offset <= 0;
                        const grossShares = effectiveShares * pct;
                        const milestoneGrossUsd = Math.round(grossShares * activeGrantPrice);
                        const milestoneGrossEur = Math.round(milestoneGrossUsd * activeFxRate);
                        const milestoneNetEur = Math.round(milestoneGrossEur * (1 - config.equity_engine.marginal_tax_rate_ireland));
                        const milestoneNetShares = Math.round(grossShares * (1 - config.equity_engine.marginal_tax_rate_ireland));

                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10.5px] font-mono transition-all ${
                              isPast
                                ? 'bg-slate-900/60 border-slate-800 text-slate-500'
                                : 'bg-slate-900 border-purple-500/30 text-slate-200'
                            }`}
                            title={`Milestone ${idx + 1}: ${milestoneDate.toISOString().slice(0, 7)} (Month ${offset}) • ${grossShares} shs (${milestoneNetShares} net after 52% tax) = €${milestoneNetEur.toLocaleString()} net`}
                          >
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                isPast ? 'bg-slate-800 text-slate-400' : 'bg-purple-500/20 text-purple-300'
                              }`}
                            >
                              {isPast ? 'Past' : `M${offset}`}
                            </span>
                            <span>{Math.round(pct * 100)}%:</span>
                            <span className={isPast ? 'text-slate-400' : 'text-purple-300 font-bold'}>
                              {Math.round(grossShares)} shs
                            </span>
                            <span className="text-slate-500 text-[9px]">
                              (€{Math.round(milestoneNetEur / 1000)}k net)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
export default PersonalProfileHeader;
