import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Expense, Split } from '../types';

export async function addExpense(
  groupId: string,
  description: string,
  amount: number,
  paidBy: string,
  paidByName: string,
  splits: Split[],
  category: string = 'General',
  receiptUrl?: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'groups', groupId, 'expenses'), {
    groupId,
    description,
    amount,
    paidBy,
    paidByName,
    splits,
    category,
    createdAt: serverTimestamp(),
    ...(receiptUrl ? { receiptUrl } : {}),
  });
  return docRef.id;
}

function sortExpenses(expenses: Expense[]): Expense[] {
  return expenses.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

export async function getExpenses(groupId: string): Promise<Expense[]> {
  const snap = await getDocs(collection(db, 'groups', groupId, 'expenses'));
  return sortExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
}

export function subscribeToExpenses(
  groupId: string,
  onUpdate: (expenses: Expense[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    collection(db, 'groups', groupId, 'expenses'),
    (snap) => onUpdate(sortExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)))),
    onError
  );
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  description: string,
  amount: number,
  paidBy: string,
  paidByName: string,
  splits: Split[],
  category: string,
  receiptUrl?: string
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId, 'expenses', expenseId), {
    description,
    amount,
    paidBy,
    paidByName,
    splits,
    category,
    ...(receiptUrl !== undefined ? { receiptUrl } : {}),
  });
}

export async function deleteExpense(groupId: string, expenseId: string): Promise<void> {
  await deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseId));
}
