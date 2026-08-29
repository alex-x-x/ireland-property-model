import { describe, it, expect } from 'vitest';
import { PRESET_SCENARIOS } from '../src/engine/presets';
import { DEFAULT_CONFIG } from '../src/engine/constants';
import { SimulationConfig } from '../src/engine/types';

describe('Preset Scenarios Isolation', () => {
  it('modifies only economic drivers and preserves personal financial data', () => {
    // Custom personal financial baseline
    const customUserConfig: SimulationConfig = {
      ...DEFAULT_CONFIG,
      property: {
        ...DEFAULT_CONFIG.property,
        target_price_eur: 1350000,
        minimum_deposit_pct: 0.20,
      },
      liquid_assets: {
        ...DEFAULT_CONFIG.liquid_assets,
        cash_eur: 120000,
        monthly_salary_savings_eur: 4500,
      },
      mortgage: {
        ...DEFAULT_CONFIG.mortgage,
        buyer_gross_annual_salary_eur: 280000,
      },
      macro: {
        ...DEFAULT_CONFIG.macro,
        current_monthly_rent_eur: 3400,
      },
    };

    // Apply "Tech Bull Run" preset
    const bullRunPreset = PRESET_SCENARIOS.find((p) => p.id === 'tech_bull_run')!;
    expect(bullRunPreset).toBeDefined();

    const mergedConfig: SimulationConfig = {
      ...customUserConfig,
      property: {
        ...customUserConfig.property,
        yearly_growth_rate: bullRunPreset.config.property?.yearly_growth_rate ?? customUserConfig.property.yearly_growth_rate,
      },
      equity_engine: {
        ...customUserConfig.equity_engine,
        stock_yearly_growth_rate: bullRunPreset.config.equity_engine?.stock_yearly_growth_rate ?? customUserConfig.equity_engine.stock_yearly_growth_rate,
      },
      liquid_assets: {
        ...customUserConfig.liquid_assets,
        investments_yearly_growth_rate: bullRunPreset.config.liquid_assets?.investments_yearly_growth_rate ?? customUserConfig.liquid_assets.investments_yearly_growth_rate,
      },
      macro: {
        ...customUserConfig.macro,
        rent_yearly_growth_rate: bullRunPreset.config.macro?.rent_yearly_growth_rate ?? customUserConfig.macro.rent_yearly_growth_rate,
      },
      mortgage: {
        ...customUserConfig.mortgage,
        mortgage_interest_rate: bullRunPreset.config.mortgage?.mortgage_interest_rate ?? customUserConfig.mortgage.mortgage_interest_rate,
      },
    };

    // Economic drivers MUST be updated to preset values
    expect(mergedConfig.equity_engine.stock_yearly_growth_rate).toBe(0.18);
    expect(mergedConfig.property.yearly_growth_rate).toBe(0.04);
    expect(mergedConfig.liquid_assets.investments_yearly_growth_rate).toBe(0.12);

    // Personal financial situation MUST remain exactly unchanged
    expect(mergedConfig.property.target_price_eur).toBe(1350000);
    expect(mergedConfig.property.minimum_deposit_pct).toBe(0.20);
    expect(mergedConfig.liquid_assets.cash_eur).toBe(120000);
    expect(mergedConfig.liquid_assets.monthly_salary_savings_eur).toBe(4500);
    expect(mergedConfig.mortgage.buyer_gross_annual_salary_eur).toBe(280000);
    expect(mergedConfig.macro.current_monthly_rent_eur).toBe(3400);
  });
});
