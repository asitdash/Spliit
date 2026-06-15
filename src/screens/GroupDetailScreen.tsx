import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
  Image,
  Linking,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToGroup, deleteGroup } from '../services/groupService';
import { subscribeToExpenses, deleteExpense } from '../services/expenseService';
import { calculateBalances, calculateSettlements, formatCurrency } from '../utils/calculations';
import { Group, Expense, Balance, Settlement, AppUser, RootStackParamList } from '../types';
import { colors, spacing, fontSize, radius } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GroupDetail'>;
  route: RouteProp<RootStackParamList, 'GroupDetail'>;
};

type Tab = 'expenses' | 'balances';

export default function GroupDetailScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const { appUser } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [tab, setTab] = useState<Tab>('expenses');
  const [showGroupMenu, setShowGroupMenu] = useState(false);

  // Keep latest group/expenses in refs so the balance recalc always uses fresh data
  const groupRef = useRef<Group | null>(null);
  const expensesRef = useRef<Expense[]>([]);

  function recalc(g: Group | null, exps: Expense[]) {
    if (!g) return;
    const members = Object.values(g.memberDetails) as AppUser[];
    const bal = calculateBalances(exps, members);
    setBalances(bal);
    setSettlements(calculateSettlements(bal));
  }

  // Real-time group listener (member additions show instantly for everyone)
  useEffect(() => {
    const unsub = subscribeToGroup(
      groupId,
      (g) => {
        setGroup(g);
        groupRef.current = g;
        recalc(g, expensesRef.current);
      },
      () => Alert.alert('Error', 'Could not sync group.')
    );
    return unsub;
  }, [groupId]);

  // Real-time expenses listener (new expense appears instantly for all members)
  useEffect(() => {
    const unsub = subscribeToExpenses(
      groupId,
      (exps) => {
        setExpenses(exps);
        expensesRef.current = exps;
        recalc(groupRef.current, exps);
      },
      () => Alert.alert('Error', 'Could not sync expenses.')
    );
    return unsub;
  }, [groupId]);

  function handleGroupMenu() {
    setShowGroupMenu(true);
  }

  async function handleDeleteGroup() {
    if (!group) return;
    Alert.alert(
      'Delete Group',
      `Delete "${group.name}" and all its expenses? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(groupId);
              navigation.navigate('Home');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not delete group.');
            }
          },
        },
      ]
    );
  }

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleGroupMenu} style={{ marginRight: 4, padding: 4 }}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, group]);

  function handleExpenseMenu(expense: Expense) {
    const members = group ? (Object.values(group.memberDetails) as AppUser[]) : [];
    Alert.alert(expense.description, `${formatCurrency(expense.amount, group?.currency)}  ·  Paid by ${expense.paidByName}`, [
      {
        text: '✏️  Edit Expense',
        onPress: () =>
          navigation.navigate('EditExpense', {
            groupId,
            expense,
            members,
            currency: group?.currency ?? 'INR',
          }),
      },
      {
        text: '🗑️  Delete Expense',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete Expense', `Delete "${expense.description}"? This cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteExpense(groupId, expense.id);
                } catch (e: any) {
                  Alert.alert('Error', e.message || 'Could not delete expense.');
                }
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function renderExpense({ item }: { item: Expense }) {
    const myShare = item.splits.find((s) => s.userId === appUser?.id)?.amount ?? 0;
    const iPaid = item.paidBy === appUser?.id;
    return (
      <TouchableOpacity
        style={styles.expenseCard}
        onPress={() => handleExpenseMenu(item)}
        activeOpacity={0.8}
      >
        <View style={styles.expenseIconBox}>
          <Ionicons name="receipt-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDesc}>{item.description}</Text>
          <Text style={styles.expenseMeta}>
            Paid by {iPaid ? 'you' : item.paidByName}
          </Text>
        </View>
        <View style={styles.expenseAmounts}>
          <Text style={styles.expenseTotal}>{formatCurrency(item.amount, group?.currency)}</Text>
          <Text style={[styles.expenseShare, iPaid ? styles.textGreen : styles.textRed]}>
            {iPaid ? `+${formatCurrency(item.amount - myShare, group?.currency)}` : `-${formatCurrency(myShare, group?.currency)}`}
          </Text>
          {item.receiptUrl ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(item.receiptUrl!)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="image-outline" size={14} color={colors.primary} style={{ marginTop: 2 }} />
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  function renderBalance({ item }: { item: Balance }) {
    const isMe = item.userId === appUser?.id;
    const positive = item.net > 0;
    return (
      <View style={styles.balanceRow}>
        <View style={styles.balanceAvatar}>
          <Text style={styles.balanceAvatarText}>{item.userName.charAt(0)}</Text>
        </View>
        <Text style={styles.balanceName}>{isMe ? 'You' : item.userName}</Text>
        <Text style={[styles.balanceAmount, positive ? styles.textGreen : item.net < 0 ? styles.textRed : styles.textMuted]}>
          {item.net === 0
            ? 'Settled'
            : positive
            ? `gets back ${formatCurrency(item.net, group?.currency)}`
            : `owes ${formatCurrency(item.net, group?.currency)}`}
        </Text>
      </View>
    );
  }

  function renderSettlement({ item }: { item: Settlement }) {
    const isFromMe = item.from === appUser?.id;
    const isToMe = item.to === appUser?.id;
    return (
      <View style={[styles.settlementRow, isFromMe && styles.settlementHighlight]}>
        <Ionicons name="arrow-forward" size={16} color={isFromMe ? colors.danger : colors.textSecondary} />
        <Text style={styles.settlementText}>
          {isFromMe ? 'You' : item.fromName} →{' '}
          {isToMe ? 'You' : item.toName}:{' '}
          <Text style={styles.settlementAmount}>{formatCurrency(item.amount, group?.currency)}</Text>
        </Text>
      </View>
    );
  }

  if (!group) return null;

  const members = Object.values(group.memberDetails) as AppUser[];

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'expenses' && styles.tabActive]}
          onPress={() => setTab('expenses')}
        >
          <Text style={[styles.tabText, tab === 'expenses' && styles.tabTextActive]}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'balances' && styles.tabActive]}
          onPress={() => setTab('balances')}
        >
          <Text style={[styles.tabText, tab === 'balances' && styles.tabTextActive]}>Balances</Text>
        </TouchableOpacity>
      </View>

      {tab === 'expenses' ? (
        <FlatList
          data={expenses}
          keyExtractor={(e) => e.id}
          renderItem={renderExpense}
          contentContainerStyle={expenses.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptyText}>Tap + to add the first expense.</Text>
            </View>
          }
          ListHeaderComponent={
            expenses.length > 0 ? (
              <Text style={styles.longPressHint}>Tap an expense to edit or delete it</Text>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={balances}
          keyExtractor={(b) => b.userId}
          renderItem={renderBalance}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            settlements.length > 0 ? (
              <View style={styles.settlementsSection}>
                <Text style={styles.sectionTitle}>Suggested Settlements</Text>
                {settlements.map((s, i) => renderSettlement({ item: s }))}
                <TouchableOpacity
                  style={styles.settleBtn}
                  onPress={() => navigation.navigate('SettleUp', { groupId, members, currency: group.currency })}
                >
                  <Text style={styles.settleBtnText}>Settle Up</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={56} color={colors.success} />
              <Text style={styles.emptyTitle}>All settled up!</Text>
            </View>
          }
        />
      )}

      {/* FAB - Add Expense */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense', { groupId, members, currency: group.currency, groupName: group.name })}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </TouchableOpacity>

      {/* Group action sheet */}
      <Modal visible={showGroupMenu} transparent animationType="slide" onRequestClose={() => setShowGroupMenu(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setShowGroupMenu(false)}>
          <View style={styles.menuSheet}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuTitle}>{group.name}</Text>

            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowGroupMenu(false);
              navigation.navigate('EditGroup', {
                groupId,
                currentName: group.name,
                currentDescription: group.description ?? '',
                currentCurrency: group.currency,
              });
            }}>
              <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
              <Text style={styles.menuItemText}>Edit Group</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowGroupMenu(false);
              navigation.navigate('AddMember', { groupId });
            }}>
              <Ionicons name="person-add-outline" size={22} color={colors.textPrimary} />
              <Text style={styles.menuItemText}>Add Member</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowGroupMenu(false);
              navigation.navigate('Analytics', { groupId, groupName: group.name, currency: group.currency });
            }}>
              <Ionicons name="bar-chart-outline" size={22} color={colors.textPrimary} />
              <Text style={styles.menuItemText}>Analytics</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => {
              setShowGroupMenu(false);
              handleDeleteGroup();
            }}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Delete Group</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuCancel]} onPress={() => setShowGroupMenu(false)}>
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  listContent: { padding: spacing.md, paddingBottom: 80 },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.md },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  longPressHint: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm, textAlign: 'center' },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  expenseIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  expenseMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  expenseAmounts: { alignItems: 'flex-end' },
  expenseTotal: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  expenseShare: { fontSize: fontSize.xs, fontWeight: '600', marginTop: 2 },
  textGreen: { color: colors.success },
  textRed: { color: colors.danger },
  textMuted: { color: colors.textMuted },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  balanceAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  balanceAvatarText: { fontWeight: '700', color: colors.primary },
  balanceName: { flex: 1, fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  balanceAmount: { fontSize: fontSize.sm, fontWeight: '600' },
  settlementsSection: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  settlementRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.xs },
  settlementHighlight: {},
  settlementText: { fontSize: fontSize.sm, color: colors.textPrimary, flex: 1 },
  settlementAmount: { fontWeight: '700', color: colors.primary },
  settleBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  settleBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 32,
    paddingHorizontal: spacing.md,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  menuTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  menuItemText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  menuCancel: {
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  menuCancelText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});
