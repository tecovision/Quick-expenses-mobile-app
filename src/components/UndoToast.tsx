import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors, typography, spacing, radius } from '../constants/theme';

interface Props {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  /** How long to show the toast before auto-dismissing (ms). Default 5000. */
  duration?: number;
}

export function UndoToast({ visible, message, onUndo, onDismiss, duration = 5000 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      // Reset and animate in
      progress.setValue(1);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.timing(progress, { toValue: 0, duration, useNativeDriver: false }).start();

      timerRef.current = setTimeout(() => onDismiss(), duration);
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
      if (timerRef.current) clearTimeout(timerRef.current);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {/* Progress bar */}
      <Animated.View
        style={[
          styles.progressBar,
          { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
        ]}
      />
      <View style={styles.row}>
        <Text style={styles.message} numberOfLines={1}>{message}</Text>
        <TouchableOpacity
          style={styles.undoBtn}
          onPress={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            onUndo();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.undoText}>Undo</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: radius.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.white,
    opacity: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  message: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.white,
    marginRight: spacing.md,
  },
  undoBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  undoText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
});
