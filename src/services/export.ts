import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import JSZip from 'jszip';
import { Currency, Expense, ExpenseFile } from '../types';
import { formatCurrency, fileTotal, formatDate, formatDateTime } from '../utils/helpers';
import { loadDownloadDir, saveDownloadDir, clearDownloadDir } from './storage';

type CurrencyFormat = Pick<Currency, 'symbol' | 'locale'>;

/** Result of a "save to device" request. */
export type SaveResult =
  | { status: 'saved'; uri: string; mimeType: string }  // written to the folder the user picked (Android)
  | { status: 'shared' }                                // handed to the system (iOS — no shared folder)
  | { status: 'cancelled' };                            // user dismissed the folder picker

/**
 * Open a just-saved file in whatever app the device uses for that type.
 * Android: an ACTION_VIEW intent with a temporary read grant. iOS: the
 * share sheet. Throws if nothing can handle the file.
 */
export async function openSavedFile(uri: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'android') {
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: uri,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      type: mimeType,
    });
    return;
  }
  await Sharing.shareAsync(uri, { mimeType });
}

/** Exported for tests. Strips path separators and other unsafe characters. */
export const safeFileName = (name: string): string =>
  name.replace(/[^a-z0-9_\-\s]/gi, '').replace(/\s+/g, '_').slice(0, 80) || 'expense_file';

/** Exported for tests. */
export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Quote a CSV cell and neutralize spreadsheet formula injection: a leading
 * =, +, - or @ makes Excel/Sheets execute the cell as a formula, so prefix
 * those with an apostrophe (rendered invisibly by spreadsheet apps).
 *
 * Exported for tests.
 */
