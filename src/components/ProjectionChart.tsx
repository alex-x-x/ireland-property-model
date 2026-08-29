import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { MonthlyDataPoint, DecisionComparison } from '../engine/types';
import { TrendingUp, Layers, CheckCircle2 } from 'lucide-react';

interface ProjectionChartProps {
  data: MonthlyDataPoint[];
  decision: DecisionComparison;
}

export const ProjectionChart: React.FC<ProjectionChartProps> = ({ data, decision }) => {
  const [showBuckets, setShowBuckets] = useState(false);
  const [showRentDrag, setShowRentDrag] = useState(false);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `€${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `€${Math.round(val / 1000)}k`;
    return `€${val}`;
  };

  const chartData = data.map((d) => ({
    month: `M${d.month}`,
    monthNum: d.month,
    date: d.date,
    totalLiquidWealth: Math.round(d.totalLiquidWealth),
    targetCapital: Math.round(d.targetCapital),
    cash: Math.round(d.cash),
    investments: Math.round(d.investments),
    gsuPool: Math.round(d.gsuPool),
    cumulativeRent: Math.round(d.cumulativeRent),
    propertyPrice: Math.round(d.propertyPrice),
    surplus: Math.round(d.surplus),
    isAffordable: d.isAffordable,
    vestEvents: d.vestEvents,
  }));

  const earliestMonth = decision.earliestBuyMonth;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight">60-Month Wealth vs Target Capital Trajectory</h3>
            {earliestMonth !== null ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                Affordable at Month {earliestMonth} ({decision.earliestBuyDate})
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Unaffordable in 60 Mo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Liquid assets step up on GSU vest cliffs while required 10% deposit + stamp duty inflates smoothly
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowBuckets(!showBuckets)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showBuckets
                ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Asset Buckets</span>
          </button>

          <button
            onClick={() => setShowRentDrag(!showRentDrag)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showRentDrag
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Rent Drag</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              interval={5}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const dataPoint = payload[0]?.payload;
                return (
                  <div className="bg-slate-900/95 backdrop-blur-md border border-slate-750 p-3 rounded-xl shadow-2xl text-xs space-y-2 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold">
                      <span className="text-white">{label} ({dataPoint?.date})</span>
                      <span className={dataPoint?.isAffordable ? 'text-emerald-400' : 'text-amber-400'}>
                        {dataPoint?.isAffordable ? '✓ Affordable' : '✗ Deposit Shortfall'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-emerald-400 font-medium">Total Liquid Wealth:</span>
                        <span className="text-white font-bold">€{dataPoint?.totalLiquidWealth?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-400 font-medium">Target Deposit Needed:</span>
                        <span className="text-white font-bold">€{dataPoint?.targetCapital?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Property Valuation:</span>
                        <span>€{dataPoint?.propertyPrice?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1">
                        <span>Surplus / Deficit:</span>
                        <span className={dataPoint?.surplus >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {dataPoint?.surplus >= 0 ? '+' : ''}€{dataPoint?.surplus?.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {showBuckets && (
                      <div className="border-t border-slate-800 pt-1.5 space-y-0.5 text-[11px] text-slate-400">
                        <div className="flex justify-between">
                          <span>• Cash:</span>
                          <span className="text-slate-200">€{dataPoint?.cash?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Index Inv:</span>
                          <span className="text-slate-200">€{dataPoint?.investments?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• GSU Pool:</span>
                          <span className="text-purple-300 font-medium">€{dataPoint?.gsuPool?.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    {dataPoint?.vestEvents && dataPoint.vestEvents.length > 0 && (
                      <div className="border-t border-purple-500/30 pt-1.5 text-[11px] text-purple-300 bg-purple-950/30 p-1.5 rounded">
                        <span className="font-semibold">⚡ GSU Cliff Vesting Event:</span>
                        {dataPoint.vestEvents.map((e: any, idx: number) => (
                          <div key={idx}>
                            +{Math.round(e.netShares)} net shares (+€{Math.round(e.netAmountEur).toLocaleString()})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
              formatter={(value) => <span className="text-slate-300 font-medium">{value}</span>}
            />

            {/* Asset Buckets if toggled */}
            {showBuckets && (
              <>
                <Area
                  type="monotone"
                  dataKey="cash"
                  name="Cash Bucket (€)"
                  stackId="1"
                  stroke="#38bdf8"
                  fill="#38bdf8"
                  fillOpacity={0.15}
                />
                <Area
                  type="monotone"
                  dataKey="investments"
                  name="Base Investments (€)"
                  stackId="1"
                  stroke="#818cf8"
                  fill="#818cf8"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="gsuPool"
                  name="GSU Retained Equity (€)"
                  stackId="1"
                  stroke="#c084fc"
                  fill="#c084fc"
                  fillOpacity={0.25}
                />
              </>
            )}

            {showRentDrag && (
              <Line
                type="monotone"
                dataKey="cumulativeRent"
                name="Cumulative Rent Sunk (€)"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
              />
            )}

            {/* Target Capital Required */}
            <Line
              type="monotone"
              dataKey="targetCapital"
              name="Required Target Capital (10% Deposit + Taxes)"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={false}
            />

            {/* Total Liquid Wealth */}
            <Line
              type="monotone"
              dataKey="totalLiquidWealth"
              name="Total Liquid Wealth (€)"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 2, fill: '#10b981' }}
              activeDot={{ r: 6, fill: '#34d399' }}
            />

            {/* Reference Line for Earliest Buy Month */}
            {earliestMonth !== null && (
              <ReferenceLine
                x={`M${earliestMonth}`}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Earliest Buy (M${earliestMonth})`,
                  fill: '#38bdf8',
                  fontSize: 11,
                  position: 'insideTopLeft',
                  fontWeight: 600,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
