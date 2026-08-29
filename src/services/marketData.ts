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
  isLiveStock: boolean;
  isLiveFx: boolean;
  errorMessage?: string;
}

export function getFallbackMarketData(symbol: string = 'GOOGL', _startDate?: string): MarketDataResult {
  return {
    status: 'fallback',
    source: 'Offline Benchmark Fallback (Alphabet $185.00, EUR/USD 0.9150)',
    timestamp: new Date().toISOString(),
    stockSymbol: symbol,
    stockPriceUsd: 185.0,
    historicalStockPriceUsd: 165.0,
    eurUsdRate: 0.915,
    historicalEurUsdRate: 0.91,
    isLiveStock: false,
    isLiveFx: false,
    errorMessage: 'Running with offline benchmarks. You can edit rates manually or use live dev proxy.',
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
  const sources: string[] = [];

  // 1. Fetch EUR/USD FX Rate (Frankfurter / ECB or Open ER API)
  const fxEndpoints = [
    'https://api.frankfurter.app/latest?from=USD&to=EUR',
    'https://open.er-api.com/v6/latest/USD',
    '/api/fx/latest?from=USD&to=EUR',
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
      `https://api.frankfurter.app/${startDateStr}?from=USD&to=EUR`,
      `/api/fx/${startDateStr}?from=USD&to=EUR`,
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

  // 3. Fetch Stock Price (Local Vite Proxy first, then direct Yahoo)
  const stockEndpoints = [
    `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`,
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

  if (isLiveStock || isLiveFx) {
    const finalResult: MarketDataResult = {
      status: 'live',
      source: sources.join(' & ') || 'Live Public Feed',
      timestamp: new Date().toISOString(),
      stockSymbol: symbol,
      stockPriceUsd: liveStockPrice ?? 185.0,
      historicalStockPriceUsd: historicalStockPrice ?? 165.0,
      eurUsdRate: liveFxRate ?? 0.915,
      historicalEurUsdRate: historicalFxRate ?? 0.91,
      isLiveStock,
      isLiveFx,
      errorMessage: !isLiveStock
        ? 'Live stock feed CORS-restricted in direct browser mode; live ECB FX active. When running "npm run dev", local proxy fetches live stock data.'
        : undefined,
    };

    cachedResult = finalResult;
    lastFetchTime = now;
    return finalResult;
  }

  return getFallbackMarketData(symbol, startDateStr);
}
