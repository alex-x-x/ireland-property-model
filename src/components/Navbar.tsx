import React, { useRef } from 'react';
import {
  Building2,
  Download,
  Upload,
  RotateCcw,
  Table,
  Sparkles,
  Radio,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { SimulationConfig, MonthlyDataPoint } from '../engine/types';
import { PRESET_SCENARIOS } from '../engine/presets';
import { exportConfigToJson, downloadJsonFile, exportMonthlyPointsToCsv, downloadCsvFile } from '../engine/export';
import { MarketDataResult } from '../services/marketData';

interface NavbarProps {
  config: SimulationConfig;
  onUpdateConfig: (newConfig: SimulationConfig) => void;
  onResetDefault: () => void;
  marketData: MarketDataResult | null;
  onOpenMarketDataModal: () => void;
  onOpenTableModal: () => void;
  monthlyPoints: MonthlyDataPoint[];
  onSyncMarketData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  config,
  onUpdateConfig,
  onResetDefault,
  marketData,
  onOpenMarketDataModal,
  onOpenTableModal,
  monthlyPoints,
  onSyncMarketData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePresetChange = (presetId: string) => {
    const preset = PRESET_SCENARIOS.find((p) => p.id === presetId);
    if (preset && preset.config) {
      onUpdateConfig({
        ...config,
        property: {
          ...config.property,
          yearly_growth_rate: preset.config.property?.yearly_growth_rate ?? config.property.yearly_growth_rate,
        },
        equity_engine: {
          ...config.equity_engine,
          stock_yearly_growth_rate: preset.config.equity_engine?.stock_yearly_growth_rate ?? config.equity_engine.stock_yearly_growth_rate,
        },
        liquid_assets: {
          ...config.liquid_assets,
          investments_yearly_growth_rate: preset.config.liquid_assets?.investments_yearly_growth_rate ?? config.liquid_assets.investments_yearly_growth_rate,
        },
        macro: {
          ...config.macro,
          rent_yearly_growth_rate: preset.config.macro?.rent_yearly_growth_rate ?? config.macro.rent_yearly_growth_rate,
          eur_usd_yearly_drift: preset.config.macro?.eur_usd_yearly_drift ?? config.macro.eur_usd_yearly_drift,
        },
        mortgage: {
          ...config.mortgage,
          mortgage_interest_rate: preset.config.mortgage?.mortgage_interest_rate ?? config.mortgage.mortgage_interest_rate,
        },
      });
    }
  };

  const handleExportJson = () => {
    const jsonStr = exportConfigToJson(config);
    downloadJsonFile(`dublin-property-model-${new Date().toISOString().slice(0, 10)}.json`, jsonStr);
  };

  const handleExportCsv = () => {
    const csvContent = exportMonthlyPointsToCsv(monthlyPoints);
    downloadCsvFile(`dublin-property-model-60m-${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.property && parsed.equity_engine && parsed.macro) {
          onUpdateConfig(parsed);
        } else {
          alert('Invalid configuration file structure.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isOverrideActive = !!config.macro.use_manual_market_override;

  const isSynced =
    marketData &&
    config.equity_engine.current_share_price_usd === marketData.stockPriceUsd &&
    config.macro.eur_usd_spot === marketData.eurUsdRate;

  const statusColor = isOverrideActive
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-950'
    : marketData?.status === 'live'
    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    : marketData?.status === 'cached'
    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Title & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">Dublin Property & GSU Decision Engine</h1>
              <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                5-Yr Model
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive financial simulation for Dublin tech professionals (GSUs, 52% tax, mortgage & rent drag)
            </p>
          </div>
        </div>

        {/* Quick Actions & Controls */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
          {/* Preset Selector */}
          <div className="relative flex items-center">
            <Sparkles className="w-4 h-4 text-brand-400 absolute left-2.5 pointer-events-none" />
            <select
              onChange={(e) => handlePresetChange(e.target.value)}
              defaultValue="baseline"
              className="pl-8 pr-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer transition-colors"
              title="Select economic scenario preset (updates macro rates, preserves personal financial profile)"
            >
              {PRESET_SCENARIOS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Market Data Badge & Sync */}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenMarketDataModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${statusColor}`}
              title={
                isOverrideActive
                  ? 'Manual rate override active. Click to view or toggle back to market feed.'
                  : 'Click to view market data feed details or configure rates'
              }
            >
              <Radio className={`w-3.5 h-3.5 ${isOverrideActive ? 'text-rose-400 animate-pulse' : 'animate-pulse'}`} />
              <span>
                {config.meta.stock_symbol || 'GOOGL'}: $
                {config.equity_engine.current_share_price_usd?.toFixed(1) || '185.0'}
              </span>
              <span className="text-slate-400">•</span>
              <span>€/$ {config.macro.eur_usd_spot?.toFixed(3) || '0.915'}</span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                  isOverrideActive
                    ? 'bg-rose-900/80 text-rose-200 border border-rose-500/50'
                    : 'bg-slate-900/50 text-slate-300'
                }`}
              >
                {isOverrideActive
                  ? 'OVERRIDE'
                  : marketData?.status === 'live'
                  ? 'Live'
                  : marketData?.status === 'cached'
                  ? 'Cached'
                  : 'Offline Mode'}
              </span>
            </button>

            {onSyncMarketData && marketData && !isSynced && !isOverrideActive && (
              <button
                onClick={onSyncMarketData}
                className="px-2 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors flex items-center gap-1"
                title="Sync latest live market price to current simulation model"
              >
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sync</span>
              </button>
            )}
          </div>

          {/* Audit Log Table Button */}
          <button
            onClick={onOpenTableModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            title="View full 60-month tabular projection"
          >
            <Table className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">60-Mo Table</span>
          </button>

          {/* Export / Import */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportCsv}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
              title="Export 60-Month Trajectory as CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              onClick={handleExportJson}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
              title="Export Simulation Config as JSON"
            >
              <Download className="w-4 h-4 text-brand-400" />
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportJson}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-colors"
              title="Import Personal JSON Config"
            >
              <Upload className="w-4 h-4 text-sky-400" />
            </button>

            <button
              onClick={onResetDefault}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 text-xs transition-colors"
              title="Reset all parameters to default"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
