# 0001. Client-Side React/TypeScript Simulation Engine and Architecture

- **Status:** Accepted
- **Date:** 2026-08-29
- **Deciders:** Alex, Antigravity pair programming assistant

## Context

Tech professionals in Ireland face a multi-variable financial decision: whether to liquidate Google Stock Units (GSUs) and investments to buy property immediately upon meeting the 10% First-Time Buyer deposit threshold, or to continue renting while unvested equity compounds. Static spreadsheets fail to capture dynamic cliff schedules (33/33/22/12, 25/25/25/25), Irish marginal tax (52%), currency fluctuations (EUR/USD), property inflation, and mortgage amortization.

We need an interactive, fast, privacy-preserving, zero-backend modeling tool that can simulate financial trajectories over 60 consecutive months in real-time.

## Decision

We will build a pure client-side web application using:
1. **TypeScript & React (via Vite)** for responsive, type-safe UI and instant parameter re-computation.
2. **Decoupled Functional Simulation Engine** in \src/engine/\ with zero UI dependencies, enabling full unit-testing (Vitest) of mathematical logic (compounding, tax, vesting, amortization, decision deltas).
3. **Open Market Data Integration** with public CORS-friendly endpoints (Yahoo Finance / Stooq / ECB) for live & historical Alphabet (GOOGL/GOOG) stock prices and EUR/USD FX rates, paired with clear visual status indicators and deterministic offline fallbacks.
4. **Tailwind CSS & Recharts** for high-density, interactive fintech visualization.

## Consequences

- **Positive:** No backend server or database required; users can run it locally or deploy as a static site. Calculations run in <10ms per parameter change.
- **Positive:** Complete privacy: personal financial figures, grant allocations, and salary data never leave the user's browser.
- **Positive:** High testability: engine logic is 100% deterministic and unit-tested.
- **Negative/Tradeoff:** Public market data endpoints can occasionally rate-limit or experience CORS restrictions; we mitigate this by providing robust fallback demo data and prominent UI indicators when in fallback/offline mode.

## Alternatives considered

- **Python/Streamlit backend** — heavier runtime footprint, requires Python server process, slower slider reactivity compared to in-memory browser calculations.
- **Vanilla spreadsheet / Excel model** — unable to handle complex conditional cliff vesting, real-time FX/stock price fetching, and automated decision comparison matrices cleanly.
