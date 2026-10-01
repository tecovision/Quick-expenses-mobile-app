import AsyncStorage from '@react-native-async-storage/async-storage';
import { Currency, DeletedExpenseFile, ExpenseFile, Note, TodoItem } from '../types';
import { DEFAULT_CURRENCY } from '../constants/currencies';
import { approxRate } from '../constants/approxRates';
import { captureError } from './monitoring';

const KEYS = {
  files:        '@quickexpenses/files',
  deletedFiles: '@quickexpenses/deleted_files',
  currency:     '@quickexpenses/currency',
  firstLaunch:  '@quickexpenses/first_launch',
  seeded:       '@quickexpenses/seeded',
  reminder:     '@quickexpenses/reminder',
  downloadDir:  '@quickexpenses/download_dir',
  noticeAck:    '@quickexpenses/notice_ack',
  todos:        '@quickexpenses/todos',
  notes:        '@quickexpenses/notes',
  converter:    '@quickexpenses/converter',
  biometric:    '@quickexpenses/biometric_enabled',
  bioPromptAck: '@quickexpenses/biometric_prompt_ack',
} as const;

// ── Files ────────────────────────────────────────────────────────
export async function loadFiles(): Promise<ExpenseFile[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.files);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    captureError(e, { op: 'loadFiles' });
    return [];
  }
}

export async function saveFiles(files: ExpenseFile[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.files, JSON.stringify(files));
  } catch (e) {
    // A failed write means the user silently loses data — always report.
    captureError(e, { op: 'saveFiles', count: files.length });
  }
}

// ── Recently Deleted ─────────────────────────────────────────────
// Note: returns ALL stored entries. The 30-day prune lives in the store
// (loadData) so it can also delete the pruned files' photo attachments.
export async function loadDeletedFiles(): Promise<DeletedExpenseFile[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.deletedFiles);
    if (!data) return [];
    const parsed: DeletedExpenseFile[] = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    captureError(e, { op: 'loadDeletedFiles' });
    return [];
  }
}

export async function saveDeletedFiles(files: DeletedExpenseFile[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.deletedFiles, JSON.stringify(files));
  } catch (e) {
    captureError(e, { op: 'saveDeletedFiles', count: files.length });
  }
}

// ── Currency ─────────────────────────────────────────────────────
export async function loadCurrency(): Promise<Currency> {
  try {
    const data = await AsyncStorage.getItem(KEYS.currency);
    return data ? JSON.parse(data) : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export async function saveCurrency(currency: Currency): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.currency, JSON.stringify(currency));
  } catch (e) {
    captureError(e, { op: 'saveCurrency' });
  }
}

// ── First-launch flag ────────────────────────────────────────────
export async function isFirstLaunch(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEYS.firstLaunch);
    return val === null;
  } catch {
    return false;
  }
}

export async function markLaunched(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.firstLaunch, '1');
  } catch { /* non-critical */ }
}

// ── Default-files seeding flag ───────────────────────────────────
// Kept separate from firstLaunch so installs that launched an earlier
// build (before seeding existed) still get the starter files once. Once
// set, the defaults are never re-seeded — so deleting them sticks.
export async function hasSeeded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.seeded)) !== null;
  } catch {
    return true; // on error, don't risk duplicate seeding
  }
}

export async function markSeeded(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.seeded, '1');
  } catch { /* non-critical */ }
}

// ── First-run privacy / terms notice ────────────────────────────
// Tracked separately from firstLaunch so an existing install that updates
// into this version still sees the notice once.
export async function hasAcknowledgedNotice(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.noticeAck)) !== null;
  } catch {
    return true; // on error, don't nag
  }
}

export async function markNoticeAcknowledged(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.noticeAck, '1');
  } catch { /* non-critical */ }
}

// ── Daily reminder preferences ───────────────────────────────────
export interface ReminderPrefs {
  enabled: boolean;
  hour: number;    // 0–23, local time
  minute: number;  // 0–59
}

export const DEFAULT_REMINDER: ReminderPrefs = { enabled: false, hour: 20, minute: 0 };

