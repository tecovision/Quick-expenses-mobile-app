import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '@/store/useStore';
import { FileCard } from '@/components/FileCard';
import { EmptyState } from '@/components/EmptyState';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { IconButton } from '@/components/IconButton';
import { Button } from '@/components/Button';
import { colors, typography, spacing, radius, shadows } from '@/constants/theme';
import { Currency } from '@/types';
import { MAX_FILE_NAME_LENGTH } from '@/utils/helpers';

export default function HomeScreen() {
  const files           = useStore(s => s.files);
  const addFile         = useStore(s => s.addFile);
  const setCurrency     = useStore(s => s.setCurrency);
  const currency        = useStore(s => s.currency);
  const showOnLaunch    = useStore(s => s.showCurrencyPickerOnLaunch);
  const markPickerShown = useStore(s => s.markCurrencyPickerShown);
  const loadData        = useStore(s => s.loadData);
  const noticeVisible   = useStore(s => s.showFirstRunNotice);

  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal]             = useState(false);
  const [name, setName]                       = useState('');
  const [query, setQuery]                     = useState('');
  const [searchOpen, setSearchOpen]           = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch]     = useState(false);

  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    // Wait for the one-time privacy / terms notice to be dismissed before
    // popping the currency picker, so two full-screen modals never stack.
    if (showOnLaunch && !noticeVisible) {
      setIsFirstLaunch(true);
      setShowCurrencyPicker(true);
      markPickerShown();
    }
  }, [showOnLaunch, noticeVisible]);

  const toggleSearch = () => {
    if (searchOpen) {
      setQuery('');
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter(f => f.name.toLowerCase().includes(q));
  }, [files, query]);

  const handleCreate = () => {
    if (name.trim()) {
      addFile(name.trim());
      setName('');
      setShowModal(false);
    }
  };

  const closeModal = () => { setName(''); setShowModal(false); };

  const handleCurrencySelect = (c: Currency) => {
    setCurrency(c);
    if (isFirstLaunch) {
      setIsFirstLaunch(false);
      setShowCurrencyPicker(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            QuickExpenses
          </Text>
        </View>
        <View style={styles.headerRight}>
          <IconButton
            name={searchOpen ? 'close-outline' : 'search-outline'}
            onPress={toggleSearch}
            variant={searchOpen ? 'tinted' : 'surface'}
            color={searchOpen ? colors.accent : colors.textPrimary}
            accessibilityLabel={searchOpen ? 'Close search' : 'Search files'}
          />
          <IconButton
            name="grid-outline"
            onPress={() => router.push('/tools')}
            accessibilityLabel="Tools"
          />
          <IconButton
            name="settings-outline"
            onPress={() => router.push('/settings')}
            accessibilityLabel="Settings"
          />
        </View>
      </View>

      {/* ── Collapsible search bar ── */}
      {searchOpen && (
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search files…"
            placeholderTextColor={colors.textLabel}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && Platform.OS === 'android' && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── File list ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <FileCard file={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadData();
              setRefreshing(false);
            }}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          searchOpen && query.trim() ? (
            <EmptyState
              icon="search-outline"
              title="No results"
              subtitle={`No files match "${query}"`}
            />
          ) : (
            <EmptyState
              icon="folder-open-outline"
              title="No expense files"
              subtitle="Tap the + button below to create one"
            />
          )
        }
      />

      {/* ── Add file FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add new file"
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* ── New file modal ── */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.overlay} onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.kav}
          >
            <Pressable style={styles.dialog} onPress={() => {}}>
              <Text style={styles.dialogTitle}>New Expense File</Text>
              <Text style={styles.label}>File Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. January 2025"
                placeholderTextColor={colors.textLabel}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleCreate}
                maxLength={MAX_FILE_NAME_LENGTH}
              />
              <View style={styles.buttons}>
                <Button title="Cancel" variant="secondary" onPress={closeModal} style={styles.flexBtn} />
                <Button title="Create" onPress={handleCreate} style={styles.flexBtn} />
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ── Currency picker ── */}
      <CurrencyPicker
        visible={showCurrencyPicker}
        selectedCode={currency.code}
        onSelect={handleCurrencySelect}
        onClose={() => setShowCurrencyPicker(false)}
        isFirstLaunch={isFirstLaunch}
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },

  // ── Header ──────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logo:  { width: 36, height: 36, borderRadius: 10 },
  title: {
    flexShrink: 1,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  // ── Search ──────────────────────────────────────────────────
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
  searchIcon:  { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    paddingVertical: 0,
  },

  // ── List ─────────────────────────────────────────────────────
  // Extra bottom padding keeps the last card clear of the FAB.
  list: { paddingHorizontal: spacing.base, paddingBottom: 96, paddingTop: spacing.sm },

  // ── Floating action button ────────────────────────────────────
  fab: {
    position: 'absolute',
    right: spacing.base,
    bottom: spacing.xl,
    width: 58,
    height: 58,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },

  // ── Modal ─────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  kav:    { width: '100%', maxWidth: 400 },
  dialog: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  dialogTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
  },
  buttons:  { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  flexBtn:  { flex: 1 },
});
