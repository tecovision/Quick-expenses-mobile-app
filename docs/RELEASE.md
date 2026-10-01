# QuickExpenses — Google Play release guide

Android only. iOS is not being released.

> Play policies change. Everything below reflects the process as of writing —
> if Play Console tells you something different, believe Play Console.

---

## ⚠️ Read this first: the 14-day / 12-tester rule

If your Play Developer account is registered as **Personal / individual** and
was created **after 13 November 2023**, Google will not let you publish to
production until you have run a **closed test with at least 12 testers who
stayed opted-in continuously for 14 days**.

This is the single biggest surprise in the process. It means **your realistic
timeline is ~2–3 weeks minimum**, not one afternoon.

- **Organisation/company accounts are exempt** — they can go straight to production.
- Check which you have: Play Console → **Settings → Developer account → Account details → Account type**.
- The 12 testers must be real Google accounts that *accept* the tester invite
  and keep the app installed. Recruit them before you start the clock.
- The 14 days must be *continuous*. If testers drop below 12, the counter resets.

If you're Personal, start the closed test **first** — everything else (listing,
screenshots, policy) can be finished while the clock runs.

---

## Step 0 — Privacy policy (no website needed)

**A website is not mandatory.** No domain, no company site.

**A publicly reachable privacy-policy URL IS mandatory** — Play requires one for
any app requesting sensitive permissions, and yours requests Camera, Photos and
Notifications. (Biometric app lock uses `USE_BIOMETRIC`, a normal/non-sensitive
Android permission — it doesn't change this requirement, it was already true.)
It must be a live public page (not a Google Doc behind sign-in, not a PDF).

### The policy is written and filled in

[`docs/index.html`](./index.html) (Privacy Policy) and [`docs/terms.html`](./terms.html)
(Terms of Use) are complete and ready to publish. GitHub Pages serves both from
the same `/docs` folder:

- `https://tecovision.github.io/Quick-expenses-mobile-app/` — privacy policy
- `https://tecovision.github.io/Quick-expenses-mobile-app/terms.html` — terms

Details:

- Publisher: **Mohammad Mustaqeem**
- Contact: **tecovision.com@gmail.com**
- States that **no data is collected** — accurate, because the app is offline
  and no crash-reporting DSN is configured (see Step 7).

> **Does Play show a privacy/terms popup after install?** No. The privacy-policy
> URL you enter appears only on the store listing and in the Data safety section
> (both seen *before* install). Play does not require, or show, an in-app
> consent popup, and Terms of Use are not required at all for this kind of app.
> The app shows its own brief first-run notice (data-stays-on-device, with links
> to both pages) purely for user trust — it is optional, not a Play requirement.

⚠️ **Check the "Last updated" date** near the top and set it to the date you
actually publish.

### Publish it free with GitHub Pages

1. Push (already done).
2. On GitHub → repo **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main**, folder: **/docs** → Save
3. Wait ~1 minute. Your URL will be:

   ```
   https://tecovision.github.io/Quick-expenses-mobile-app/
   ```

4. Open it in a **private/incognito window** to confirm it's publicly reachable,
   then paste that URL into Play Console.

> If the repo is private, Pages needs a paid plan — either make the repo public
> or host the policy elsewhere (Google Sites and Notion public pages are free).

---

## Step 1 — Pre-flight (do before building)

```bash
npm run type-check     # must pass
npm test               # must pass (93 tests)
npx expo-doctor        # must be 18/18
```

Set the version users will see, in `app.json` → `expo.version` (e.g. `1.0.0`).
You do **not** need to touch `versionCode` — `eas.json` has
`autoIncrement: true` and `appVersionSource: "remote"`, so EAS manages build
numbers. Every upload to Play must have a higher versionCode than the last;
EAS handles that for you.

---

## Step 2 — Build the release AAB

Play requires an **Android App Bundle (.aab)**, not the APK you've been
sideloading. The `production` profile is already configured for this.

```bash
npx eas-cli build --profile production --platform android
```

Download the `.aab` from the build page when it finishes.

### About signing — important

EAS generates and stores your **upload key**. Google re-signs with the **app
signing key** it holds (Play App Signing). Consequences:

- **Never lose your EAS account access.** Back up credentials:
  `npx eas-cli credentials` → Android → download/keep a copy somewhere safe.
- If you ever lose the upload key you can ask Google to reset it, but it's
  painful. Don't rely on that.

---

## Step 3 — Create the app in Play Console

<https://play.google.com/console> → **Create app**

- **App name:** QuickExpenses (max 30 chars)
- **Default language:** English
- **App or game:** App
- **Free or paid:** Free
- Accept the declarations.

---

## Step 4 — Closed testing (start the 14-day clock NOW if Personal)

**Testing → Closed testing → Create new release**

1. Upload your `.aab`.
2. Release name: auto-filled from versionCode — fine.
3. Release notes: e.g. `First closed test build.`
4. **Testers** tab → create an email list → add **at least 12** Google accounts
   → save.
5. Copy the **opt-in URL** and send it to your testers. Each must open it,
   accept, and install the app.
6. Roll out the release.

Confirm in the console that 12+ testers show as opted in. **The clock only
counts while ≥12 are opted in.**

Use these two weeks to actually test (see Step 8).

---

## Step 5 — Complete every section under "Policy" and "Grow"

Play blocks release until all of these are green. Go through
**Policy → App content** item by item:

| Section | Your answer |
|---|---|
| **Privacy policy** | Your GitHub Pages URL from Step 0 |
| **Ads** | No, my app does not contain ads |
| **App access** | All functionality available without special access (no login) |
| **Content ratings** | Fill the questionnaire — a utility with no objectionable content; expect **Everyone / PEGI 3** |
| **Target audience** | 18+ (or 13+). **Do not** target children — that triggers Families Policy |
| **News app** | No |
| **COVID-19 contact tracing** | No |
| **Data safety** | See below |
| **Government apps** | No |
| **Financial features** | **None of these** — a personal expense tracker is not a financial service (no banking, lending, investing, or crypto) |
| **Health apps** | No |

### Data safety (the section people get wrong)

Play defines "collection" as **transmitting data off the device**. Your expense
data never leaves the phone, and no crash-reporting DSN is configured, so
nothing is collected.

**Answer "No"** to *"Does your app collect or share any of the required user
data types?"* — then you're done with this section.

That's the correct answer for the current build. Specifically, declare **not
collected**: Location, Personal info, Financial info, Photos and videos, Files
and docs, Contacts, Device IDs, App activity.

> **Why "not collected" despite the Camera/Photos/Notifications permissions?**
> Play's definition is about *transmission*. Requesting a permission is not
> collection; the photos stay in the app's private storage on the device, and
> the daily reminder is a **local** notification scheduled on-device — no push
> token, no server, nothing sent. The **Download** feature writes files into a
> folder the user picks (Android Storage Access Framework) — that is the user
> saving their own data locally, still no transmission. **App Lock** (Face ID /
> fingerprint) is verified entirely by the OS — the app only gets a yes/no
> result and never touches biometric data. The **Currency Converter** never
> calls a rates API — the rate is a static default the user edits by hand. The
> Data Safety answer stays "No".

Your answers must match your privacy policy — they're cross-checked. Both now
say the same thing: nothing is collected.

⚠️ **If you later enable Sentry (Step 7), you must come back and update this
section and the privacy policy** — the answer changes to Yes / Crash logs.

---

## Step 6 — Store listing

**Grow → Store presence → Main store listing**

| Asset | Requirement | Status |
|---|---|---|
| App icon | 512×512 PNG, 32-bit | Export from `assets/icon.png` |
| Feature graphic | **1024×500** PNG/JPG — **required** | ❗ You must create this |
| Phone screenshots | **2–8**, min 320px, 16:9 or 9:16 | ❗ Capture on device |
| Short description | ≤80 chars | Draft below |
| Full description | ≤4000 chars | Draft below |

Take screenshots on your phone (Power + Volume Down) of: the file list, a file
with entries, the note/photo entry, the export dialog, and the Tools hub.

**Short description:**
> Fast, private expense tracking. No account, no cloud — your data stays on your phone.

**Full description:**
> QuickExpenses is a straightforward expense tracker built for speed and privacy. Create files for trips, projects, or months, and add entries in seconds from a single row — description, amount, an optional note, and a receipt photo.
>
> Everything stays on your device. There's no account to create, no cloud sync, and no ads. When you need to hand something over, export any file as a PDF or CSV, or bundle every file into a single ZIP.
>
> • Table view with running totals
> • Attach receipt photos, pinch to zoom
> • Optional notes on any entry
> • Export to PDF or Excel-compatible CSV
> • Export all files at once as a ZIP
> • Swipe to delete, with undo
> • Recently Deleted keeps files for 30 days
> • Optional daily reminder to log your expenses
> • Built-in tools: currency converter, calculator, to-do list, notepad
> • Optional Face ID / fingerprint app lock
> • 30 currencies
> • Works completely offline

---

## Step 7 — Crash reporting: skip it for v1

**Decision for this release: OFF.** No action needed. This section explains why,
and how to turn it on later if you ever want it.

### What "crash reporting" means

If the app crashes on a stranger's phone, you have no idea it happened. Crash
reporting means the app quietly sends a technical report — the error and the
line of code that failed — to a dashboard you can read.

### You already get the basics for free

**Play Console → Quality → Android vitals** shows crash rate and ANR rate for
every published app, automatically. No code, no third party, no privacy
implications — Google collects it as the platform. **For a v1 launch this is
enough.**

### Why we're skipping Sentry for now

A dedicated service (Sentry) gives richer detail — full stack traces, what the
user did before the crash. But it costs you:

- Another account to manage
- Your privacy policy must declare it
- Data Safety becomes "Yes, we collect crash logs" instead of a clean "No"

For a first launch, the simpler story is worth more than the extra detail.

### Turning it on later (no code changes needed)

The integration is already written and sits inert without a DSN
(`src/services/monitoring.ts`). To activate:

1. Create a free project at <https://sentry.io> → React Native → copy the DSN.
2. ```bash
   npx eas-cli env:create --name EXPO_PUBLIC_SENTRY_DSN \
     --value "https://...@o0.ingest.sentry.io/0" \
     --environment production --environment preview
   ```
3. Rebuild, and verify a test crash lands in the Sentry dashboard.
4. **Then update both** the privacy policy (add back a crash-reporting section)
   **and** the Play Data Safety form (Crash logs / Diagnostics, shared with
   Sentry, optional, encrypted in transit).

Expense data is never attached to reports — `sendDefaultPii` is off and only
non-sensitive context (operation name, counts) is sent. Keep it that way.

---

## Step 8 — Test properly during the 14 days

The suite (`npm test`) covers logic, not screens. Every UI bug so far was found
on a device. Walk these on at least two different phones:

- [ ] **Keyboard**: open a file — the blue input row sits fully above the
      keyboard, nothing cut off
- [ ] **Rapid entry**: add 10 entries in a row — keyboard never closes between them
- [ ] **Note**: tap `+`, type a note, tap **Done** — keyboard dismisses
- [ ] **Photo**: attach from camera and from gallery; deny the permission once
      and confirm the app explains rather than crashes
- [ ] **Permanently deny** camera in system settings → confirm the "Open
      Settings" path appears
- [ ] **Reminder**: Settings → toggle Daily reminder on → grant the notification
      permission → set a time a minute or two ahead → lock the phone → the
      notification fires. Toggle off → it stops. Deny the permission → the app
      shows the "Open Settings" prompt, doesn't crash
- [ ] **Reminder survives reboot**: enable it, restart the phone, confirm it
      still fires (the app reschedules on launch)
- [ ] **Serial numbers**: add several entries — S.No reads 1,2,3… top to bottom,
      newest at the bottom above the input row
- [ ] **Duplicate**: add an entry with a description that already exists →
      confirm the "Already Added" prompt appears
- [ ] **Rounding**: enter `100.005` → it shows `100.01`; export PDF and CSV →
      both show `100.01`, and the CSV total matches
- [ ] **Download**: tap the download icon → pick PDF or CSV → the Android
      folder picker appears the first time → the file lands in that folder.
      Second download skips the picker
- [ ] **Open after download**: the "Saved" dialog offers **Open** → the file
      opens in a viewer app; **Done** dismisses it
- [ ] **Share**: the share icon still opens the system share sheet (separate
      from Download)
- [ ] **First-run notice**: fresh install → the "Your data stays with you"
      screen shows first, its Privacy Policy / Terms links open in the browser,
      **Got it** dismisses it, then the currency picker appears. It does not
      show again on the next launch
- [ ] **Settings → About**: Privacy Policy and Terms of Use rows open the
      hosted pages
- [ ] **Export**: verify notes appear in both the PDF and the CSV
- [ ] **Export all as ZIP** from Settings with several files
- [ ] **Delete + undo** an entry; delete a file and restore from Recently Deleted
- [ ] **Rotate / small screen / large font** (Settings → Display → Font size: max)
- [ ] **Airplane mode** — everything must still work (app is offline-first)
- [ ] **Kill and relaunch** — data persists
- [ ] **Fresh install** — the two default files appear
- [ ] **Tools hub**: Home → grid icon → all four tiles open their screen
- [ ] **Currency Converter**: amount typed into either side updates the other;
      editing the rate recomputes the non-edited side; swap flips currencies and
      inverts the rate; changing a currency resets the rate to a fresh default
- [ ] **Calculator**: a chained calculation (e.g. `2 + 3 × 4`), a divide-by-zero
      (shows `Error`, recovers on the next digit), and `C` resets to `0`
- [ ] **To-Do List**: add, check off, delete a task; **Clear done** removes only
      checked tasks
- [ ] **Notepad**: add a note with just a body (no title) → shows "Untitled" in
      the list; edit and re-open → changes saved; delete a note
- [ ] **App Lock — enable**: on a device with Face ID / fingerprint enrolled,
      Settings → App Lock → toggle on → the OS prompt appears → confirm → stays
      on. On a device with none enrolled, the Security section doesn't appear
      at all
- [ ] **App Lock — relock**: with it on, background the app (Home button),
      wait at least 20 seconds, reopen → the lock screen appears → **Unlock**
      triggers the OS prompt → success reveals the app, cancel stays locked
- [ ] **App Lock — short trips don't relock**: with it on, attach a photo
      (camera or gallery), use Download, or tap "Open Settings" from the
      reminder permission prompt → each briefly backgrounds the app → on
      return you should **not** be asked to unlock (20-second grace window —
      see `app/_layout.tsx`)
- [ ] **App Lock — cold start**: with it on, kill and relaunch the app → it
      opens locked
- [ ] **App Lock — first-run offer**: fresh install on a biometric-capable
      device → after the privacy notice, the "Lock the app with…" prompt
      appears once; **Not now** dismisses it for good; it never reappears
- [ ] **App Lock — disable**: Settings → App Lock → toggle off → no prompt
      needed (you're already inside the unlocked app) → background/reopen →
      no lock screen

---

## Step 9 — Promote to production

Once the 14 days are complete (or immediately, if you're an organisation):

1. If Personal: **Testing → Closed testing → Apply for production access**.
   Google asks how you tested and what feedback you got — answer honestly and
   specifically. This review can take a few days.
2. **Production → Create new release**
3. Upload the `.aab` (or promote the tested closed-testing release)
4. Add release notes
5. Set **rollout percentage** — start at **20%**, not 100%. If Sentry shows
   crashes you can halt before everyone gets it.
6. **Send for review.** First review typically takes a few days to ~a week.

After launch: watch Play Console → **Quality → Android vitals** (crash rate,
ANR rate) and your Sentry dashboard. Raise the rollout to 100% once it's stable.

---

## Realistic timeline

| Phase | Time |
|---|---|
| Build AAB + Console setup | ~1 day |
| Closed test (Personal accounts) | **14 days minimum** |
| Production access review | 1–7 days |
| App review | 1–7 days |
| **Total** | **~3–4 weeks** |

Organisation accounts can skip the middle two rows.

---

## App size

The `preview` APK you sideload is a **universal** build — it bundles native
libraries for all four CPU ABIs and every screen density, so ~45–55 MB is
expected and normal. **Ignore that number.**

What users actually download is generated by Google from your **production
`.aab`**: one ABI, one density set, ProGuard/R8-shrunk. Check the real figure in
**Play Console → your release → Downloads → "Download size"** — expect roughly
**15–25 MB**.

Already applied to keep it down:

- `@expo/vector-icons` imported per-set (`/Ionicons`) — drops ~4 MB of unused
  icon fonts from the JS bundle
- header logo is a 30 KB asset, not the 800 KB app icon
- `expo-build-properties`: `enableProguardInReleaseBuilds` +
  `enableShrinkResourcesInReleaseBuilds` (R8 code + resource shrinking)

## Known gaps / tech debt

- **No UI tests.** Logic is covered; screens and gestures are not.
- **Old RN architecture** (`newArchEnabled: false`). Fine now; migrating later
  needs a full re-test.
- **Manual keyboard handling.** `app/file/[id].tsx` pads by the reported
  keyboard height because Expo SDK 54 forces edge-to-edge on Android. If
  keyboard bugs appear across many devices, consider
  `react-native-keyboard-controller` rather than hand-tuning insets.
- **`RECORD_AUDIO` is explicitly blocked** in `app.json` — `expo-image-picker`
  adds it by default. Don't remove `"microphonePermission": false`, or your
  listing will start asking users for microphone access.
- **`POST_NOTIFICATIONS` is added by `expo-notifications`** (Android 13+) for the
  optional daily reminder. This is a normal, low-sensitivity permission and does
  not change the Data Safety answers (the reminder is local — see Step 5). The
  permission is only requested when the user turns the reminder on.
- **Notifications can't be tested in Expo Go** on SDK 54 — use a `preview` or
  `production` EAS build.
- **App Lock can't be fully tested in Expo Go either** — `expo-local-authentication`
  needs a real build. Use `preview`/`production`.
- **Calculator evaluates left-to-right, not by operator precedence** — `2 + 3 × 4`
  gives `20` (computes `2+3` first, then `×4`), matching how a simple pocket
  calculator works, not a scientific one. This is intentional, not a bug — see
  `src/utils/calculator.ts`.
- **Currency Converter rates are a static, hand-edited default**, not live —
  the app stays fully offline on purpose. See `src/constants/approxRates.ts`.
  If live rates are ever wanted, that's a deliberate, separate decision (it
  would add a network call and change the Data Safety answers).
- **To-Do and Notepad have no undo** on delete, unlike expense entries/files.
  Low risk — Clear Done and the trash icon both ask for confirmation first.
