# SYSTEM SPECIFICATION: Ireland Property Acquisition & Equity Decision Engine

---

## 1. Context & Motivation (The "Why")

### The Ireland Real Estate & Tech Compensation Dilemma

For tech professionals in Ireland (particularly at Google Ireland and peer multinationals), homeownership decisions exist at the intersection of three aggressive financial forces:

1. **Persistent Real Estate Appreciation:** Irish residential property prices compound steadily (historically 4.5%–5.5% annually). Delaying a purchase means chasing a constantly moving target for the standard 10% First-Time Buyer (FTB) deposit and associated transaction taxes (Irish Stamp Duty: 1% up to €1,000,000, 2% above €1,000,000).
2. **High Rental Friction:** Irish rents represent a severe monthly cash drag (typically €2,000–€3,500/month in sunk costs) that erodes baseline monthly cash savings.
3. **High-Beta Equity Compensation (Google GSUs / RSUs):** Tech compensation packages are heavily weighted in US dollar-denominated company stock (Alphabet GOOG / GOOGL), structured around non-linear vesting cliffs (e.g. initial grants vesting 33/33/22/12 annually, layered with quarterly 25/25/25/25 refreshers). In Ireland, these vests trigger an immediate ~52% marginal tax event (Income Tax at 40%, USC up to 8%, PRSI at 4%) via sell-to-cover.

### The Strategic Question

> **"Should I buy as soon as I hit the minimum deposit threshold, or should I keep renting to let unvested stock and investments compound?"**

* **The Case for Buying ASAP:** Eliminates monthly rent drag, locks in the property price before it inflates further, and starts building home equity through mortgage principal paydown.
* **The Case for Waiting:** Tech equity and equity index investments historically compound at higher rates (8%–15%+) than residential real estate. Liquidating stock early to fund a deposit incurs an opportunity cost: you forfeit the future appreciation of those shares.

Because the math changes dynamically as grants vest, exchange rates fluctuate, and share prices move, static spreadsheets often fail. **This project builds an interactive, real-time decision-modelling application to pinpoint the exact month where purchasing maximizes net long-term wealth.**

---

## 2. Product Overview (The "What")

The application is a standalone, client-side web application driven by a structured JSON configuration. It simulates a user’s financial trajectory across **60 consecutive months** (a 5-year outlook).

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                           INPUT CONFIGURATION                          │
 │  • Current EUR/USD Cash & Investments   • GSU Initial & Refresher Grants│
 │  • Target Property Price & Growth Rate  • Macro Rates (Rent, FX, Taxes)│
 │  • Mortgage Terms (AIB 3.5%, 25 Yrs)    • Live GOOG & EUR/USD FX Feeds │
 └────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      MONTH-BY-MONTH SIMULATION ENGINE                  │
 │  1. Segregated Asset Compounding (Cash vs. Base Inv vs. GSU Equity)    │
 │  2. Automated Vesting Cliff Schedule (33/33/22/12 & 25/25/25/25)       │
 │  3. Irish Marginal Tax (52%) & EUR/USD Spot FX Conversions             │
 │  4. Dynamic Property Price Inflation & 10% Deposit + Closing Costs     │
 │  5. Mortgage Amortization & Home Equity Tracking Post-Purchase         │
 └────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                          INTERACTIVE DASHBOARD                         │
 │  • Wealth vs. Target Capital Growth Chart (Visual "Buy Date" Cross)   │
 │  • Opportunity Cost Matrix ("Buy Now" vs. "Wait 12/24/36 Months")      │
 │  • Interactive Parameter Sliders for Instant Stress Testing            │
 │  • Live Market Data Fetcher with Prominent Fallback/Offline Status     │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model (JSON Schema & State Specification)

The simulation engine is fully declarative and initialized via a single configuration object:

