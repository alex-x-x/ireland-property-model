# Dublin Property Acquisition & Equity Decision Engine

[![Tests](https://img.shields.io/badge/tests-12%20passed-success)](https://github.com/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0-yellow)](https://vitest.dev/)

> **An interactive, real-time financial simulation application to answer the core tech compensation question:**  
> *"Should I buy Dublin real estate as soon as I hit the minimum deposit threshold, or keep renting to let unvested Google Stock Units (GSUs) and equity investments compound?"*

---

## 📌 Problem Context & The Dublin Dilemma

For tech professionals in Dublin (at Google Ireland and peer multinationals), homeownership decisions exist at the intersection of three aggressive financial forces:

1. **Persistent Real Estate Appreciation:** Dublin residential property prices compound steadily (historically 4.5%–5.5% annually). Delaying a purchase means chasing a constantly moving target for the standard 10% First-Time Buyer (FTB) deposit and Irish Stamp Duty (1% up to €1M, 2% excess).
2. **High Rental Friction:** Dublin rents represent a severe monthly cash drag (often €2,000–€3,500/month in sunk costs) that erodes baseline monthly cash savings.
3. **High-Beta Equity Compensation (Google GSUs):** Tech compensation packages are heavily weighted in US dollar-denominated company stock, typically structured around non-linear vesting cliffs (e.g., initial grants vesting 33/33/22/12 annually, layered with quarterly 25/25/25/25 refreshers). In Ireland, these vests trigger an immediate ~52% marginal tax event (Income Tax 40% + USC 8% + PRSI 4%) via sell-to-cover.
4. **Central Bank of Ireland (CBI) 4.0x LTI Rule:** First-Time Buyers in Ireland can borrow at most 4.0x gross annual income. For high-value properties (€1M+), borrowing caps may require putting down a larger cash deposit than 10%.

This application models all of these variables dynamically across **60 consecutive months** (a 5-year outlook) to pinpoint the exact purchase month that maximizes net long-term wealth.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later

### Installation & Development Server

```bash
# 1. Clone the repository
git clone https://github.com/your-username/dublin-property-buying-model.git
cd dublin-property-buying-model

# 2. Install dependencies
npm install

# 3. Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the model.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts Vite development server at `http://localhost:3000` with hot module replacement |
| `npm test` | Runs the full Vitest unit test suite (simulation, vesting, mortgage, decision math) |
| `npm test:watch` | Runs Vitest in interactive watch mode for TDD |
| `npm run build` | Runs TypeScript type checking and produces optimized production build in `dist/` |
| `npm run preview` | Previews the production build locally |

---

## 🧭 How to Use the Application

### 1. Preset Scenarios (Top Bar)
Quickly stress-test common economic environments using the preset dropdown:
- **Standard Dublin Baseline:** 5% property inflation, 10% GSU return, €2.5k rent, AIB 3.5% green mortgage rate.
- **Tech Equity Bull Run:** 18% GSU stock growth vs 4% property growth (heavily favors waiting and compounding).
- **Dublin Property Squeeze:** 8% property growth & €3.2k rent (strongly favors buying immediately).
- **Tech Stagnation / Bear Market:** 2% stock growth vs 4.5% property growth.

### 2. Live Market Data Widget
- Click the live market data badge in the top bar to fetch real-time or historical closing prices for **Alphabet (GOOGL / GOOG)** and **EUR/USD Spot FX rates**.
- If offline or blocked by browser CORS, the engine automatically switches to deterministic fallback mode with a clear visual banner, while allowing full manual rate override.

### 3. Sidebar Parameter Controls
- **Property & Deposit:** Adjust target home price (€), annual property inflation (%), minimum deposit (%), and closing legal fees (€).
- **Mortgage & CBI Rules:** Set AIB mortgage rate (%), 25-year amortization term, annual home maintenance rate (1%), gross annual salary (€), and CBI LTI multiple (4.0x).
- **Cash & Portfolio:** Configure starting EUR/USD cash, index investments, annual investment return (%), and monthly salary savings (€).
- **Equity & Macro:** Configure Google stock growth rate (%), monthly rent (€), Dublin RPZ rent inflation (2%), and Irish marginal tax rate (52%).

### 4. GSU Grants Manager
- Add and edit multiple Google GSU grants.
- Supports **Initial Hire Grants (33/33/22/12)**, **Annual Refreshers (25/25/25/25 quarterly)**, and custom cliff schedules.
- Visual timeline tags distinguish past vested shares from upcoming simulation cliff milestones.

### 5. 60-Month Projection Chart
- Visualizes **Total Liquid Wealth** (showing sharp upward step-ups on vest dates) vs. **Required Target Capital** (smooth deposit + stamp duty curve).
- Highlights the **Earliest Viable Purchase Month ($t^*$)** crossover point.
- Toggle **Asset Buckets** to see Cash, Index Investments, and GSU Pool breakdown, or **Rent Drag** to track cumulative rent sunk.

### 6. Decision Matrix & Opportunity Cost Breakdown
- **Core Recommendation Banner:** Plain-language executive recommendation (*"WAIT & LET EQUITY COMPOUND"* vs *"BUY AT EARLIEST VIABLE MONTH"*).
- **Opportunity Cost Cards:** Direct side-by-side comparison of:
  - Buy at Month $t^*$ (Earliest)
  - Wait +12 Months
  - Wait +24 Months
  - Wait +36 Months
  - Rent & Compound All 60 Months
- **Year 5 Net Wealth Delta ($\Delta\text{Wealth}$):** Net wealth difference calculated taking into account home equity built, property appreciation, remaining portfolio compounding, and rent eliminated.

### 7. Sensitivity Heatmap & Audit Log Table
- **Sensitivity Grid:** 2D matrix evaluating whether "Buy Now" or "Wait" wins across different stock growth rates (4%–20%) and property inflation rates (2%–10%).
- **60-Month Audit Log Modal:** Full month-by-month tabular breakdown with one-click **CSV Download**.
- **JSON Configuration Export/Import:** Save and share your personalized scenarios.

---

## 📐 Mathematical & Financial Engine

### Compounding Multipliers
All annual rates ($g$) are converted internally to exact monthly compounding multipliers:
$$\text{Monthly Multiplier} = (1 + g)^{\frac{1}{12}}$$

### Irish Stamp Duty (Tiered)
$$\text{Stamp Duty}(P) = \begin{cases} P \times 0.01 & \text{if } P \le €1,000,000 \\ (1,000,000 \times 0.01) + ((P - 1,000,000) \times 0.02) & \text{if } P > €1,000,000 \end{cases}$$

### Target Capital Required to Close
$$\text{Target Capital}_t = (P_t \times \text{deposit\_pct}) + \text{Stamp Duty}_t + \text{fees} + \max(0, \text{Required Loan} - \text{Max CBI Loan})$$

### Post-Purchase Wealth Trajectory & Capital Waterfall
1. When buying at month $t$, upfront capital is withdrawn in optimal capital preservation order:
   $$\text{Cash (0\%)} \longrightarrow \text{Base Investments (8\%)} \longrightarrow \text{Google GSUs (10\%+)}$$
2. Monthly mortgage payment $M = L \frac{r(1+r)^N}{(1+r)^N - 1}$ with $r = \frac{\text{rate}}{12}$ and $N = \text{term\_years} \times 12$.
3. Home Equity at Year 5 ($t=60$):
   $$\text{Home Equity}_{60} = P_{60} - \text{Remaining Mortgage Balance}_{60}$$
4. Total Net Wealth at Year 5:
   $$\text{Total Net Wealth}_{60} = \text{Remaining Liquid Wealth}_{60} + \text{Home Equity}_{60}$$

---

## 🏗️ Architecture & Project Structure

```
property_buying_model/
├── docs/
│   └── adr/
│       ├── README.md                                          # Architecture Decision Records index
│       └── 0001-client-side-react-vite-simulation-engine.md    # ADR 0001: Pure client-side simulation
├── src/
│   ├── engine/                                                # Pure functional simulation engine (zero DOM deps)
│   │   ├── types.ts                                           # TypeScript data models & schemas
│   │   ├── constants.ts                                       # Default configuration & benchmarks
│   │   ├── vesting.ts                                         # Historical vest reconciliation & milestone dates
│   │   ├── mortgage.ts                                        # Annuity repayment, amortization & CBI LTI
│   │   ├── simulation.ts                                      # 60-month chronological progression
│   │   ├── decision.ts                                        # Opportunity cost matrix & Buy vs Wait comparison
│   │   ├── presets.ts                                         # Stress-test scenarios
│   │   └── export.ts                                          # JSON import/export & CSV generator
│   ├── services/
│   │   └── marketData.ts                                      # Live/historical GOOGL and EUR/USD FX fetcher
│   ├── components/                                            # Interactive React UI
│   │   ├── Navbar.tsx                                         # Header, presets, export/import, status badge
│   │   ├── Sidebar.tsx                                        # Parameter sliders & numeric inputs
│   │   ├── ProjectionChart.tsx                                # 60-Month trajectory Recharts graph
│   │   ├── DecisionMatrix.tsx                                 # Recommendation & Opportunity cost cards
│   │   ├── GrantsManager.tsx                                  # Interactive GSU cliff scheduler
│   │   ├── SensitivityMatrix.tsx                              # 2D Stock vs Property growth heatmap
│   │   ├── MarketDataModal.tsx                                # Live/manual market data dialog
│   │   └── MonthlyTableModal.tsx                              # 60-Month audit trail table modal
│   ├── App.tsx                                                # Application state coordinator
│   ├── main.tsx                                               # DOM entrypoint
│   └── index.css                                              # Tailwind CSS styles
├── tests/                                                     # Vitest unit test suite (100% pass)
│   ├── vesting.test.ts
│   ├── mortgage.test.ts
│   ├── simulation.test.ts
│   ├── decision.test.ts
│   └── marketData.test.ts
├── SPEC.md                                                    # Full system specification
├── PLAN.md                                                    # Implementation plan
├── AGENTS.md                                                  # Project context and developer guidelines
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 🔒 Privacy & Security

- **100% Client-Side:** All calculations run entirely inside your browser's JavaScript runtime.
- **Zero Tracking:** No personal financial figures, salary data, or grant details are ever transmitted to any external server or stored remotely.
- **Local Persistence:** Changes are optionally saved in your browser's `localStorage` for convenience.

---

## 📄 License

MIT License. Open source and free to adapt for personal financial planning.
