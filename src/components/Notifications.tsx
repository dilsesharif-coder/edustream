import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Notification } from '../types';
import { Bell, UserPlus, Heart, MessageSquare, Check, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const [user] = useAuthState(auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow': return <UserPlus size={16} className="text-blue-500" />;
      case 'like': return <Heart size={16} className="text-red-500 fill-red-500" />;
      case 'message': return <MessageSquare size={16} className="text-green-500" />;
      default: return <Bell size={16} className="text-gray-500" />;
    }
  };

  const getMessage = (n: Notification) => {
    switch (n.type) {
      case 'follow': return <span><strong>{n.senderName}</strong> started following you</span>;
      case 'like': return <span><strong>{n.senderName}</strong> liked your video <strong>{n.targetTitle}</strong></span>;
      case 'message': return <span>New message from <strong>{n.senderName}</strong> in <strong>{n.targetTitle}</strong></span>;
      default: return <span>New notification from <strong>{n.senderName}</strong></span>;
    }
  };

  const getLink = (n: Notification) => {
    switch (n.type) {
      case 'follow': return `/profile/${n.senderUid}`;
      case 'like': return `/profile/${user?.uid}`; // Or link to specific video if we had a video page
      case 'message': return `/classrooms`;
      default: return '#';
    }
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[100]">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 className="font-bold text-gray-900">Notifications</h3>
        <div className="flex gap-2">
          <button 
            onClick={markAllAsRead}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title="Mark all as read"
          >
            <Check size={18} />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No notifications yet</p>
            <p className="text-gray-400 text-sm mt-1">We'll alert you when something happens!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <Link
                key={n.id}
                to={getLink(n)}
                onClick={() => {
                  markAsRead(n.id);
                  onClose();
                }}
                className={`flex gap-3 p-4 hover:bg-gray-50 transition-colors relative ${!n.read ? 'bg-indigo-50/30' : ''}`}
              >
                {!n.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                )}
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                  {n.senderPhotoURL ? (
                    <img src={n.senderPhotoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold">
                      {n.senderName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800 leading-snug mb-1">
                    {getMessage(n)}
                  </div>
                  {n.messagePreview && (
                    <div className="text-xs text-gray-500 italic line-clamp-1 mb-1 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                      "{n.messagePreview}"
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    {getIcon(n.type)}
                    <span>{format(new Date(n.createdAt), 'MMM d, HH:mm')}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-gray-100 text-center bg-gray-50/50">
        <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
          View all activity
        </button>
      </div>
    </div>
  );
}
