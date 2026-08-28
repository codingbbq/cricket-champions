import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Match } from '@/types';

const MatchesPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { currentUser, userProfile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<{ id: string; venue: string } | null>(null);
  
  const isSuperAdmin = userProfile?.role === 'super-admin';

  useEffect(() => {
    let isMounted = true;

    const fetchMatchesWithTimeout = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const matchesCollection = collection(db, 'matches');
        // Fetch only matches created by current user
        const q = query(matchesCollection, where('createdBy', '==', currentUser.uid));
        const fetchPromise = getDocs(q);

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
  }, [addToast, currentUser]);


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

  const handleDeleteClick = (matchId: string, matchVenue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isSuperAdmin) {
      addToast('Only super-admins can delete matches', 'error');
      return;
    }

    setMatchToDelete({ id: matchId, venue: matchVenue });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!matchToDelete) return;

    setIsDeletingId(matchToDelete.id);
    setShowDeleteModal(false);
    
    try {
      // Delete match document
      await deleteDoc(doc(db, 'matches', matchToDelete.id));
      
      // Delete innings subcollection documents
      const inningsQuery = collection(db, `matches/${matchToDelete.id}/innings`);
      const inningsSnap = await getDocs(inningsQuery);
      const deletePromises = inningsSnap.docs.map(inningsDoc => 
        deleteDoc(doc(db, `matches/${matchToDelete.id}/innings`, inningsDoc.id))
      );
      await Promise.all(deletePromises);
      
      // Update local state
      setMatches(matches.filter(m => m.id !== matchToDelete.id));
      addToast('Match deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting match:', error);
      addToast('Failed to delete match', 'error');
    } finally {
      setIsDeletingId(null);
      setMatchToDelete(null);
    }
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
    <div className="w-full flex flex-col">
      {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-4 bg-neutral-950/88 backdrop-blur-lg border-b border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <div className="text-base font-semibold">My Matches</div>
            <button
              onClick={() => navigate('/matches/new')}
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
                onClick={() => navigate('/matches/new')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
              >
                Create First Match
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map(match => (
                <div key={match.id} className="relative">
                  <button
                    onClick={() => {
                      if (match.status === 'pending') {
                        navigate(`/matches/${match.id}/teams`);
                      } else if (match.status === 'live') {
                        navigate(`/scoring/${match.id}`);
                      } else if (match.status === 'completed') {
                        navigate(`/match/${match.id}`);
                      }
                    }}
                    className="w-full text-left bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-amber-500 hover:bg-neutral-800 transition-all active:scale-95"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{match.venue || 'Cricket Match'}</h3>
                        <div className="text-xs text-neutral-500 mt-1">
                          📅 {formatDate(match.date)} · 🏏 {match.overs} overs
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          match.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          match.status === 'live' ? 'bg-green-500/20 text-green-400' :
                          'bg-neutral-700/50 text-neutral-400'
                        }`}>
                          {match.status === 'pending' ? '⏳ Pending' :
                           match.status === 'live' ? '🔴 Live' :
                           '✓ Completed'}
                        </span>
                        {isSuperAdmin && (
                          <button
                            onClick={(e) => handleDeleteClick(match.id, match.venue, e)}
                            disabled={isDeletingId === match.id}
                            className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors disabled:opacity-50"
                            title="Delete match"
                          >
                            {isDeletingId === match.id ? (
                              <span className="text-xs">...</span>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-400">
                      {match.status === 'pending' && 'Tap to select teams'}
                      {match.status === 'live' && 'Tap to go to scoring'}
                      {match.status === 'completed' && 'Tap to view summary'}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-neutral-900 rounded-xl p-6 max-w-sm mx-4 space-y-4 border border-neutral-800">
              <h3 className="text-lg font-bold text-white">Delete Match</h3>
              <p className="text-neutral-400">
                Are you sure you want to delete the match at <strong className="text-white">"{matchToDelete?.venue}"</strong>?
              </p>
              <p className="text-neutral-500 text-sm">
                This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setMatchToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default MatchesPage;
