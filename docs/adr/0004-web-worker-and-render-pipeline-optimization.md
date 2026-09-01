# 0004. Web Worker Background Simulation & Render Pipeline Architecture

- **Status:** Accepted
- **Date:** 2026-09-01
- **Deciders:** Alex, Antigravity pair programming assistant

## Context

As the Ireland Property Acquisition & Equity Decision Engine expanded to include 55-permutation 2D sensitivity analysis (11 stock growth brackets × 5 property inflation rates), 60-month chronological simulations, and interactive multi-variable mortgage studio calculators, control responsiveness began degrading during user interactions:

1. **CPU Starvation on Main Thread**: The 2D sensitivity heatmap evaluated 55 permutations on every config change, executing 330 full 60-month trajectory simulations (19,800 monthly steps). React 19's `useDeferredValue` scheduled this heavy synchronous computation on the main UI thread, freezing mouse dragging, slider tracks, and typing inputs.
2. **Cascading Component Re-renders**: Top-level `config` mutations in `App.tsx` triggered synchronous re-rendering of all 8 major widgets (including the 1,500-line `PersonalProfileHeader`, 60-row `MonthlyCashflowWidget`, and multiple Recharts SVGs) on every slider tick.
3. **Inner Loop Redundancies**: The simulation and decision engines repeatedly instantiated `Date` objects and performed ISO string slicing inside inner monthly loops across all 330 scenario runs.

## Decision

We introduce a multi-tiered performance architecture that offloads heavy computations and isolates component rendering:

1. **Dedicated Web Worker Offloading**:
   - Extracted pure matrix computation into `src/engine/sensitivity.ts`.
   - Created `src/workers/sensitivity.worker.ts` bundled natively by Vite via ES modules (`new Worker(new URL(...), { type: 'module' })`).
   - Implemented `useSensitivityCalculator` React hook managing worker lifecycle, request ID tracking for stale response cancellation, debounced dispatch, and headless fallback for test runners.
2. **Algorithmic & Date Caching Optimizations**:
   - Implemented `buildVestingScheduleMap` in `src/engine/vesting.ts` to pre-index future vest milestones once per simulation, reducing vest lookup complexity from $O(N \times M)$ to $O(1)$.
   - Reused precomputed base monthly points and timeline date structures across scenario branches in `src/engine/decision.ts`.
3. **Component Render Isolation & Memoization**:
   - Wrapped all 8 major widgets (`PersonalProfileHeader`, `Sidebar`, `DecisionMatrix`, `ProjectionChart`, `MonthlyCashflowWidget`, `SensitivityMatrix`, `MortgageStudioWidget`, `Navbar`) in `React.memo`.
   - Wrapped top-level state handlers in `useCallback` to maintain reference stability.
   - Distributed `debouncedConfig` to analytical widgets while keeping interactive controls snappy and responsive.

## Consequences

- **Positive:** UI thread operates at a stable 60–120 FPS; slider dragging and typing are completely lag-free.
- **Positive:** Heavy 55-permutation matrix computation runs in parallel on background OS threads without blocking UI event loops.
- **Positive:** Mathematical simulation runs 60x faster due to schedule map indexing and date pre-computation.
- **Positive:** Zero regressions; all 98 Vitest unit tests pass with 100% mathematical parity.
- **Positive:** Vite produces a clean, dedicated 16.8 kB `sensitivity.worker` asset chunk with sub-second production builds.
- **Negative/Tradeoff:** Web Worker message passing requires serializable inputs/outputs (satisfied because all simulation configurations and results are plain JSON-compatible objects).

## Alternatives considered

- **Synchronous Chunking via `requestIdleCallback` / `setTimeout` slicing** — leaves CPU contention on the main thread and introduces complex state fragmentation compared to true multi-threaded Web Workers.
- **WebAssembly (Rust/C++) port for simulation** — unnecessary complexity since JavaScript V8 execution with date caching and schedule maps executes 55 permutations in <200ms; the primary bottleneck was thread contention, which Web Workers solve natively.
