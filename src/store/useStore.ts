import { create } from 'zustand';
import { Currency, DeletedExpenseFile, Expense, ExpenseFile } from '../types';
import {
  loadFiles, saveFiles,
  loadDeletedFiles, saveDeletedFiles,
  loadCurrency, saveCurrency,
  isFirstLaunch, markLaunched,
  hasSeeded, markSeeded,
  loadReminderPrefs, saveReminderPrefs, DEFAULT_REMINDER, ReminderPrefs,
} from '../services/storage';
import { deleteAttachment } from '../services/attachments';
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '../services/notifications';
import { DEFAULT_CURRENCY } from '../constants/currencies';
import { uid } from '../utils/helpers';

const DELETED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Fire-and-forget removal of every photo attached to a file's expenses. */
function deleteFileAttachments(file: ExpenseFile): void {
  for (const expense of file.expenses) {
    if (expense.photoUri) void deleteAttachment(expense.photoUri);
  }
}

interface StoreState {
  files: ExpenseFile[];
  deletedFiles: DeletedExpenseFile[];
  currency: Currency;
  isLoading: boolean;
  showCurrencyPickerOnLaunch: boolean;
  reminder: ReminderPrefs;

  loadData: () => Promise<void>;
  getFile: (id: string) => ExpenseFile | undefined;

  // ── Daily reminder ─────────────────────────────────────────────
  /** Turn the reminder on/off. Returns false if permission was denied. */
  setReminderEnabled: (enabled: boolean) => Promise<boolean>;
  /** Change the reminder time (and reschedule if it is currently on). */
  setReminderTime: (hour: number, minute: number) => Promise<void>;

  // ── Files ──────────────────────────────────────────────────────
  addFile: (name: string) => void;
  /** Soft-deletes: moves to Recently Deleted (kept for 30 days). */
  deleteFile: (id: string) => void;
  restoreFile: (id: string) => void;
  permanentlyDeleteFile: (id: string) => void;
  clearDeletedFiles: () => void;
  renameFile: (id: string, name: string) => void;

  // ── Expenses ───────────────────────────────────────────────────
  addExpense: (
    fileId: string,
    particular: string,
    amount: number,
    extras?: { note?: string; photoUri?: string }
  ) => void;
  updateExpense: (
    fileId: string,
    expId: string,
    particular: string,
    amount: number,
    extras?: { note?: string; photoUri?: string }
  ) => void;
  deleteExpense: (fileId: string, expId: string) => void;

  // ── Currency ───────────────────────────────────────────────────
  setCurrency: (currency: Currency) => void;
  markCurrencyPickerShown: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  files: [],
  deletedFiles: [],
  currency: DEFAULT_CURRENCY,
  isLoading: true,
  showCurrencyPickerOnLaunch: false,
  reminder: DEFAULT_REMINDER,

  loadData: async () => {
    const [files, allDeletedFiles, currency, firstLaunch, seeded, reminder] = await Promise.all([
      loadFiles(),
      loadDeletedFiles(),
      loadCurrency(),
      isFirstLaunch(),
      hasSeeded(),
      loadReminderPrefs(),
    ]);

    // Re-assert the scheduled reminder on every launch — cheap, and it
    // recovers from an OS that dropped scheduled notifications after a
    // reboot or app update.
    if (reminder.enabled) {
      void scheduleDailyReminder(reminder.hour, reminder.minute);
    }

    // 30-day retention: prune expired entries from Recently Deleted and
    // remove their photo attachments from disk so nothing leaks.
    const cutoff = Date.now() - DELETED_RETENTION_MS;
    const deletedFiles = allDeletedFiles.filter(
      f => new Date(f.deletedAt).getTime() > cutoff
    );
    if (deletedFiles.length !== allDeletedFiles.length) {
      allDeletedFiles
        .filter(f => new Date(f.deletedAt).getTime() <= cutoff)
        .forEach(deleteFileAttachments);
      saveDeletedFiles(deletedFiles);
    }

    // Seed two starter files exactly once, if the install has no files yet.
    // Tracked by its own flag (not firstLaunch) so installs that already
    // launched an earlier build still get them. Once seeded, they never come
    // back — deleting them sticks.
    let seededFiles = files;
    if (!seeded) {
      markSeeded(); // fire-and-forget; don't await
      if (files.length === 0) {
        const now = new Date().toISOString();
        seededFiles = [
          { id: uid(), name: 'Expense 1', expenses: [], createdAt: now, updatedAt: now },
          { id: uid(), name: 'Expense 2', expenses: [], createdAt: now, updatedAt: now },
        ];
        saveFiles(seededFiles);
      }
    }

    if (firstLaunch) markLaunched(); // fire-and-forget; don't await
    set({
      files: seededFiles,
      deletedFiles,
      currency,
      isLoading: false,
      showCurrencyPickerOnLaunch: firstLaunch,
      reminder,
    });
  },

