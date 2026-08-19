import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Match, Team } from '@/types';

const TossPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tossWinnerKey, setTossWinnerKey] = useState<string | null>(null);
  const [decision, setDecision] = useState<'bat' | 'bowl' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!matchId || !currentUser) {
        setError('Match ID or user not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const fetchPromise = (async () => {
          // Fetch match details
          const matchRef = doc(db, 'matches', matchId);
          const matchSnap = await getDoc(matchRef);
          if (!matchSnap.exists()) {
            throw new Error('Match not found');
          }

          const matchData = { id: matchSnap.id, ...matchSnap.data() } as Match;
          // Verify user is the match creator
          if (matchData.createdBy !== currentUser.uid) {
            throw new Error('You can only edit matches you created');
          }
          if (isMounted) setMatch(matchData);

          // Fetch teams from subcollection
          const teamsQuery = collection(db, `matches/${matchId}/teams`);
          const teamsSnap = await getDocs(teamsQuery);
          if (teamsSnap.empty) {
            throw new Error('Teams not found. Please select teams first.');
          }

          const teamsData = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
          if (isMounted) setTeams(teamsData);
        })();

        await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err: any) {
        console.error('Error fetching match data:', err);
        if (isMounted) {
          const errorMsg = err.message || 'Failed to load match data';
          setError(errorMsg);
          addToast(errorMsg, 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [matchId, currentUser, addToast]);

  const handleToss = () => {
    if (teams.length === 0 || isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      const randomIndex = Math.random() < 0.5 ? 0 : 1;
      setTossWinnerKey(teams[randomIndex].id);
      setIsFlipping(false);
    }, 1400);
  };

  const handleConfirm = async () => {
    if (!matchId || !tossWinnerKey || !decision) return;
    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        toss: {
          winnerId: tossWinnerKey,
          choice: decision,
        },
        status: 'live',
      });
      addToast('Toss completed! Starting match...', 'success');
      navigate(`/scoring/${matchId}`);
    } catch (error) {
      console.error('Error updating toss:', error);
      addToast('Failed to save toss result', 'error');
    }
  };

  const handleReToss = () => {
    setTossWinnerKey(null);
    setDecision(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex justify-center items-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-neutral-400">Loading match data...</p>
        </div>
      </div>
    );
  }

  if (error || !match || teams.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex justify-center items-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error || 'Match data is incomplete'}</p>
          <button
            onClick={() => navigate('/matches')}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  const tossWinnerName = tossWinnerKey ? teams.find(t => t.id === tossWinnerKey)?.name : null;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col relative bg-neutral-950">
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-4 bg-neutral-950/88 backdrop-blur-lg border-b border-neutral-800">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(`/matches/${matchId}/teams`)}
              className="w-8 h-8 flex items-center justify-center text-white hover:bg-neutral-800 rounded transition-colors"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 18l-6-6 6-6"></path>
              </svg>
            </button>
            <div className="text-base font-semibold">Toss</div>
          </div>
          <div className="flex gap-1.5 pl-11">
            <div className="w-[26px] h-[3px] rounded-sm bg-amber-400"></div>
            <div className="w-[26px] h-[3px] rounded-sm bg-amber-400"></div>
            <div className="w-[26px] h-[3px] rounded-sm bg-amber-400"></div>
            <div className="w-[26px] h-[3px] rounded-sm bg-neutral-700"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 py-8 pb-8 flex flex-col items-center justify-center">
          {!tossWinnerKey ? (
            <div className="space-y-8 text-center animate-in fade-in">
              <div className="text-neutral-400 text-sm">
                {teams[0]?.name} vs {teams[1]?.name}
              </div>

              <div className="w-24 h-24 mx-auto">
                <div
                  className={`w-full h-full rounded-full bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-5xl shadow-lg ${
                    isFlipping ? 'animate-spin' : ''
                  }`}
                  style={isFlipping ? { animationDuration: '1.4s', animationTimingFunction: 'cubic-bezier(.2,.6,.3,1)' } : {}}
                >
                  🏏
                </div>
              </div>

              <button
                onClick={handleToss}
                disabled={isFlipping}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFlipping ? 'Flipping...' : 'Flip the Coin'}
              </button>
            </div>
          ) : (
            <div className="space-y-6 w-full animate-in fade-in">
              <div className="text-center">
                <div className="text-3xl mb-2">🎉</div>
                <div className="text-lg font-semibold">{tossWinnerName} won the toss!</div>
              </div>

              <div className="text-center text-sm text-neutral-400">What's the decision?</div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDecision('bat')}
                  className={`flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 transition-all ${
                    decision === 'bat'
                      ? 'border-amber-500 bg-amber-900/30 shadow-lg shadow-amber-500/20'
                      : 'border-neutral-700 bg-neutral-900 hover:border-neutral-600'
                  }`}
                >
                  <div className="text-6xl">🏏</div>
                  <span className="font-semibold text-sm">Bat</span>
                </button>

                <button
                  onClick={() => setDecision('bowl')}
                  className={`flex flex-col items-center justify-center gap-3 p-6 rounded-lg border-2 transition-all ${
                    decision === 'bowl'
                      ? 'border-blue-500 bg-blue-900/30 shadow-lg shadow-blue-500/20'
                      : 'border-neutral-700 bg-neutral-900 hover:border-neutral-600'
                  }`}
                >
                  <div className="text-6xl">🎳</div>
                  <span className="font-semibold text-sm">Bowl</span>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleReToss}
                  className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Re-do Toss
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!decision}
                  className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Match
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TossPage;
