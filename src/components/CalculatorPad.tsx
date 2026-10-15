import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../constants/theme';
import {
  CalculatorState,
  Operator,
  inputDigit,
  inputDecimal,
  toggleSign,
  inputPercent,
  clearCalculator,
  performOperator,
  equals,
} from '../utils/calculator';

type Key =
  | { kind: 'digit'; label: string }
  | { kind: 'decimal' }
  | { kind: 'clear' }
  | { kind: 'sign' }
  | { kind: 'percent' }
  | { kind: 'operator'; op: Operator }
  | { kind: 'equals' };

const ROWS: Key[][] = [
  [{ kind: 'clear' }, { kind: 'sign' }, { kind: 'percent' }, { kind: 'operator', op: '÷' }],
  [{ kind: 'digit', label: '7' }, { kind: 'digit', label: '8' }, { kind: 'digit', label: '9' }, { kind: 'operator', op: '×' }],
  [{ kind: 'digit', label: '4' }, { kind: 'digit', label: '5' }, { kind: 'digit', label: '6' }, { kind: 'operator', op: '-' }],
  [{ kind: 'digit', label: '1' }, { kind: 'digit', label: '2' }, { kind: 'digit', label: '3' }, { kind: 'operator', op: '+' }],
  [{ kind: 'digit', label: '0' }, { kind: 'decimal' }, { kind: 'equals' }],
];

function keyLabel(key: Key): string {
  switch (key.kind) {
    case 'digit':   return key.label;
    case 'decimal': return '.';
    case 'clear':   return 'C';
    case 'sign':    return '±';
    case 'percent': return '%';
    case 'operator': return key.op;
    case 'equals':  return '=';
  }
}

interface Props {
  state: CalculatorState;
  onChange: (next: CalculatorState) => void;
  /** Smaller keys for embedding somewhere other than the full Calculator screen. */
  compact?: boolean;
}

/**
 * The calculator keypad only — digit grid, operators, clear/sign/percent.
 * A controlled component: owns no state itself, just maps presses through
 * the pure functions in utils/calculator.ts. Used by both the standalone
 * Calculator tool and the inline calculator offered from an expense entry.
 */
export function CalculatorPad({ state, onChange, compact }: Props) {
  const press = (key: Key) => {
    switch (key.kind) {
      case 'digit':    return onChange(inputDigit(state, key.label));
      case 'decimal':  return onChange(inputDecimal(state));
      case 'clear':    return onChange(clearCalculator());
      case 'sign':     return onChange(toggleSign(state));
      case 'percent':  return onChange(inputPercent(state));
      case 'operator': return onChange(performOperator(state, key.op));
      case 'equals':   return onChange(equals(state));
    }
  };

  return (
    <View style={[styles.keypad, compact && styles.keypadCompact]}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((key, j) => {
            const wide = key.kind === 'digit' && key.label === '0';
            const isOperator = key.kind === 'operator' || key.kind === 'equals';
            const isFunction = key.kind === 'clear' || key.kind === 'sign' || key.kind === 'percent';
            return (
              <TouchableOpacity
                key={j}
                style={[
                  styles.key,
                  compact && styles.keyCompact,
                  wide && styles.keyWide,
                  isOperator && styles.keyOperator,
                  isFunction && styles.keyFunction,
                ]}
                onPress={() => press(key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={keyLabel(key)}
              >
                <Text style={[
                  styles.keyText,
                  compact && styles.keyTextCompact,
                  isOperator && styles.keyTextOperator,
                ]}>
                  {keyLabel(key)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  keypad: { gap: spacing.sm },
  keypadCompact: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  key: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyCompact: { borderRadius: radius.md },
  keyWide: {
    flex: 2.08,
    aspectRatio: undefined,
    paddingVertical: spacing.lg,
    alignItems: 'flex-start',
    paddingLeft: spacing.xl,
  },
  keyOperator: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    ...shadows.sm,
  },
  keyFunction: {
    backgroundColor: colors.bgSurface,
  },
  keyText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  keyTextCompact: { fontSize: typography.sizes.md },
  keyTextOperator: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
});
