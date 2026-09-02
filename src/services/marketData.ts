export type MarketMetricStatus = 'live' | 'prev_close' | 'cached' | 'benchmark' | 'override';
export type MarketDataStatus = 'live' | 'prev_close' | 'cached' | 'fallback';

export interface MarketDataResult {
  status: MarketDataStatus;
  stockStatus: 'live' | 'prev_close' | 'cached' | 'benchmark';
  fxStatus: 'live' | 'cached' | 'benchmark';
  source: string;
  timestamp: string;
  stockSymbol: string;
  stockPriceUsd: number;
  historicalStockPriceUsd?: number;
  closeDate?: string;
  isPrevClose?: boolean;
  eurUsdRate: number; // 1 USD = X EUR (e.g. 0.860 €/$)
  historicalEurUsdRate?: number;
  isLiveStock: boolean;
  isLiveFx: boolean;
  errorMessage?: string;
}

export interface MarketSnapshotPayload {
  stockSymbol?: string;
  closePriceUsd?: number;
  closeDate?: string;
  stockSource?: string;
  eurUsdRate?: number;
  eurUsdDate?: string;
  fxSource?: string;
  type?: string;
  status?: string;
  updatedAt?: string;
}

export function parseMarketSnapshot(
  payload: unknown,
  symbol: string = 'GOOGL'
): Partial<MarketDataResult> | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as MarketSnapshotPayload;

  const reqSymbol = symbol.toUpperCase();
  const snapSymbol = (p.stockSymbol || '').toUpperCase();
  const isMatch =
    snapSymbol === reqSymbol ||
    (reqSymbol.startsWith('GOOG') && snapSymbol.startsWith('GOOG'));

  if (
    isMatch &&
    typeof p.closePriceUsd === 'number' &&
    p.closePriceUsd > 0
  ) {
    return {
      stockStatus: 'prev_close',
      isPrevClose: true,
      stockPriceUsd: p.closePriceUsd,
      closeDate: p.closeDate || new Date().toISOString().split('T')[0],
      source: p.stockSource || 'Market Close Snapshot (GitHub Actions)',
      eurUsdRate: typeof p.eurUsdRate === 'number' && p.eurUsdRate > 0 ? p.eurUsdRate : undefined,
    };
  }
  return null;
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

export const STORAGE_CACHE_KEY = 'dublin_property_model_market_cache';
export const MARKET_DATA_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours persistent session cache
const CACHE_TTL_MS = MARKET_DATA_TTL_MS;

