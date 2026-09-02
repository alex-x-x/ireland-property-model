import React, { useState, memo, useMemo } from 'react';
import { Grid, Loader2, Clock, Sparkles, X, Compass } from 'lucide-react';
import { SimulationConfig } from '../engine/types';
import {
  SENSITIVITY_STOCK_RATES,
  SENSITIVITY_PROP_RATES,
  SensitivityWaitMode,
  calculateBreakevenStockRate,
  getDynamicSensitivityRates,
} from '../engine/sensitivity';
import { useSensitivityCalculator } from '../hooks/useSensitivityCalculator';
import { InfoTooltip } from './InfoTooltip';

interface SensitivityMatrixProps {
  config: SimulationConfig;
}

type PresetMode = 'optimal' | '12m' | '24m' | '36m' | 'rent' | 'custom';

export const SensitivityMatrix: React.FC<SensitivityMatrixProps> = memo(({ config }) => {
  const [activePreset, setActivePreset] = useState<PresetMode>('optimal');
  const [customWaitMonths, setCustomWaitMonths] = useState<number>(18);
  const [selectedCoords, setSelectedCoords] = useState<{ stockRate: number; propRate: number } | null>(null);

  // Derive effective wait mode from selected preset
  const effectiveWaitMode: SensitivityWaitMode = useMemo(() => {
    switch (activePreset) {
      case 'optimal':
        return 'optimal';
      case '12m':
        return 12;
      case '24m':
        return 24;
      case '36m':
        return 36;
      case 'rent':
        return 'rent';
      case 'custom':
        return customWaitMonths;
    }
  }, [activePreset, customWaitMonths]);

  // Determine user's configured rates from sidebar
  const userStockRate = config.equity_engine.stock_yearly_growth_rate;
  const userPropRate = config.property.yearly_growth_rate;

  // Calculate dynamic rows (stock rates) and columns (prop rates), injecting exact user inputs if not in standard presets
  const { stockRates, propRates } = useMemo(() => {
    return getDynamicSensitivityRates(userStockRate, userPropRate);
  }, [userStockRate, userPropRate]);

  // Compute matrix in background Web Worker without freezing main thread
  const { gridData, isCalculating } = useSensitivityCalculator(
    config,
    effectiveWaitMode,
    stockRates,
    propRates
  );

  // Derive displayed column rates directly from gridData so thead and tbody remain 100% synchronized on every render frame
  const displayPropRates = useMemo(() => {
    if (gridData.length > 0 && gridData[0].cells && gridData[0].cells.length > 0) {
      return gridData[0].cells.map((c) => c.propRate);
    }
    return propRates;
  }, [gridData, propRates]);

  // Derive active selected cell live from gridData to prevent stale drill-down panels
  const selectedCell = useMemo(() => {
    if (!selectedCoords) return null;
    const row = gridData.find((r) => Math.abs(r.stockRate - selectedCoords.stockRate) < 0.001);
    return row?.cells.find((c) => Math.abs(c.propRate - selectedCoords.propRate) < 0.001) ?? null;
  }, [gridData, selectedCoords]);

  // Calculate Breakeven Stock Rate for the user's selected Irish property growth rate
  const breakeven = useMemo(() => {
    return calculateBreakevenStockRate(gridData, config.property.yearly_growth_rate);
  }, [gridData, config.property.yearly_growth_rate]);

  // Find matching column and row for user inputs
  const exactPropRate = useMemo(() => {
    if (displayPropRates.length === 0) return userPropRate;
    return displayPropRates.reduce((prev, curr) =>
      Math.abs(curr - userPropRate) < Math.abs(prev - userPropRate) ? curr : prev
    );
  }, [displayPropRates, userPropRate]);

  const exactStockRate = useMemo(() => {
    if (stockRates.length === 0) return userStockRate;
    return stockRates.reduce((prev, curr) =>
      Math.abs(curr - userStockRate) < Math.abs(prev - userStockRate) ? curr : prev
    );
  }, [stockRates, userStockRate]);

  const getStrategySubtitle = () => {
    switch (activePreset) {
      case 'optimal':
        return 'Evaluating Optimal Timing (automatically selects highest net wealth scenario per cell)';
      case '12m':
        return 'Testing Wait 12 Months vs Buy ASAP (all evaluated at Year 5 / Month 60 Net Wealth)';
      case '24m':
        return 'Testing Wait 24 Months vs Buy ASAP (all evaluated at Year 5 / Month 60 Net Wealth)';
      case '36m':
        return 'Testing Wait 36 Months vs Buy ASAP (all evaluated at Year 5 / Month 60 Net Wealth)';
      case 'rent':
        return 'Testing Rent All 5 Years (Never Buy) vs Buy ASAP (all evaluated at Year 5 / Month 60 Net Wealth)';
      case 'custom':
        return `Testing Wait ${customWaitMonths} Months vs Buy ASAP (all evaluated at Year 5 / Month 60 Net Wealth)`;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Sensitivity Heatmap: Stock Growth vs Ireland Property Growth</span>
                <InfoTooltip
                  title="2D Sensitivity Heatmap"
                  content="Evaluates how market movements impact your decision across 55 economic regimes. All comparisons are evaluated at Month 60 terminal wealth for true apples-to-apples fairness."
                />
              </h3>
              {/* Reserved layout slot to prevent horizontal jumping when Computing badge toggles */}
              <div className="min-w-[5.5rem] h-5 flex items-center">
                {isCalculating && (
                  <span className="flex items-center gap-1 text-[11px] text-brand-400 font-semibold animate-pulse bg-brand-500/10 border border-brand-500/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Computing...</span>
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {getStrategySubtitle()}
            </p>
          </div>
        </div>

        {/* Wait Time Strategy Selector (Right-aligned with shrink-0 to prevent shifts) */}
        <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1 bg-slate-850 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActivePreset('optimal')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                activePreset === 'optimal'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Automatically picks the best waiting duration for each economic permutation"
            >
              <Sparkles className="w-3 h-3" />
              <span>Optimal Wait</span>
            </button>

            <button
              onClick={() => setActivePreset('12m')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                activePreset === '12m'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Compare Buy ASAP vs Wait 12 Months"
            >
              Wait 12M
            </button>

            <button
              onClick={() => setActivePreset('24m')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                activePreset === '24m'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Compare Buy ASAP vs Wait 24 Months"
            >
              Wait 24M
            </button>

            <button
              onClick={() => setActivePreset('36m')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                activePreset === '36m'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Compare Buy ASAP vs Wait 36 Months"
            >
              Wait 36M
            </button>

            <button
              onClick={() => setActivePreset('rent')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                activePreset === 'rent'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Compare Buy ASAP vs Rent All 5 Years (Never Buy)"
            >
              Rent 5Y
            </button>

            <button
              onClick={() => setActivePreset('custom')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                activePreset === 'custom'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Select a custom wait duration with slider"
            >
              <Clock className="w-3 h-3" />
              <span>Custom</span>
            </button>
          </div>

          {/* Custom Month Slider (Right-aligned directly below the Custom button) */}
          {activePreset === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-850 px-3 py-1 rounded-xl border border-slate-800 text-xs animate-fadeIn lg:self-end">
              <span className="text-slate-400 font-medium">Wait:</span>
              <input
                type="range"
                min="1"
                max="48"
                step="1"
                value={customWaitMonths}
                onChange={(e) => setCustomWaitMonths(parseInt(e.target.value, 10) || 12)}
                className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                title="Drag to select custom wait duration in months"
              />
              <span className="font-mono font-bold text-emerald-400 min-w-[3rem] text-right">
                +{customWaitMonths}M
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Breakeven Hurdle Rate & Macro Insight Banner */}
      {breakeven && (
        <div className="bg-slate-850/80 rounded-xl p-3 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-brand-400 shrink-0" />
            <div>
              {breakeven.status === 'crossing' && breakeven.hurdleRate !== null && Number.isFinite(breakeven.hurdleRate) ? (
                <span className="text-slate-300">
                  ⚡ <strong>Indifference Hurdle:</strong> At{' '}
                  <strong className="text-white">{(breakeven.closestPropRate * 100).toFixed(1)}% p.a.</strong> property growth, your stock must return at least{' '}
                  <strong className="text-emerald-400 font-mono">
                    {breakeven.hurdleRate >= 0 ? '+' : ''}
                    {(breakeven.hurdleRate * 100).toFixed(1)}% p.a.
                  </strong>{' '}
                  for waiting to beat buying ASAP.
                </span>
              ) : breakeven.status === 'always_buy' ? (
                <span className="text-slate-300">
                  ⚡ <strong>Property Inflation Dominance:</strong> At{' '}
                  <strong className="text-white">{(breakeven.closestPropRate * 100).toFixed(1)}% p.a.</strong> property growth, buying ASAP beats waiting across all tested stock returns due to rising house prices and rental friction.
                </span>
              ) : breakeven.status === 'unaffordable' ? (
                <span className="text-slate-300">
                  ⚡ <strong>Unaffordable Scenarios:</strong> Target property is not affordable within 5 years under tested conditions at{' '}
                  <strong className="text-white">{(breakeven.closestPropRate * 100).toFixed(1)}% p.a.</strong> property growth.
                </span>
              ) : (
                <span className="text-slate-300">
                  ⚡ <strong>Waiting Dominance:</strong> At{' '}
                  <strong className="text-white">{(breakeven.closestPropRate * 100).toFixed(1)}% p.a.</strong> property growth, waiting beats buying ASAP across all tested stock returns due to flat or falling house prices.
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-amber-400 bg-amber-400/30" />
              <span>📍 Your Base Case</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500" />
              <span>Wait Wins</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-brand-500/40 border border-brand-500" />
              <span>Buy ASAP Wins</span>
            </div>
          </div>
        </div>
      )}

      {/* 2D Matrix Table */}
      <div className={`overflow-x-auto transition-opacity duration-200 ${isCalculating ? 'opacity-60' : 'opacity-100'}`}>
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-slate-400 font-semibold border-b border-r border-slate-800 bg-slate-850 sticky left-0 z-20 shadow-sm w-44 sm:w-48 whitespace-nowrap">
                Stock (p.a.) \ Prop (p.a.)
              </th>
              {displayPropRates.map((pr) => {
                const isUserCol = pr === exactPropRate;
                const formattedRate = (pr * 100).toFixed(1).replace(/\.0$/, '');
                const isColumnInjected = !SENSITIVITY_PROP_RATES.some((r) => Math.abs(r - pr) <= 0.0025);
                return (
                  <th
                    key={pr}
                    className={`p-2 font-bold border-b border-slate-800 bg-slate-850 ${
                      isUserCol ? 'text-amber-300 bg-amber-950/30' : pr < 0 ? 'text-amber-300/80' : pr === 0 ? 'text-slate-300' : 'text-slate-200'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span>{pr > 0 ? `+${formattedRate}%` : `${formattedRate}%`} Prop</span>
                      {isUserCol && (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1 py-0.5 rounded mt-0.5 whitespace-nowrap">
                          {isColumnInjected ? '📍 Your Input' : '(Your input)'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {gridData.map((row) => {
              const isUserRow = row.stockRate === exactStockRate;
              const formattedStock = (row.stockRate * 100).toFixed(1).replace(/\.0$/, '');
              return (
                <tr key={row.stockRate}>
                  <td
                    className={`p-2 text-left font-bold border-r border-slate-800 bg-slate-850 sticky left-0 z-10 shadow-sm w-44 sm:w-48 ${
                      isUserRow
                        ? 'text-amber-300 bg-amber-950/30'
                        : row.stockRate < 0
                        ? 'text-rose-400'
                        : row.stockRate === 0
                        ? 'text-slate-300'
                        : 'text-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="whitespace-nowrap">{row.stockRate > 0 ? `+${formattedStock}%` : `${formattedStock}%`} Stock</span>
                      {isUserRow && (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1 py-0.5 rounded whitespace-nowrap">
                          {!SENSITIVITY_STOCK_RATES.some((r) => Math.abs(r - row.stockRate) <= 0.0025) ? '📍 Your Input' : '(Your input)'}
                        </span>
                      )}
                    </div>
                  </td>
                  {row.cells.map((cell, cIdx) => {
                    const isUnaffordable = cell.winner === 'unaffordable' || !cell.isAffordable;
                    const isWait = !isUnaffordable && cell.winner === 'wait_and_compound';
                    const rawAdvantage = isWait ? cell.delta : -cell.delta;
                    const displayDelta = Math.max(0, rawAdvantage);
                    const isBaseCase = isUserRow && cell.propRate === exactPropRate;
                    const isSelected = selectedCoords !== null &&
                      Math.abs(cell.stockRate - selectedCoords.stockRate) < 0.001 &&
                      Math.abs(cell.propRate - selectedCoords.propRate) < 0.001;

                    return (
                      <td
                        key={cIdx}
                        onClick={() => {
                          if (!isUnaffordable) {
                            setSelectedCoords(isSelected ? null : { stockRate: cell.stockRate, propRate: cell.propRate });
                          }
                        }}
                        className={`p-2.5 font-semibold transition-all relative ${
                          isUnaffordable
                            ? 'bg-slate-950/60 text-slate-500 border border-slate-800/60 cursor-not-allowed'
                            : isSelected
                            ? 'ring-2 ring-white z-10 cursor-pointer ' + (isWait ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-400' : 'bg-brand-950/60 text-brand-300 border border-brand-400')
                            : isBaseCase
                            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 z-10 cursor-pointer ' + (isWait ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20 hover:border-emerald-400/50' : 'bg-brand-950/40 text-brand-300 border border-brand-500/20 hover:border-brand-400/50')
                            : 'hover:scale-105 hover:z-10 cursor-pointer ' + (isWait ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20 hover:border-emerald-400/50' : 'bg-brand-950/40 text-brand-300 border border-brand-500/20 hover:border-brand-400/50')
                        }`}
                        title={
                          isUnaffordable
                            ? 'Unaffordable: Target property is not purchasable within 5 years under this market scenario'
                            : `Stock: ${(cell.stockRate * 100).toFixed(1).replace(/\.0$/, '')}% p.a. | Prop: ${(cell.propRate * 100).toFixed(1).replace(/\.0$/, '')}% p.a.\nWinner: ${
                                isWait ? 'Wait & Compound' : 'Buy ASAP'
                              }\nAdvantage at Year 5: +€${Math.round(displayDelta).toLocaleString()}\nClick to inspect detailed breakdown`
                        }
                      >
                        {isBaseCase && (
                          <div className="absolute -top-1.5 -right-1 bg-amber-400 text-slate-950 text-[8px] font-black px-1 rounded-full uppercase tracking-tighter shadow-sm">
                            YOU
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">
                            {isUnaffordable ? 'UNAVAILABLE' : isWait ? 'WAIT' : 'BUY NOW'}
                          </span>
                          <span className="text-xs font-mono font-bold">
                            {isUnaffordable ? 'Shortfall' : `+€${Math.round(displayDelta / 1000)}k`}
                          </span>
                          {activePreset === 'optimal' && cell.strategyLabel && isWait && !isUnaffordable && (
                            <span className="text-[8px] opacity-75 font-normal truncate max-w-[4.5rem]">
                              {cell.strategyLabel.replace(/Wait |Mo \(Buy M\d+\)| \(Month \d+\)/g, '')}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Interactive Cell Drill-Down Panel */}
      {selectedCell && selectedCell.details && (
        <div className="bg-slate-850 border border-slate-750 rounded-xl p-4 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-750">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Scenario Anatomy: Stock {(selectedCell.stockRate * 100).toFixed(1).replace(/\.0$/, '')}% p.a. | Property {(selectedCell.propRate * 100).toFixed(1).replace(/\.0$/, '')}% p.a.
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  selectedCell.winner === 'wait_and_compound'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                }`}
              >
                {selectedCell.winner === 'wait_and_compound'
                  ? `WAIT WINS (+€${Math.round(selectedCell.delta).toLocaleString()})`
                  : `BUY ASAP WINS (+€${Math.round(-selectedCell.delta).toLocaleString()})`}
              </span>
            </div>
            <button
              onClick={() => setSelectedCoords(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
              title="Close breakdown"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Strategy Evaluated</span>
              <span className="font-bold text-white block truncate" title={selectedCell.strategyLabel}>
                {selectedCell.strategyLabel}
              </span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Y5 Net Wealth (Wait)</span>
              <span className="font-mono font-bold text-emerald-400 block">
                €{Math.round(selectedCell.details.waitNetWealth).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Y5 Net Wealth (Buy Now)</span>
              <span className="font-mono font-bold text-brand-400 block">
                €{Math.round(selectedCell.details.buyAsapNetWealth).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sunk Rent Paid (Wait)</span>
              <span className="font-mono font-bold text-rose-300 block">
                €{Math.round(selectedCell.details.cumulativeRentPaidWait).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Price When Bought</span>
              <span className="font-mono font-bold text-slate-200 block">
                {selectedCell.details.propertyPriceWait > 0
                  ? `€${Math.round(selectedCell.details.propertyPriceWait).toLocaleString()}`
                  : 'Renting (No Buy)'}
              </span>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Y5 Liquid Assets (Wait)</span>
              <span className="font-mono font-bold text-purple-300 block">
                €{Math.round(selectedCell.details.liquidWealthWait).toLocaleString()}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            {selectedCell.winner === 'wait_and_compound' ? (
              <span>
                💡 In this regime, stock market compounding on your unvested GSUs and investments (+€
                {Math.round(selectedCell.details.liquidWealthWait - selectedCell.details.liquidWealthBuyAsap).toLocaleString()}{' '}
                liquid wealth advantage) exceeded the cumulative drag of sunk rent (-€
                {Math.round(selectedCell.details.cumulativeRentPaidWait).toLocaleString()}) and higher purchase inflation.
              </span>
            ) : (
              <span>
                💡 In this regime, locking in property valuation early and eliminating monthly rent leakage saves more wealth (+€
                {Math.round(selectedCell.details.buyAsapNetWealth - selectedCell.details.waitNetWealth).toLocaleString()}{' '}
                net advantage) than waiting for stock equity appreciation.
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
});

