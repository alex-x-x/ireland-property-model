# 0008. Removal of Hidden Mortgage Rate Assumptions in Favor of Explicit User Rates

- **Status:** Accepted (Supersedes LTV Tier Pricing in [0005](0005-multidimensional-mortgage-frontier-optimizer.md))
- **Date:** 2026-09-03
- **Deciders:** Alex, Antigravity pair programming assistant

## Context

In [ADR 0005](0005-multidimensional-mortgage-frontier-optimizer.md), the Pareto Frontier Optimizer introduced dynamic interest rate adjustments based on Loan-to-Value (LTV) bands (-0.20% for <= 70% LTV and +0.35% for > 80% LTV) to simulate Irish bank pricing tiers (Green vs. High-LTV).

However, because the application does not expose an explicit matrix of bank rates or a BER rating input in the UI, applying a strategy candidate (e.g. *Wealth Maximizer*) unexpectedly altered the user's configured interest rate input (e.g. silently switching from 3.45% to 3.25%). This created confusing behavior where the optimizer appeared to overwrite user parameters with hidden, unverifiable assumptions.

## Decision

We eliminate all implicit LTV/BER-based interest rate adjustments from the simulation and optimization engine:

1. **Strictly Explicit Rate Inheritance (`src/engine/optimizer.ts`)**:
   - All candidate recipes evaluated by `generateCandidateStrategies` inherit the exact interest rate configured by the user in the UI:
     $$\text{interestRatePct} = \text{config.mortgage.mortgage\_interest\_rate} \times 100$$
   - No hidden discounts or penalties are added based on deposit size, LTV, or unconfigured BER tiers.
2. **Deterministic UI State Synchronization**:
   - When a user selects and applies any strategy from the Pareto Frontier or Curated Archetypes, the interest rate parameter remains unchanged and identical to the user's explicit setting.
3. **Refactored Curated Archetype 2**:
   - Curated Archetype 2 is refactored from *"Green Arbitrageur"* (which relied on green rate discounts) to **"Balanced Leverage (80% LTV)"**, focusing directly on the economic trade-off of selecting an 80% LTV loan to manage debt size while leaving surplus liquid capital compounding in investments.

## Consequences

- **Positive:** Complete transparency and determinism: calculations strictly reflect the parameters set in the UI without hidden adjustments.
- **Positive:** Applying any strategy recipe preserves user-configured rates without confusing input slider shifts.
- **Positive:** Keeps the simulation model clean and avoids unnecessary UI bloat from unneeded BER rating tables.
- **Negative/Tradeoff:** Does not model Irish bank Green/LTV rate differentials automatically unless the user manually edits the interest rate input.

## Alternatives considered

- **Adding a Full BER & Bank Rate Table to the UI** — rejected as it introduces significant UI complexity and cognitive load for parameters that users can already test directly via the interest rate slider.
