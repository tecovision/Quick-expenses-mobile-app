import {
  createCalculatorState,
  inputDigit,
  inputDecimal,
  toggleSign,
  inputPercent,
  clearCalculator,
  performOperator,
  equals,
  formatCalculatorDisplay,
  CalculatorState,
} from './calculator';

const digits = (state: CalculatorState, s: string): CalculatorState =>
  [...s].reduce((st, ch) => inputDigit(st, ch), state);

describe('digit entry', () => {
  it('replaces the leading zero', () => {
    const s = inputDigit(createCalculatorState(), '5');
    expect(s.display).toBe('5');
  });

  it('appends subsequent digits', () => {
    const s = digits(createCalculatorState(), '123');
    expect(s.display).toBe('123');
  });

  it('caps the digit count', () => {
    const s = digits(createCalculatorState(), '1'.repeat(20));
    expect(s.display.length).toBeLessThanOrEqual(15);
  });
});

describe('decimal point', () => {
  it('adds a single decimal point', () => {
    const s = inputDecimal(digits(createCalculatorState(), '3'));
    expect(s.display).toBe('3.');
  });

  it('ignores a second decimal point', () => {
    let s = digits(createCalculatorState(), '3');
    s = inputDecimal(s);
    s = inputDecimal(s);
    expect(s.display).toBe('3.');
  });

  it('starts "0." when typed right after an operator', () => {
    let s = digits(createCalculatorState(), '5');
    s = performOperator(s, '+');
    s = inputDecimal(s);
    expect(s.display).toBe('0.');
  });
});

describe('basic arithmetic', () => {
  it('adds two numbers', () => {
    let s = digits(createCalculatorState(), '2');
    s = performOperator(s, '+');
    s = digits(s, '3');
    s = equals(s);
    expect(s.display).toBe('5');
  });

  it('subtracts', () => {
    let s = digits(createCalculatorState(), '10');
    s = performOperator(s, '-');
    s = digits(s, '4');
    s = equals(s);
    expect(s.display).toBe('6');
  });

  it('multiplies', () => {
    let s = digits(createCalculatorState(), '6');
    s = performOperator(s, '×');
    s = digits(s, '7');
    s = equals(s);
    expect(s.display).toBe('42');
  });

  it('divides', () => {
    let s = digits(createCalculatorState(), '9');
    s = performOperator(s, '÷');
    s = digits(s, '2');
    s = equals(s);
    expect(s.display).toBe('4.5');
  });

  it('chains operators without pressing equals in between', () => {
    // 2 + 3 × 4 → sequential (not order-of-operations): (2+3)=5, 5×4=20
    let s = digits(createCalculatorState(), '2');
    s = performOperator(s, '+');
    s = digits(s, '3');
    s = performOperator(s, '×');
    s = digits(s, '4');
    s = equals(s);
    expect(s.display).toBe('20');
  });

  it('swaps a just-pressed operator instead of computing early', () => {
    let s = digits(createCalculatorState(), '5');
    s = performOperator(s, '+');
    s = performOperator(s, '×'); // changed their mind before typing the next number
    s = digits(s, '3');
    s = equals(s);
    expect(s.display).toBe('15');
  });

  it('trims binary float noise', () => {
    let s = digits(createCalculatorState(), '0');
    s = inputDecimal(s);
    s = digits(s, '1');
    s = performOperator(s, '+');
    s = digits(s, '0');
    s = inputDecimal(s);
    s = digits(s, '2');
    s = equals(s);
    expect(s.display).toBe('0.3');
  });
});

describe('divide by zero', () => {
  it('shows Error and recovers on the next digit', () => {
    let s = digits(createCalculatorState(), '5');
    s = performOperator(s, '÷');
    s = digits(s, '0');
    s = equals(s);
    expect(s.display).toBe('Error');

    s = inputDigit(s, '7');
    expect(s.display).toBe('7');
  });

  it('ignores further operators while in Error state', () => {
    let s = digits(createCalculatorState(), '5');
    s = performOperator(s, '÷');
    s = digits(s, '0');
    s = equals(s);
    s = performOperator(s, '+');
    expect(s.display).toBe('Error');
  });
});

describe('toggleSign / percent / clear', () => {
  it('toggles the sign', () => {
    let s = digits(createCalculatorState(), '5');
    s = toggleSign(s);
    expect(s.display).toBe('-5');
    s = toggleSign(s);
    expect(s.display).toBe('5');
  });

  it('does nothing to a bare zero', () => {
    const s = toggleSign(createCalculatorState());
    expect(s.display).toBe('0');
  });

  it('converts to a percentage', () => {
    const s = inputPercent(digits(createCalculatorState(), '50'));
    expect(s.display).toBe('0.5');
  });

  it('clear resets to the initial state', () => {
    let s = digits(createCalculatorState(), '123');
    s = performOperator(s, '+');
    s = clearCalculator();
    expect(s).toEqual(createCalculatorState());
  });
});

describe('createCalculatorState seeding', () => {
  it('seeds the display from a valid numeric string', () => {
    expect(createCalculatorState('45.5').display).toBe('45.5');
  });

  it('falls back to "0" for an empty, negative, or non-numeric seed', () => {
    expect(createCalculatorState('').display).toBe('0');
    expect(createCalculatorState('-5').display).toBe('0');
    expect(createCalculatorState('abc').display).toBe('0');
    expect(createCalculatorState(undefined).display).toBe('0');
  });
});

describe('formatCalculatorDisplay', () => {
  it('comma-groups the integer part', () => {
    expect(formatCalculatorDisplay('12345.6')).toBe('12,345.6');
    expect(formatCalculatorDisplay('1000')).toBe('1,000');
  });

  it('keeps the sign and passes Error through unchanged', () => {
    expect(formatCalculatorDisplay('-200')).toBe('-200');
    expect(formatCalculatorDisplay('Error')).toBe('Error');
  });
});
