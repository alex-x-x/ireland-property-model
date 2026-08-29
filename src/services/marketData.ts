export type MarketDataStatus = 'live' | 'cached' | 'fallback';

export interface MarketDataResult {
  status: MarketDataStatus;
  source: string;
  timestamp: string;
  stockSymbol: string;
  stockPriceUsd: number;
  historicalStockPriceUsd?: number;
  eurUsdRate: number; // 1 USD = X EUR
  historicalEurUsdRate?: number;
  errorMessage?: string;
}

// Fallback pricing when offline or CORS blocked
export function getFallbackMarketData(symbol: string = 'GOOGL', _startDate?: string): MarketDataResult {
  return {
    status: 'fallback',
    source: 'Offline Benchmark Fallback (Alphabet GOOGL $185.00, EUR/USD 0.9150)',
    timestamp: new Date().toISOString(),
    stockSymbol: symbol,
    stockPriceUsd: 185.0,
    historicalStockPriceUsd: 165.0,
    eurUsdRate: 0.915,
    historicalEurUsdRate: 0.91,
    errorMessage: 'Live feed unavailable or browser CORS active. Running with baseline benchmarks.',
  };
}

let cachedResult: MarketDataResult | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function fetchMarketData(
  symbol: string = 'GOOGL',
  startDateStr: string = '2026-08-29'
): Promise<MarketDataResult> {
  const now = Date.now();
  if (cachedResult && now - lastFetchTime < CACHE_TTL_MS && cachedResult.stockSymbol === symbol) {
    return {
      ...cachedResult,
      status: 'cached',
    };
  }

  let liveFxRate: number | null = null;
  let historicalFxRate: number | null = null;
  let liveStockPrice: number | null = null;
  let historicalStockPrice: number | null = null;
  let sourceNotes: string[] = [];

  // 1. Fetch EUR/USD FX Rate from Frankfurter / ECB API
  try {
    const fxResp = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR', {
      signal: AbortSignal.timeout(4000),
    });
    if (fxResp.ok) {
      const data = await fxResp.json();
      if (data?.rates?.EUR) {
        liveFxRate = Number(data.rates.EUR);
        sourceNotes.push('ECB Live FX');
      }
    }
  } catch {
    // FX fetch error
  }

  // 2. Fetch Historical FX Rate if date provided
  if (startDateStr) {
    try {
      const histResp = await fetch(`https://api.frankfurter.app/${startDateStr}?from=USD&to=EUR`, {
        signal: AbortSignal.timeout(3000),
      });
      if (histResp.ok) {
        const histData = await histResp.json();
        if (histData?.rates?.EUR) {
          historicalFxRate = Number(histData.rates.EUR);
        }
      }
    } catch {
      // Historical FX error
    }
  }

  // 3. Fetch Alphabet Stock Quote via open endpoints
  try {
    // Attempt Yahoo Finance open quote
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
    const stockResp = await fetch(yahooUrl, {
      signal: AbortSignal.timeout(4000),
    });
    if (stockResp.ok) {
      const stockData = await stockResp.json();
      const meta = stockData?.chart?.result?.[0]?.meta;
      const regularMarketPrice = meta?.regularMarketPrice;
      if (regularMarketPrice) {
        liveStockPrice = Number(regularMarketPrice);
        sourceNotes.push(`Yahoo Finance ${symbol}`);
      }

      // Check historical close in range
      const quotes = stockData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
      if (Array.isArray(quotes) && quotes.length > 0) {
        const validCloses = quotes.filter((q: number) => typeof q === 'number');
        if (validCloses.length > 0) {
          historicalStockPrice = validCloses[0];
        }
      }
    }
  } catch {
    // Stock quote fetch error
  }

  // If live data succeeded partially or fully
  if (liveStockPrice !== null || liveFxRate !== null) {
    const finalResult: MarketDataResult = {
      status: 'live',
      source: sourceNotes.length > 0 ? sourceNotes.join(' & ') : 'Live Public Feed',
      timestamp: new Date().toISOString(),
      stockSymbol: symbol,
      stockPriceUsd: liveStockPrice ?? 185.0,
      historicalStockPriceUsd: historicalStockPrice ?? 165.0,
      eurUsdRate: liveFxRate ?? 0.915,
      historicalEurUsdRate: historicalFxRate ?? 0.91,
    };

    cachedResult = finalResult;
    lastFetchTime = now;
    return finalResult;
  }

  // Graceful fallback if completely offline or CORS-blocked
  const fallback = getFallbackMarketData(symbol, startDateStr);
  return fallback;
}