export async function loadReminderPrefs(): Promise<ReminderPrefs> {
  try {
    const data = await AsyncStorage.getItem(KEYS.reminder);
    if (!data) return DEFAULT_REMINDER;
    const p = JSON.parse(data) ?? {};
    const hour   = Number.isInteger(p.hour)   && p.hour   >= 0 && p.hour   <= 23 ? p.hour   : DEFAULT_REMINDER.hour;
    const minute = Number.isInteger(p.minute) && p.minute >= 0 && p.minute <= 59 ? p.minute : DEFAULT_REMINDER.minute;
    return { enabled: !!p.enabled, hour, minute };
  } catch {
    return DEFAULT_REMINDER;
  }
}

export async function saveReminderPrefs(prefs: ReminderPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.reminder, JSON.stringify(prefs));
  } catch (e) {
    captureError(e, { op: 'saveReminderPrefs' });
  }
}

// ── Download folder (Android Storage Access Framework) ───────────
// The content:// URI of the folder the user last picked to save exports
// into, so we don't prompt for it on every download.
export async function loadDownloadDir(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.downloadDir);
  } catch {
    return null;
  }
}

export async function saveDownloadDir(uri: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.downloadDir, uri);
  } catch (e) {
    captureError(e, { op: 'saveDownloadDir' });
  }
}

export async function clearDownloadDir(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.downloadDir);
  } catch { /* non-critical */ }
}

// ── To-Do list ────────────────────────────────────────────────────
export async function loadTodos(): Promise<TodoItem[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.todos);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    captureError(e, { op: 'loadTodos' });
    return [];
  }
}

export async function saveTodos(todos: TodoItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.todos, JSON.stringify(todos));
  } catch (e) {
    captureError(e, { op: 'saveTodos', count: todos.length });
  }
}

// ── Notepad ──────────────────────────────────────────────────────
export async function loadNotes(): Promise<Note[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.notes);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    captureError(e, { op: 'loadNotes' });
    return [];
  }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.notes, JSON.stringify(notes));
  } catch (e) {
    captureError(e, { op: 'saveNotes', count: notes.length });
  }
}

// ── Currency converter ──────────────────────────────────────────
// A manual rate the user sets and edits — the app is offline and never
// fetches live rates. Seeded from a rough static table the first time a
// pair is picked (see constants/approxRates.ts).
export interface ConverterPrefs {
  primary: string;   // currency code
  secondary: string; // currency code
  rate: number;       // 1 `primary` = `rate` `secondary`
}

export function defaultConverterPrefs(): ConverterPrefs {
  return { primary: 'USD', secondary: 'INR', rate: approxRate('USD', 'INR') };
}

export async function loadConverterPrefs(): Promise<ConverterPrefs> {
  try {
    const data = await AsyncStorage.getItem(KEYS.converter);
    if (!data) return defaultConverterPrefs();
    const p = JSON.parse(data) ?? {};
    const fallback = defaultConverterPrefs();
    return {
      primary:   typeof p.primary === 'string' ? p.primary : fallback.primary,
      secondary: typeof p.secondary === 'string' ? p.secondary : fallback.secondary,
      rate:      Number.isFinite(p.rate) && p.rate > 0 ? p.rate : fallback.rate,
    };
  } catch {
    return defaultConverterPrefs();
  }
}

export async function saveConverterPrefs(prefs: ConverterPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.converter, JSON.stringify(prefs));
  } catch (e) {
    captureError(e, { op: 'saveConverterPrefs' });
  }
}

// ── Biometric app lock ───────────────────────────────────────────
// We never store, see, or handle any biometric data ourselves — this flag
// only remembers whether the user asked the OS to gate the app behind
// Face ID / fingerprint. The actual check happens in the OS each time.
export async function loadBiometricEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.biometric)) === '1';
  } catch {
    return false;
  }
}

export async function saveBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    if (enabled) await AsyncStorage.setItem(KEYS.biometric, '1');
    else await AsyncStorage.removeItem(KEYS.biometric);
  } catch (e) {
    captureError(e, { op: 'saveBiometricEnabled' });
  }
}

// One-time "enable Face ID / fingerprint?" offer, shown after the first-run
// notice. Tracked separately so it never nags again once answered either way.
export async function hasSeenBiometricPrompt(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.bioPromptAck)) !== null;
  } catch {
    return true;
  }
}

export async function markBiometricPromptSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.bioPromptAck, '1');
  } catch { /* non-critical */ }
}

// ── Nuclear option ───────────────────────────────────────────────
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch (e) {
    captureError(e, { op: 'clearAllData' });
  }
}
