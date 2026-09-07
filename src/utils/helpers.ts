import { Currency } from '../types';

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Upper bound for a single expense — keeps totals, exports and layouts sane. */
export const MAX_EXPENSE_AMOUNT = 999_999_999_999;

// Caps on free-text fields. Not a security boundary (this is a local,
// single-user, offline app) — these guard against an accidental huge paste
// bloating AsyncStorage and slowing down PDF/CSV export rendering.
export const MAX_FILE_NAME_LENGTH = 100;
export const MAX_PARTICULAR_LENGTH = 200;
export const MAX_NOTE_LENGTH = 1000;

/**
 * Round a money value to 2 decimal places using "round half away from zero"
 * (so 100.005 → 100.01, matching what users see on screen). The epsilon
 * nudge corrects binary-float representation error before rounding.
 */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Parse user-entered amount text. Returns the value rounded to 2 decimal
 * places, or null when the input is not a positive finite number within
 * MAX_EXPENSE_AMOUNT (rejects "", "abc", "1e99" → Infinity, negatives, and
 * anything that rounds to zero such as "0" or "0.004").
 *
 * Rounding at the point of entry is what keeps the stored value, the
 * on-screen amount, and the PDF/CSV export all showing the same number.
 */
export function parseAmount(text: string): number | null {
  const value = Number(text.trim());
  if (!Number.isFinite(value) || value <= 0 || value > MAX_EXPENSE_AMOUNT) return null;
  const rounded = roundMoney(value);
  if (rounded <= 0) return null;
  return rounded;
}

export function formatCurrency(
  amount: number,
  currency?: Pick<Currency, 'symbol' | 'locale'>,
): string {
  const sym = currency?.symbol ?? '₹';
  const loc = currency?.locale ?? 'en-IN';
  try {
    return `${sym}${amount.toLocaleString(loc, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } catch {
    return `${sym}${amount.toFixed(2)}`;
  }
}

export function fileTotal(expenses: { amount: number }[]): number {
  // Round the running sum so accumulated float drift (0.1 + 0.2 …) never
  // leaks a third decimal into totals shown on screen or written to exports.
  return roundMoney(expenses.reduce((sum, e) => sum + e.amount, 0));
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  const date = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${date}, ${time}`;
}

/** "20:00" → "8:00 PM". Hour is 0–23, minute 0–59. */
export function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function timeAgo(isoString: string): string {
  const days = Math.floor((Date.now() - new Date(isoString).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return formatDate(isoString);
}
