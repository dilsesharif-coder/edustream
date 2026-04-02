import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import VideoFeed from './components/VideoFeed';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { Loader2, AlertCircle } from 'lucide-react';
import MessagingProvider from './components/MessagingProvider';

// Lazy load components for better performance
const Profile = lazy(() => import('./components/Profile'));
const Upload = lazy(() => import('./components/Upload'));
const Classrooms = lazy(() => import('./components/Classroom'));
const Documents = lazy(() => import('./components/Documents'));
const Search = lazy(() => import('./components/Search'));

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">We encountered an unexpected error. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-6 p-4 bg-gray-100 rounded-lg text-left text-xs overflow-auto max-h-40 text-red-500">
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-4">
      <Loader2 size={48} className="text-indigo-600 animate-spin" />
      <p className="text-gray-500 font-medium animate-pulse">Loading EduStream...</p>
    </div>
  </div>
);

export default function App() {
  const [user, loading] = useAuthState(auth);

  if (loading) return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <MessagingProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <Navbar />
            <main className="relative">
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  <Route path="/" element={<VideoFeed />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/profile/:userId" element={<Profile />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/classrooms" element={<Classrooms />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="*" element={
                    <div className="pt-32 text-center">
                      <h1 className="text-4xl font-bold mb-4">404</h1>
                      <p className="text-gray-600">Page not found</p>
                    </div>
                  } />
                </Routes>
              </Suspense>
            </main>
          </div>
        </Router>
      </MessagingProvider>
    </ErrorBoundary>
  );
}
