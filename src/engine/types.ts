export interface StampDutyTier {
  up_to: number | null;
  rate: number;
}

export interface PropertyConfig {
  target_price_eur: number;
  yearly_growth_rate: number;
  minimum_deposit_pct?: number;
  deposit_eur?: number;
  stamp_duty_tiers: StampDutyTier[];
  legal_and_closing_fees_eur: number;
}

export interface SalaryAdjustment {
  id: string;
  effective_date: string; // YYYY-MM-DD
  base_salary_eur: number;
  bonus_pct?: number;
  bonus_eur?: number;
  note?: string;
}

export interface MortgageConfig {
  mortgage_interest_rate: number;
  mortgage_term_years: number;
  yearly_maintenance_rate: number;
  buyer_gross_annual_base_salary_eur: number;
  buyer_annual_bonus_pct?: number; // Target bonus percentage (e.g. 0.20 for 20%)
  buyer_annual_bonus_eur?: number; // Target bonus absolute value (e.g. €38,000)
  buyer_gross_annual_salary_eur?: number; // legacy fallback / total
  cbi_max_lti_multiple: number;
  approval_in_principle_amount_eur?: number | null; // explicit AIP loan limit
  salary_adjustments?: SalaryAdjustment[]; // Planned future salary increases
  bonus_payout_month?: number; // Month of annual bonus payment (1-12, default: 3 for March)
}

export interface LiquidAssetsConfig {
  cash_eur: number;
  cash_usd: number;
  investments_eur: number;
  investments_usd: number;
  investments_yearly_growth_rate: number;
  monthly_salary_savings_eur: number;
  cash_safety_buffer_eur?: number; // Cash safety pot in EUR reserved from mortgage/deposit
  cash_safety_buffer_usd?: number; // Cash safety pot in USD reserved from mortgage/deposit
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
  initial_vested_shares_held?: number; // Vested RSUs/company shares held at Model Start Date
  grants: Grant[];
}

export interface MacroConfig {
  eur_usd_spot: number;
  eur_usd_yearly_drift: number;
  current_monthly_rent_eur: number;
  rent_yearly_growth_rate: number;
  use_manual_market_override?: boolean; // When true, manual price/FX overrides are used instead of market feed
}

export interface MetaConfig {
  start_date: string; // YYYY-MM-DD
  forecast_months: number;
  stock_symbol: string;
}

export interface IrishTaxConfig {
  standard_rate_cutoff_eur: number; // e.g. €53,000 (married 1-earner) or €44,000 (single)
  tax_credits_eur: number; // e.g. €9,000
  savings_calculation_mode?: 'explicit' | 'net_pay_derived';
  monthly_living_expenses_eur?: number; // Non-rent monthly living spend
}

export interface SimulationConfig {
  meta: MetaConfig;
  property: PropertyConfig;
  mortgage: MortgageConfig;
  liquid_assets: LiquidAssetsConfig;
  equity_engine: EquityEngineConfig;
  macro: MacroConfig;
  tax?: IrishTaxConfig;
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
  safetyBufferEur?: number;
  usableLiquidWealth?: number;
  surplus: number;
  isAffordable: boolean;
  vestEvents: MonthlyVestEvent[];
  monthlyRent: number;
  cumulativeRent: number;
  maxMortgageAvailable: number;
  borrowingShortfall: number;
  netBonusReceivedEur?: number;
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
