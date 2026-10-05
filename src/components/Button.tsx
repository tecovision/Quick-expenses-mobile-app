import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, typography, spacing, radius, shadows } from '../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  title: string;
  onPress: () => void;
  /** `primary` — the one main action on screen, dark pill with a soft shadow
   *  so it visibly "lifts" off the page. `secondary` — a paired action next
   *  to a primary one (e.g. Cancel). `danger` — a destructive confirmation. */
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one button shape every "main action" in the app should use — new file,
 * save expense, continue, enable, unlock, delete-confirm. Consistent height,
 * radius, and (for primary) elevation, so CTAs read the same everywhere
 * instead of each screen inventing its own button.
 */
export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, style }: Props) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.base,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        isDanger && styles.danger,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary || isDanger ? colors.white : colors.textPrimary} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={17}
              color={isPrimary || isDanger ? colors.white : colors.textPrimary}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              (isPrimary || isDanger) && styles.textOnDark,
              variant === 'secondary' && styles.textSecondary,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
  },
  primary: {
    backgroundColor: colors.textPrimary,
    ...shadows.md,
  },
  secondary: {
    backgroundColor: colors.bgSurface,
  },
  danger: {
    backgroundColor: colors.danger,
    ...shadows.md,
  },
  disabled: { opacity: 0.5, shadowOpacity: 0, elevation: 0 },
  icon: { marginRight: spacing.sm },
  text: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  textOnDark: { color: colors.white },
  textSecondary: { color: colors.textMuted },
});
