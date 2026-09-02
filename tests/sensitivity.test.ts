import { describe, it, expect } from 'vitest';
import {
  computeSensitivityMatrix,
  calculateBreakevenStockRate,
  getDynamicSensitivityRates,
  SENSITIVITY_STOCK_RATES,
  SENSITIVITY_PROP_RATES,
} from '../src/engine/sensitivity';
import { DEFAULT_CONFIG } from '../src/engine/constants';

describe('Sensitivity Matrix Engine', () => {
  it('computes 55 permutations correctly for default config in optimal mode', () => {
    const grid = computeSensitivityMatrix(DEFAULT_CONFIG, 'optimal');
    expect(grid.length).toBe(SENSITIVITY_STOCK_RATES.length); // 11 rows
    expect(grid[0].cells.length).toBe(SENSITIVITY_PROP_RATES.length); // 5 cols

    // Ensure all cells have valid outputs
    for (const row of grid) {
      expect(typeof row.stockRate).toBe('number');
      for (const cell of row.cells) {
        expect(typeof cell.propRate).toBe('number');
        expect(typeof cell.delta).toBe('number');
        expect(['wait_and_compound', 'buy_asap', 'unaffordable']).toContain(cell.winner);
        expect(typeof cell.isAffordable).toBe('boolean');
      }
    }
  });

  it('reflects high stock growth favoring waiting over buying ASAP', () => {
    const grid = computeSensitivityMatrix(DEFAULT_CONFIG, 'optimal');
    // At +30% stock growth and 0% property growth, waiting to compound should strongly win
    const highStockRow = grid.find((r) => r.stockRate === 0.30);
    expect(highStockRow).toBeDefined();
    const flatPropCell = highStockRow?.cells.find((c) => c.propRate === 0.00);
    expect(flatPropCell?.winner).toBe('wait_and_compound');
    expect(flatPropCell?.delta).toBeGreaterThan(50000);
  });

  it('handles custom comparison horizons or wait durations (e.g. Month 12)', () => {
    const gridM12 = computeSensitivityMatrix(DEFAULT_CONFIG, 12);
    expect(gridM12.length).toBe(11);
    expect(gridM12[0].cells.length).toBe(5);
    expect(gridM12[0].cells[0].details).toBeDefined();
    expect(typeof gridM12[0].cells[0].details?.buyAsapNetWealth).toBe('number');
  });

  it('supports explicit waitMode: optimal, rent, and specific wait months', () => {
    const gridOptimal = computeSensitivityMatrix(DEFAULT_CONFIG, 'optimal');
    expect(gridOptimal[0].cells[0].strategyLabel).toBeDefined();

    const gridRent = computeSensitivityMatrix(DEFAULT_CONFIG, 'rent');
    expect(gridRent[0].cells[0].strategyLabel).toContain('Rent');
    expect(gridRent[0].cells[0].details?.waitBuyMonth).toBeNull();

    const grid24 = computeSensitivityMatrix(DEFAULT_CONFIG, 24);
    expect(grid24[0].cells[0].details?.waitBuyMonth).toBe(24);
  });

  it('computes breakeven stock rate accurately for a given property growth rate', () => {
    const grid = computeSensitivityMatrix(DEFAULT_CONFIG, 24);

    // Negative property growth: waiting strongly dominates
    const breakevenNeg = calculateBreakevenStockRate(grid, -0.03);
    expect(breakevenNeg).not.toBeNull();
    expect(breakevenNeg?.status).toBe('always_wait');
    expect(breakevenNeg?.closestPropRate).toBe(-0.03);

    // High property growth: buying ASAP strongly dominates
    const breakevenHigh = calculateBreakevenStockRate(grid, 0.08);
    expect(breakevenHigh).not.toBeNull();
    expect(breakevenHigh?.status).toBe('always_buy');
    expect(breakevenHigh?.closestPropRate).toBe(0.08);

    // Test zero-crossing behavior with custom mock grid
    const mockGrid = [
      {
        stockRate: 0.05,
        cells: [{ stockRate: 0.05, propRate: 0.03, delta: -10000, winner: 'buy_asap' as const, isAffordable: true }],
      },
      {
        stockRate: 0.15,
        cells: [{ stockRate: 0.15, propRate: 0.03, delta: 30000, winner: 'wait_and_compound' as const, isAffordable: true }],
      },
    ];
    const mockBreakeven = calculateBreakevenStockRate(mockGrid, 0.03);
    expect(mockBreakeven).not.toBeNull();
    expect(mockBreakeven?.status).toBe('crossing');
    expect(mockBreakeven?.hurdleRate).toBeCloseTo(0.075, 3);

    // Test unaffordable column handling (should not treat delta 0 as crossing point)
    const mockUnaffordableGrid = [
      {
        stockRate: 0.05,
        cells: [{ stockRate: 0.05, propRate: 0.03, delta: 0, winner: 'unaffordable' as const, isAffordable: false }],
      },
      {
        stockRate: 0.15,
        cells: [{ stockRate: 0.15, propRate: 0.03, delta: 0, winner: 'unaffordable' as const, isAffordable: false }],
      },
    ];
    const mockUnaffordableBreakeven = calculateBreakevenStockRate(mockUnaffordableGrid, 0.03);
    expect(mockUnaffordableBreakeven?.status).toBe('unaffordable');
    expect(mockUnaffordableBreakeven?.hurdleRate).toBeNull();
  });

  describe('Dynamic Rates Injection (Rows & Columns)', () => {
    it('injects user property inflation when not matching existing presets', () => {
      // 4% property growth is between 3% and 5%
      const res = getDynamicSensitivityRates(0.10, 0.04);
      expect(res.isInjectedProp).toBe(true);
      expect(res.propRates.length).toBe(SENSITIVITY_PROP_RATES.length + 1);
      expect(res.propRates).toContain(0.04);
      // Ensure sorted
      for (let i = 0; i < res.propRates.length - 1; i++) {
        expect(res.propRates[i]).toBeLessThan(res.propRates[i + 1]);
      }
    });

    it('does not inject when property rate matches existing preset within tolerance', () => {
      // 5.05% is within 0.25% of 5%
      const res = getDynamicSensitivityRates(0.10, 0.051);
      expect(res.isInjectedProp).toBe(false);
      expect(res.propRates.length).toBe(SENSITIVITY_PROP_RATES.length);
    });

    it('injects user stock growth when not matching existing presets', () => {
      // 12% stock growth is between 10% and 15%
      const res = getDynamicSensitivityRates(0.12, 0.05);
      expect(res.isInjectedStock).toBe(true);
      expect(res.stockRates.length).toBe(SENSITIVITY_STOCK_RATES.length + 1);
      expect(res.stockRates).toContain(0.12);
      // Ensure sorted
      for (let i = 0; i < res.stockRates.length - 1; i++) {
        expect(res.stockRates[i]).toBeLessThan(res.stockRates[i + 1]);
      }
    });

    it('does not inject when stock rate matches existing preset within tolerance', () => {
      // 10.1% is within 0.25% of 10%
      const res = getDynamicSensitivityRates(0.101, 0.05);
      expect(res.isInjectedStock).toBe(false);
      expect(res.stockRates.length).toBe(SENSITIVITY_STOCK_RATES.length);
    });

    it('injects deliberate 0.5% slider steps (e.g. 10.5% stock growth)', () => {
      // 10.5% should be injected as a distinct rate
      const res = getDynamicSensitivityRates(0.105, 0.05);
      expect(res.isInjectedStock).toBe(true);
      expect(res.stockRates).toContain(0.105);
    });

    it('safely handles non-finite inputs (NaN and Infinity) without crashing or sorting corruption', () => {
      const resNaN = getDynamicSensitivityRates(NaN, NaN);
      expect(resNaN.isInjectedStock).toBe(false);
      expect(resNaN.isInjectedProp).toBe(false);
      expect(resNaN.stockRates.length).toBe(SENSITIVITY_STOCK_RATES.length);
      expect(resNaN.propRates.length).toBe(SENSITIVITY_PROP_RATES.length);

      const resInf = getDynamicSensitivityRates(Infinity, -Infinity);
      expect(resInf.isInjectedStock).toBe(false);
      expect(resInf.isInjectedProp).toBe(false);
    });

    it('injects boundary rates outside existing preset range', () => {
      // Rates outside standard range (e.g. +40% stock, -10% property)
      const res = getDynamicSensitivityRates(0.40, -0.10);
      expect(res.isInjectedStock).toBe(true);
      expect(res.isInjectedProp).toBe(true);
      expect(res.stockRates[res.stockRates.length - 1]).toBe(0.40);
      expect(res.propRates[0]).toBe(-0.10);
    });

    it('computes sensitivity matrix with injected rows and columns and evaluates exact breakeven', () => {
      const { stockRates, propRates } = getDynamicSensitivityRates(0.12, 0.04);
      const grid = computeSensitivityMatrix(DEFAULT_CONFIG, 'optimal', stockRates, propRates);
      expect(grid.length).toBe(stockRates.length);
      expect(grid[0].cells.length).toBe(propRates.length);

      const injectedRow = grid.find((r) => r.stockRate === 0.12);
      expect(injectedRow).toBeDefined();

      const injectedCell = injectedRow?.cells.find((c) => c.propRate === 0.04);
      expect(injectedCell).toBeDefined();
      expect(typeof injectedCell?.delta).toBe('number');
      expect(injectedCell?.details?.propertyPriceBuyAsap).toBeDefined();

      // Breakeven should match the exact 0.04 property column with 0 distance
      const breakeven = calculateBreakevenStockRate(grid, 0.04);
      expect(breakeven).not.toBeNull();
      expect(breakeven?.closestPropRate).toBe(0.04);
    });
  });
});
