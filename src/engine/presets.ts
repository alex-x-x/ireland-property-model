import { PresetScenario } from './types';

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'baseline',
    name: 'Standard Dublin Baseline',
    tagline: '5% Property Growth, 10% GSU Return, €2.5k Rent',
    description: 'Realistic baseline reflecting historical Dublin residential inflation and Alphabet equity trajectory with AIB 3.5% green mortgage benchmark.',
    config: {
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
      equity_engine: {
        stock_yearly_growth_rate: 0.10,
        current_share_price_usd: 150.00,
        marginal_tax_rate_ireland: 0.52,
        grants: [
          {
            id: 'initial_grant',
            name: 'Initial Hire Grant',
            type: 'initial',
            grant_date: '2024-08-01',
            total_shares: 1000,
            schedule_percents: [0.33, 0.33, 0.22, 0.12],
            vest_frequency_months: 12,
          },
          {
            id: 'refresher_2025',
            name: 'Annual Refresher 2025',
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
        rent_yearly_growth_rate: 0.02,
      },
    },
  },
  {
    id: 'tech_bull_run',
    name: 'Tech Equity Bull Run',
    tagline: '18% Stock Growth vs 4% Property Growth',
    description: 'Strong AI/Tech boom where Alphabet shares appreciate aggressively, heavily favoring keeping equity invested and waiting to buy.',
    config: {
      equity_engine: {
        stock_yearly_growth_rate: 0.18,
        current_share_price_usd: 150.00,
        marginal_tax_rate_ireland: 0.52,
        grants: [
          {
            id: 'initial_grant',
            name: 'Initial Hire Grant',
            type: 'initial',
            grant_date: '2024-08-01',
            total_shares: 1000,
            schedule_percents: [0.33, 0.33, 0.22, 0.12],
            vest_frequency_months: 12,
          },
          {
            id: 'refresher_2025',
            name: 'Annual Refresher 2025',
            type: 'refresher',
            grant_date: '2025-08-01',
            total_shares: 200,
            schedule_percents: [0.25, 0.25, 0.25, 0.25],
            vest_frequency_months: 3,
          },
        ],
      },
      property: {
        target_price_eur: 1000000,
        yearly_growth_rate: 0.04,
        minimum_deposit_pct: 0.10,
        stamp_duty_tiers: [
          { up_to: 1000000, rate: 0.01 },
          { up_to: null, rate: 0.02 },
        ],
        legal_and_closing_fees_eur: 3000,
      },
    },
  },
  {
    id: 'dublin_property_surge',
    name: 'Dublin Property Squeeze',
    tagline: '8% Property Appreciation & €3,200 Rent',
    description: 'Supply shortage causes Dublin home prices to surge 8% annually alongside steep rent friction, strongly incentivizing buying immediately.',
    config: {
      property: {
        target_price_eur: 1000000,
        yearly_growth_rate: 0.08,
        minimum_deposit_pct: 0.10,
        stamp_duty_tiers: [
          { up_to: 1000000, rate: 0.01 },
          { up_to: null, rate: 0.02 },
        ],
        legal_and_closing_fees_eur: 3000,
      },
      macro: {
        eur_usd_spot: 0.91,
        eur_usd_yearly_drift: 0.0,
        current_monthly_rent_eur: 3200,
        rent_yearly_growth_rate: 0.02,
      },
      equity_engine: {
        stock_yearly_growth_rate: 0.07,
        current_share_price_usd: 150.00,
        marginal_tax_rate_ireland: 0.52,
        grants: [
          {
            id: 'initial_grant',
            name: 'Initial Hire Grant',
            type: 'initial',
            grant_date: '2024-08-01',
            total_shares: 1000,
            schedule_percents: [0.33, 0.33, 0.22, 0.12],
            vest_frequency_months: 12,
          },
          {
            id: 'refresher_2025',
            name: 'Annual Refresher 2025',
            type: 'refresher',
            grant_date: '2025-08-01',
            total_shares: 200,
            schedule_percents: [0.25, 0.25, 0.25, 0.25],
            vest_frequency_months: 3,
          },
        ],
      },
    },
  },
  {
    id: 'market_stagnation',
    name: 'Tech Stagnation / Bear Market',
    tagline: '2% Stock Growth vs 4.5% Property Growth',
    description: 'Flat tech stock performance makes locking in real estate equity and eliminating rent drag the dominant strategy.',
    config: {
      equity_engine: {
        stock_yearly_growth_rate: 0.02,
        current_share_price_usd: 150.00,
        marginal_tax_rate_ireland: 0.52,
        grants: [
          {
            id: 'initial_grant',
            name: 'Initial Hire Grant',
            type: 'initial',
            grant_date: '2024-08-01',
            total_shares: 1000,
            schedule_percents: [0.33, 0.33, 0.22, 0.12],
            vest_frequency_months: 12,
          },
          {
            id: 'refresher_2025',
            name: 'Annual Refresher 2025',
            type: 'refresher',
            grant_date: '2025-08-01',
            total_shares: 200,
            schedule_percents: [0.25, 0.25, 0.25, 0.25],
            vest_frequency_months: 3,
          },
        ],
      },
      property: {
        target_price_eur: 1000000,
        yearly_growth_rate: 0.045,
        minimum_deposit_pct: 0.10,
        stamp_duty_tiers: [
          { up_to: 1000000, rate: 0.01 },
          { up_to: null, rate: 0.02 },
        ],
        legal_and_closing_fees_eur: 3000,
      },
    },
  },
];
