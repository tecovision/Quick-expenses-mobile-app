import {
  parseAmount,
  MAX_EXPENSE_AMOUNT,
  fileTotal,
  formatCurrency,
  uid,
} from './helpers';

describe('parseAmount', () => {
  it('accepts plain positive numbers', () => {
    expect(parseAmount('10')).toBe(10);
    expect(parseAmount('0.01')).toBe(0.01);
    expect(parseAmount('1234.56')).toBe(1234.56);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseAmount('  42  ')).toBe(42);
  });

  it('rejects empty and non-numeric input', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('   ')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('12abc')).toBeNull();
  });

  it('rejects zero and negatives', () => {
    expect(parseAmount('0')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
  });

  it('rejects non-finite values', () => {
    // Number('1e999') === Infinity — this used to slip through and poison totals
    expect(parseAmount('1e999')).toBeNull();
    expect(parseAmount('Infinity')).toBeNull();
    expect(parseAmount('NaN')).toBeNull();
  });

  it('enforces the upper bound', () => {
    expect(parseAmount(String(MAX_EXPENSE_AMOUNT))).toBe(MAX_EXPENSE_AMOUNT);
    expect(parseAmount(String(MAX_EXPENSE_AMOUNT + 1))).toBeNull();
  });
});

describe('fileTotal', () => {
  it('sums amounts', () => {
    expect(fileTotal([{ amount: 1 }, { amount: 2.5 }, { amount: 3 }])).toBe(6.5);
  });

  it('returns 0 for an empty list', () => {
    expect(fileTotal([])).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('formats with the given symbol and two decimals', () => {
    const out = formatCurrency(1234.5, { symbol: '$', locale: 'en-US' });
    expect(out).toBe('$1,234.50');
  });

  it('defaults to the rupee symbol when no currency is given', () => {
    expect(formatCurrency(5)).toContain('₹');
  });

  it('falls back gracefully on an invalid locale', () => {
    const out = formatCurrency(5, { symbol: '$', locale: 'not-a-locale' });
    expect(out).toContain('5');
    expect(out).toContain('$');
  });
});

describe('uid', () => {
  it('produces unique values across many calls', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uid()));
    expect(ids.size).toBe(1000);
  });
});
