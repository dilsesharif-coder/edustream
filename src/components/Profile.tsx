import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, updateDoc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { User, Video, Document } from '../types';
import { Grid, FileText, Heart, Users, UserPlus, UserMinus, Settings, Edit3, LogIn } from 'lucide-react';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { sendNotification } from '../lib/notifications';

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const [user, authLoading] = useAuthState(auth);
  const [profile, setProfile] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tab, setTab] = useState<'videos' | 'documents'>('videos');
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || authLoading || !user) {
      if (!authLoading && !user) setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const path = `users/${userId}`;
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile({ uid: docSnap.id, ...docSnap.data() } as User);
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, path);
      }
      setLoading(false);
    };

    const fetchVideos = () => {
      const path = 'videos';
      const q = query(collection(db, path), where('uploaderUid', '==', userId), orderBy('createdAt', 'desc'));
      return onSnapshot(q, 
        (snapshot) => {
          setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video)));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    };

    const fetchDocuments = () => {
      const path = 'documents';
      const q = query(collection(db, path), where('uploaderUid', '==', userId), orderBy('createdAt', 'desc'));
      return onSnapshot(q, 
        (snapshot) => {
          setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document)));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    };

    const checkFollow = async () => {
      if (!user || user.uid === userId) return;
      const followId = `${user.uid}_${userId}`;
      const followSnap = await getDoc(doc(db, 'follows', followId));
      setFollowing(followSnap.exists());
    };

    fetchProfile();
    const unsubVideos = fetchVideos();
    const unsubDocs = fetchDocuments();
    checkFollow();

    return () => {
      unsubVideos();
      unsubDocs();
    };
  }, [userId, user, authLoading]);

  const toggleFollow = async () => {
    if (!user || !userId || user.uid === userId) return;
    const followId = `${user.uid}_${userId}`;
    const followRef = doc(db, 'follows', followId);
    const userRef = doc(db, 'users', userId);
    const currentUserRef = doc(db, 'users', user.uid);

    if (following) {
      await deleteDoc(followRef);
      await updateDoc(userRef, { followersCount: increment(-1) });
      await updateDoc(currentUserRef, { followingCount: increment(-1) });
      setFollowing(false);
    } else {
      await setDoc(followRef, { followerUid: user.uid, followingUid: userId });
      await updateDoc(userRef, { followersCount: increment(1) });
      await updateDoc(currentUserRef, { followingCount: increment(1) });
      setFollowing(true);
      
      // Send notification
      await sendNotification({
        recipientUid: userId,
        senderUid: user.uid,
        senderName: user.displayName || 'Someone',
        senderPhotoURL: user.photoURL || '',
        type: 'follow',
        targetId: user.uid
      });
    }
  };

  if (authLoading || (loading && user)) return <div className="pt-32 text-center">Loading profile...</div>;

  if (!user) {
    return (
      <div className="pt-32 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
          <LogIn size={40} className="text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold mb-4">User Profile</h2>
        <p className="text-gray-500 max-w-md mb-8">
          Sign in to view user profiles, follow instructors, and see their shared educational content.
        </p>
      </div>
    );
  }

  if (!profile && !loading) return <div className="pt-32 text-center">User not found</div>;

  return (
    <div className="pt-20 max-w-4xl mx-auto px-4 pb-20">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl flex-shrink-0">
          <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{profile.displayName}</h1>
            <div className="flex items-center justify-center md:justify-start gap-2">
              {user?.uid === userId ? (
                <>
                  <Link to="/settings" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-600">
                    <Settings size={20} />
                  </Link>
                  <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-all">
                    <Edit3 size={18} />
                    Edit Profile
                  </button>
                </>
              ) : (
                <button 
                  onClick={toggleFollow}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all ${following ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  {following ? <UserMinus size={18} /> : <UserPlus size={18} />}
                  {following ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-8 mb-4 text-gray-600 font-medium">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-gray-900 font-bold text-lg">{profile.followersCount}</span>
              <span className="text-sm">Followers</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="text-gray-900 font-bold text-lg">{profile.followingCount}</span>
              <span className="text-sm">Following</span>
            </div>
            <div className="flex flex-col items-center md:items-start">
              <span className="text-gray-900 font-bold text-lg">{profile.likesReceivedCount}</span>
              <span className="text-sm">Likes</span>
            </div>
          </div>

          <p className="text-gray-600 max-w-xl">{profile.bio || "No bio yet."}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex items-center justify-center gap-12">
          <button 
            onClick={() => setTab('videos')}
            className={`flex items-center gap-2 pb-4 px-2 transition-all border-b-2 ${tab === 'videos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Grid size={20} />
            <span className="font-bold">Videos</span>
          </button>
          <button 
            onClick={() => setTab('documents')}
            className={`flex items-center gap-2 pb-4 px-2 transition-all border-b-2 ${tab === 'documents' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <FileText size={20} />
            <span className="font-bold">Documents</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {tab === 'videos' ? (
          videos.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500">No videos uploaded yet.</div>
          ) : (
            videos.map(video => (
              <Link key={video.id} to={`/video/${video.id}`} className="aspect-[9/16] bg-gray-100 rounded-xl overflow-hidden relative group">
                <video src={video.videoUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-end p-3">
                  <div className="flex items-center gap-1 text-white text-sm font-bold">
                    <Heart size={16} fill="currentColor" />
                    {video.likesCount}
                  </div>
                </div>
              </Link>
            ))
          )
        ) : (
          documents.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500">No documents uploaded yet.</div>
          ) : (
            documents.map(doc => (
              <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-3">
                    <FileText size={24} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{doc.title}</h3>
                  <p className="text-xs text-gray-500 mb-4">{format(doc.createdAt.toDate(), 'MMM d, yyyy')}</p>
                </div>
                <a 
                  href={doc.fileUrl} 
                  download 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full text-center py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-700 transition-colors"
                >
                  Download
                </a>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
