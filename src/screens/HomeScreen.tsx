import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeToUserGroups } from '../services/groupService';
import { Group, RootStackParamList } from '../types';
import { spacing, fontSize, radius, ThemeColors } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { appUser, logout } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener — any group change (new member, name edit, etc.) updates instantly
  useEffect(() => {
    if (!appUser) return;
    const unsub = subscribeToUserGroups(
      appUser.id,
      (data) => {
        setGroups(data);
        setLoading(false);
      },
      () => {
        Alert.alert('Error', 'Could not load groups.');
        setLoading(false);
      }
    );
    return unsub; // cleans up listener when screen unmounts
  }, [appUser]);

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  }

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={{ marginRight: 4 }}>
          <Ionicons name="log-out-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  function renderGroup({ item }: { item: Group }) {
    const memberCount = item.members.length;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('GroupDetail', { groupId: item.id, groupName: item.name })}
        activeOpacity={0.75}
      >
        <View style={styles.groupIcon}>
          <Text style={styles.groupIconText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupMeta}>
            {memberCount} member{memberCount !== 1 ? 's' : ''} · {item.currency}
          </Text>
          {item.description ? (
            <Text style={styles.groupDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.greetRow}>
        <Text style={styles.greet}>Hi, {appUser?.displayName?.split(' ')[0]} 👋</Text>
        <Text style={styles.greetSub}>Your groups</Text>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroup}
        contentContainerStyle={groups.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptyText}>Create a group and start splitting expenses with friends.</Text>
            </View>
          )
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateGroup')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    greetRow: { padding: spacing.lg, paddingBottom: spacing.sm },
    greet: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
    greetSub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
    list: { padding: spacing.md, paddingTop: spacing.sm },
    empty: { flex: 1 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    groupIcon: {
      width: 46,
      height: 46,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    groupIconText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary },
    groupInfo: { flex: 1 },
    groupName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
    groupMeta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
    groupDesc: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.md },
    emptyText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
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
  });
}
