import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '@/store/useStore';
import { EmptyState } from '@/components/EmptyState';
import { colors, typography, spacing, radius } from '@/constants/theme';
import { TodoItem } from '@/types';

const MAX_TODO_LENGTH = 200;

function TodoRow({
  item, onToggle, onDelete,
}: {
  item: TodoItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={onToggle}
        style={styles.checkbox}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.done }}
      >
        <Ionicons
          name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={item.done ? colors.accent : colors.textLabel}
        />
      </TouchableOpacity>
      <Text style={[styles.rowText, item.done && styles.rowTextDone]} numberOfLines={3}>
        {item.text}
      </Text>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.text}`}
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

export default function TodoScreen() {
  const todos = useStore(s => s.todos);
  const addTodo = useStore(s => s.addTodo);
  const toggleTodo = useStore(s => s.toggleTodo);
  const deleteTodo = useStore(s => s.deleteTodo);
  const clearCompletedTodos = useStore(s => s.clearCompletedTodos);

  const [text, setText] = useState('');

  const remaining = useMemo(() => todos.filter(t => !t.done).length, [todos]);
  const hasCompleted = useMemo(() => todos.some(t => t.done), [todos]);

  const handleAdd = () => {
    if (!text.trim()) return;
    addTodo(text);
    setText('');
  };

  const handleDelete = (item: TodoItem) => {
    Alert.alert('Delete Task', `Delete "${item.text}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTodo(item.id) },
    ]);
  };

  const handleClearCompleted = () => {
    Alert.alert('Clear Completed', 'Remove every checked-off task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearCompletedTodos },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
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
        <View style={styles.headerText}>
          <Text style={styles.title}>To-Do List</Text>
          {todos.length > 0 && (
            <Text style={styles.subtitle}>{remaining} remaining</Text>
          )}
        </View>
        {hasCompleted ? (
          <TouchableOpacity onPress={handleClearCompleted} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearAll}>Clear done</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <FlatList
        data={todos}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TodoRow
            item={item}
            onToggle={() => toggleTodo(item.id)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="checkbox-outline"
            title="Nothing to do"
            subtitle="Add your first task below"
          />
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Add a task…"
            placeholderTextColor={colors.textLabel}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            maxLength={MAX_TODO_LENGTH}
          />
          <TouchableOpacity
            style={[styles.addBtn, !text.trim() && styles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!text.trim()}
            accessibilityRole="button"
            accessibilityLabel="Add task"
          >
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: { padding: spacing.xs },
  headerText: { flex: 1 },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  clearAll: {
    fontSize: typography.sizes.sm,
    color: colors.danger,
    fontWeight: typography.weights.medium,
  },

  list: { paddingHorizontal: spacing.base, paddingBottom: spacing.base, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  checkbox: {},
  rowText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
  },
  rowTextDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.bgCard,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
});
