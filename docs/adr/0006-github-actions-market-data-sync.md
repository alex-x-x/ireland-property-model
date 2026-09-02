# 0006. GitHub Actions Market Data Snapshot & Previous-Day Close Sync

- **Status:** Accepted
- **Date:** 2026-09-02
- **Deciders:** Alex, Antigravity pair programming assistant

## Context

The property buying model requires current Alphabet (GOOGL) equity valuations and EUR/USD foreign exchange rates to simulate 60-month wealth trajectories for tech workers in Ireland.

In local development (`npm run dev`), the Vite development server proxies requests through `/api/yahoo`, bypassing browser Same-Origin Policy restrictions. However, when deployed as a static site to GitHub Pages (`https://alex-x-x.github.io/ireland-property-model/`):

1. **Browser CORS Restrictions**: Stock market providers (Nasdaq API, Yahoo Finance, Stooq) do not include `Access-Control-Allow-Origin: *` headers for client-side web applications. Direct `fetch()` calls from the browser are blocked by browser security.
2. **Third-Party CORS Proxies Fragility**: Free public proxies (`corsproxy.io`, `allorigins.win`) are heavily rate-limited, blocked by Yahoo Finance anti-scraping IP filters, or subject to downtime and paywalls.
3. **Misleading Status Badges**: The app previously reverted to offline fallback benchmark prices ($346.50) without updating simulation equity pools or indicating why live data was unavailable.

## Decision

We introduce a server-to-server **Build-Time and Scheduled GitHub Actions Market Data Extraction Pipeline**:

1. **Extraction Script (`scripts/fetch-market-data.mjs`)**:
   - Runs in Node.js on GitHub Actions (server-to-server, zero CORS restrictions).
   - Queries Yahoo Finance, Stooq, and Nasdaq for the official market closing price and date of close.
   - Queries Open Exchange Rates and the European Central Bank (ECB) for spot EUR/USD rates.
   - Generates and writes `public/market-data.json`.
   - Implements resilient fallbacks preserving pre-existing snapshot data if network hiccups occur.
2. **Scheduled Workflow (`.github/workflows/deploy.yml`)**:
   - Executes automatically on weekdays with post-close retries (`21:30, 22:30, 23:30 UTC Mon–Fri`) and a morning check (`07:00 UTC Mon–Fri`), as well as upon deployment push.
   - Pre-builds and publishes the static JSON snapshot into the `./dist` bundle.
3. **Frontend Integration (`src/services/marketData.ts`)**:
   - Fetches `${import.meta.env.BASE_URL}market-data.json` from the site's own origin with 100% reliability and zero CORS errors.
   - Distinguishes statuses cleanly: `'live'` (Vite dev proxy), `'prev_close'` (official market close snapshot), `'cached'` (session cache), and `'benchmark'` (offline fallback).
   - In `App.tsx`, automatically synchronizes the equity pool with the verified previous day close.
4. **Transparent Discoverability (`Navbar.tsx` & `MarketDataModal.tsx`)**:
   - Compact status badge displays **`PREV CLOSE`** in sky-blue styling (clearly distinct from `LIVE` intraday feeds).
   - Hover hints and modal details disclose the exact market close date and daily GitHub Actions refresh cycle.

## Consequences

- **Positive:** 100% reliable market data on GitHub Pages with zero CORS errors and zero runtime latency.
- **Positive:** No external proxy dependencies, third-party API keys, or paid Cloudflare subscriptions required.
- **Positive:** Accurate previous-day market close prices clearly labeled and discoverable in the UI.
- **Positive:** Preserves real-time proxying in local development mode (`npm run dev`).
- **Negative/Tradeoff:** Prices reflect the official previous trading day close rather than tick-by-tick intraday movements (adequate for 5-year macro financial planning).

## Alternatives considered

- **Public Third-Party CORS Proxies** — rejected due to extreme instability, IP bans by Yahoo, and security concerns.
- **Custom Cloudflare Worker Proxy** — rejected to avoid external account overhead and maintain simplicity.
- **Manual Rate Entry Only** — kept as an optional override toggle, but insufficient as a primary default for casual users.
