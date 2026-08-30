import { describe, it, expect } from 'vitest';
import { fetchMarketData, getFallbackMarketData } from '../src/services/marketData';
import { DEFAULT_CONFIG } from '../src/engine/constants';
import { runSimulation } from '../src/engine/simulation';

describe('Market Data Service', () => {
  it('provides reliable fallback market data with accurate indicators', () => {
    const fallback = getFallbackMarketData('GOOGL', '2026-08-29');
    expect(fallback.status).toBe('fallback');
    expect(fallback.stockPriceUsd).toBeGreaterThan(100);
    expect(fallback.eurUsdRate).toBeGreaterThan(0.8);
    expect(fallback.eurUsdRate).toBeLessThan(1.2);
    expect(fallback.source).toContain('Fallback');
  });

  it('handles fetchMarketData without throwing unhandled exceptions', async () => {
    const result = await fetchMarketData('GOOGL', '2026-08-29');
    expect(['live', 'cached', 'fallback']).toContain(result.status);
    expect(result.stockPriceUsd).toBeGreaterThan(0);
    expect(result.eurUsdRate).toBeGreaterThan(0);
  });

  it('verifies that manual override is disabled by default in baseline config', () => {
    expect(DEFAULT_CONFIG.macro.use_manual_market_override).toBe(false);
  });

  it('correctly calculates equity pool with manual price and FX override when enabled', () => {
    // 771 shares held at start, with custom override $346 / share and 0.861 €/$
    const configWithOverride = {
      ...DEFAULT_CONFIG,
      equity_engine: {
        ...DEFAULT_CONFIG.equity_engine,
        current_share_price_usd: 346.0,
        initial_vested_shares_held: 771,
        grants: [], // focus strictly on held shares
      },
      macro: {
        ...DEFAULT_CONFIG.macro,
        eur_usd_spot: 0.861,
        use_manual_market_override: true,
      },
    };

    const sim = runSimulation(configWithOverride);
    // At M0: 771 * 346 * 0.861 = €229,689.61 (0% tax, already vested)
    expect(sim[0].gsuPool).toBeCloseTo(771 * 346 * 0.861, 1);
    expect(sim[0].retainedShares).toBe(771);
  });
});
