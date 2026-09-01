import { describe, it, expect } from 'vitest';
import { computeSensitivityMatrix, SENSITIVITY_STOCK_RATES, SENSITIVITY_PROP_RATES } from '../src/engine/sensitivity';
import { DEFAULT_CONFIG } from '../src/engine/constants';

describe('Sensitivity Matrix Engine', () => {
  it('computes 55 permutations correctly for default config at M60', () => {
    const grid = computeSensitivityMatrix(DEFAULT_CONFIG, 60);
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
    const grid = computeSensitivityMatrix(DEFAULT_CONFIG, 60);
    // At +30% stock growth and 0% property growth, waiting to compound should strongly win
    const highStockRow = grid.find((r) => r.stockRate === 0.30);
    expect(highStockRow).toBeDefined();
    const flatPropCell = highStockRow?.cells.find((c) => c.propRate === 0.00);
    expect(flatPropCell?.winner).toBe('wait_and_compound');
    expect(flatPropCell?.delta).toBeGreaterThan(50000);
  });

  it('handles custom comparison horizons (e.g. Month 12)', () => {
    const gridM12 = computeSensitivityMatrix(DEFAULT_CONFIG, 12);
    expect(gridM12.length).toBe(11);
    expect(gridM12[0].cells.length).toBe(5);
  });
});
