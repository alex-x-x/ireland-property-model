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
    buyer_gross_annual_salary_eur: 225000,
    cbi_max_lti_multiple: 4.0, // Central Bank of Ireland FTB LTI rule
  },
  liquid_assets: {
    cash_eur: 50000,
    cash_usd: 10000,
    investments_eur: 20000,
    investments_usd: 50000,
    investments_yearly_growth_rate: 0.08,
    monthly_salary_savings_eur: 2000,
  },
  equity_engine: {
    stock_yearly_growth_rate: 0.10,
    current_share_price_usd: 150.00,
    marginal_tax_rate_ireland: 0.52, // 40% PAYE + 8% USC + 4% PRSI
    grants: [
      {
        id: 'initial_grant',
        name: 'Initial Hire Grant (Google GSU)',
        type: 'initial',
        grant_date: '2024-08-01',
        total_shares: 1000,
        schedule_percents: [0.33, 0.33, 0.22, 0.12],
        vest_frequency_months: 12,
      },
      {
        id: 'refresher_2025',
        name: 'Annual Refresher 2025 (Google GSU)',
        type: 'refresher',
        grant_date: '2025-08-01',
        total_shares: 200,
        schedule_percents: [0.25, 0.25, 0.25, 0.25],
        vest_frequency_months: 3,
      },
    ],
  },
  macro: {
    eur_usd_spot: 0.91,
    eur_usd_yearly_drift: 0.0,
    current_monthly_rent_eur: 2500,
    rent_yearly_growth_rate: 0.02, // Dublin RPZ statutory cap baseline
  },
};
