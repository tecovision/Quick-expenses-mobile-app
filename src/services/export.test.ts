import * as FileSystem from 'expo-file-system/legacy';
import * as storage from './storage';
import { safeFileName, escapeHtml, csvCell, downloadCSV } from './export';
import { ExpenseFile } from '../types';

jest.mock('./storage');
jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(),
    createFileAsync: jest.fn(),
  },
}));

const mockedStorage = storage as jest.Mocked<typeof storage>;
const SAF = FileSystem.StorageAccessFramework as jest.Mocked<typeof FileSystem.StorageAccessFramework>;
const writeAsStringAsync = FileSystem.writeAsStringAsync as jest.Mock;

const makeFile = (): ExpenseFile => ({
  id: 'f1', name: 'June Trip', createdAt: '', updatedAt: '',
  expenses: [{ id: 'e1', particular: 'Taxi', amount: 12.5, createdAt: '2026-06-01T10:00:00Z' }],
});

describe('escapeHtml', () => {
  it('neutralizes a script tag injected via a file or expense name', () => {
    const out = escapeHtml('<script>alert(1)</script>');
    expect(out).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(out).not.toContain('<script>');
  });

  it('escapes attribute-breaking quotes', () => {
    expect(escapeHtml('" onerror="x')).toBe('&quot; onerror=&quot;x');
  });

  it('escapes ampersands first so entities are not double-broken', () => {
    expect(escapeHtml('a & <b>')).toBe('a &amp; &lt;b&gt;');
  });

  it('leaves ordinary text untouched', () => {
    expect(escapeHtml('Office supplies 2024')).toBe('Office supplies 2024');
  });
});

describe('csvCell', () => {
  it('quotes ordinary values', () => {
    expect(csvCell('Taxi fare')).toBe('"Taxi fare"');
  });

  it('escapes embedded double quotes by doubling them', () => {
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
  });

  it('keeps commas and newlines contained within the quoted cell', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  // Formula injection: Excel/Sheets execute cells starting with = + - @
  it.each(['=1+1', '+1', '-1', '@SUM(A1)'])(
    'neutralizes formula injection for %s',
    (payload) => {
      const out = csvCell(payload);
      expect(out).toBe(`"'${payload}"`);
    }
  );

  it('neutralizes a classic command-execution payload', () => {
    const out = csvCell('=cmd|\' /C calc\'!A0');
    expect(out.startsWith('"\'=')).toBe(true);
  });

  it('does not prefix values that merely contain an operator', () => {
    expect(csvCell('10-20 range')).toBe('"10-20 range"');
  });
});

describe('safeFileName', () => {
  it('strips path traversal sequences', () => {
    const out = safeFileName('../../etc/passwd');
    expect(out).not.toContain('..');
    expect(out).not.toContain('/');
  });

  it('replaces spaces with underscores', () => {
    expect(safeFileName('My Expenses 2024')).toBe('My_Expenses_2024');
  });

  it('falls back when the name has no usable characters', () => {
    expect(safeFileName('///')).toBe('expense_file');
    expect(safeFileName('')).toBe('expense_file');
  });

  it('caps the length', () => {
    expect(safeFileName('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe('downloadCSV (Android)', () => {
  const ORIGINAL_OS = require('react-native').Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    require('react-native').Platform.OS = 'android';
    SAF.createFileAsync.mockResolvedValue('content://downloads/June_Trip.csv');
    SAF.requestDirectoryPermissionsAsync.mockResolvedValue({
      granted: true, directoryUri: 'content://tree/downloads',
    } as any);
  });

  afterAll(() => { require('react-native').Platform.OS = ORIGINAL_OS; });

  it('writes straight into a previously granted folder without prompting', async () => {
    mockedStorage.loadDownloadDir.mockResolvedValue('content://tree/downloads');

    const res = await downloadCSV(makeFile());

    expect(res).toEqual({ status: 'saved' });
    expect(SAF.requestDirectoryPermissionsAsync).not.toHaveBeenCalled();
    expect(SAF.createFileAsync).toHaveBeenCalledWith(
      'content://tree/downloads', 'June_Trip', 'text/csv'
    );
    expect(writeAsStringAsync).toHaveBeenCalled();
  });

  it('asks for a folder the first time and remembers it', async () => {
    mockedStorage.loadDownloadDir.mockResolvedValue(null);

    const res = await downloadCSV(makeFile());

    expect(res).toEqual({ status: 'saved' });
    expect(SAF.requestDirectoryPermissionsAsync).toHaveBeenCalled();
    expect(mockedStorage.saveDownloadDir).toHaveBeenCalledWith('content://tree/downloads');
  });

  it('drops a stale grant, re-asks, and still saves', async () => {
    mockedStorage.loadDownloadDir.mockResolvedValue('content://tree/gone');
    SAF.createFileAsync
      .mockRejectedValueOnce(new Error('permission revoked'))
      .mockResolvedValueOnce('content://tree/downloads/June_Trip.csv');

    const res = await downloadCSV(makeFile());

    expect(res).toEqual({ status: 'saved' });
    expect(mockedStorage.clearDownloadDir).toHaveBeenCalled();
    expect(SAF.requestDirectoryPermissionsAsync).toHaveBeenCalled();
  });

  it('reports cancellation when the user dismisses the folder picker', async () => {
    mockedStorage.loadDownloadDir.mockResolvedValue(null);
    SAF.requestDirectoryPermissionsAsync.mockResolvedValue({ granted: false } as any);

    const res = await downloadCSV(makeFile());

    expect(res).toEqual({ status: 'cancelled' });
    expect(writeAsStringAsync).not.toHaveBeenCalled();
  });
});
