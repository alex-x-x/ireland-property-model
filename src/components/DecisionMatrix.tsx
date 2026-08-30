import React from 'react';
import {
  TrendingUp,
  Home,
  AlertCircle,
} from 'lucide-react';
import { DecisionComparison, SimulationConfig } from '../engine/types';
import { InfoTooltip } from './InfoTooltip';

interface DecisionMatrixProps {
  decision: DecisionComparison;
  config: SimulationConfig;
}

export const DecisionMatrix: React.FC<DecisionMatrixProps> = ({ decision, config }) => {
  const { recommendedAction, recommendationReason, scenarios, earliestBuyMonth } = decision;

  return (
    <div className="space-y-5">
      {/* Hero Recommendation Card */}
      <div
        className={`p-5 rounded-2xl border transition-all shadow-xl ${
          recommendedAction === 'wait_and_compound'
            ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40'
            : recommendedAction === 'buy_asap'
            ? 'bg-gradient-to-r from-brand-950/40 via-slate-900 to-slate-900 border-brand-500/40'
            : 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Core Recommendation
              </span>
              <span className="text-xs text-slate-400">5-Year Wealth Optimization</span>
              <InfoTooltip
                title="Optimization Logic"
                content="Compares terminal Year 5 net wealth (Home Equity + Liquid Assets) between buying immediately at earliest affordability vs delaying to let GSU stock compound."
              />
            </div>

            <div className="flex items-center gap-2">
              {recommendedAction === 'wait_and_compound' ? (
                <div className="text-xl font-extrabold text-emerald-400 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  <span>WAIT & LET EQUITY COMPOUND</span>
                </div>
              ) : recommendedAction === 'buy_asap' ? (
                <div className="text-xl font-extrabold text-brand-400 flex items-center gap-2">
                  <Home className="w-6 h-6" />
                  <span>BUY AT EARLIEST VIABLE MONTH (M{earliestBuyMonth})</span>
                </div>
              ) : (
                <div className="text-xl font-extrabold text-amber-400 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  <span>TARGET PROPERTY UNAFFORDABLE IN 5 YEARS</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              {recommendationReason}
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 text-center min-w-[110px]">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Earliest Viable</span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                {earliestBuyMonth !== null ? `Month ${earliestBuyMonth}` : 'N/A'}
              </span>
            </div>

            <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 text-center min-w-[120px]">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">AIB Green Rate</span>
              <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                {(config.mortgage.mortgage_interest_rate * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-side Opportunity Cost Matrix Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Opportunity Cost Matrix: Buy Now vs. Waiting Scenarios
            </h4>
            <InfoTooltip
              title="Opportunity Cost"
              content="Evaluates the trade-off: Buying early locks in property price and stops rent leakage; waiting lets your high-growth GSUs compound longer before paying a deposit."
            />
          </div>
          <span className="text-xs text-slate-400">All outcomes evaluated at Month 60 (Year 5)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {scenarios.map((s) => {
            const isBuyAsap = s.id === 'buy_asap';
            const delta = s.netWealthDeltaVsBuyAsap;
            const isPositive = delta > 0;

            return (
              <div
                key={s.id}
                className={`bg-slate-900 rounded-2xl border p-4 flex flex-col justify-between transition-all relative overflow-hidden shadow-lg ${
                  isBuyAsap
                    ? 'border-brand-500/40 bg-brand-950/10'
                    : isPositive
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-bold text-white tracking-tight">{s.timingLabel}</span>
                    {isBuyAsap && (
                      <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                        Baseline
                      </span>
                    )}
                  </div>

                  {/* Net Wealth Delta Badge */}
                  {!isBuyAsap && (
                    <div
                      className={`text-xs font-bold px-2 py-1 rounded-lg border mb-3 flex items-center justify-between ${
                        isPositive
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <span>Delta vs Buy ASAP:</span>
                      <span>{isPositive ? '+' : ''}€{Math.round(delta).toLocaleString()}</span>
                    </div>
                  )}

                  {/* Metric Rows */}
                  <div className="space-y-1.5 text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 inline-flex items-center gap-1">
                        <span>Total Net Wealth (Y5):</span>
                        <InfoTooltip
                          title="Total Net Wealth at Year 5"
                          content="Combined net worth at Month 60 = Home Equity (Y5) + Liquid Wealth (Cash + GSUs + Investments)."
                        />
                      </span>
                      <span className="font-bold text-white">€{Math.round(s.totalNetWealthAtM60).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 inline-flex items-center gap-1">
                        <span>Home Equity (Y5):</span>
                        <InfoTooltip
                          title="Home Equity (Year 5 / Month 60)"
                          content={
                            s.homeEquityAtM60 > 0 ? (
                              <div className="space-y-1.5 text-slate-300">
                                <p>
                                  Net unencumbered value of your home at Month 60 (Market Value minus Remaining Mortgage Debt).
                                </p>
                                <div className="pt-1 border-t border-slate-700/60 font-mono text-[11px] space-y-0.5">
                                  <div className="flex justify-between">
                                    <span>Y5 Market Value:</span>
                                    <span className="text-white">€{Math.round(s.propertyValueAtM60).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-rose-300">
                                    <span>Remaining Mortgage:</span>
                                    <span>-€{Math.round(s.remainingMortgageBalanceAtM60).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-emerald-400 font-bold border-t border-slate-700 pt-0.5">
                                    <span>Home Equity:</span>
                                    <span>€{Math.round(s.homeEquityAtM60).toLocaleString()}</span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-400 pt-1">
                                  Accumulated from: €{Math.round(s.depositPaid).toLocaleString()} deposit + €{Math.round(s.propertyValueAtM60 - s.propertyPurchasePrice).toLocaleString()} property appreciation + €{Math.round(s.cumulativeMortgagePrincipalPaid).toLocaleString()} principal paid down.
                                </p>
                              </div>
                            ) : (
                              <p className="text-slate-300">
                                <strong>€0 Home Equity:</strong> In this scenario you rent for the full 5 years. 100% of your wealth remains in liquid assets (Cash, GSUs, Investments) rather than real estate.
                              </p>
                            )
                          }
                        />
                      </span>
                      <span className="font-semibold text-emerald-400">
                        {s.homeEquityAtM60 > 0 ? `€${Math.round(s.homeEquityAtM60).toLocaleString()}` : '€0 (Renting)'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 inline-flex items-center gap-1">
                        <span>Liquid Wealth (Y5):</span>
                        <InfoTooltip
                          title="Liquid Wealth at Year 5"
                          content="Cash in bank + Unsold GSUs (projected value) + Trading Investments remaining at Month 60."
                        />
                      </span>
                      <span className="text-slate-200">€{Math.round(s.remainingLiquidWealthAtM60).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center text-rose-400">
                      <span className="text-slate-400 inline-flex items-center gap-1">
                        <span>Sunk Rent Paid:</span>
                        <InfoTooltip
                          title="Sunk Rent Paid"
                          content="Non-recoverable rent paid to landlord prior to purchasing (or across all 5 years if renting)."
                        />
                      </span>
                      <span>-€{Math.round(s.cumulativeRentPaid).toLocaleString()}</span>
                    </div>

                    {s.buyMonth !== null && (
                      <>
                        <div className="flex justify-between text-slate-400">
                          <span>Purchase Price:</span>
                          <span>€{Math.round(s.propertyPurchasePrice).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Monthly Mortgage:</span>
                          <span>€{Math.round(s.monthlyMortgagePayment).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer summary tag */}
                <div className="mt-4 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>{s.buyMonth !== null ? `Purchased at M${s.buyMonth}` : 'Pure Rent & Compound'}</span>
                  {isPositive ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                      <span>Advantage</span>
                      <TrendingUp className="w-3 h-3" />
                    </span>
                  ) : isBuyAsap ? (
                    <span className="text-brand-400 font-semibold">Anchor Date</span>
                  ) : (
                    <span className="text-rose-400 font-semibold">Slower Growth</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Financial Breakdown Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl overflow-x-auto">
        <div className="flex items-center gap-1.5 mb-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Detailed Financial Breakdown (Year 5 Audit)
          </h4>
          <InfoTooltip
            title="Year 5 Audit Breakdown"
            content="A complete line-item financial reconciliation at Month 60 across all purchase timing strategies. Net Wealth equals Home Equity plus Liquid Portfolio."
          />
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="py-2 px-3 font-semibold">
                <span className="inline-flex items-center gap-1">
                  <span>Scenario</span>
                  <InfoTooltip
                    title="Timing Scenario"
                    content="Buy ASAP (earliest month satisfying 10% deposit + CBI limits), Wait 12/24/36 months, or Rent all 60 months."
                  />
                </span>
              </th>
              <th className="py-2 px-3 font-semibold text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <span>Purchase Price</span>
                  <InfoTooltip
                    title="Purchase Price"
                    content="Property price at purchase date after compounding yearly property inflation."
                  />
                </span>
              </th>
              <th className="py-2 px-3 font-semibold text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <span>Upfront Deposit + Fees</span>
                  <InfoTooltip
                    title="Upfront Purchase Costs"
                    content="Total cash/stock liquidated at closing: 10% deposit (plus borrowing shortfall) + Tiered Stamp Duty (1% up to €1M, 2% excess) + €3,000 legal fees."
                  />
                </span>
              </th>
              <th className="py-2 px-3 font-semibold text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <span>Sunk Rent Drag</span>
                  <InfoTooltip
                    title="Cumulative Sunk Rent"
                    content="Total non-recoverable rent paid to landlord prior to purchasing (or across all 5 years if renting)."
                  />
                </span>
              </th>
              <th className="py-2 px-3 font-semibold text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <span>Mortgage Interest Paid</span>
                  <InfoTooltip
                    title="Cumulative Interest"
                    content="Total non-recoverable interest paid to lender on the mortgage during the 5-year period."
                  />
                </span>
              </th>
              <th className="py-2 px-3 font-semibold text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <span>Year 5 Home Equity</span>
                  <InfoTooltip
                    title="Home Equity (Year 5)"
                    content="Property Market Value at Month 60 minus Remaining Mortgage Debt Balance. This is the unencumbered capital you own in the property."
                  />
                </span>
              </th>
              <th className="py-2 px-3 font-semibold text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <span>Year 5 Liquid Wealth</span>
                  <InfoTooltip
                    title="Liquid Wealth (Year 5)"
                    content="Total remaining liquid assets at Month 60: Bank Cash + Unsold Retained GSUs + Personal Trading Investments."
                  />
                </span>
              </th>
              <th className="py-2 px-3 font-semibold text-right text-white">
                <span className="inline-flex items-center justify-end gap-1">
                  <span>Year 5 Net Wealth</span>
                  <InfoTooltip
                    title="Total Net Wealth (Year 5)"
                    content="Master benchmark: Home Equity (Y5) + Liquid Wealth (Y5). Represents your total combined net worth at Month 60."
                  />
                </span>
              </th>
              <th className="py-2 px-3 font-semibold text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <span>Net Delta</span>
                  <InfoTooltip
                    title="Net Wealth Delta"
                    content="Advantage vs Buy ASAP: Positive (Green) means waiting gained more wealth; Negative (Red) means buying earlier was financially superior."
                  />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {scenarios.map((s) => {
              const delta = s.netWealthDeltaVsBuyAsap;
              const isPositive = delta > 0;
              const isZero = delta === 0;

              return (
                <tr key={s.id} className="hover:bg-slate-850/50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-white flex items-center gap-1.5">
                    {s.id === 'buy_asap' && <span className="w-2 h-2 rounded-full bg-brand-400" />}
                    {s.id.startsWith('wait') && <span className="w-2 h-2 rounded-full bg-purple-400" />}
                    {s.id === 'rent_all_60m' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                    <span>{s.timingLabel}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300">
                    {s.propertyPurchasePrice > 0 ? `€${Math.round(s.propertyPurchasePrice).toLocaleString()}` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300">
                    {s.totalUpfrontPaid > 0 ? `€${Math.round(s.totalUpfrontPaid).toLocaleString()}` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-400 font-medium">
                    -€{Math.round(s.cumulativeRentPaid).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400">
                    {s.cumulativeMortgageInterestPaid > 0 ? `-€${Math.round(s.cumulativeMortgageInterestPaid).toLocaleString()}` : '€0'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">
                    {s.homeEquityAtM60 > 0 ? `€${Math.round(s.homeEquityAtM60).toLocaleString()}` : '€0'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-200">
                    €{Math.round(s.remainingLiquidWealthAtM60).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-white">
                    €{Math.round(s.totalNetWealthAtM60).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold">
                    {isZero ? (
                      <span className="text-slate-500">Baseline</span>
                    ) : (
                      <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                        {isPositive ? '+' : ''}€{Math.round(delta).toLocaleString()}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
