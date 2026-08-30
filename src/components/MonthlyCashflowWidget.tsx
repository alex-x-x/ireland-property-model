import React, { useState, useMemo } from 'react';
import {
  Table,
  Download,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Award,
  Home,
  Sparkles,
  Search,
} from 'lucide-react';
import { MonthlyDataPoint, SimulationConfig } from '../engine/types';
import { exportMonthlyPointsToCsv, downloadCsvFile } from '../engine/export';
import { getGrantLifecycleEvents, GrantLifecycleEvent } from '../engine/vesting';
import { InfoTooltip } from './InfoTooltip';

interface MonthlyCashflowWidgetProps {
  data: MonthlyDataPoint[];
  config?: SimulationConfig;
}

export const MonthlyCashflowWidget: React.FC<MonthlyCashflowWidgetProps> = ({ data, config }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'y1' | 'y2' | 'y3' | 'y4' | 'y5' | 'milestones'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const grantLifecycleEvents = useMemo<GrantLifecycleEvent[]>(() => {
    if (!config?.equity_engine?.grants || !config?.meta?.start_date) return [];
    return getGrantLifecycleEvents(
      config.equity_engine.grants,
      config.meta.start_date,
      config.meta.forecast_months ?? 60
    );
  }, [config]);

  const eventsByMonth = useMemo(() => {
    const map = new Map<number, GrantLifecycleEvent[]>();
    for (const ev of grantLifecycleEvents) {
      const list = map.get(ev.month) || [];
      list.push(ev);
      map.set(ev.month, list);
    }
    return map;
  }, [grantLifecycleEvents]);

  const handleDownloadCsv = () => {
    const csvContent = exportMonthlyPointsToCsv(data);
    downloadCsvFile(`dublin-property-cashflow-60m-${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  const filteredData = useMemo(() => {
    return data.filter((p) => {
      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesDate = p.date.toLowerCase().includes(term);
        const matchesMonth = `m${p.month}`.includes(term);
        if (!matchesDate && !matchesMonth) return false;
      }

      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'y1') return p.month >= 0 && p.month <= 12;
      if (selectedFilter === 'y2') return p.month >= 13 && p.month <= 24;
      if (selectedFilter === 'y3') return p.month >= 25 && p.month <= 36;
      if (selectedFilter === 'y4') return p.month >= 37 && p.month <= 48;
      if (selectedFilter === 'y5') return p.month >= 49 && p.month <= 60;
      if (selectedFilter === 'milestones') {
        const hasLifecycleEvent = eventsByMonth.has(p.month);
        return (
          p.month === 0 ||
          p.isAffordable ||
          p.month === 12 ||
          p.month === 24 ||
          p.month === 36 ||
          p.month === 48 ||
          p.month === 60 ||
          hasLifecycleEvent ||
          Boolean(p.netBonusReceivedEur && p.netBonusReceivedEur > 0)
        );
      }
      return true;
    });
  }, [data, selectedFilter, searchTerm, eventsByMonth]);

  // Aggregate KPI highlights
  const totalRentPaid = data[data.length - 1]?.cumulativeRent || 0;
  const totalBonusPaid = data.reduce((sum, p) => sum + (p.netBonusReceivedEur || 0), 0);
  const endRetainedShares = data[data.length - 1]?.retainedShares || 0;
  const endGsuValue = data[data.length - 1]?.gsuPool || 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Month-by-Month Cashflow & Equity Ledger
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                60 Months
              </span>
              <InfoTooltip
                title="Monthly Cashflow Ledger"
                content="Tracks month-by-month cash accumulation, March bonus payouts (48% net after 52% tax), un-sold GSU share compounding, and purchase capital requirements."
              />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live ledger tracking cash savings inflows, March bonuses, rental friction, and un-sold GSU share compounding with differentials (Δ)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            title="Download full 60-month audit log in CSV format"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsExpanded((prev: boolean) => !prev)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors"
            title={isExpanded ? 'Collapse table' : 'Expand table'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Top Quick KPI Metric Highlights */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400 flex items-center gap-1 mb-1">
                <Home className="w-3.5 h-3.5 text-rose-400" />
                <span>60-Mo Rent Sunk Cost</span>
              </div>
              <div className="text-base font-bold text-rose-400 font-mono">
                -€{Math.round(totalRentPaid).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Cumulative rental drag</span>
            </div>

            <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400 flex items-center gap-1 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Net March Bonuses Paid</span>
              </div>
              <div className="text-base font-bold text-emerald-400 font-mono">
                +€{Math.round(totalBonusPaid).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">After Irish 52% tax</span>
            </div>

            <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400 flex items-center gap-1 mb-1">
                <Award className="w-3.5 h-3.5 text-purple-400" />
                <span>Retained Shares at M60</span>
              </div>
              <div className="text-base font-bold text-purple-300 font-mono">
                {Math.round(endRetainedShares).toLocaleString()} shs
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                €{Math.round(endGsuValue).toLocaleString()} value
              </span>
            </div>

            <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400 flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                <span>End Liquid Wealth (M60)</span>
              </div>
              <div className="text-base font-bold text-brand-300 font-mono">
                €{Math.round(data[data.length - 1]?.totalLiquidWealth || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">Cash + GSUs + Investments</span>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-slate-400 font-medium mr-1">Filter:</span>
              {[
                { id: 'all', label: 'All (60 Mo)' },
                { id: 'milestones', label: '★ Key Milestones' },
                { id: 'y1', label: 'Year 1' },
                { id: 'y2', label: 'Year 2' },
                { id: 'y3', label: 'Year 3' },
                { id: 'y4', label: 'Year 4' },
                { id: 'y5', label: 'Year 5' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedFilter === f.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Month or Date (e.g. M12, 2027-03)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="sticky top-0 bg-slate-850 z-10 border-b border-slate-750 text-slate-300 font-sans text-[11px]">
                <tr>
                  <th className="py-2 px-2 font-semibold w-[110px]">
                    <span className="inline-flex items-center gap-1">
                      <span>Month / Date</span>
                      <InfoTooltip
                        title="Timeline Month"
                        content="Chronological simulation month and date. Google GSUs vest monthly; annual performance bonus is injected in March."
                      />
                    </span>
                  </th>
                  <th className="py-2 px-2 font-semibold text-right w-[115px]">
                    <span className="inline-flex items-center justify-end gap-1">
                      <span>Cash Balance (Δ)</span>
                      <InfoTooltip
                        title="Liquid Cash"
                        content="Cash in EUR & USD bank accounts. (Δ) indicates net month-over-month inflow from salary savings and March bonuses."
                      />
                    </span>
                  </th>
                  <th className="py-2 px-2 font-semibold text-right w-[95px]">
                    <span className="inline-flex items-center justify-end gap-1">
                      <span>Rent Drag</span>
                      <InfoTooltip
                        title="Monthly Rent"
                        content="Non-recoverable monthly housing expense compounding under the 2% RPZ statutory cap."
                      />
                    </span>
                  </th>
                  <th className="py-2 px-2 font-semibold text-right text-purple-300 w-[190px]">
                    <span className="inline-flex items-center justify-end gap-1">
                      <span>GSU Pool & Vests (Δ)</span>
                      <InfoTooltip
                        title="GSU Equity Holdings & Vests"
                        content="Cumulative un-sold GSU shares, current EUR valuation, monthly share vest deltas (net & gross shares), and net vest value after 52% Irish tax."
                      />
                    </span>
                  </th>
                  <th className="py-2 px-2 font-semibold text-right w-[90px]">
                    <span className="inline-flex items-center justify-end gap-1">
                      <span>Investments (Δ)</span>
                      <InfoTooltip
                        title="Trading Investments"
                        content="Personal ETF and index fund trading account balances compounding at the investment yield."
                      />
                    </span>
                  </th>
                  <th className="py-2 px-2 font-semibold text-right text-emerald-400 w-[115px]">
                    <span className="inline-flex items-center justify-end gap-1">
                      <span>Total Liquid (Δ)</span>
                      <InfoTooltip
                        title="Total Liquid Wealth"
                        content="Total available capital (Cash + GSU Pool + Investments). Represents total purchasing power if buying this month."
                      />
                    </span>
                  </th>
                  <th className="py-2 px-2 font-semibold text-right w-[105px]">
                    <span className="inline-flex items-center justify-end gap-1">
                      <span>Target Capital</span>
                      <InfoTooltip
                        title="Required Purchase Capital"
                        content="Total upfront cash & equity needed: 10% deposit + borrowing shortfall + stamp duty + €3k legal closing fees."
                      />
                    </span>
                  </th>
                  <th className="py-2 px-2 font-semibold text-right w-[105px]">
                    <span className="inline-flex items-center justify-end gap-1">
                      <span>Surplus / Deficit</span>
                      <InfoTooltip
                        title="Purchasing Capital Buffer"
                        content="Total Liquid Wealth minus (Required Upfront Capital + Cash Safety Pot). Positive (Green) means you can execute the purchase immediately while fully preserving your emergency cash buffer."
                      />
                    </span>
                  </th>
                  <th className="py-2 px-2 font-semibold text-center w-[75px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredData.map((p: MonthlyDataPoint) => {
                  const prevPoint = p.month > 0 ? data[p.month - 1] : null;
                  const cashDiff = prevPoint ? p.cash - prevPoint.cash : 0;
                  const gsuDiff = prevPoint ? p.gsuPool - prevPoint.gsuPool : 0;
                  const invDiff = prevPoint ? p.investments - prevPoint.investments : 0;
                  const totalDiff = prevPoint ? p.totalLiquidWealth - prevPoint.totalLiquidWealth : 0;

                  const hasMarchBonus = p.netBonusReceivedEur && p.netBonusReceivedEur > 0;
                  const hasVesting = p.vestEvents && p.vestEvents.length > 0;

                  const monthLifecycleEvents = eventsByMonth.get(p.month) || [];
                  const newGrantEvents = monthLifecycleEvents.filter((e) => e.type === 'grant_awarded');
                  const completedGrantEvents = monthLifecycleEvents.filter((e) => e.type === 'grant_completed');

                  const netSharesVested = p.vestEvents ? p.vestEvents.reduce((sum, e) => sum + e.netShares, 0) : 0;
                  const grossSharesVested = p.vestEvents ? p.vestEvents.reduce((sum, e) => sum + e.grossShares, 0) : 0;
                  const netVestEur = p.vestEvents ? p.vestEvents.reduce((sum, e) => sum + e.netAmountEur, 0) : 0;

                  return (
                    <tr
                      key={p.month}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        p.isAffordable ? 'bg-emerald-950/10' : ''
                      }`}
                    >
                      {/* Month & Date with Badges */}
                      <td className="py-2 px-2">
                        <div className="flex flex-col gap-0.5 items-start">
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <span className="font-bold text-white">M{p.month}</span>
                            <span className="text-slate-400 font-sans text-[11px]">{p.date}</span>
                            {hasMarchBonus && (
                              <span
                                className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-sans font-bold border border-emerald-500/30 whitespace-nowrap"
                                title={`Annual bonus payout (+€${Math.round(p.netBonusReceivedEur!).toLocaleString()} net after 52% tax)`}
                              >
                                🎁 Bonus
                              </span>
                            )}
                            {hasVesting && (
                              <span
                                className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-sans font-bold border border-purple-500/30 whitespace-nowrap"
                                title={`Monthly stock vesting (+${netSharesVested.toFixed(1)} net shs / ${grossSharesVested.toFixed(0)} gross)`}
                              >
                                💎 Vest
                              </span>
                            )}
                          </div>

                          {/* Compact Grant Lifecycle Badges (New Grant & Grant Completion) */}
                          {newGrantEvents.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {newGrantEvents.map((ev) => (
                                <span
                                  key={ev.grantId}
                                  className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-sans font-semibold border border-indigo-500/40 inline-flex items-center gap-1 whitespace-nowrap shadow-sm"
                                  title={`New Grant Awarded: ${ev.grantName} (${ev.totalShares} total shares)`}
                                >
                                  <span>✨ New: +{ev.totalShares} shs</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {completedGrantEvents.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {completedGrantEvents.map((ev) => (
                                <span
                                  key={ev.grantId}
                                  className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-sans font-bold border border-amber-500/40 inline-flex items-center gap-1 whitespace-nowrap shadow-sm"
                                  title={`Grant Finished (Equity Cliff): ${ev.grantName}`}
                                >
                                  <span>🏁 Cliff</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cash & Cash Inflow Diff */}
                      <td className="py-2 px-2 text-right">
                        <div className="font-semibold text-slate-200 whitespace-nowrap">€{Math.round(p.cash).toLocaleString()}</div>
                        {prevPoint && (
                          <div className="text-[10px] text-emerald-400 whitespace-nowrap flex flex-col items-end">
                            <span>+{Math.round(cashDiff).toLocaleString()}</span>
                            {hasMarchBonus && (
                              <span className="text-slate-400 text-[9px] font-sans">
                                (incl. +€{Math.round(p.netBonusReceivedEur!).toLocaleString()} bonus)
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Rent Drag */}
                      <td className="py-2 px-2 text-right">
                        <div className="text-rose-400 whitespace-nowrap font-semibold">-€{Math.round(p.monthlyRent).toLocaleString()}/mo</div>
                        <div className="text-[10px] text-slate-500 font-sans whitespace-nowrap">
                          Cum: -€{Math.round(p.cumulativeRent).toLocaleString()}
                        </div>
                      </td>

                      {/* GSU Pool & Retained Shares & Stocks Vested Delta */}
                      <td className="py-2 px-2 text-right text-purple-300">
                        <div className="font-semibold text-purple-200 whitespace-nowrap">€{Math.round(p.gsuPool).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-300 font-sans flex flex-col items-end gap-0.5">
                          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                            <span>{Math.round(p.retainedShares).toLocaleString()} shs held</span>
                            {prevPoint && (
                              <span className="text-purple-400 font-mono">
                                (Δ {gsuDiff >= 0 ? '+' : ''}€{Math.round(gsuDiff).toLocaleString()})
                              </span>
                            )}
                          </div>
                          {netSharesVested > 0 && (
                            <div className="text-[9.5px] text-purple-200 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/60 inline-flex items-center justify-end gap-1 whitespace-nowrap font-sans shadow-sm mt-0.5">
                              <span className="font-semibold text-emerald-300 font-mono">+{netSharesVested.toFixed(1)} net shs</span>
                              <span className="text-slate-400 font-mono">({grossSharesVested.toFixed(0)} gross)</span>
                              <span className="text-purple-300 font-semibold font-mono ml-0.5">+€{Math.round(netVestEur).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Investments */}
                      <td className="py-2 px-2 text-right">
                        <div className="text-slate-300 whitespace-nowrap">€{Math.round(p.investments).toLocaleString()}</div>
                        {prevPoint && (
                          <div className="text-[10px] text-slate-400 whitespace-nowrap">
                            +{Math.round(invDiff).toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Total Liquid Wealth */}
                      <td className="py-2 px-2 text-right text-emerald-400">
                        <div className="font-bold text-sm whitespace-nowrap">€{Math.round(p.totalLiquidWealth).toLocaleString()}</div>
                        {prevPoint && (
                          <div className="text-[10px] text-emerald-300 whitespace-nowrap">
                            +{Math.round(totalDiff).toLocaleString()}/mo
                          </div>
                        )}
                      </td>

                      {/* Target Capital Required */}
                      <td className="py-2 px-2 text-right text-amber-300">
                        <div className="font-semibold whitespace-nowrap">€{Math.round(p.targetCapital).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500 font-sans whitespace-nowrap">
                          Cap: €{Math.round(p.propertyPrice).toLocaleString()}
                        </div>
                      </td>

                      {/* Surplus / Deficit */}
                      <td className="py-2 px-2 text-right">
                        <div className={`font-bold whitespace-nowrap ${p.surplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {p.surplus >= 0 ? '+' : ''}€{Math.round(p.surplus).toLocaleString()}
                        </div>
                        {p.safetyBufferEur && p.safetyBufferEur > 0 ? (
                          <div className="text-[9px] text-sky-400/80 font-sans whitespace-nowrap" title={`Reserved Cash Safety Buffer: €${Math.round(p.safetyBufferEur).toLocaleString()}`}>
                            (after €{Math.round(p.safetyBufferEur / 1000)}k pot)
                          </div>
                        ) : null}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-2 text-center">
                        {p.isAffordable ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                            ✓ Ready
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
                            Shortfall
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
      )}
    </div>
  );
};
