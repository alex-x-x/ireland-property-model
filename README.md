# Ireland Property Acquisition & Equity Decision Engine

[![Live Demo](https://img.shields.io/badge/Live%20Demo-alex--x--x.github.io%2Fireland--property--model-emerald?style=for-the-badge&logo=githubpages&logoColor=white)](https://alex-x-x.github.io/ireland-property-model/)
[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25%20Client--Side-emerald?style=for-the-badge&logo=shield&logoColor=white)](https://alex-x-x.github.io/ireland-property-model/)
[![Tests](https://img.shields.io/badge/tests-135%20passed-success)](https://github.com/alex-x-x/ireland-property-model)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.3-38bdf8)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-yellow)](https://vitest.dev/)
[![Recharts](https://img.shields.io/badge/Recharts-3.10-22c55e)](https://recharts.org/)

> 🌐 **Live Web Application:** [https://alex-x-x.github.io/ireland-property-model/](https://alex-x-x.github.io/ireland-property-model/)
> 
> 🔒 **100% Client-Side & Private:** All financial simulations, Irish marginal tax (52%) calculations, GSU schedules, and mortgage amortization algorithms execute **entirely within your browser's local JavaScript runtime**. Zero salary, net worth, equity grants, or personal financial inputs are ever transmitted to any remote server or backend.
> 
> **An interactive, real-time financial simulation engine to answer the core tech compensation dilemmas:**  
> 1. *"Should I buy Irish real estate as soon as I hit the minimum deposit threshold, or keep renting to let unvested Google Stock Units (GSUs) and equity investments compound?"*
> 2. *"Once I decide to buy, what is the optimal mortgage and deposit strategy along the 2D Pareto Frontier to balance Lifetime Interest Paid against 5-Year Terminal Net Wealth?"*

### ✨ Key Core Capabilities
* 📈 **60-Month Trajectory Simulation:** Segregated monthly compounding across Cash, Index ETFs, and GSUs (Google 33/33/22/12 & 25/25/25/25 schedules after Irish 52% marginal tax).
* 🗺️ **2D Sensitivity Heatmap & Hurdle Rate:** 72 macroeconomic scenarios with dynamic rate injection, exact indifference hurdle rates, and `Optimal` / `Wait 12M` / `Wait 24M` / `Wait 36M` / `Rent 5Y` comparison modes.
* 📐 **2D Pareto Frontier Optimizer (Interest vs. Net Wealth):** Evaluates hundreds of candidate debt permutations across deposit ratios, terms, and cashflow-derived overpayments to map the non-dominated Pareto frontier and 4 curated strategy archetypes.
* 🏦 **Mortgage Studio & Amortization Ledger:** Fixed-rate lockout periods (default 2Y), Central Bank variable rate shocks, March bonus lump-sum paydowns, and full downloadable ledger schedules.

---

## 📌 Executive Summary: The Ireland Dilemma (Plain-English)

For tech professionals in Ireland (at Alphabet, Meta, Microsoft, AWS, Stripe, and peer multinationals), purchasing a home is rarely a simple "save cash and buy" decision. Instead, it is a **dynamic three-way financial tug-of-war**:

```
      ┌────────────────────────────────────────────────────────┐
      │               THE IRISH FINANCIAL TUG-OF-WAR           │
      └────────────────────────────────────────────────────────┘
                                 ▲
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     │                           │                           │
┌────┴─────────────────┐ ┌───────┴───────────────┐ ┌─────────┴────────────────┐
│  1. Property Market  │ │    2. Rental Drag     │ │     3. Stock Equity      │
│  Irish real estate   │ │ Irish rent (€2.5k–    │ │ US Tech stock (GSUs)     │
│  appreciates ~5%/yr; │ │ €3.5k/mo) is a 100%   │ │ compounds aggressively   │
│  delaying purchase   │ │ sunk cost that burns  │ │ (10%–20%/yr), but vests  │
│  increases deposit   │ │ monthly savings and   │ │ trigger a 52% Irish      │
│  and stamp duty.     │ │ slows wealth growth.  │ │ marginal tax event.      │
└──────────────────────┘ └───────────────────────┘ └──────────────────────────┘
```

1. **The Cost of Waiting (Property Inflation & Rent Sunk Cost):**
   * If Irish housing appreciates at **5% per annum**, an €800,000 home increases in price by **~€40,000 each year**. Delaying purchase by 2 years means needing an extra €8,000+ in cash deposit and €800+ in tiered Irish Stamp Duty.
   * In addition, renting for those 2 years at €2,500/month burns **€60,000 in sunk, non-recoverable rent**.
2. **The Opportunity Cost of Buying Early (GSU Liquidation):**
   * Buying immediately stops the rent bleed and locks in property price appreciation.
   * However, putting down a €150,000–€250,000 deposit requires **liquidating your stock portfolio**. If Alphabet equity continues growing at **15%–20% per year**, selling those shares early forfeits substantial future capital gains.
3. **The 52% Irish Tax Bottleneck:**
   * In Ireland, every stock vesting milestone is subject to **52% marginal tax** (40% Income Tax + 8% USC + 4% PRSI) via automatic sell-to-cover.

**What This Application Solves:**  
This application builds a month-by-month mathematical simulation across **60 consecutive months (5-Year Horizon)** to compare your total net wealth (Liquid Assets + Home Equity) across different purchase timelines ($t=0$, $t=12\text{m}$, $t=24\text{m}$, $t=36\text{m}$, or renting all 60m) and solves the debt structure along the **2D Pareto Frontier** to give an **evidence-based, mathematically proven recommendation**.

---

## 🚀 Quick Start

### Live App
Access the deployed application directly at **[https://alex-x-x.github.io/ireland-property-model/](https://alex-x-x.github.io/ireland-property-model/)**.

### Prerequisites
* **Node.js**: v18.0.0 or higher (v20+ recommended)
* **npm**: v9.0.0 or higher

### Installation & Local Run
```bash
# 1. Clone the repository
git clone https://github.com/alex-x-x/ireland-property-model.git
cd ireland-property-model

# 2. Install dependencies
npm install

# 3. Start local development server (with Yahoo Finance & ECB live proxies)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Key Commands

| Command | Description |
|---|---|
| `npm run dev` | Runs the Vite development server with hot module reloading and CORS proxy |
| `npm test` | Runs the complete Vitest test suite (135 mathematical & integration unit tests) |
| `npm test:watch` | Runs Vitest in interactive watch mode |
| `npm run build` | Typechecks with `tsc -b` and produces a production bundle in `dist/` |
| `npm run preview` | Serves the production build locally |

---

## 🎯 How to Use This Model to Make Your Decision

Follow this **5-step decision-making playbook** to transform complex financial trade-offs into an actionable, evidence-based roadmap.

### 📋 The 5-Step Decision Playbook

```
┌────────────────────────────────┐     ┌────────────────────────────────┐
│  Step 1: Set Baseline Facts    │ ──> │  Step 2: Check Your Runway     │
│  Lock your salary, living      │     │  Find Earliest Affordability   │
│  expenses, cash, and GSUs.     │     │  Crossing Point (t*) on Chart. │
└────────────────────────────────┘     └────────────────────────────────┘
               │                                       │
               ▼                                       ▼
┌────────────────────────────────┐     ┌────────────────────────────────┐
│  Step 3: Audit 5-Year Deltas   │ ──> │  Step 4: Stress-Test Heatmap   │
│  Compare Year-5 Net Wealth     │     │  Find Breakeven Stock Growth   │
│  across Buy vs Wait scenarios. │     │  Rate between Buy vs Wait.     │
└────────────────────────────────┘     └────────────────────────────────┘
                                                       │
                                                       ▼
                                       ┌────────────────────────────────┐
                                       │  Step 5: Optimize Debt (Pareto)│
                                       │  Pick Curated Archetype on 2D  │
                                       │  Interest vs Wealth Frontier.  │
                                       └────────────────────────────────┘
```

1. **Step 1: Set Your Personal Facts & Lock Your Profile**
   * Input your target property price, gross base salary, bonus target, monthly living expenses (excl. rent), existing cash, ETF investments, and unvested GSU grants.
   * Click **"🔒 Lock Profile"** in the top header so your baseline facts remain fixed when you experiment with macroeconomic sliders.
2. **Step 2: Check Your Runway & Earliest Purchase Month ($t^*$)**
   * Look at the **60-Month Trajectory Chart**. Find where your purple Liquid Wealth line rises above the cyan Target Capital staircase.
   * If $t^* = 0$, you have the cash and CBI 4.0x borrowing capacity to buy today. If $t^* > 0$, the chart tells you exactly how many months of saving, investing, and GSU vesting are needed to eliminate any CBI borrowing shortfall.
3. **Step 3: Compare 5-Year Total Net Wealth in the Opportunity Cost Matrix**
   * Check the **Opportunity Cost Matrix**. Compare Year-5 Total Net Wealth ($M60$) for **Buy ASAP** vs. **Wait 12M**, **Wait 24M**, **Wait 36M**, and **Rent all 60M**.
   * Look at the bottom-line **Delta ($\Delta W$)**: If waiting 12–24 months produces a positive $+\Delta W$ (e.g. $+€45,000$), your investment compounding during that delay generates more wealth than buying today. If $\Delta W$ is negative, waiting costs you more in property inflation and sunk rent than your stock portfolio earns.
4. **Step 4: Stress-Test on the 2D Heatmap (Find Your Breakeven Rate)**
   * Scan the **2D Sensitivity Heatmap** to locate the boundary between **WAIT & COMPOUND (Emerald)** and **BUY NOW (Brand Amber)**.
   * Check your **Indifference Hurdle Rate Banner** at the top of the grid: It calculates the exact stock return (e.g. $+9.9\%/\text{yr}$) needed to justify waiting given your assumed Irish property inflation.
5. **Step 5: Optimize Your Mortgage Structure on the 2D Pareto Frontier**
   * Once you choose a purchase month, consult the **2D Pareto Frontier (Lifetime Interest Paid vs. Terminal Net Wealth M60)**.
   * Choose among the 4 curated strategy archetypes:
     * 🏆 **Wealth Maximizer:** Minimizes cash down, maximizes liquid equity compounding.
     * 🌿 **Green Arbitrageur:** Unlocks Irish $\le 80\%$ LTV discounted Green rates.
     * 🎯 **Balanced Sweet Spot:** Knee of the Pareto curve (highest marginal wealth per euro of interest paid).
     * 🛡️ **Debt-Free Crusher:** Aggressive cashflow-derived overpayments to extinguish debt early.
   * Set your **Comfortable Monthly Ceiling** to filter out over-budget options and check the **Pre-Tax Stock Hurdle Rate** to verify if equity investing beats mortgage prepayments.

---

### 🎯 Real-World Ireland Decision Case Studies

#### Case A: "The GSU Bull" (High Stock Compounding)
* **Profile:** Senior Google engineer with 1,200 unvested GSUs, €190k base salary, renting at €2,500/mo.
* **Macro Assumptions:** Alphabet stock compounding at **18%/yr** vs Irish property inflation at **5%/yr**.
* **Engine Verdict:** **WAIT 24M–36M (+€58,400 higher 5-Year Net Wealth)**.
* **Why:** Even after the 52% Irish marginal tax at vest, 18% equity appreciation massively outperforms property inflation. Delaying purchase allows building a 30%+ deposit, taking a smaller mortgage, and maintaining large liquid reserves.

#### Case B: "The High-Rent Sunk Cost Trap"
* **Profile:** Tech couple renting a 2-bed in Grand Canal Dock for **€3,500/mo** (€42,000/yr in 100% sunk cost), with modest stock expectations (**6%/yr**).
* **Macro Assumptions:** Irish property inflating at **6%/yr**.
* **Engine Verdict:** **BUY ASAP (+€49,200 gain vs waiting 24 months)**.
* **Why:** Paying €3,500/mo in sunk rent acts as an intense negative drag on wealth accumulation. Buying immediately stops the rent bleed and redirects cash into mortgage principal amortization and home equity appreciation.

#### Case C: "The Promotion & Grant Cliff Target"
* **Profile:** L5 engineer targeting an €850k home. Current €140k base salary caps mortgage borrowing at €560k (CBI 4.0x), leaving a €205k cash shortfall that is unaffordable at Month 0 ($t=0$).
* **Milestone:** Planned L6 promotion at Month 12 (€180k base $\to$ €720k max loan) + an upcoming quarterly vest (+€17k net).
* **Engine Verdict:** **TARGET MONTH 12 PURCHASE ($t^* = 12$)**.
* **Why:** Waiting until the planned promotion and vest milestone eliminates the €205k borrowing shortfall and allows purchasing without settling for a smaller, suboptimal property.

---

### 🧭 The 3-Question Pre-Purchase Decision Checklist

Before making a binding bidding offer on a property, run through these 3 sanity checks:
1. **5-Year Wealth Test:** Does the Opportunity Cost Matrix show a positive financial verdict for your planned timeline?
2. **Downside Stress Test:** If you slide Google Stock Growth to **-15%** in the sidebar, do you still have enough liquid wealth to complete the purchase without an emergency shortfall?
3. **Cashflow Buffer Test:** In the Personal Profile Header, is your post-purchase net cashflow positive ($\text{Net Pay} - \text{Mortgage} - \text{Maintenance} - \text{Living Expenses} > 0$)?

---

## 🧩 Widget-by-Widget In-Depth Guide

### 1. Personal Profile & Baseline Financial Facts (Header)
* **Purpose:** Sets the foundational truth of your finances (target property price, salary, cash, investments, held GSUs, active grant cliffs, Cash Safety Pot, and Irish tax credits).
* **Cash Safety Pot (Emergency Buffer):** Enter reserved cash in EUR and USD that will **never be spent** on property deposit, stamp duty, or legal fees. Includes a **"⚡ Set 6M Expenses"** quick action button.
* **Locked vs. Unlocked Mode:**
  * Click **"🔓 Unlock to Edit Profile"** to customize your personal numbers.
  * Click **"🔒 Lock Profile"** once entered. Locking protects your facts from accidental edits when switching macroeconomic presets or moving sliders.
* **Key Insight:** Cleanly decouples your *personal immutable facts* from *hypothetical market scenarios*.

### 2. Financial Modeling Sliders (Sidebar)
* **Purpose:** Allows instant, 0ms-latency stress testing of the 6 core economic growth engines:
  1. **Google Stock Growth (p.a.):** -10% to +30% (how fast Alphabet equity compounds).
  2. **Property Inflation (p.a.):** 0% to +15% (Irish house price inflation).
  3. **Base Investment Yield (p.a.):** 0% to +20% (index funds / global ETFs).
  4. **Mortgage Interest Rate:** 2.0% to 7.0% (AIB Green Benchmark ~3.50%).
  5. **Rent Inflation (RPZ):** 0% to 8% (statutory 2% RPZ rent cap vs open market).
  6. **EUR/USD Spot Drift (p.a.):** -5% to +5% (currency exchange rate drift on USD-denominated stock & cash):
     * *Move Left (< 0%):* Expect USD to weaken vs EUR $\implies$ stock converts into fewer Euros (reduces Irish buying power).
     * *Move Right (> 0%):* Expect USD to strengthen vs EUR $\implies$ stock converts into more Euros (boosts deposit).
     * *Past Year Reference:* EUR/USD traded between ~1.04 and ~1.12 (~±3% to ±5% annual swing) based on ECB vs Fed rate differentials.
* **Key Insight:** Moving sliders immediately updates the 60-month trajectory and decision cards without lagging the UI.

### 3. Core Decision Recommendation Banner
* **Purpose:** Delivers the bottom-line verdict: either **"BUY ASAP"** (Month $t^*$) or **"WAIT & COMPOUND"** (Wait $X$ Months).
* **How It Decides:** Compares the final Year-5 Total Net Wealth ($M60$) of buying at the earliest date against waiting 12, 24, or 36 months.
* **Key Insight:** Shows the exact **Delta ($\Delta\text{Wealth}$)** in Euros that one strategy generates over the other.

### 4. 60-Month Wealth vs. Target Capital Trajectory (Chart)
* **Purpose:** Visualizes your financial runway over 5 years.
* **What to Look For:**
  * **Purple Line (Liquid Wealth):** Total cash, investments, and GSU value over time.
  * **Cyan Line (Target Capital Staircase):** The minimum required liquid capital to close on the property (10% deposit + Irish Stamp Duty + €3k legal fees + any CBI borrowing shortfall).
  * **The Crossing Point ($t^*$):** The exact month where Liquid Wealth $\ge$ Target Capital. This is your **Earliest Affordable Purchase Month**.
  * **Rent Drag Toggle:** Turn on to visualize the cumulative sunk rent lost over time.

### 5. Opportunity Cost Matrix (5-Year Audit / Scenario Cards)
* **Purpose:** Side-by-side comparison of 5 explicit life decisions:
  1. **Buy ASAP (Month $t^*$):** Purchase as soon as capital allows.
  2. **Wait 12 Months (Month 12):** Keep renting and compounding for 1 extra year.
  3. **Wait 24 Months (Month 24):** Wait 2 years.
  4. **Wait 36 Months (Month 36):** Wait 3 years.
  5. **Rent All 60 Months:** Never buy; remain a tenant for the entire 5 years.
* **Key Columns:**
  * **Total Net Wealth (Y5):** The ultimate measure of success ($\text{Home Equity}_{60} + \text{Remaining Liquid Wealth}_{60}$).
  * **Home Equity (Y5):** Property Value at Year 5 minus Remaining Mortgage Debt.
  * **Liquid Wealth (Y5):** Remaining cash and compounding shares not spent on deposit.
  * **Sunk Rent Paid:** Total money paid to landlords over the 5 years.

### 6. Sensitivity Heatmap & Wait Time Strategy Controller (2D Grid)
* **Purpose:** Evaluates **up to 72 macroeconomic permutations** (11–12 stock rates $\times$ 5–6 property rates) simultaneously to determine whether waiting to compound yields higher Year 5 ($M60$) terminal wealth than buying ASAP.
* **Fixed 5-Year Evaluation Benchmark:** All comparisons evaluate total net wealth (Liquid Wealth + Amortized Home Equity) strictly at **Month 60**, eliminating the distortion of early truncation and front-loaded purchase friction (Stamp Duty, legal fees).
* **Strategy Controller Presets:**
  * **`⚡ Optimal Wait`**: Automatically identifies the highest-wealth wait delay per cell across all test scenarios.
  * **`Wait 12M` / `Wait 24M` / `Wait 36M`**: Direct apples-to-apples comparison of waiting $W$ months before purchase vs. buying immediately.
  * **`Rent 5Y`**: Compares buying ASAP vs. renting for the entire 5 years and compounding liquid assets.
  * **`Custom (+1M to +48M)`**: Interactive stepper slider to time-travel across any custom wait delay.
* **Dynamic Rate Injection (Rows & Columns):**
  * If your sidebar **Property Inflation** (e.g. `+4.0%`) falls between presets (`+3%` and `+5%`), an exact column is dynamically injected in sorted order.
  * If your sidebar **Stock Growth** (e.g. `+12.0%`) falls between presets, an exact row is dynamically injected.
  * Ensures zero approximation error on your actual assumptions.
* **Indifference Hurdle Rate Banner:**
  * Displays the exact annual stock growth rate required for waiting to beat buying ASAP at your assumed property inflation rate:
    > *"⚡ Indifference Hurdle: At 4.0% p.a. property growth, your stock must return at least +9.9% p.a. for waiting to beat buying ASAP."*
* **"📍 You Are Here" Base Case Pin & Cell Anatomy Drill-Down:**
  * The exact coordinate corresponding to your sidebar inputs is badged with a `YOU` indicator.
  * Clicking any cell opens a live side-by-side financial breakdown (Net Wealth, Home Equity, Liquid Assets, Sunk Rent, and Purchase Price).
* **How to Read a Cell:**
  * **`WAIT +€Xk` (Emerald):** Waiting for that duration beats buying ASAP by $+€X,000$ at Year 5.
  * **`BUY NOW +€Xk` (Brand Amber):** Buying ASAP beats waiting by $+€X,000$ (waiting costs €X,000 in sunk rent and property inflation).
  * **`UNAVAILABLE` (Slate):** Target property is not affordable within 5 years in that market scenario.

### 7. Mortgage Studio & Loan-Deposit Optimizer (Repayment Planner)
* **Purpose:** Provides deep, dynamic mortgage planning linked directly to your 60-month trajectory.
* **Key Features:**
  * **Timeline Purchase Selector ($M0 \dots M60$):** Dynamically pulls the inflated house price, active salary (with planned step-ups/promotions), and usable liquid funds (Cash + Investments + GSUs minus Cash Safety Pot) at that chosen future date.
  * **Linked Loan vs. Deposit Split Slider:** Synchronizes Deposit (€/%) and Loan (€/LTV%) with 1-click strategy presets (`10% Min Deposit`, `80% Green Tier`, `70% Super-Green`, `Max Liquid Deposit`).
  * **Irish Fixed-Rate Overpayment Simulator:** Models the standard Irish fixed-rate lockout (default **2 Years Fixed**) where extra repayments are restricted, with monthly overpayments and **March Annual Tech Bonus Lump Sums** kicking in seamlessly once off-fixed.
  * **Free Monthly Cashflow Buffer:** Computes exact discretionary savings room ($\text{Net Salary} - \text{Mortgage} - \text{Maint} - \text{Living Spend}$) with a **"⚡ Safe Overpayment"** 1-click suggestion.
  * **Rate Shock Stress Tester:** 1-click test to simulate payment increases if mortgage rates jump $+1.0\%$ to $+3.0\%$ at fixed-rate renewal.
  * **Multi-Curve Paydown Chart:** Renders **Remaining Debt Balance**, **Cumulative Principal (Loan Body) Paid**, and **Cumulative Interest Paid to Bank** with view toggles (`All Curves`, `Debt Balance`, `Principal vs Interest`).
  * **Full Month-by-Month Amortization Ledger Modal:** Interactive ledger modal displaying every single monthly payment, principal/interest breakdown, phase badges (`🔒 Fixed Lock`, `⚡ Overpayment`, `🎁 March Bonus`, `🎉 Paid Off`), year filters, search, and CSV export.

### 8. Multidimensional Pareto Frontier & Loan Optimizer (Strategy Explorer)
* **Purpose:** Solves the multi-objective optimization problem between **maximizing Year-5 Terminal Net Wealth ($M60$)** and **minimizing Lifetime Interest Paid to the Bank**, evaluating hundreds of simulated debt permutations in real time.
* **2D Pareto Scatter Plot:**
  * **X-Axis (Lifetime Interest Paid):** Moving left reduces total bank interest paid.
  * **Y-Axis (Year-5 Net Wealth):** Moving higher finishes Year 5 with a larger total balance sheet.
  * **The Purple Frontier Curve:** Connects all non-dominated, Pareto-optimal strategies. Points below the curve are mathematically dominated.
* **4 Curated Strategy Archetypes:**
  1. 🏆 **Wealth Maximizer:** Highest possible terminal net wealth at Month 60 (leverages low-rate mortgage debt to leave maximum capital compounding in equity).
  2. 🌿 **Green Arbitrageur:** Best wealth strategy that unlocks Irish $\le 80\%$ LTV Green mortgage rates.
  3. 🎯 **Balanced Sweet Spot:** Knee of the Pareto curve providing the highest marginal wealth per euro of interest paid.
  4. 🛡️ **Debt-Free Crusher:** Fastest debt payoff with the lowest lifetime interest paid.
* **Contractual Budget Ceiling & "Only Show Affordable" Toggle:**
  * Filters out recipes whose mandatory monthly loan payments exceed your comfortable monthly payment ceiling or Irish Debt-Service-to-Income ($<35\%$ DSTI) comfort levels.
  * Defaults to hiding over-budget points so the Pareto frontier forms the clean top boundary of your viable strategy universe.
* **Dynamic Cashflow-Derived Overpayments:**
  * Discretionary overpayments scale dynamically as discrete fractions ($0\%, 25\%, 50\%, 75\%$) of **free disposable monthly cashflow**, guaranteeing no strategy ever generates a household cashflow deficit.
* **Pre-Tax Stock Hurdle Rate:**
  * Computes the exact gross equity return (accounting for Irish 33% CGT) needed for investing remaining capital in the stock market to beat aggressive mortgage paydown.
* **1-Click Apply Strategy:**
  * Clicking any card or scatter point immediately syncs that loan structure, term, rate, and overpayment schedule to the live Mortgage Studio sliders and charts.

---

## 💡 Practical Usage & Critical Interpretation Tips

### 1. How to Think About the Wait Time Strategy Controller (Optimal vs Fixed Delays vs Renting)
Waiting to purchase is evaluated by comparing Year 5 ($M60$) terminal wealth between buying immediately and delaying purchase:
* **Optimal Wait:** Solves for the optimal timing across all tested scenarios, revealing whether short delays (12M), medium delays (24M), or long compounding horizons yield the highest net wealth under that economic regime.
* **1-Year Delay ($M12$):** Sunk rent is relatively modest (~€30,000), so a moderate stock return (~10%–12%) is often enough for waiting to beat buying immediately.
* **2-Year Delay ($M24$):** Allows unvested GSUs two years of compounding, but accumulates ~€60,000–€70,000 in sunk rent.
* **3-Year Delay ($M36$):** Sunk rent approaches ~€90,000–€100,000+, raising the bar: tech stocks must grow aggressively (16%–20%+) to overcome cumulative rental drag.
* **Rent All 5 Years:** Stress-tests whether homeownership makes financial sense at all compared to a pure liquid portfolio over 5 years.

### 2. How to Determine Exactly "How Much Time to Wait" (The Peak Delta Rule)
1. **Check the Opportunity Cost Matrix:** Compare the scenario columns: **Wait 12M**, **Wait 24M**, and **Wait 36M**.
2. **Find the Peak Net Wealth Delta ($+\Delta W$):**
   * If $\Delta W$ is $+€25\text{k}$ at 12M, reaches $+€58\text{k}$ at 24M, and drops to $+€30\text{k}$ at 36M $\implies$ **24 Months is your mathematically optimal wait period!**
3. **Stress-Test on the Heatmap:** Switch the Heatmap Strategy selector to **Wait 24M** or use the **Custom** slider to verify that your chosen wait strategy remains robust inside the green `WAIT` regime across a realistic envelope of stock and property growth rates.

### 3. The Golden Rules of the Model
* **When "Buy ASAP" Typically Wins:**
  * Irish property inflation ($\ge 5\%$) outpaces net GSU growth.
  * High monthly rent ($\ge €2,500/\text{mo}$) inflicts heavy cumulative cash bleed.
  * Mortgage interest rate is low ($\le 3.5\%$), so monthly payments aggressively amortize principal.
* **When "Wait & Compound" Typically Wins:**
  * Stock equity grows rapidly ($\ge 15\%-20\%/\text{yr}$), exceeding Irish property appreciation.
  * You have major unvested GSU cliffs arriving in the next 12–24 months that are better left compounding in USD equity.
  * Rent is relatively low or controlled by RPZ regulations.

---

## 📐 Mathematical Verification & Financial Mechanics

<details>
<summary><strong>📐 1. Compounding Rate Formula (Click to expand)</strong></summary>

All annual percentage growth rates ($g$) are converted into exact monthly compounding multipliers ($M_{\text{mult}}$):

$$M_{\text{mult}} = (1 + g)^{\frac{1}{12}}$$

* At month $m$, an asset with initial value $V_0$ compounds to:
$$V(m) = V_0 \cdot (1 + g)^{\frac{m}{12}}$$

This avoids linear approximation bias and ensures mathematically rigorous compounding across months.
</details>

<details>
<summary><strong>📐 2. Tiered Irish Stamp Duty Calculation (Click to expand)</strong></summary>

Irish residential Stamp Duty follows statutory Revenue tiers:
* **Tier 1 (Up to €1,000,000):** $1.0\%$
* **Tier 2 (Excess above €1,000,000):** $2.0\%$

$$\text{Stamp Duty}(P) = \begin{cases} P \times 0.01 & \text{if } P \le €1,000,000 \\ (1,000,000 \times 0.01) + ((P - 1,000,000) \times 0.02) & \text{if } P > €1,000,000 \end{cases}$$
</details>

<details>
<summary><strong>📐 3. Central Bank of Ireland (CBI) 4.0x Rule & Target Capital (Click to expand)</strong></summary>

Under CBI Macroprudential Lending Rules:
* **Maximum Standard Loan (FTB):**
$$\text{Max CBI Loan} = 4.0 \times \text{Gross Annual Base Salary}$$

* **Target Capital & Affordability Condition with Cash Safety Pot:**
$$\text{Base Deposit} = P_m \times \text{deposit\_pct}$$
$$\text{Required Loan} = P_m - \text{Base Deposit}$$
$$\text{Borrowing Shortfall} = \max(0, \text{Required Loan} - \text{Max Available Loan})$$
$$\text{Target Capital}_m = \text{Base Deposit} + \text{Stamp Duty}(P_m) + \text{Legal Fees} + \text{Borrowing Shortfall}$$
$$\text{Safety Buffer}_m = \text{Safety Pot}_{\text{EUR}} + \text{Safety Pot}_{\text{USD}} \times \text{FX}_m$$
$$\text{Surplus}_m = \text{Total Liquid Wealth}_m - (\text{Target Capital}_m + \text{Safety Buffer}_m)$$
$$\text{Is Affordable} \iff \text{Surplus}_m \ge 0$$
</details>

<details>
<summary><strong>📐 4. Mortgage Amortization & Monthly Payment (Click to expand)</strong></summary>

For a loan principal $L$, annual interest rate $i$, and amortization term $N_{\text{years}}$:
* **Monthly Interest Rate:** $r = \frac{i}{12}$
* **Total Number of Monthly Payments:** $N = N_{\text{years}} \times 12$
* **Standard Fixed Monthly Annuity Payment ($PMT$):**
$$PMT = L \times \frac{r(1+r)^N}{(1+r)^N - 1}$$

* **Month-by-Month Interest & Principal Breakdown:**
$$\text{Interest}_k = \text{Balance}_{k-1} \times r$$
$$\text{Principal Paid}_k = PMT - \text{Interest}_k$$
$$\text{Balance}_k = \text{Balance}_{k-1} - \text{Principal Paid}_k$$
</details>

<details>
<summary><strong>📐 5. Irish Tax Engine & GSU Vesting Dynamics (Click to expand)</strong></summary>

* **Irish Marginal Tax on GSU Vests (Sell-to-Cover):**
  $$\text{Marginal Tax Rate} = \text{Income Tax}(40\%) + \text{USC}(8\%) + \text{PRSI}(4\%) = 52.0\%$$
  $$\text{Net Retained Shares} = \text{Gross Vesting Shares} \times (1 - 0.52)$$

* **Base Salary Progressive Tax Breakdown:**
  * **Standard Rate Band (€44,000 / €53,000):** Taxed at $20\%$
  * **Higher Rate Band (Excess above cutoff):** Taxed at $40\%$
  * **USC (Universal Social Charge):** Tiered rates ($0.5\%, 2.0\%, 4.0\%, 8.0\%$)
  * **PRSI (Pay Related Social Insurance):** $4.0\%$
  * **Tax Credits:** Subtracted directly from total tax liability:
  $$\text{Net Annual Base Salary} = \text{Gross Base} - (\text{Income Tax} + \text{USC} + \text{PRSI} - \text{Credits})$$
</details>

<details>
<summary><strong>📐 6. Capital Liquidation Waterfall & Emergency Cash Protection (Click to expand)</strong></summary>

When purchasing a home at month $t$, the required deposit and closing costs are funded using a **cost-minimizing liquidation waterfall** that strictly protects your emergency cash pot:
1. **Tier 1 — Usable Cash ($\text{Cash} - \text{Safety Buffer}$):** Uninvested bank cash above the protected emergency reserve is deployed first.
2. **Tier 2 — General Trading Investments (ETFs / Stocks):** Liquidated next (yields ~8%/yr).
3. **Tier 3 — Retained GSU Shares:** Drained last (preserves high-beta ~10%–20% equity upside).
4. **Post-Purchase Cash:** Your bank cash balance immediately after closing remains $\ge \text{Safety Buffer}$.
</details>

<details>
<summary><strong>📐 7. Dynamic Net-Pay Derived Monthly Cash Savings (Click to expand)</strong></summary>

Rather than forcing users to guess a static monthly savings number, the model dynamically computes net monthly savings from active base salary, tax bands, rent/mortgage, and monthly living expenses:
* **Pre-Purchase (Renting):**
  $$\text{Monthly Savings} = \text{Net Monthly Base Pay} - \text{Current Monthly Rent} - \text{Monthly Living Expenses}$$
* **Post-Purchase (Homeowner):**
  $$\text{Monthly Savings} = \text{Net Monthly Base Pay} - \text{Monthly Mortgage Payment} - \text{Maintenance} - \text{Monthly Living Expenses}$$

When a planned **future salary step-up / promotion** occurs (e.g. +€30,000 gross base), your net monthly take-home increases by $+~€1,250/\text{mo}$, which **immediately and automatically flows into higher monthly cash accumulation**.
</details>

<details>
<summary><strong>📐 8. Opportunity Cost & Delta Calculation (Click to expand)</strong></summary>

At Year 5 ($t=60$), total net wealth for any scenario $S$ is evaluated as:
$$\text{Net Wealth}_{60}(S) = \text{Remaining Liquid Wealth}_{60}(S) + \text{Home Equity}_{60}(S)$$
$$\text{Home Equity}_{60}(S) = P_{60} - \text{Remaining Mortgage Balance}_{60}(S)$$

* The **Net Wealth Delta ($\Delta W$)** versus buying ASAP is defined as:
$$\Delta W(S) = \text{Net Wealth}_{60}(S) - \text{Net Wealth}_{60}(\text{Buy ASAP})$$

A positive $\Delta W$ means waiting generated more wealth than buying immediately.
</details>

<details>
<summary><strong>📐 9. Pareto Multi-Objective Optimization & Stock Hurdle Rate (Click to expand)</strong></summary>

* **Pareto Non-Domination Criterion:**
  A mortgage strategy $A = (I_A, W_A)$ dominates strategy $B = (I_B, W_B)$ if and only if:
  $$(I_A \le I_B \land W_A \ge W_B) \land (I_A < I_B \lor W_A > W_B)$$
  where $I$ is Lifetime Interest Paid (minimize) and $W$ is Year-5 Terminal Net Wealth $M60$ (maximize). The Pareto frontier $\mathcal{P}$ is the set of all non-dominated compliant strategies.

* **Irish CGT-Adjusted Pre-Tax Stock Hurdle Rate:**
  To evaluate whether deploying cash into mortgage paydown (yielding a guaranteed, tax-free return equal to mortgage rate $i$) beats investing in equities subject to Irish 33% Capital Gains Tax (CGT):
  $$r_{\text{stock, hurdle}} = \frac{i}{1 - \text{CGT}} = \frac{i}{1 - 0.33} = \frac{i}{0.67}$$
  For example, a **3.50% AIB Green mortgage** requires an equity portfolio to achieve at least **+5.22% pre-tax CAGR** to outperform mortgage interest savings.
</details>

---

## 🔒 Privacy & Architecture

* **100% Client-Side:** All simulations, tax computations, and mortgage amortization schedules execute entirely within your browser runtime.
* **Zero Tracking & Telemetry:** No personal salary, grant, or financial numbers are transmitted to remote servers.
* **Persistent Session Cache:** Inputs are saved strictly to your local browser's `localStorage`.

---

## 📄 License
MIT License. Open source and built for financial empowerment.
