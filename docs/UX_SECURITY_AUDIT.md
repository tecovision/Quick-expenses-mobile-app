# QuickExpenses — UI/UX, Bug & Security Audit

**Date:** 2026-10-26
**Scope:** Full app — every screen, component, service, and store action.
**Audience the design was evaluated against:** everyday individuals tracking
personal/household expenses — not accountants or power users. That means:
plain language over jargon, few taps, forgiving of mistakes (undo, confirm
before anything destructive), and nothing that requires reading a manual.

This is a written report with code-level detail (file paths, line-level
description of each change) rather than screenshots — QuickExpenses is a
native Android app, not something a browser-based session can screenshot
live. Every fix below has already been applied, committed, and verified
(see **Verification** at the end).

---

## How this audit was done

Read through all 33 source files (every screen in `app/`, every component in
`src/components/`, every service in `src/services/`, the store, and the
utils) looking for three things at once:

1. **UI/UX** — inconsistent colors/icons, redundant buttons, navigation dead
   ends, anything that doesn't match how the rest of the app looks or behaves.
2. **Bugs** — logic that's subtly wrong, not just things that crash.
3. **Security** — untrusted input, data handling, permissions, dependency
   vulnerabilities.

Where something looked off, I traced it to the actual behavior (read the
store action, the service function, sometimes wrote a test to prove it)
before calling it a bug — this report doesn't include anything I didn't
verify.

---

## Context: this wasn't a from-scratch app

Worth saying up front: QuickExpenses has already been through several
targeted design passes in earlier work on this project — a full icon
redesign, consolidating the entry row's buttons (camera icon, enter button,
and now the calculator all folded into the `+` panel instead of separate
icons), responsive/tablet layout, consistent `Button`/`IconButton`
components used almost everywhere. So this audit mostly turned up smaller,
specific issues rather than a sweeping redesign — which is itself a sign the
earlier passes did their job. The main screen (`app/file/[id].tsx`), in
particular, was checked carefully for "excess buttons" and found to already
be minimal: back, filename, one export icon in the header; description,
amount, `+` in the input row. Nothing more to remove there.

---

## UI/UX fixes

### 1. Settings "Version" row used a different blue than everywhere else
[`app/settings.tsx`](../app/settings.tsx)

Every icon in Settings' "About" list used `colors.accent` (`#007AFF`) —
except the info icon next to "Version", which had a hardcoded `#2563EB`.
Different enough to notice if you look closely, not enough to look
intentional. Changed to `colors.accent`.

### 2. Tools grid: icon color didn't match its own tile
[`app/tools/index.tsx`](../app/tools/index.tsx), [`src/constants/theme.ts`](../src/constants/theme.ts)

The four Tools tiles (Currency Converter, Calculator, To-Do, Notepad) each
have a different pastel background — blue, lavender, mint, cream — clearly
meant to give each tool its own identity so they're easy to tell apart at a
glance. But every tile's *icon* was rendered in the same accent blue
regardless of its background, so three of the four tiles showed a
blue icon sitting on a non-blue tile — a mismatched, half-applied look.

Added `toolPurple`/`toolGreen`/`toolAmber` (each paired with its matching
`...Soft` tint) to `theme.ts`, and gave each tile its own icon color to
match its background. Currency Converter keeps the original blue/blue
pairing since that's the app's primary accent.

### 3. `+not-found.tsx` reinvented its own button
[`app/+not-found.tsx`](../app/+not-found.tsx)

The "page not found" screen (reachable only via a broken deep link — low
traffic, but still part of the app) built its own pill-shaped button with
its own `StyleSheet` instead of using the shared `Button` component every
other screen uses. Same visual result today, but a second place that would
silently drift out of sync if the app's button style ever changes. Switched
it to `<Button title="Go to Home" .../>`.

*(Left `app/_layout.tsx`'s crash-fallback button as its own bespoke
implementation, deliberately — a root error boundary should import as
little app code as possible, in case the thing that's broken is exactly
what it would otherwise depend on.)*

### 4. Recently Deleted had its own empty-state layout
[`app/recently-deleted.tsx`](../app/recently-deleted.tsx)

