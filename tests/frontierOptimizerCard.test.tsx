// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { FrontierOptimizerCard } from '../src/components/FrontierOptimizerCard';
import { SimulationConfig } from '../src/engine/types';
import { runSimulation } from '../src/engine/simulation';
import { DEFAULT_CONFIG } from '../src/engine/constants';

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

describe('FrontierOptimizerCard Component & Custom Loan Reproduction', () => {
  // Exact user configuration from the screenshot:
  // Property: €710,000, Deposit: €212,000 (30%), AIP: €500,000
  const testConfig: SimulationConfig = {
    ...DEFAULT_CONFIG,
    property: {
      ...DEFAULT_CONFIG.property,
      target_price_eur: 710000,
      deposit_eur: 212000,
      minimum_deposit_pct: 212000 / 710000, // ~0.2986 as set by Sidebar
    },
    mortgage: {
      ...DEFAULT_CONFIG.mortgage,
      approval_in_principle_amount_eur: 500000,
      mortgage_term_years: 26,
      max_mortgage_term_years: 26,
    },
    liquid_assets: {
      ...DEFAULT_CONFIG.liquid_assets,
      cash_eur: 250000,
    },
  };

  const monthlyPoints = runSimulation(testConfig);

  const renderCard = (config = testConfig) =>
    render(
      <FrontierOptimizerCard
        config={config}
        monthlyPoints={monthlyPoints}
        selectedMonth={0}
        currentLoanAmount={498000}
        currentInterestRatePct={3.95}
        currentTermYears={26}
        currentMonthlyOverpayment={0}
        currentAnnualLumpSum={0}
        onApplyStrategy={vi.fn()}
      />
    );

  it('renders presets correctly: Sidebar Loan €498k and Max AIP Leverage €500k', () => {
    renderCard();

    // Sidebar loan = 710k - 212k = €498,000
    expect(screen.getByRole('button', { name: /Sidebar Loan \(€498,000\)/i })).toBeTruthy();

    // Max AIP Leverage should show €500,000 (full AIP capacity within 90% LTV), not clamped to €498,000
    expect(screen.getByRole('button', { name: /Max AIP Leverage \(€500,000\)/i })).toBeTruthy();

    // Default scope description in Fixed Loan mode
    expect(screen.getByText(/Loan fixed at €498,000 \(70% LTV\)/i)).toBeTruthy();
  });

  it('allows user to click Custom Loan and enter €550,000 without reverting to €498,000', () => {
    renderCard();

    // 1. Click "Custom Loan €" button
    const customLoanBtn = screen.getByRole('button', { name: /Custom Loan €/i });
    fireEvent.click(customLoanBtn);

    // 2. Find the Custom Loan input field
    const input = screen.getByDisplayValue('498,000') as HTMLInputElement;
    expect(input).toBeTruthy();

    // 3. Focus and type €550,000
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '550000' } });

    // 4. Press Enter or blur
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    fireEvent.blur(input);

    // 5. Must retain €550,000 and update deposit / LTV badge
    expect(input.value).toBe('550,000');
    expect(screen.getByText(/Deposit: €160,000 • 77% LTV/i)).toBeTruthy();
    expect(screen.getByText(/Loan fixed at €550,000 \(77% LTV\)/i)).toBeTruthy();
  });

  it('switches between presets dynamically without state corruption', () => {
    renderCard();

    const maxAipBtn = screen.getByRole('button', { name: /Max AIP Leverage/i });
    fireEvent.click(maxAipBtn);
    expect(screen.getByText(/Loan fixed at €500,000 \(70% LTV\)/i)).toBeTruthy();

    const sidebarBtn = screen.getByRole('button', { name: /Sidebar Loan/i });
    fireEvent.click(sidebarBtn);
    expect(screen.getByText(/Loan fixed at €498,000 \(70% LTV\)/i)).toBeTruthy();
  });

  it('clamps custom loan to statutory maximum 90% LTV (€639,000 on €710,000 property)', () => {
    renderCard();

    const customLoanBtn = screen.getByRole('button', { name: /Custom Loan €/i });
    fireEvent.click(customLoanBtn);

    const input = screen.getByDisplayValue('498,000') as HTMLInputElement;
    fireEvent.focus(input);
    // User tries to enter €700,000 (which exceeds Irish 90% LTV limit of €639,000)
    fireEvent.change(input, { target: { value: '700000' } });
    fireEvent.blur(input);

    expect(input.value).toBe('639,000');
    expect(screen.getByText(/Deposit: €71,000 • 90% LTV/i)).toBeTruthy();
    expect(screen.getByText(/Loan fixed at €639,000 \(90% LTV\)/i)).toBeTruthy();
  });

  it('falls back cleanly to sidebar loan when user enters an empty or non-numeric string', () => {
    renderCard();

    const customLoanBtn = screen.getByRole('button', { name: /Custom Loan €/i });
    fireEvent.click(customLoanBtn);

    const input = screen.getByDisplayValue('498,000') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(input.value).toBe('498,000');
    expect(screen.getByText(/Loan fixed at €498,000 \(70% LTV\)/i)).toBeTruthy();
  });

  it('toggles between Fixed Loan Mode and Explore All Tiers mode', () => {
    renderCard();

    const exploreBtn = screen.getByRole('button', { name: /Explore All Tiers/i });
    fireEvent.click(exploreBtn);

    expect(screen.getByText(/Sweeps across standard LTV tiers/i)).toBeTruthy();

    const fixedBtn = screen.getByRole('button', { name: /Fixed Loan Mode/i });
    fireEvent.click(fixedBtn);

    expect(screen.getByText(/Loan fixed at €498,000 \(70% LTV\)/i)).toBeTruthy();
  });
});
