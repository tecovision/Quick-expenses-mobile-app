import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius } from '../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  name: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  /** `tinted` (accent-colored background, for the primary action in a row),
   *  `surface` (neutral chip, the default for header/back/close buttons),
   *  or `ghost` (no background, for dense rows where a chip would crowd). */
  variant?: 'tinted' | 'surface' | 'ghost';
  size?: number;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A consistently-sized, consistently-shaped tappable icon. Every bare icon
 * that acts as a button (back, close, search, settings, delete…) should go
 * through this instead of a one-off TouchableOpacity — it's what gives every
 * screen the same button language and guarantees a real ≥40dp touch target
 * no matter how small the icon inside it looks.
 */
export function IconButton({
  name, onPress, accessibilityLabel, variant = 'surface', size = 20, color, disabled, style,
}: Props) {
  const iconColor = color ?? (variant === 'tinted' ? colors.accent : colors.textPrimary);
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        variant === 'tinted' && styles.tinted,
        variant === 'surface' && styles.surface,
        disabled && styles.disabled,
        style,
      ]}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={name} size={size} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: { backgroundColor: colors.bgSurface },
  tinted: { backgroundColor: colors.accentSoft },
  disabled: { opacity: 0.4 },
});