export function formatMarketDataTimestamp(isoString?: string): { formattedTime: string; relativeTime: string } {
  if (!isoString) return { formattedTime: 'Unknown', relativeTime: '' };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { formattedTime: 'Unknown', relativeTime: '' };

  const formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const diffMs = Math.max(0, Date.now() - d.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  let relativeTime = 'just now';
  if (diffMin >= 60) {
    relativeTime = `${diffHours}h ago`;
  } else if (diffMin >= 1) {
    relativeTime = `${diffMin}m ago`;
  } else if (diffSec > 10) {
    relativeTime = `${diffSec}s ago`;
  }

  return { formattedTime, relativeTime };
}

export function isMarketDataStale(
  data: MarketDataResult | null | undefined,
  maxAgeMs: number = MARKET_DATA_TTL_MS
): boolean {
  if (!data || !data.timestamp) return true;
  const time = new Date(data.timestamp).getTime();
  if (isNaN(time)) return true;
  return Date.now() - time > maxAgeMs;
}

function loadCachedData(symbol: string): MarketDataResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    if (!raw) return null;
    const parsed: MarketDataResult = JSON.parse(raw);
    const age = Date.now() - new Date(parsed.timestamp).getTime();
    if (parsed.stockSymbol === symbol && parsed.stockPriceUsd > 0 && parsed.eurUsdRate > 0 && age < CACHE_TTL_MS) {
      return {
        ...parsed,
        status: parsed.status === 'prev_close' ? 'prev_close' : 'cached',
        stockStatus: parsed.stockStatus === 'prev_close' ? 'prev_close' : 'cached',
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
  startDateStr: string = '2026-08-29',
  forceFresh: boolean = false
): Promise<MarketDataResult> {
  const localCache = forceFresh ? null : loadCachedData(symbol);

  let liveFxRate: number | null = null;
  let historicalFxRate: number | null = null;
  let liveStockPrice: number | null = null;
  let historicalStockPrice: number | null = null;
  let isPrevClose = false;
  let closeDate: string | undefined = undefined;
  const sources: string[] = [];

  // 1. Fetch EUR/USD FX Rate (Open ER API or Frankfurter ECB direct)
  const fxEndpoints = [
    'https://open.er-api.com/v6/latest/USD',
    'https://api.frankfurter.app/latest?from=USD&to=EUR',
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

  // 3. Fetch Stock Price
  // 3a. In local Vite development mode, try local dev proxies (Stooq & Yahoo)
  if (typeof window !== 'undefined' && (import.meta as any)?.env?.DEV) {
    // 3a.1. Try Stooq dev proxy first (no crumbs, no GDPR consent walls)
    try {
      const cleanSym = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
      const stooqSymbol = `${cleanSym}.us`;
      const stooqUrl = `/api/stooq/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`;
      const stooqResp = await fetch(stooqUrl, { signal: AbortSignal.timeout(3500) });
      if (stooqResp.ok) {
        const text = await stooqResp.text();
        const lines = text.trim().split('\n');
        if (lines.length >= 2) {
          const cols = lines[1].split(',');
          // Columns: Symbol,Date,Time,Open,High,Low,Close,Volume
          const closeVal = parseFloat(cols[6]);
          if (!isNaN(closeVal) && closeVal > 0) {
            liveStockPrice = closeVal;
            sources.push(`Stooq Dev Proxy (${symbol.toUpperCase()})`);
          }
        }
      }
    } catch {
      // Fall through to Yahoo proxy
    }

    // 3a.2. Try Yahoo dev proxy
    if (liveStockPrice === null) {
      try {
        const devProxyUrl = `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`;
        const devResp = await fetch(devProxyUrl, { signal: AbortSignal.timeout(3000) });
        if (devResp.ok) {
          const devData = await devResp.json();
          const regularMarketPrice = devData?.chart?.result?.[0]?.meta?.regularMarketPrice;
          if (regularMarketPrice) {
            liveStockPrice = Number(regularMarketPrice);
            sources.push(`Yahoo Finance Live Proxy (${symbol})`);
          }
        }
      } catch {
        // Fall through to snapshot
      }
    }
  }

  // 3b. Fetch static market-data.json snapshot generated by GitHub Actions daily sync
  // Uses Vite base URL (resolves to /ireland-property-model/market-data.json in prod, /market-data.json in dev)
  if (liveStockPrice === null && typeof window !== 'undefined') {
    const rawBase = (import.meta as any)?.env?.BASE_URL || '/';
    const cleanBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
    const candidateUrls = [
      `${cleanBase}market-data.json`,
      '/market-data.json',
      './market-data.json',
      'market-data.json',
    ];

    for (const snapshotUrl of candidateUrls) {
      try {
        const snapshotResp = await fetch(snapshotUrl, { signal: AbortSignal.timeout(3000) });
        const contentType = snapshotResp.headers.get('content-type') || '';
        // Guard against Vite dev SPA fallback returning index.html with 200 OK
        if (snapshotResp.ok && contentType.includes('application/json')) {
          const snapshotData = await snapshotResp.json();
          const parsed = parseMarketSnapshot(snapshotData, symbol);
          if (parsed?.stockPriceUsd) {
            liveStockPrice = parsed.stockPriceUsd;
            isPrevClose = true;
            closeDate = parsed.closeDate;
            if (parsed.source) sources.push(parsed.source);
            if (liveFxRate === null && parsed.eurUsdRate) {
              liveFxRate = parsed.eurUsdRate;
              sources.push('ECB Snapshot FX');
            }
            break;
          }
        }
      } catch {
        // Try next candidate url
      }
    }
  }

  // 3c. Nasdaq public quote API
  if (liveStockPrice === null) {
    try {
      const nasdaqResp = await fetch(
        `https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/info?assetclass=stocks`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (nasdaqResp.ok) {
        const nasdaqData = await nasdaqResp.json();
        const rawPrice = nasdaqData?.data?.primaryData?.lastSalePrice as string | undefined;
        if (rawPrice) {
          const parsed = parseFloat(rawPrice.replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed) && parsed > 0) {
            liveStockPrice = parsed;
            sources.push(`Nasdaq (${symbol}, 15-min delayed)`);
          }
        }
      }
    } catch {
      // Fall through to Yahoo endpoints
    }
  }

  // 3d. Yahoo Finance via public CORS proxies (fallback chain)
  if (liveStockPrice === null) {
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
  }

  const isLiveStock = liveStockPrice !== null && !isPrevClose;
  const isLiveFx = liveFxRate !== null;

  // If live or snapshot fetch did not provide a price, ALWAYS retain previously cached price if available!
  const finalStockPrice = liveStockPrice ?? localCache?.stockPriceUsd ?? 346.50;
  const finalFxRate = liveFxRate ?? localCache?.eurUsdRate ?? 0.860;

  // Determine individual metric statuses
  const stockStatus: 'live' | 'prev_close' | 'cached' | 'benchmark' = isLiveStock
    ? 'live'
    : isPrevClose
    ? 'prev_close'
    : localCache?.stockPriceUsd
    ? (localCache.stockStatus === 'prev_close' ? 'prev_close' : 'cached')
    : 'benchmark';

  const fxStatus: 'live' | 'cached' | 'benchmark' = isLiveFx
    ? 'live'
    : localCache?.eurUsdRate
    ? 'cached'
    : 'benchmark';

  const finalStatus: MarketDataStatus =
    isLiveStock && isLiveFx
      ? 'live'
      : isPrevClose
      ? 'prev_close'
      : isLiveStock || isLiveFx || localCache
      ? 'cached'
      : 'fallback';

  const finalResult: MarketDataResult = {
    status: finalStatus,
    stockStatus,
    fxStatus,
    source: sources.join(' & ') || (localCache ? 'Cached Local Session Data' : 'Offline Benchmark Fallback'),
    timestamp: isLiveStock || isPrevClose || isLiveFx ? new Date().toISOString() : (localCache?.timestamp || new Date().toISOString()),
    stockSymbol: symbol,
    stockPriceUsd: finalStockPrice,
    historicalStockPriceUsd: historicalStockPrice ?? localCache?.historicalStockPriceUsd ?? 320.00,
    closeDate: closeDate ?? localCache?.closeDate,
    isPrevClose,
    eurUsdRate: finalFxRate,
    historicalEurUsdRate: historicalFxRate ?? localCache?.historicalEurUsdRate ?? 0.880,
    isLiveStock,
    isLiveFx,
    errorMessage:
      !isLiveStock && !isPrevClose && localCache?.stockPriceUsd
        ? `Live stock feed unreachable; retained cached rate ($${finalStockPrice.toFixed(2)}).`
        : !isLiveStock && !isPrevClose
        ? 'Live stock feed unreachable in direct browser mode; using Alphabet $346.50 benchmark. Run with "npm run dev" for live proxy.'
        : undefined,
  };

  // Save successful live, prev_close, or mixed fetch to persistent storage
  saveCachedData(finalResult);
  return finalResult;
}
