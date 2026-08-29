import React, { useMemo } from 'react';
import { Grid } from 'lucide-react';
import { SimulationConfig } from '../engine/types';
import { runSimulation } from '../engine/simulation';
import { runDecisionAnalysis } from '../engine/decision';

interface SensitivityMatrixProps {
  config: SimulationConfig;
}

export const SensitivityMatrix: React.FC<SensitivityMatrixProps> = ({ config }) => {
  const stockRates = [0.04, 0.08, 0.12, 0.16, 0.20];
  const propRates = [0.02, 0.04, 0.06, 0.08, 0.10];

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
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Sensitivity Heatmap: Stock Growth vs Dublin Property Growth
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates Net Wealth Delta (Wait vs Buy Now) under various asset growth scenarios
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
                <th key={pr} className="p-2 font-bold text-slate-200 border-b border-slate-800 bg-slate-850">
                  {(pr * 100).toFixed(0)}% Property
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {gridData.map((row) => (
              <tr key={row.stockRate}>
                <td className="p-2 text-left font-bold text-purple-300 border-r border-slate-800 bg-slate-850">
                  {(row.stockRate * 100).toFixed(0)}% Stock
                </td>
                {row.cells.map((cell, cIdx) => {
                  const isWait = cell.winner === 'wait_and_compound';

                  return (
                    <td
                      key={cIdx}
                      className={`p-3 font-semibold transition-all hover:scale-105 cursor-default ${
                        isWait
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                          : 'bg-brand-950/40 text-brand-300 border border-brand-500/20'
                      }`}
                      title={`Stock Growth: ${(cell.stockRate * 100).toFixed(0)}% | Property Growth: ${(cell.propRate * 100).toFixed(0)}%\nRecommendation: ${
                        isWait ? 'Wait and Compound' : 'Buy ASAP'
                      }\nDelta: ${cell.delta >= 0 ? '+' : ''}€${Math.round(cell.delta).toLocaleString()}`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-80">
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
