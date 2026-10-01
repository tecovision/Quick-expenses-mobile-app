import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useStore } from '@/store/useStore';
import { FirstRunNotice } from '@/components/FirstRunNotice';
import { BiometricPrompt } from '@/components/BiometricPrompt';
import { LockScreen } from '@/components/LockScreen';
import { initMonitoring, captureError } from '@/services/monitoring';

// Start crash reporting before anything else can throw. No-ops without a DSN.
initMonitoring();

SplashScreen.preventAutoHideAsync().catch(() => {});

// ── Root error boundary — catches JS errors that would otherwise crash silently ──
interface EBState { error: Error | null }
class RootErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, { componentStack: info.componentStack ?? 'unknown' });
  }
  render() {
    if (this.state.error) {
      return (
        <View style={eb.container}>
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.message}>{this.state.error.message}</Text>
          <TouchableOpacity
            style={eb.retryBtn}
            onPress={() => this.setState({ error: null })}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={eb.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
const eb = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F9F9F9' },
  title:     { fontSize: 18, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 },
  message:   { fontSize: 13, color: '#787776', textAlign: 'center' },
  retryBtn:  { marginTop: 20, backgroundColor: '#1C1C1E', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  retryText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});

function RootLayout() {
  const loadData = useStore((s) => s.loadData);
  const isLoading = useStore((s) => s.isLoading);
  const showFirstRunNotice = useStore((s) => s.showFirstRunNotice);
  const acknowledgeFirstRunNotice = useStore((s) => s.acknowledgeFirstRunNotice);
  const showBiometricPrompt = useStore((s) => s.showBiometricPrompt);
  const setBiometricEnabled = useStore((s) => s.setBiometricEnabled);
  const dismissBiometricPrompt = useStore((s) => s.dismissBiometricPrompt);
  const isAppLocked = useStore((s) => s.isAppLocked);
  const unlockApp = useStore((s) => s.unlockApp);
  const lockApp = useStore((s) => s.lockApp);

  useEffect(() => {
    loadData()
      .catch((e) => {
        // loadData's own steps already fall back safely on their own errors;
        // this only fires on something truly unexpected. Force isLoading
        // false so the app shows its normal (possibly empty) UI instead of
        // being stuck rendering null forever behind a hidden splash screen.
        captureError(e, { op: 'loadData' });
        useStore.setState({ isLoading: false });
      })
      .finally(() => SplashScreen.hideAsync());
  }, []);

  // Re-lock when the app returns to the foreground after being away for a
  // while (and the lock is on). We deliberately do NOT lock immediately on
  // backgrounding — the camera, the gallery picker, the download folder
  // picker, and "Open Settings" for notifications all briefly background
  // this app to show their own native UI and then hand control back. Locking
  // on every one of those would interrupt attaching a photo or picking a
  // download folder with a surprise Face ID prompt. Instead we time the trip
  // away and only treat it as "the user actually left" past a short grace
  // window.
  const BACKGROUND_GRACE_MS = 20_000;
  const appState = useRef(AppState.currentState);
  const backgroundedAt = useRef<number | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const wasActive = appState.current === 'active';
      if (wasActive && next !== 'active') {
        backgroundedAt.current = Date.now();
      } else if (!wasActive && next === 'active') {
        const elapsed = backgroundedAt.current ? Date.now() - backgroundedAt.current : Infinity;
        if (elapsed > BACKGROUND_GRACE_MS) lockApp();
        backgroundedAt.current = null;
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [lockApp]);

  if (isLoading) return null;

  // The one-time notices queue behind each other so only one full-screen
  // modal is ever visible at a time: privacy notice → biometric offer → app.
  const biometricPromptVisible = showBiometricPrompt && !showFirstRunNotice;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F9F9F9' },
          animation: 'slide_from_right',
          // Edge swipe-back (iOS edge-only by default; the next two flags
          // make the swipe area cover the full screen on iOS and enable
          // swipe-back on Android too).
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animationTypeForReplace: 'pop',
        }}
      />
      <FirstRunNotice visible={showFirstRunNotice} onAccept={acknowledgeFirstRunNotice} />
      <BiometricPrompt
        visible={biometricPromptVisible}
        onEnable={() => setBiometricEnabled(true)}
        onDismiss={dismissBiometricPrompt}
      />
      <LockScreen visible={isAppLocked} onUnlock={unlockApp} />
    </>
  );
}

export default function Layout() {
  return (
    <RootErrorBoundary>
      <RootLayout />
    </RootErrorBoundary>
  );
}
