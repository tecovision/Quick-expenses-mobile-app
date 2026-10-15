import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../constants/theme';
import { IconButton } from './IconButton';
import { Button } from './Button';
import { CalculatorPad } from './CalculatorPad';
import { CalculatorState, createCalculatorState, formatCalculatorDisplay } from '../utils/calculator';

interface Props {
  visible: boolean;
  /** Current amount field text, if any — the calculator opens with it
   *  already on the display so the user can carry on from where they left off. */
  initialValue?: string;
  onUse: (value: number) => void;
  onClose: () => void;
}

/**
 * The same calculator, offered right from an expense entry's amount field
 * instead of making the user leave to the standalone Calculator tool and
 * copy a number back in by hand.
 */
export function CalculatorSheet({ visible, initialValue, onUse, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<CalculatorState>(createCalculatorState());

  // Re-seed every time it's opened, not on every keystroke in the sheet.
  useEffect(() => {
    if (visible) setState(createCalculatorState(initialValue));
  }, [visible]);

  const parsed = parseFloat(state.display);
  const valid = state.display !== 'Error' && Number.isFinite(parsed) && parsed > 0;

  const handleUse = () => {
    if (!valid) return;
    onUse(parsed);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + spacing.sm }]}>
          <Text style={styles.title}>Calculator</Text>
          <IconButton name="close" onPress={onClose} accessibilityLabel="Close calculator" />
        </View>

        <View style={styles.displayWrap}>
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

        <View style={styles.padWrap}>
          <CalculatorPad state={state} onChange={setState} compact />
        </View>

        <View style={styles.footer}>
          <Button
            title="Use This Amount"
            onPress={handleUse}
            disabled={!valid}
            icon="checkmark"
          />
        </View>
      </SafeAreaView>
    </Modal>
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
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  pending: {
    fontSize: typography.sizes.base,
    color: colors.textMuted,
    marginBottom: 2,
  },
  display: {
    fontSize: 44,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    letterSpacing: -1,
  },

  padWrap: { flex: 1, paddingHorizontal: spacing.base, justifyContent: 'flex-end' },

  footer: { padding: spacing.base },
});
