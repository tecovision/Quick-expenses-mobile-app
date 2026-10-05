import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Expense } from '../types';
import { colors, typography, spacing, radius } from '../constants/theme';
import { deleteAttachment } from '../services/attachments';
import { pickPhoto, PhotoSource } from '../services/photoPicker';
import { parseAmount, MAX_PARTICULAR_LENGTH, MAX_NOTE_LENGTH } from '../utils/helpers';
import { PhotoViewer } from './PhotoViewer';
import { Button } from './Button';

interface Props {
  visible: boolean;
  editingExpense: Expense | null;
  onSubmit: (
    particular: string,
    amount: number,
    extras: { note?: string; photoUri?: string }
  ) => void;
  onClose: () => void;
}

export function ExpenseForm({ visible, editingExpense, onSubmit, onClose }: Props) {
  const [particular, setParticular] = useState('');
  const [amount, setAmount]         = useState('');
  const [note, setNote]             = useState('');
  const [photoUri, setPhotoUri]     = useState<string | undefined>(undefined);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [error, setError]           = useState('');

  // Track the photo we started with so we can clean it up only if it was
  // replaced or removed by the user pressing Save.
  const [originalPhotoUri, setOriginalPhotoUri] = useState<string | undefined>(undefined);

  // This component stays mounted while hidden (only the Modal's `visible`
  // prop toggles), so an in-flight attachPhoto can't detect a close via
  // unmount. Mirror the prop each render so the async flow can tell whether
  // its result is still relevant by the time the native picker returns.
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    if (visible) {
      setParticular(editingExpense?.particular ?? '');
      setAmount(editingExpense ? String(editingExpense.amount) : '');
      setNote(editingExpense?.note ?? '');
      setPhotoUri(editingExpense?.photoUri);
      setOriginalPhotoUri(editingExpense?.photoUri);
      setError('');
    }
  }, [visible, editingExpense]);

  const handleSubmit = async () => {
    const trimmed = particular.trim();
    const parsed = parseAmount(amount);
    if (!trimmed) return setError('Please enter a description.');
    if (parsed === null) {
      return setError('Please enter a positive amount up to 999,999,999,999.');
    }
    setError('');
    // If the user replaced or removed the original photo, delete the old file
    if (originalPhotoUri && originalPhotoUri !== photoUri) {
      await deleteAttachment(originalPhotoUri);
    }
    onSubmit(trimmed, parsed, {
      note: note.trim() || undefined,
      photoUri: photoUri || undefined,
    });
  };

  const handleCancel = async () => {
    // If a new photo was picked during this session and never saved, drop it
    if (photoUri && photoUri !== originalPhotoUri) {
      await deleteAttachment(photoUri);
    }
    onClose();
  };

  const attachPhoto = async (source: PhotoSource) => {
    const persisted = await pickPhoto(source);
    if (!persisted) return;
    if (!visibleRef.current) {
      // The modal was closed (Cancel/backdrop) while the native picker was
      // still open. This component stays mounted, so nothing else would
      // ever notice or clean up the file this copied — delete it now.
      deleteAttachment(persisted);
      return;
    }
    // If there's an unsaved draft photo, clean it up before replacing
    if (photoUri && photoUri !== originalPhotoUri) await deleteAttachment(photoUri);
    setPhotoUri(persisted);
  };

  const removePhoto = async () => {
    // Only delete from disk now if it's an unsaved draft. The original
    // (if any) is deleted on Save so Cancel can still recover it.
    if (photoUri && photoUri !== originalPhotoUri) {
      await deleteAttachment(photoUri);
    }
    setPhotoUri(undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <Pressable style={styles.dialog} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</Text>

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                value={particular}
                onChangeText={setParticular}
                placeholder="e.g. Office supplies"
                placeholderTextColor={colors.textLabel}
                autoFocus={!editingExpense}
                returnKeyType="next"
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
                returnKeyType="done"
                maxLength={15}
              />

              <View style={styles.noteLabelRow}>
                <Text style={styles.label}>Note</Text>
                {/* Multiline keyboard's return key inserts a newline, so a
                    Done button is the only way to dismiss it on both platforms. */}
                <TouchableOpacity
                  onPress={() => Keyboard.dismiss()}
                  hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Done editing note"
                >
                  <Text style={styles.noteDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder="Add a note (optional)…"
                placeholderTextColor={colors.textLabel}
                multiline
                maxLength={MAX_NOTE_LENGTH}
              />

              <Text style={styles.label}>Photo</Text>
              {photoUri ? (
                <View style={styles.photoWrap}>
                  <TouchableOpacity onPress={() => setViewerOpen(true)} activeOpacity={0.85}>
                    <Image source={{ uri: photoUri }} style={styles.photo} />
                  </TouchableOpacity>
                  <View style={styles.photoActions}>
                    <TouchableOpacity style={styles.photoBtn} onPress={() => attachPhoto('camera')}>
                      <Ionicons name="camera-outline" size={14} color={colors.textPrimary} />
                      <Text style={styles.photoBtnText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoBtn, styles.photoRemove]}
                      onPress={removePhoto}
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.danger} />
                      <Text style={[styles.photoBtnText, { color: colors.danger }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.pickerRow}>
                  <TouchableOpacity style={styles.pickerBtn} onPress={() => attachPhoto('camera')}>
                    <Ionicons name="camera-outline" size={18} color={colors.accent} />
                    <Text style={styles.pickerBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pickerBtn} onPress={() => attachPhoto('gallery')}>
                    <Ionicons name="images-outline" size={18} color={colors.accent} />
                    <Text style={styles.pickerBtnText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.buttons}>
                <Button title="Cancel" variant="secondary" onPress={handleCancel} style={styles.flexBtn} />
                <Button title={editingExpense ? 'Save' : 'Add'} onPress={handleSubmit} style={styles.flexBtn} />
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>

      {/* Fullscreen photo viewer — pinch / double-tap to zoom */}
      <PhotoViewer
        uri={viewerOpen ? photoUri ?? null : null}
        onClose={() => setViewerOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  kav: { width: '100%', maxWidth: 400, maxHeight: '90%' },
  dialog: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  title: {
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
  noteInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  noteLabelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  noteDone: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pickerBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
  },
  photoWrap: { gap: spacing.sm },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.bgSurface,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  photoBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  photoRemove: {
    backgroundColor: colors.dangerSoft,
  },
  error: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    marginTop: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  flexBtn: { flex: 1 },
});
