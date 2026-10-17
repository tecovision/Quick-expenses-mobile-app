import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '@/store/useStore';
import { IconButton } from '@/components/IconButton';
import { Button } from '@/components/Button';
import { colors, typography, spacing, radius, layout } from '@/constants/theme';
import { parseAmount, MAX_PARTICULAR_LENGTH, MAX_NOTE_LENGTH } from '@/utils/helpers';
import { parseSharedReceipt } from '@/utils/receiptParser';

/**
 * Landed on whenever another app (PhonePe's "Share receipt", or anything
 * else that shares plain text) hands content to QuickExpenses. Shows a
 * draft expense parsed from that text — amount and description pre-filled
 * where recognizable, always editable, never saved without confirmation.
 */
export default function ReceiptImportScreen() {
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const files    = useStore((s) => s.files);
  const addFile  = useStore((s) => s.addFile);
  const addExpense = useStore((s) => s.addExpense);

  const [particular, setParticular] = useState('');
  const [amount, setAmount]         = useState('');
  const [note, setNote]             = useState('');
  const [fileId, setFileId]         = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [error, setError]           = useState('');

  const sharedText = shareIntent?.text ?? '';

  // Re-parse whenever the shared text actually changes (covers a second
  // share arriving while this screen is already open).
  useEffect(() => {
    const parsed = parseSharedReceipt(sharedText);
    setParticular(parsed.particular);
    setAmount(parsed.amount !== null ? String(parsed.amount) : '');
    setNote(parsed.note);
    setError('');
  }, [sharedText]);

  // Default to whichever project was touched most recently.
  useEffect(() => {
    if (fileId && files.some((f) => f.id === fileId)) return;
    const mostRecent = [...files].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0];
    setFileId(mostRecent?.id ?? null);
  }, [files, fileId]);

  const discard = () => {
    resetShareIntent();
    router.replace('/');
  };

  const save = () => {
    const trimmed = particular.trim();
    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null) {
      return setError('Please enter a positive amount up to 999,999,999,999.');
    }

    let targetId = fileId;
    if (!targetId) {
      const name = newProjectName.trim();
      if (!name) return setError('Name the new project, or wait for an existing one to load.');
      addFile(name);
      targetId = useStore.getState().files[0].id;
    }

    addExpense(targetId, trimmed || 'Shared receipt', parsedAmount, {
      note: note.trim().slice(0, MAX_NOTE_LENGTH) || undefined,
    });
    resetShareIntent();
    router.replace(`/file/${targetId}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <IconButton name="close" onPress={discard} accessibilityLabel="Discard" />
          <Text style={styles.title}>Import Receipt</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={layout.content}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.hint}>
            Shared from another app — check the details below before saving.
          </Text>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={particular}
            onChangeText={setParticular}
            placeholder="e.g. Paid to John Doe"
            placeholderTextColor={colors.textLabel}
            maxLength={MAX_PARTICULAR_LENGTH}
          />

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.textLabel}
            keyboardType="decimal-pad"
            maxLength={15}
          />

          <Text style={styles.label}>Project</Text>
          {files.length > 0 ? (
            <View style={styles.pillRow}>
              {files.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.pill, fileId === f.id && styles.pillActive]}
                  onPress={() => setFileId(f.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Save to ${f.name}`}
                >
                  <Text style={[styles.pillText, fileId === f.id && styles.pillTextActive]}>
                    {f.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TextInput
              style={styles.input}
              value={newProjectName}
              onChangeText={setNewProjectName}
              placeholder="Name a new project to save this to"
              placeholderTextColor={colors.textLabel}
              maxLength={100}
            />
          )}

          <View style={styles.noteLabelRow}>
            <Text style={styles.label}>Original shared text</Text>
          </View>
          <View style={styles.noteBox}>
            <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
            <Text style={styles.noteText} numberOfLines={6}>
              {sharedText || '(no text was shared)'}
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.buttons}>
            <Button title="Discard" variant="secondary" onPress={discard} style={styles.flexBtn} />
            <Button title="Save Expense" onPress={save} style={styles.flexBtn} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  body: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xxl,
  },
  hint: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pillActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  pillText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  pillTextActive: { color: colors.accent, fontWeight: typography.weights.semibold },
  noteLabelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  noteBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noteText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginTop: spacing.base,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  flexBtn: { flex: 1 },
});
