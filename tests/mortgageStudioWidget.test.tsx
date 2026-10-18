// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MortgageStudioWidget } from '../src/components/MortgageStudioWidget';
import { DEFAULT_CONFIG } from '../src/engine/constants';
import { SimulationConfig } from '../src/engine/types';
import { runSimulation } from '../src/engine/simulation';

afterEach(() => {
  cleanup();
});

// Mock recharts ResponsiveContainer to avoid SVG measuring issues in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  };
});

describe('MortgageStudioWidget Component Persistence', () => {
  const testConfig: SimulationConfig = {
    ...DEFAULT_CONFIG,
    property: {
      ...DEFAULT_CONFIG.property,
      target_price_eur: 600000,
      deposit_eur: 150000,
      minimum_deposit_pct: 0.10,
    },
    mortgage: {
      ...DEFAULT_CONFIG.mortgage,
      buyer_annual_bonus_eur: 30000,
      approval_in_principle_amount_eur: 500000,
      selected_purchase_month: 0,
      monthly_overpayment_eur: 0,
      annual_lump_sum_eur: 0,
    },
    liquid_assets: {
      ...DEFAULT_CONFIG.liquid_assets,
      cash_eur: 200000,
    },
  };

  const monthlyPoints = runSimulation(testConfig);

  it('calls onChange with updated selected_purchase_month when quick month buttons are clicked', () => {
    const handleChange = vi.fn();
    render(
      <MortgageStudioWidget
        config={testConfig}
        monthlyPoints={monthlyPoints}
        onChange={handleChange}
      />
    );

    // Click 'M12' button
    const m12Button = screen.getByRole('button', { name: /^M12$/i });
    fireEvent.click(m12Button);

    expect(handleChange).toHaveBeenCalled();
    const updatedConfig = handleChange.mock.calls[0][0];
    expect(updatedConfig.mortgage.selected_purchase_month).toBe(12);
  });

  it('calls onChange with updated monthly_overpayment_eur when monthly overpayment input changes', () => {
    const handleChange = vi.fn();
    render(
      <MortgageStudioWidget
        config={testConfig}
        monthlyPoints={monthlyPoints}
        onChange={handleChange}
      />
    );

    const monthlyInput = screen.getByPlaceholderText('e.g. 400');
    fireEvent.change(monthlyInput, { target: { value: '500' } });

    expect(handleChange).toHaveBeenCalled();
    const updatedConfig = handleChange.mock.calls[0][0];
    expect(updatedConfig.mortgage.monthly_overpayment_eur).toBe(500);
  });

  it('calls onChange with updated annual_lump_sum_eur when annual lump sum input changes', () => {
    const handleChange = vi.fn();
    render(
      <MortgageStudioWidget
        config={testConfig}
        monthlyPoints={monthlyPoints}
        onChange={handleChange}
      />
    );

    const annualInput = screen.getByPlaceholderText('e.g. 10000');
    fireEvent.change(annualInput, { target: { value: '8000' } });

    expect(handleChange).toHaveBeenCalled();
    const updatedConfig = handleChange.mock.calls[0][0];
    expect(updatedConfig.mortgage.annual_lump_sum_eur).toBe(8000);
  });
});
