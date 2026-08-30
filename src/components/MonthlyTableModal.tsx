import React from 'react';
import { X, Download, Table } from 'lucide-react';
import { MonthlyDataPoint } from '../engine/types';
import { exportMonthlyPointsToCsv, downloadCsvFile } from '../engine/export';

interface MonthlyTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyPoints: MonthlyDataPoint[];
}

export const MonthlyTableModal: React.FC<MonthlyTableModalProps> = ({
  isOpen,
  onClose,
  monthlyPoints,
}) => {
  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    const csvContent = exportMonthlyPointsToCsv(monthlyPoints);
    downloadCsvFile(`ireland-property-audit-60m-${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">60-Month Financial Audit Log</h3>
              <p className="text-xs text-slate-400">Month-by-month breakdown of asset compounding, vesting events, and target capital</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Scrollable Table */}
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-850 z-10 border-b border-slate-750 text-slate-300">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Mo</th>
                <th className="py-2.5 px-3 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold text-right">Property Price</th>
                <th className="py-2.5 px-3 font-semibold text-right">Target Capital</th>
                <th className="py-2.5 px-3 font-semibold text-right">Cash</th>
                <th className="py-2.5 px-3 font-semibold text-right">Investments</th>
                <th className="py-2.5 px-3 font-semibold text-right text-purple-300">GSU Pool</th>
                <th className="py-2.5 px-3 font-semibold text-right text-emerald-400">Total Liquid</th>
                <th className="py-2.5 px-3 font-semibold text-right">Surplus</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Rent Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {monthlyPoints.map((p) => (
                <tr key={p.month} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 font-bold text-slate-400">M{p.month}</td>
                  <td className="py-2 px-3 text-slate-300">{p.date}</td>
                  <td className="py-2 px-3 text-right text-slate-200">€{Math.round(p.propertyPrice).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-amber-300 font-semibold">€{Math.round(p.targetCapital).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-slate-300">€{Math.round(p.cash).toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-purple-300">
                    <div>€{Math.round(p.gsuPool).toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      {Math.round(p.retainedShares)} shs
                      {p.vestEvents && p.vestEvents.length > 0 && (
                        <span className="text-emerald-400 ml-1 font-mono font-semibold">
                          (+{p.vestEvents.reduce((sum, e) => sum + e.netShares, 0).toFixed(1)} net)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={p.surplus >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                      {p.surplus >= 0 ? '+' : ''}€{Math.round(p.surplus).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {p.isAffordable ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ✓ Affordable
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        Shortfall
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-rose-400">-€{Math.round(p.cumulativeRent).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-850 text-xs text-slate-400 flex items-center justify-between">
          <span>Simulation Horizon: 60 Months (5 Years)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
