import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import * as Crypto from 'expo-crypto';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { findUserByEmail, findUserByPhone, addMemberToGroup } from '../services/groupService';
import { AppUser, RootStackParamList } from '../types';
import { colors, spacing, fontSize, radius } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddMember'>;
  route: RouteProp<RootStackParamList, 'AddMember'>;
};

type Tab = 'contacts' | 'search';

interface DeviceContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export default function AddMemberScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const [tab, setTab] = useState<Tab>('contacts');

  // --- Contacts tab ---
  const [allContacts, setAllContacts] = useState<DeviceContact[]>([]);
  const [filterText, setFilterText] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [addingId, setAddingId] = useState<string | null>(null);

  // --- Search tab ---
  const [searchValue, setSearchValue] = useState('');
  const [foundUser, setFoundUser] = useState<AppUser | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    setLoadingContacts(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermissionStatus('denied');
        return;
      }
      setPermissionStatus('granted');
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
        sort: Contacts.SortTypes.FirstName,
      });
      const mapped: DeviceContact[] = [];
      for (const c of data) {
        if (!c.name) continue;
        mapped.push({
          id: c.id ?? Crypto.randomUUID(),
          name: c.name,
          phone: c.phoneNumbers?.[0]?.number,
          email: c.emails?.[0]?.email,
        });
      }
      setAllContacts(mapped);
    } catch {
      Alert.alert('Error', 'Could not load contacts.');
    } finally {
      setLoadingContacts(false);
    }
  }

  const filtered = allContacts.filter((c) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

  async function handleAddContact(contact: DeviceContact) {
    if (addingId) return;
    setAddingId(contact.id);
    try {
      let member: AppUser | null = null;

      // Try to match against registered SPLIIT users
      if (contact.phone) {
        member =
          (await findUserByPhone(contact.phone)) ||
          (await findUserByPhone(normalizePhone(contact.phone)));
      }
      if (!member && contact.email) {
        member = await findUserByEmail(contact.email.toLowerCase());
      }

      if (member) {
        await addMemberToGroup(groupId, member);
        Alert.alert('Added!', `${member.displayName} is already on SPLIIT and has been added.`);
      } else {
        // Not registered — add as guest with a stable deterministic ID
        const rawPhone = contact.phone ?? '';
        const id = rawPhone
          ? `guest_${normalizePhone(rawPhone)}`
          : Crypto.randomUUID();
        const guest: AppUser = {
          id,
          displayName: contact.name,
          ...(contact.phone ? { phone: contact.phone } : {}),
          ...(contact.email ? { email: contact.email } : {}),
        };
        await addMemberToGroup(groupId, guest);
        Alert.alert(
          'Added as Guest',
          `${contact.name} has been added. They don't have a SPLIIT account yet — you can still track expenses for them.`
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not add member.');
    } finally {
      setAddingId(null);
    }
  }

  // --- Search tab handlers ---
  const isPhone = /^[+\d]/.test(searchValue.trim()) && /\d{7,}/.test(searchValue.trim());

  async function handleSearch() {
    const val = searchValue.trim();
    if (!val) {
      Alert.alert('Error', 'Enter an email address or mobile number.');
      return;
    }
    setSearching(true);
    setFoundUser(null);
    setSearched(false);
    try {
      const user = isPhone
        ? await findUserByPhone(val)
        : await findUserByEmail(val.toLowerCase());
      setFoundUser(user);
      setSearched(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  async function handleAddSearched() {
    if (!foundUser) return;
    setAdding(true);
    try {
      await addMemberToGroup(groupId, foundUser);
      Alert.alert('Success', `${foundUser.displayName} has been added to the group.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not add member.');
    } finally {
      setAdding(false);
    }
  }

  function renderContact({ item }: { item: DeviceContact }) {
    const isAdding = addingId === item.id;
    return (
      <TouchableOpacity
        style={styles.contactRow}
        onPress={() => handleAddContact(item)}
        disabled={!!addingId}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.contactMeta} numberOfLines={1}>
            {item.phone ?? item.email ?? 'No number'}
          </Text>
        </View>
        {isAdding ? (
          <ActivityIndicator color={colors.primary} size="small" style={{ marginLeft: spacing.sm }} />
        ) : (
          <Ionicons name="person-add-outline" size={22} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'contacts' && styles.tabActive]}
          onPress={() => setTab('contacts')}
        >
          <Ionicons
            name="people-outline"
            size={15}
            color={tab === 'contacts' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, tab === 'contacts' && styles.tabTextActive]}>
            From Contacts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'search' && styles.tabActive]}
          onPress={() => setTab('search')}
        >
          <Ionicons
            name="search-outline"
            size={15}
            color={tab === 'search' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, tab === 'search' && styles.tabTextActive]}>
            By Email / Phone
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── CONTACTS TAB ── */}
      {tab === 'contacts' && (
        <>
          {loadingContacts ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading contacts…</Text>
            </View>
          ) : permissionStatus === 'denied' ? (
            <View style={styles.centered}>
              <Ionicons name="lock-closed-outline" size={56} color={colors.textMuted} />
              <Text style={styles.permTitle}>Contacts Access Denied</Text>
              <Text style={styles.permText}>
                Go to Settings → Apps → SPLIIT → Permissions and enable Contacts.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadContacts}>
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Search filter */}
              <View style={styles.filterRow}>
                <Ionicons name="search" size={17} color={colors.textMuted} style={styles.filterIcon} />
                <TextInput
                  style={styles.filterInput}
                  placeholder="Search contacts…"
                  placeholderTextColor={colors.textMuted}
                  value={filterText}
                  onChangeText={setFilterText}
                  autoCorrect={false}
                />
                {filterText.length > 0 && (
                  <TouchableOpacity onPress={() => setFilterText('')}>
                    <Ionicons name="close-circle" size={17} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.guestNote}>
                SPLIIT users are added instantly. Others are added as guests — you can still split expenses with them.
              </Text>

              <FlatList
                data={filtered}
                keyExtractor={(c) => c.id}
                renderItem={renderContact}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={filtered.length === 0 ? styles.centered : styles.listContent}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No contacts match your search.</Text>
                }
              />
            </>
          )}
        </>
      )}

      {/* ── SEARCH TAB ── */}
      {tab === 'search' && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.searchContent}>
            <Text style={styles.hint}>
              Search for a SPLIIT user by their registered email or mobile number.
            </Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Email or mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={searchValue}
                onChangeText={(v) => {
                  setSearchValue(v);
                  setSearched(false);
                  setFoundUser(null);
                }}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
                {searching ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Ionicons name="search" size={20} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>

            {searched && !foundUser && (
              <View style={[styles.centered, { marginTop: spacing.xl }]}>
                <Ionicons name="person-outline" size={40} color={colors.textMuted} />
                <Text style={styles.notFoundTitle}>User not found</Text>
                <Text style={styles.notFoundText}>
                  They may not have a SPLIIT account. Switch to "From Contacts" to add them as a guest.
                </Text>
              </View>
            )}

            {foundUser && (
              <View style={styles.userCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {foundUser.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{foundUser.displayName}</Text>
                  {foundUser.email ? (
                    <Text style={styles.contactMeta}>{foundUser.email}</Text>
                  ) : null}
                  {foundUser.phone ? (
                    <Text style={styles.contactMeta}>{foundUser.phone}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.addBtn, adding && styles.addBtnDisabled]}
                  onPress={handleAddSearched}
                  disabled={adding}
                >
                  {adding ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="person-add" size={16} color={colors.white} />
                      <Text style={styles.addBtnText}>Add</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary },

  // Contacts tab
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterIcon: { marginRight: spacing.sm },
  filterInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  guestNote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    lineHeight: 16,
  },
  listContent: { paddingBottom: 20 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  avatarText: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  contactInfo: { flex: 1, marginRight: spacing.sm },
  contactName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  contactMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },

  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  loadingText: { marginTop: spacing.md, color: colors.textSecondary, fontSize: fontSize.sm },
  permTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.md },
  permText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  retryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  retryBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  emptyText: { fontSize: fontSize.sm, color: colors.textMuted },

  // Search tab
  searchContent: { flex: 1, padding: spacing.lg },
  hint: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  searchRow: { flexDirection: 'row', gap: spacing.sm },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.md },
  notFoundText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addBtnDisabled: { opacity: 0.7 },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
});
