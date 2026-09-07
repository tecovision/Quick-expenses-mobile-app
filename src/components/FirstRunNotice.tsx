import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Linking, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, typography, spacing, radius } from '../constants/theme';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../constants/legal';

interface Props {
  visible: boolean;
  onAccept: () => void;
}

const POINTS: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'phone-portrait-outline', text: 'Everything you enter stays on this device. No account, no cloud, no sign-in.' },
  { icon: 'cloud-offline-outline',  text: 'The app works fully offline and sends nothing about you anywhere.' },
  { icon: 'download-outline',       text: 'Uninstalling erases your data — use Download or Export to keep a copy.' },
];

export function FirstRunNotice({ visible, onAccept }: Props) {
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onAccept}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.badge}>
            <Ionicons name="lock-closed-outline" size={26} color={colors.accent} />
          </View>
          <Text style={styles.title}>Your data stays with you</Text>
          <Text style={styles.subtitle}>A quick note before you start.</Text>

          <View style={styles.points}>
            {POINTS.map((p) => (
              <View key={p.icon} style={styles.point}>
                <Ionicons name={p.icon} size={20} color={colors.textMuted} style={styles.pointIcon} />
                <Text style={styles.pointText}>{p.text}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.legal}>
            By continuing you agree to the{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>Terms of Use</Text>
            {' '}and{' '}
            <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>Privacy Policy</Text>.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.btn} onPress={onAccept} activeOpacity={0.85}>
            <Text style={styles.btnText}>Got it — let's go</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  badge: {
    width: 56, height: 56, borderRadius: radius.lg,
    backgroundColor: '#EAF3FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  points: { gap: spacing.lg },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pointIcon: { marginTop: 1 },
  pointText: {
    flex: 1,
    fontSize: typography.sizes.base,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  legal: {
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: spacing.xl,
  },
  link: { color: colors.accent, fontWeight: typography.weights.medium },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  btn: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
});
