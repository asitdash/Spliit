import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { getExpenses } from '../services/expenseService';
import { getGroup } from '../services/groupService';
import { formatCurrency } from '../utils/calculations';
import { Expense, AppUser, RootStackParamList } from '../types';
import { colors, spacing, fontSize, radius } from '../theme';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  route: RouteProp<RootStackParamList, 'Analytics'>;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Drinks': '#FF6B6B',
  'Travel':        '#4ECDC4',
  'Entertainment': '#45B7D1',
  'Shopping':      '#96CEB4',
  'Utilities':     '#FFEAA7',
  'Accommodation': '#DDA0DD',
  'General':       '#98D8C8',
  'Settlement':    '#D3D3D3',
  'Other':         '#FFB347',
};

const CHART_CONFIG = {
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(92, 107, 192, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(117, 117, 117, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.65,
  propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
  decimalPlaces: 0,
};

interface CategoryData {
  name: string;
  amount: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface MonthData {
  month: string;
  total: number;
}

interface MemberData {
  name: string;
  paid: number;
}

export default function AnalyticsScreen({ route }: Props) {
  const { groupId, currency } = route.params;
  const { appUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<AppUser[]>([]);
  const [totalSpend, setTotalSpend] = useState(0);
  const [myShare, setMyShare] = useState(0);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [memberData, setMemberData] = useState<MemberData[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [exps, group] = await Promise.all([
        getExpenses(groupId),
        getGroup(groupId),
      ]);
      // Exclude settlements from charts
      const real = exps.filter((e) => e.category !== 'Settlement');
      setExpenses(real);
      setMembers(group ? Object.values(group.memberDetails) as AppUser[] : []);
      computeStats(real);
    } catch {
      Alert.alert('Error', 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }

  function computeStats(exps: Expense[]) {
    const total = exps.reduce((s, e) => s + e.amount, 0);
    setTotalSpend(total);

    // My total share across all expenses
    const mine = exps.reduce((s, e) => {
      const split = e.splits.find((sp) => sp.userId === appUser?.id);
      return s + (split?.amount ?? 0);
    }, 0);
    setMyShare(mine);

    // --- Category breakdown ---
    const catMap: Record<string, number> = {};
    exps.forEach((e) => {
      const cat = e.category || 'General';
      catMap[cat] = (catMap[cat] ?? 0) + e.amount;
    });
    const colorKeys = Object.keys(CATEGORY_COLORS);
    let colorIdx = 0;
    const cats: CategoryData[] = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({
        name,
        amount: Math.round(amount * 100) / 100,
        color: CATEGORY_COLORS[name] ?? colorKeys[colorIdx++ % colorKeys.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 12,
      }));
    setCategoryData(cats);

    // --- Monthly spending (last 6 months) ---
    const now = new Date();
    const months: MonthData[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        month: d.toLocaleString('default', { month: 'short' }),
        total: 0,
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
      } as MonthData & { year: number; monthIdx: number };
    });

    exps.forEach((e) => {
      if (!e.createdAt) return;
      const date = e.createdAt.toDate ? e.createdAt.toDate() : new Date(e.createdAt);
      const m = months.find(
        (mo: any) => mo.monthIdx === date.getMonth() && mo.year === date.getFullYear()
      );
      if (m) m.total += e.amount;
    });
    setMonthlyData(months);

    // --- Member who paid ---
    const payMap: Record<string, { name: string; paid: number }> = {};
    exps.forEach((e) => {
      if (!payMap[e.paidBy]) payMap[e.paidBy] = { name: e.paidByName, paid: 0 };
      payMap[e.paidBy].paid += e.amount;
    });
    const mems: MemberData[] = Object.values(payMap)
      .sort((a, b) => b.paid - a.paid)
      .slice(0, 6); // max 6 bars
    setMemberData(mems);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (expenses.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="bar-chart-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No data yet</Text>
        <Text style={styles.emptyText}>Add some expenses to see charts here.</Text>
      </View>
    );
  }

  const monthLabels = monthlyData.map((m) => m.month);
  const monthValues = monthlyData.map((m) => Math.round(m.total));
  const hasMonthlyData = monthValues.some((v) => v > 0);

  const memberLabels = memberData.map((m) =>
    m.name.split(' ')[0].substring(0, 8)
  );
  const memberValues = memberData.map((m) => Math.round(m.paid));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* --- Summary Cards --- */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
          <Ionicons name="wallet-outline" size={22} color={colors.white} />
          <Text style={styles.summaryValue}>{formatCurrency(totalSpend, currency)}</Text>
          <Text style={styles.summaryLabel}>Total Spent</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#FF7043' }]}>
          <Ionicons name="person-outline" size={22} color={colors.white} />
          <Text style={styles.summaryValue}>{formatCurrency(myShare, currency)}</Text>
          <Text style={styles.summaryLabel}>Your Share</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.success }]}>
          <Ionicons name="receipt-outline" size={22} color={colors.white} />
          <Text style={styles.summaryValue}>{expenses.length}</Text>
          <Text style={styles.summaryLabel}>Expenses</Text>
        </View>
      </View>

      {/* --- Category Pie Chart --- */}
      {categoryData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          <PieChart
            data={categoryData.map((c) => ({
              ...c,
              population: c.amount,
            }))}
            width={CHART_WIDTH}
            height={200}
            chartConfig={CHART_CONFIG}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="10"
            absolute={false}
          />
          {/* Category breakdown list */}
          <View style={styles.categoryList}>
            {categoryData.map((cat) => (
              <View key={cat.name} style={styles.categoryRow}>
                <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Text style={styles.categoryAmount}>{formatCurrency(cat.amount, currency)}</Text>
                <Text style={styles.categoryPct}>
                  {totalSpend > 0 ? Math.round((cat.amount / totalSpend) * 100) : 0}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* --- Monthly Spending Bar Chart --- */}
      {hasMonthlyData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Spending (Last 6 Months)</Text>
          <BarChart
            data={{
              labels: monthLabels,
              datasets: [{ data: monthValues.map((v) => Math.max(v, 0)) }],
            }}
            width={CHART_WIDTH}
            height={200}
            chartConfig={CHART_CONFIG}
            style={styles.chart}
            showValuesOnTopOfBars
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
        </View>
      )}

      {/* --- Member Contribution Bar Chart --- */}
      {memberData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who Paid the Most</Text>
          <BarChart
            data={{
              labels: memberLabels,
              datasets: [{ data: memberValues.map((v) => Math.max(v, 0)) }],
            }}
            width={CHART_WIDTH}
            height={200}
            chartConfig={{
              ...CHART_CONFIG,
              color: (opacity = 1) => `rgba(255, 112, 67, ${opacity})`,
            }}
            style={styles.chart}
            showValuesOnTopOfBars
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
          />
          <View style={styles.memberList}>
            {memberData.map((m, i) => (
              <View key={i} style={styles.memberRow}>
                <View style={styles.memberRank}>
                  <Text style={styles.memberRankText}>{i + 1}</Text>
                </View>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.memberPaid}>{formatCurrency(m.paid, currency)}</Text>
                <Text style={styles.memberPct}>
                  {totalSpend > 0 ? Math.round((m.paid / totalSpend) * 100) : 0}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* --- Spending Trend Line Chart --- */}
      {hasMonthlyData && (
        <View style={[styles.section, { marginBottom: spacing.xl }]}>
          <Text style={styles.sectionTitle}>Spending Trend</Text>
          <LineChart
            data={{
              labels: monthLabels,
              datasets: [{ data: monthValues.map((v) => Math.max(v, 0)) }],
            }}
            width={CHART_WIDTH}
            height={180}
            chartConfig={{
              ...CHART_CONFIG,
              color: (opacity = 1) => `rgba(67, 160, 71, ${opacity})`,
              fillShadowGradient: colors.success,
              fillShadowGradientOpacity: 0.15,
            }}
            style={styles.chart}
            bezier
            fromZero
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.md },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },

  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  summaryCard: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryValue: { fontSize: fontSize.sm, fontWeight: '800', color: colors.white },
  summaryLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },

  section: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  chart: { borderRadius: radius.md, marginLeft: -spacing.md },

  categoryList: { marginTop: spacing.sm },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.sm },
  categoryName: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },
  categoryAmount: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, marginRight: spacing.sm },
  categoryPct: { fontSize: fontSize.xs, color: colors.textSecondary, width: 35, textAlign: 'right' },

  memberList: { marginTop: spacing.sm },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  memberRank: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  memberRankText: { fontSize: fontSize.xs, fontWeight: '800', color: colors.primary },
  memberName: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },
  memberPaid: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, marginRight: spacing.sm },
  memberPct: { fontSize: fontSize.xs, color: colors.textSecondary, width: 35, textAlign: 'right' },
});
