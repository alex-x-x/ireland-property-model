import { MonthlyDataPoint, SimulationConfig } from './types';

export function exportConfigToJson(config: SimulationConfig): string {
  return JSON.stringify(config, null, 2);
}

export function downloadJsonFile(filename: string, jsonString: string): void {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportMonthlyPointsToCsv(points: MonthlyDataPoint[]): string {
  const headers = [
    'Month',
    'Date',
    'Property Price (€)',
    'Stamp Duty (€)',
    'Target Capital Needed (€)',
    'Cash (€)',
    'Investments (€)',
    'GSU Pool (€)',
    'Total Liquid Wealth (€)',
    'Surplus / Deficit (€)',
    'Affordable to Buy',
    'Monthly Rent (€)',
    'Cumulative Rent (€)',
    'Stock Price ($)',
    'EUR/USD FX Rate',
    'Max Mortgage (€)',
  ];

  const rows = points.map((p) => [
    p.month,
    p.date,
    Math.round(p.propertyPrice),
    Math.round(p.stampDuty),
    Math.round(p.targetCapital),
    Math.round(p.cash),
    Math.round(p.investments),
    Math.round(p.gsuPool),
    Math.round(p.totalLiquidWealth),
    Math.round(p.surplus),
    p.isAffordable ? 'YES' : 'NO',
    Math.round(p.monthlyRent),
    Math.round(p.cumulativeRent),
    p.stockPriceUsd.toFixed(2),
    p.fxRate.toFixed(4),
    Math.round(p.maxMortgageAvailable),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
