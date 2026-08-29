export interface StampDutyTier {
  up_to: number | null;
  rate: number;
}

export interface PropertyConfig {
  target_price_eur: number;
  yearly_growth_rate: number;
  minimum_deposit_pct: number;
  stamp_duty_tiers: StampDutyTier[];
  legal_and_closing_fees_eur: number;
}

export interface MortgageConfig {
  mortgage_interest_rate: number;
  mortgage_term_years: number;
  yearly_maintenance_rate: number;
  buyer_gross_annual_base_salary_eur: number;
  buyer_annual_bonus_eur: number;
  buyer_gross_annual_salary_eur?: number; // legacy fallback / total
  cbi_max_lti_multiple: number;
  approval_in_principle_amount_eur?: number | null; // explicit AIP loan limit
}

export interface LiquidAssetsConfig {
  cash_eur: number;
  cash_usd: number;
  investments_eur: number;
  investments_usd: number;
  investments_yearly_growth_rate: number;
  monthly_salary_savings_eur: number;
}

export interface Grant {
  id: string;
  name?: string;
  type: 'initial' | 'refresher' | 'custom';
  grant_date: string; // YYYY-MM-DD
  total_shares: number;
  schedule_percents: number[];
  vest_frequency_months: number;
}

export interface EquityEngineConfig {
  stock_yearly_growth_rate: number;
  current_share_price_usd: number;
  marginal_tax_rate_ireland: number;
  grants: Grant[];
}

export interface MacroConfig {
  eur_usd_spot: number;
  eur_usd_yearly_drift: number;
  current_monthly_rent_eur: number;
  rent_yearly_growth_rate: number;
}

export interface MetaConfig {
  start_date: string; // YYYY-MM-DD
  forecast_months: number;
  stock_symbol: string;
}

export interface SimulationConfig {
  meta: MetaConfig;
  property: PropertyConfig;
  mortgage: MortgageConfig;
  liquid_assets: LiquidAssetsConfig;
  equity_engine: EquityEngineConfig;
  macro: MacroConfig;
}

export interface MonthlyVestEvent {
  grantId: string;
  grantType: string;
  grossShares: number;
  netShares: number;
  sharePriceUsd: number;
  netAmountEur: number;
}

export interface MonthlyDataPoint {
  month: number;
  date: string;
  propertyPrice: number;
  stampDuty: number;
  targetCapital: number;
  cash: number;
  investments: number;
  gsuPool: number;
  retainedShares: number;
  stockPriceUsd: number;
  fxRate: number;
  totalLiquidWealth: number;
  surplus: number;
  isAffordable: boolean;
  vestEvents: MonthlyVestEvent[];
  monthlyRent: number;
  cumulativeRent: number;
  maxMortgageAvailable: number;
  borrowingShortfall: number;
}

export interface PurchaseScenario {
  id: string;
  timingLabel: string;
  buyMonth: number | null;
  buyDate: string | null;
  propertyPurchasePrice: number;
  depositPaid: number;
  stampDutyPaid: number;
  closingFeesPaid: number;
  totalUpfrontPaid: number;
  initialMortgagePrincipal: number;
  monthlyMortgagePayment: number;
  cumulativeMortgageInterestPaid: number;
  cumulativeMortgagePrincipalPaid: number;
  cumulativeMaintenancePaid: number;
  cumulativeRentPaid: number;
  propertyValueAtM60: number;
  remainingMortgageBalanceAtM60: number;
  homeEquityAtM60: number;
  remainingLiquidWealthAtM60: number;
  totalNetWealthAtM60: number;
  netWealthDeltaVsBuyAsap: number;
}

export interface DecisionComparison {
  earliestBuyMonth: number | null;
  earliestBuyDate: string | null;
  recommendedAction: 'buy_asap' | 'wait_and_compound' | 'unaffordable';
  recommendationReason: string;
  scenarios: PurchaseScenario[];
  deltas: {
    delta12m: number | null;
    delta24m: number | null;
    delta36m: number | null;
    deltaRent: number | null;
  };
}

export interface PresetScenario {
  id: string;
  name: string;
  tagline: string;
  description: string;
  config: Partial<SimulationConfig>;
}
