import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { addExpense } from '../services/expenseService';
import { uploadReceipt } from '../services/storageService';
import { sendExpenseNotification } from '../services/notificationService';
import { AppUser, Split, RootStackParamList } from '../types';
import { formatCurrency } from '../utils/calculations';
import { spacing, fontSize, radius, ThemeColors } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddExpense'>;
  route: RouteProp<RootStackParamList, 'AddExpense'>;
};

type SplitMode = 'equal' | 'custom';

const CATEGORIES = [
  { label: 'Food & Drinks', icon: '🍔' },
  { label: 'Travel',        icon: '✈️' },
  { label: 'Entertainment', icon: '🎬' },
  { label: 'Shopping',      icon: '🛍️' },
  { label: 'Utilities',     icon: '💡' },
  { label: 'Accommodation', icon: '🏠' },
  { label: 'General',       icon: '📦' },
  { label: 'Other',         icon: '🔖' },
];

export default function AddExpenseScreen({ navigation, route }: Props) {
  const { groupId, members, currency, groupName } = route.params;
  const { appUser } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [paidBy, setPaidBy] = useState<AppUser>(
    members.find((m) => m.id === appUser?.id) || members[0]
  );
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.id, '']))
  );
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const total = parseFloat(amount) || 0;
  const equalShare = members.length > 0 ? Math.round((total / members.length) * 100) / 100 : 0;
  const customTotal = Object.values(customAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const remaining = Math.round((total - customTotal) * 100) / 100;

  function buildSplits(): Split[] | null {
    if (splitMode === 'equal') {
      return members.map((m) => ({ userId: m.id, userName: m.displayName, amount: equalShare }));
    }
    const splits = members.map((m) => ({
      userId: m.id,
      userName: m.displayName,
      amount: parseFloat(customAmounts[m.id]) || 0,
    }));
    if (Math.abs(splits.reduce((s, sp) => s + sp.amount, 0) - total) > 0.01) {
      Alert.alert('Error', `Split amounts must add up to ${formatCurrency(total, currency)}.`);
      return null;
    }
    return splits;
  }

  async function pickReceipt() {
    Alert.alert('Add Receipt', 'Choose a source', [
      {
        text: 'Camera',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.7,
            aspect: [4, 3],
          });
          if (!result.canceled) setReceiptUri(result.assets[0].uri);
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
            aspect: [4, 3],
          });
          if (!result.canceled) setReceiptUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSave() {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description.');
      return;
    }
    if (!total || total <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    const splits = buildSplits();
    if (!splits) return;

    setLoading(true);
    try {
      // Upload receipt first if one was selected
      let receiptUrl: string | undefined;
      if (receiptUri) {
        try {
          receiptUrl = await uploadReceipt(groupId, receiptUri);
        } catch {
          Alert.alert('Warning', 'Could not upload receipt photo. Expense will be saved without it.');
        }
      }

      await addExpense(groupId, description.trim(), total, paidBy.id, paidBy.displayName, splits, category, receiptUrl);

      // Notify other group members (fire-and-forget)
      if (appUser) {
        sendExpenseNotification({
          groupId,
          groupName,
          description: description.trim(),
          amount: total,
          paidByName: paidBy.displayName,
          currency,
          memberIds: members.map((m) => m.id),
          currentUserId: appUser.id,
        });
      }

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not add expense.');
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
      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Dinner, Cab fare, Groceries"
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Amount ({currency}) *</Text>
      <TextInput
        style={[styles.input, styles.amountInput]}
        placeholder="0.00"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />

      <Text style={styles.label}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.label}
              style={[styles.catChip, category === cat.label && styles.catChipActive]}
              onPress={() => setCategory(cat.label)}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={[styles.catLabel, category === cat.label && styles.catLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.label}>Paid by</Text>
      <View style={styles.paidByRow}>
        {members.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.memberChip, paidBy.id === m.id && styles.memberChipActive]}
            onPress={() => setPaidBy(m)}
          >
            <Text style={[styles.memberChipText, paidBy.id === m.id && styles.memberChipTextActive]}>
              {m.id === appUser?.id ? 'You' : m.displayName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Split</Text>
      <View style={styles.splitModeRow}>
        <TouchableOpacity
          style={[styles.splitModeBtn, splitMode === 'equal' && styles.splitModeBtnActive]}
          onPress={() => setSplitMode('equal')}
        >
          <Ionicons name="people-outline" size={16} color={splitMode === 'equal' ? colors.white : colors.textSecondary} />
          <Text style={[styles.splitModeBtnText, splitMode === 'equal' && styles.splitModeBtnTextActive]}>Equal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.splitModeBtn, splitMode === 'custom' && styles.splitModeBtnActive]}
          onPress={() => setSplitMode('custom')}
        >
          <Ionicons name="options-outline" size={16} color={splitMode === 'custom' ? colors.white : colors.textSecondary} />
          <Text style={[styles.splitModeBtnText, splitMode === 'custom' && styles.splitModeBtnTextActive]}>Custom</Text>
        </TouchableOpacity>
      </View>

      {splitMode === 'equal' ? (
        <View style={styles.previewBox}>
          {members.map((m) => (
            <View key={m.id} style={styles.splitRow}>
              <Text style={styles.splitName}>{m.id === appUser?.id ? 'You' : m.displayName}</Text>
              <Text style={styles.splitAmount}>{formatCurrency(equalShare, currency)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.previewBox}>
          {members.map((m) => (
            <View key={m.id} style={styles.customRow}>
              <Text style={styles.splitName}>{m.id === appUser?.id ? 'You' : m.displayName}</Text>
              <TextInput
                style={styles.customInput}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={customAmounts[m.id]}
                onChangeText={(v) => setCustomAmounts((prev) => ({ ...prev, [m.id]: v }))}
              />
            </View>
          ))}
          <Text style={[styles.remaining, Math.abs(remaining) < 0.01 ? styles.textGreen : styles.textRed]}>
            {Math.abs(remaining) < 0.01
              ? '✓ Amounts match'
              : remaining > 0
              ? `Remaining: ${formatCurrency(remaining, currency)}`
              : `Over by: ${formatCurrency(-remaining, currency)}`}
          </Text>
        </View>
      )}

      {/* Receipt photo */}
      <Text style={styles.label}>Receipt Photo</Text>
      {receiptUri ? (
        <View style={styles.receiptPreviewBox}>
          <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
          <TouchableOpacity style={styles.removeReceiptBtn} onPress={() => setReceiptUri(null)}>
            <Ionicons name="close-circle" size={24} color={colors.danger} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.receiptBtn} onPress={pickReceipt}>
          <Ionicons name="camera-outline" size={22} color={colors.primary} />
          <Text style={styles.receiptBtnText}>Add Receipt Photo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.saveBtnText}>Save Expense</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </TouchableWithoutFeedback>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
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
    backgroundColor: colors.surface,
  },
  amountInput: { fontSize: fontSize.xxl, fontWeight: '700', textAlign: 'center', padding: spacing.lg },
  categoryScroll: { marginBottom: spacing.xs },
  categoryRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  catChip: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 80,
  },
  catChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  catIcon: { fontSize: 18, marginBottom: 2 },
  catLabel: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  catLabelActive: { color: colors.primary },
  paidByRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  memberChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  memberChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  memberChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  memberChipTextActive: { color: colors.primary },
  splitModeRow: { flexDirection: 'row', gap: spacing.sm },
  splitModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  splitModeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  splitModeBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  splitModeBtnTextActive: { color: colors.white },
  previewBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xs },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  splitName: { fontSize: fontSize.md, color: colors.textPrimary },
  splitAmount: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  customRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  customInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    width: 100,
    textAlign: 'right',
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  remaining: { fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center', marginTop: spacing.sm },
  textGreen: { color: colors.success },
  textRed: { color: colors.danger },
  // Receipt
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.md,
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  receiptBtnText: { color: colors.primary, fontWeight: '600', fontSize: fontSize.sm },
  receiptPreviewBox: { position: 'relative', borderRadius: radius.md, overflow: 'hidden' },
  receiptPreview: { width: '100%', height: 180, borderRadius: radius.md },
  removeReceiptBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: colors.surface, borderRadius: radius.full },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
  });
}
