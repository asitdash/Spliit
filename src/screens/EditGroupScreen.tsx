import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { updateGroup } from '../services/groupService';
import { RootStackParamList } from '../types';
import { colors, spacing, fontSize, radius } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EditGroup'>;
  route: RouteProp<RootStackParamList, 'EditGroup'>;
};

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export default function EditGroupScreen({ navigation, route }: Props) {
  const { groupId, currentName, currentDescription, currentCurrency } = route.params;

  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription);
  const [currency, setCurrency] = useState(currentCurrency);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'Group name cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      await updateGroup(groupId, name.trim(), description.trim(), currency);
      // Update the header title in GroupDetail immediately
      navigation.navigate('GroupDetail', { groupId, groupName: name.trim() });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update group.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Group Name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Group name"
        placeholderTextColor={colors.textMuted}
        maxLength={50}
        autoFocus
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={description}
        onChangeText={setDescription}
        placeholder="What's this group for?"
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <Text style={styles.label}>Currency</Text>
      <View style={styles.currencyRow}>
        {CURRENCIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.currencyChip, currency === c && styles.currencyChipActive]}
            onPress={() => setCurrency(c)}
          >
            <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.btnText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  textarea: { height: 80 },
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  currencyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  currencyChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  currencyText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  currencyTextActive: { color: colors.primary },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
});
