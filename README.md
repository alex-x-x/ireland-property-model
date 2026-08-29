# Dublin Property Acquisition & Equity Decision Engine

[![Tests](https://img.shields.io/badge/tests-13%20passed-success)](https://github.com/)
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

# 3. Start the local development server (with live Yahoo/ECB proxy)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the model.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts Vite development server at `http://localhost:3000` with local API proxy for live Yahoo & ECB feeds |
| `npm test` | Runs the full Vitest unit test suite (simulation, vesting, mortgage, decision math, presets) |
| `npm test:watch` | Runs Vitest in interactive watch mode for TDD |
| `npm run build` | Runs TypeScript type checking and produces optimized production build in `dist/` |
| `npm run preview` | Previews the production build locally |

---

## 🧭 How to Use for Personal Financial Planning

### 1. Upload or Configure Your Personal Financial Profile
- Click **"🔓 Unlock to Edit"** on the Sidebar to enter your personal baseline figures:
  - **Target Property & Deposit:** Target Home Price (€), Deposit %, Legal / Closing Fees (€)
  - **Income & Borrowing Capacity:** Gross Annual Base Salary (€), CBI LTI Multiple (4.0x), Mortgage Term (25 yrs), Maintenance Rate (1%)
  - **Cash & Portfolio:** EUR/USD Cash (€/$), EUR/USD Investments (€/$), Monthly Salary Savings (€)
  - **Living Costs & Tax:** Current Monthly Rent (€), Irish GSU Marginal Tax Rate (52%)
  - **Google GSU Grants:** Configure your specific initial hire grants and annual refresher cliffs.
- Once configured, click **"🔒 Lock Profile"** or export your configuration via **"Export JSON"** in the top bar.

### 2. Stress-Test Economic Drivers with Live Sliders & Presets
With your personal profile locked:
- **Preset Scenarios (Top Bar):** Switching presets alters **ONLY** macro drivers (property inflation, stock growth, index yield, mortgage rates, rent inflation) without ever changing your personal savings, target home price, or salary!
  - **Standard Dublin Baseline:** 5% property growth, 10% stock return, 3.5% AIB green rate.
  - **Tech Equity Bull Run:** 18% stock growth vs 4% property growth.
  - **Dublin Property Squeeze:** 8.5% property growth & 4% rent growth.
  - **High Interest Rate Climate:** 5.5% mortgage rate & 2.5% property growth.
  - **Tech Stagnation / Bear Market:** 2% stock growth vs 4.5% property growth.
- **Active Modeling Sliders:** Directly drag the sliders in the top sidebar section to immediately observe how small changes in stock performance vs Dublin housing inflation change the optimal purchase timing.

### 3. Evaluate the Decision Matrix & 60-Month Chart
- **Core Recommendation Banner:** Identifies whether buying immediately or waiting to compound equity produces higher Year-5 net wealth ($\Delta\text{Wealth}$).
- **Opportunity Cost Matrix Cards:** Direct side-by-side comparison of buying at $t^*$, waiting 12/24/36 months, or renting all 60 months.
- **Sensitivity Heatmap:** 2D grid mapping outcomes across stock returns (4%–20%) vs property inflation (2%–10%).
- **60-Month Audit Log Modal:** Complete month-by-month tabular breakdown with one-click **CSV Download**.

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
1. Upfront capital is withdrawn in optimal capital preservation order:
   $$\text{Cash (0\%)} \longrightarrow \text{Base Investments (8\%)} \longrightarrow \text{Google GSUs (10\%+)}$$
2. Monthly mortgage payment $M = L \frac{r(1+r)^N}{(1+r)^N - 1}$ with $r = \frac{\text{rate}}{12}$ and $N = \text{term\_years} \times 12$.
3. Home Equity at Year 5 ($t=60$):
   $$\text{Home Equity}_{60} = P_{60} - \text{Remaining Mortgage Balance}_{60}$$
4. Total Net Wealth at Year 5:
   $$\text{Total Net Wealth}_{60} = \text{Remaining Liquid Wealth}_{60} + \text{Home Equity}_{60}$$

---

## 🔒 Privacy & Security

- **100% Client-Side:** All calculations run entirely inside your browser's JavaScript runtime.
- **Zero Tracking:** No personal financial figures, salary data, or grant details are ever transmitted to any external server or stored remotely.
- **Local Persistence:** Personal configuration is optionally saved in your browser's `localStorage` for convenience.

---

## 📄 License

MIT License. Open source and free to adapt for personal financial planning.
