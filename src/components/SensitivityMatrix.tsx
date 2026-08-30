import React, { useState, useMemo, useDeferredValue } from 'react';
import { Grid, Loader2 } from 'lucide-react';
import { SimulationConfig } from '../engine/types';
import { runSimulation } from '../engine/simulation';
import { runDecisionAnalysis } from '../engine/decision';
import { InfoTooltip } from './InfoTooltip';

interface SensitivityMatrixProps {
  config: SimulationConfig;
}

export const SensitivityMatrix: React.FC<SensitivityMatrixProps> = ({ config }) => {
  const [horizonMonths, setHorizonMonths] = useState<number>(60);
  const horizonYears = (horizonMonths / 12).toFixed(1).replace(/\.0$/, '');

  // Defer heavy 55-permutation matrix computation to prevent slider lag
  const deferredConfig = useDeferredValue(config);
  const deferredHorizon = useDeferredValue(horizonMonths);
  const isCalculating = deferredConfig !== config || deferredHorizon !== horizonMonths;

  // Stock Growth Rates in 5% brackets from -20% to +30%
  const stockRates = [-0.20, -0.15, -0.10, -0.05, 0.00, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30];
  // Property Growth Rates: -3%, 0%, 3%, 5%, 8%
  const propRates = [-0.03, 0.00, 0.03, 0.05, 0.08];

  const gridData = useMemo(() => {
    return stockRates.map((stockRate) => {
      const row = propRates.map((propRate) => {
        const testConfig: SimulationConfig = {
          ...deferredConfig,
          meta: {
            ...deferredConfig.meta,
            forecast_months: deferredHorizon,
          },
          property: {
            ...deferredConfig.property,
            yearly_growth_rate: propRate,
          },
          equity_engine: {
            ...deferredConfig.equity_engine,
            stock_yearly_growth_rate: stockRate,
          },
        };

        const monthly = runSimulation(testConfig);
        const decision = runDecisionAnalysis(testConfig, monthly);
        const waitScenarios = decision.scenarios.filter((s) => s.id !== 'buy_asap');
        let delta = 0;
        if (waitScenarios.length > 0) {
          const maxWaitScenario = waitScenarios.reduce((best, s) =>
            (s.netWealthDeltaVsBuyAsap ?? -Infinity) > (best.netWealthDeltaVsBuyAsap ?? -Infinity) ? s : best
          );
          delta = maxWaitScenario.netWealthDeltaVsBuyAsap ?? 0;
        }
        const winner = decision.recommendedAction;

        return {
          stockRate,
          propRate,
          delta,
          winner,
          isAffordable: decision.earliestBuyMonth !== null,
        };
      });

      return { stockRate, cells: row };
    });
  }, [deferredConfig, deferredHorizon]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Sensitivity Heatmap: Stock Growth vs Dublin Property Growth</span>
                <InfoTooltip
                  title="2D Sensitivity Matrix"
                  content="Evaluates the optimal action across 55 economic permutations. Use the slider to test whether buying early or waiting wins at Month 12, Month 24, or Month 60."
                />
              </h3>
              {isCalculating && (
                <span className="flex items-center gap-1 text-[11px] text-brand-400 font-semibold animate-pulse bg-brand-500/10 border border-brand-500/30 px-2 py-0.5 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Computing...</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Evaluates <strong className="text-brand-300">Month {horizonMonths} ({horizonYears} Yr{horizonYears === '1' ? '' : 's'})</strong> Net Wealth Advantage (Wait & Compound vs Buy ASAP)
              {horizonMonths < 60 && (
                <span className="block text-[11px] text-amber-300/90 mt-0.5">
                  ⚠️ Note: M{horizonMonths} measures balance sheets on Month {horizonMonths}. Select <strong>5Y (M60)</strong> for the full 5-year post-purchase holding comparison.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Horizon Month Slider & Quick Buttons */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium whitespace-nowrap">Horizon:</span>
            <input
              type="range"
              min="1"
              max="60"
              step="1"
              value={horizonMonths}
              onChange={(e) => setHorizonMonths(parseInt(e.target.value, 10) || 60)}
              className="w-24 sm:w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
              title={`Drag to select comparison horizon (1 to 60 months)`}
            />
            <span className="font-mono font-bold text-brand-400 min-w-[4.2rem] text-right">
              M{horizonMonths} <span className="text-[11px] font-normal text-slate-400">({horizonYears}y)</span>
            </span>
          </div>

          <div className="flex gap-1 bg-slate-850 p-1 rounded-xl border border-slate-800">
            {[1, 2, 3, 4, 5].map((yr) => {
              const targetMo = yr * 12;
              return (
                <button
                  key={yr}
                  onClick={() => setHorizonMonths(targetMo)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                    horizonMonths === targetMo
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={`Jump to ${yr} Year (${targetMo} Months)`}
                >
                  {yr}Y
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 text-xs pb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/60" />
          <span className="text-slate-300">Wait & Compound Wins</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-brand-500/30 border border-brand-500/60" />
          <span className="text-slate-300">Buy ASAP Wins</span>
        </div>
      </div>

      {/* 2D Matrix Table */}
      <div className={`overflow-x-auto transition-opacity duration-200 ${isCalculating ? 'opacity-60' : 'opacity-100'}`}>
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-slate-400 font-semibold border-b border-r border-slate-800 bg-slate-850">
                Stock (p.a.) \ Prop (p.a.)
              </th>
              {propRates.map((pr) => (
                <th
                  key={pr}
                  className={`p-2 font-bold border-b border-slate-800 bg-slate-850 ${
                    pr < 0 ? 'text-amber-300' : pr === 0 ? 'text-slate-300' : 'text-slate-200'
                  }`}
                >
                  {pr > 0 ? `+${(pr * 100).toFixed(0)}%` : `${(pr * 100).toFixed(0)}%`} Prop
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {gridData.map((row) => (
              <tr key={row.stockRate}>
                <td
                  className={`p-2 text-left font-bold border-r border-slate-800 bg-slate-850 ${
                    row.stockRate < 0 ? 'text-rose-400' : row.stockRate === 0 ? 'text-slate-300' : 'text-purple-300'
                  }`}
                >
                  {row.stockRate > 0 ? `+${(row.stockRate * 100).toFixed(0)}%` : `${(row.stockRate * 100).toFixed(0)}%`} Stock
                </td>
                {row.cells.map((cell, cIdx) => {
                  const isWait = cell.winner === 'wait_and_compound';
                  const displayDelta = isWait ? cell.delta : Math.abs(cell.delta);

                  return (
                    <td
                      key={cIdx}
                      className={`p-2.5 font-semibold transition-all hover:scale-105 cursor-default ${
                        isWait
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                          : 'bg-brand-950/40 text-brand-300 border border-brand-500/20'
                      }`}
                      title={`Stock Growth: ${(cell.stockRate * 100).toFixed(0)}% p.a. | Property Growth: ${(cell.propRate * 100).toFixed(0)}% p.a.\nOptimal Action at Month ${horizonMonths}: ${
                        isWait ? 'Wait & Compound Equity' : 'Buy ASAP (Month 0)'
                      }\nNet Wealth Advantage at Month ${horizonMonths}: +€${Math.round(displayDelta).toLocaleString()} for ${isWait ? 'Waiting' : 'Buying ASAP'}${
                        horizonMonths < 60 ? `\n(Note: Set Horizon to 5Y / M60 to evaluate 5-year full post-purchase holding wealth)` : ''
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">
                          {isWait ? 'WAIT' : 'BUY NOW'}
                        </span>
                        <span className="text-xs font-mono font-bold">
                          +€{Math.round(displayDelta / 1000)}k
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
