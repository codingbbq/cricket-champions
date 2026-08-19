import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import type { Match } from '@/types';

const HomePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const matchesRef = collection(db, 'matches');
      const snapshot = await getDocs(matchesRef);
      const matchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Match));
      setMatches(matchesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (matchId: string) => {
    setExpandedMatches(prev => ({
      ...prev,
      [matchId]: !prev[matchId],
    }));
  };


  const showSnackbar = (message: string) => {
    setSnackbar(message);
    setTimeout(() => setSnackbar(null), 1600);
  };


  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      live: 'LIVE',
      completed: 'COMPLETED',
      pending: 'THIS WEEKEND',
    };
    return labels[status] || status.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      live: 'bg-red-500/20 text-red-400',
      completed: 'bg-gray-500/20 text-gray-400',
      pending: 'bg-gray-500/20 text-gray-400',
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    const d = new Date(date.seconds ? date.seconds * 1000 : date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getGreeting = () => {
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return `${day} squad, catch up on the week`;
  };

  // Show login screen if not authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex justify-center items-center p-4">
        <div className="w-full max-w-md text-center space-y-8">
          <div>
            <div className="text-6xl mb-4">🏏</div>
            <h1 className="text-3xl font-bold mb-2">Cricket Champions</h1>
            <p className="text-neutral-400">Manage your cricket matches and players</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="w-full px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-lg transition-colors border border-neutral-700"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">
      {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-4 bg-neutral-950/88 backdrop-blur-lg border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold">Cricket Champions</div>
              <div className="text-xs text-neutral-500 mt-0.5">{getGreeting()}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-semibold border border-neutral-700">
              🏏
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-neutral-500">Loading matches...</div>
            </div>
          ) : matches.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-neutral-500">No matches yet</div>
            </div>
          ) : (
            matches.map((match, index) => {
              const isExpanded = expandedMatches[match.id];
              const isLive = match.status === 'live';
              const isCompleted = match.status === 'completed';
              const isUpcoming = match.status === 'pending';
              const hasScore = !isUpcoming;

              return (
                <div
                  key={match.id}
                  className="bg-neutral-900 rounded-lg shadow-sm overflow-hidden animate-in fade-in"
                  style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
                >
                  <div
                    onClick={() => toggleExpand(match.id)}
                    className="p-4 cursor-pointer hover:bg-neutral-800/50 transition-colors"
                  >
                    {/* Status and Date */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        {isLive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        )}
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(match.status)}`}>
                          {getStatusLabel(match.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-neutral-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <rect x="3" y="4" width="18" height="17" rx="2"></rect>
                          <path d="M8 2v4M16 2v4M3 9h18"></path>
                        </svg>
                        {formatDate(match.date)}
                      </div>
                    </div>

                    {/* Score Section */}
                    {hasScore && (
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{match.teams ? Object.values(match.teams)[0]?.name : 'Team A'}</div>
                          <div className="text-2xl font-bold mt-1">
                            {match.innings && match.innings[0] ? `${match.innings[0].score}/${match.innings[0].wickets}` : '0/0'} <span className="text-xs font-normal text-neutral-500">({match.innings && match.innings[0] ? (match.innings[0].overs || 0) : '0.0'})</span>
                          </div>
                        </div>
                        <div className="text-xs text-neutral-600 font-semibold">VS</div>
                        <div className="flex-1 text-right">
                          <div className="text-sm font-medium">{match.teams ? Object.values(match.teams)[1]?.name : 'Team B'}</div>
                          <div className="text-2xl font-bold mt-1">
                            {match.innings && match.innings[1] ? `${match.innings[1].score}/${match.innings[1].wickets}` : '0/0'} <span className="text-xs font-normal text-neutral-500">({match.innings && match.innings[1] ? (match.innings[1].overs || 0) : '0.0'})</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Upcoming Match */}
                    {isUpcoming && (
                      <div className="border border-dashed border-neutral-700 rounded-lg p-4 text-center mb-2">
                        <div className="text-2xl mb-1">🏏</div>
                        <div className="font-semibold text-base">{match.venue}</div>
                        <div className="text-xs text-neutral-500 mt-1">Teams & toss go live matchday morning</div>
                      </div>
                    )}

                    {/* Result Text */}
                    {hasScore && (
                      <div className="text-xs text-amber-400 font-medium mb-3">
                        {isLive ? 'Match in progress' : isCompleted ? 'Match completed' : ''}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                      <div className="flex items-center gap-1 text-xs text-neutral-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M12 21s-7-5.5-9.5-9A5.5 5.5 0 0112 4a5.5 5.5 0 019.5 8c-2.5 3.5-9.5 9-9.5 9z"></path>
                        </svg>
                        {match.venue}
                      </div>
                      {isCompleted && (
                        <div className="flex items-center gap-1 text-xs text-amber-400">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <path d="M8 21h8M12 17v4M6 4h12v3a6 6 0 01-12 0V4z"></path>
                            <path d="M6 5H3v2a3 3 0 003 3M18 5h3v2a3 3 0 01-3 3"></path>
                          </svg>
                          Player of the Match
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 animate-in fade-in">
                      <div className="h-px bg-neutral-800 mb-3"></div>
                      <div className="text-xs uppercase tracking-wider text-neutral-600 mb-2">Top performers</div>
                      <div className="space-y-2 mb-3">
                        {isCompleted && match.innings && match.innings.length > 0 ? (
                          (() => {
                            const allBalls = match.innings.flatMap((inn: any) => inn.balls || []);
                            const strikerStats = new Map<string, any>();
                            
                            allBalls.forEach((ball: any) => {
                              if (!strikerStats.has(ball.strikerId)) {
                                strikerStats.set(ball.strikerId, { runs: 0, balls: 0, playerId: ball.strikerId });
                              }
                              const stats = strikerStats.get(ball.strikerId);
                              stats.runs += ball.runs;
                              stats.balls += 1;
                            });
                            
                            return Array.from(strikerStats.values())
                              .sort((a, b) => b.runs - a.runs)
                              .slice(0, 3)
                              .map((stat: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className="text-neutral-300">Top scorer</span>
                                  <span className="text-neutral-400 font-semibold">{stat.runs}({stat.balls})</span>
                                </div>
                              ));
                          })()
                        ) : (
                          <div className="text-xs text-neutral-600">Match data not available</div>
                        )}
                      </div>
                      <div className="text-xs text-neutral-600">
                        Overs: {match.overs} · Format: {match.overs} overs
                      </div>
                      {isCompleted && (
                        <button
                          onClick={() => navigate(`/match/${match.id}`)}
                          className="inline-block mt-3 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          View full scorecard →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Expand Chevron */}
                  <div
                    onClick={() => toggleExpand(match.id)}
                    className="flex items-center justify-center py-2 cursor-pointer text-neutral-700"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease',
                      }}
                    >
                      <path d="M6 9l6 6 6-6"></path>
                    </svg>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Snackbar */}
        {snackbar && (
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-neutral-900 text-white text-xs px-4 py-2 rounded-full shadow-lg z-30 animate-in fade-in">
            {snackbar}
          </div>
        )}
    </div>
  );
};

export default HomePage;
