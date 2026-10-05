import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  Modal, Pressable, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore } from '@/store/useStore';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { colors, typography, spacing, radius, shadows } from '@/constants/theme';
import { timeAgo } from '@/utils/helpers';
import { Note } from '@/types';

const MAX_TITLE_LENGTH = 100;
const MAX_BODY_LENGTH = 5000;

export default function NotesScreen() {
  const notes = useStore(s => s.notes);
  const addNote = useStore(s => s.addNote);
  const updateNote = useStore(s => s.updateNote);
  const deleteNote = useStore(s => s.deleteNote);

  const sorted = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes]
  );

  const [editing, setEditing] = useState<Note | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const openNew = () => {
    setIsNew(true);
    setEditing(null);
    setTitle('');
    setBody('');
  };

  const openExisting = (note: Note) => {
    setIsNew(false);
    setEditing(note);
    setTitle(note.title);
    setBody(note.body);
  };

  const close = () => {
    setEditing(null);
    setIsNew(false);
  };

  const visible = isNew || editing !== null;

  const handleSave = () => {
    if (!title.trim() && !body.trim()) return close();
    if (isNew) addNote(title, body);
    else if (editing) updateNote(editing.id, title, body);
    close();
  };

  const handleDelete = (note: Note) => {
    Alert.alert('Delete Note', `Delete "${note.title || 'Untitled'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteNote(note.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.title}>Notepad</Text>
        <IconButton name="add" onPress={openNew} variant="tinted" accessibilityLabel="New note" />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openExisting(item)} activeOpacity={0.75}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
              {item.body ? (
                <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
              ) : null}
              <Text style={styles.cardMeta}>{timeAgo(item.updatedAt)}</Text>
            </View>
            <IconButton
              name="trash-outline"
              onPress={() => handleDelete(item)}
              variant="ghost"
              size={16}
              color={colors.danger}
              accessibilityLabel={`Delete ${item.title || 'note'}`}
              style={styles.cardDeleteBtn}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No notes yet"
            subtitle="Tap + to write your first note"
          />
        }
      />

      {/* Editor */}
      <Modal visible={visible} animationType="slide" onRequestClose={handleSave}>
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView
            style={styles.editorFlex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.header}>
              <IconButton name="chevron-back" onPress={handleSave} accessibilityLabel="Save and close" />
              <Text style={styles.title}>{isNew ? 'New Note' : 'Edit Note'}</Text>
              <View style={{ width: 40 }} />
            </View>
            <Pressable style={styles.editorBody} onPress={() => {}}>
              <TextInput
                style={styles.titleInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Title"
                placeholderTextColor={colors.textLabel}
                maxLength={MAX_TITLE_LENGTH}
                autoFocus={isNew}
              />
              <TextInput
                style={styles.bodyInput}
                value={body}
                onChangeText={setBody}
                placeholder="Start typing…"
                placeholderTextColor={colors.textLabel}
                multiline
                textAlignVertical="top"
                maxLength={MAX_BODY_LENGTH}
              />
            </Pressable>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },

  list: { paddingHorizontal: spacing.base, paddingBottom: spacing.xxl, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  cardDeleteBtn: { width: 28, height: 28 },
  cardLeft: { flex: 1 },
  cardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  cardBody: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: typography.sizes.xs,
    color: colors.textLabel,
  },

  editorFlex: { flex: 1 },
  editorBody: { flex: 1, paddingHorizontal: spacing.base },
  titleInput: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  bodyInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
    lineHeight: 22,
    paddingTop: spacing.sm,
  },
});
