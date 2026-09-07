import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  Animated,
  PanResponder,
  Image,
  Pressable,
  TouchableWithoutFeedback,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '@/store/useStore';
import { ExpenseForm } from '@/components/ExpenseForm';
import { UndoToast } from '@/components/UndoToast';
import { PhotoViewer } from '@/components/PhotoViewer';
import { colors, typography, spacing, radius } from '@/constants/theme';
import {
  formatDateTime,
  fileTotal,
  parseAmount,
  MAX_FILE_NAME_LENGTH,
  MAX_PARTICULAR_LENGTH,
  MAX_NOTE_LENGTH,
} from '@/utils/helpers';
import { useCurrency } from '@/hooks/useCurrency';
import { exportToPDF, exportToCSV, downloadPDF, downloadCSV, openSavedFile } from '@/services/export';
import { deleteAttachment } from '@/services/attachments';
import { pickPhoto, PhotoSource } from '@/services/photoPicker';
import { captureError } from '@/services/monitoring';
import { Expense } from '@/types';

// LayoutAnimation needs to be opted-in on old-architecture Android.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Column widths ─────────────────────────────────────────────
const COL_NO     = 34;
const COL_AMOUNT = 94;
const COL_PENCIL = 24;
const COL_DELETE = 22;
const DELETE_W   = 72;   // swipe-left reveal width for delete action

// The table has fixed-width numeric columns, so let its dense cells scale
// with the system font only up to a point before the layout would break.
// Body text elsewhere (descriptions, notes) still scales without limit.
const TABLE_FONT_CAP = 1.3;

// ── Swipeable row ─────────────────────────────────────────────
interface RowProps {
  expense: Expense;
  index: number;
  onEdit: (e: Expense) => void;
  onDelete: (id: string, name: string) => void;
  formatAmount: (n: number) => string;
}

