import AsyncStorage from '@react-native-async-storage/async-storage';
import { Currency, DeletedExpenseFile, ExpenseFile } from '../types';
import { DEFAULT_CURRENCY } from '../constants/currencies';
import { captureError } from './monitoring';

const KEYS = {
  files:        '@quickexpenses/files',
  deletedFiles: '@quickexpenses/deleted_files',
  currency:     '@quickexpenses/currency',
  firstLaunch:  '@quickexpenses/first_launch',
  seeded:       '@quickexpenses/seeded',
  reminder:     '@quickexpenses/reminder',
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

// ── Nuclear option ───────────────────────────────────────────────
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch (e) {
    captureError(e, { op: 'clearAllData' });
  }
}
