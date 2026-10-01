import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, typography, spacing, radius } from '../constants/theme';

interface Props {
  visible: boolean;
  /** Returns true on success. */
  onUnlock: () => Promise<boolean>;
}

/**
 * Full-screen gate shown whenever the app is locked. Prompts the OS
 * biometric/device-credential dialog automatically each time it appears, and
 * offers a manual retry button for a cancelled or failed attempt.
 */
export function LockScreen({ visible, onUnlock }: Props) {
  const [attempting, setAttempting] = useState(false);
  const autoPromptedRef = useRef(false);

  const tryUnlock = async () => {
    if (attempting) return;
    setAttempting(true);
    try {
      await onUnlock();
    } finally {
      setAttempting(false);
    }
  };

  useEffect(() => {
    if (!visible) {
      autoPromptedRef.current = false;
      return;
    }
    // Auto-prompt once per lock, and only while the app is actually in the
    // foreground (avoids firing the OS dialog while backgrounded/launching).
    if (!autoPromptedRef.current && AppState.currentState === 'active') {
      autoPromptedRef.current = true;
      tryUnlock();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade">
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.badge}>
            <Ionicons name="lock-closed" size={30} color={colors.accent} />
          </View>
          <Text style={styles.title}>QuickExpenses is locked</Text>
          <Text style={styles.subtitle}>Use Face ID or your fingerprint to continue.</Text>

          <TouchableOpacity
            style={styles.btn}
            onPress={tryUnlock}
            activeOpacity={0.85}
            disabled={attempting}
          >
            <Ionicons name="finger-print-outline" size={18} color={colors.white} />
            <Text style={styles.btnText}>{attempting ? 'Checking…' : 'Unlock'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  badge: {
    width: 64, height: 64, borderRadius: radius.xl,
    backgroundColor: '#EAF3FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  btnText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
});
