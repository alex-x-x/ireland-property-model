import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PersonalProfileHeader } from './components/PersonalProfileHeader';
import { ProjectionChart } from './components/ProjectionChart';
import { DecisionMatrix } from './components/DecisionMatrix';
import { SensitivityMatrix } from './components/SensitivityMatrix';
import { MonthlyCashflowWidget } from './components/MonthlyCashflowWidget';
import { MortgageStudioWidget } from './components/MortgageStudioWidget';
import { MarketDataModal } from './components/MarketDataModal';
import { MonthlyTableModal } from './components/MonthlyTableModal';
import { HelpGuideModal } from './components/HelpGuideModal';
import { DEFAULT_CONFIG } from './engine/constants';
import { SimulationConfig, Grant } from './engine/types';
import { runSimulation } from './engine/simulation';
import { runDecisionAnalysis } from './engine/decision';
import { fetchMarketData, isMarketDataStale, MarketDataResult } from './services/marketData';

export const App: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>(() => {
    const saved = localStorage.getItem('dublin_property_model_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  const [isProfileLocked, setIsProfileLocked] = useState<boolean>(true);
  const [marketData, setMarketData] = useState<MarketDataResult | null>(null);
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Keep live refs to avoid stale closure in periodic interval / visibility listeners
  const marketDataRef = useRef<MarketDataResult | null>(marketData);
  marketDataRef.current = marketData;
  const stockSymbolRef = useRef<string>(config.meta.stock_symbol || 'GOOGL');
  stockSymbolRef.current = config.meta.stock_symbol || 'GOOGL';

  // debouncedConfig trails config by 250ms — simulation & decision engine only run
  // after the user pauses typing or dragging, making all input fields immediately responsive.
  const [debouncedConfig, setDebouncedConfig] = useState<SimulationConfig>(config);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedConfig(config), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [config]);

  // Debounce saving config changes to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('dublin_property_model_config', JSON.stringify(config));
      } catch {
        // localStorage write error
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [config]);

  // Fetch initial market data and auto-sync if manual override is disabled
  useEffect(() => {
    let isMounted = true;
    fetchMarketData(config.meta.stock_symbol || 'GOOGL', config.meta.start_date).then((res) => {
      if (isMounted) {
        setMarketData(res);
        if (!config.macro.use_manual_market_override) {
          setConfig((prev) => {
            const nextEquity = { ...prev.equity_engine };
            const nextMacro = { ...prev.macro };
            if (res.isLiveStock || res.stockStatus === 'cached' || res.stockStatus === 'prev_close') {
              nextEquity.current_share_price_usd = res.stockPriceUsd;
            }
            if (res.isLiveFx || res.fxStatus === 'cached') {
              nextMacro.eur_usd_spot = res.eurUsdRate;
            }
            return {
              ...prev,
              equity_engine: nextEquity,
              macro: nextMacro,
            };
          });
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefreshMarketData = useCallback(async (symbol: string, forceFresh: boolean = true) => {
    const res = await fetchMarketData(symbol, config.meta.start_date, forceFresh);
    setMarketData(res);
    if (!config.macro.use_manual_market_override) {
      setConfig((prev) => {
        const nextEquity = { ...prev.equity_engine };
        const nextMacro = { ...prev.macro };
        if (res.isLiveStock || res.stockStatus === 'cached' || res.stockStatus === 'prev_close') {
          nextEquity.current_share_price_usd = res.stockPriceUsd;
        }
        if (res.isLiveFx || res.fxStatus === 'cached') {
          nextMacro.eur_usd_spot = res.eurUsdRate;
        }
        return {
          ...prev,
          meta: {
            ...prev.meta,
            stock_symbol: symbol,
          },
          equity_engine: nextEquity,
          macro: nextMacro,
        };
      });
    }
  }, [config.meta.start_date, config.macro.use_manual_market_override]);

  // Periodic daily check and visibilitychange listener:
  // Auto-refreshes market data once a day, or immediately when returning to the tab if data is >24h old.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isMarketDataStale(marketDataRef.current)) {
          handleRefreshMarketData(stockSymbolRef.current || 'GOOGL');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Heartbeat check every 1 hour to trigger daily refresh when browser tab remains open continuously
    const intervalId = setInterval(() => {
      if (isMarketDataStale(marketDataRef.current)) {
        handleRefreshMarketData(stockSymbolRef.current || 'GOOGL');
      }
    }, 60 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [handleRefreshMarketData]);

  const handleApplyMarketData = useCallback((
    stockPrice: number,
    fxRate: number,
    symbol: string,
    isManualOverride: boolean = false
  ) => {
    setConfig((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        stock_symbol: symbol,
      },
      equity_engine: {
        ...prev.equity_engine,
        current_share_price_usd: stockPrice,
      },
      macro: {
        ...prev.macro,
        eur_usd_spot: fxRate,
        use_manual_market_override: isManualOverride,
      },
    }));
  }, []);

  const handleToggleManualOverride = useCallback((enabled: boolean) => {
    setConfig((prev) => {
      const nextConfig = {
        ...prev,
        macro: {
          ...prev.macro,
          use_manual_market_override: enabled,
        },
      };
      if (!enabled && marketData) {
        nextConfig.equity_engine = {
          ...nextConfig.equity_engine,
          current_share_price_usd: marketData.stockPriceUsd,
        };
        nextConfig.macro.eur_usd_spot = marketData.eurUsdRate;
      }
      return nextConfig;
    });
  }, [marketData]);

  const handleQuickSync = useCallback(() => {
    if (marketData) {
      handleApplyMarketData(marketData.stockPriceUsd, marketData.eurUsdRate, marketData.stockSymbol, false);
    }
  }, [marketData, handleApplyMarketData]);

  const handleResetDefault = useCallback(() => {
    if (window.confirm('Reset all parameters back to default Irish tech professional baseline?')) {
      setConfig(DEFAULT_CONFIG);
      localStorage.removeItem('dublin_property_model_config');
    }
  }, []);

  const handleUpdateGrants = useCallback((grants: Grant[]) => {
    setConfig((prev) => ({
      ...prev,
      equity_engine: {
        ...prev.equity_engine,
        grants,
      },
    }));
  }, []);

  const handleToggleProfileLock = useCallback(() => {
    setIsProfileLocked((prev) => !prev);
  }, []);

  // Run pure functional simulation and decision engine — against debouncedConfig only,
  // so the expensive 60-month loop does not fire on every keystroke.
  const monthlyPoints = useMemo(() => runSimulation(debouncedConfig), [debouncedConfig]);
  const decision = useMemo(() => runDecisionAnalysis(debouncedConfig, monthlyPoints), [debouncedConfig, monthlyPoints]);

  const handleOpenMarketModal = useCallback(() => setIsMarketModalOpen(true), []);
  const handleOpenTableModal = useCallback(() => setIsTableModalOpen(true), []);
  const handleOpenHelpModal = useCallback(() => setIsHelpModalOpen(true), []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        config={config}
        onUpdateConfig={setConfig}
        onResetDefault={handleResetDefault}
        marketData={marketData}
        onOpenMarketDataModal={handleOpenMarketModal}
        onOpenTableModal={handleOpenTableModal}
        onOpenHelpModal={handleOpenHelpModal}
        monthlyPoints={monthlyPoints}
        onSyncMarketData={handleQuickSync}
      />

      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* 1. TOP SECTION: Personal Financial Profile & GSU Grants Baseline */}
        <PersonalProfileHeader
          config={config}
          onChange={setConfig}
          isProfileLocked={isProfileLocked}
          onToggleProfileLock={handleToggleProfileLock}
          onUpdateGrants={handleUpdateGrants}
        />

        {/* 2. MAIN 2-COLUMN MODELING WORKSPACE */}
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center w-full">
          {/* Left Column: Financial Modeling Sliders */}
          <Sidebar config={config} onChange={setConfig} />

          {/* Right Column: Decision Analytics & Projections */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* Core Recommendation & Opportunity Cost Matrix */}
            <DecisionMatrix decision={decision} config={debouncedConfig} />

            {/* 60-Month Trajectory Chart */}
            <ProjectionChart data={monthlyPoints} decision={decision} />

            {/* Month-by-Month Cashflow & Wealth Breakdown Widget */}
            <MonthlyCashflowWidget data={monthlyPoints} config={debouncedConfig} />

            {/* 2D Sensitivity Heatmap (Web Worker Offloaded) */}
            <SensitivityMatrix config={debouncedConfig} />

            {/* Interactive Mortgage Studio & Loan Optimizer */}
            <MortgageStudioWidget config={debouncedConfig} monthlyPoints={monthlyPoints} onChange={setConfig} />
          </div>
        </div>
      </main>

      {/* Modals */}
      <MarketDataModal
        isOpen={isMarketModalOpen}
        onClose={() => setIsMarketModalOpen(false)}
        marketData={marketData}
        config={config}
        onRefresh={handleRefreshMarketData}
        onApplyManualData={handleApplyMarketData}
        onToggleManualOverride={handleToggleManualOverride}
      />

      <MonthlyTableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        monthlyPoints={monthlyPoints}
      />

      <HelpGuideModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-[1720px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Ireland Property Acquisition & Equity Decision Engine • Pure Client-Side Simulation</span>
          <span>AIB 2026 Mortgage Benchmark (~3.50% Fixed) • Irish Marginal Tax (52%) • CBI 4.0x LTI</span>
        </div>
      </footer>
    </div>
  );
};
export default App;
