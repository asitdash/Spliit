import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export async function uploadReceipt(groupId: string, localUri: string): Promise<string> {
  const filename = `receipts/${groupId}/${Date.now()}.jpg`;
  const storageRef = ref(storage, filename);

  const response = await fetch(localUri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return await getDownloadURL(storageRef);
}