```json
{
  "meta": {
    "start_date": "2026-08-29",
    "forecast_months": 60,
    "stock_symbol": "GOOGL"
  },
  "property": {
    "target_price_eur": 1000000,
    "yearly_growth_rate": 0.05,
    "minimum_deposit_pct": 0.10,
    "stamp_duty_tiers": [
      { "up_to": 1000000, "rate": 0.01 },
      { "up_to": null, "rate": 0.02 }
    ],
    "legal_and_closing_fees_eur": 3000
  },
  "mortgage": {
    "mortgage_interest_rate": 0.035,
    "mortgage_term_years": 25,
    "yearly_maintenance_rate": 0.01,
    "buyer_gross_annual_salary_eur": 225000,
    "cbi_max_lti_multiple": 4.0
  },
  "liquid_assets": {
    "cash_eur": 50000,
    "cash_usd": 10000,
    "investments_eur": 20000,
    "investments_usd": 50000,
    "investments_yearly_growth_rate": 0.08,
    "monthly_salary_savings_eur": 2000
  },
  "equity_engine": {
    "stock_yearly_growth_rate": 0.10,
    "current_share_price_usd": 150.00,
    "marginal_tax_rate_ireland": 0.52,
    "grants": [
      {
        "id": "initial_grant",
        "type": "initial",
        "grant_date": "2024-08-01",
        "total_shares": 1000,
        "schedule_percents": [0.33, 0.33, 0.22, 0.12],
        "vest_frequency_months": 12
      },
      {
        "id": "refresher_2025",
        "type": "refresher",
        "grant_date": "2025-08-01",
        "total_shares": 200,
        "schedule_percents": [0.25, 0.25, 0.25, 0.25],
        "vest_frequency_months": 3
      }
    ]
  },
  "macro": {
    "eur_usd_spot": 0.91,
    "eur_usd_yearly_drift": 0.0,
    "current_monthly_rent_eur": 2500,
    "rent_yearly_growth_rate": 0.02
  }
}
```

---

## 4. Simulation Engine & Mathematical Specification

The engine iterates chronologically from Month $t = 0$ (anchor date) to $t = 60$. All annual rates ($g$) are converted internally to monthly compounding factors:

$$\text{Monthly Multiplier} = (1 + g)^{\frac{1}{12}}$$

### Step A: Initialization ($t = 0$)

1. **Historical Vest Reconciliation:** For each grant, the engine calculates the number of shares vested prior to `meta.start_date` versus remaining unvested shares based on grant start date and vesting frequency.
2. **Currency Normalization:** All USD cash, USD investments, and vested equity are converted to EUR at `macro.eur_usd_spot`.
3. **Starting Wealth Segregation:**
   - $\text{Cash}_0 = \text{cash\_eur} + (\text{cash\_usd} \times \text{FX}_0)$
   - $\text{Investments}_0 = \text{investments\_eur} + (\text{investments\_usd} \times \text{FX}_0)$
   - $\text{Vested GSU Pool}_0 = \text{Retained Vested Shares}_0 \times \text{Price}_0 \times \text{FX}_0$

---

### Step B: Monthly Progression ($t = 1 \dots 60$)

For each month $t$:

#### 1. Property Target Price & Required Capital
* **Property Valuation:**
  $$P_t = P_{t-1} \times (1 + g_{\text{property}})^{\frac{1}{12}}$$
* **Stamp Duty Calculation (Irish Tiers):**
  $$\text{Stamp Duty}_t = \begin{cases} P_t \times 0.01 & \text{if } P_t \le 1,000,000 \\ (1,000,000 \times 0.01) + ((P_t - 1,000,000) \times 0.02) & \text{if } P_t > 1,000,000 \end{cases}$$
* **Total Required Capital to Close:**
  $$\text{Target Capital}_t = (P_t \times \text{minimum\_deposit\_pct}) + \text{Stamp Duty}_t + \text{closing\_fees}$$
* **Central Bank of Ireland Borrowing Cap Check:**
  $$\text{Max Mortgage Available} = \text{buyer\_gross\_annual\_salary\_eur} \times \text{cbi\_max\_lti\_multiple}$$
  If $P_t \times (1 - \text{minimum\_deposit\_pct}) > \text{Max Mortgage Available}$, the required deposit is increased by the shortfall.

#### 2. Asset Bucket Calculations
* **Base Investments:**
  $$I_t = I_{t-1} \times (1 + g_{\text{inv}})^{\frac{1}{12}}$$
* **Cash Accumulation:**
  $$\text{Cash}_t = \text{Cash}_{t-1} + \text{monthly\_salary\_savings}$$
* **Rent Sunk Drag (Cumulative Tracking with RPZ inflation):**
  $$\text{Rent}_t = \text{Rent}_{t-1} \times (1 + g_{\text{rent}})^{\frac{1}{12}}$$
  $$\text{Cumulative Rent}_t = \text{Cumulative Rent}_{t-1} + \text{Rent}_t$$

