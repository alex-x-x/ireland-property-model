import { describe, it, expect } from 'vitest';
import { fetchMarketData, getFallbackMarketData, isMarketDataStale, MARKET_DATA_TTL_MS } from '../src/services/marketData';
import { DEFAULT_CONFIG } from '../src/engine/constants';
import { runSimulation } from '../src/engine/simulation';

describe('Market Data Service', () => {
  it('provides reliable fallback market data with accurate indicators', () => {
    const fallback = getFallbackMarketData('GOOGL', '2026-08-29');
    expect(fallback.status).toBe('fallback');
    expect(fallback.stockStatus).toBe('benchmark');
    expect(fallback.fxStatus).toBe('benchmark');
    expect(fallback.stockPriceUsd).toBe(346.50);
    expect(fallback.eurUsdRate).toBe(0.860);
    expect(fallback.source).toContain('Fallback');
  });

  it('handles fetchMarketData without throwing unhandled exceptions and includes distinct statuses', async () => {
    const result = await fetchMarketData('GOOGL', '2026-08-29');
    expect(['live', 'cached', 'fallback']).toContain(result.status);
    expect(['live', 'cached', 'benchmark']).toContain(result.stockStatus);
    expect(['live', 'cached', 'benchmark']).toContain(result.fxStatus);
    expect(result.stockPriceUsd).toBeGreaterThan(0);
    expect(result.eurUsdRate).toBeGreaterThan(0);
  });

  it('correctly detects stale vs fresh market data based on 24-hour TTL', () => {
    // Null or empty data is always stale
    expect(isMarketDataStale(null)).toBe(true);

    const now = Date.now();
    const freshData = {
      ...getFallbackMarketData('GOOGL'),
      timestamp: new Date(now - 1000 * 60 * 60).toISOString(), // 1 hour ago
    };
    expect(isMarketDataStale(freshData)).toBe(false);

    const staleData = {
      ...getFallbackMarketData('GOOGL'),
      timestamp: new Date(now - (MARKET_DATA_TTL_MS + 10000)).toISOString(), // >24 hours ago
    };
    expect(isMarketDataStale(staleData)).toBe(true);

    const invalidTimestampData = {
      ...getFallbackMarketData('GOOGL'),
      timestamp: 'invalid-date',
    };
    expect(isMarketDataStale(invalidTimestampData)).toBe(true);
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
