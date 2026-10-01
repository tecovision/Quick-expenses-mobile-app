import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, typography, spacing, radius } from '../constants/theme';
import { biometricLabel } from '../services/biometric';

interface Props {
  visible: boolean;
  onEnable: () => Promise<boolean>;
  onDismiss: () => void;
}

/**
 * One-time offer (not a system push notification — biometric enrollment can
 * only happen through an in-app prompt) shown once, after the first-run
 * privacy notice, on devices that have Face ID / fingerprint set up.
 */
export function BiometricPrompt({ visible, onEnable, onDismiss }: Props) {
  const [label, setLabel] = useState('Face ID / Fingerprint');
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (visible) biometricLabel().then(setLabel);
  }, [visible]);

  const handleEnable = async () => {
    setEnabling(true);
    const ok = await onEnable();
    setEnabling(false);
    if (!ok) {
      // Cancelled or failed — leave the prompt up so they can retry, rather
      // than silently treating a mis-tap as "no thanks".
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.dialog}>
            <View style={styles.badge}>
              <Ionicons name="finger-print-outline" size={28} color={colors.accent} />
            </View>
            <Text style={styles.title}>Lock the app with {label}?</Text>
            <Text style={styles.subtitle}>
              Add a quick lock screen so only you can open QuickExpenses. Handled entirely by
              your phone — we never see or store your {label.toLowerCase()} data.
            </Text>

            <TouchableOpacity
              style={styles.enableBtn}
              onPress={handleEnable}
              activeOpacity={0.85}
              disabled={enabling}
            >
              <Text style={styles.enableText}>{enabling ? 'Confirming…' : `Enable ${label}`}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.notNowBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.notNowText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  safe: { width: '100%', maxWidth: 400 },
  dialog: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  badge: {
    width: 56, height: 56, borderRadius: radius.lg,
    backgroundColor: '#EAF3FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  enableBtn: {
    alignSelf: 'stretch',
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  enableText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  notNowBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  notNowText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
  },
});
