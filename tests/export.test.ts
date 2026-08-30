import { describe, it, expect } from 'vitest';
import { exportConfigToJson, exportMonthlyPointsToCsv } from '../src/engine/export';
import { DEFAULT_CONFIG } from '../src/engine/constants';
import { runSimulation } from '../src/engine/simulation';

describe('Export Service', () => {
  it('exports configuration to formatted JSON string', () => {
    const jsonStr = exportConfigToJson(DEFAULT_CONFIG);
    expect(jsonStr).toBeTypeOf('string');
    const parsed = JSON.parse(jsonStr);
    expect(parsed.meta.stock_symbol).toBe('GOOGL');
    expect(parsed.property.target_price_eur).toBe(1000000);
  });

  it('exports 60-month simulation trajectory to CSV with correct headers and rows', () => {
    const points = runSimulation(DEFAULT_CONFIG);
    const csv = exportMonthlyPointsToCsv(points);

    const lines = csv.split('\n');
    // 1 header line + 61 month data rows (0 to 60)
    expect(lines.length).toBe(62);

    const header = lines[0];
    expect(header).toContain('Month');
    expect(header).toContain('Target Capital Needed (€)');
    expect(header).toContain('Total Liquid Wealth (€)');
    expect(header).toContain('Affordable to Buy');

    // Check row 1 (Month 0)
    const row0 = lines[1].split(',');
    expect(row0[0]).toBe('0'); // Month 0
    expect(row0[1]).toBe('2026-08'); // Date
  });

  it('handles empty data points array gracefully in CSV export', () => {
    const csv = exportMonthlyPointsToCsv([]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(1); // Header only
    expect(lines[0]).toContain('Month');
  });

  it('exports valid JSON and CSV for unaffordable and extreme high-value configurations', () => {
    const extremeConfig = {
      ...DEFAULT_CONFIG,
      property: {
        ...DEFAULT_CONFIG.property,
        target_price_eur: 10000000, // €10M property
      },
    };
    const jsonStr = exportConfigToJson(extremeConfig);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.property.target_price_eur).toBe(10000000);

    const points = runSimulation(extremeConfig);
    const csv = exportMonthlyPointsToCsv(points);
    expect(csv).toContain('NO'); // Affordable to Buy column = NO
  });
});
