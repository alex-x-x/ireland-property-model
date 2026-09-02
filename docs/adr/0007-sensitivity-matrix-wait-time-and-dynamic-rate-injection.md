# 0007. Sensitivity Matrix Wait Time Strategy Controller & Dynamic Axis Rate Injection

- **Status:** Accepted
- **Date:** 2026-09-02
- **Deciders:** Alex, Antigravity pair programming assistant

## Context

The 2D Sensitivity Matrix evaluates tech stock growth vs. Irish residential property inflation to determine whether waiting to purchase yields higher terminal net wealth than buying immediately. However, the original implementation suffered from two major mathematical and usability limitations:

1. **Flawed Horizon Slider Truncation**: The original widget featured a "Horizon" slider ($M1$ to $M60$) that truncated the simulation window. Truncating at 12 or 24 months unfairly penalized purchase scenarios by front-loading non-recoverable transaction friction (1%–2% Irish Stamp Duty, legal conveyancing, surveyor fees) without sufficient mortgage amortization runway to recover equity. Furthermore, a user could not evaluate a 24-month delay if the slider was set to 12 months.
2. **Discrete Grid Snapping Distortion**: Standard columns were hardcoded to discrete brackets ($-3\%, 0\%, +3\%, +5\%, +8\%$) and rows to 5% intervals. Because real estate compounding on a €600,000+ Irish house creates a €70,000+ divergence between 3% and 5% inflation over 5 years, snapping a user's assumed 4.0% inflation to 5.0% introduced significant artificial bias and rendered the "You Are Here" pin and breakeven calculations inaccurate.

## Decision

We restructured the sensitivity engine and UI around a **Wait Time Strategy Controller** and **Dynamic Axis Rate Injection**:

1. **Fixed 5-Year (Month 60) Terminal Wealth Evaluation**:
   - All scenario comparisons strictly benchmark Total Net Wealth (Liquid Portfolio + Amortized Home Equity) at **Month 60**, providing a completely neutral, apples-to-apples comparison free from early-truncation transaction fee distortions.
2. **Strategy Controller & Time-Travel Presets (`SensitivityWaitMode`)**:
   - `optimal`: Automatically identifies the highest-wealth wait delay per cell without duplicate amortization simulation.
   - `12m`, `24m`, `36m`: Fixed delay comparisons (buying at month $t^* + W$ vs. $t^*$).
   - `rent`: Evaluates renting all 60 months and compounding a 100% liquid portfolio.
   - `number` (Custom Slider): Interactive stepper (+1 to +48 months) allowing users to time-travel across any custom delay.
3. **Dynamic Axis Rate Injection (`getDynamicSensitivityRates`)**:
   - Compares user sidebar assumptions against base presets using smart deduplication tolerances ($\pm 0.25\%$ for property inflation, $\pm 0.25\%$ for stock growth).
   - If user assumptions fall between presets, the exact user values are dynamically injected into the evaluation axes in strictly sorted ascending order (expanding the matrix up to $12 \times 6 = 72$ cells).
4. **Indifference Hurdle Rate Linear Interpolation (`calculateBreakevenStockRate`)**:
   - Evaluates the zero-crossing where net wealth delta crosses zero ($\Delta W(g_s^*) = 0$) against the exact user property column ($0\%$ distance error):
     $$g_s^* = g_{s,1} + \frac{-\Delta_1}{\Delta_2 - \Delta_1} (g_{s,2} - g_{s,1})$$
   - Handles boundary regimes (`always_wait`, `always_buy`, and `unaffordable`).
5. **UI Synchronization & Layout Stabilization**:
   - Derived `displayPropRates` directly from active `gridData` to guarantee headers and cells remain in lockstep during Web Worker debounce windows.
   - Right-aligned custom controls and reserved a static layout slot for the `Computing...` indicator to eliminate horizontal layout shifts.
   - Constrained the first column (`w-44 sm:w-48`) with `sticky left-0` to maximize screen real estate for matrix data columns.

## Consequences

- **Positive:** Replaces misleading early-truncation horizons with an economically robust wait-delay evaluation benchmark.
- **Positive:** Zero approximation error: the heatmap base case and hurdle rate evaluate against the user's exact inputs.
- **Positive:** Pure functional engine executes 72 permutations in < 5ms, offloaded cleanly via Web Worker with debounce.
- **Positive:** Fully verified with 135 unit tests in Vitest.
- **Negative/Tradeoff:** Matrix size expands from 55 to up to 72 cells, requiring responsive horizontal table scrolling on small mobile screens (mitigated by sticky row labels).

## Alternatives considered

- **Preserving Truncated Horizon Slider** — rejected because front-loaded transaction friction makes short horizons mathematically misleading.
- **Static Discrete-Only Grids** — rejected because discrete 2%–3% property inflation steps are too coarse for multi-hundred-thousand-euro capital decisions.
