import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Download,
  Search,
  CheckCircle2,
  Lock,
  Zap,
  Gift,
} from 'lucide-react';
import { MortgageOverpaymentResult, AmortizationSchedulePoint } from '../engine/mortgage';

interface AmortizationScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: MortgageOverpaymentResult;
  principal: number;
  annualRatePct: number;
  termYears: number;
  fixedRateYears: number;
  monthlyOverpayment: number;
  annualLumpSum: number;
}

export const AmortizationScheduleModal: React.FC<AmortizationScheduleModalProps> = ({
  isOpen,
  onClose,
  result,
  principal,
  annualRatePct,
  termYears,
  fixedRateYears,
  monthlyOverpayment,
  annualLumpSum,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'fixed' | 'overpayment' | 'lumpsum'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const totalYears = Math.ceil(result.actualPayoffMonths / 12);
  const yearsList = useMemo(() => {
    const list: number[] = [];
    for (let y = 1; y <= totalYears; y++) {
      list.push(y);
    }
    return list;
  }, [totalYears]);

  const filteredSchedule = useMemo(() => {
    return result.schedule.filter((point: AmortizationSchedulePoint) => {
      const year = Math.ceil(point.month / 12);

      // Year filter
      if (selectedYear !== 'all' && year !== parseInt(selectedYear, 10)) {
        return false;
      }

      // Phase filter
      if (phaseFilter === 'fixed' && !point.isFixedPeriod) return false;
      if (phaseFilter === 'overpayment' && point.overpaymentPaid <= 0) return false;
      if (phaseFilter === 'lumpsum' && !point.isLumpSumApplied) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const dateMatch = point.dateStr?.toLowerCase().includes(q);
        const monthMatch = `m${point.month}`.includes(q) || `${point.month}` === q;
        if (!dateMatch && !monthMatch) return false;
      }

      return true;
    });
  }, [result.schedule, selectedYear, phaseFilter, searchQuery]);

  const handleExportCsv = () => {
    const headers = [
      'Month',
      'Date',
      'Phase',
      'Total Payment (EUR)',
      'Scheduled Principal (EUR)',
      'Interest Paid (EUR)',
      'Overpayment (EUR)',
      'Remaining Balance (EUR)',
      'Cumulative Principal Paid (EUR)',
      'Cumulative Interest Paid (EUR)',
    ];

    const rows = result.schedule.map((pt) => [
      pt.month,
      pt.dateStr || '',
      pt.isFixedPeriod ? 'Fixed Lock' : pt.isLumpSumApplied ? 'March Bonus Lump Sum' : pt.overpaymentPaid > 0 ? 'Overpayment' : 'Standard',
      pt.totalPayment.toFixed(2),
      pt.principalPaid.toFixed(2),
      pt.interestPaid.toFixed(2),
      pt.overpaymentPaid.toFixed(2),
      pt.balance.toFixed(2),
      pt.cumulativePrincipalPaid.toFixed(2),
      pt.cumulativeInterestPaid.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mortgage_amortization_schedule_${result.actualPayoffMonths}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white">
                Full Month-by-Month Amortization Ledger
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {result.actualPayoffMonths} Months Total
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive breakdown of every principal payment, interest charge, Irish fixed period, and March bonus overpayment.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 text-xs font-bold border border-indigo-500/40 transition-colors"
              title="Download amortization table as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Summary Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-4 bg-slate-850/90 border-b border-slate-800 text-xs">
          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Loan Principal</span>
            <span className="font-mono font-bold text-white">€{Math.round(principal).toLocaleString()}</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Rate & Term</span>
            <span className="font-mono font-bold text-white">{annualRatePct.toFixed(2)}% • {termYears}y</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Fixed Lockout</span>
            <span className="font-mono font-bold text-sky-300">{fixedRateYears} Years Lock</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Total Interest Paid</span>
            <span className="font-mono font-bold text-rose-300">€{Math.round(result.totalInterestWithOverpayment).toLocaleString()}</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Total Interest Saved</span>
            <span className="font-mono font-bold text-emerald-400">+€{Math.round(result.totalInterestSaved).toLocaleString()}</span>
          </div>

          <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Debt-Free Payoff Date</span>
            <span className="font-mono font-bold text-emerald-300">
              {result.schedule[result.schedule.length - 1]?.dateStr || 'N/A'} ({(result.actualPayoffMonths / 12).toFixed(1)}y)
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 bg-slate-900 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Filter */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px] font-semibold">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Years (1–{totalYears})</option>
                {yearsList.map((y) => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>

            {/* Phase Filters */}
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setPhaseFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  phaseFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Months
              </button>
              <button
                onClick={() => setPhaseFilter('fixed')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  phaseFilter === 'fixed' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>Fixed Lock</span>
              </button>
              <button
                onClick={() => setPhaseFilter('overpayment')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  phaseFilter === 'overpayment' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Overpayments</span>
              </button>
              <button
                onClick={() => setPhaseFilter('lumpsum')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  phaseFilter === 'lumpsum' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gift className="w-3 h-3" />
                <span>March Bonuses</span>
              </button>
            </div>
          </div>

          {/* Search Query */}
          <div className="flex items-center bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
            <input
              type="text"
              placeholder="Search date (e.g. 2029-03)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none w-full placeholder-slate-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-850 text-slate-400 text-[11px] sticky top-0 z-10 border-b border-slate-750">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-center w-14">Month</th>
                <th className="py-2.5 px-3 font-semibold w-24">Date</th>
                <th className="py-2.5 px-3 font-semibold w-40">Phase / Event</th>
                <th className="py-2.5 px-3 font-semibold text-right">Total Payment</th>
                <th className="py-2.5 px-3 font-semibold text-right">Loan Body (Principal)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Interest Paid</th>
                <th className="py-2.5 px-3 font-semibold text-right">Extra Overpayment</th>
                <th className="py-2.5 px-3 font-semibold text-right">Remaining Balance</th>
                <th className="py-2.5 px-3 font-semibold text-right">Cumul. Principal</th>
                <th className="py-2.5 px-3 font-semibold text-right">Cumul. Interest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {filteredSchedule.map((pt) => {
                const isPayoffMonth = pt.month === result.actualPayoffMonths;
                return (
                  <tr
                    key={pt.month}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      isPayoffMonth
                        ? 'bg-emerald-950/40 border-l-2 border-emerald-400'
                        : pt.isLumpSumApplied
                        ? 'bg-purple-950/30 border-l-2 border-purple-400'
                        : pt.overpaymentPaid > 0
                        ? 'bg-emerald-950/15'
                        : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-center text-slate-400 font-sans font-bold">
                      M{pt.month}
                    </td>

                    <td className="py-2 px-3 text-slate-300">
                      {pt.dateStr}
                    </td>

                    <td className="py-2 px-3 font-sans">
                      {isPayoffMonth ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>🎉 Fully Paid Off!</span>
                        </span>
                      ) : pt.isLumpSumApplied ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          <Gift className="w-3 h-3" />
                          <span>🎁 March Bonus (+€{Math.round(annualLumpSum / 1000)}k)</span>
                        </span>
                      ) : pt.isFixedPeriod ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/30">
                          <Lock className="w-3 h-3" />
                          <span>🔒 Fixed Rate Period</span>
                        </span>
                      ) : pt.overpaymentPaid > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <Zap className="w-3 h-3" />
                          <span>⚡ Overpayment (+€{Math.round(monthlyOverpayment)})</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Standard Amort</span>
                      )}
                    </td>

                    <td className="py-2 px-3 text-right font-bold text-white">
                      €{Math.round(pt.totalPayment).toLocaleString()}
                    </td>

                    <td className="py-2 px-3 text-right text-emerald-400 font-semibold">
                      €{Math.round(pt.principalPaid + pt.overpaymentPaid).toLocaleString()}
                    </td>

                    <td className="py-2 px-3 text-right text-rose-300">
                      €{Math.round(pt.interestPaid).toLocaleString()}
                    </td>

                    <td className="py-2 px-3 text-right text-emerald-300">
                      {pt.overpaymentPaid > 0 ? `+€${Math.round(pt.overpaymentPaid).toLocaleString()}` : '-'}
                    </td>

                    <td className="py-2 px-3 text-right font-bold text-indigo-200">
                      €{Math.round(pt.balance).toLocaleString()}
                    </td>

                    <td className="py-2 px-3 text-right text-emerald-400/90 text-[11px]">
                      €{Math.round(pt.cumulativePrincipalPaid).toLocaleString()}
                    </td>

                    <td className="py-2 px-3 text-right text-rose-400/90 text-[11px]">
                      €{Math.round(pt.cumulativeInterestPaid).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-850 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>Showing {filteredSchedule.length} of {result.schedule.length} months</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-white rounded-lg font-semibold transition-colors"
          >
            Close Ledger
          </button>
        </div>
      </div>
    </div>
  );
};
