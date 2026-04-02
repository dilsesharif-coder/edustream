import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Upload as UploadIcon, Video, FileText, CheckCircle, AlertCircle, Loader2, Scissors } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VideoCard from './VideoCard';
import { Video as VideoType } from '../types';

export default function Upload() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [type, setType] = useState<'video' | 'document'>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Edit states
  const [showPreview, setShowPreview] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [crop, setCrop] = useState('none');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title || !fileUrl) {
      setError('Please fill in all required fields');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const collectionName = type === 'video' ? 'videos' : 'documents';
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t !== '');
      const data = {
        uploaderUid: user.uid,
        title,
        description,
        category,
        tags: tagList,
        rating: 0,
        createdAt: serverTimestamp(),
        ...(type === 'video' 
          ? { 
              videoUrl: fileUrl, 
              likesCount: 0, 
              thumbnailUrl: '',
              editData: { trimStart, trimEnd, crop }
            } 
          : { fileUrl: fileUrl, fileType: 'pdf' }
        )
      };

      await addDoc(collection(db, collectionName), data);
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdit = (editData: { trimStart: number; trimEnd: number; crop: string }) => {
    setTrimStart(editData.trimStart);
    setTrimEnd(editData.trimEnd);
    setCrop(editData.crop);
  };

  const dummyVideo: VideoType = {
    id: 'preview',
    uploaderUid: user?.uid || '',
    title: title || 'Preview Video',
    description: description || 'Video description preview',
    videoUrl: fileUrl,
    thumbnailUrl: '',
    likesCount: 0,
    category: category,
    tags: tags.split(','),
    createdAt: new Date().toISOString()
  };

  if (!user) {
    return (
      <div className="pt-32 text-center px-4">
        <h2 className="text-2xl font-bold mb-4">Please sign in to upload content</h2>
        <p className="text-gray-600">You need an account to share educational resources.</p>
      </div>
    );
  }

  return (
    <div className="pt-24 max-w-4xl mx-auto px-4 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden h-fit">
          <div className="bg-indigo-600 p-6 text-white">
            <h1 className="text-2xl font-bold">Share Knowledge</h1>
            <p className="text-indigo-100">Upload educational videos or documents.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="flex gap-4 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType('video')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${type === 'video' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Video size={20} />
                Video
              </button>
              <button
                type="button"
                onClick={() => setType('document')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${type === 'document' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <FileText size={20} />
                Document
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to Quantum Physics"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will students learn from this?"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  {type === 'video' ? 'Video URL *' : 'Document URL *'}
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    placeholder="https://example.com/my-file.mp4"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {type === 'video' && fileUrl && (
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:text-indigo-700 transition-all"
                >
                  <Scissors size={18} />
                  {showPreview ? 'Hide Editor' : 'Open Video Editor & Preview'}
                </button>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-xl border border-green-100">
                <CheckCircle size={20} />
                <span className="text-sm font-medium">Content uploaded successfully!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || success}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadIcon size={24} />
                  Publish Content
                </>
              )}
            </button>
          </form>
        </div>

        <div className="hidden lg:block">
          {showPreview && type === 'video' && fileUrl ? (
            <div className="h-[700px] rounded-3xl overflow-hidden shadow-2xl border border-gray-200 bg-black">
              <VideoCard 
                video={dummyVideo} 
                isEditingInitial={true}
                onSaveEdit={handleSaveEdit}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Video size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Video Preview</h3>
              <p className="text-gray-500">Enter a video URL to see a preview and access editing tools like trimming and cropping.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
