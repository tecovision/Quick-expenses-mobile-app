import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useStore } from '@/store/useStore';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { colors, typography, spacing, radius } from '@/constants/theme';
import { Currency } from '@/types';
import { exportAllAsZip } from '@/services/export';
import { captureError } from '@/services/monitoring';

export default function SettingsScreen() {
  const currency      = useStore(s => s.currency);
  const setCurrency   = useStore(s => s.setCurrency);
  const deletedFiles  = useStore(s => s.deletedFiles);
  const files         = useStore(s => s.files);

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);

  const runBulkExport = async (format: 'pdf' | 'csv') => {
    if (files.length === 0) {
      Alert.alert('Nothing to Export', 'You have no expense files yet.');
      return;
    }
    setBulkExporting(true);
    try {
      await exportAllAsZip(files, format, currency);
    } catch (e) {
      captureError(e, { op: 'exportAllAsZip', format, fileCount: files.length });
      Alert.alert('Failed', 'Could not build the archive. Please try again.');
    } finally {
      setBulkExporting(false);
    }
  };

  const promptBulkExport = () => {
    Alert.alert(
      `Export All Files (${files.length})`,
      'Bundle every file into a single ZIP archive.',
      [
        { text: 'PDF (.zip)',         onPress: () => runBulkExport('pdf') },
        { text: 'Excel CSV (.zip)',   onPress: () => runBulkExport('csv') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCurrencySelect = (c: Currency) => {
    setCurrency(c);
    setShowCurrencyPicker(false);
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

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
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => setShowCurrencyPicker(true)} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
              <View style={styles.iconWrap}>
                <Text style={styles.currencySymbol}>{currency.symbol}</Text>
              </View>
              <View>
                <Text style={styles.rowTitle}>Currency</Text>
                <Text style={styles.rowSub}>{currency.name} ({currency.code})</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Backup */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>BACKUP</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={promptBulkExport}
            activeOpacity={0.7}
            disabled={bulkExporting}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: '#EAF6FF' }]}>
                <Ionicons name="archive-outline" size={18} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.rowTitle}>Export All Files</Text>
                <Text style={styles.rowSub}>
                  {files.length} file{files.length !== 1 ? 's' : ''} as PDF or CSV (.zip)
                </Text>
              </View>
            </View>
            {bulkExporting ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>

        {/* Data */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>DATA</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => router.push('/recently-deleted')}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: '#FFF1F0' }]}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </View>
              <Text style={styles.rowTitle}>Recently Deleted</Text>
            </View>
            <View style={styles.rowRight}>
              {deletedFiles.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{deletedFiles.length}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>ABOUT</Text>
        <View style={styles.card}>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="information-circle-outline" size={18} color="#2563EB" />
              </View>
              <Text style={styles.rowTitle}>Version</Text>
            </View>
            <Text style={styles.rowValue}>{version}</Text>
          </View>
        </View>

      </View>

      {/* Currency picker */}
      <CurrencyPicker
        visible={showCurrencyPicker}
        selectedCode={currency.code}
        onSelect={handleCurrencySelect}
        onClose={() => setShowCurrencyPicker(false)}
      />

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

  body: { flex: 1, padding: spacing.base },

  sectionLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  rowTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowValue: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
});
