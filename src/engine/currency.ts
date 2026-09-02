/**
 * Currency Conversion and Macro Drift Utilities
 *
 * In the model, config.macro.eur_usd_spot represents the spot exchange rate
 * expressed as EUR per USD (e.g. 0.90 EUR per $1 USD).
 * Market convention (EUR/USD) quotes this as USD per EUR (e.g. 1 / 0.90 = $1.1111).
 *
 * The model applies continuous yearly compounding:
 *   EUR_per_USD(m) = spotEurPerUsd * (1 + drift)^(m / 12)
 *
 * Therefore, in market quote terms (USD per EUR):
 *   USD_per_EUR(m) = (1 / spotEurPerUsd) / (1 + drift)^(m / 12)
 */

export interface FxMilestones {
  now: number;
  year1: number;
  year2: number;
  year3: number;
  year4: number;
  year5: number;
}

/**
 * Converts a target exchange rate (USD per 1 EUR) into the implied annual drift.
 *
 * @param targetRateUsdPerEur Target rate in USD per EUR (e.g. 1.20)
 * @param spotEurPerUsd Base spot rate in EUR per USD (e.g. 0.90)
 * @param years Number of projection years (defaults to 5)
 */
export function targetFxToYearlyDrift(
  targetRateUsdPerEur: number,
  spotEurPerUsd: number,
  years: number = 5
): number {
  if (targetRateUsdPerEur <= 0 || spotEurPerUsd <= 0 || years <= 0) return 0;
  const spotUsdPerEur = 1 / spotEurPerUsd;
  return Math.pow(spotUsdPerEur / targetRateUsdPerEur, 1 / years) - 1;
}

/**
 * Converts an annual drift percentage into the projected target rate (USD per 1 EUR).
 *
 * @param yearlyDrift Annual drift (e.g. -0.015 for -1.5%/yr)
 * @param spotEurPerUsd Base spot rate in EUR per USD (e.g. 0.90)
 * @param years Number of projection years (defaults to 5)
 */
export function yearlyDriftToTargetFx(
  yearlyDrift: number,
  spotEurPerUsd: number,
  years: number = 5
): number {
  if (spotEurPerUsd <= 0) return 0;
  const spotUsdPerEur = 1 / spotEurPerUsd;
  const mult = Math.pow(1 + yearlyDrift, years);
  if (mult <= 0) return 0;
  return spotUsdPerEur / mult;
}

/**
 * Computes milestone exchange rates (USD per 1 EUR) for Years 0 through 5.
 */
export function getFxMilestones(
  yearlyDrift: number,
  spotEurPerUsd: number
): FxMilestones {
  const spotUsdPerEur = spotEurPerUsd > 0 ? 1 / spotEurPerUsd : 0;
  const calcAtYear = (y: number) => {
    const mult = Math.pow(1 + yearlyDrift, y);
    return mult > 0 ? spotUsdPerEur / mult : spotUsdPerEur;
  };

  return {
    now: spotUsdPerEur,
    year1: calcAtYear(1),
    year2: calcAtYear(2),
    year3: calcAtYear(3),
    year4: calcAtYear(4),
    year5: calcAtYear(5),
  };
}
