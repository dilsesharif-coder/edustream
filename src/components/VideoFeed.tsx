import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, increment, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Video as VideoIcon, Heart, MessageCircle, Share2, UserPlus, UserMinus, Play, Pause, Volume2, VolumeX, LogIn } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Video as VideoType, User as UserType } from '../types';
import { Link } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import VideoCard from './VideoCard';

export default function VideoFeed() {
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, authLoading] = useAuthState(auth);

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading && !user) setLoading(false);
      return;
    }

    setLoading(true);
    const path = 'videos';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const videoData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoType));
        setVideos(videoData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return () => unsubscribe();
  }, [user, authLoading]);

  if (authLoading || (loading && user)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center">
        <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mb-6">
          <LogIn size={40} className="text-indigo-500" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Welcome to EduStream</h2>
        <p className="text-gray-400 max-w-md mb-8">
          Sign in to access our library of educational videos, documents, and join virtual classrooms.
        </p>
      </div>
    );
  }

  return (
    <div className="snap-y snap-mandatory h-[calc(100vh-64px)] overflow-y-scroll bg-black">
      {videos.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-white p-4 text-center">
          <VideoIcon size={64} className="mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">No educational videos yet</h2>
          <p className="text-gray-400">Be the first to upload a lesson!</p>
          <Link to="/upload" className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-full font-bold hover:bg-indigo-700">
            Upload Now
          </Link>
        </div>
      ) : (
        videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))
      )}
    </div>
  );
}
