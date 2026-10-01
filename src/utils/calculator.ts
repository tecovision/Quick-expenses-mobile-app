/**
 * Pure calculator engine — no eval(), no component state. A classic
 * "one pending operator" calculator: digit entry builds the display string,
 * an operator stores the left-hand operand and waits for the right-hand
 * side, and = (or the next operator) resolves it.
 */

export type Operator = '+' | '-' | '×' | '÷';

export interface CalculatorState {
  display: string;
  storedValue: number | null;
  operator: Operator | null;
  /** True right after an operator or "=" — the next digit starts fresh. */
  waitingForOperand: boolean;
}

/** Caps how many digits the display can grow to (sign and "." excluded). */
const MAX_DIGITS = 15;

export function createCalculatorState(): CalculatorState {
  return { display: '0', storedValue: null, operator: null, waitingForOperand: false };
}

const isError = (state: CalculatorState): boolean => state.display === 'Error';

function compute(a: number, b: number, op: Operator): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? NaN : a / b;
  }
}

/** Trims binary float noise and renders a finite result, or "Error". */
function formatResult(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  const rounded = Math.round((n + Number.EPSILON) * 1e9) / 1e9;
  return String(rounded);
}

export function inputDigit(state: CalculatorState, digit: string): CalculatorState {
  if (state.waitingForOperand || isError(state)) {
    return { ...state, display: digit, waitingForOperand: false };
  }
  if (state.display === '0') return { ...state, display: digit };
  if (state.display.replace(/[-.]/g, '').length >= MAX_DIGITS) return state;
  return { ...state, display: state.display + digit };
}

export function inputDecimal(state: CalculatorState): CalculatorState {
  if (state.waitingForOperand || isError(state)) {
    return { ...state, display: '0.', waitingForOperand: false };
  }
  if (state.display.includes('.')) return state;
  return { ...state, display: state.display + '.' };
}

export function toggleSign(state: CalculatorState): CalculatorState {
  if (isError(state) || state.display === '0') return state;
  return {
    ...state,
    display: state.display.startsWith('-') ? state.display.slice(1) : `-${state.display}`,
  };
}

export function inputPercent(state: CalculatorState): CalculatorState {
  if (isError(state)) return state;
  return { ...state, display: formatResult(parseFloat(state.display) / 100) };
}

export function clearCalculator(): CalculatorState {
  return createCalculatorState();
}

export function performOperator(state: CalculatorState, nextOperator: Operator): CalculatorState {
  if (isError(state)) return state;
  const inputValue = parseFloat(state.display);

  if (state.storedValue === null) {
    return { display: state.display, storedValue: inputValue, operator: nextOperator, waitingForOperand: true };
  }
  if (state.waitingForOperand) {
    // Operator pressed again before a new digit — just swap which one is pending.
    return { ...state, operator: nextOperator };
  }

  const result = compute(state.storedValue, inputValue, state.operator as Operator);
  return {
    display: formatResult(result),
    storedValue: Number.isFinite(result) ? result : null,
    operator: Number.isFinite(result) ? nextOperator : null,
    waitingForOperand: true,
  };
}

export function equals(state: CalculatorState): CalculatorState {
  if (isError(state) || state.operator === null || state.storedValue === null) return state;
  const inputValue = parseFloat(state.display);
  const result = compute(state.storedValue, inputValue, state.operator);
  return {
    display: formatResult(result),
    storedValue: null,
    operator: null,
    waitingForOperand: true,
  };
}
