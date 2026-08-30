# Implementation Plan: Ireland Property Acquisition & Equity Decision Engine

Build a standalone, client-side web application that simulates an Irish tech professional's 60-month financial trajectory to answer: *"Should I buy as soon as I hit the minimum deposit threshold, or should I keep renting to let unvested stock and investments compound?"*

## User Review Required

> [!IMPORTANT]
> **Updated Requirements Incorporated**:
> 1. **Git Repository Initialized**: Git repo initialized in `e:\Projects\property_buying_model`.
> 2. **Project Specification**: `SPEC.md` written and committed with full context, formulas, and data models.
> 3. **Configurable Mortgage Parameters in Schema**: Added `mortgage` section (`mortgage_interest_rate: 0.035` [AIB Benchmark], `mortgage_term_years: 25`, `yearly_maintenance_rate: 0.01`, `buyer_gross_annual_salary_eur: 225000`, `cbi_max_lti_multiple: 4.0`) directly to JSON config and state model, fully editable in UI.
> 4. **Live Market Data Integration (Google GSUs & FX)**: Integration with open financial feeds (Yahoo Finance / Stooq / ECB FX APIs) to fetch live and historical closing prices for Alphabet (`GOOG` / `GOOGL`) and EUR/USD exchange rates, with clear visual badge for offline/fallback mode.

## Architecture & Directory Structure

```
property_buying_model/
├── docs/
│   └── adr/
│       ├── README.md
│       └── 0001-client-side-react-vite-simulation-engine.md
├── src/
│   ├── engine/
│   │   ├── types.ts              # Data model & JSON schemas
│   │   ├── constants.ts          # Default config (including AIB mortgage params & GOOGL symbol)
│   │   ├── vesting.ts            # Grant vesting date & share schedule logic
│   │   ├── simulation.ts         # 60-month chronological asset & target capital progression
│   │   ├── mortgage.ts           # Mortgage amortization & home equity calculations
│   │   ├── decision.ts           # Opportunity cost matrix & Buy vs Wait comparison
│   │   └── presets.ts            # Stress test scenarios (Bull, Bear, Property Surge, etc.)
│   ├── services/
│   │   └── marketData.ts         # Live & historical GOOGL and EUR/USD FX price fetcher
│   ├── components/
│   │   ├── Navbar.tsx            # Header, preset loader, JSON import/export, reset
│   │   ├── Sidebar.tsx           # Live parameter sliders & input controls
│   │   ├── MarketDataWidget.tsx  # Live GOOG / FX price checker & historical date fetcher
│   │   ├── GrantsManager.tsx     # GSU grant editor (33/33/22/12, 25/25/25/25, custom)
│   │   ├── ProjectionChart.tsx   # Wealth vs Target Capital chart with vest events & buy date crossover
│   │   ├── DecisionMatrix.tsx    # Recommendation banner, opportunity cost matrix & breakdown
│   │   ├── ScenarioComparison.tsx # Multi-horizon net wealth projection comparison
│   │   └── MonthlyTableModal.tsx # Full 60-month audit log table modal
│   ├── App.tsx                   # Main layout & state integration
│   ├── main.tsx                  # Application entry point
│   └── index.css                 # Tailwind & typography styles
├── tests/
│   ├── vesting.test.ts           # Unit tests for historical reconciliation & cliff schedules
│   ├── simulation.test.ts        # Unit tests for asset compounding, stamp duty, target capital
│   ├── mortgage.test.ts          # Unit tests for mortgage amortization & loan balance tracking
│   └── decision.test.ts          # Unit tests for buy vs wait delta & opportunity cost
├── SPEC.md                       # Full project system specification
├── AGENTS.md                     # Project-specific guidelines and conventions
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Step-by-Step Execution Plan

### Step 1: Scaffold Vite + React + TypeScript + Tailwind project
- Install dependencies: `react`, `react-dom`, `lucide-react`, `recharts`, `clsx`, `tailwind-merge`.
- Install dev dependencies: `vite`, `typescript`, `@types/react`, `@types/react-dom`, `tailwindcss`, `postcss`, `autoprefixer`, `vitest`.

### Step 2: Implement & Test Core Engine (TDD)
- Define TypeScript interfaces in `src/engine/types.ts`.
- Write unit tests in `tests/vesting.test.ts`, `tests/simulation.test.ts`, `tests/mortgage.test.ts`, `tests/decision.test.ts`.
- Implement `vesting.ts`, `mortgage.ts`, `simulation.ts`, `decision.ts`, `constants.ts`, and `presets.ts` until all tests pass.

### Step 3: Implement Live Market Data Service
- Create `src/services/marketData.ts` with open endpoints for Google stock quotes and ECB exchange rates.
- Handle fallback cleanly with state flags (`'live' | 'cached' | 'fallback'`).

### Step 4: Build Interactive UI Dashboard
- Build `Sidebar.tsx` with live sliders and numeric inputs.
- Build `GrantsManager.tsx` with visual schedule and grant configuration.
- Build `ProjectionChart.tsx` with Recharts (Wealth vs Target Capital, vest marks, buy date marker).
- Build `DecisionMatrix.tsx` with clear financial recommendation and opportunity cost breakdowns (+12m, +24m, +36m).
- Build `ScenarioComparison.tsx` and `MonthlyTableModal.tsx`.

### Step 5: Verification & Review
- Run full test suite (`npm test`).
- Run build check (`npm run build`).
- Perform 3-perspective self-review (Correctness, Maintainability, Security/Performance).
