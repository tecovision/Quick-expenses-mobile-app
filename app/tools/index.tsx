import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, typography, spacing, radius } from '@/constants/theme';

const TOOLS: {
  href: '/tools/converter' | '/tools/calculator' | '/tools/todo' | '/tools/notes';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  tint: string;
}[] = [
  {
    href: '/tools/converter',
    icon: 'swap-horizontal-outline',
    title: 'Currency Converter',
    subtitle: 'Convert between two currencies',
    tint: '#EAF3FF',
  },
  {
    href: '/tools/calculator',
    icon: 'calculator-outline',
    title: 'Calculator',
    subtitle: 'Quick arithmetic',
    tint: '#F3EEFF',
  },
  {
    href: '/tools/todo',
    icon: 'checkbox-outline',
    title: 'To-Do List',
    subtitle: 'Keep track of tasks',
    tint: '#EAFBF1',
  },
  {
    href: '/tools/notes',
    icon: 'document-text-outline',
    title: 'Notepad',
    subtitle: 'Jot down anything',
    tint: '#FFF7E6',
  },
];

export default function ToolsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Tools</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.grid}>
        {TOOLS.map((t) => (
          <TouchableOpacity
            key={t.href}
            style={styles.card}
            onPress={() => router.push(t.href)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconWrap, { backgroundColor: t.tint }]}>
              <Ionicons name={t.icon} size={24} color={colors.accent} />
            </View>
            <Text style={styles.cardTitle}>{t.title}</Text>
            <Text style={styles.cardSubtitle}>{t.subtitle}</Text>
          </TouchableOpacity>
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
  backBtn: { padding: spacing.xs },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.base,
  },
  card: {
    width: '47%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
});
