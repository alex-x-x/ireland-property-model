export type MarketMetricStatus = 'live' | 'cached' | 'benchmark' | 'override';
export type MarketDataStatus = 'live' | 'cached' | 'fallback';

export interface MarketDataResult {
  status: MarketDataStatus;
  stockStatus: 'live' | 'cached' | 'benchmark';
  fxStatus: 'live' | 'cached' | 'benchmark';
  source: string;
  timestamp: string;
  stockSymbol: string;
  stockPriceUsd: number;
  historicalStockPriceUsd?: number;
  eurUsdRate: number; // 1 USD = X EUR (e.g. 0.860 €/$)
  historicalEurUsdRate?: number;
  isLiveStock: boolean;
  isLiveFx: boolean;
  errorMessage?: string;
}

export function getFallbackMarketData(symbol: string = 'GOOGL', _startDate?: string): MarketDataResult {
  return {
    status: 'fallback',
    stockStatus: 'benchmark',
    fxStatus: 'benchmark',
    source: 'Offline Benchmark Fallback (Alphabet $346.50, USD/EUR €0.8600)',
    timestamp: new Date().toISOString(),
    stockSymbol: symbol,
    stockPriceUsd: 346.50,
    historicalStockPriceUsd: 320.00,
    eurUsdRate: 0.860,
    historicalEurUsdRate: 0.880,
    isLiveStock: false,
    isLiveFx: false,
    errorMessage: 'Running with offline benchmarks ($346.50 USD, €0.860 / $1). You can edit rates manually or use live sync.',
  };
}

const STORAGE_CACHE_KEY = 'dublin_property_model_market_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours persistent session cache

function loadCachedData(symbol: string): MarketDataResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    if (!raw) return null;
    const parsed: MarketDataResult = JSON.parse(raw);
    const age = Date.now() - new Date(parsed.timestamp).getTime();
    if (parsed.stockSymbol === symbol && parsed.stockPriceUsd > 0 && parsed.eurUsdRate > 0 && age < CACHE_TTL_MS) {
      return {
        ...parsed,
        status: 'cached',
        stockStatus: 'cached',
        fxStatus: 'cached',
      };
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

function saveCachedData(data: MarketDataResult): void {
  try {
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore localStorage errors
  }
}

export async function fetchMarketData(
  symbol: string = 'GOOGL',
  startDateStr: string = '2026-08-29'
): Promise<MarketDataResult> {
  const localCache = loadCachedData(symbol);

  let liveFxRate: number | null = null;
  let historicalFxRate: number | null = null;
  let liveStockPrice: number | null = null;
  let historicalStockPrice: number | null = null;
  const sources: string[] = [];

  // 1. Fetch EUR/USD FX Rate (Frankfurter / ECB or Open ER API)
  const fxEndpoints = [
    '/api/fx/latest?from=USD&to=EUR',
    'https://open.er-api.com/v6/latest/USD',
    'https://api.frankfurter.app/latest?from=USD&to=EUR',
  ];

  for (const endpoint of fxEndpoints) {
    try {
      const fxResp = await fetch(endpoint, { signal: AbortSignal.timeout(3500) });
      if (fxResp.ok) {
        const data = await fxResp.json();
        if (data?.rates?.EUR) {
          liveFxRate = Number(data.rates.EUR);
          sources.push('ECB Live FX');
          break;
        }
      }
    } catch {
      // Try next endpoint
    }
  }

  // 2. Fetch Historical FX Rate if date provided
  if (startDateStr) {
    const histEndpoints = [
      `/api/fx/${startDateStr}?from=USD&to=EUR`,
      `https://api.frankfurter.app/${startDateStr}?from=USD&to=EUR`,
    ];
    for (const hEndpoint of histEndpoints) {
      try {
        const histResp = await fetch(hEndpoint, { signal: AbortSignal.timeout(3000) });
        if (histResp.ok) {
          const histData = await histResp.json();
          if (histData?.rates?.EUR) {
            historicalFxRate = Number(histData.rates.EUR);
            break;
          }
        }
      } catch {
        // Try next
      }
    }
  }

  // 3. Fetch Stock Price (Local Vite Proxy first, direct Yahoo, then CORS-friendly proxies)
  const rawYahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
  const stockEndpoints = [
    `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`,
    rawYahooUrl,
    `https://corsproxy.io/?url=${encodeURIComponent(rawYahooUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(rawYahooUrl)}`,
  ];

  for (const endpoint of stockEndpoints) {
    try {
      const stockResp = await fetch(endpoint, { signal: AbortSignal.timeout(4000) });
      if (stockResp.ok) {
        const stockData = await stockResp.json();
        const meta = stockData?.chart?.result?.[0]?.meta;
        const regularMarketPrice = meta?.regularMarketPrice;
        if (regularMarketPrice) {
          liveStockPrice = Number(regularMarketPrice);
          sources.push(`Yahoo Finance (${symbol})`);
        }

        const quotes = stockData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
        if (Array.isArray(quotes) && quotes.length > 0) {
          const validCloses = quotes.filter((q: number) => typeof q === 'number');
          if (validCloses.length > 0) {
            historicalStockPrice = validCloses[0];
          }
        }

        if (liveStockPrice !== null) break;
      }
    } catch {
      // Try next
    }
  }

  const isLiveStock = liveStockPrice !== null;
  const isLiveFx = liveFxRate !== null;

  // Determine individual metric statuses
  const stockStatus: 'live' | 'cached' | 'benchmark' = isLiveStock
    ? 'live'
    : localCache?.stockPriceUsd
    ? 'cached'
    : 'benchmark';

  const fxStatus: 'live' | 'cached' | 'benchmark' = isLiveFx
    ? 'live'
    : localCache?.eurUsdRate
    ? 'cached'
    : 'benchmark';

  const finalStockPrice = liveStockPrice ?? localCache?.stockPriceUsd ?? 346.50;
  const finalFxRate = liveFxRate ?? localCache?.eurUsdRate ?? 0.860;

  const finalStatus: MarketDataStatus =
    isLiveStock && isLiveFx ? 'live' : isLiveStock || isLiveFx || localCache ? 'cached' : 'fallback';

  const finalResult: MarketDataResult = {
    status: finalStatus,
    stockStatus,
    fxStatus,
    source: sources.join(' & ') || (localCache ? 'Cached Local Session Data' : 'Offline Benchmark Fallback'),
    timestamp: new Date().toISOString(),
    stockSymbol: symbol,
    stockPriceUsd: finalStockPrice,
    historicalStockPriceUsd: historicalStockPrice ?? localCache?.historicalStockPriceUsd ?? 320.00,
    eurUsdRate: finalFxRate,
    historicalEurUsdRate: historicalFxRate ?? localCache?.historicalEurUsdRate ?? 0.880,
    isLiveStock,
    isLiveFx,
    errorMessage: !isLiveStock && !localCache
      ? 'Live stock feed unreachable in direct browser mode; using Alphabet $346.50 benchmark. Run with "npm run dev" for live proxy.'
      : undefined,
  };

  // Save successful live or mixed fetch to persistent storage
  saveCachedData(finalResult);
  return finalResult;
}
