import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Match, Player } from '@/types';

const TeamSelectionPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!matchId) return;
      setLoading(true);
      const matchRef = doc(db, 'matches', matchId);
      const matchSnap = await getDoc(matchRef);
      if (matchSnap.exists()) {
        setMatch(matchSnap.data() as Match);
      }

      const playersSnap = await getDocs(collection(db, 'players'));
      setAllPlayers(playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player)));
      setLoading(false);
    };
    fetchData();
  }, [matchId]);

  const handlePlayerSelection = (playerId: string, team: 'A' | 'B') => {
    const otherTeamPlayers = team === 'A' ? teamBPlayers : teamAPlayers;
    if (otherTeamPlayers.includes(playerId)) return; // Player already in other team

    const currentTeamPlayers = team === 'A' ? teamAPlayers : teamBPlayers;
    const setter = team === 'A' ? setTeamAPlayers : setTeamBPlayers;

    if (currentTeamPlayers.includes(playerId)) {
      setter(currentTeamPlayers.filter(id => id !== playerId));
    } else {
      setter([...currentTeamPlayers, playerId]);
    }
  };

  const handleSaveTeams = async () => {
    if (!matchId) return;
    const matchRef = doc(db, 'matches', matchId);
    await updateDoc(matchRef, {
      teams: {
        teamA: { name: 'Team A', players: teamAPlayers },
        teamB: { name: 'Team B', players: teamBPlayers },
      }
    });
    navigate(`/admin/matches/${matchId}/toss`);
  };

  if (loading) {
    return <div className="container mx-auto py-10">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Select Teams for {match?.venue}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h2 className="text-xl font-bold mb-4">Available Players</h2>
          <div className="space-y-2 p-4 bg-white rounded-lg shadow-md">
            {allPlayers.map(player => (
              <div key={player.id} className="flex items-center justify-between">
                <span>{player.name}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePlayerSelection(player.id, 'A')}
                    className={`px-2 py-1 text-xs rounded ${teamAPlayers.includes(player.id) ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                    Team A
                  </button>
                  <button 
                    onClick={() => handlePlayerSelection(player.id, 'B')}
                    className={`px-2 py-1 text-xs rounded ${teamBPlayers.includes(player.id) ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                    Team B
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-1">
          <h2 className="text-xl font-bold mb-4">Team A</h2>
          <div className="p-4 bg-white rounded-lg shadow-md min-h-[200px]">
            {allPlayers.filter(p => teamAPlayers.includes(p.id)).map(p => <div key={p.id}>{p.name}</div>)}
          </div>
        </div>
        <div className="md:col-span-1">
          <h2 className="text-xl font-bold mb-4">Team B</h2>
          <div className="p-4 bg-white rounded-lg shadow-md min-h-[200px]">
            {allPlayers.filter(p => teamBPlayers.includes(p.id)).map(p => <div key={p.id}>{p.name}</div>)}
          </div>
        </div>
      </div>
      <div className="mt-8 flex justify-end">
        <button onClick={handleSaveTeams} disabled={teamAPlayers.length < 1 || teamBPlayers.length < 1} className="px-6 py-3 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
          Save Teams & Proceed to Toss
        </button>
      </div>
    </div>
  );
};

export default TeamSelectionPage;
