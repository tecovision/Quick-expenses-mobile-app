import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, typography, spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Page not found</Text>
      <Text style={styles.subtitle}>This screen doesn't exist.</Text>
      <TouchableOpacity onPress={() => router.replace('/')} style={styles.btn}>
        <Text style={styles.btnText}>Go to Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.base,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  btn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.textPrimary,
    borderRadius: 99,
  },
  btnText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
});
