import React from 'react';
import { Plus, Trash2, Award, CheckCircle2, Clock, Lock } from 'lucide-react';
import { Grant, SimulationConfig } from '../engine/types';
import { addMonthsToDate, getCalendarMonthOffset } from '../engine/vesting';

interface GrantsManagerProps {
  config: SimulationConfig;
  onUpdateGrants: (grants: Grant[]) => void;
  isProfileLocked?: boolean;
  onUnlockProfile?: () => void;
}

export const GrantsManager: React.FC<GrantsManagerProps> = ({
  config,
  onUpdateGrants,
  isProfileLocked = false,
  onUnlockProfile,
}) => {
  const grants = config.equity_engine.grants;

  const handleAddInitialGrant = () => {
    if (isProfileLocked && onUnlockProfile) {
      onUnlockProfile();
    }
    const newGrant: Grant = {
      id: `grant_${Date.now()}`,
      name: `Initial Grant ${new Date().getFullYear()}`,
      type: 'initial',
      grant_date: config.meta.start_date,
      total_shares: 800,
      schedule_percents: [0.33, 0.33, 0.22, 0.12],
      vest_frequency_months: 12,
    };
    onUpdateGrants([...grants, newGrant]);
  };

  const handleAddRefresherGrant = () => {
    if (isProfileLocked && onUnlockProfile) {
      onUnlockProfile();
    }
    const newGrant: Grant = {
      id: `refresher_${Date.now()}`,
      name: `Refresher ${new Date().getFullYear()}`,
      type: 'refresher',
      grant_date: config.meta.start_date,
      total_shares: 200,
      schedule_percents: [0.25, 0.25, 0.25, 0.25],
      vest_frequency_months: 3,
    };
    onUpdateGrants([...grants, newGrant]);
  };

  const handleDeleteGrant = (id: string) => {
    if (isProfileLocked && onUnlockProfile) {
      onUnlockProfile();
    }
    onUpdateGrants(grants.filter((g) => g.id !== id));
  };

  const handleUpdateGrant = (id: string, updates: Partial<Grant>) => {
    onUpdateGrants(
      grants.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Google Stock Unit (GSU) Grants</h3>
              {isProfileLocked && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Locked Baseline
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Manage initial hire & refresher cliffs with 52% Irish marginal tax
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAddRefresherGrant}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-medium rounded-lg border border-purple-500/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Refresher (Quarterly 25%)</span>
          </button>

          <button
            onClick={handleAddInitialGrant}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg shadow-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Initial (33/33/22/12)</span>
          </button>
        </div>
      </div>

      {/* Grant Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {grants.map((grant) => {
          return (
            <div
              key={grant.id}
              className="bg-slate-850 border border-slate-750 hover:border-purple-500/30 rounded-xl p-4 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    disabled={isProfileLocked}
                    value={grant.name || grant.id}
                    onChange={(e) => handleUpdateGrant(grant.id, { name: e.target.value })}
                    className="bg-transparent font-semibold text-sm text-white focus:outline-none focus:border-b border-purple-500 w-full disabled:opacity-90"
                    placeholder="Grant Name"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">
                      {grant.type}
                    </span>
                    <span>Grant Date:</span>
                    <input
                      type="date"
                      disabled={isProfileLocked}
                      value={grant.grant_date}
                      onChange={(e) => handleUpdateGrant(grant.id, { grant_date: e.target.value })}
                      className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200 border border-slate-700 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:opacity-80"
                    />
                  </div>
                </div>

                {!isProfileLocked && (
                  <button
                    onClick={() => handleDeleteGrant(grant.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Remove grant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Shares & Vest Frequency */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">Total Gross Shares</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      disabled={isProfileLocked}
                      value={grant.total_shares}
                      onChange={(e) => handleUpdateGrant(grant.id, { total_shares: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-800 px-2 py-1 rounded text-sm font-bold text-white border border-slate-700 focus:ring-1 focus:ring-purple-500 focus:outline-none disabled:bg-slate-900 disabled:text-slate-300"
                    />
                    <span className="text-xs text-slate-400 font-mono">shs</span>
                  </div>
                  <span className="text-[10px] text-purple-400 mt-1 block">
                    Net: ~{Math.round(grant.total_shares * (1 - config.equity_engine.marginal_tax_rate_ireland))} shs (post-52% tax)
                  </span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">Vesting Frequency</span>
                  <select
                    disabled={isProfileLocked}
                    value={grant.vest_frequency_months}
                    onChange={(e) => handleUpdateGrant(grant.id, { vest_frequency_months: parseInt(e.target.value) || 12 })}
                    className="w-full bg-slate-800 px-2 py-1 rounded text-xs font-semibold text-slate-200 border border-slate-700 focus:ring-1 focus:ring-purple-500 focus:outline-none mt-0.5 disabled:bg-slate-900 disabled:text-slate-400"
                  >
                    <option value={12}>Annual (Every 12 Mo)</option>
                    <option value={6}>Semi-Annual (Every 6 Mo)</option>
                    <option value={3}>Quarterly (Every 3 Mo)</option>
                    <option value={1}>Monthly (Every 1 Mo)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {grant.schedule_percents.length} cliffs ({grant.schedule_percents.map((p) => `${Math.round(p * 100)}%`).join(' / ')})
                  </span>
                </div>
              </div>

              {/* Milestones Visual Timeline */}
              <div className="pt-2">
                <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1.5">
                  Vesting Cliff Schedule
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {grant.schedule_percents.map((pct, idx) => {
                    const milestoneMonths = (idx + 1) * grant.vest_frequency_months;
                    const milestoneDate = addMonthsToDate(grant.grant_date, milestoneMonths);
                    const offset = getCalendarMonthOffset(config.meta.start_date, milestoneDate);
                    const isPast = offset <= 0;
                    const grossShares = grant.total_shares * pct;

                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border font-medium ${
                          isPast
                            ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                            : 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                        }`}
                        title={
                          isPast
                            ? `Vested in past on ${milestoneDate.toISOString().slice(0, 10)} (${grossShares} shs)`
                            : `Vests at Month ${offset} (${milestoneDate.toISOString().slice(0, 10)}) - ${grossShares} shs`
                        }
                      >
                        {isPast ? (
                          <CheckCircle2 className="w-3 h-3 text-slate-500" />
                        ) : (
                          <Clock className="w-3 h-3 text-purple-400" />
                        )}
                        <span>
                          Y{idx + 1}: {Math.round(pct * 100)}% ({Math.round(grossShares)} shs)
                        </span>
                        {isPast ? (
                          <span className="text-[9px] text-slate-500 uppercase">Past</span>
                        ) : (
                          <span className="text-[9px] font-bold text-purple-300">M{offset}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
