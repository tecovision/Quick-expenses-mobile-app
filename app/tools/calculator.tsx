import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, typography, spacing, layout } from '@/constants/theme';
import { IconButton } from '@/components/IconButton';
import { CalculatorPad } from '@/components/CalculatorPad';
import { CalculatorState, createCalculatorState, formatCalculatorDisplay } from '@/utils/calculator';

export default function CalculatorScreen() {
  const [state, setState] = useState<CalculatorState>(createCalculatorState());

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.title}>Calculator</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Display */}
      <View style={[styles.displayWrap, layout.content]}>
        {state.operator && (
          <Text style={styles.pending}>
            {formatCalculatorDisplay(String(state.storedValue))} {state.operator}
          </Text>
        )}
        <Text
          style={styles.display}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
        >
          {formatCalculatorDisplay(state.display)}
        </Text>
      </View>

      {/* Keypad */}
      <View style={[styles.keypadWrap, layout.content]}>
        <CalculatorPad state={state} onChange={setState} />
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

  keypadWrap: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
});
