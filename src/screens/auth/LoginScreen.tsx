import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import {
  isBiometricHardwareAvailable,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  getStoredCredentials,
  promptBiometric,
  getBiometricType,
} from '../../services/biometricService';
import { RootStackParamList } from '../../types';
import { colors, spacing, fontSize, radius } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('Fingerprint');
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  // Temporarily hold credentials to enroll after successful login
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  async function checkBiometricStatus() {
    const available = await isBiometricHardwareAvailable();
    setBiometricAvailable(available);
    if (available) {
      const enabled = await isBiometricEnabled();
      setBiometricEnabled(enabled);
      const type = await getBiometricType();
      setBiometricType(type);

      // Auto-trigger fingerprint if already enrolled
      if (enabled) {
        handleBiometricLogin();
      }
    }
  }

  // --- Fingerprint login (returning users) ---
  async function handleBiometricLogin() {
    const success = await promptBiometric();
    if (!success) return;

    const creds = await getStoredCredentials();
    if (!creds) {
      Alert.alert('Error', 'Stored credentials not found. Please login with your password.');
      await disableBiometric();
      setBiometricEnabled(false);
      return;
    }

    setLoading(true);
    try {
      await signIn(creds.email, creds.password);
    } catch {
      Alert.alert('Login Failed', 'Your password may have changed. Please login with email and password.');
      await disableBiometric();
      setBiometricEnabled(false);
    } finally {
      setLoading(false);
    }
  }

  // --- Email/password login ---
  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }

    // Show enrollment modal BEFORE signing in so the screen isn't unmounted mid-flow.
    // The modal handlers call signIn themselves after the user decides.
    if (biometricAvailable && !biometricEnabled) {
      setPendingCredentials({ email: email.trim(), password });
      setShowEnrollModal(true);
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // --- Enroll fingerprint, then sign in ---
  async function handleEnrollBiometric() {
    setShowEnrollModal(false);
    if (!pendingCredentials) return;

    const success = await promptBiometric();
    if (success) {
      await enableBiometric(pendingCredentials.email, pendingCredentials.password);
    }

    // Sign in regardless of whether biometric enrollment succeeded
    setLoading(true);
    try {
      await signIn(pendingCredentials.email, pendingCredentials.password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
      setPendingCredentials(null);
    }
  }

  async function handleSkipEnroll() {
    setShowEnrollModal(false);
    if (!pendingCredentials) return;

    setLoading(true);
    try {
      await signIn(pendingCredentials.email, pendingCredentials.password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
      setPendingCredentials(null);
    }
  }

  return (
    <>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>SPLIIT</Text>
          <Text style={styles.tagline}>Split expenses, not friendships</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Fingerprint button — only shown if already enrolled */}
          {biometricAvailable && biometricEnabled && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin}>
                <Ionicons name="finger-print" size={26} color={colors.primary} />
                <Text style={styles.biometricBtnText}>Login with {biometricType}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotRow}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkRow}>
            <Text style={styles.linkText}>
              Don't have an account?{' '}
              <Text style={styles.link}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>

      {/* Fingerprint enroll prompt modal */}
      <Modal visible={showEnrollModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="finger-print" size={56} color={colors.primary} />
            <Text style={styles.modalTitle}>Enable {biometricType} Login?</Text>
            <Text style={styles.modalText}>
              Skip typing your password next time — use your {biometricType.toLowerCase()} to open SPLIIT instantly.
            </Text>
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleEnrollBiometric}>
              <Text style={styles.modalPrimaryBtnText}>Yes, Enable {biometricType}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={handleSkipEnroll}>
              <Text style={styles.modalSecondaryBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { fontSize: 42, fontWeight: '900', color: colors.white, letterSpacing: 4 },
  tagline: { fontSize: fontSize.md, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: spacing.sm, color: colors.textMuted, fontSize: fontSize.sm },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  biometricBtnText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.md },
  forgotRow: { alignItems: 'flex-end', marginTop: spacing.xs },
  forgotText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  linkRow: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: colors.textSecondary, fontSize: fontSize.sm },
  link: { color: colors.primary, fontWeight: '700' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  modalPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.sm,
  },
  modalPrimaryBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
  modalSecondaryBtn: { padding: spacing.sm },
  modalSecondaryBtnText: { color: colors.textSecondary, fontSize: fontSize.sm },
});
