/**
 * Crash/error reporting hook point.
 *
 * v1 ships without a third-party crash reporter — see docs/RELEASE.md, Step 7,
 * for why (Play's own Android vitals covers v1; a dedicated service adds a
 * privacy-policy obligation that isn't worth it yet). This keeps a single,
 * stable `captureError` call site everywhere an error is handled, so adding a
 * real reporter later (Sentry or otherwise) is a one-file change instead of a
 * search-and-replace across the app.
 *
 * Do not attach expense data (names, amounts, notes, photo URIs) to
 * `context` even after a real reporter is wired in — see the privacy policy.
 */
export function initMonitoring(): void {
  // No-op until a crash reporter is added.
}

export function captureError(
  error: unknown,
  context?: Record<string, string | number | boolean>,
): void {
  if (__DEV__) console.warn('[error]', error, context ?? '');
}