export const csvCell = (s: string): string => {
  const guarded = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${guarded.replace(/"/g, '""')}"`;
};

const cacheDir = (): string => {
  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new Error('Cache directory unavailable');
  return dir;
};

/**
 * Build a lookup map: expense id → 1-based position in the full list.
 * When exporting filtered results, pass the original full expenses array
 * so serial numbers reflect the true entry position, not just the subset.
 */
function buildIndexMap(originalExpenses: Expense[]): Map<string, number> {
  const map = new Map<string, number>();
  originalExpenses.forEach((e, i) => map.set(e.id, i + 1));
  return map;
}

function buildHtml(
  file: ExpenseFile,
  indexMap: Map<string, number>,
  currency?: CurrencyFormat,
): string {
  const rows = file.expenses
    .map((e) => {
      const sno = indexMap.get(e.id) ?? '—';
      const noteRow = e.note
        ? `<div class="note">${escapeHtml(e.note)}</div>`
        : '';
      return `
        <tr>
          <td>${sno}</td>
          <td>
            <div class="particular">${escapeHtml(e.particular)}</div>
            ${noteRow}
          </td>
          <td class="amount">${formatCurrency(e.amount, currency)}</td>
          <td class="datetime">${formatDateTime(e.createdAt)}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Helvetica, sans-serif; padding: 40px; color: #1C1C1E; background: #fff; }
    h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 6px; }
    .meta { color: #787776; font-size: 13px; margin-bottom: 32px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #F2F2F7; padding: 10px 14px; text-align: left; font-size: 11px; color: #787776; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 11px 14px; border-bottom: 1px solid rgba(60,60,67,0.1); font-size: 14px; vertical-align: top; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .datetime { font-size: 12px; color: #555; white-space: nowrap; }
    .particular { font-weight: 500; }
    .note { font-size: 12px; color: #6e6e73; margin-top: 4px; font-style: italic; line-height: 1.4; }
    .total td { font-weight: 600; background: #F9F9F9; font-size: 15px; }
    th:nth-child(1), td:nth-child(1) { width: 48px; }
    th:last-child, td:last-child { width: 160px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(file.name)}</h1>
  <p class="meta">${file.expenses.length} expense${file.expenses.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Generated ${formatDate(new Date().toISOString())}</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Particular</th>
        <th style="text-align:right">Amount</th>
        <th>Date &amp; Time Added</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total">
        <td colspan="2">Total</td>
        <td class="amount">${formatCurrency(fileTotal(file.expenses), currency)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}

function buildCsv(file: ExpenseFile, indexMap: Map<string, number>): string {
  const header = 'No.,Particular,Amount,Note,Date & Time Added\n';
  const rows = file.expenses
    .map((e) => {
      const sno = indexMap.get(e.id) ?? '';
      return [
        sno,
        csvCell(e.particular),
        // Fixed 2 decimals so the CSV matches the on-screen and PDF amount
        // exactly. Still a bare (unquoted) number, so Excel/Sheets sum it.
        e.amount.toFixed(2),
        csvCell(e.note ?? ''),
        csvCell(formatDateTime(e.createdAt)),
      ].join(',');
    })
    .join('\n');
  const footer = `\nTotal,,${fileTotal(file.expenses).toFixed(2)},,`;
  return header + rows + footer;
}

// ── Single-file exports (share sheet) ────────────────────────────
export async function exportToPDF(
  file: ExpenseFile,
  originalExpenses?: Expense[],
  currency?: CurrencyFormat,
): Promise<void> {
  const indexMap = buildIndexMap(originalExpenses ?? file.expenses);
  const html = buildHtml(file, indexMap, currency);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf' });
}

export async function exportToCSV(
  file: ExpenseFile,
  originalExpenses?: Expense[],
  currency?: CurrencyFormat,
): Promise<void> {
  const indexMap = buildIndexMap(originalExpenses ?? file.expenses);
  const csv = buildCsv(file, indexMap);
  const path = `${cacheDir()}${safeFileName(file.name)}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: '.csv' });
}

// ── Download to device storage ──────────────────────────────────
// Android: write into a folder the user grants once via the Storage Access
// Framework (typically Downloads). The grant is remembered so later
// downloads are silent. iOS has no shared Downloads folder, so there we
// fall back to the system sheet, where "Save to Files" is the equivalent.

const SAF = FileSystem.StorageAccessFramework;

async function writeToUserFolder(
  baseName: string,
  mimeType: string,
  data: string,
  encoding: FileSystem.EncodingType,
): Promise<SaveResult> {
  let dirUri = await loadDownloadDir();

  const createAndWrite = async (dir: string): Promise<string> => {
    const fileUri = await SAF.createFileAsync(dir, baseName, mimeType);
    await FileSystem.writeAsStringAsync(fileUri, data, { encoding });
    return fileUri;
  };

  if (dirUri) {
    try {
      const uri = await createAndWrite(dirUri);
      return { status: 'saved', uri, mimeType };
    } catch {
      // The saved grant is stale (folder deleted, permission revoked, OS
      // cleared it). Drop it and fall through to ask again.
      await clearDownloadDir();
      dirUri = null;
    }
  }

  const perm = await SAF.requestDirectoryPermissionsAsync();
  if (!perm.granted) return { status: 'cancelled' };
  await saveDownloadDir(perm.directoryUri);
  const uri = await createAndWrite(perm.directoryUri);
  return { status: 'saved', uri, mimeType };
}

async function saveToDevice(
  baseName: string,
  mimeType: string,
  data: string,
  encoding: FileSystem.EncodingType,
): Promise<SaveResult> {
  if (Platform.OS === 'android') {
    return writeToUserFolder(baseName, mimeType, data, encoding);
  }
  // iOS: hand the file to the system sheet ("Save to Files").
  const ext = mimeType === 'application/pdf' ? 'pdf' : 'csv';
  const path = `${cacheDir()}${baseName}.${ext}`;
  await FileSystem.writeAsStringAsync(path, data, { encoding });
  await Sharing.shareAsync(path, { mimeType });
  return { status: 'shared' };
}

export async function downloadCSV(
  file: ExpenseFile,
  originalExpenses?: Expense[],
): Promise<SaveResult> {
  const indexMap = buildIndexMap(originalExpenses ?? file.expenses);
  const csv = buildCsv(file, indexMap);
  return saveToDevice(
    safeFileName(file.name),
    'text/csv',
    csv,
    FileSystem.EncodingType.UTF8,
  );
}

export async function downloadPDF(
  file: ExpenseFile,
  originalExpenses?: Expense[],
  currency?: CurrencyFormat,
): Promise<SaveResult> {
  const indexMap = buildIndexMap(originalExpenses ?? file.expenses);
  const html = buildHtml(file, indexMap, currency);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  try {
    const b64 = await readFileBase64(uri);
    return await saveToDevice(
      safeFileName(file.name),
      'application/pdf',
      b64,
      FileSystem.EncodingType.Base64,
    );
  } finally {
    try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch { /* ignore */ }
  }
}

// ── Bulk export: every file zipped together ──────────────────────
async function readFileBase64(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/**
 * Build a single ZIP archive containing every file exported as `format`.
 * Returns the absolute cache path of the resulting .zip.
 *
 * Duplicate file names get suffixed (_2, _3…) so nothing is overwritten
 * inside the archive.
 */
export async function exportAllAsZip(
  files: ExpenseFile[],
  format: 'pdf' | 'csv',
  currency?: CurrencyFormat,
): Promise<void> {
  if (files.length === 0) throw new Error('No files to export.');

  const zip = new JSZip();
  const used = new Map<string, number>();

  for (const file of files) {
    const indexMap = buildIndexMap(file.expenses);
    let base = safeFileName(file.name);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    if (seen > 0) base = `${base}_${seen + 1}`;

    if (format === 'csv') {
      zip.file(`${base}.csv`, buildCsv(file, indexMap));
    } else {
      const html = buildHtml(file, indexMap, currency);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const b64 = await readFileBase64(uri);
      zip.file(`${base}.pdf`, b64, { base64: true });
      try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch { /* ignore */ }
    }
  }

  const base64Zip = await zip.generateAsync({ type: 'base64' });
  const stamp = new Date().toISOString().slice(0, 10);
  const zipPath = `${cacheDir()}QuickExpenses_${format}_${stamp}.zip`;
  await FileSystem.writeAsStringAsync(zipPath, base64Zip, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await Sharing.shareAsync(zipPath, { mimeType: 'application/zip', UTI: 'public.zip-archive' });
}
