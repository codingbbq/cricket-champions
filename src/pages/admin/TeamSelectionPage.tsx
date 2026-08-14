import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import type { Match, Player } from '@/types';

const TeamSelectionPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [playerAssignments, setPlayerAssignments] = useState<Record<string, 'A' | 'B' | null>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!matchId) return;
      setLoading(true);
      try {
        const matchRef = doc(db, 'matches', matchId);
        const matchSnap = await getDoc(matchRef);
        if (matchSnap.exists()) {
          setMatch(matchSnap.data() as Match);
        }

        const playersSnap = await getDocs(collection(db, 'players'));
        const players = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
        setAllPlayers(players);
        
        // Initialize assignments
        const assignments: Record<string, 'A' | 'B' | null> = {};
        players.forEach(p => {
          assignments[p.id] = null;
        });
        setPlayerAssignments(assignments);
      } catch (error) {
        console.error('Error fetching data:', error);
        addToast('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [matchId, addToast]);

  const cyclePlayerTeam = (playerId: string) => {
    setPlayerAssignments(prev => {
      const current = prev[playerId];
      const next = current === 'A' ? 'B' : current === 'B' ? null : 'A';
      return { ...prev, [playerId]: next };
    });
  };

  const teamACount = Object.values(playerAssignments).filter(t => t === 'A').length;
  const teamBCount = Object.values(playerAssignments).filter(t => t === 'B').length;

  const handleSaveTeams = async () => {
    if (!matchId || teamACount === 0 || teamBCount === 0) {
      addToast('Please select players for both teams', 'warning');
      return;
    }

    try {
      setIsSaving(true);

      const teamAPlayers = Object.entries(playerAssignments)
        .filter(([_, team]) => team === 'A')
        .map(([id]) => id);

      const teamBPlayers = Object.entries(playerAssignments)
        .filter(([_, team]) => team === 'B')
        .map(([id]) => id);

      // Create team documents in subcollection
      const teamARef = doc(collection(db, `matches/${matchId}/teams`), 'teamA');
      const teamBRef = doc(collection(db, `matches/${matchId}/teams`), 'teamB');

      await setDoc(teamARef, {
        id: 'teamA',
        name: 'Team A',
        players: teamAPlayers,
      });

      await setDoc(teamBRef, {
        id: 'teamB',
        name: 'Team B',
        players: teamBPlayers,
      });

      addToast('Teams saved successfully!', 'success');
      navigate(`/admin/matches/${matchId}/toss`);
    } catch (error) {
      console.error('Error saving teams:', error);
      addToast('Failed to save teams', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex justify-center items-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-neutral-400">Loading players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col relative bg-neutral-950">
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-4 bg-neutral-950/88 backdrop-blur-lg border-b border-neutral-800">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(`/admin/matches/${matchId}`)}
              className="w-8 h-8 flex items-center justify-center text-white hover:bg-neutral-800 rounded transition-colors"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 18l-6-6 6-6"></path>
              </svg>
            </button>
            <div className="text-base font-semibold">Select Teams</div>
          </div>
          <div className="flex gap-1.5 pl-11">
            <div className="w-[26px] h-[3px] rounded-sm bg-amber-400"></div>
            <div className="w-[26px] h-[3px] rounded-sm bg-neutral-700"></div>
            <div className="w-[26px] h-[3px] rounded-sm bg-neutral-700"></div>
            <div className="w-[26px] h-[3px] rounded-sm bg-neutral-700"></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-8">
          <div className="space-y-4 animate-in fade-in">
            <div className="text-xs text-neutral-400 mb-4">Tap a player to cycle Team A → Team B → unassigned</div>

            <div className="space-y-2">
              {allPlayers.map(player => {
                const team = playerAssignments[player.id];
                const teamLabel = team === 'A' ? 'Team A' : team === 'B' ? 'Team B' : 'Unassigned';
                const tagClass = team === 'A' ? 'bg-amber-500/20 text-amber-400' : team === 'B' ? 'bg-blue-500/20 text-blue-400' : 'bg-neutral-700/50 text-neutral-400';
                const borderColor = team ? 'border-neutral-700' : 'border-transparent';

                return (
                  <button
                    key={player.id}
                    onClick={() => cyclePlayerTeam(player.id)}
                    className={`w-full flex items-center justify-between p-3 bg-neutral-900 rounded-lg border transition-all hover:bg-neutral-800 active:scale-95 ${borderColor}`}
                  >
                    <div className="text-left">
                      <div className="text-sm font-medium">{player.name}</div>
                      <div className="text-xs text-neutral-500 capitalize mt-0.5">{player.role}</div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${tagClass}`}>
                      {teamLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4 text-xs text-neutral-400 pt-2">
              <div>Team A: {teamACount}</div>
              <div>Team B: {teamBCount}</div>
            </div>

            <button
              onClick={handleSaveTeams}
              disabled={teamACount === 0 || teamBCount === 0 || isSaving}
              className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isSaving ? 'Saving...' : 'Save Teams & Proceed to Toss'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamSelectionPage;
