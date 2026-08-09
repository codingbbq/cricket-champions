import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Match } from '@/types';

const TossPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [tossWinnerKey, setTossWinnerKey] = useState<string | null>(null);
  const [decision, setDecision] = useState<'bat' | 'bowl' | null>(null);

  useEffect(() => {
    const fetchMatch = async () => {
      if (!matchId) return;
      const matchRef = doc(db, 'matches', matchId);
      const matchSnap = await getDoc(matchRef);
      if (matchSnap.exists()) {
        setMatch(matchSnap.data() as Match);
      }
    };
    fetchMatch();
  }, [matchId]);

  const handleToss = () => {
    if (!match?.teams) return;
    const teamKeys = Object.keys(match.teams);
    const winnerKey = Math.random() < 0.5 ? teamKeys[0] : teamKeys[1];
    setTossWinnerKey(winnerKey);
  };

  const handleConfirm = async () => {
    if (!matchId || !tossWinnerKey || !decision) return;
    const matchRef = doc(db, 'matches', matchId);
    await updateDoc(matchRef, {
      toss: {
        winnerId: tossWinnerKey,
        choice: decision,
      },
      status: 'live',
    });
    navigate(`/scoring/${matchId}`);
  };

  if (!match?.teams) {
    return <div className="container mx-auto py-10">Loading...</div>;
  }

  const tossWinnerName = tossWinnerKey ? match.teams[tossWinnerKey as keyof typeof match.teams]?.name : null;

  return (
    <div className="container mx-auto py-10 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">Toss Time!</h1>
      <h2 className="text-xl mb-6">{match.teams.teamA.name} vs {match.teams.teamB.name}</h2>

      {!tossWinnerKey ? (
        <button onClick={handleToss} className="px-6 py-3 text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Toss the coin</button>
      ) : (
        <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-md">
          <p className="text-2xl font-semibold">{tossWinnerName} won the toss!</p>
          <p>What is your decision?</p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="decision" value="bat" onChange={() => setDecision('bat')} className="h-4 w-4" /> Bat
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="decision" value="bowl" onChange={() => setDecision('bowl')} className="h-4 w-4" /> Bowl
            </label>
          </div>

          <button onClick={handleConfirm} disabled={!decision} className="mt-4 px-6 py-3 text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">
            Confirm & Start Match
          </button>
        </div>
      )}
    </div>
  );
};

export default TossPage;
