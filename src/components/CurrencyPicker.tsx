import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, FlatList, TextInput,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Currency } from '../types';
import { CURRENCIES } from '../constants/currencies';
import { colors, typography, spacing, radius } from '../constants/theme';

interface Props {
  visible: boolean;
  selectedCode: string;
  onSelect: (currency: Currency) => void;
  onClose: () => void;
  /** When true, shows welcome copy and hides the close button */
  isFirstLaunch?: boolean;
}

export function CurrencyPicker({ visible, selectedCode, onSelect, onClose, isFirstLaunch }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.symbol.includes(q)
    );
  }, [query]);

  const handleSelect = (currency: Currency) => {
    onSelect(currency);
    setQuery('');
    if (!isFirstLaunch) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={isFirstLaunch ? undefined : onClose}>
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            {isFirstLaunch ? (
              <>
                <Text style={styles.welcome}>Welcome to QuickExpenses</Text>
                <Text style={styles.subtitle}>Choose your currency to get started</Text>
              </>
            ) : (
              <Text style={styles.title}>Select Currency</Text>
            )}
          </View>
          {!isFirstLaunch && (
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search currency..."
            placeholderTextColor={colors.textLabel}
            clearButtonMode="while-editing"
          />
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={item => item.code}
          renderItem={({ item }) => {
            const selected = item.code === selectedCode;
            return (
              <TouchableOpacity
                style={[styles.item, selected && styles.itemSelected]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.symbolWrap}>
                  <Text style={styles.symbol}>{item.symbol}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemCode}>{item.code}</Text>
                </View>
                {selected && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.textPrimary} />
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {/* First-launch confirm button */}
        {isFirstLaunch && (
          <View style={styles.confirmWrap}>
            <TouchableOpacity style={styles.confirmBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.confirmText}>Continue with {selectedCode}</Text>
            </TouchableOpacity>
          </View>
        )}

      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1 },
  welcome: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    height: 42,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  list: { paddingHorizontal: spacing.base, paddingBottom: spacing.xxl },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  itemSelected: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.bgSurface,
  },
  symbolWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  symbol: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemCode: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  confirmWrap: {
    padding: spacing.base,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.bgCard,
  },
  confirmBtn: {
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
});
