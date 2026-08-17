import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import BottomNavigation from '@/components/common/BottomNavigation';
import type { Match } from '@/types';

const MatchesPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchMatchesWithTimeout = async () => {
      setLoading(true);
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const matchesCollection = collection(db, 'matches');
        const fetchPromise = getDocs(matchesCollection);

        const matchesSnapshot = await Promise.race([fetchPromise, timeoutPromise]) as any;
        
        if (isMounted) {
          const matchesList = matchesSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Match));
          setMatches(matchesList.sort((a, b) => {
            const dateA = (a.createdAt as any)?.seconds || 0;
            const dateB = (b.createdAt as any)?.seconds || 0;
            return dateB - dateA;
          }));
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
        if (isMounted) {
          addToast('Failed to load matches. Please check your Firebase configuration.', 'error');
          setMatches([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMatchesWithTimeout();

    return () => {
      isMounted = false;
    };
  }, []);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'live':
        return 'bg-green-100 text-green-800 animate-pulse-subtle';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'live':
        return '🔴';
      case 'completed':
        return '✓';
      default:
        return '•';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex justify-center items-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-neutral-400">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col relative bg-neutral-950">
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-4 bg-neutral-950/88 backdrop-blur-lg border-b border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-base font-semibold">Matches</div>
            <button
              onClick={() => navigate('/admin/matches/new')}
              className="w-8 h-8 flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-black rounded-lg transition-colors font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
          {/* Matches List */}
          {matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-3">🏏</div>
              <p className="text-neutral-400 mb-4">No matches found</p>
              <button
                onClick={() => navigate('/admin/matches/new')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
              >
                Create First Match
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map(match => (
                <button
                  key={match.id}
                  onClick={() => {
                    if (match.status === 'pending') {
                      navigate(`/admin/matches/${match.id}/teams`);
                    } else if (match.status === 'live') {
                      navigate(`/scoring/${match.id}`);
                    }
                  }}
                  className="w-full text-left bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-amber-500 hover:bg-neutral-800 transition-all active:scale-95"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-white">{match.venue || 'Cricket Match'}</h3>
                      <div className="text-xs text-neutral-500 mt-1">
                        📅 {formatDate(match.date)} · 🏏 {match.overs} overs
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      match.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      match.status === 'live' ? 'bg-green-500/20 text-green-400' :
                      'bg-neutral-700/50 text-neutral-400'
                    }`}>
                      {match.status === 'pending' ? '⏳ Pending' :
                       match.status === 'live' ? '🔴 Live' :
                       '✓ Completed'}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400">
                    {match.status === 'pending' && 'Tap to select teams'}
                    {match.status === 'live' && 'Tap to go to scoring'}
                    {match.status === 'completed' && 'Match completed'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNavigation currentPath="/admin/matches" />
      </div>
    </div>
  );
};

export default MatchesPage;
