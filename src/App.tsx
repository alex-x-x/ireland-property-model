import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PersonalProfileHeader } from './components/PersonalProfileHeader';
import { ProjectionChart } from './components/ProjectionChart';
import { DecisionMatrix } from './components/DecisionMatrix';
import { SensitivityMatrix } from './components/SensitivityMatrix';
import { MonthlyCashflowWidget } from './components/MonthlyCashflowWidget';
import { MarketDataModal } from './components/MarketDataModal';
import { MonthlyTableModal } from './components/MonthlyTableModal';
import { HelpGuideModal } from './components/HelpGuideModal';
import { DEFAULT_CONFIG } from './engine/constants';
import { SimulationConfig, Grant } from './engine/types';
import { runSimulation } from './engine/simulation';
import { runDecisionAnalysis } from './engine/decision';
import { fetchMarketData, MarketDataResult } from './services/marketData';

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
            if (res.isLiveStock || res.stockStatus === 'cached') {
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

  const handleRefreshMarketData = async (symbol: string) => {
    const res = await fetchMarketData(symbol, config.meta.start_date);
    setMarketData(res);
    if (!config.macro.use_manual_market_override) {
      setConfig((prev) => {
        const nextEquity = { ...prev.equity_engine };
        const nextMacro = { ...prev.macro };
        if (res.isLiveStock || res.stockStatus === 'cached') {
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
  };

  const handleApplyMarketData = (
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
  };

  const handleToggleManualOverride = (enabled: boolean) => {
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
  };

  const handleQuickSync = () => {
    if (marketData) {
      handleApplyMarketData(marketData.stockPriceUsd, marketData.eurUsdRate, marketData.stockSymbol, false);
    }
  };

  const handleResetDefault = () => {
    if (window.confirm('Reset all parameters back to default Irish tech professional baseline?')) {
      setConfig(DEFAULT_CONFIG);
      localStorage.removeItem('dublin_property_model_config');
    }
  };

  const handleUpdateGrants = (grants: Grant[]) => {
    setConfig((prev) => ({
      ...prev,
      equity_engine: {
        ...prev.equity_engine,
        grants,
      },
    }));
  };

  // Run pure functional simulation and decision engine
  const monthlyPoints = useMemo(() => runSimulation(config), [config]);
  const decision = useMemo(() => runDecisionAnalysis(config, monthlyPoints), [config, monthlyPoints]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        config={config}
        onUpdateConfig={setConfig}
        onResetDefault={handleResetDefault}
        marketData={marketData}
        onOpenMarketDataModal={() => setIsMarketModalOpen(true)}
        onOpenTableModal={() => setIsTableModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        monthlyPoints={monthlyPoints}
        onSyncMarketData={handleQuickSync}
      />

      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* 1. TOP SECTION: Personal Financial Profile & GSU Grants Baseline */}
        <PersonalProfileHeader
          config={config}
          onChange={setConfig}
          isProfileLocked={isProfileLocked}
          onToggleProfileLock={() => setIsProfileLocked((prev) => !prev)}
          onUpdateGrants={handleUpdateGrants}
        />

        {/* 2. MAIN 2-COLUMN MODELING WORKSPACE */}
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center w-full">
          {/* Left Column: Financial Modeling Sliders */}
          <Sidebar config={config} onChange={setConfig} />

          {/* Right Column: Decision Analytics & Projections */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* Core Recommendation & Opportunity Cost Matrix */}
            <DecisionMatrix decision={decision} config={config} />

            {/* 60-Month Trajectory Chart */}
            <ProjectionChart data={monthlyPoints} decision={decision} />

            {/* Month-by-Month Cashflow & Wealth Breakdown Widget */}
            <MonthlyCashflowWidget data={monthlyPoints} config={config} />

            {/* 2D Sensitivity Heatmap */}
            <SensitivityMatrix config={config} />
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
          <span>Dublin Property Acquisition & Equity Decision Engine • Pure Client-Side Simulation</span>
          <span>AIB 2026 Mortgage Benchmark (~3.50% Fixed) • Irish Marginal Tax (52%) • CBI 4.0x LTI</span>
        </div>
      </footer>
    </div>
  );
};
export default App;