#### 3. Equity Engine (Vesting & Growth)
* **Stock Price Progression:**
  $$S_t = S_0 \times (1 + g_{\text{stock}})^{\frac{t}{12}}$$
* **Vesting Event Trigger:** If month $t$ satisfies a vest milestone for grant $k$:
  $$\text{Gross Vest Shares} = \text{Total Shares}_k \times \text{Schedule Percentage}$$
  $$\text{Net Vest (EUR)}_t = (\text{Gross Vest Shares} \times S_t) \times (1 - 0.52) \times \text{FX}_t$$
* **Retained GSU Pool Compounding:**
  $$\text{GSU Pool}_t = \left(\text{GSU Pool}_{t-1} \times (1 + g_{\text{stock}})^{\frac{1}{12}}\right) + \text{Net Vest (EUR)}_t$$

#### 4. Total Liquid Capital & Affordability Status
$$\text{Total Liquid Wealth}_t = \text{Cash}_t + I_t + \text{GSU Pool}_t$$
$$\text{Surplus / Deficit}_t = \text{Total Liquid Wealth}_t - \text{Target Capital}_t$$
* **Earliest Viable Purchase Month ($t^*$):** The first month where $\text{Surplus}_t \ge 0$.

---

## 5. Opportunity Cost & Decision Framework

The model evaluates purchasing at the earliest viable month $t^*$ versus waiting until month $t^* + \Delta t$ (e.g., $+12$, $+24$, or $+36$ months) or renting for the full 60-month horizon:

### Post-Purchase Wealth Mechanics:
1. **At Purchase Month $t_{\text{buy}}$:**
   - Buyer withdraws $\text{Target Capital}_{t_{\text{buy}}}$ (deposit + stamp duty + closing fees) using optimal capital preservation waterfall: Cash $\to$ Base Investments $\to$ GSU Pool.
   - Remaining liquid wealth continues compounding at respective rates.
   - Mortgage Loan Principal: $L = P_{t_{\text{buy}}} \times (1 - \text{deposit\_pct})$.
   - Monthly mortgage payment $M = L \frac{r_m (1 + r_m)^N}{(1 + r_m)^N - 1}$ where $r_m = \text{rate}/12$ and $N = \text{term\_years} \times 12$.
2. **Monthly Post-Purchase Cash Flow ($t > t_{\text{buy}}$):**
   - Monthly Housing Cost = Mortgage Interest + Maintenance Cost ($P_t \times \text{maintenance\_rate} / 12$).
   - Principal paydown reduces loan balance $L_t$ and builds Home Equity: $\text{Home Equity}_t = P_t - L_t$.
   - Monthly Rent is **€0**.
   - Cashflow delta adjustments: Net difference between rent and (mortgage + maintenance) adjusts monthly cash additions.
3. **Net Wealth at Year 5 ($t = 60$):**
   $$\text{Net Wealth}_{t=60} = \text{Remaining Liquid Wealth}_{60} + \text{Home Equity}_{60}$$

### Decision Metric:
$$\Delta \text{Wealth} = \text{Net Wealth}_{\text{Wait}} - \text{Net Wealth}_{\text{Buy Now}}$$
* If $\Delta \text{Wealth} > 0$: **Wait and compound.** Equity growth exceeds property inflation + rent drag.
* If $\Delta \text{Wealth} \le 0$: **Buy immediately.** Rent drag and property inflation exceed investment returns.

---

## 6. Live Market Data Integration (Google GSUs & FX)

1. **Google Stock Price (Alphabet Inc. - GOOG / GOOGL):**
   - Enables fetching current / latest closing price from public financial endpoints (Yahoo Finance / Stooq) with fallback to user-specified manual values.
   - Historical closing price lookup for `meta.start_date`.
2. **EUR/USD Spot FX:**
   - Fetch live ECB / open exchange rate feeds.
   - Auto-populates `eur_usd_spot`.
3. **Status Indicator & Visibility:**
   - Visual badge in the top bar: 
     - 🟢 **Live Data** (active feed from Yahoo/ECB)
     - 🟡 **Cached Data** (fetched within session)
     - 🟠 **Offline Fallback / Demo Mode** (clearly labeled when API is unavailable or user chooses manual mode).
