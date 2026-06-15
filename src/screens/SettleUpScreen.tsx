import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeToExpenses, addExpense } from '../services/expenseService';
import { calculateBalances, calculateSettlements, formatCurrency } from '../utils/calculations';
import { Settlement, RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, fontSize, radius } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SettleUp'>;
  route: RouteProp<RootStackParamList, 'SettleUp'>;
};

export default function SettleUpScreen({ navigation, route }: Props) {
  const { groupId, members, currency } = route.params;
  const { appUser } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState<string | null>(null);

  // Use real-time listener so the list updates the moment a settlement is recorded
  useEffect(() => {
    const unsub = subscribeToExpenses(
      groupId,
      (exps) => {
        const bal = calculateBalances(exps, members);
        setSettlements(calculateSettlements(bal));
        setLoading(false);
      },
      () => {
        Alert.alert('Error', 'Could not load settlements.');
        setLoading(false);
      }
    );
    return unsub;
  }, [groupId]);

  async function handleSettle(settlement: Settlement) {
    const key = `${settlement.from}-${settlement.to}`;

    const isFromMe = settlement.from === appUser?.id;
    const isToMe = settlement.to === appUser?.id;
    const label = isFromMe
      ? `Confirm that you paid ${formatCurrency(settlement.amount, currency)} to ${settlement.toName}?`
      : isToMe
      ? `Confirm that ${settlement.fromName} paid you ${formatCurrency(settlement.amount, currency)}?`
      : `Record that ${settlement.fromName} paid ${formatCurrency(settlement.amount, currency)} to ${settlement.toName}?`;

    Alert.alert('Record Settlement', label, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setSettling(key);
          try {
            // The debtor (from) is paidBy. The creditor (to) holds the full split amount.
            // This correctly credits the debtor and debits the creditor in calculateBalances.
            const splits = [
              { userId: settlement.to, userName: settlement.toName, amount: settlement.amount },
              { userId: settlement.from, userName: settlement.fromName, amount: 0 },
            ];
            await addExpense(
              groupId,
              `${settlement.fromName} paid ${settlement.toName}`,
              settlement.amount,
              settlement.from,
              settlement.fromName,
              splits,
              'Settlement'
            );
            // Real-time listener updates the list automatically — no manual reload needed
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Could not record settlement.');
          } finally {
            setSettling(null);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (settlements.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="checkmark-circle" size={72} color={colors.success} />
        <Text style={styles.allClearTitle}>All settled up!</Text>
        <Text style={styles.allClearText}>No outstanding balances in this group.</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.doneBtnText}>Back to Group</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderSettlement({ item }: { item: Settlement }) {
    const key = `${item.from}-${item.to}`;
    const isFromMe = item.from === appUser?.id;
    const isToMe = item.to === appUser?.id;
    const isSettling = settling === key;

    const btnLabel = isFromMe ? 'I Paid' : isToMe ? 'Mark Received' : 'Record Payment';
    const cardStyle = isFromMe
      ? [styles.card, styles.cardDebtor]
      : isToMe
      ? [styles.card, styles.cardCreditor]
      : [styles.card];

    return (
      <View style={cardStyle}>
        <View style={styles.cardTop}>
          <View style={styles.personBox}>
            <View style={[styles.avatar, styles.avatarRed]}>
              <Text style={[styles.avatarText, styles.avatarTextRed]}>
                {item.fromName.charAt(0)}
              </Text>
            </View>
            <Text style={styles.personName} numberOfLines={1}>
              {isFromMe ? 'You' : item.fromName}
            </Text>
            <Text style={styles.personRole}>owes</Text>
          </View>

          <View style={styles.arrowBox}>
            <Text style={styles.arrowAmount}>{formatCurrency(item.amount, currency)}</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.textSecondary} />
          </View>

          <View style={styles.personBox}>
            <View style={[styles.avatar, styles.avatarGreen]}>
              <Text style={[styles.avatarText, styles.avatarTextGreen]}>
                {item.toName.charAt(0)}
              </Text>
            </View>
            <Text style={styles.personName} numberOfLines={1}>
              {isToMe ? 'You' : item.toName}
            </Text>
            <Text style={styles.personRole}>receives</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.settleBtn, isSettling && styles.settleBtnDisabled]}
          onPress={() => handleSettle(item)}
          disabled={!!settling}
        >
          {isSettling ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.settleBtnText}>{btnLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={settlements}
      keyExtractor={(s) => `${s.from}-${s.to}`}
      renderItem={renderSettlement}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Text style={styles.header}>
          Tap the button to record that a payment was made. Balances update instantly for everyone.
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  allClearTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.md },
  allClearText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  doneBtn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  doneBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  list: { padding: spacing.md, paddingBottom: 32 },
  header: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardDebtor: { borderColor: colors.danger },
  cardCreditor: { borderColor: colors.success },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  personBox: { alignItems: 'center', flex: 1 },
  personName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.xs, textAlign: 'center' },
  personRole: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRed: { backgroundColor: '#FFEBEE' },
  avatarGreen: { backgroundColor: '#E8F5E9' },
  avatarText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary },
  avatarTextRed: { color: colors.danger },
  avatarTextGreen: { color: colors.success },
  arrowBox: { alignItems: 'center', flex: 1, gap: 4 },
  arrowAmount: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary },
  settleBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  settleBtnDisabled: { opacity: 0.7 },
  settleBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
});