Home, To-Do, and Notepad all show their empty state through the shared
`EmptyState` component (a 72px circular icon badge + title + subtitle).
Recently Deleted had its own inline version instead — a bare icon with no
badge, a larger icon size, slightly different type sizes. Visually similar
but not identical, and it's exactly the kind of screen a user might compare
side-by-side with Home ("no files" looks slightly different in both
places"). Swapped in `EmptyState` and deleted the now-unused styles.

*(Left `app/file/[id].tsx`'s "No entries yet" state as its own smaller
treatment — that one lives inside a dense table card, not a full screen,
so the full 72px `EmptyState` badge would be oversized there. Different
context, correctly different treatment — not a bug.)*

### 5. UndoToast: hardcoded color + missing accessibility metadata
[`src/components/UndoToast.tsx`](../src/components/UndoToast.tsx)

`backgroundColor: '#1C1C1E'` instead of `colors.textPrimary` (same value,
just not through the token — would silently drift if the dark color ever
changes). Also added `accessibilityRole="button"` /
`accessibilityLabel="Undo"` to the Undo button, which had neither.

---

## Bug fix

### Currency Converter: swap button could show the wrong rate
[`app/tools/converter.tsx`](../app/tools/converter.tsx)

```ts
// Before
const handleSwap = () => {
  swapConverterCurrencies();
  setAmountPrimary(amountSecondary);
  setAmountSecondary(amountPrimary);
  setRateText(String(converter.rate > 0 ? roundMoney(1 / converter.rate) : converter.rate));
};
```

`swapConverterCurrencies()` already inverts the rate correctly inside the
store, at 6-decimal precision. But `converter` in this component is a
snapshot from the *last render* — calling `swapConverterCurrencies()`
updates the store, not this local variable. The line right after it then
recomputes the inversion **again**, from the *stale* rate, through
`roundMoney()` (2-decimal, money-rounding — appropriate for an amount,
wrong for an exchange rate).

Concretely: swap from a currency where 1 unit = 270 of the other, and the
new rate is `1/270 ≈ 0.0037`. The store has that right. The component's
`roundMoney(0.0037)` rounds to `0.00` and displays **`0`** — a visibly
broken-looking rate, even though the two amount fields right above it are
still showing the mathematically correct converted values.

Fixed by reading the store's own post-swap value instead of recomputing it:

```ts
setRateText(String(useStore.getState().converter.rate));
```

---

## Security / robustness

### 1. Unbounded regex work on untrusted shared text
[`src/utils/receiptParser.ts`](../src/utils/receiptParser.ts)

This is the parser behind the "share a PhonePe receipt into QuickExpenses"
feature (added earlier this project). It runs three regexes — one with a
lazy quantifier plus a lookahead — against whatever text *any other app on
the phone* hands over through Android's Share intent. That text is not
something QuickExpenses controls, and the moment a share lands, the app
auto-navigates to the import screen and parses it immediately — before the
user taps anything.

The lazy-quantifier-plus-lookahead shape (`([^\n,]+?)(?=...)`) is a classic
ReDoS pattern: for a string with no comma/newline and nothing matching the
lookahead, the engine walks the string one character at a time, trying the
lookahead at every position — O(n²) in the worst case. Android's Binder
transaction limit caps a shared text extra at roughly 1MB, which is more
than enough `n` to make that quadratic cost actually hang the UI thread.

Added a hard cap — the text is truncated to 4,000 characters (far beyond
any real receipt) before any regex runs:

```ts
const MAX_INPUT_LENGTH = 4000;
export function parseSharedReceipt(raw: string): ParsedReceipt {
  const text = raw.trim().slice(0, MAX_INPUT_LENGTH);
  ...
```

Added a test that feeds it a 2-million-character worst-case string and
asserts it still returns in well under a second (it now returns in ~4ms).

### 2. `clearAllData()` existed, was never wired up, and was incomplete
[`src/services/storage.ts`](../src/services/storage.ts), [`src/services/attachments.ts`](../src/services/attachments.ts), [`src/store/useStore.ts`](../src/store/useStore.ts), [`app/settings.tsx`](../app/settings.tsx)

Found a `clearAllData()` function in `storage.ts` that wipes every
AsyncStorage key — but nothing in the app ever called it. Dead code is its
own small production-readiness smell, but this one was also **wrong** had
it ever been wired up: it only removed the AsyncStorage keys (files,
settings, prefs), not the attached receipt photos sitting in
`documentDirectory/attachments/` — those would have been orphaned on disk
forever, not actually erased.

For an app whose entire first-run pitch is "your data stays with you, and
stays yours to delete," a half-working "erase everything" is worth having
done properly rather than left unused. Fixed and wired it up:

- Added `deleteAllAttachments()` to `attachments.ts` — removes the whole
  attachments directory in one call.
- `clearAllData()` now calls it after wiping AsyncStorage.
- Added `resetAllData()` to the store: cancels the scheduled daily reminder
  first (so nothing fires later referencing wiped state), wipes storage +
  attachments, then re-runs the normal startup load — which re-seeds the
  two default files, the first-run privacy notice, and the currency picker,
  exactly as if the app had just been installed.
- Exposed it in **Settings → Data → Erase All Data**, styled as destructive
  (red), behind a two-step confirmation (the first explains what's lost and
  that it's permanent; the second is the final "are you sure"). This is the
  one truly irreversible action in the whole app — unlike file deletion,
  there's no Recently Deleted safety net for it — so it gets more friction
  than any other destructive action in the app, deliberately.

### 3. Dependency vulnerabilities
Ran `npm audit`. Started at 18 known advisories. Applied the safe,
non-breaking fixes (`npm audit fix`, no `--force`):

| Package | Issue | Result |
|---|---|---|
| `browserslist` | unbounded memory growth / crash | fixed |
| `decode-uri-component` / `query-string` | DoS via malformed input | fixed |
| `shell-quote` | critical — DoS and unescaped newlines | fixed |
| `ws` | memory exhaustion DoS | fixed |

**10 remain**, all transitively through `@expo/cli`, `@expo/config-plugins`
(the `xcode`/iOS-build-tooling side, which this Android-only app doesn't
even use), and `@expo/ngrok` (the `--tunnel` dev-server option). Every one
of them is **build/CLI tooling that runs on a developer's machine, not code
that ships inside the installed app** — `npm audit`'s own suggested fix for
all of them is to downgrade `expo` itself to version **44** (this app is on
**57**), which would be far more damaging than the advisories themselves.
Left alone on purpose; re-check next time `expo`/`@expo/cli` get a routine
SDK bump, since these get fixed upstream over time.

---

## Reviewed, found already solid (no change needed)

Worth stating plainly, since a security review that only ever reports
problems reads as if it didn't check the things that were fine:

- **Error reporting never touches expense data.** `captureError()` is
  currently a no-op (by design — see `docs/RELEASE.md` Step 7), and every
  one of its ~20 call sites across the app was checked: none pass expense
  particulars, amounts, notes, or photo URIs as context, matching the
  explicit rule documented in `monitoring.ts`. Safe to wire up a real crash
  reporter later without an audit of every call site first.
- **Biometric lock never sees biometric data.** `biometric.ts` is a thin
  wrapper over `expo-local-authentication` — the OS does the actual
  capture/match, the app only ever receives a yes/no.
- **PDF export already escapes everything user-controlled.** `escapeHtml()`
  is applied to the file name, every particular, and every note before
  they're interpolated into the generated HTML — including text that
  originated from an *externally shared* source (the PhonePe-receipt note),
  so a crafted share can't inject markup into an exported PDF.
- **Currency values are never free text.** Every `Currency` object the app
  ever uses comes from the fixed `CURRENCIES` list — never typed by the
  user — so there's no path for an arbitrary string to reach `formatCurrency`
  or the PDF template as a "symbol."
- **External links are all hardcoded constants** (`PRIVACY_POLICY_URL`,
  `TERMS_URL`) — never built from user or shared-intent input.
- **Navigation architecture.** Shallow (2–3 levels deep everywhere), a
  consistent back-chevron pattern on every screen, no dead ends. Nothing
  here needed streamlining.

---

## Judgment calls — considered, deliberately not changed

- **Notepad has no "discard changes" option** — closing the editor always
  saves (even a lone typed word). This matches Apple Notes / Google Keep's
  autosave convention, which the target audience (everyday individuals) is
  already used to from those apps. Treated as a feature, not a gap.
- **`LockScreen`'s Modal has no `onRequestClose`.** Checked whether this
  could let the Android back button bypass the lock — it can't: RN's
  `Modal` renders in its own native layer above the screen stack regardless
  of what's happening underneath it, so there's no path to visually expose
  locked content. Leaving it as-is is arguably *more* secure than adding a
  handler that has to get the logic exactly right.
- **`app/_layout.tsx`'s crash boundary uses hardcoded colors**, not theme
  tokens — kept deliberately self-contained (see fix #3 above for why).

---

## Verification

Every fix above is already committed to `develop`
([077e80b](https://github.com/tecovision/Quick-expenses-mobile-app/commit/077e80b)).

```
npx tsc --noEmit        → clean
npm test                → 106/106 passing (was 103; +3 new tests for
                           the ReDoS cap and resetAllData)
npx expo-doctor         → 21/21
npx expo export         → bundles cleanly
```

This is all JS/logic/config — no new native module, so it hot-reloads in
whatever dev build you're already running. The one thing worth a manual
look on-device: **Settings → Data → Erase All Data**, since wiping
everything and landing back on a fresh-install Home screen isn't something
the test suite can fully stand in for.
