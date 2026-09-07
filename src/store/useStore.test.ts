import { useStore } from './useStore';
import * as storage from '../services/storage';
import * as attachments from '../services/attachments';
import * as notifications from '../services/notifications';
import { ExpenseFile } from '../types';

jest.mock('../services/storage');
jest.mock('../services/attachments');
jest.mock('../services/notifications');

const mockedStorage = storage as jest.Mocked<typeof storage>;
const mockedAttachments = attachments as jest.Mocked<typeof attachments>;
const mockedNotifications = notifications as jest.Mocked<typeof notifications>;

const DAY = 24 * 60 * 60 * 1000;

function resetStore() {
  useStore.setState({
    files: [],
    deletedFiles: [],
    isLoading: true,
    showCurrencyPickerOnLaunch: false,
    showFirstRunNotice: false,
    reminder: { enabled: false, hour: 20, minute: 0 },
  });
}

function makeFile(over: Partial<ExpenseFile> = {}): ExpenseFile {
  const now = new Date().toISOString();
  return {
    id: 'f1',
    name: 'Trip',
    expenses: [],
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
  mockedStorage.loadFiles.mockResolvedValue([]);
  mockedStorage.loadDeletedFiles.mockResolvedValue([]);
  mockedStorage.loadCurrency.mockResolvedValue({
    code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN',
  });
  mockedStorage.isFirstLaunch.mockResolvedValue(false);
  mockedStorage.hasSeeded.mockResolvedValue(true);
  mockedStorage.loadReminderPrefs.mockResolvedValue({ enabled: false, hour: 20, minute: 0 });
  mockedStorage.hasAcknowledgedNotice.mockResolvedValue(true);
  mockedNotifications.requestNotificationPermission.mockResolvedValue(true);
  mockedNotifications.scheduleDailyReminder.mockResolvedValue(undefined);
  mockedNotifications.cancelDailyReminder.mockResolvedValue(undefined);
});

describe('loadData — default file seeding', () => {
  it('seeds two starter files when never seeded and no files exist', async () => {
    mockedStorage.hasSeeded.mockResolvedValue(false);

    await useStore.getState().loadData();

    const names = useStore.getState().files.map(f => f.name);
    expect(names).toEqual(['Expense 1', 'Expense 2']);
    expect(mockedStorage.markSeeded).toHaveBeenCalled();
  });

  it('seeds even when firstLaunch is false (install predates the feature)', async () => {
    mockedStorage.hasSeeded.mockResolvedValue(false);
    mockedStorage.isFirstLaunch.mockResolvedValue(false);

    await useStore.getState().loadData();

    expect(useStore.getState().files).toHaveLength(2);
  });

  it('never seeds once already seeded — deleting the defaults sticks', async () => {
    mockedStorage.hasSeeded.mockResolvedValue(true);

    await useStore.getState().loadData();

    expect(useStore.getState().files).toEqual([]);
    expect(mockedStorage.saveFiles).not.toHaveBeenCalled();
  });

  it('does not overwrite existing user files', async () => {
    mockedStorage.hasSeeded.mockResolvedValue(false);
    mockedStorage.loadFiles.mockResolvedValue([makeFile({ name: 'My Real Data' })]);

    await useStore.getState().loadData();

    expect(useStore.getState().files.map(f => f.name)).toEqual(['My Real Data']);
  });
});

describe('first-run notice', () => {
  it('shows on load when never acknowledged', async () => {
    mockedStorage.hasAcknowledgedNotice.mockResolvedValue(false);
    await useStore.getState().loadData();
    expect(useStore.getState().showFirstRunNotice).toBe(true);
  });

  it('stays hidden once acknowledged, and persists the flag', async () => {
    mockedStorage.hasAcknowledgedNotice.mockResolvedValue(false);
    await useStore.getState().loadData();

    useStore.getState().acknowledgeFirstRunNotice();

    expect(useStore.getState().showFirstRunNotice).toBe(false);
    expect(mockedStorage.markNoticeAcknowledged).toHaveBeenCalled();
  });
});

describe('loadData — 30-day retention', () => {
  it('prunes deleted files older than 30 days and frees their photos', async () => {
    const stale = {
      ...makeFile({ id: 'old', expenses: [
        { id: 'e1', particular: 'x', amount: 1, createdAt: '', photoUri: 'file:///p.jpg' },
      ] }),
      deletedAt: new Date(Date.now() - 31 * DAY).toISOString(),
    };
    const fresh = {
      ...makeFile({ id: 'new' }),
      deletedAt: new Date(Date.now() - 2 * DAY).toISOString(),
    };
    mockedStorage.loadDeletedFiles.mockResolvedValue([stale, fresh]);

    await useStore.getState().loadData();

    expect(useStore.getState().deletedFiles.map(f => f.id)).toEqual(['new']);
    expect(mockedAttachments.deleteAttachment).toHaveBeenCalledWith('file:///p.jpg');
  });

  it('keeps everything when nothing has expired', async () => {
    const fresh = {
      ...makeFile({ id: 'new' }),
      deletedAt: new Date(Date.now() - 1 * DAY).toISOString(),
    };
    mockedStorage.loadDeletedFiles.mockResolvedValue([fresh]);

    await useStore.getState().loadData();

    expect(useStore.getState().deletedFiles).toHaveLength(1);
    expect(mockedStorage.saveDeletedFiles).not.toHaveBeenCalled();
  });
});

