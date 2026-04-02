import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import { LogIn, LogOut, User as UserIcon, Video, BookOpen, Users, Search, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import NotificationsDropdown from './Notifications';

export default function Navbar() {
  const [user] = useAuthState(auth);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          bio: '',
          followersCount: 0,
          followingCount: 0,
          likesReceivedCount: 0,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = () => {
    signOut(auth);
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50 px-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
          E
        </div>
        <span className="font-bold text-xl hidden sm:block text-gray-900">EduStream</span>
      </Link>

      <div className="flex items-center gap-1 sm:gap-4">
        <Link to="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600" title="Feed">
          <Video size={24} />
        </Link>
        <Link to="/search" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600" title="Search">
          <Search size={24} />
        </Link>
        <Link to="/documents" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600" title="Resources">
          <BookOpen size={24} />
        </Link>
        <Link to="/classrooms" className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600" title="Classrooms">
          <Users size={24} />
        </Link>
        
        {user ? (
          <div className="flex items-center gap-2 ml-2 relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 rounded-lg transition-all relative ${showNotifications ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Notifications"
            >
              <Bell size={24} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationsDropdown onClose={() => setShowNotifications(false)} />
            )}

            <Link to={`/profile/${user.uid}`} className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-100 hover:border-indigo-500 transition-colors">
              <img src={user.photoURL || ''} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </Link>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
          >
            <LogIn size={20} />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
}
