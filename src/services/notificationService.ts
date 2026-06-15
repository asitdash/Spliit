import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const EAS_PROJECT_ID = '65ee55ef-d71e-4557-87c4-bc6712f2d771';

// Show notifications while app is open in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(userId: string): Promise<void> {
  if (!Device.isDevice) return; // Push tokens don't work in simulators/emulators

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SPLIIT',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5C6BC0',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus =
    existing === 'granted'
      ? existing
      : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== 'granted') return;

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })
    ).data;
    await updateDoc(doc(db, 'users', userId), { pushToken: token });
  } catch {
    // Non-critical — silently skip if FCM isn't configured yet
  }
}

export async function sendExpenseNotification(params: {
  groupId: string;
  groupName: string;
  description: string;
  amount: number;
  paidByName: string;
  currency: string;
  memberIds: string[];
  currentUserId: string;
}): Promise<void> {
  const { groupName, description, amount, paidByName, currency, memberIds, currentUserId, groupId } = params;

  // Exclude the person who added the expense and any guest members (no Firestore account)
  const recipientIds = memberIds.filter(
    (id) => id !== currentUserId && !id.startsWith('guest_')
  );
  if (recipientIds.length === 0) return;

  // Fetch all push tokens in parallel
  const snaps = await Promise.all(recipientIds.map((id) => getDoc(doc(db, 'users', id))));
  const tokens = snaps.map((s) => s.data()?.pushToken).filter(Boolean) as string[];
  if (tokens.length === 0) return;

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  // Fire-and-forget — notification failure must never block expense saving
  fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      tokens.map((to) => ({
        to,
        title: groupName,
        body: `${paidByName} paid ${formatted} for "${description}"`,
        sound: 'default',
        data: { groupId },
      }))
    ),
  }).catch(() => {});
}
