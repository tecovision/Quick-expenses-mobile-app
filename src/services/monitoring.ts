import * as Sentry from '@sentry/react-native';

/**
 * Crash reporting.
 *
 * The DSN comes from the EXPO_PUBLIC_SENTRY_DSN environment variable (set it
 * in EAS as a build-time env var, or in a local .env). With no DSN the whole
 * module stays inert — nothing is initialised and nothing is sent — so the app
 * runs identically for anyone building without a Sentry account.
 *
 * Privacy: this app's data (expense names, amounts, notes, photos) is personal
 * financial information and is NEVER attached to a report. We send only the
 * error itself plus non-identifying context. `sendDefaultPii` stays false.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** True when a DSN is configured and reports will actually be delivered. */
export const isMonitoringEnabled = Boolean(DSN);

export function initMonitoring(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    // Only report from real builds; dev crashes are visible in the console.
    enabled: !__DEV__,
    debug: false,
    // Never attach device/user identifiers by default.
    sendDefaultPii: false,
    // Light performance sampling — enough to spot pathological screens.
    tracesSampleRate: 0.2,
  });
}

/**
 * Report a handled error. Safe to call unconditionally: it logs in dev and
 * no-ops when monitoring is not configured.
 *
 * Pass only non-sensitive context (screen name, operation, format) — never
 * expense contents.
 */
export function captureError(
  error: unknown,
  context?: Record<string, string | number | boolean>,
): void {
  if (__DEV__) console.warn('[error]', error, context ?? '');
  if (!DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
