import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type NotificationType = 'follow' | 'like' | 'message';

interface SendNotificationParams {
  recipientUid: string;
  senderUid: string;
  senderName: string;
  senderPhotoURL?: string;
  type: NotificationType;
  targetId: string;
  targetTitle?: string;
  messagePreview?: string;
}

export async function sendNotification({
  recipientUid,
  senderUid,
  senderName,
  senderPhotoURL,
  type,
  targetId,
  targetTitle,
  messagePreview
}: SendNotificationParams) {
  if (recipientUid === senderUid) return;

  try {
    await addDoc(collection(db, 'notifications'), {
      recipientUid,
      senderUid,
      senderName,
      senderPhotoURL: senderPhotoURL || '',
      type,
      targetId,
      targetTitle: targetTitle || '',
      messagePreview: messagePreview || '',
      read: false,
      createdAt: new Date().toISOString() // Using string format as per blueprint
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}
