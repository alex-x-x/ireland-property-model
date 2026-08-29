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

interface MonthlyCashflowWidgetProps {
  data: MonthlyDataPoint[];
  config?: SimulationConfig;
}

export const MonthlyCashflowWidget: React.FC<MonthlyCashflowWidgetProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'y1' | 'y2' | 'y3' | 'y4' | 'y5' | 'milestones'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

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
        return (
          p.month === 0 ||
          p.isAffordable ||
          (p.netBonusReceivedEur && p.netBonusReceivedEur > 0) ||
          p.vestEvents.length > 0 ||
          p.month % 12 === 0
        );
      }
      return true;
    });
  }, [data, selectedFilter, searchTerm]);

  // Overall 60-Month Aggregate Summary Metrics
  const lastPoint = data[data.length - 1] || data[0];
  const totalRentPaid = lastPoint.cumulativeRent;
  const totalBonusPaid = data.reduce((sum, p) => sum + (p.netBonusReceivedEur || 0), 0);
  const finalRetainedShares = lastPoint.retainedShares;
  const earliestAffordableMonth = data.find((p) => p.isAffordable)?.month ?? null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/30">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Month-by-Month Cashflow & Wealth Breakdown</h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                60 Months Dynamic
              </span>
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
                {Math.round(finalRetainedShares).toLocaleString()} shares
              </div>
              <span className="text-[10px] text-slate-500">Held without selling</span>
            </div>

            <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400 flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Earliest Purchase Month</span>
              </div>
              <div className="text-base font-bold text-amber-300 font-mono">
                {earliestAffordableMonth !== null ? `Month ${earliestAffordableMonth} (${data[earliestAffordableMonth]?.date})` : 'Beyond M60'}
              </div>
              <span className="text-[10px] text-slate-500">
                {earliestAffordableMonth !== null ? '100% Capital threshold met' : 'Accelerate savings / grants'}
              </span>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              {[
                { id: 'all', label: 'All (60 Mo)' },
                { id: 'y1', label: 'Year 1' },
                { id: 'y2', label: 'Year 2' },
                { id: 'y3', label: 'Year 3' },
                { id: 'y4', label: 'Year 4' },
                { id: 'y5', label: 'Year 5' },
                { id: 'milestones', label: '★ Key Milestones' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors border ${
                    selectedFilter === f.id
                      ? 'bg-brand-500 text-white border-brand-400 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:bg-slate-750'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search date (e.g. 2027-03)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 pl-8 pr-2.5 py-1 rounded-lg border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="sticky top-0 bg-slate-850 z-10 border-b border-slate-750 text-slate-300 font-sans text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Month / Date</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Cash Balance (Δ)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Rent Drag</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-purple-300">GSU Pool & Shares (Δ)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Investments (Δ)</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-emerald-400">Total Liquid (Δ)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Target Capital</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Surplus / Deficit</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
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

                  return (
                    <tr
                      key={p.month}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        p.isAffordable ? 'bg-emerald-950/10' : ''
                      }`}
                    >
                      {/* Month & Date with Badges */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">M{p.month}</span>
                          <span className="text-slate-400 font-sans text-[11px]">{p.date}</span>
                          {hasMarchBonus && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-sans font-bold border border-emerald-500/30">
                              🎁 Bonus
                            </span>
                          )}
                          {hasVesting && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-sans font-bold border border-purple-500/30">
                              💎 Vest
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cash & Cash Inflow Diff */}
                      <td className="py-2 px-3 text-right">
                        <div className="font-semibold text-slate-200">€{Math.round(p.cash).toLocaleString()}</div>
                        {prevPoint && (
                          <div className="text-[10px] text-emerald-400">
                            +{Math.round(cashDiff).toLocaleString()}
                            {hasMarchBonus && (
                              <span className="text-slate-500 ml-1">
                                (incl. +€{Math.round(p.netBonusReceivedEur!).toLocaleString()} bonus)
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Rent Drag */}
                      <td className="py-2 px-3 text-right">
                        <div className="text-rose-400">-€{Math.round(p.monthlyRent).toLocaleString()}/mo</div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          Cum: -€{Math.round(p.cumulativeRent).toLocaleString()}
                        </div>
                      </td>

                      {/* GSU Pool & Retained Shares */}
                      <td className="py-2 px-3 text-right text-purple-300">
                        <div className="font-semibold">€{Math.round(p.gsuPool).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 font-sans flex items-center justify-end gap-1">
                          <span>{Math.round(p.retainedShares)} shs</span>
                          {prevPoint && (
                            <span className="text-purple-400">
                              (Δ {gsuDiff >= 0 ? '+' : ''}€{Math.round(gsuDiff).toLocaleString()})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Investments */}
                      <td className="py-2 px-3 text-right">
                        <div className="text-slate-300">€{Math.round(p.investments).toLocaleString()}</div>
                        {prevPoint && (
                          <div className="text-[10px] text-slate-400">
                            +{Math.round(invDiff).toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Total Liquid Wealth */}
                      <td className="py-2 px-3 text-right text-emerald-400">
                        <div className="font-bold text-sm">€{Math.round(p.totalLiquidWealth).toLocaleString()}</div>
                        {prevPoint && (
                          <div className="text-[10px] text-emerald-300">
                            +{Math.round(totalDiff).toLocaleString()}/mo
                          </div>
                        )}
                      </td>

                      {/* Target Capital Required */}
                      <td className="py-2 px-3 text-right text-amber-300">
                        <div className="font-semibold">€{Math.round(p.targetCapital).toLocaleString()}</div>
                        <div className="text-[10px] text-slate-500 font-sans">
                          Cap: €{Math.round(p.propertyPrice).toLocaleString()}
                        </div>
                      </td>

                      {/* Surplus / Deficit */}
                      <td className="py-2 px-3 text-right">
                        <span className={`font-bold ${p.surplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {p.surplus >= 0 ? '+' : ''}€{Math.round(p.surplus).toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        {p.isAffordable ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ✓ Ready
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
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
