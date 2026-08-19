import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Match, Player } from '@/types';

const TeamSelectionPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [playerAssignments, setPlayerAssignments] = useState<Record<string, 'A' | 'B' | 'C' | null>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!matchId || !currentUser) return;
      setLoading(true);
      try {
        const matchRef = doc(db, 'matches', matchId);
        const matchSnap = await getDoc(matchRef);
        if (matchSnap.exists()) {
          const matchData = matchSnap.data() as Match;
          // Verify user is the match creator
          if (matchData.createdBy !== currentUser.uid) {
            addToast('You can only edit matches you created', 'error');
            navigate('/matches');
            return;
          }
          setMatch(matchData);
        }

        const playersSnap = await getDocs(collection(db, 'players'));
        const players = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
        setAllPlayers(players);
        
        // Initialize assignments
        const assignments: Record<string, 'A' | 'B' | 'C' | null> = {};
        players.forEach(p => {
          assignments[p.id] = null;
        });

        // Try to load existing team assignments from Firestore
        try {
          const teamsQuery = collection(db, `matches/${matchId}/teams`);
          const teamsSnap = await getDocs(teamsQuery);
          
          if (!teamsSnap.empty) {
            teamsSnap.docs.forEach(teamDoc => {
              const teamData = teamDoc.data();
              const teamId = teamDoc.id === 'teamA' ? 'A' : teamDoc.id === 'teamB' ? 'B' : 'C';
              
              if (Array.isArray(teamData.players)) {
                teamData.players.forEach((playerId: string) => {
                  assignments[playerId] = teamId;
                });
              }
            });
          }
        } catch (err) {
          // Teams might not exist yet, that's okay
          console.log('No existing teams found');
        }

        setPlayerAssignments(assignments);
      } catch (error) {
        console.error('Error fetching data:', error);
        addToast('Failed to load data', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [matchId, currentUser, addToast, navigate]);

  const handleDragStart = (playerId: string) => {
    setDraggedPlayer(playerId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnTeam = (team: 'A' | 'B' | 'C') => {
    if (!draggedPlayer) return;

    // Validate common player (only 1 allowed)
    if (team === 'C') {
      const commonCount = Object.values(playerAssignments).filter(t => t === 'C').length;
      if (commonCount >= 1 && playerAssignments[draggedPlayer] !== 'C') {
        addToast('Only one common player allowed', 'warning');
        setDraggedPlayer(null);
        return;
      }
    }

    setPlayerAssignments(prev => ({
      ...prev,
      [draggedPlayer]: team
    }));
    setDraggedPlayer(null);
  };

  const handleDropOnUnassigned = () => {
    if (!draggedPlayer) return;
    setPlayerAssignments(prev => ({
      ...prev,
      [draggedPlayer]: null
    }));
    setDraggedPlayer(null);
  };

  const teamAPlayers = Object.entries(playerAssignments)
    .filter(([_, team]) => team === 'A')
    .map(([id]) => allPlayers.find(p => p.id === id))
    .filter(Boolean) as Player[];

  const teamBPlayers = Object.entries(playerAssignments)
    .filter(([_, team]) => team === 'B')
    .map(([id]) => allPlayers.find(p => p.id === id))
    .filter(Boolean) as Player[];

  const commonPlayers = Object.entries(playerAssignments)
    .filter(([_, team]) => team === 'C')
    .map(([id]) => allPlayers.find(p => p.id === id))
    .filter(Boolean) as Player[];

  const unassignedPlayers = Object.entries(playerAssignments)
    .filter(([_, team]) => team === null)
    .map(([id]) => allPlayers.find(p => p.id === id))
    .filter(Boolean) as Player[];

  const handleSaveTeams = async () => {
    if (!matchId || teamAPlayers.length === 0 || teamBPlayers.length === 0) {
      addToast('Please select players for both teams', 'warning');
      return;
    }

    try {
      setIsSaving(true);

      const teamAPlayerIds = teamAPlayers.map(p => p.id);
      const teamBPlayerIds = teamBPlayers.map(p => p.id);

      // Create team documents in subcollection
      const teamARef = doc(collection(db, `matches/${matchId}/teams`), 'teamA');
      const teamBRef = doc(collection(db, `matches/${matchId}/teams`), 'teamB');

      await setDoc(teamARef, {
        id: 'teamA',
        name: 'Team A',
        players: teamAPlayerIds,
      });

      await setDoc(teamBRef, {
        id: 'teamB',
        name: 'Team B',
        players: teamBPlayerIds,
      });

      addToast('Teams saved successfully!', 'success');
      navigate(`/matches/${matchId}/toss`);
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
      <div className="w-full max-w-2xl min-h-screen flex flex-col relative bg-neutral-950">
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-4 bg-neutral-950/88 backdrop-blur-lg border-b border-neutral-800">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(`/matches/${matchId}`)}
              className="w-8 h-8 flex items-center justify-center text-white hover:bg-neutral-800 rounded transition-colors"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 18l-6-6 6-6"></path>
              </svg>
            </button>
            <div className="text-base font-semibold">Select Teams (Drag & Drop)</div>
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
          <div className="space-y-6 animate-in fade-in">
            {/* Players Grid */}
            <div>
              <div className="text-sm font-semibold mb-3 text-neutral-300">Available Players</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {unassignedPlayers.map(player => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={() => handleDragStart(player.id)}
                    className="bg-neutral-900 rounded-lg p-3 cursor-move hover:bg-neutral-800 transition-colors border border-neutral-800 hover:border-neutral-700"
                  >
                    <div className="text-sm font-medium truncate">{player.name}</div>
                    <div className="text-xs text-neutral-500 capitalize mt-1">{player.role}</div>
                  </div>
                ))}
              </div>
              {unassignedPlayers.length === 0 && (
                <div className="text-xs text-neutral-500 text-center py-4">All players assigned</div>
              )}
            </div>

            {/* Drop Zones */}
            <div className="space-y-4">
              {/* Team A and Team B Side by Side */}
              <div className="grid grid-cols-2 gap-3">
                {/* Team A */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={() => handleDropOnTeam('A')}
                  className="bg-gradient-to-br from-amber-900/20 to-amber-950/20 rounded-lg p-3 border-2 border-dashed border-amber-700/50 hover:border-amber-600 transition-colors min-h-[280px]"
                >
                  <div className="text-xs font-semibold text-amber-400 mb-2">Team A ({teamAPlayers.length})</div>
                  <div className="space-y-2">
                    {teamAPlayers.map(player => (
                      <div
                        key={player.id}
                        draggable
                        onDragStart={() => handleDragStart(player.id)}
                        className="bg-amber-900/30 rounded p-2 cursor-move hover:bg-amber-900/50 transition-colors border border-amber-700/50"
                      >
                        <div className="text-xs font-medium truncate">{player.name}</div>
                        <div className="text-xs text-amber-300/70 capitalize">{player.role}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team B */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={() => handleDropOnTeam('B')}
                  className="bg-gradient-to-br from-blue-900/20 to-blue-950/20 rounded-lg p-3 border-2 border-dashed border-blue-700/50 hover:border-blue-600 transition-colors min-h-[280px]"
                >
                  <div className="text-xs font-semibold text-blue-400 mb-2">Team B ({teamBPlayers.length})</div>
                  <div className="space-y-2">
                    {teamBPlayers.map(player => (
                      <div
                        key={player.id}
                        draggable
                        onDragStart={() => handleDragStart(player.id)}
                        className="bg-blue-900/30 rounded p-2 cursor-move hover:bg-blue-900/50 transition-colors border border-blue-700/50"
                      >
                        <div className="text-xs font-medium truncate">{player.name}</div>
                        <div className="text-xs text-blue-300/70 capitalize">{player.role}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Common - Smaller Height */}
              <div
                onDragOver={handleDragOver}
                onDrop={() => handleDropOnTeam('C')}
                className="bg-gradient-to-br from-green-900/20 to-green-950/20 rounded-lg p-3 border-2 border-dashed border-green-700/50 hover:border-green-600 transition-colors min-h-[100px]"
              >
                <div className="text-xs font-semibold text-green-400 mb-2">Common ({commonPlayers.length}/1)</div>
                <div className="space-y-2">
                  {commonPlayers.map(player => (
                    <div
                      key={player.id}
                      draggable
                      onDragStart={() => handleDragStart(player.id)}
                      className="bg-green-900/30 rounded p-2 cursor-move hover:bg-green-900/50 transition-colors border border-green-700/50"
                    >
                      <div className="text-xs font-medium truncate">{player.name}</div>
                      <div className="text-xs text-green-300/70 capitalize">{player.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveTeams}
              disabled={teamAPlayers.length === 0 || teamBPlayers.length === 0 || isSaving}
              className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
