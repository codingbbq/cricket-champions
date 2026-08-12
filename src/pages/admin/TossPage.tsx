import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navigation from '@/components/common/Navigation';
import { useToast } from '@/contexts/ToastContext';
import type { Match, Team } from '@/types';

const TossPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tossWinnerKey, setTossWinnerKey] = useState<string | null>(null);
  const [decision, setDecision] = useState<'bat' | 'bowl' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!matchId) {
        setError('Match ID not found');
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
  }, [matchId, addToast]);

  const handleToss = () => {
    if (teams.length === 0) return;
    const randomIndex = Math.random() < 0.5 ? 0 : 1;
    setTossWinnerKey(teams[randomIndex].id);
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

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container-responsive py-12">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Loading match data...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navigation />
        <div className="container-responsive py-12">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => navigate('/admin/matches')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Matches
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!match || teams.length === 0) {
    return (
      <>
        <Navigation />
        <div className="container-responsive py-12">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-gray-600 mb-4">Match data is incomplete</p>
              <button
                onClick={() => navigate('/admin/matches')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Matches
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const tossWinnerName = tossWinnerKey ? teams.find(t => t.id === tossWinnerKey)?.name : null;

  return (
    <>
      <Navigation />
      <div className="container-responsive py-10 flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-4">Toss Time! 🪙</h1>
        <h2 className="text-xl mb-6">{teams[0]?.name} vs {teams[1]?.name}</h2>

        {!tossWinnerKey ? (
          <button 
            onClick={handleToss} 
            className="px-6 py-3 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 text-lg font-semibold"
          >
            Toss the Coin
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-md">
            <p className="text-2xl font-semibold">🎉 {tossWinnerName} won the toss!</p>
            <p className="text-gray-600">What is your decision?</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="decision" 
                  value="bat" 
                  onChange={() => setDecision('bat')} 
                  className="h-4 w-4" 
                /> 
                Bat
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="decision" 
                  value="bowl" 
                  onChange={() => setDecision('bowl')} 
                  className="h-4 w-4" 
                /> 
                Bowl
              </label>
            </div>

            <button 
              onClick={handleConfirm} 
              disabled={!decision} 
              className="mt-4 px-6 py-3 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 font-semibold"
            >
              Confirm & Start Match
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default TossPage;
