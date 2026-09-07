import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '@/store/useStore';
import { DeletedExpenseFile } from '@/types';
import { colors, typography, spacing, radius } from '@/constants/theme';
import { fileTotal, timeAgo } from '@/utils/helpers';
import { useCurrency } from '@/hooks/useCurrency';

export default function RecentlyDeletedScreen() {
  const deletedFiles     = useStore(s => s.deletedFiles);
  const restoreFile      = useStore(s => s.restoreFile);
  const permanentlyDeleteFile = useStore(s => s.permanentlyDeleteFile);
  const clearDeletedFiles     = useStore(s => s.clearDeletedFiles);
  const { formatAmount } = useCurrency();

  const handleRestore = (file: DeletedExpenseFile) => {
    restoreFile(file.id);
  };

  const handlePermanentDelete = (file: DeletedExpenseFile) => {
    Alert.alert(
      'Delete Permanently',
      `"${file.name}" will be gone forever. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: () => permanentlyDeleteFile(file.id) },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All',
      'All files in Recently Deleted will be permanently removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearDeletedFiles },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* Header */}
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
        <Text style={styles.title}>Recently Deleted</Text>
        {deletedFiles.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearAll}>Clear All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 64 }} />
        )}
      </View>

      <Text style={styles.note}>Files are kept for 30 days, then automatically removed.</Text>

      {deletedFiles.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trash-outline" size={48} color={colors.borderLight} />
          <Text style={styles.emptyTitle}>No deleted files</Text>
          <Text style={styles.emptySub}>Files you delete will appear here for 30 days.</Text>
        </View>
      ) : (
        <FlatList
          data={deletedFiles}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {item.expenses.length} expense{item.expenses.length !== 1 ? 's' : ''} · {formatAmount(fileTotal(item.expenses))}
                  </Text>
                  <Text style={styles.deletedAt}>Deleted {timeAgo(item.deletedAt)}</Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.restoreBtn}
                  onPress={() => handleRestore(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-undo-outline" size={14} color={colors.textPrimary} />
                  <Text style={styles.restoreText}>Restore</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handlePermanentDelete(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Permanently delete ${item.name}`}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

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
  clearAll: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    fontWeight: typography.weights.medium,
  },

  note: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },

  list: { paddingHorizontal: spacing.base, paddingBottom: spacing.xxl },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  fileName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  deletedAt: {
    fontSize: typography.sizes.xs,
    color: colors.textLabel,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  restoreText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
});
