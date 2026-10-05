import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, typography, spacing, radius, shadows } from '@/constants/theme';
import { IconButton } from '@/components/IconButton';
import {
  CalculatorState,
  Operator,
  createCalculatorState,
  inputDigit,
  inputDecimal,
  toggleSign,
  inputPercent,
  clearCalculator,
  performOperator,
  equals,
} from '@/utils/calculator';

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

function formatDisplay(display: string): string {
  if (display === 'Error') return 'Error';
  const [intPart, decPart] = display.replace('-', '').split('.');
  const grouped = Number(intPart).toLocaleString('en-US');
  const sign = display.startsWith('-') ? '-' : '';
  return decPart !== undefined ? `${sign}${grouped}.${decPart}` : `${sign}${grouped}`;
}

export default function CalculatorScreen() {
  const [state, setState] = useState<CalculatorState>(createCalculatorState());

  const press = (key: Key) => {
    switch (key.kind) {
      case 'digit':    return setState(s => inputDigit(s, key.label));
      case 'decimal':  return setState(s => inputDecimal(s));
      case 'clear':    return setState(clearCalculator());
      case 'sign':     return setState(s => toggleSign(s));
      case 'percent':  return setState(s => inputPercent(s));
      case 'operator': return setState(s => performOperator(s, key.op));
      case 'equals':   return setState(s => equals(s));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.title}>Calculator</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Display */}
      <View style={styles.displayWrap}>
        {state.operator && (
          <Text style={styles.pending}>
            {formatDisplay(String(state.storedValue))} {state.operator}
          </Text>
        )}
        <Text
          style={styles.display}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
        >
          {formatDisplay(state.display)}
        </Text>
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
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
                    wide && styles.keyWide,
                    isOperator && styles.keyOperator,
                    isFunction && styles.keyFunction,
                  ]}
                  onPress={() => press(key)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={keyLabel(key)}
                >
                  <Text style={[styles.keyText, isOperator && styles.keyTextOperator]}>
                    {keyLabel(key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },

  displayWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  pending: {
    fontSize: typography.sizes.lg,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  display: {
    fontSize: 56,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    letterSpacing: -1,
  },

  keypad: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
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
  keyTextOperator: {
    color: colors.white,
    fontWeight: typography.weights.semibold,
  },
});
