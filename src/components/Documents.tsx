import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Document as DocumentType } from '../types';
import { FileText, Download, Search, Filter, BookOpen, LogIn } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function Documents() {
  const [user, authLoading] = useAuthState(auth);
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading && !user) setLoading(false);
      return;
    }

    setLoading(true);
    const path = 'documents';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentType)));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
    return () => unsubscribe();
  }, [user, authLoading]);

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || (loading && user)) return <div className="pt-32 text-center">Loading resources...</div>;

  if (!user) {
    return (
      <div className="pt-32 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
          <LogIn size={40} className="text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Access Educational Resources</h2>
        <p className="text-gray-500 max-w-md mb-8">
          Sign in to download documents, study guides, and research papers shared by the community.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-24 max-w-6xl mx-auto px-4 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Learning Resources</h1>
          <p className="text-gray-500">Access and download educational documents shared by the community.</p>
        </div>
        <Link to="/upload" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 w-fit">
          <BookOpen size={20} />
          Share Resource
        </Link>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for topics, subjects, or keywords..."
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
        />
      </div>

      {filteredDocs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No resources found</h3>
          <p className="text-gray-500">Try adjusting your search or be the first to upload a document!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <FileText size={28} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-1 rounded">
                  {doc.fileType || 'PDF'}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{doc.title}</h3>
              <p className="text-sm text-gray-500 mb-6 line-clamp-3 h-15">{doc.description || "No description provided."}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="text-xs text-gray-400">
                  {format(doc.createdAt.toDate(), 'MMM d, yyyy')}
                </div>
                <a 
                  href={doc.fileUrl} 
                  download 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:text-indigo-700"
                >
                  <Download size={18} />
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
