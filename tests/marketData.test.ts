import { describe, it, expect } from 'vitest';
import { fetchMarketData, getFallbackMarketData } from '../src/services/marketData';

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
});
