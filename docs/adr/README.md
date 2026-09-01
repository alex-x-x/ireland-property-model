# Architecture Decision Records (ADRs)

This directory holds the **decision records** for this project — the *why* behind
significant architectural choices, captured at the time they were made.

Conventions (lightweight [MADR](https://adr.github.io/madr/) style):

- One file per decision: `NNNN-short-kebab-title.md`, numbered sequentially from `0001`.
- Each record has: **Status**, **Context**, **Decision**, **Consequences**, and
  **Alternatives considered** (see `0000-template.md`).
- Records are **immutable once Accepted**. To change a past decision, add a *new* ADR
  that supersedes it (note "Supersedes 000X" / "Superseded by 000Y" in both).
- Keep them short and concrete — link to code, commits, and reports rather than restating.

| # | Title | Status |
|---|-------|--------|
| [0001](0001-client-side-react-vite-simulation-engine.md) | Client-side React/TypeScript simulation engine and architecture | Accepted |
| [0002](0002-tailwind-4-css-theme-architecture.md) | Tailwind CSS 4 CSS-First Theme Architecture | Accepted |
| [0003](0003-recharts-3-visualization-modernization.md) | Recharts 3 Visualization Modernization & Native React 19 Integration | Accepted |
| [0004](0004-web-worker-and-render-pipeline-optimization.md) | Web Worker Background Simulation & Render Pipeline Architecture | Accepted |
