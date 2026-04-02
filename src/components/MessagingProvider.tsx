import React, { useEffect } from 'react';
import { messaging, auth, db } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [user] = useAuthState(auth);

  useEffect(() => {
    if (!user || !messaging) return;

    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Use the VAPID key from environment variables
          const vapidKey = (import.meta as any).env.VITE_FCM_VAPID_KEY;
          if (!vapidKey) {
            console.warn('VITE_FCM_VAPID_KEY is not set. Push notifications will not work.');
            return;
          }

          const token = await getToken(messaging, { vapidKey });
          if (token) {
            await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
          }
        }
      } catch (error) {
        console.error('FCM permission/token error:', error);
      }
    };

    requestPermission();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      // In-app alert for foreground messages
      if (payload.notification) {
        // You could use a toast library here, but for now we'll just log it
        // The in-app notification system (Firestore-based) will handle the UI
      }
    });

    return () => unsubscribe();
  }, [user]);

  return <>{children}</>;
}
