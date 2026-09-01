import { PresetScenario } from './types';

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'baseline',
    name: 'Standard Ireland Baseline',
    tagline: '5% Property Growth, 10% GSU Return, 3.5% AIB Rate',
    description: 'Realistic baseline reflecting historical Irish residential inflation and Alphabet equity trajectory with AIB green mortgage benchmark.',
    config: {
      property: {
        yearly_growth_rate: 0.05,
      },
      equity_engine: {
        stock_yearly_growth_rate: 0.10,
      },
      liquid_assets: {
        investments_yearly_growth_rate: 0.08,
      },
      macro: {
        rent_yearly_growth_rate: 0.02,
        eur_usd_yearly_drift: 0.0,
      },
      mortgage: {
        mortgage_interest_rate: 0.035,
      },
    },
  },
  {
    id: 'tech_bull_run',
    name: 'Tech Equity Bull Run',
    tagline: '18% Stock Growth vs 4% Property Growth',
    description: 'Strong AI/Tech boom where Alphabet shares appreciate aggressively, heavily favoring keeping equity invested and waiting to buy.',
    config: {
      property: {
        yearly_growth_rate: 0.04,
      },
      equity_engine: {
        stock_yearly_growth_rate: 0.18,
      },
      liquid_assets: {
        investments_yearly_growth_rate: 0.12,
      },
      macro: {
        rent_yearly_growth_rate: 0.02,
        eur_usd_yearly_drift: 0.0,
      },
      mortgage: {
        mortgage_interest_rate: 0.035,
      },
    },
  },
  {
    id: 'dublin_property_surge',
    name: 'Ireland Property Squeeze',
    tagline: '8.5% Property Appreciation & 4% Rent Growth',
    description: 'Severe housing supply shortage causes Irish home prices to surge 8.5% annually alongside higher rent inflation, strongly incentivizing buying early.',
    config: {
      property: {
        yearly_growth_rate: 0.085,
      },
      equity_engine: {
        stock_yearly_growth_rate: 0.07,
      },
      liquid_assets: {
        investments_yearly_growth_rate: 0.06,
      },
      macro: {
        rent_yearly_growth_rate: 0.04,
        eur_usd_yearly_drift: 0.0,
      },
      mortgage: {
        mortgage_interest_rate: 0.04,
      },
    },
  },
  {
    id: 'high_interest_rates',
    name: 'High Interest Rate Climate',
    tagline: '5.5% Mortgage Rate & 2.5% Property Growth',
    description: 'Elevated ECB rates increase mortgage borrowing costs, subduing property inflation and making investment compounding more competitive.',
    config: {
      property: {
        yearly_growth_rate: 0.025,
      },
      equity_engine: {
        stock_yearly_growth_rate: 0.08,
      },
      liquid_assets: {
        investments_yearly_growth_rate: 0.06,
      },
      macro: {
        rent_yearly_growth_rate: 0.015,
        eur_usd_yearly_drift: 0.0,
      },
      mortgage: {
        mortgage_interest_rate: 0.055,
      },
    },
  },
  {
    id: 'market_stagnation',
    name: 'Tech Stagnation / Bear Market',
    tagline: '2% Stock Growth vs 4.5% Property Growth',
    description: 'Flat tech stock performance makes locking in real estate equity and eliminating rent drag the dominant financial strategy.',
    config: {
      property: {
        yearly_growth_rate: 0.045,
      },
      equity_engine: {
        stock_yearly_growth_rate: 0.02,
      },
      liquid_assets: {
        investments_yearly_growth_rate: 0.03,
      },
      macro: {
        rent_yearly_growth_rate: 0.01,
        eur_usd_yearly_drift: 0.0,
      },
      mortgage: {
        mortgage_interest_rate: 0.032,
      },
    },
  },
];
