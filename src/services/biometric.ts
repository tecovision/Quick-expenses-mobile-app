import * as LocalAuthentication from 'expo-local-authentication';
import { captureError } from './monitoring';

/**
 * Thin wrapper around expo-local-authentication. The app never receives,
 * stores, or inspects any biometric data — Face ID / fingerprint capture and
 * matching happen entirely inside the OS (Android BiometricPrompt / Keystore);
 * we only ever get a yes/no result back.
 */

/** Does this device have working Face ID / fingerprint hardware with something enrolled? */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

/** A short label for what kind of biometric this device offers, for copy. */
export async function biometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    if (hasFace && hasFingerprint) return 'Face ID / Fingerprint';
    if (hasFace) return 'Face ID';
    if (hasFingerprint) return 'Fingerprint';
    return 'Screen lock';
  } catch {
    return 'Face ID / Fingerprint';
  }
}

/**
 * Prompt the OS biometric/device-credential dialog. Returns true only on a
 * genuine success. Never throws — a cancel, lockout, or hardware error all
 * just resolve to false.
 */
export async function authenticate(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      // Let the device PIN/pattern work too if biometrics fail or aren't set
      // up right now — this is a convenience lock, not a security boundary,
      // so there's no reason to strand the user out of their own data.
      disableDeviceFallback: false,
    });
    return result.success;
  } catch (e) {
    captureError(e, { op: 'biometricAuthenticate' });
    return false;
  }
}