describe('delete / restore lifecycle', () => {
  it('moves a deleted file into Recently Deleted rather than dropping it', () => {
    useStore.setState({ files: [makeFile({ id: 'f1' })] });

    useStore.getState().deleteFile('f1');

    expect(useStore.getState().files).toHaveLength(0);
    expect(useStore.getState().deletedFiles.map(f => f.id)).toEqual(['f1']);
  });

  it('restores a file back to the active list', () => {
    useStore.setState({ files: [makeFile({ id: 'f1' })] });
    useStore.getState().deleteFile('f1');

    useStore.getState().restoreFile('f1');

    expect(useStore.getState().files.map(f => f.id)).toEqual(['f1']);
    expect(useStore.getState().deletedFiles).toHaveLength(0);
  });

  it('frees photos when a file is permanently deleted', () => {
    const withPhoto = makeFile({
      id: 'f1',
      expenses: [
        { id: 'e1', particular: 'x', amount: 1, createdAt: '', photoUri: 'file:///a.jpg' },
      ],
    });
    useStore.setState({ files: [withPhoto] });
    useStore.getState().deleteFile('f1');

    useStore.getState().permanentlyDeleteFile('f1');

    expect(useStore.getState().deletedFiles).toHaveLength(0);
    expect(mockedAttachments.deleteAttachment).toHaveBeenCalledWith('file:///a.jpg');
  });

  it('frees photos for every file when clearing all', () => {
    useStore.setState({
      files: [
        makeFile({ id: 'f1', expenses: [
          { id: 'e1', particular: 'x', amount: 1, createdAt: '', photoUri: 'file:///a.jpg' },
        ] }),
        makeFile({ id: 'f2', expenses: [
          { id: 'e2', particular: 'y', amount: 2, createdAt: '', photoUri: 'file:///b.jpg' },
        ] }),
      ],
    });
    useStore.getState().deleteFile('f1');
    useStore.getState().deleteFile('f2');

    useStore.getState().clearDeletedFiles();

    expect(useStore.getState().deletedFiles).toHaveLength(0);
    expect(mockedAttachments.deleteAttachment).toHaveBeenCalledWith('file:///a.jpg');
    expect(mockedAttachments.deleteAttachment).toHaveBeenCalledWith('file:///b.jpg');
  });
});

describe('expenses', () => {
  it('appends an expense with its note and photo', () => {
    useStore.setState({ files: [makeFile({ id: 'f1' })] });

    useStore.getState().addExpense('f1', 'Coffee', 4.5, {
      note: 'with the team',
      photoUri: 'file:///c.jpg',
    });

    const [e] = useStore.getState().getFile('f1')!.expenses;
    expect(e.particular).toBe('Coffee');
    expect(e.amount).toBe(4.5);
    expect(e.note).toBe('with the team');
    expect(e.photoUri).toBe('file:///c.jpg');
  });

  it('removes only the targeted expense', () => {
    useStore.setState({ files: [makeFile({ id: 'f1' })] });
    const add = useStore.getState().addExpense;
    add('f1', 'A', 1);
    add('f1', 'B', 2);
    const [first] = useStore.getState().getFile('f1')!.expenses;

    useStore.getState().deleteExpense('f1', first.id);

    const left = useStore.getState().getFile('f1')!.expenses.map(e => e.particular);
    expect(left).toEqual(['B']);
  });
});

describe('daily reminder', () => {
  it('schedules and persists when enabled with permission granted', async () => {
    const ok = await useStore.getState().setReminderEnabled(true);

    expect(ok).toBe(true);
    expect(useStore.getState().reminder.enabled).toBe(true);
    expect(mockedNotifications.scheduleDailyReminder).toHaveBeenCalledWith(20, 0);
    expect(mockedStorage.saveReminderPrefs).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });

  it('stays off and does not schedule when permission is denied', async () => {
    mockedNotifications.requestNotificationPermission.mockResolvedValue(false);

    const ok = await useStore.getState().setReminderEnabled(true);

    expect(ok).toBe(false);
    expect(useStore.getState().reminder.enabled).toBe(false);
    expect(mockedNotifications.scheduleDailyReminder).not.toHaveBeenCalled();
  });

  it('cancels the scheduled reminder when turned off', async () => {
    await useStore.getState().setReminderEnabled(true);
    await useStore.getState().setReminderEnabled(false);

    expect(mockedNotifications.cancelDailyReminder).toHaveBeenCalled();
    expect(useStore.getState().reminder.enabled).toBe(false);
  });

  it('reschedules at the new time only while enabled', async () => {
    await useStore.getState().setReminderTime(7, 30);
    expect(mockedNotifications.scheduleDailyReminder).not.toHaveBeenCalled();
    expect(useStore.getState().reminder).toMatchObject({ hour: 7, minute: 30 });

    await useStore.getState().setReminderEnabled(true);
    await useStore.getState().setReminderTime(9, 0);
    expect(mockedNotifications.scheduleDailyReminder).toHaveBeenLastCalledWith(9, 0);
  });

  it('re-asserts the schedule on load when previously enabled', async () => {
    mockedStorage.loadReminderPrefs.mockResolvedValue({ enabled: true, hour: 8, minute: 30 });

    await useStore.getState().loadData();

    expect(useStore.getState().reminder).toEqual({ enabled: true, hour: 8, minute: 30 });
    expect(mockedNotifications.scheduleDailyReminder).toHaveBeenCalledWith(8, 30);
  });
});
