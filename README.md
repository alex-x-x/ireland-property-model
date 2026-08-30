# Dublin Property Acquisition & Equity Decision Engine

[![Tests](https://img.shields.io/badge/tests-47%20passed-success)](https://github.com/)
[![React](https://img.shields.io/badge/React-18.3-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.2-yellow)](https://vitest.dev/)

> **An interactive, real-time financial simulation engine to answer the core tech compensation dilemma:**  
> *"Should I buy Dublin real estate as soon as I hit the minimum deposit threshold, or keep renting to let unvested Google Stock Units (GSUs) and equity investments compound?"*

---

## 📌 Executive Summary: The Dublin Dilemma (Plain-English)

For tech professionals in Dublin (at Alphabet, Meta, Microsoft, AWS, Stripe, and peer multinationals), purchasing a home is rarely a simple "save cash and buy" decision. Instead, it is a **dynamic three-way financial tug-of-war**:

```
      ┌────────────────────────────────────────────────────────┐
      │               THE DUBLIN FINANCIAL TUG-OF-WAR          │
      └────────────────────────────────────────────────────────┘
                                 ▲
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     │                           │                           │
┌────┴─────────────────┐ ┌───────┴───────────────┐ ┌─────────┴────────────────┐
│  1. Property Market  │ │    2. Rental Drag     │ │     3. Stock Equity      │
│  Dublin real estate  │ │ Dublin rent (€2.5k–   │ │ US Tech stock (GSUs)     │
│  appreciates ~5%/yr; │ │ €3.5k/mo) is a 100%   │ │ compounds aggressively   │
│  delaying purchase   │ │ sunk cost that burns  │ │ (10%–20%/yr), but vests  │
│  increases deposit   │ │ monthly savings and   │ │ trigger a 52% Irish      │
│  and stamp duty.     │ │ slows wealth growth.  │ │ marginal tax event.      │
└──────────────────────┘ └───────────────────────┘ └──────────────────────────┘
```

1. **The Cost of Waiting (Property Inflation & Rent Sunk Cost):**
   * If Dublin housing appreciates at **5% per annum**, an €800,000 home increases in price by **~€40,000 each year**. Delaying purchase by 2 years means needing an extra €8,000+ in cash deposit and €800+ in tiered Irish Stamp Duty.
   * In addition, renting for those 2 years at €2,500/month burns **€60,000 in sunk, non-recoverable rent**.
2. **The Opportunity Cost of Buying Early (GSU Liquidation):**
   * Buying immediately stops the rent bleed and locks in property price appreciation.
   * However, putting down a €150,000–€250,000 deposit requires **liquidating your stock portfolio**. If Alphabet equity continues growing at **15%–20% per year**, selling those shares early forfeits substantial future capital gains.
3. **The 52% Irish Tax Bottleneck:**
   * In Ireland, every stock vesting milestone is subject to **52% marginal tax** (40% Income Tax + 8% USC + 4% PRSI) via automatic sell-to-cover.

**What This Application Solves:**  
This application builds a month-by-month mathematical simulation across **60 consecutive months (5-Year Horizon)** to compare your total net wealth (Liquid Assets + Home Equity) across different purchase timelines ($t=0$, $t=12\text{m}$, $t=24\text{m}$, $t=36\text{m}$, or renting all 60m) to give an **evidence-based, mathematically proven recommendation**.

---

## 🚀 Quick Start

### Prerequisites
* **Node.js**: v18.0.0 or higher (v20+ recommended)
* **npm**: v9.0.0 or higher

### Installation & Local Run
```bash
# 1. Clone the repository
git clone https://github.com/your-username/dublin-property-buying-model.git
cd dublin-property-buying-model

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
| `npm test` | Runs the complete Vitest test suite (54 mathematical & integration unit tests) |
| `npm test:watch` | Runs Vitest in interactive watch mode |
| `npm run build` | Typechecks with `tsc -b` and produces a production bundle in `dist/` |
| `npm run preview` | Serves the production build locally |

---

## 🎯 How to Use This Model to Make Your Decision

Follow this **4-step decision-making playbook** to transform complex financial trade-offs into an actionable, evidence-based roadmap.

### 📋 The 4-Step Decision Playbook

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
   * Scan the **2D Sensitivity Heatmap** to locate the boundary between **BUY NOW (Emerald)** and **WAIT & COMPOUND (Purple)**.
   * Identify your **Equilibrium Stock Growth Rate** (e.g. 15%/yr): If you are confident tech equities will beat this threshold, wait; otherwise, buy now.

---

### 🎯 Real-World Dublin Decision Case Studies

#### Case A: "The GSU Bull" (High Stock Compounding)
* **Profile:** Senior Google engineer with 1,200 unvested GSUs, €190k base salary, renting at €2,500/mo.
* **Macro Assumptions:** Alphabet stock compounding at **18%/yr** vs Dublin property inflation at **5%/yr**.
* **Engine Verdict:** **WAIT 24M–36M (+€58,400 higher 5-Year Net Wealth)**.
* **Why:** Even after the 52% Irish marginal tax at vest, 18% equity appreciation massively outperforms property inflation. Delaying purchase allows building a 30%+ deposit, taking a smaller mortgage, and maintaining large liquid reserves.

#### Case B: "The High-Rent Sunk Cost Trap"
* **Profile:** Tech couple renting a 2-bed in Grand Canal Dock for **€3,500/mo** (€42,000/yr in 100% sunk cost), with modest stock expectations (**6%/yr**).
* **Macro Assumptions:** Dublin property inflating at **6%/yr**.
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
* **Purpose:** Sets the foundational truth of your finances (target property price, salary, cash, investments, held GSUs, active grant cliffs, and Irish tax credits).
* **Locked vs. Unlocked Mode:**
  * Click **"🔓 Unlock to Edit Profile"** to customize your personal numbers.
  * Click **"🔒 Lock Profile"** once entered. Locking protects your facts from accidental edits when switching macroeconomic presets or moving sliders.
* **Key Insight:** Cleanly decouples your *personal immutable facts* from *hypothetical market scenarios*.

### 2. Financial Modeling Sliders (Sidebar)
* **Purpose:** Allows instant, 0ms-latency stress testing of the 6 core economic growth engines:
  1. **Google Stock Growth (p.a.):** -10% to +30% (how fast Alphabet equity compounds).
  2. **Property Inflation (p.a.):** 0% to +15% (Dublin house price inflation).
  3. **Base Investment Yield (p.a.):** 0% to +20% (index funds / global ETFs).
  4. **Mortgage Interest Rate:** 2.0% to 7.0% (AIB Green Benchmark ~3.50%).
  5. **Rent Inflation (RPZ):** 0% to 8% (statutory 2% RPZ rent cap vs open market).
  6. **EUR/USD Spot Drift:** -5% to +5% (foreign exchange currency drift).
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

### 6. Sensitivity Heatmap (2D Grid: Stock Growth vs. Property Growth)
* **Purpose:** Evaluates 55 economic permutations ($11 \text{ stock rates} \times 5 \text{ property rates}$) simultaneously to show the boundary where buying beats waiting.
* **Key Insight:** Green cells indicate where Waiting wins; Brand/Blue cells indicate where Buying ASAP wins.
* **Horizon Slider:** Adjust between 1Y, 2Y, 3Y, and 5Y horizons to test how time horizon shifts the decision.

---

## 💡 Practical Usage & Critical Interpretation Tips

### 1. How to Correctly Interpret the Horizon Slider (1Y vs 5Y)
* **1-Year Horizon ($M12$):** Measures the balance sheet immediately on closing day at Month 12. At Month 12, buying takes an immediate upfront hit due to **sunk transaction friction** (€3,000 legal fees + 1% Irish Stamp Duty = €11,000+).
* **5-Year Horizon ($M60$ - Recommended):** Measures wealth after **4 years of mortgage principal amortization and home price compounding**. 
* **Rule of Thumb:** Short horizons penalize buying due to upfront closing costs. The 5-Year Horizon ($M60$) is the true benchmark for property decisions because real estate is an illiquid, medium-to-long term asset.

### 2. The Golden Rules of the Model
* **When "Buy ASAP" Wins:**
  * Dublin property inflation ($\ge 5\%$) outpaces net GSU growth.
  * High monthly rent ($\ge €2,500/\text{mo}$) inflicts heavy cumulative cash bleed.
  * Mortgage interest rate is low ($\le 3.5\%$), so monthly payments aggressively amortize principal.
* **When "Wait & Compound" Wins:**
  * Stock equity grows rapidly ($\ge 15\%-20\%/\text{yr}$), exceeding Dublin property appreciation.
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

* **Target Capital Required to Close at Month $m$:**
$$\text{Base Deposit} = P_m \times \text{deposit\_pct}$$
$$\text{Required Loan} = P_m - \text{Base Deposit}$$
$$\text{Borrowing Shortfall} = \max(0, \text{Required Loan} - \text{Max Available Loan})$$
$$\text{Target Capital}_m = \text{Base Deposit} + \text{Stamp Duty}(P_m) + \text{Legal Fees} + \text{Borrowing Shortfall}$$
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
<summary><strong>📐 6. Capital Liquidation Waterfall Hierarchy (Click to expand)</strong></summary>

When purchasing a home at month $t$, the required deposit and closing costs are funded using a **cost-minimizing liquidation waterfall**:
1. **Tier 1 — Uninvested EUR Cash & USD Cash:** Non-yielding cash is drained first.
2. **Tier 2 — General Trading Investments (ETFs / Stocks):** Liquidated next (yields ~8%/yr).
3. **Tier 3 — Retained GSU Shares:** Drained last (preserves high-beta ~10%–20% equity upside).
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

---

## 🔒 Privacy & Architecture

* **100% Client-Side:** All simulations, tax computations, and mortgage amortization schedules execute entirely within your browser runtime.
* **Zero Tracking & Telemetry:** No personal salary, grant, or financial numbers are transmitted to remote servers.
* **Persistent Session Cache:** Inputs are saved strictly to your local browser's `localStorage`.

---

## 📄 License
MIT License. Open source and built for financial empowerment.
