# Property Buying Model — Project Context

## Overview
Interactive financial decision-modeling application simulating 60-month wealth trajectories for Dublin tech professionals balancing Google Stock Units (GSUs), Irish marginal tax (52%), property price inflation, and mortgage amortization.

## Project Structure
- `src/engine/`: Pure functional mathematical simulation engine (no React/DOM dependencies).
- `src/services/`: Market data fetchers (Alphabet GOOGL stock price & EUR/USD FX rates).
- `src/components/`: React UI components (Sidebar, Charts, Decision Matrix, Grants Manager, Modal).
- `tests/`: Vitest unit test suite verifying mathematical correctness.
- `docs/adr/`: Architecture Decision Records.

## Development & Test Commands
- `npm run dev`: Start Vite development server.
- `npm test`: Run Vitest unit tests.
- `npm run build`: Typecheck and produce production bundle.

## Domain Rules & Financial Assumptions
- Default mortgage benchmark: AIB 2026 rates (~3.50% fixed/green), 25-year amortization term.
- Irish FTB deposit threshold: 10% minimum deposit + tiered Stamp Duty (1% up to €1M, 2% excess) + €3,000 legal/closing fees.
- Irish GSU Vesting Tax: 52% marginal rate (Income Tax 40% + USC 8% + PRSI 4%) via sell-to-cover at vest.
- Compounding formula: `(1 + g)^(1/12)` per month.
