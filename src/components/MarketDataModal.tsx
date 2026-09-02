import React, { useState } from 'react';
import { X, RefreshCw, Radio, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { MarketDataResult } from '../services/marketData';
import { SimulationConfig } from '../engine/types';

interface MarketDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketData: MarketDataResult | null;
  config: SimulationConfig;
  onRefresh: (symbol: string) => Promise<void>;
  onApplyManualData: (stockPrice: number, fxRate: number, symbol: string, isManualOverride?: boolean) => void;
  onToggleManualOverride?: (enabled: boolean) => void;
}

export const MarketDataModal: React.FC<MarketDataModalProps> = ({
  isOpen,
  onClose,
  marketData,
  config,
  onRefresh,
  onApplyManualData,
  onToggleManualOverride,
}) => {
  if (!isOpen) return null;

  const [symbol, setSymbol] = useState(config.meta.stock_symbol || 'GOOGL');
  const [manualStockPrice, setManualStockPrice] = useState(config.equity_engine.current_share_price_usd);
  const [manualFxRate, setManualFxRate] = useState(config.macro.eur_usd_spot);
  const [isManualOverride, setIsManualOverride] = useState(!!config.macro.use_manual_market_override);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await onRefresh(symbol);
    setIsRefreshing(false);
  };

  const handleApplyClick = () => {
    onApplyManualData(manualStockPrice, manualFxRate, symbol, isManualOverride);
    if (onToggleManualOverride) {
      onToggleManualOverride(isManualOverride);
    }
    onClose();
  };

  const handleUseFetchedClick = () => {
    if (marketData) {
      setIsManualOverride(false);
      onApplyManualData(marketData.stockPriceUsd, marketData.eurUsdRate, marketData.stockSymbol, false);
      if (onToggleManualOverride) {
        onToggleManualOverride(false);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Live Market Data & GSU Pricing</h3>
              <p className="text-xs text-slate-400">Alphabet Inc. stock price & EUR/USD Spot FX rates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Status Banner */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-3 ${
              marketData?.status === 'live'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : marketData?.status === 'prev_close'
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                : marketData?.status === 'cached'
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {marketData?.status === 'live' || marketData?.status === 'prev_close' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : marketData?.status === 'cached' ? (
              <Radio className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <div className="font-semibold capitalize">
                {marketData?.status === 'live'
                  ? 'Live Public Feed Active'
                  : marketData?.status === 'prev_close'
                  ? 'Official Market Close Snapshot Active'
                  : marketData?.status === 'cached'
                  ? 'Cached Feed Active'
                  : 'Offline Benchmark / Fallback Mode'}
              </div>
              <p className="mt-0.5 opacity-90">{marketData?.source}</p>
              {marketData?.closeDate && (
                <p className="mt-1 text-[11px] text-sky-300 font-mono">
                  Market Close Date: {marketData.closeDate} (Synced daily after US market close via GitHub Actions)
                </p>
              )}
              {marketData?.errorMessage && (
                <p className="mt-1 text-[11px] text-amber-400/90 italic">{marketData.errorMessage}</p>
              )}
            </div>
          </div>

          {/* Current Values Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-750">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Alphabet ({symbol})</span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold border ${
                    marketData?.stockStatus === 'live'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : marketData?.stockStatus === 'prev_close'
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                      : marketData?.stockStatus === 'cached'
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                      : 'bg-slate-700 text-slate-400 border-slate-600'
                  }`}
                >
                  {marketData?.stockStatus === 'prev_close'
                    ? 'PREV CLOSE'
                    : marketData?.stockStatus?.toUpperCase() || 'BENCHMARK'}
                </span>
              </div>
              <div className="text-xl font-bold text-white mt-1">
                ${marketData?.stockPriceUsd?.toFixed(2) || '346.50'} <span className="text-xs font-normal text-slate-400">USD</span>
              </div>
              {marketData?.stockStatus === 'prev_close' && marketData?.closeDate && (
                <div className="text-[11px] text-sky-300 mt-1 flex items-center gap-1">
                  <span>Close Date:</span>
                  <span className="font-mono font-semibold">{marketData.closeDate}</span>
                </div>
              )}
              {marketData?.historicalStockPriceUsd && marketData.stockStatus !== 'prev_close' && (
                <div className="text-[11px] text-slate-400 mt-1">
                  Start Date Close: ${marketData.historicalStockPriceUsd.toFixed(2)}
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-750">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">USD / EUR FX Rate</span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold border ${
                    marketData?.fxStatus === 'live'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : marketData?.fxStatus === 'cached'
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                      : 'bg-slate-700 text-slate-400 border-slate-600'
                  }`}
                >
                  {marketData?.fxStatus?.toUpperCase() || 'BENCHMARK'}
                </span>
              </div>
              <div className="text-xl font-bold text-white mt-1">
                €{marketData?.eurUsdRate?.toFixed(4) || '0.8600'} <span className="text-xs font-normal text-slate-400">/ $1 USD</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Inversion: 1 EUR = ${(1 / (marketData?.eurUsdRate || 0.86)).toFixed(4)} USD
              </div>
            </div>
          </div>

          {/* Symbol Selector & Live Refresh */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">Stock Ticker</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="GOOGL">Alphabet Inc. Class A (GOOGL)</option>
                <option value="GOOG">Alphabet Inc. Class C (GOOG)</option>
              </select>
            </div>

            <div className="pt-5">
              <button
                onClick={handleRefreshClick}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg shadow-md transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Fetching...' : 'Fetch Live'}</span>
              </button>
            </div>
          </div>

          {/* Manual Parameter Override Section */}
          <div className={`p-4 rounded-xl border transition-colors space-y-3 ${
            isManualOverride ? 'bg-rose-950/20 border-rose-500/40' : 'bg-slate-850 border-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isManualOverride ? 'bg-rose-500 animate-ping' : 'bg-slate-500'}`} />
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Manual Rate Override
                </h4>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isManualOverride}
                  onChange={(e) => setIsManualOverride(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                <span className="ml-2 text-xs font-medium text-slate-300">
                  {isManualOverride ? (
                    <span className="text-rose-400 font-bold">Enabled</span>
                  ) : (
                    <span className="text-slate-400">Disabled (Default)</span>
                  )}
                </span>
              </label>
            </div>

            {isManualOverride ? (
              <p className="text-[11px] text-rose-300/90 font-medium">
                ⚠️ Manual Override Active: Custom rates below take precedence over live and cached feeds.
              </p>
            ) : (
              <p className="text-[11px] text-slate-400">
                Overrides disabled. The simulation automatically tracks market data feeds. Toggle above to lock custom prices.
              </p>
            )}

            <div className={`grid grid-cols-2 gap-3 transition-opacity ${!isManualOverride ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Stock Price ($ USD)</label>
                <input
                  type="number"
                  step="0.5"
                  disabled={!isManualOverride}
                  value={manualStockPrice}
                  onChange={(e) => setManualStockPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">EUR/USD Spot (€ per $)</label>
                <input
                  type="number"
                  step="0.005"
                  disabled={!isManualOverride}
                  value={manualFxRate}
                  onChange={(e) => setManualFxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
          <button
            onClick={handleUseFetchedClick}
            className="text-xs text-brand-400 hover:text-brand-300 font-semibold underline flex items-center gap-1"
          >
            <span>Sync Live Rates to Model</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyClick}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-md transition-colors"
            >
              Apply Rates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
