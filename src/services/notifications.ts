import { Platform } from 'react-native';
import { captureError } from './monitoring';

/**
 * Local (on-device) daily reminder. There is no server, no push token and no
 * network call — the OS fires a notification we scheduled. Nothing about the
 * user or their expenses leaves the device, so this does not change the
 * privacy policy or the Play "Data safety" answers.
 *
 * expo-notifications is imported lazily (dynamic import, not a static
 * top-level `import`). Expo Router's dev server does a synchronous, Node-side
 * walk of the whole app/ import graph on startup to build the route table.
 * expo-notifications has a module-level side effect that throws the moment
 * it's evaluated outside a real app runtime (the "removed from Expo Go in
 * SDK 53" push warning) — under a plain top-level import that crashes the
 * route-table walk and takes the entire `expo start` dev server down with it,
 * before a single device even connects. A dynamic import only resolves when
 * one of the functions below actually runs inside the live app (Expo Go or a
 * real build), which that walk never reaches.
 */

type NotificationsModule = typeof import('expo-notifications');

const REMINDER_ID = 'daily-expense-reminder';
const ANDROID_CHANNEL = 'reminders';

let modulePromise: Promise<NotificationsModule> | null = null;
let handlerRegistered = false;

async function getNotifications(): Promise<NotificationsModule> {
  if (!modulePromise) modulePromise = import('expo-notifications');
  const Notifications = await modulePromise;

  if (!handlerRegistered) {
    handlerRegistered = true;
    // Reminders that arrive while the app is open are low-value; show them
    // anyway (Android users expect it) but never make noise or touch the badge.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }

  return Notifications;
}

async function ensureAndroidChannel(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: undefined,
  });
}

/** Current permission state, without prompting. */
export async function hasNotificationPermission(): Promise<boolean> {
  try {
    const Notifications = await getNotifications();
    const settings = await Notifications.getPermissionsAsync();
    return settings.granted;
  } catch {
    return false;
  }
}

/**
 * Ask for notification permission. Returns true only if it is granted after
 * the call. Safe to call repeatedly — a no-op once already granted, and it
 * will not spam the OS dialog once the user has permanently denied it.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const Notifications = await getNotifications();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch (e) {
    captureError(e, { op: 'requestNotificationPermission' });
    return false;
  }
}

/**
 * (Re)schedule the daily reminder for hour:minute local time. Cancels any
 * previous reminder first, so calling it repeatedly is safe and idempotent.
 */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  try {
    const Notifications = await getNotifications();
    await ensureAndroidChannel(Notifications);
    await cancelDailyReminder();
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: 'QuickExpenses',
        body: "Take a moment to log today's expenses.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
      },
    });
  } catch (e) {
    captureError(e, { op: 'scheduleDailyReminder', hour, minute });
  }
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    const Notifications = await getNotifications();
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    /* nothing scheduled — fine */
  }
}
