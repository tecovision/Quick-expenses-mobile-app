/**
 * Rough, static starting points for 1 USD → currency, used only to seed the
 * Currency Converter's rate field with something more useful than "1" the
 * first time someone picks a currency pair.
 *
 * QuickExpenses is fully offline and never calls a live rates API — these
 * numbers WILL drift from reality over time. The converter always shows the
 * rate as a plain editable field so the user can correct it; nothing here is
 * presented as live or authoritative.
 */
export const APPROX_USD_RATES: Record<string, number> = {
  USD: 1,
  INR: 83,
  EUR: 0.92,
  GBP: 0.78,
  AED: 3.67,
  SAR: 3.75,
  JPY: 150,
  CNY: 7.2,
  AUD: 1.52,
  CAD: 1.36,
  SGD: 1.34,
  HKD: 7.82,
  KRW: 1320,
  CHF: 0.88,
  MYR: 4.7,
  IDR: 15600,
  THB: 35.5,
  PHP: 56.5,
  PKR: 278,
  BDT: 110,
  NZD: 1.64,
  BRL: 4.95,
  MXN: 17,
  ZAR: 18.7,
  NGN: 1550,
  TRY: 32.5,
  RUB: 92,
  NOK: 10.6,
  SEK: 10.4,
  DKK: 6.85,
};

/** 1 `from` in terms of `to`, derived from the USD table above. */
export function approxRate(from: string, to: string): number {
  const f = APPROX_USD_RATES[from] ?? 1;
  const t = APPROX_USD_RATES[to] ?? 1;
  return t / f;
}