  getFile: (id) => get().files.find(f => f.id === id),

  addFile: (name) => {
    const file: ExpenseFile = {
      id: uid(),
      name: name.trim() || 'Untitled',
      expenses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const files = [file, ...get().files];
    set({ files });
    saveFiles(files);
  },

  deleteFile: (id) => {
    const file = get().files.find(f => f.id === id);
    if (!file) return;
    const deleted: DeletedExpenseFile = { ...file, deletedAt: new Date().toISOString() };
    const files = get().files.filter(f => f.id !== id);
    const deletedFiles = [deleted, ...get().deletedFiles];
    set({ files, deletedFiles });
    saveFiles(files);
    saveDeletedFiles(deletedFiles);
  },

  restoreFile: (id) => {
    const file = get().deletedFiles.find(f => f.id === id);
    if (!file) return;
    const { deletedAt, ...restored } = file;
    const files = [restored, ...get().files];
    const deletedFiles = get().deletedFiles.filter(f => f.id !== id);
    set({ files, deletedFiles });
    saveFiles(files);
    saveDeletedFiles(deletedFiles);
  },

  permanentlyDeleteFile: (id) => {
    const target = get().deletedFiles.find(f => f.id === id);
    if (target) deleteFileAttachments(target);
    const deletedFiles = get().deletedFiles.filter(f => f.id !== id);
    set({ deletedFiles });
    saveDeletedFiles(deletedFiles);
  },

  clearDeletedFiles: () => {
    get().deletedFiles.forEach(deleteFileAttachments);
    set({ deletedFiles: [] });
    saveDeletedFiles([]);
  },

  renameFile: (id, name) => {
    const files = get().files.map(f =>
      f.id === id
        ? { ...f, name: name.trim() || f.name, updatedAt: new Date().toISOString() }
        : f
    );
    set({ files });
    saveFiles(files);
  },

  addExpense: (fileId, particular, amount, extras) => {
    const note      = extras?.note?.trim();
    const photoUri  = extras?.photoUri;
    const expense: Expense = {
      id: uid(),
      particular: particular.trim(),
      amount,
      createdAt: new Date().toISOString(),
      ...(note     ? { note }     : {}),
      ...(photoUri ? { photoUri } : {}),
    };
    const files = get().files.map(f =>
      f.id === fileId
        ? { ...f, expenses: [...f.expenses, expense], updatedAt: new Date().toISOString() }
        : f
    );
    set({ files });
    saveFiles(files);
  },

  updateExpense: (fileId, expId, particular, amount, extras) => {
    const noteTrimmed = extras?.note?.trim();
    const files = get().files.map(f =>
      f.id === fileId
        ? {
            ...f,
            expenses: f.expenses.map(e =>
              e.id === expId
                ? {
                    ...e,
                    particular: particular.trim(),
                    amount,
                    // When extras is undefined the caller doesn't touch note/photo.
                    // When extras is present, an empty/undefined field clears it.
                    ...(extras
                      ? {
                          note:     noteTrimmed || undefined,
                          photoUri: extras.photoUri || undefined,
                        }
                      : {}),
                  }
                : e
            ),
            updatedAt: new Date().toISOString(),
          }
        : f
    );
    set({ files });
    saveFiles(files);
  },

  deleteExpense: (fileId, expId) => {
    const files = get().files.map(f =>
      f.id === fileId
        ? {
            ...f,
            expenses: f.expenses.filter(e => e.id !== expId),
            updatedAt: new Date().toISOString(),
          }
        : f
    );
    set({ files });
    saveFiles(files);
  },

  setCurrency: (currency) => {
    set({ currency });
    saveCurrency(currency);
  },

  markCurrencyPickerShown: () => {
    set({ showCurrencyPickerOnLaunch: false });
  },

  setReminderEnabled: async (enabled) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) return false;
      const { hour, minute } = get().reminder;
      await scheduleDailyReminder(hour, minute);
    } else {
      await cancelDailyReminder();
    }
    const reminder = { ...get().reminder, enabled };
    set({ reminder });
    saveReminderPrefs(reminder);
    return true;
  },

  setReminderTime: async (hour, minute) => {
    const reminder = { ...get().reminder, hour, minute };
    set({ reminder });
    saveReminderPrefs(reminder);
    if (reminder.enabled) await scheduleDailyReminder(hour, minute);
  },
}));
