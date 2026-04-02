import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { Video, Document, Classroom, User } from '../types';
import { Search as SearchIcon, Filter, Calendar, Star, TrendingUp, Video as VideoIcon, FileText, Users, User as UserIcon, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthState } from 'react-firebase-hooks/auth';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

type SearchResult = {
  id: string;
  type: 'video' | 'document' | 'classroom' | 'user';
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  rating?: number;
  popularity: number;
  createdAt: any;
  thumbnail?: string;
  data: any;
};

export default function Search() {
  const [user, authLoading] = useAuthState(auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'video' | 'document' | 'classroom' | 'user'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'popularity'>('date');
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading && !user) setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [videosSnap, docsSnap, classroomsSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'videos')),
          getDocs(collection(db, 'documents')),
          getDocs(collection(db, 'classrooms')),
          getDocs(collection(db, 'users'))
        ]);

        if (!videosSnap || !docsSnap || !classroomsSnap || !usersSnap) return;

        const videoResults: SearchResult[] = videosSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'video',
            title: data.title,
            description: data.description || '',
            category: data.category,
            tags: data.tags || [],
            rating: data.rating || 0,
            popularity: data.likesCount || 0,
            createdAt: data.createdAt,
            thumbnail: data.thumbnailUrl,
            data
          };
        });

        const docResults: SearchResult[] = docsSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'document',
            title: data.title,
            description: data.description || '',
            category: data.category,
            tags: data.tags || [],
            rating: data.rating || 0,
            popularity: 0, // Documents don't have likes yet in our schema
            createdAt: data.createdAt,
            data
          };
        });

        const classroomResults: SearchResult[] = classroomsSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'classroom',
            title: data.name,
            description: data.description || '',
            category: data.category,
            tags: data.tags || [],
            popularity: data.members?.length || 0,
            createdAt: data.createdAt,
            data
          };
        });

        const userResults: SearchResult[] = usersSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'user',
            title: data.displayName,
            description: data.bio || '',
            popularity: data.followersCount || 0,
            createdAt: data.createdAt,
            thumbnail: data.photoURL,
            data
          };
        });

        setResults([...videoResults, ...docResults, ...classroomResults, ...userResults]);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'search');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading]);

  const filteredResults = results.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    const matchesType = selectedType === 'all' || item.type === selectedType;

    return matchesSearch && matchesCategory && matchesType;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
      const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
      return dateB - dateA;
    }
    if (sortBy === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    }
    if (sortBy === 'popularity') {
      return b.popularity - a.popularity;
    }
    return 0;
  });

  const categories = ["Science", "Technology", "Engineering", "Mathematics", "Arts", "Languages", "Business"];

  return (
    <div className="pt-24 max-w-6xl mx-auto px-4 pb-20">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Search EduStream</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for courses, instructors, videos..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">All Types</option>
              <option value="video">Videos</option>
              <option value="document">Documents</option>
              <option value="classroom">Classrooms</option>
              <option value="user">Instructors</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-8">
        <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
          <Filter size={16} /> Sort by:
        </span>
        <button 
          onClick={() => setSortBy('date')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${sortBy === 'date' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          <Calendar size={16} /> Date
        </button>
        <button 
          onClick={() => setSortBy('rating')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${sortBy === 'rating' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          <Star size={16} /> Rating
        </button>
        <button 
          onClick={() => setSortBy('popularity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${sortBy === 'popularity' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
        >
          <TrendingUp size={16} /> Popularity
        </button>
      </div>

      {authLoading || (loading && user) ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Searching the library...</p>
        </div>
      ) : !user ? (
        <div className="py-20 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
            <LogIn size={40} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Search EduStream</h2>
          <p className="text-gray-500 max-w-md mb-8">
            Sign in to search for courses, instructors, videos, and documents across the entire platform.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResults.map(result => (
            <ResultCard key={`${result.type}-${result.id}`} result={result} />
          ))}
          {filteredResults.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <SearchIcon size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-500">Try adjusting your search terms or filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  const getIcon = () => {
    switch (result.type) {
      case 'video': return <VideoIcon size={20} />;
      case 'document': return <FileText size={20} />;
      case 'classroom': return <Users size={20} />;
      case 'user': return <UserIcon size={20} />;
    }
  };

  const getLink = () => {
    switch (result.type) {
      case 'video': return `/`; // Feed handles videos
      case 'document': return `/documents`;
      case 'classroom': return `/classrooms`;
      case 'user': return `/profile/${result.id}`;
    }
  };

  return (
    <Link to={getLink()} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
          result.type === 'video' ? 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white' :
          result.type === 'document' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' :
          result.type === 'classroom' ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' :
          'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white'
        }`}>
          {getIcon()}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-1 rounded mb-1">
            {result.type}
          </span>
          {result.category && (
            <span className="text-[10px] font-bold text-indigo-600">
              {result.category}
            </span>
          )}
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{result.title}</h3>
      <p className="text-sm text-gray-500 mb-6 line-clamp-3 flex-1">{result.description || "No description provided."}</p>

      <div className="flex flex-wrap gap-1 mb-4">
        {result.tags?.map(tag => (
          <span key={tag} className="text-[10px] bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full">#{tag}</span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {result.createdAt && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {format(result.createdAt.toDate(), 'MMM d')}
            </span>
          )}
          <span className="flex items-center gap-1">
            <TrendingUp size={12} />
            {result.popularity}
          </span>
        </div>
        {result.rating !== undefined && (
          <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
            <Star size={12} fill="currentColor" />
            {result.rating.toFixed(1)}
          </div>
        )}
      </div>
    </Link>
  );
}
