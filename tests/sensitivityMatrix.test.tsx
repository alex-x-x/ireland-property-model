// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SensitivityMatrix } from '../src/components/SensitivityMatrix';
import { DEFAULT_CONFIG } from '../src/engine/constants';
import { SimulationConfig } from '../src/engine/types';

afterEach(() => {
  cleanup();
});

describe('SensitivityMatrix Component Persistence', () => {
  it('calls onChange with updated sensitivity_preset when preset buttons are clicked', () => {
    const handleChange = vi.fn();
    const config: SimulationConfig = {
      ...DEFAULT_CONFIG,
      meta: {
        ...DEFAULT_CONFIG.meta,
        sensitivity_preset: 'optimal',
      },
    };

    render(<SensitivityMatrix config={config} onChange={handleChange} />);

    // Click 'Wait 12M'
    const wait12Button = screen.getByRole('button', { name: /Wait 12M/i });
    fireEvent.click(wait12Button);

    expect(handleChange).toHaveBeenCalledTimes(1);
    const updatedConfig = handleChange.mock.calls[0][0];
    expect(updatedConfig.meta.sensitivity_preset).toBe('12m');

    // Click 'Wait 24M'
    const wait24Button = screen.getByRole('button', { name: /Wait 24M/i });
    fireEvent.click(wait24Button);

    expect(handleChange).toHaveBeenCalledTimes(2);
    expect(handleChange.mock.calls[1][0].meta.sensitivity_preset).toBe('24m');
  });

  it('calls onChange with updated custom wait months when slider is adjusted in custom mode', () => {
    const handleChange = vi.fn();
    const config: SimulationConfig = {
      ...DEFAULT_CONFIG,
      meta: {
        ...DEFAULT_CONFIG.meta,
        sensitivity_preset: 'custom',
        sensitivity_custom_wait_months: 18,
      },
    };

    render(<SensitivityMatrix config={config} onChange={handleChange} />);

    // Find the custom slider
    const slider = screen.getByTitle(/Drag to select custom wait duration in months/i);
    expect(slider).toBeDefined();

    fireEvent.change(slider, { target: { value: '30' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    const updatedConfig = handleChange.mock.calls[0][0];
    expect(updatedConfig.meta.sensitivity_custom_wait_months).toBe(30);
  });
});
