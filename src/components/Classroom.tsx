import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Classroom as ClassroomType, Message } from '../types';
import { Users, Send, Plus, MessageSquare, Info, Loader2, LogIn } from 'lucide-react';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { sendNotification } from '../lib/notifications';

export default function Classrooms() {
  const [user, authLoading] = useAuthState(auth);
  const [classrooms, setClassrooms] = useState<ClassroomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomType | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading && !user) setLoading(false);
      return;
    }

    setLoading(true);
    const path = 'classrooms';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setClassrooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassroomType)));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return () => unsubscribe();
  }, [user, authLoading]);

  if (authLoading || (loading && user)) return <div className="pt-32 text-center">Loading classrooms...</div>;

  if (!user) {
    return (
      <div className="pt-32 flex flex-col items-center justify-center p-6 text-center w-full">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
          <LogIn size={40} className="text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Join the Classroom</h2>
        <p className="text-gray-500 max-w-md mb-8">
          Sign in to join virtual classrooms, participate in discussions, and collaborate with other students.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-16 h-[calc(100vh-64px)] flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-xl text-gray-900">Classrooms</h2>
          <button 
            onClick={() => setShowCreate(true)}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {classrooms.map(room => (
            <button
              key={room.id}
              onClick={() => setSelectedClassroom(room)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${selectedClassroom?.id === room.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Users size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{room.name}</div>
                <div className="text-xs opacity-70 truncate">{room.members.length} members</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedClassroom ? (
          <ClassroomChat classroom={selectedClassroom} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Classroom</h3>
            <p className="max-w-xs">Choose a classroom from the sidebar to join the discussion and access shared resources.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateClassroomModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function ClassroomChat({ classroom }: { classroom: ClassroomType }) {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'classrooms', classroom.id, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    });
    return () => unsubscribe();
  }, [classroom.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'classrooms', classroom.id, 'messages'), {
        classroomId: classroom.id,
        senderUid: user.uid,
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
      });
      
      // Send notifications to all other members
      classroom.members.forEach(memberUid => {
        if (memberUid !== user.uid) {
          sendNotification({
            recipientUid: memberUid,
            senderUid: user.uid,
            senderName: user.displayName || 'Someone',
            senderPhotoURL: user.photoURL || '',
            type: 'message',
            targetId: classroom.id,
            targetTitle: classroom.name,
            messagePreview: newMessage.trim().substring(0, 100) + (newMessage.trim().length > 100 ? '...' : '')
          });
        }
      });
      
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <Users size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{classroom.name}</h3>
            <p className="text-xs text-gray-500">{classroom.members.length} members</p>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
          <Info size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.senderUid === user?.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-3 rounded-2xl ${msg.senderUid === user?.uid ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-900 rounded-tl-none'}`}>
              <p className="text-sm">{msg.text}</p>
              <p className={`text-[10px] mt-1 opacity-60 ${msg.senderUid === user?.uid ? 'text-right' : 'text-left'}`}>
                {msg.createdAt ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 rounded-full bg-gray-100 border-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
        <button 
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all disabled:opacity-50"
        >
          {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </form>
    </div>
  );
}

function CreateClassroomModal({ onClose }: { onClose: () => void }) {
  const [user] = useAuthState(auth);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t !== '');
      await addDoc(collection(db, 'classrooms'), {
        name: name.trim(),
        description: description.trim(),
        category,
        tags: tagList,
        creatorUid: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch (err) {
      console.error('Failed to create classroom:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="bg-indigo-600 p-6 text-white">
          <h2 className="text-xl font-bold">Create Classroom</h2>
          <p className="text-indigo-100 text-sm">Start a new learning community.</p>
        </div>
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Classroom Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Advanced Mathematics"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this classroom about?"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Select a category</option>
              <option value="Science">Science</option>
              <option value="Technology">Technology</option>
              <option value="Engineering">Engineering</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Arts">Arts</option>
              <option value="Languages">Languages</option>
              <option value="Business">Business</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. math, algebra, beginners"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
