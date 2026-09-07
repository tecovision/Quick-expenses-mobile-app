import React, { useMemo, useRef } from 'react';
import {
  View, Text, Modal, FlatList,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../constants/theme';
import { formatTime } from '../utils/helpers';

interface Props {
  visible: boolean;
  hour: number;
  minute: number;
  onSelect: (hour: number, minute: number) => void;
  onClose: () => void;
}

interface Slot { hour: number; minute: number; label: string; }

// Every half hour, 00:00 → 23:30.
const SLOTS: Slot[] = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? 0 : 30;
  return { hour, minute, label: formatTime(hour, minute) };
});

export function TimePicker({ visible, hour, minute, onSelect, onClose }: Props) {
  const listRef = useRef<FlatList<Slot>>(null);

  const selectedIndex = useMemo(
    () => SLOTS.findIndex(s => s.hour === hour && s.minute === minute),
    [hour, minute]
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Reminder Time</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={listRef}
          data={SLOTS}
          keyExtractor={item => `${item.hour}:${item.minute}`}
          initialScrollIndex={selectedIndex > 3 ? selectedIndex - 3 : 0}
          getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
          renderItem={({ item }) => {
            const selected = item.hour === hour && item.minute === minute;
            return (
              <TouchableOpacity
                style={[styles.item, selected && styles.itemSelected]}
                onPress={() => onSelect(item.hour, item.minute)}
                activeOpacity={0.7}
              >
                <Text style={styles.itemLabel}>{item.label}</Text>
                {selected && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.textPrimary} />
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
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
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  list: { paddingHorizontal: spacing.base, paddingBottom: spacing.xxl },
  item: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemSelected: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.bgSurface,
  },
  itemLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
});
