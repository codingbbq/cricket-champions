import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import Navigation from '@/components/common/Navigation';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import type { Match } from '@/types';

const MatchesPage = () => {
  const { addToast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'live' | 'completed'>('all');

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

  const filteredMatches = filter === 'all' 
    ? matches 
    : matches.filter(m => m.status === filter);

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
      <>
        <Navigation />
        <div className="container-responsive py-12">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Loading matches...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container-responsive py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Matches</h1>
            <p className="text-gray-600">Manage and track your cricket matches</p>
          </div>
          <Link to="/admin/matches/new">
            <Button variant="primary" size="lg">
              + Create New Match
            </Button>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(['all', 'pending', 'live', 'completed'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({filteredMatches.length})
            </button>
          ))}
        </div>

        {/* Matches Grid */}
        {filteredMatches.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <p className="text-gray-500 text-lg mb-4">No matches found</p>
              <Link to="/admin/matches/new">
                <Button variant="primary">Create Your First Match</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map(match => (
              <Card key={match.id} className="animate-fade-in overflow-hidden">
                <CardContent className="p-0">
                  {/* Status Badge */}
                  <div className={`${getStatusColor(match.status)} px-4 py-2 flex items-center justify-between`}>
                    <span className="font-semibold capitalize flex items-center gap-2">
                      {getStatusIcon(match.status)} {match.status}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{match.venue || 'Cricket Match'}</h3>
                    
                    <div className="space-y-2 mb-6 text-gray-600">
                      <p className="flex items-center gap-2">
                        📅 {formatDate(match.date)}
                      </p>
                      <p className="flex items-center gap-2">
                        🏏 {match.overs} Overs
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {match.status === 'pending' && (
                        <Link to={`/admin/matches/${match.id}/teams`} className="flex-1">
                          <Button variant="primary" size="sm" className="w-full">
                            Setup Match
                          </Button>
                        </Link>
                      )}
                      {match.status === 'live' && (
                        <Link to={`/scoring/${match.id}`} className="flex-1">
                          <Button variant="primary" size="sm" className="w-full">
                            Go to Scoring
                          </Button>
                        </Link>
                      )}
                      {match.status === 'completed' && (
                        <Link to={`/matches/${match.id}/summary`} className="flex-1">
                          <Button variant="secondary" size="sm" className="w-full">
                            View Summary
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default MatchesPage;
