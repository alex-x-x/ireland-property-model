# 0003. Recharts 3 Visualization Modernization & Native React 19 Integration

- **Status:** Accepted
- **Date:** 2026-09-01
- **Deciders:** Alex, Antigravity pair programming assistant

## Context

During the initial React 19 upgrade (Phase 3), the project retained Recharts 2.15 by employing a temporary npm package override (`"overrides": { "react-is": "^19.0.0" }`). This bridge was necessary because Recharts 2.x relied on legacy `react-is` element type checks whose internal symbol references changed in React 19, causing blank charts without the override.

With the general availability of Recharts 3 (`recharts@^3.10.1`), the visualization library provides native React 19 hook and component lifecycle support, improved tree-shaking, and modernized TypeScript definitions. Upgrading to Recharts 3 allows us to eliminate temporary package overrides, establish cleaner dependency resolution, and leverage modern chart composition.

## Decision

We modernize the charting architecture and upgrade to Recharts 3:
1. **Remove Package Override**: Delete `"overrides": { "react-is": "^19.0.0" }` from `package.json`.
2. **Upgrade Recharts Dependency**: Install `recharts@^3.10.1` as a primary dependency.
3. **Refactor Chart Formatter Typings**:
   - Audit and update `Tooltip` and `Legend` formatter functions in `src/components/ProjectionChart.tsx` and `src/components/MortgageStudioWidget.tsx`.
   - Update parameter signatures in tooltips to handle Recharts 3's `name?: any` / `NameType | undefined` typings with safe string fallbacks (`String(name ?? '')`).
4. **Preserve Interactive Chart Capabilities**:
   - Ensure multi-curve synchronization (Total Wealth vs Target Capital, Asset Buckets, Rent Drag) in `ProjectionChart.tsx`.
   - Ensure multi-curve amortization paydown, principal vs interest stacks, and variable rate shock indicators in `MortgageStudioWidget.tsx`.

## Consequences

- **Positive:** Removed all npm `overrides` hacks, restoring clean, standard dependency resolution.
- **Positive:** Native React 19 compatibility without relying on deprecated React element inspection internals.
- **Positive:** Clean TypeScript 7 Go engine type-checking (`npx tsc -b`) with zero type errors.
- **Positive:** Sub-second production bundling with Rolldown/Vite 8.
- **Negative/Tradeoff:** Chart tooltip and legend formatter functions must accommodate Recharts 3's updated optional parameter typing.

## Alternatives considered

- **Retain Recharts 2.15 with `react-is` override** — functional in the short term, but keeps technical debt, incurs peer dependency warnings on updates, and misses tree-shaking performance gains.
- **Switch to an alternative charting library (Visx, Chart.js, Victory)** — excessive scope and unnecessary rewrite of working financial simulation charts and custom tooltip overlays.
