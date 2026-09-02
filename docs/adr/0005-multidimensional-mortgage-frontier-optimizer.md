# 0005. Multidimensional Mortgage & Terminal Net Wealth Frontier Optimizer

- **Status:** Accepted
- **Date:** 2026-09-02
- **Deciders:** Alex, Antigravity pair programming assistant

## Context

Traditional mortgage calculators focus exclusively on minimizing debt service or lifetime interest paid in isolation, encouraging buyers to deploy all available cash into upfront deposits or aggressive monthly overpayments. However, for technology professionals in Ireland with Alphabet Google Stock Units (GSUs), cash bonuses, and global equities:

1. **Equity Opportunity Cost (The Hurdle Rate)**: Money committed to extra deposit or mortgage paydown saves a guaranteed ~3.50%–4.50% interest, but foregoes expected equity market compounding (8%–12% post-tax). Minimizing interest alone can destroy hundreds of thousands of euros in terminal net wealth.
2. **Liquidity Fragility**: Draining cash and liquid stocks creates "house-rich, cash-poor" vulnerability under macroeconomic shocks or rate spikes.
3. **Irish Market Non-Linearities**: Irish mortgage lenders feature discrete Loan-to-Value (LTV) rate pricing (e.g. 80% Green and 70% Super-Green discounts), 52% marginal tax on bonus distributions, and fixed-period overpayment restrictions.

## Decision

We introduce a client-side **Multidimensional Pareto Frontier & Terminal Net Wealth Optimizer**:

1. **Pure Functional Optimization Engine (`src/engine/optimizer.ts`)**:
   - Evaluates a parameter grid across LTV tiers (Min Deposit, 80% Green, 70% Super-Green, Max Liquid), terms (15, 20, 25, 30, 35 years), monthly overpayments, and annual bonus allocations.
   - Accurately computes **Terminal Net Wealth at Month 60** ($W_{\text{net}} = \text{Home Equity} + \text{Remaining Liquid Wealth}$) connected directly to the 60-month trajectory simulation.
   - Computes the mathematical **Pareto Optimal Frontier** of non-dominated solutions across Lifetime Interest vs Terminal Net Wealth vs Household Safety Score.
   - Identifies the exact **Stock Breakeven Hurdle Rate**:
     $$g^* = \frac{r_{\text{mortgage}}}{1 - \text{CGT}}$$
2. **4 Curated Strategy Archetypes**:
   - 🏆 **Wealth Maximizer**: Highest Terminal Net Wealth at Month 60.
   - 🌿 **Green LTV Arbitrageur**: Minimum deposit to unlock top-tier Green interest rates while preserving liquidity.
   - 🎯 **Algorithmic Sweet Spot (Knee Point)**: Maximum marginal interest saved per euro committed with a guaranteed safety buffer.
   - 🛡️ **Debt-Free Crusher**: Shortest debt-free horizon and lowest lifetime interest.
3. **Interactive Visual Studio (`src/components/FrontierOptimizerCard.tsx`)**:
   - 2D Recharts Pareto scatter plot and frontier curve with tooltips and 1-click strategy sync.
   - In-app interactive methodology guides and mathematical explanations in `HelpGuideModal.tsx`.

## Consequences

- **Positive:** Gives buyers a comprehensive, multi-objective view of their balance sheet rather than single-metric debt minimization.
- **Positive:** Pure functional TypeScript implementation evaluates hundreds of candidate permutations in < 25ms on the client.
- **Positive:** 1-click recipe application seamlessly updates the live Mortgage Studio sliders, charts, and amortization ledgers.
- **Positive:** Verified with a dedicated unit test suite in `tests/optimizer.test.ts` (108/108 tests passing).
- **Negative/Tradeoff:** Assumes static marginal tax (52%) and CGT (33%) rates over the forecast horizon.

## Alternatives considered

- **Single Metric Minimization (Min Interest Only)** — rejected because it ignores equity compounding opportunity costs and creates severe liquidity risk.
- **Offloaded Heavy Server Computation** — rejected to preserve pure client-side privacy and offline zero-latency evaluation.
