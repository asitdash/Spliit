import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { subscribeToGroup, removeMemberFromGroup } from '../services/groupService';
import { AppUser, Group, RootStackParamList } from '../types';
import { spacing, fontSize, radius, ThemeColors } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Members'>;
  route: RouteProp<RootStackParamList, 'Members'>;
};

export default function GroupMembersScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const { appUser } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [group, setGroup] = useState<Group | null>(null);

  React.useEffect(() => {
    const unsub = subscribeToGroup(groupId, setGroup);
    return unsub;
  }, [groupId]);

  function handleRemove(member: AppUser) {
    Alert.alert(
      'Remove Member',
      `Remove ${member.displayName} from this group? Their past expenses and splits will stay as-is.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMemberFromGroup(groupId, member.id);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not remove member.');
            }
          },
        },
      ]
    );
  }

  if (!group) return null;

  const members = Object.values(group.memberDetails) as AppUser[];

  function renderMember({ item }: { item: AppUser }) {
    const isMe = item.id === appUser?.id;
    const isCreator = item.id === group?.createdBy;
    const isGuest = item.id.startsWith('guest_');
    return (
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>
            {item.displayName}
            {isMe ? ' (You)' : ''}
          </Text>
          <Text style={styles.meta}>
            {isCreator ? 'Group creator' : isGuest ? 'Guest (not registered)' : item.email || item.phone || ''}
          </Text>
        </View>
        {!isCreator && !isMe ? (
          <TouchableOpacity
            onPress={() => handleRemove(item)}
            style={styles.removeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="person-remove-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('AddMember', { groupId })}
      >
        <Ionicons name="person-add-outline" size={18} color={colors.primary} />
        <Text style={styles.addBtnText}>Add Member</Text>
      </TouchableOpacity>
      <FlatList
        data={members}
        keyExtractor={(m) => m.id}
        renderItem={renderMember}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },
  addBtnText: { color: colors.primary, fontWeight: '600', fontSize: fontSize.sm },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: { fontWeight: '700', color: colors.primary, fontSize: fontSize.md },
  info: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  removeBtn: { padding: spacing.xs },
  });
}
