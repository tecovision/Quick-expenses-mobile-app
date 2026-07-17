# Release guide

Everything needed to take QuickExpenses from the current build to the stores.
Items marked **[BLOCKED — needs you]** cannot be done from the codebase; they
need an account, a payment, or a physical device.

## Current state

| Area | Status |
|---|---|
| Type safety (`strict`, no `any`) | ✅ Passing |
| Test suite (`npm test`) | ✅ 41 tests passing |
| `expo-doctor` | ✅ 18/18 |
| CI (type-check + test on push/PR) | ✅ `.github/workflows/ci.yml` |
| Crash reporting | ⚠️ Wired, **inert until a DSN is set** |
| Android build | ✅ Building via EAS `preview` profile |
| iOS build | ❌ **Never built** — needs Apple Developer account |
| Privacy policy | ⚠️ Drafted, **needs your details + hosting** |
| Store listing assets | ❌ Not started |

## 1. Crash reporting — activate Sentry

The integration is complete but sends nothing until a DSN exists. To turn it on:

1. Create a project at <https://sentry.io> (free tier is fine) → React Native.
2. Copy the DSN.
3. Add it to EAS as a build-time env var:
   ```bash
   npx eas-cli env:create --name EXPO_PUBLIC_SENTRY_DSN --value "https://...@o0.ingest.sentry.io/0" --environment production --environment preview
   ```
4. Rebuild. Crashes will appear in Sentry.

To verify it works, trigger a test error in a build and confirm it lands in the
Sentry dashboard. With no DSN the app behaves exactly as before — nothing to
undo if you skip this.

> **Privacy:** `src/services/monitoring.ts` sets `sendDefaultPii: false` and
> only ever attaches non-sensitive context (operation name, counts). Expense
> names, amounts, notes, and photos are never sent. Keep it that way — if you
> add context, do not pass user content.

## 2. Privacy policy — **[BLOCKED — needs you]**

1. Fill in every `[FILL IN ...]` in [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md).
2. Delete the crash-reporting section if you did not configure Sentry.
3. Host it at a public, stable URL (GitHub Pages, your site, anything reachable).
4. Paste that URL into both store listings.

Both stores reject apps without a working privacy-policy link, and you request
camera + photo permissions, so this is non-negotiable.

## 3. Android release

The current builds use the `preview` profile (APK, for sideloading). For the
Play Store you need the `production` profile (AAB):

```bash
npx eas-cli build --profile production --platform android
```

Then, for submission — **[BLOCKED — needs you]**:

1. Create a Google Play Developer account (one-time $25).
2. Create the app in Play Console.
3. Create a service account, download its JSON key, save it at the repo root as
   `play-store-service-account.json` (already gitignored — never commit it).
4. `npx eas-cli submit --platform android --profile production`

Also required in Play Console: Data Safety form (answers drafted in the privacy
policy appendix), content rating questionnaire, target audience, and store
listing assets (below).

## 4. iOS release — **[BLOCKED — needs you]**

**iOS has never been built or run.** All iOS-specific code (keyboard padding,
safe-area handling, gestures) is written correctly but has zero device
verification. Expect to find issues on the first real run.

1. Enrol in the Apple Developer Program ($99/year). Nothing below is possible
   without it.
2. Build: `npx eas-cli build --profile production --platform ios`
3. Submit to TestFlight: `npx eas-cli submit --platform ios --profile production`
   — EAS will prompt for your Apple ID, App Store Connect app ID, and Team ID.
   (The `submit.production.ios` block was removed from `eas.json` rather than
   left with fake placeholders; add it back once you know the real values.)
4. **Test thoroughly on a real iPhone before submitting for review** —
   especially the keyboard behaviour on the file screen.

## 5. Store listing assets — **[BLOCKED — needs you]**

Neither store will accept a submission without these. They need a device or
simulator, so they can't be generated from here.

- **Screenshots**: Play requires ≥2 (min 320px, max 3840px). App Store requires
  6.7" iPhone screenshots; others optional.
- **Play feature graphic**: 1024×500 PNG/JPG.
- **App icon**: ✅ already configured (`assets/icon.png`).
- **Short description** (Play, ≤80 chars) and **full description** (≤4000).
- **Keywords** (App Store, ≤100 chars).

Suggested copy to adapt:

> **Short:** Fast, private expense tracking. No account, no cloud — your data
> stays on your phone.
>
> **Full:** QuickExpenses is a straightforward expense tracker built for speed
> and privacy. Create files for trips, projects, or months, and add entries in
> seconds from a single row — description, amount, an optional note, and a
> receipt photo.
>
> Everything stays on your device. There's no account to create, no cloud sync,
> and no ads. When you need to hand something over, export any file as a PDF or
> CSV, or bundle every file into a single ZIP.
>
> • Table view with running totals
> • Attach receipt photos, pinch to zoom
> • Optional notes on any entry
> • Export to PDF or Excel-compatible CSV
> • Export all files at once as a ZIP
> • Swipe to delete, with undo
> • Recently Deleted keeps files for 30 days
> • 150+ currencies
> • Works completely offline

## 6. Before you ship — checklist

- [ ] Keyboard behaviour confirmed on a real Android device
- [ ] Keyboard behaviour confirmed on a real iPhone
- [ ] Tested on a small screen and a tablet
- [ ] `npm test` and `npm run type-check` pass
- [ ] Sentry DSN configured and a test crash verified
- [ ] Privacy policy filled in and hosted
- [ ] Play Data Safety form matches the privacy policy
- [ ] Screenshots and descriptions uploaded
- [ ] Version bumped in `app.json` if needed (`autoIncrement` handles build
      numbers; the user-facing `version` string is yours to set)

## Known gaps / tech debt

- **No UI/component tests.** The suite covers pure logic (validation, export
  escaping, store reducers). Screen rendering and gestures are untested —
  every UI regression so far was caught manually on a device.
- **Old React Native architecture** (`newArchEnabled: false`). Fine today; the
  new architecture is where RN is heading. Migrating needs a full re-test.
- **`supportsTablet: false`** on iOS — deliberate. Revisit if you want iPad.
- **Keyboard handling is manual.** `app/file/[id].tsx` pads by the reported
  keyboard height because Expo SDK 54 forces edge-to-edge on Android (the
  window never resizes). If keyboard bugs resurface across many devices,
  consider `react-native-keyboard-controller` instead of hand-tuning insets.
