# 0002. Tailwind CSS 4 CSS-First Theme Architecture

- **Status:** Accepted
- **Date:** 2026-09-01
- **Deciders:** Alex, Antigravity pair programming assistant

## Context

The application previously used Tailwind CSS 3 with JavaScript-based configuration (`tailwind.config.js`), PostCSS (`postcss.config.js`), and Autoprefixer. This required managing multiple legacy configuration files, maintaining JavaScript objects for custom color palettes, and processing stylesheets through JavaScript PostCSS pipelines.

With Tailwind CSS 4, the framework transitioned to a CSS-first architecture powered by the Rust-based Lightning CSS engine and native `@tailwindcss/vite` plugin integration. We need a modern, zero-config styling architecture that eliminates redundant tooling while preserving our dark fintech palette, brand color scales, typography, custom scrollbars, and interactive components.

## Decision

We migrate from Tailwind CSS 3 to Tailwind CSS 4:
1. **Remove PostCSS & JS Configs**: Uninstall `postcss` and `autoprefixer`; delete `tailwind.config.js` and `postcss.config.js`.
2. **Vite Plugin Integration**: Integrate `@tailwindcss/vite` directly into `vite.config.ts` ahead of the React plugin for rapid HMR and Rust-powered compilation.
3. **CSS-First Theme Declarations**: Declare brand colors (`--color-brand-50` through `--color-brand-950`), custom dark neutrals (`--color-slate-750`, `--color-slate-850`, `--color-slate-925`), and font families directly in `src/index.css` using `@theme` and `@custom-variant dark (&:where(.dark, .dark *));`.
4. **Modern Utility Syntax**: Audit and update deprecated linear gradient utilities (`bg-gradient-to-*` → `bg-linear-to-*`).

## Consequences

- **Positive:** Removed 47+ transitive dependencies and 2 configuration files (`tailwind.config.js`, `postcss.config.js`).
- **Positive:** Drastically faster stylesheet builds and instantaneous Hot Module Replacement (HMR) powered by Lightning CSS.
- **Positive:** Theme variables are standard CSS custom properties accessible both in Tailwind utility classes and native CSS rules.
- **Positive:** Clean alignment with modern Vite and React tooling standards.
- **Negative/Tradeoff:** Gradient utilities require the modern `bg-linear-*` syntax; future Tailwind additions should use `@theme` CSS tokens rather than JS config exports.

## Alternatives considered

- **Remain on Tailwind CSS 3.4** — relies on deprecated PostCSS configs, heavier dependency tree, and will miss future ecosystem performance optimizations.
- **Vanilla CSS / CSS Modules** — would lose utility-first developer ergonomics and require writing custom responsive/dark mode CSS for every component.
