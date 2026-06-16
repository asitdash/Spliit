import React, { useMemo, useState } from 'react';
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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../config/firebase';
import { RootStackParamList } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, radius, ThemeColors } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    const val = email.trim().toLowerCase();
    if (!val) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, val);
      setSent(true);
    } catch (e: any) {
      const msg =
        e.code === 'auth/user-not-found'
          ? 'No account found with this email address.'
          : e.code === 'auth/invalid-email'
          ? 'Please enter a valid email address.'
          : e.message || 'Could not send reset email. Try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.successContainer}>
        <Ionicons name="mail-unread-outline" size={72} color={colors.primary} />
        <Text style={styles.successTitle}>Check your email</Text>
        <Text style={styles.successText}>
          We've sent a password reset link to{'\n'}
          <Text style={styles.successEmail}>{email.trim().toLowerCase()}</Text>
        </Text>
        <Text style={styles.successNote}>
          Check your spam folder if you don't see it within a minute.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.backBtnText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Ionicons name="lock-open-outline" size={56} color={colors.primary} style={styles.icon} />
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter the email address you used when signing up and we'll send you a reset link.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            autoFocus
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSend}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkRow}>
            <Ionicons name="arrow-back" size={16} color={colors.primary} />
            <Text style={styles.link}>Back to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xl * 2, alignItems: 'center' },
  icon: { marginBottom: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.sm },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  btn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  link: { color: colors.primary, fontWeight: '600', fontSize: fontSize.sm },
  // Success state
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  successTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  successEmail: { fontWeight: '700', color: colors.textPrimary },
  successNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  backBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
  });
}
