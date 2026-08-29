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
  onApplyManualData: (stockPrice: number, fxRate: number, symbol: string) => void;
}

export const MarketDataModal: React.FC<MarketDataModalProps> = ({
  isOpen,
  onClose,
  marketData,
  config,
  onRefresh,
  onApplyManualData,
}) => {
  if (!isOpen) return null;

  const [symbol, setSymbol] = useState(config.meta.stock_symbol || 'GOOGL');
  const [manualStockPrice, setManualStockPrice] = useState(config.equity_engine.current_share_price_usd);
  const [manualFxRate, setManualFxRate] = useState(config.macro.eur_usd_spot);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await onRefresh(symbol);
    setIsRefreshing(false);
  };

  const handleApplyClick = () => {
    onApplyManualData(manualStockPrice, manualFxRate, symbol);
    onClose();
  };

  const handleUseFetchedClick = () => {
    if (marketData) {
      onApplyManualData(marketData.stockPriceUsd, marketData.eurUsdRate, marketData.stockSymbol);
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
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              marketData?.status === 'live'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : marketData?.status === 'cached'
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {marketData?.status === 'live' ? (
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
                  : marketData?.status === 'cached'
                  ? 'Cached Feed Active'
                  : 'Offline Benchmark / Demo Fallback Mode'}
              </div>
              <p className="mt-0.5 opacity-90">{marketData?.source}</p>
              {marketData?.errorMessage && (
                <p className="mt-1 text-[11px] text-amber-400/90 italic">{marketData.errorMessage}</p>
              )}
            </div>
          </div>

          {/* Current Values Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-750">
              <span className="text-xs text-slate-400 font-medium">Alphabet ({symbol}) Stock Price</span>
              <div className="text-xl font-bold text-white mt-1">
                ${marketData?.stockPriceUsd?.toFixed(2) || '185.00'} <span className="text-xs font-normal text-slate-400">USD</span>
              </div>
              {marketData?.historicalStockPriceUsd && (
                <div className="text-[11px] text-slate-400 mt-1">
                  Start Date Close: ${marketData.historicalStockPriceUsd.toFixed(2)}
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-750">
              <span className="text-xs text-slate-400 font-medium">EUR/USD Exchange Rate</span>
              <div className="text-xl font-bold text-white mt-1">
                €{marketData?.eurUsdRate?.toFixed(4) || '0.9150'} <span className="text-xs font-normal text-slate-400">/ $1</span>
              </div>
              {marketData?.historicalEurUsdRate && (
                <div className="text-[11px] text-slate-400 mt-1">
                  Start Date FX: €{marketData.historicalEurUsdRate.toFixed(4)}
                </div>
              )}
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

          {/* Manual Parameter Override */}
          <div className="p-4 rounded-xl bg-slate-850 border border-slate-800 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Manual Rate Override</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Stock Price ($ USD)</label>
                <input
                  type="number"
                  step="0.5"
                  value={manualStockPrice}
                  onChange={(e) => setManualStockPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">EUR/USD Spot (€ per $)</label>
                <input
                  type="number"
                  step="0.005"
                  value={manualFxRate}
                  onChange={(e) => setManualFxRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
          <button
            onClick={handleUseFetchedClick}
            className="text-xs text-brand-400 hover:text-brand-300 font-medium underline flex items-center gap-1"
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