const SwipeRow = React.memo(function SwipeRow({
  expense,
  index,
  onEdit,
  onDelete,
  formatAmount,
}: RowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

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
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          isOpen.current = false;
        }
      },
    })
  ).current;

  const close = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    isOpen.current = false;
  }, [translateX]);

  return (
    <View style={styles.swipeContainer}>
      {/* Delete action — revealed when user swipes left */}
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => { close(); onDelete(expense.id, expense.particular); }}
        activeOpacity={0.85}
      >
        <Ionicons name="trash" size={18} color={colors.white} />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>

      {/* Row content — slides left to expose the delete action.
          Pressable wraps the content so long-press opens Edit; the
          PanResponder lives on the outer Animated.View and only claims
          the gesture when the user actually swipes horizontally, so
          taps and long-presses still flow through. */}
      <Animated.View
        style={[styles.dataRow, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={styles.rowPress}
          onLongPress={() => { close(); onEdit(expense); }}
          delayLongPress={350}
          android_ripple={{ color: 'rgba(0,0,0,0.04)' }}
        >
          <Text style={[styles.indexText, styles.colCell, { width: COL_NO }]} maxFontSizeMultiplier={TABLE_FONT_CAP}>{index}</Text>
          <View style={styles.colDivider} />

          <View style={[styles.grow, styles.colCell]}>
            <View style={styles.particularRow}>
              <Text style={styles.particularText} numberOfLines={1}>{expense.particular}</Text>
              {expense.photoUri && (
                <Ionicons name="image" size={11} color={colors.accent} style={styles.attachIcon} />
              )}
              {expense.note && (
                <Ionicons name="document-text" size={11} color={colors.accent} style={styles.attachIcon} />
              )}
            </View>
            <Text style={styles.dateTimeText} maxFontSizeMultiplier={TABLE_FONT_CAP}>{formatDateTime(expense.createdAt)}</Text>
          </View>
          <View style={styles.colDivider} />

          <Text
            style={[styles.amountText, { width: COL_AMOUNT }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            maxFontSizeMultiplier={TABLE_FONT_CAP}
          >
            {formatAmount(expense.amount)}
          </Text>

          <TouchableOpacity
            style={[styles.actionBtn, { width: COL_PENCIL }]}
            onPress={() => { close(); onEdit(expense); }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${expense.particular}`}
          >
            <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { width: COL_DELETE }]}
            onPress={() => { close(); onDelete(expense.id, expense.particular); }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${expense.particular}`}
          >
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
          </TouchableOpacity>
        </Pressable>
      </Animated.View>
    </View>
  );
});

// ── Main screen ───────────────────────────────────────────────
export default function FileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const file          = useStore(s => s.getFile(id));
  const renameFile    = useStore(s => s.renameFile);
  const addExpense    = useStore(s => s.addExpense);
  const updateExpense = useStore(s => s.updateExpense);
  const deleteExpense = useStore(s => s.deleteExpense);
  const { currency, formatAmount } = useCurrency();
  const insets = useSafeAreaInsets();

  const [particular, setParticular] = useState('');
  const [amount, setAmount]         = useState('');
  const [note, setNote]             = useState('');
  const [photoUri, setPhotoUri]     = useState<string | null>(null);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [viewerUri, setViewerUri]   = useState<string | null>(null);
  const particularRef = useRef<TextInput>(null);
  const amountRef     = useRef<TextInput>(null);
  const noteRef       = useRef<TextInput>(null);
  const scrollRef     = useRef<ScrollView>(null);
  const didInitialScrollRef = useRef(false);

  const [isRenaming, setIsRenaming] = useState(false);
  const [nameInput, setNameInput]   = useState('');
  const [exporting, setExporting]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [undoVisible, setUndoVisible]         = useState(false);
  const [undoMessage, setUndoMessage]         = useState('');
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors pendingDeleteId so the stable handleDelete callback can read the
  // current value without depending on it (keeps row memoization effective).
  const pendingDeleteRef = useRef<string | null>(null);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight]   = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => particularRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);

  // Mirror the draft photo so the unmount cleanup can read its latest value
  // without re-subscribing the effect on every photo change.
  const photoUriRef = useRef<string | null>(null);
  useEffect(() => { photoUriRef.current = photoUri; }, [photoUri]);

  // Lets in-flight async work (attachPhoto) detect that the screen was
  // unmounted while it was awaiting the native picker, so it can delete the
  // just-copied file instead of leaking it via a dropped setState call.
  const isMountedRef = useRef(true);

  // On unmount: drop any never-saved draft photo (handleAdd nulls photoUri
  // after saving, so an attached entry's photo is never touched here), and
  // commit any still-pending delete instead of leaving a dangling timer that
  // would call setState on an unmounted component.
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

      const draft = photoUriRef.current;
      const latest = id ? useStore.getState().getFile(id) : undefined;
      // Only drop the draft photo if it isn't already attached to a saved
      // expense (guards the brief window right after a successful add).
      if (draft && !latest?.expenses.some(e => e.photoUri === draft)) {
        deleteAttachment(draft);
      }

      const expId = pendingDeleteRef.current;
      if (expId && id) {
        const target = latest?.expenses.find(e => e.id === expId);
        useStore.getState().deleteExpense(id, expId);
        if (target?.photoUri) deleteAttachment(target.photoUri);
      }
    };
  }, []);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    // Animate padding changes so the input row glides with the keyboard
    // instead of snapping into place after it (the "jump" on release builds).
    const animate = () =>
      LayoutAnimation.configureNext({
        duration: 220,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
      });

    const show = Keyboard.addListener(showEvt, (e) => {
      // Pad by the full keyboard frame. The screen draws edge-to-edge (Expo
      // SDK 54 default on Android, always on iOS), so the window does NOT
      // resize for the keyboard — the only thing lifting the input row above
      // it is this padding. Using the reported height directly is reliable on
      // every device; the old measure-on-a-timer approach was fooled by
      // edge-to-edge into computing ~0 and left the row hidden.
      animate();
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      animate();
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!file || !q) return file?.expenses ?? [];
    return file.expenses.filter(e => e.particular.toLowerCase().includes(q));
  }, [file?.expenses, searchQuery]);

  // Chronological order — oldest first, newest just above the input row —
  // so the S.No column always reads 1,2,3… top-to-bottom and a new entry
  // appears where the user is looking rather than jumping to the top.
  const displayExpenses = useMemo(
    () => filteredExpenses.filter(e => e.id !== pendingDeleteId),
    [filteredExpenses, pendingDeleteId]
  );

  const expenseIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    file?.expenses.forEach((e, i) => map.set(e.id, i + 1));
    return map;
  }, [file?.expenses]);

  // ── Row callbacks ─────────────────────────────────────────────
  // Stable identities so the memoized SwipeRow doesn't re-render on every
  // keystroke in the input row. State is read through useStore.getState()
  // inside the timer to avoid stale closures over `file`.
  const fileId = file?.id;

  const handleEditOpen = useCallback(
    (expense: Expense) => setEditingExpense(expense),
    []
  );

  const handleDelete = useCallback((expId: string, name: string) => {
    if (!fileId) return;
    const { getFile, deleteExpense: removeExpense } = useStore.getState();

    // Commit any still-pending previous delete first
    if (pendingDeleteRef.current) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      const prev = getFile(fileId)?.expenses.find(e => e.id === pendingDeleteRef.current);
      removeExpense(fileId, pendingDeleteRef.current);
      if (prev?.photoUri) deleteAttachment(prev.photoUri);
    }

    pendingDeleteRef.current = expId;
    setPendingDeleteId(expId);
    setUndoMessage(`"${name}" removed`);
    setUndoVisible(true);
    undoTimerRef.current = setTimeout(() => {
      const target = useStore.getState().getFile(fileId)?.expenses.find(e => e.id === expId);
      useStore.getState().deleteExpense(fileId, expId);
      if (target?.photoUri) deleteAttachment(target.photoUri);
      pendingDeleteRef.current = null;
      setPendingDeleteId(null);
      setUndoVisible(false);
    }, 5000);
  }, [fileId]);

  if (!file) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>File not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const total      = fileTotal(file.expenses);
  const subtotal   = fileTotal(filteredExpenses);
  const isSearching = searchQuery.trim().length > 0;
  const exportFile  = isSearching
    ? { ...file, name: `${file.name} — ${searchQuery}`, expenses: filteredExpenses }
    : file;

  // ── Handlers ──────────────────────────────────────────────────
  const commitAdd = (trimmed: string, parsed: number) => {
    addExpense(file.id, trimmed, parsed, {
      note:     note.trim() || undefined,
      photoUri: photoUri || undefined,
    });
    setParticular('');
    setAmount('');
    setNote('');
    setPhotoUri(null);
    setExtrasOpen(false);
    // The amount field uses blurOnSubmit={false}, so the keyboard never
    // dismisses between entries — we just hand focus back to the description
    // field on the next frame (after the state-clearing render flushes).
    // requestAnimationFrame is deterministic across debug and release builds,
    // unlike a fixed setTimeout that races the keyboard animation.
    // Scroll the new row (appended at the bottom) into view.
    requestAnimationFrame(() => {
      particularRef.current?.focus();
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleAdd = () => {
    const trimmed = particular.trim();
    const parsed  = parseAmount(amount);
    if (!trimmed)        { particularRef.current?.focus(); return; }
    if (parsed === null) {
      if (amount.trim()) {
        Alert.alert('Invalid Amount', 'Enter an amount between 0.01 and 999,999,999,999.');
      }
      amountRef.current?.focus();
      return;
    }

    // Duplicate description → confirm before adding a second one.
    const isDuplicate = file.expenses.some(
      e => e.particular.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      Alert.alert(
        'Already Added',
        `"${trimmed}" is already in this file. Add it again anyway?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => amountRef.current?.focus() },
          { text: 'Add Anyway', onPress: () => commitAdd(trimmed, parsed) },
        ]
      );
      return;
    }

    commitAdd(trimmed, parsed);
  };

  const attachPhoto = async (source: PhotoSource) => {
    const persisted = await pickPhoto(source);
    if (!persisted) return;
    if (!isMountedRef.current) {
      // The screen was left while the native picker was open — the copied
      // file has no owner to attach to, so delete it instead of leaking it.
      deleteAttachment(persisted);
      return;
    }
    // Replace any previous draft photo
    if (photoUri) await deleteAttachment(photoUri);
    setPhotoUri(persisted);
  };

  const clearDraftPhoto = async () => {
    if (photoUri) await deleteAttachment(photoUri);
    setPhotoUri(null);
  };

  const toggleExtras = () => {
    const next = !extrasOpen;
    setExtrasOpen(next);
    if (next) setTimeout(() => noteRef.current?.focus(), 80);
  };

  const promptAttachPhoto = () => {
    Alert.alert(
      'Attach Photo',
      'Choose a source',
      [
        { text: 'Take Photo',          onPress: () => attachPhoto('camera') },
        { text: 'Choose from Gallery', onPress: () => attachPhoto('gallery') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleEditSave = (
    p: string,
    a: number,
    extras: { note?: string; photoUri?: string }
  ) => {
    if (!editingExpense) return;
    updateExpense(file.id, editingExpense.id, p, a, extras);
    setEditingExpense(null);
  };

  const handleUndo = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    pendingDeleteRef.current = null;
    setPendingDeleteId(null);
    setUndoVisible(false);
  };

  const handleUndoDismiss = () => {
    if (pendingDeleteId) {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      const target = file.expenses.find(e => e.id === pendingDeleteId);
      deleteExpense(file.id, pendingDeleteId);
      if (target?.photoUri) deleteAttachment(target.photoUri);
      pendingDeleteRef.current = null;
      setPendingDeleteId(null);
    }
    setUndoVisible(false);
  };

  const requireExpenses = () => {
    const target = isSearching ? filteredExpenses : file.expenses;
    if (target.length === 0) {
      Alert.alert(
        'No Expenses',
        isSearching ? `No results for "${searchQuery}" to export.` : 'Add at least one expense first.'
      );
      return false;
    }
    return true;
  };

  // Share → hand the file to the system share sheet.
  const runShare = async (type: 'pdf' | 'csv') => {
    setExporting(true);
    try {
      if (type === 'pdf') await exportToPDF(exportFile, file.expenses, currency);
      else await exportToCSV(exportFile, file.expenses, currency);
    } catch (e) {
      captureError(e, { op: 'shareFile', format: type, count: file.expenses.length });
      Alert.alert('Failed', 'Something went wrong. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Download → write the file straight into a folder on the device.
  const runDownload = async (type: 'pdf' | 'csv') => {
    setExporting(true);
    try {
      const result = type === 'pdf'
        ? await downloadPDF(exportFile, file.expenses, currency)
        : await downloadCSV(exportFile, file.expenses);
      if (result.status === 'saved') {
        Alert.alert(
          'Saved',
          `Your ${type.toUpperCase()} file was saved to your device.`,
          [
            {
              text: 'Open',
              onPress: () =>
                openSavedFile(result.uri, result.mimeType).catch((e) => {
                  captureError(e, { op: 'openSavedFile', format: type });
                  Alert.alert('Can’t Open', `No app on your device can open ${type.toUpperCase()} files.`);
                }),
            },
            { text: 'Done', style: 'cancel' },
          ]
        );
      }
      // 'shared' (iOS) — the system sheet already gave feedback.
      // 'cancelled' — the user backed out of the folder picker; stay silent.
    } catch (e) {
      captureError(e, { op: 'downloadFile', format: type, count: file.expenses.length });
      Alert.alert('Failed', 'Could not save the file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const promptDownload = () => {
    if (!requireExpenses()) return;
    const title = isSearching ? `Download "${searchQuery}" results` : 'Download as';
    Alert.alert(title, 'Choose a format', [
      { text: 'PDF',         onPress: () => runDownload('pdf') },
      { text: 'Excel (CSV)', onPress: () => runDownload('csv') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const promptShare = () => {
    if (!requireExpenses()) return;
    const title = isSearching ? `Share "${searchQuery}" results` : 'Share as';
    Alert.alert(title, 'Choose a format', [
      { text: 'PDF',         onPress: () => runShare('pdf') },
      { text: 'Excel (CSV)', onPress: () => runShare('csv') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleStartRename = () => { setNameInput(file.name); setIsRenaming(true); };
  const handleFinishRename = () => {
    if (nameInput.trim()) renameFile(file.id, nameInput.trim());
    setIsRenaming(false);
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={styles.body}>

      {/* ── Header ── */}
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

        {isRenaming ? (
          <TextInput
            style={styles.nameInput}
            value={nameInput}
            onChangeText={setNameInput}
            onBlur={handleFinishRename}
            onSubmitEditing={handleFinishRename}
            autoFocus
            returnKeyType="done"
            maxLength={MAX_FILE_NAME_LENGTH}
          />
        ) : (
          <TouchableOpacity onPress={handleStartRename} style={styles.nameTouchable} activeOpacity={0.7}>
            <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
            <Ionicons name="pencil-outline" size={13} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        <View style={styles.headerActions}>
          {exporting ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <>
              <TouchableOpacity
                onPress={promptDownload}
                style={styles.iconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel="Download file"
              >
                <Ionicons name="download-outline" size={21} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={promptShare}
                style={styles.iconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel="Share file"
              >
                <Ionicons name="share-social-outline" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by particulars…"
          placeholderTextColor={colors.textLabel}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && Platform.OS === 'android' && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/*
        Bottom spacing:
        • Keyboard open  → lift the input row to sit on top of the keyboard.
          The screen draws edge-to-edge so the window never resizes; this
          padding is what does the lifting. On Android the reported keyboard
          height is measured from ABOVE the navigation bar, while our container
          (SafeAreaView excludes the bottom edge) reaches the true screen
          bottom — so we add insets.bottom to clear the nav-bar gap, otherwise
          the row's bottom hides behind the keyboard. iOS already reports the
          full frame including the home indicator, so no inset is added there.
        • Keyboard closed → bottom safe-area inset so the input row clears the
          Android nav bar / iOS home indicator.
      */}
      <View
        style={[
          styles.kav,
          {
            paddingBottom: keyboardVisible
              ? keyboardHeight + (Platform.OS === 'android' ? insets.bottom : 0)
              : insets.bottom,
          },
        ]}
      >

        {/*
          ── Table card ───────────────────────────────────────────
          overflow:hidden clips the blue header/input corners to
          match the card's borderRadius. The card itself is flex:1
          so it fills the available space — only the rows inside
          the ScrollView scroll; header and input row are fixed.
        */}
        <View style={styles.tableCard}>

          {/* Fixed blue column header — never scrolls */}
          <View style={styles.tableHead}>
            <Text style={[styles.headCell, { width: COL_NO }]} maxFontSizeMultiplier={TABLE_FONT_CAP}>S.NO</Text>
            <View style={styles.colDividerLight} />
            <Text style={[styles.headCell, styles.grow]} maxFontSizeMultiplier={TABLE_FONT_CAP}>Particulars</Text>
            <View style={styles.colDividerLight} />
            <Text style={[styles.headCell, { width: COL_AMOUNT, textAlign: 'right' }]} maxFontSizeMultiplier={TABLE_FONT_CAP}>Amount</Text>
            <View style={{ width: COL_PENCIL + COL_DELETE }} />
          </View>

          {/* Scrollable data rows — scroll regardless of row count.
              Tap anywhere in the empty scroll area to dismiss the keyboard. */}
          <ScrollView
            ref={scrollRef}
            style={styles.tableScroll}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => Keyboard.dismiss()}
            onContentSizeChange={() => {
              // Land on the most recent entries (and the input row) when the
              // file first opens, instead of the oldest entry at the top.
              if (!didInitialScrollRef.current && displayExpenses.length > 0) {
                didInitialScrollRef.current = true;
                scrollRef.current?.scrollToEnd({ animated: false });
              }
            }}
          >
            {/* No results (search) */}
            {filteredExpenses.length === 0 && isSearching && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No results for "{searchQuery}"</Text>
              </View>
            )}

            {/* Empty state (no expenses yet) */}
            {displayExpenses.length === 0 && !isSearching && (
              <View style={styles.emptyTable}>
                <Ionicons name="receipt-outline" size={36} color={colors.borderLight} />
                <Text style={styles.emptyTableText}>No entries yet</Text>
                <Text style={styles.emptyTableSub}>Type below to add your first entry</Text>
              </View>
            )}

            {/* Swipeable expense rows */}
            {displayExpenses.map(expense => (
              <SwipeRow
                key={expense.id}
                expense={expense}
                index={expenseIndexMap.get(expense.id) ?? 0}
                onEdit={handleEditOpen}
                onDelete={handleDelete}
                formatAmount={formatAmount}
              />
            ))}
          </ScrollView>

          {/* Grand Total row — lives inside the table card, above the input row */}
          {!isSearching && file.expenses.length > 0 && (
            <View style={styles.tableTotalRow}>
              <View style={{ width: COL_NO }} />
              <View style={styles.colDivider} />
              <Text style={[styles.tableTotalLabel, styles.grow]}>TOTAL</Text>
              <View style={styles.colDivider} />
              <Text
                style={styles.tableTotalAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {formatAmount(total)}
              </Text>
              <View style={{ width: COL_PENCIL + COL_DELETE }} />
            </View>
          )}

          {/* Fixed blue input row — always visible at the bottom of the card */}
          {!isSearching && (
            <View style={styles.inputRow}>
              <Text style={[styles.indexText, styles.inputIndex]} maxFontSizeMultiplier={TABLE_FONT_CAP}>
                {file.expenses.length + 1}
              </Text>
              <View style={styles.colDividerLight} />

              <TextInput
                ref={particularRef}
                style={[styles.inputCell, styles.grow]}
                value={particular}
                onChangeText={setParticular}
                placeholder="Description"
                placeholderTextColor="rgba(255,255,255,0.5)"
                cursorColor={colors.white}
                selectionColor={colors.white}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => amountRef.current?.focus()}
                maxLength={MAX_PARTICULAR_LENGTH}
                maxFontSizeMultiplier={TABLE_FONT_CAP}
                // Single line — Android wraps a too-wide placeholder onto a
                // second line inside this narrow column and clips it otherwise.
                numberOfLines={1}
                multiline={false}
              />

              <TouchableOpacity
                style={styles.inputCenterBtn}
                onPress={handleAdd}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityLabel="Add expense"
              >
                <Ionicons
                  name="return-down-back-outline"
                  size={15}
                  color={particular.trim() ? colors.white : 'rgba(255,255,255,0.4)'}
                />
              </TouchableOpacity>
              <View style={styles.colDividerLight} />

              <TextInput
                ref={amountRef}
                style={[styles.inputCell, styles.amountInput, { width: COL_AMOUNT }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.5)"
                cursorColor={colors.white}
                selectionColor={colors.white}
                keyboardType="decimal-pad"
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={handleAdd}
                maxLength={15}
                maxFontSizeMultiplier={TABLE_FONT_CAP}
                numberOfLines={1}
                multiline={false}
              />

              <View style={[styles.inputBtnCluster, { width: COL_PENCIL + COL_DELETE }]}>
                <TouchableOpacity
                  style={styles.inputClusterBtn}
                  onPress={toggleExtras}
                  hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
                  accessibilityRole="button"
                  accessibilityLabel={extrasOpen ? 'Hide note field' : 'Add a note'}
                >
                  <Ionicons
                    name={extrasOpen ? 'remove' : 'add'}
                    size={16}
                    color={
                      extrasOpen || note.trim() || photoUri
                        ? colors.white
                        : 'rgba(255,255,255,0.55)'
                    }
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.inputClusterBtn}
                  onPress={promptAttachPhoto}
                  hitSlop={{ top: 8, bottom: 8, left: 2, right: 2 }}
                  accessibilityRole="button"
                  accessibilityLabel="Attach photo"
                >
                  <Ionicons
                    name="camera-outline"
                    size={16}
                    color={photoUri ? colors.white : 'rgba(255,255,255,0.75)'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Expanded extras panel — note only ── */}
          {!isSearching && extrasOpen && (
            <View style={styles.extrasPanel}>
              {/* Note has a multiline keyboard, so the return key inserts a
                  newline instead of dismissing — this Done button closes it. */}
              <View style={styles.extrasHeader}>
                <Text style={styles.extrasLabel}>NOTE</Text>
                <TouchableOpacity
                  onPress={() => Keyboard.dismiss()}
                  hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Done editing note"
                >
                  <Text style={styles.extrasDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.extrasRow}>
                <TextInput
                  ref={noteRef}
                  style={styles.noteInput}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a note (optional)…"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  cursorColor={colors.white}
                  selectionColor={colors.white}
                  multiline
                  maxLength={MAX_NOTE_LENGTH}
                />
              </View>

              {/* If a photo is already attached via the camera icon, show its thumbnail here */}
              {photoUri && (
                <View style={styles.extrasActions}>
                  <View style={styles.thumbWrap}>
                    <TouchableOpacity onPress={() => setViewerUri(photoUri)} activeOpacity={0.85}>
                      <Image source={{ uri: photoUri }} style={styles.thumb} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.thumbRemove}
                      onPress={clearDraftPhoto}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close" size={12} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Below-table area ── */}

        {/* Undo toast */}
        <UndoToast
          visible={undoVisible}
          message={undoMessage}
          onUndo={handleUndo}
          onDismiss={handleUndoDismiss}
        />

        {/* Subtotal — search mode */}
        {isSearching && filteredExpenses.length > 0 && (
          <View style={styles.subtotalCard}>
            <View>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalMeta}>
                {filteredExpenses.length} result{filteredExpenses.length !== 1 ? 's' : ''} for "{searchQuery}"
              </Text>
            </View>
            <Text style={styles.subtotalAmount}>{formatAmount(subtotal)}</Text>
          </View>
        )}

        {/* Keyboard dismiss */}
        {keyboardVisible && (
          <TouchableOpacity
            style={styles.kbDismiss}
            onPress={() => Keyboard.dismiss()}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
            <Text style={styles.kbDismissText}>Done</Text>
          </TouchableOpacity>
        )}

      </View>
    </View>
    </TouchableWithoutFeedback>

      {/* ── Edit Modal ── */}
      <ExpenseForm
        visible={editingExpense !== null}
        editingExpense={editingExpense}
        onSubmit={handleEditSave}
        onClose={() => setEditingExpense(null)}
      />

      {/* ── Photo viewer — pinch to zoom, double-tap to zoom, drag to pan ── */}
      <PhotoViewer uri={viewerUri} onClose={() => setViewerUri(null)} />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bgApp },
  body:         { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: typography.sizes.base, color: colors.textMuted },
  backLink:     { fontSize: typography.sizes.base, color: colors.accent, marginTop: spacing.sm },

  // ── Header ──────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  nameTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fileName: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  nameInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 56,
    justifyContent: 'flex-end',
  },
  iconBtn: { padding: spacing.xs },

  // ── Search ──────────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
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

  // ── Layout ──────────────────────────────────────────────────
  kav: { flex: 1 },

  // ── Table card ──────────────────────────────────────────────
  // flex:1 fills available space; overflow:hidden rounds the
  // header's top corners and the input row's bottom corners.
  tableCard: {
    flex: 1,
    marginHorizontal: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    marginBottom: spacing.xs,
  },

  // ── Table header — fixed above ScrollView ─────────────────
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accent,
    minHeight: 48,
  },
  headCell: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Scrollable area ──────────────────────────────────────────
  tableScroll: { flex: 1 },

  // ── Swipeable row ────────────────────────────────────────────
  swipeContainer: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.white,
    letterSpacing: 0.3,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: colors.bgCard,
    minHeight: 48,
  },
  rowPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
  },
  colCell: {
    paddingHorizontal: spacing.xs,
  },
  // Vertical divider between table columns. Light grey for data/total rows.
  colDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.borderLight,
    marginVertical: 2,
  },
  // White divider for blue header + blue input rows.
  colDividerLight: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginVertical: 4,
  },
  indexText: {
    fontSize: typography.sizes.xs,
    color: colors.textLabel,
  },
  particularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  particularText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
    marginBottom: 2,
    flexShrink: 1,
  },
  attachIcon: { marginBottom: 2 },
  dateTimeText: {
    fontSize: 10,
    color: colors.textLabel,
    letterSpacing: 0.1,
  },
  amountText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    textAlign: 'right',
    paddingHorizontal: spacing.xs,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Empty / no-results states ─────────────────────────────
  noResults:     { paddingVertical: spacing.xl, alignItems: 'center' },
  noResultsText: { fontSize: typography.sizes.sm, color: colors.textMuted },
  emptyTable: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTableText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textLabel,
  },
  emptyTableSub: {
    fontSize: typography.sizes.xs,
    color: colors.textLabel,
    textAlign: 'center',
    marginTop: 2,
  },

  // ── In-table Grand Total row ─────────────────────────────
  tableTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  tableTotalLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  tableTotalAmount: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'right',
    flexShrink: 0,
    paddingLeft: spacing.sm,
  },

  // ── Input row — fixed below ScrollView ───────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accent,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  inputIndex: {
    width: COL_NO,
    color: 'rgba(255,255,255,0.7)',
  },
  inputCell: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.white,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  amountInput: { textAlign: 'right' },

  // ── Input row button cluster (+ and camera) ───────────────
  inputBtnCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputClusterBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },

  // Enter button sits between Description and Amount fields
  inputCenterBtn: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  // ── Expanded extras panel (note + photo) ───────────────────
  extrasPanel: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  extrasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  extrasLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
  },
  extrasDone: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  extrasRow: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  noteInput: {
    fontSize: typography.sizes.sm,
    color: colors.white,
    minHeight: 32,
    maxHeight: 96,
    padding: 0,
  },
  extrasActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  extraPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  extraPillText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.white,
    letterSpacing: 0.2,
  },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  thumbRemove: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Shared ────────────────────────────────────────────────────
  grow: { flex: 1 },

  // ── Grand total ──────────────────────────────────────────────
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    marginHorizontal: spacing.base,
    marginTop: spacing.xs,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  totalLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },

  // ── Keyboard dismiss ─────────────────────────────────────────
  kbDismiss: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginHorizontal: spacing.base,
  },
  kbDismissText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontWeight: typography.weights.medium,
  },

  // ── Subtotal (search mode) ───────────────────────────────────
  subtotalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.xs,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  subtotalLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  subtotalMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  subtotalAmount: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
});
