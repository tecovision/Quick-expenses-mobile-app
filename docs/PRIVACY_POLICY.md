# Privacy Policy for QuickExpenses

**Last updated: [FILL IN — e.g. 17 July 2026]**

> **⚠️ BEFORE PUBLISHING:** Replace every `[FILL IN ...]` below, have it reviewed
> if you operate in a regulated market, and host it at a public URL. Both the
> App Store and Google Play require a reachable privacy-policy link, and Play
> additionally requires the Data Safety form to match this document.

## Summary

QuickExpenses is an **offline** expense tracker. Everything you enter stays on
your device. We do not run servers that receive your expense data, we have no
user accounts, and we do not sell or share your information.

## Information we collect

### Data you create, stored only on your device

The app stores the following **locally on your device only**:

- Expense file names
- Expense entries (description, amount, date, optional note)
- Optional photos you attach to entries
- Your selected currency preference

This data is never transmitted to us or to any third party. It is held in your
device's private app storage. Uninstalling the app permanently deletes it.

### Data we do not collect

- We do not collect your name, email address, or phone number.
- We have no accounts, login, or authentication.
- We do not collect your location.
- We do not use advertising identifiers, and we serve no ads.
- We do not sell or share personal information with anyone.

### Diagnostic data (crash reports)

[DELETE THIS SECTION ENTIRELY IF YOU DO NOT CONFIGURE A SENTRY DSN.]

If crash reporting is enabled, the app uses Sentry
(<https://sentry.io/privacy/>) to record technical details when the app crashes
or hits an error, so we can fix it. A report may contain:

- The error message and the code path that failed
- The app version, operating system version, and device model

Crash reports **never include your expense data** — no file names, amounts,
notes, or photos. Device and user identifiers are disabled.

## Device permissions

The app requests these permissions only at the moment you use the
corresponding feature — never on launch. Declining any of them leaves the rest
of the app fully functional.

| Permission | Why | If you decline |
|---|---|---|
| **Camera** | To photograph a receipt to attach to an expense entry | You can still add entries; you just can't take a new photo |
| **Photo library** | To attach an existing photo to an expense entry | You can still add entries; you just can't attach a saved photo |

Photos you attach are copied into the app's private storage and stay on your
device. We do not upload them.

## Sharing and exports

When you export or share a file (PDF, CSV, or ZIP), the app hands the file to
your device's own share sheet. **You** choose the destination — email, a
messaging app, cloud storage, etc. Once you send it somewhere, that
destination's own privacy policy applies. We are not involved in, and never
receive, that transfer.

## Data retention and deletion

- Deleted files go to **Recently Deleted** and are permanently removed after
  **30 days**, along with any attached photos.
- You may delete any file permanently at any time via Recently Deleted →
  Delete Forever, or Clear All.
- Uninstalling the app removes all data it stored.

Because your data never leaves your device, there is no server-side copy for us
to delete.

## Children's privacy

QuickExpenses is not directed at children under 13, and we do not knowingly
collect personal information from children.

## Your rights

Since all your data is stored locally and we have no copy of it, you have full
and direct control: you can view, edit, export, and delete everything from
within the app at any time. Depending on where you live (for example, under the
GDPR or CCPA), you may have additional statutory rights; because we hold no
personal data about you, there is nothing for us to disclose or erase on
request.

## Changes to this policy

We may update this policy. Material changes will be reflected by the "Last
updated" date above and, where appropriate, noted in the app's release notes.

## Contact

Questions about this policy:

- **Email:** [FILL IN — a monitored support email address]
- **Developer / publisher:** [FILL IN — your name or registered company name]
- **Address:** [FILL IN if required by your jurisdiction or store listing]

---

## Appendix: Google Play Data Safety answers

Use these when filling out the Play Console Data Safety form. Verify each
against your final build before submitting — you are certifying its accuracy.

**Does your app collect or share any of the required user data types?**

- If you did **not** configure a Sentry DSN → **No.**
- If you **did** configure Sentry → **Yes**, and declare:
  - Data type: **Crash logs** and **Diagnostics**, under "App activity /
    App info and performance"
  - Collected: **Yes**. Shared: **Yes** (with Sentry, a processor).
  - Purpose: **Analytics** / **App functionality** (crash diagnostics)
  - Is it required? **No** — optional, not tied to any feature.
  - Is data encrypted in transit? **Yes.**
  - Can users request deletion? **Yes** — via the contact email above.

**Expense data, photos, and financial info:** declared as **not collected**,
because it never leaves the device. Play's definition of "collection" means
transmission off the device; on-device-only storage is not collection.

**Data types that are NOT collected** (answer No to all): Location, Personal
info, Financial info, Health, Messages, Photos and videos, Audio, Files and
docs, Calendar, Contacts, App activity beyond crash logs, Web browsing,
Device or other IDs.

## Appendix: Apple App Privacy answers

In App Store Connect → App Privacy:

- If no Sentry DSN → **"Data Not Collected."**
- If Sentry is enabled → declare **Diagnostics → Crash Data**, marked
  **not linked to the user's identity** and **not used for tracking**.

Note: `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` strings
are configured in `app.json` and must remain consistent with this policy.
