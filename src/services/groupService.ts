import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Group, AppUser } from '../types';

export async function createGroup(
  name: string,
  description: string,
  currency: string,
  creator: AppUser
): Promise<string> {
  const ref = await addDoc(collection(db, 'groups'), {
    name,
    description,
    currency,
    members: [creator.id],
    memberDetails: { [creator.id]: creator },
    createdBy: creator.id,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** One-time fetch — use subscribeToUserGroups for real-time */
export async function getUserGroups(userId: string): Promise<Group[]> {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', userId)
  );
  const snap = await getDocs(q);
  const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
  // Sort client-side to avoid needing a composite Firestore index
  return groups.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

/** Real-time listener — calls onUpdate whenever any group changes */
export function subscribeToUserGroups(
  userId: string,
  onUpdate: (groups: Group[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', userId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
      // Sort newest first client-side
      groups.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      onUpdate(groups);
    },
    onError
  );
}

/** Real-time listener for a single group document */
export function subscribeToGroup(
  groupId: string,
  onUpdate: (group: Group | null) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    doc(db, 'groups', groupId),
    (snap) => onUpdate(snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null),
    onError
  );
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Group;
}

export async function addMemberToGroup(groupId: string, member: AppUser): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayUnion(member.id),
    [`memberDetails.${member.id}`]: member,
  });
}

export async function updateGroup(
  groupId: string,
  name: string,
  description: string,
  currency: string
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), { name, description, currency });
}

export async function deleteGroup(groupId: string): Promise<void> {
  // Delete all expenses in the subcollection first (Firestore doesn't cascade)
  const expensesSnap = await getDocs(collection(db, 'groups', groupId, 'expenses'));
  const batch = writeBatch(db);
  expensesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'groups', groupId));
  await batch.commit();
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as AppUser;
}

export async function findUserByPhone(phone: string): Promise<AppUser | null> {
  const q = query(collection(db, 'users'), where('phone', '==', phone));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as AppUser;
}
