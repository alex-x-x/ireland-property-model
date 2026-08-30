import React from 'react';
import { Plus, Trash2, Award, CheckCircle2, Clock, Lock, DollarSign, Euro, Hash } from 'lucide-react';
import { Grant, SimulationConfig } from '../engine/types';
import {
  addMonthsToDate,
  getCalendarMonthOffset,
  resolveEffectiveGrantShares,
  calculateGrantVestingSummary,
  calculateSingleGrantVesting,
  MarketRateContext,
} from '../engine/vesting';

interface GrantsManagerProps {
  config: SimulationConfig;
  onUpdateGrants: (grants: Grant[]) => void;
  isProfileLocked?: boolean;
  onUnlockProfile?: () => void;
}

export const GrantsManager: React.FC<GrantsManagerProps> = ({
  config,
  onUpdateGrants,
  isProfileLocked = false,
  onUnlockProfile,
}) => {
  const grants = config.equity_engine.grants;

  const marketContext: MarketRateContext = {
    currentSharePriceUsd: config.equity_engine.current_share_price_usd,
    stockYearlyGrowthRate: config.equity_engine.stock_yearly_growth_rate,
    eurUsdSpot: config.macro.eur_usd_spot,
    eurUsdYearlyDrift: config.macro.eur_usd_yearly_drift,
  };

  const summary = calculateGrantVestingSummary(
    grants,
    config.meta.start_date,
    config.meta.forecast_months,
    marketContext,
    config.equity_engine.marginal_tax_rate_ireland
  );

  const handleAddInitialGrant = () => {
    if (isProfileLocked && onUnlockProfile) {
      onUnlockProfile();
    }
    const newGrant: Grant = {
      id: `grant_${Date.now()}`,
      name: `Initial Hire Grant ${new Date().getFullYear()}`,
      type: 'initial',
      grant_date: config.meta.start_date,
      nomination_mode: 'shares',
      total_shares: 800,
      schedule_percents: [0.33, 0.33, 0.22, 0.12],
      vest_frequency_months: 1, // Monthly vesting (Google Standard)
    };
    onUpdateGrants([...grants, newGrant]);
  };

  const handleAddRefresherGrant = () => {
    if (isProfileLocked && onUnlockProfile) {
      onUnlockProfile();
    }
    const newGrant: Grant = {
      id: `refresher_${Date.now()}`,
      name: `Annual Refresher ${new Date().getFullYear()}`,
      type: 'refresher',
      grant_date: config.meta.start_date,
      nomination_mode: 'eur',
      target_value_eur: 80000, // Standard €80k Dublin tech refresher
      total_shares: 0,
      schedule_percents: [0.25, 0.25, 0.25, 0.25],
      vest_frequency_months: 3, // Quarterly vesting
    };
    onUpdateGrants([...grants, newGrant]);
  };

  const handleDeleteGrant = (id: string) => {
    if (isProfileLocked && onUnlockProfile) {
      onUnlockProfile();
    }
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Google Stock Unit (GSU) Grants</h3>
              {isProfileLocked && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Locked Baseline
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Clear side-by-side valuation in <strong>EUR (€)</strong>, <strong>USD ($)</strong>, and <strong>Stock Units (#)</strong> with 52% Irish marginal tax
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleAddRefresherGrant}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-medium rounded-lg border border-purple-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ EUR Refresher (€80k)</span>
          </button>

          <button
            onClick={handleAddInitialGrant}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg shadow-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Initial Grant (33/33/22/12)</span>
          </button>
        </div>
      </div>

      {/* Portfolio Multi-Currency KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
            Unvested GSU Portfolio
          </span>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-purple-300 font-mono">
              {summary.unvestedGrossShares.toLocaleString()} shs
            </span>
            <span className="text-xs font-semibold text-emerald-400 font-mono">
              €{summary.unvestedGrossEur.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              (${summary.unvestedGrossUsd.toLocaleString()})
            </span>
          </div>
          <span className="text-[10px] text-purple-400 block font-mono">
            Net Retained: {Math.round(summary.unvestedGrossShares * (1 - config.equity_engine.marginal_tax_rate_ireland)).toLocaleString()} shs • €{summary.unvestedNetEur.toLocaleString()} (${summary.unvestedNetUsd.toLocaleString()})
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
            Past Vested / Retained
          </span>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-slate-200 font-mono">
              {summary.pastVestedGrossShares.toLocaleString()} shs
            </span>
            <span className="text-xs font-semibold text-slate-300 font-mono">
              €{summary.pastVestedGrossEur.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              (${summary.pastVestedGrossUsd.toLocaleString()})
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">
            Net Retained: {Math.round(summary.pastVestedGrossShares * (1 - config.equity_engine.marginal_tax_rate_ireland)).toLocaleString()} shs • €{summary.pastVestedNetEur.toLocaleString()}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
            Total Granted Lifetime
          </span>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-indigo-300 font-mono">
              {summary.totalGrantedShares.toLocaleString()} shs
            </span>
            <span className="text-xs font-semibold text-indigo-200 font-mono">
              €{summary.totalGrantedEur.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              (${summary.totalGrantedUsd.toLocaleString()})
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">
            Across {grants.length} active grant tranches
          </span>
        </div>
      </div>

      {/* Grant Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              className="bg-slate-850 border border-slate-750 hover:border-purple-500/30 rounded-xl p-4 transition-all space-y-3"
            >
              {/* Card Header: Name, Type, Grant Date, Delete */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    disabled={isProfileLocked}
                    value={grant.name || grant.id}
                    onChange={(e) => handleUpdateGrant(grant.id, { name: e.target.value })}
                    className="bg-transparent font-semibold text-sm text-white focus:outline-none focus:border-b border-purple-500 w-full disabled:opacity-90"
                    placeholder="Grant Name"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">
                      {grant.type}
                    </span>
                    <span>Grant Date:</span>
                    <input
                      type="date"
                      disabled={isProfileLocked}
                      value={grant.grant_date}
                      onChange={(e) => handleUpdateGrant(grant.id, { grant_date: e.target.value })}
                      className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:opacity-80"
                    />
                  </div>
                </div>

                {!isProfileLocked && (
                  <button
                    onClick={() => handleDeleteGrant(grant.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove grant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 3-Unit Value Display (EUR / USD / Shares) */}
              <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-center font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-semibold">EUR (€)</span>
                  <strong className="text-xs text-purple-200 block">€{breakdown.totalGrossEur.toLocaleString()}</strong>
                  <span className="text-[9px] text-emerald-400 block">Net: €{breakdown.totalNetEur.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-semibold">USD ($)</span>
                  <strong className="text-xs text-slate-200 block">${breakdown.totalGrossUsd.toLocaleString()}</strong>
                  <span className="text-[9px] text-slate-400 block">Net: ${breakdown.totalNetUsd.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-semibold">Shares (#)</span>
                  <strong className="text-xs text-amber-300 block">{effectiveShares.toLocaleString()} shs</strong>
                  <span className="text-[9px] text-amber-400 block">Net: {netShares.toLocaleString()} shs</span>
                </div>
              </div>

              {/* Nomination Mode Switcher */}
              <div className="bg-slate-900/60 p-1 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px] font-semibold px-1.5">Input Mode:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isProfileLocked}
                    onClick={() => handleUpdateGrant(grant.id, {
                      nomination_mode: 'eur',
                      target_value_eur: grant.target_value_eur || breakdown.totalGrossEur || 80000,
                    })}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                      mode === 'eur'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Euro className="w-3 h-3" />
                    <span>EUR (€)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isProfileLocked}
                    onClick={() => handleUpdateGrant(grant.id, {
                      nomination_mode: 'usd',
                      target_value_usd: grant.target_value_usd || breakdown.totalGrossUsd || 100000,
                    })}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                      mode === 'usd'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <DollarSign className="w-3 h-3" />
                    <span>USD ($)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isProfileLocked}
                    onClick={() => handleUpdateGrant(grant.id, {
                      nomination_mode: 'shares',
                      total_shares: effectiveShares || 200,
                    })}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                      mode === 'shares'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Hash className="w-3 h-3" />
                    <span>Shares (#)</span>
                  </button>
                </div>
              </div>

              {/* Mode-Specific Input Section */}
              {mode === 'eur' && (
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300 font-semibold">Target Monetary Refresher (€ EUR)</span>
                    <div className="flex items-center gap-1">
                      {[40, 60, 80, 100, 120].map((k) => (
                        <button
                          key={k}
                          type="button"
                          disabled={isProfileLocked}
                          onClick={() => handleUpdateGrant(grant.id, { target_value_eur: k * 1000 })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Target Value</span>
                      <div className="flex items-center bg-slate-800 px-2 py-1 rounded border border-slate-700">
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
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5" title="Preceding month average closing price (or projected future price)">
                        Grant Price ($USD)
                      </span>
                      <div className="flex items-center bg-slate-800 px-2 py-1 rounded border border-slate-700">
                        <span className="text-slate-400 font-bold text-xs mr-1">$</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          disabled={isProfileLocked}
                          value={grant.grant_price_usd ?? ''}
                          placeholder={activeGrantPrice.toFixed(1)}
                          onChange={(e) => handleUpdateGrant(grant.id, { grant_price_usd: e.target.value ? parseFloat(e.target.value) : undefined })}
                          className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5" title="EUR/USD FX conversion rate">
                        Grant FX Rate ($/€)
                      </span>
                      <div className="flex items-center bg-slate-800 px-2 py-1 rounded border border-slate-700">
                        <span className="text-slate-400 font-bold text-xs mr-1">€</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isProfileLocked}
                          value={grant.grant_fx_rate ?? ''}
                          placeholder={activeFxRate.toFixed(2)}
                          onChange={(e) => handleUpdateGrant(grant.id, { grant_fx_rate: e.target.value ? parseFloat(e.target.value) : undefined })}
                          className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Calculated Conversion Summary */}
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800 text-slate-400 font-mono">
                    <span>
                      1 Share = <strong className="text-slate-200">€{(activeGrantPrice * activeFxRate).toFixed(2)}</strong> (${activeGrantPrice.toFixed(2)} @ {activeFxRate.toFixed(2)})
                    </span>
                    <span>
                      Gross: <strong className="text-purple-300 font-bold">{effectiveShares} shs</strong> (Net: <strong className="text-emerald-400">{netShares} shs</strong>)
                    </span>
                  </div>
                </div>
              )}

              {mode === 'usd' && (
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300 font-semibold">Target Monetary Refresher ($ USD)</span>
                    <div className="flex items-center gap-1">
                      {[50, 75, 100, 125, 150].map((k) => (
                        <button
                          key={k}
                          type="button"
                          disabled={isProfileLocked}
                          onClick={() => handleUpdateGrant(grant.id, { target_value_usd: k * 1000 })}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Target Value</span>
                      <div className="flex items-center bg-slate-800 px-2 py-1 rounded border border-slate-700">
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
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Grant Price ($USD)</span>
                      <div className="flex items-center bg-slate-800 px-2 py-1 rounded border border-slate-700">
                        <span className="text-slate-400 font-bold text-xs mr-1">$</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          disabled={isProfileLocked}
                          value={grant.grant_price_usd ?? ''}
                          placeholder={activeGrantPrice.toFixed(1)}
                          onChange={(e) => handleUpdateGrant(grant.id, { grant_price_usd: e.target.value ? parseFloat(e.target.value) : undefined })}
                          className="w-full bg-transparent font-mono text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800 text-slate-400 font-mono">
                    <span>Target: ${(grant.target_value_usd || 0).toLocaleString()} @ ${activeGrantPrice.toFixed(2)}/sh</span>
                    <span>
                      Gross: <strong className="text-purple-300 font-bold">{effectiveShares} shs</strong> (Net: <strong className="text-emerald-400">{netShares} shs</strong>)
                    </span>
                  </div>
                </div>
              )}

              {mode === 'shares' && (
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 block font-medium">Total Gross Shares</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ≈ €{breakdown.totalGrossEur.toLocaleString()} (${breakdown.totalGrossUsd.toLocaleString()})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      disabled={isProfileLocked}
                      value={grant.total_shares}
                      onChange={(e) => handleUpdateGrant(grant.id, { total_shares: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-800 px-2 py-1 rounded text-sm font-bold text-white border border-slate-700 focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:bg-slate-900 disabled:text-slate-300"
                    />
                    <span className="text-xs text-slate-400 font-mono">shs</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-purple-400 font-mono pt-0.5 border-t border-slate-800">
                    <span>Net Retained: ~{netShares} shs</span>
                    <span>Net Value: €{breakdown.totalNetEur.toLocaleString()} (${breakdown.totalNetUsd.toLocaleString()})</span>
                  </div>
                </div>
              )}

              {/* Vesting Frequency & Schedule */}
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-400 block font-medium">Vesting Frequency</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {grant.schedule_percents.length} cliffs ({grant.schedule_percents.map((p) => `${Math.round(p * 100)}%`).join(' / ')})
                  </span>
                </div>
                <select
                  disabled={isProfileLocked}
                  value={grant.vest_frequency_months}
                  onChange={(e) => handleUpdateGrant(grant.id, { vest_frequency_months: parseInt(e.target.value) || 12 })}
                  className="w-full bg-slate-800 px-2 py-1 rounded text-xs font-semibold text-slate-200 border border-slate-700 focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:bg-slate-900 disabled:text-slate-400"
                >
                  <option value={12}>Annual (Every 12 Mo)</option>
                  <option value={6}>Semi-Annual (Every 6 Mo)</option>
                  <option value={3}>Quarterly (Every 3 Mo)</option>
                  <option value={1}>Monthly (Every 1 Mo — Google Standard)</option>
                </select>
              </div>

              {/* Milestones Visual Timeline */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block">
                    Vesting Cliff Schedule
                  </span>
                  <span className="text-[10px] text-purple-300 font-mono">
                    {effectiveShares} shs • €{breakdown.totalGrossEur.toLocaleString()} • ${breakdown.totalGrossUsd.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
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
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border font-medium ${
                          isPast
                            ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                            : 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                        }`}
                        title={`${isPast ? 'Vested in past' : `Vests at Month ${offset}`} on ${milestoneDate.toISOString().slice(0, 10)}
• Gross: ${Math.round(grossShares)} shs = €${milestoneGrossEur.toLocaleString()} ($${milestoneGrossUsd.toLocaleString()})
• Net Retained (post-52% tax): ${milestoneNetShares} shs = €${milestoneNetEur.toLocaleString()}`}
                      >
                        {isPast ? (
                          <CheckCircle2 className="w-3 h-3 text-slate-500" />
                        ) : (
                          <Clock className="w-3 h-3 text-purple-400" />
                        )}
                        <span>
                          {grant.vest_frequency_months === 1
                            ? `Yr ${idx + 1}`
                            : `Q${idx + 1}`}: {Math.round(pct * 100)}% ({Math.round(grossShares)} shs • €{Math.round(milestoneGrossEur / 1000)}k)
                        </span>
                        {isPast ? (
                          <span className="text-[9px] text-slate-500 uppercase">Past</span>
                        ) : (
                          <span className="text-[9px] font-bold text-purple-300">M{offset}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
