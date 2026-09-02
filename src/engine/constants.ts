import { SimulationConfig } from './types';

export const DEFAULT_CONFIG: SimulationConfig = {
  meta: {
    start_date: '2026-08-29',
    forecast_months: 60,
    stock_symbol: 'GOOGL',
  },
  property: {
    target_price_eur: 1000000,
    yearly_growth_rate: 0.05,
    minimum_deposit_pct: 0.10,
    deposit_eur: 100000,
    stamp_duty_tiers: [
      { up_to: 1000000, rate: 0.01 },
      { up_to: null, rate: 0.02 },
    ],
    legal_and_closing_fees_eur: 3000,
  },
  mortgage: {
    mortgage_interest_rate: 0.035, // AIB 2026 Benchmark (~3.50%)
    mortgage_term_years: 25,
    yearly_maintenance_rate: 0.01,
    buyer_gross_annual_base_salary_eur: 200000,
    buyer_annual_bonus_pct: 0.15, // 15% target annual bonus (€30,000)
    buyer_annual_bonus_eur: 30000,
    buyer_gross_annual_salary_eur: 230000,
    cbi_max_lti_multiple: 4.0, // Central Bank of Ireland FTB LTI rule
    approval_in_principle_amount_eur: null, // null defaults to CBI 4.0x calculation (4.0 * €230k = €920k)
    bonus_payout_month: 3, // Annual March bonus payout
    variable_rate_shock_pct: 1.5, // Central Bank stress test default (+1.50%)
    fixed_rate_years: 2, // 2-year fixed lock
    salary_adjustments: [
      {
        id: 'adj_promo_y2',
        effective_date: '2028-09-01', // Planned promotion in exactly 2 years (Month 24)
        base_salary_eur: 240000,      // +€40k base increase
        bonus_pct: 0.15,
        bonus_eur: 36000,
        note: 'Staff / L6 Promotion (+€40k base)',
      },
    ],
    max_contractual_monthly_payment_eur: null,
  },
  liquid_assets: {
    cash_eur: 50000,
    cash_usd: 10000,
    investments_eur: 20000,
    investments_usd: 50000,
    investments_yearly_growth_rate: 0.08,
    monthly_salary_savings_eur: 2000,
    cash_safety_buffer_eur: 20000,
    cash_safety_buffer_usd: 0,
  },
  equity_engine: {
    stock_yearly_growth_rate: 0.10,
    current_share_price_usd: 200.00,
    marginal_tax_rate_ireland: 0.52, // 40% PAYE + 8% USC + 4% PRSI
    initial_vested_shares_held: 300, // Currently held vested shares at start date (300 shares @ $200 = $60k)
    grants: [
      {
        id: 'initial_grant',
        name: 'Initial Hire Grant (Google GSU)',
        type: 'initial',
        grant_date: '2024-08-01',
        total_shares: 1000,
        schedule_percents: [0.33, 0.33, 0.22, 0.12], // Google standard front-loaded vest
        vest_frequency_months: 1, // Monthly vesting
      },
      {
        id: 'refresher_2025',
        name: 'Annual Refresher 2025 ($100k)',
        type: 'refresher',
        grant_date: '2025-08-01',
        nomination_mode: 'usd',
        target_value_usd: 100000,
        total_shares: 500,
        schedule_percents: [0.25, 0.25, 0.25, 0.25],
        vest_frequency_months: 1,
      },
      {
        id: 'refresher_2026',
        name: 'Projected Refresher 2026 ($100k)',
        type: 'refresher',
        grant_date: '2026-08-01',
        nomination_mode: 'usd',
        target_value_usd: 100000,
        total_shares: 500,
        schedule_percents: [0.25, 0.25, 0.25, 0.25],
        vest_frequency_months: 1,
      },
      {
        id: 'refresher_2027',
        name: 'Projected Refresher 2027 ($100k)',
        type: 'refresher',
        grant_date: '2027-08-01',
        nomination_mode: 'usd',
        target_value_usd: 100000,
        total_shares: 500,
        schedule_percents: [0.25, 0.25, 0.25, 0.25],
        vest_frequency_months: 1,
      },
      {
        id: 'refresher_2028',
        name: 'Projected Refresher 2028 ($100k)',
        type: 'refresher',
        grant_date: '2028-08-01',
        nomination_mode: 'usd',
        target_value_usd: 100000,
        total_shares: 500,
        schedule_percents: [0.25, 0.25, 0.25, 0.25],
        vest_frequency_months: 1,
      },
      {
        id: 'refresher_2029',
        name: 'Projected Refresher 2029 ($100k)',
        type: 'refresher',
        grant_date: '2029-08-01',
        nomination_mode: 'usd',
        target_value_usd: 100000,
        total_shares: 500,
        schedule_percents: [0.25, 0.25, 0.25, 0.25],
        vest_frequency_months: 1,
      },
      {
        id: 'refresher_2030',
        name: 'Projected Refresher 2030 ($100k)',
        type: 'refresher',
        grant_date: '2030-08-01',
        nomination_mode: 'usd',
        target_value_usd: 100000,
        total_shares: 500,
        schedule_percents: [0.25, 0.25, 0.25, 0.25],
        vest_frequency_months: 1,
      },
    ],
  },
  macro: {
    eur_usd_spot: 0.90,
    eur_usd_yearly_drift: 0.0,
    current_monthly_rent_eur: 2500,
    rent_yearly_growth_rate: 0.02, // Irish RPZ statutory cap baseline
    use_manual_market_override: false, // Overrides disabled by default
  },
  tax: {
    standard_rate_cutoff_eur: 53000, // Irish Standard Rate Cut-Off (e.g. Married 1-Earner €53k)
    tax_credits_eur: 9000,           // Annual Tax Credits
    savings_calculation_mode: 'net_pay_derived', // Dynamic savings: Net Take-Home - Rent - Living Expenses
    monthly_living_expenses_eur: 2500,           // Monthly non-rent / non-mortgage living spend
  },
};

