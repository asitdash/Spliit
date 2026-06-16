import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  isBiometricHardwareAvailable,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  promptBiometric,
  getBiometricType,
  getStoredCredentials,
} from '../services/biometricService';
import { spacing, fontSize, radius, ThemeColors } from '../theme';

export default function ProfileScreen() {
  const { appUser, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('Fingerprint');

  useEffect(() => {
    loadBiometricStatus();
  }, []);

  async function loadBiometricStatus() {
    const available = await isBiometricHardwareAvailable();
    setBiometricAvailable(available);
    if (available) {
      setBiometricEnabled(await isBiometricEnabled());
      setBiometricType(await getBiometricType());
    }
  }

  async function handleToggleBiometric(value: boolean) {
    if (value) {
      // Enabling — verify fingerprint first, then check we have credentials
      const creds = await getStoredCredentials();
      if (!creds) {
        Alert.alert(
          'Cannot Enable',
          'Please log out and log back in with email/password first to set up fingerprint login.',
        );
        return;
      }
      const success = await promptBiometric();
      if (success) {
        await enableBiometric(creds.email, creds.password);
        setBiometricEnabled(true);
        Alert.alert('Enabled', `${biometricType} login is now active.`);
      }
    } else {
      Alert.alert(`Disable ${biometricType}?`, 'You will need to use your password to log in.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            await disableBiometric();
            setBiometricEnabled(false);
          },
        },
      ]);
    }
  }

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatarBox}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{appUser?.displayName?.charAt(0)?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.name}>{appUser?.displayName}</Text>
        {appUser?.email ? <Text style={styles.meta}>{appUser.email}</Text> : null}
        {appUser?.phone ? <Text style={styles.meta}>{appUser.phone}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Appearance</Text>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={22} color={colors.primary} />
            <View>
              <Text style={styles.rowText}>Dark Mode</Text>
              <Text style={styles.rowSubText}>{isDark ? 'On' : 'Off'}</Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={isDark ? colors.primary : colors.textMuted}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Security</Text>

        {biometricAvailable ? (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="finger-print" size={22} color={colors.primary} />
              <View>
                <Text style={styles.rowText}>{biometricType} Login</Text>
                <Text style={styles.rowSubText}>
                  {biometricEnabled ? 'Tap to disable' : 'Use fingerprint to open app'}
                </Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={biometricEnabled ? colors.primary : colors.textMuted}
            />
          </View>
        ) : (
          <View style={styles.row}>
            <Ionicons name="finger-print-outline" size={22} color={colors.textMuted} />
            <Text style={[styles.rowText, { color: colors.textMuted }]}>
              Fingerprint not available on this device
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <View style={styles.rowLeft}>
            <Ionicons name="log-out-outline" size={22} color={colors.danger} />
            <Text style={[styles.rowText, { color: colors.danger }]}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>SPLIIT v1.0.0</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    avatarBox: {
      alignItems: 'center',
      padding: spacing.xl,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    avatarText: { fontSize: fontSize.xxxl, fontWeight: '900', color: colors.primary },
    name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
    meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
    section: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      overflow: 'hidden',
    },
    sectionLabel: {
      fontSize: fontSize.xs,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
    rowText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
    rowSubText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
    version: {
      textAlign: 'center',
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 'auto',
      padding: spacing.lg,
    },
  });
}
