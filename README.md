# QuickExpenses

A mobile expense tracker built with React Native and Expo SDK 54.

---

## Features

- Create expense files and track particulars with amounts
- Search, edit, and delete entries with undo support
- Export to PDF or CSV (Excel)
- Multi-currency support (30 currencies)
- Optional local daily reminder to log expenses
- Recently Deleted with 30-day recovery window
- All data stored locally on device

---

## Prerequisites

Make sure you have the following installed before getting started:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18 or higher | https://nodejs.org |
| npm | comes with Node | — |
| Expo Go app | latest | [iOS App Store](https://apps.apple.com/app/expo-go/id982107779) / [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) |
| EAS CLI *(for production builds only)* | latest | `npm install -g eas-cli` |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Mohammad-Mustaqeem/Quick-expenses-mobile-app.git
cd Quick-expenses-mobile-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npx expo start --go
```

This opens the Metro Bundler in your terminal and shows a QR code.

### 4. Open on your phone

- **iPhone** — Open the Camera app, scan the QR code. It opens in Expo Go automatically.
- **Android** — Open the Expo Go app, tap **Scan QR code**, and scan.

> Make sure your phone and computer are on the **same Wi-Fi network**.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo dev server |
| `npm run android` | Start and open on Android emulator |
| `npm run ios` | Start and open on iOS simulator |
| `npm run type-check` | Run TypeScript type checking |
| `npm run build:android` | Build Android APK/AAB via EAS |
| `npm run build:ios` | Build iOS IPA via EAS |

---

## Project Structure

```
Quick-expenses-mobile-app/
├── app/                        # Screens (Expo Router file-based navigation)
│   ├── _layout.tsx             # Root layout — splash screen, data loading
│   ├── index.tsx               # Home screen — file list
│   ├── file/[id].tsx           # Expense file screen
│   ├── settings.tsx            # Settings — currency picker
│   ├── recently-deleted.tsx    # Recently deleted files
│   └── +not-found.tsx          # 404 handler
│
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── FileCard.tsx        # File list card
│   │   ├── EmptyState.tsx      # Empty list placeholder
│   │   ├── ExpenseForm.tsx     # Add / edit expense modal
│   │   ├── CurrencyPicker.tsx  # Currency selection modal
│   │   └── UndoToast.tsx       # Undo delete toast
│   │
│   ├── constants/
│   │   ├── theme.ts            # Colors, typography, spacing
│   │   └── currencies.ts       # 30+ supported currencies
│   │
│   ├── hooks/
│   │   └── useCurrency.ts      # Currency formatting hook
│   │
│   ├── services/
│   │   ├── storage.ts          # AsyncStorage read/write
│   │   ├── notifications.ts    # Local daily-reminder scheduling
│   │   └── export.ts           # PDF and CSV generation
│   │
│   ├── store/
│   │   └── useStore.ts         # Zustand global state
│   │
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   │
│   └── utils/
│       └── helpers.ts          # Utility functions
│
├── assets/                     # App icons and splash screen
├── app.json                    # Expo configuration
├── eas.json                    # EAS Build configuration
└── tsconfig.json               # TypeScript configuration
```

---

## Building for Production

### Android APK (for direct install / testing)

```bash
eas build --profile preview --platform android
```

### Android App Bundle (for Play Store)

```bash
eas build --profile production --platform android
```

### iOS (requires Apple Developer account)

```bash
eas build --profile production --platform ios
```

> First-time setup: run `eas login` and `eas build:configure` before your first build.

---

## Tech Stack

- **React Native** — cross-platform mobile framework
- **Expo SDK 54** — managed workflow
- **Expo Router v6** — file-based navigation
- **Zustand v5** — global state management
- **AsyncStorage** — local on-device persistence
- **expo-print + expo-sharing** — PDF and CSV export
- **TypeScript** — strict mode throughout
