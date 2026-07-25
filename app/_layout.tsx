import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useStore } from '@/store/useStore';
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

  if (isLoading) return null;

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
