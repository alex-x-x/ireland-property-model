import React, { useMemo } from 'react';
import { Grid } from 'lucide-react';
import { SimulationConfig } from '../engine/types';
import { runSimulation } from '../engine/simulation';
import { runDecisionAnalysis } from '../engine/decision';

interface SensitivityMatrixProps {
  config: SimulationConfig;
}

export const SensitivityMatrix: React.FC<SensitivityMatrixProps> = ({ config }) => {
  // Stock Growth Rates spanning severe bear markets to hyper growth
  const stockRates = [-0.20, -0.10, -0.05, 0.00, 0.08, 0.15, 0.25];
  // Property Growth Rates spanning mild correction to supply squeeze
  const propRates = [-0.05, -0.02, 0.00, 0.03, 0.06, 0.09];

  const gridData = useMemo(() => {
    return stockRates.map((stockRate) => {
      const row = propRates.map((propRate) => {
        const testConfig: SimulationConfig = {
          ...config,
          property: {
            ...config.property,
            yearly_growth_rate: propRate,
          },
          equity_engine: {
            ...config.equity_engine,
            stock_yearly_growth_rate: stockRate,
          },
        };

        const monthly = runSimulation(testConfig);
        const decision = runDecisionAnalysis(testConfig, monthly);
        const waitScenario = decision.scenarios.find((s) => s.id === 'wait_24m' || s.id === 'wait_12m');
        const delta = waitScenario?.netWealthDeltaVsBuyAsap ?? 0;
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
  }, [config]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Sensitivity Heatmap: Stock Growth vs Dublin Property Growth</span>
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates Year 5 Net Wealth Advantage (Wait & Compound vs Buy ASAP) across bull, bear, and correction scenarios
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/60" />
            <span className="text-slate-300">Wait & Compound Wins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-brand-500/30 border border-brand-500/60" />
            <span className="text-slate-300">Buy ASAP Wins</span>
          </div>
        </div>
      </div>

      {/* 2D Matrix Table */}
      <div className="overflow-x-auto">
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

                  return (
                    <td
                      key={cIdx}
                      className={`p-2.5 font-semibold transition-all hover:scale-105 cursor-default ${
                        isWait
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                          : 'bg-brand-950/40 text-brand-300 border border-brand-500/20'
                      }`}
                      title={`Stock Growth: ${(cell.stockRate * 100).toFixed(0)}% p.a. | Property Growth: ${(cell.propRate * 100).toFixed(0)}% p.a.\nOptimal Action: ${
                        isWait ? 'Wait & Compound Equity' : 'Buy ASAP'
                      }\nYear 5 Net Wealth Advantage: ${cell.delta >= 0 ? '+' : ''}€${Math.round(cell.delta).toLocaleString()}`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">
                          {isWait ? 'WAIT' : 'BUY NOW'}
                        </span>
                        <span className="text-xs font-mono font-bold">
                          {cell.delta >= 0 ? '+' : ''}€{Math.round(cell.delta / 1000)}k
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
