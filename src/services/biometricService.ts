import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY_ENABLED = 'spliit_biometric_enabled';
const KEY_EMAIL = 'spliit_stored_email';
const KEY_PASSWORD = 'spliit_stored_password';

export async function isBiometricHardwareAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
}

export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEY_ENABLED);
  return val === 'true';
}

export async function enableBiometric(email: string, password: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_EMAIL, email);
  await SecureStore.setItemAsync(KEY_PASSWORD, password);
  await SecureStore.setItemAsync(KEY_ENABLED, 'true');
}

export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_EMAIL);
  await SecureStore.deleteItemAsync(KEY_PASSWORD);
  await SecureStore.setItemAsync(KEY_ENABLED, 'false');
}

export async function getStoredCredentials(): Promise<{ email: string; password: string } | null> {
  const email = await SecureStore.getItemAsync(KEY_EMAIL);
  const password = await SecureStore.getItemAsync(KEY_PASSWORD);
  if (!email || !password) return null;
  return { email, password };
}

export async function promptBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Login to SPLIIT',
    fallbackLabel: 'Use password instead',
    disableDeviceFallback: false,
    cancelLabel: 'Cancel',
  });
  return result.success;
}

export async function getBiometricType(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  // Android's BiometricPrompt defaults to fingerprint when a device supports
  // both fingerprint and face unlock, so check fingerprint first - otherwise
  // devices that support both report "Face ID" even though the system prompt
  // that actually appears is a fingerprint scan.
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  return 'Biometric';
}
