import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ExpenseFile } from '../types';
import { colors, typography, spacing, radius, shadows } from '../constants/theme';
import { fileTotal } from '../utils/helpers';
import { useStore } from '../store/useStore';
import { useCurrency } from '../hooks/useCurrency';
import { IconButton } from './IconButton';

interface Props {
  file: ExpenseFile;
}

const DELETE_W = 84;

export function FileCard({ file }: Props) {
  const deleteFile = useStore((s) => s.deleteFile);
  const { formatAmount } = useCurrency();
  const total = fileTotal(file.expenses);

  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const close = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    isOpen.current = false;
  }, [translateX]);

  const handleDelete = () => {
    Alert.alert('Delete File', `Delete "${file.name}" and all its expenses?`, [
      { text: 'Cancel', style: 'cancel', onPress: close },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          close();
          deleteFile(file.id);
        },
      },
    ]);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        const base = isOpen.current ? -DELETE_W : 0;
        translateX.setValue(Math.max(Math.min(base + g.dx, 0), -DELETE_W));
      },
      onPanResponderRelease: (_, g) => {
        const base = isOpen.current ? -DELETE_W : 0;
        const end = base + g.dx;
        if (end < -DELETE_W / 2) {
          Animated.spring(translateX, { toValue: -DELETE_W, useNativeDriver: true }).start();
          isOpen.current = true;
        } else {
          close();
        }
      },
    })
  ).current;

  return (
    <View style={styles.swipeContainer}>
      {/* Reveal target — sits behind the card */}
      <TouchableOpacity style={styles.deleteAction} onPress={handleDelete} activeOpacity={0.85}>
        <Ionicons name="trash" size={20} color={colors.white} />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>

      <Animated.View
        style={[styles.cardWrapper, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => {
            if (isOpen.current) {
              close();
              return;
            }
            router.push(`/file/${file.id}`);
          }}
          onLongPress={() => {
            Alert.alert(file.name, undefined, [
              { text: 'Open', onPress: () => router.push(`/file/${file.id}`) },
              { text: 'Delete', style: 'destructive', onPress: handleDelete },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
          delayLongPress={400}
          activeOpacity={0.7}
        >
          <View style={styles.left}>
            <View style={styles.iconWrap}>
              <Ionicons name="document-text-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.meta}>
                {file.expenses.length} expense{file.expenses.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={styles.right}>
            <Text style={styles.total}>{formatAmount(total)}</Text>
            <IconButton
              name="trash-outline"
              onPress={handleDelete}
              variant="ghost"
              size={16}
              color={colors.danger}
              accessibilityLabel={`Delete ${file.name}`}
              style={styles.deleteIconBtn}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  deleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_W,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  deleteActionText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.white,
    letterSpacing: 0.3,
  },
  cardWrapper: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.base,
    ...shadows.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  name: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  total: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  deleteIconBtn: { width: 28, height: 28 },
});
