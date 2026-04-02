import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { doc, updateDoc, increment, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Heart, MessageCircle, Share2, Play, Pause, Volume2, VolumeX, Scissors, Crop, Check, X, RotateCcw } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'motion/react';
import { Video as VideoType, User as UserType } from '../types';
import { Link } from 'react-router-dom';
import { sendNotification } from '../lib/notifications';

interface VideoCardProps {
  video: VideoType;
  isEditingInitial?: boolean;
  onSaveEdit?: (editData: { trimStart: number; trimEnd: number; crop: string }) => void;
}

export default function VideoCard({ video, isEditingInitial = false, onSaveEdit }: VideoCardProps) {
  const [user] = useAuthState(auth);
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [uploader, setUploader] = useState<UserType | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState(isEditingInitial);
  const [trimStart, setTrimStart] = useState(video.editData?.trimStart || 0);
  const [trimEnd, setTrimEnd] = useState(video.editData?.trimEnd || 0);
  const [crop, setCrop] = useState(video.editData?.crop || 'none'); // 'none', '16:9', '4:3', '1:1'

  useEffect(() => {
    if (video.editData) {
      setTrimStart(video.editData.trimStart);
      setTrimEnd(video.editData.trimEnd);
      setCrop(video.editData.crop);
    }
  }, [video.editData]);

  useEffect(() => {
    if (!user) return;
    
    const likeId = `${user.uid}_${video.id}`;
    const checkLike = async () => {
      try {
        const likeSnap = await getDoc(doc(db, 'likes', likeId));
        setLiked(likeSnap.exists());
      } catch (e) {}
    };
    
    const followId = `${user.uid}_${video.uploaderUid}`;
    const checkFollow = async () => {
      try {
        const followSnap = await getDoc(doc(db, 'follows', followId));
        setFollowing(followSnap.exists());
      } catch (e) {}
    };

    const fetchUploader = async () => {
      try {
        const uploaderSnap = await getDoc(doc(db, 'users', video.uploaderUid));
        if (uploaderSnap.exists()) {
          setUploader({ uid: uploaderSnap.id, ...uploaderSnap.data() } as UserType);
        }
      } catch (e) {}
    };

    checkLike();
    checkFollow();
    fetchUploader();
  }, [user, video.id, video.uploaderUid]);

  useEffect(() => {
    if (isEditing && duration > 0 && trimEnd === 0) {
      setTrimEnd(duration);
    }
  }, [isEditing, duration]);

  const handleInteraction = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const toggleLike = async () => {
    if (!user) return;
    const likeId = `${user.uid}_${video.id}`;
    const likeRef = doc(db, 'likes', likeId);
    const videoRefDoc = doc(db, 'videos', video.id);

    if (liked) {
      await deleteDoc(likeRef);
      await updateDoc(videoRefDoc, { likesCount: increment(-1) });
      setLiked(false);
    } else {
      await setDoc(likeRef, { userUid: user.uid, videoId: video.id });
      await updateDoc(videoRefDoc, { likesCount: increment(1) });
      setLiked(true);
      
      await sendNotification({
        recipientUid: video.uploaderUid,
        senderUid: user.uid,
        senderName: user.displayName || 'Someone',
        senderPhotoURL: user.photoURL || '',
        type: 'like',
        targetId: video.id,
        targetTitle: video.title
      });
    }
  };

  const toggleFollow = async () => {
    if (!user || user.uid === video.uploaderUid) return;
    const followId = `${user.uid}_${video.uploaderUid}`;
    const followRef = doc(db, 'follows', followId);

    if (following) {
      await deleteDoc(followRef);
      setFollowing(false);
    } else {
      await setDoc(followRef, { followerUid: user.uid, followingUid: video.uploaderUid });
      setFollowing(true);
      
      await sendNotification({
        recipientUid: video.uploaderUid,
        senderUid: user.uid,
        senderName: user.displayName || 'Someone',
        senderPhotoURL: user.photoURL || '',
        type: 'follow',
        targetId: user.uid
      });
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
    handleInteraction();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume > 0) {
        setMuted(false);
        videoRef.current.muted = false;
      } else {
        setMuted(true);
        videoRef.current.muted = true;
      }
    }
    handleInteraction();
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !muted;
      setMuted(newMuted);
      videoRef.current.muted = newMuted;
      if (!newMuted && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
    handleInteraction();
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);

      // Handle trim loop
      const effectiveTrimStart = isEditing ? trimStart : (video.editData?.trimStart || 0);
      const effectiveTrimEnd = isEditing ? trimEnd : (video.editData?.trimEnd || duration);

      if (effectiveTrimEnd > 0) {
        if (time >= effectiveTrimEnd) {
          videoRef.current.currentTime = effectiveTrimStart;
        } else if (time < effectiveTrimStart) {
          videoRef.current.currentTime = effectiveTrimStart;
        }
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (trimEnd === 0) setTrimEnd(videoRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (onSaveEdit) {
      onSaveEdit({ trimStart, trimEnd, crop });
    } else if (user?.uid === video.uploaderUid) {
      try {
        const videoRefDoc = doc(db, 'videos', video.id);
        await updateDoc(videoRefDoc, {
          editData: { trimStart, trimEnd, crop }
        });
      } catch (e) {
        console.error('Failed to save edits:', e);
      }
    }
    setIsEditing(false);
  };

  const resetEdits = () => {
    setTrimStart(0);
    setTrimEnd(duration);
    setCrop('none');
  };

  const thumbnailUrl = video.thumbnailUrl || `https://picsum.photos/seed/${video.id}/1080/1920?blur=4`;

  const effectiveTrimStart = isEditing ? trimStart : (video.editData?.trimStart || 0);
  const effectiveTrimEnd = isEditing ? trimEnd : (video.editData?.trimEnd || duration);
  const effectiveDuration = Math.max(0, effectiveTrimEnd - effectiveTrimStart);
  const effectiveCurrentTime = Math.max(0, currentTime - effectiveTrimStart);
  const effectiveCrop = isEditing ? crop : (video.editData?.crop || 'none');

  return (
    <div 
      className="snap-start h-full w-full relative flex items-center justify-center bg-black overflow-hidden group"
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
    >
      <div className={`h-full w-full flex items-center justify-center transition-all duration-300 ${
        effectiveCrop === '1:1' ? 'aspect-square max-h-full' : 
        effectiveCrop === '4:3' ? 'aspect-[4/3] max-h-full' : 
        effectiveCrop === '16:9' ? 'aspect-video max-h-full' : 'w-full h-full'
      }`}>
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={thumbnailUrl}
          className="h-full w-full object-contain cursor-pointer"
          loop={!isEditing}
          muted={muted}
          autoPlay
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          playsInline
        />
      </div>

      {/* Custom Controls Overlay */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: (showControls || !playing) && !isEditing ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/20 pointer-events-none flex items-center justify-center"
      >
        <div className="pointer-events-auto flex items-center gap-8">
          <button 
            onClick={togglePlay}
            className="p-4 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-all transform hover:scale-110"
          >
            {playing ? <Pause size={48} fill="currentColor" /> : <Play size={48} fill="currentColor" className="ml-1" />}
          </button>
        </div>
      </motion.div>

      {/* Editing UI Overlay */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-xl p-6 border-t border-white/10 z-50"
          >
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between text-white mb-2">
                <div className="flex items-center gap-2">
                  <Scissors size={20} className="text-indigo-400" />
                  <h4 className="font-bold">Trim Video</h4>
                </div>
                <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded">
                  {formatTime(trimStart)} - {formatTime(trimEnd)}
                </span>
              </div>

              {/* Trim Slider */}
              <div className="relative h-12 bg-white/5 rounded-lg border border-white/10 flex items-center px-2">
                <div className="absolute inset-y-0 bg-indigo-500/20 border-x-2 border-indigo-500" style={{
                  left: `${(trimStart / (duration || 1)) * 100}%`,
                  right: `${100 - (trimEnd / (duration || 1)) * 100}%`
                }} />
                
                <input 
                  type="range" 
                  min="0" 
                  max={duration} 
                  step="0.1"
                  value={trimStart}
                  onChange={(e) => setTrimStart(Math.min(parseFloat(e.target.value), trimEnd - 0.5))}
                  className="absolute inset-x-0 h-full opacity-0 cursor-pointer z-10"
                />
                <input 
                  type="range" 
                  min="0" 
                  max={duration} 
                  step="0.1"
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Math.max(parseFloat(e.target.value), trimStart + 0.5))}
                  className="absolute inset-x-0 h-full opacity-0 cursor-pointer z-10"
                />
                
                {/* Visual markers */}
                <div className="w-full flex justify-between px-1 pointer-events-none">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="w-px h-2 bg-white/20" />
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-white">
                    <Crop size={20} className="text-indigo-400" />
                    <span className="text-sm font-bold">Crop Aspect Ratio</span>
                  </div>
                  <div className="flex gap-2">
                    {['none', '16:9', '4:3', '1:1'].map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => setCrop(ratio)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          crop === ratio ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                      >
                        {ratio.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={resetEdits}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all text-sm font-bold"
                  >
                    <RotateCcw size={18} />
                    Reset
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all text-sm font-bold"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all text-sm font-bold shadow-lg shadow-indigo-500/20"
                  >
                    <Check size={18} />
                    Apply Changes
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls Bar */}
      {!isEditing && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: showControls ? 0 : 20, opacity: showControls ? 1 : 0 }}
          className="absolute bottom-24 left-6 right-20 flex items-center gap-4 bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10"
        >
          <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-colors">
            {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>

          <div className="flex items-center gap-2 group/volume relative">
            <button onClick={toggleMute} className="text-white hover:text-indigo-400 transition-colors">
              {muted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
            
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.1" 
              value={muted ? 0 : volume} 
              onChange={handleVolumeChange}
              className="w-24 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${(effectiveCurrentTime / (effectiveDuration || 1)) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <span className="text-[10px] text-white font-mono whitespace-nowrap">
              {formatTime(effectiveCurrentTime)} / {formatTime(effectiveDuration)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Overlay UI (Info) */}
      {!isEditing && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none">
          <div className="max-w-lg pointer-events-auto">
            <Link to={`/profile/${video.uploaderUid}`} className="flex items-center gap-3 mb-3 group">
              <div className="w-10 h-10 rounded-full bg-gray-600 border border-white/20 overflow-hidden">
                {uploader?.photoURL ? (
                  <img 
                    src={uploader.photoURL} 
                    alt={uploader.displayName} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-xs font-bold">
                    {uploader?.displayName?.charAt(0) || 'EDU'}
                  </div>
                )}
              </div>
              <span className="font-bold group-hover:underline">
                {uploader?.displayName || 'Uploader Profile'}
              </span>
              {user && user.uid !== video.uploaderUid && (
                <button 
                  onClick={(e) => { e.preventDefault(); toggleFollow(); }}
                  className={following ? "text-xs bg-white/20 px-3 py-1 rounded-full" : "text-xs bg-indigo-600 px-3 py-1 rounded-full font-bold"}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
              )}
            </Link>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold mb-1 flex-1">{video.title}</h3>
              {user?.uid === video.uploaderUid && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-indigo-400"
                  title="Edit Video"
                >
                  <Scissors size={20} />
                </button>
              )}
            </div>
            <p className="text-sm text-gray-300 line-clamp-2">{video.description}</p>
          </div>
        </div>
      )}

      {/* Side Actions */}
      {!isEditing && (
        <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center">
          <button onClick={toggleLike} className="flex flex-col items-center gap-1 group">
            <div className={`p-3 rounded-full transition-all ${liked ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              <Heart size={28} fill={liked ? "currentColor" : "none"} />
            </div>
            <span className="text-white text-xs font-bold">{video.likesCount}</span>
          </button>

          <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
              <MessageCircle size={28} />
            </div>
            <span className="text-white text-xs font-bold">Chat</span>
          </button>

          <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
              <Share2 size={28} />
            </div>
            <span className="text-white text-xs font-bold">Share</span>
          </button>
        </div>
      )}
    </div>
  );
}
