import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Match, Team, Player, Innings } from '@/types';

const MatchSummaryPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedInnings, setSelectedInnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatchData();
  }, [matchId]);

  const fetchMatchData = async () => {
    if (!matchId) {
      setError('Match ID not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const matchRef = doc(db, 'matches', matchId);
      const matchSnap = await getDoc(matchRef);
      
      if (!matchSnap.exists()) {
        setError('Match not found');
        setLoading(false);
        return;
      }

      const matchData = { id: matchSnap.id, ...matchSnap.data() } as Match;
      setMatch(matchData);

      const teamsData: Record<string, Team> = {};
      const teamIds = [matchData.teamA, matchData.teamB];
      
      for (const teamId of teamIds) {
        if (teamId) {
          const teamRef = doc(db, 'teams', teamId);
          const teamSnap = await getDoc(teamRef);
          if (teamSnap.exists()) {
            teamsData[teamId] = { id: teamSnap.id, ...teamSnap.data() } as Team;
          }
        }
      }
      setTeams(teamsData);

      const playersRef = collection(db, 'players');
      const playersSnap = await getDocs(playersRef);
      const playersData = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
      setPlayers(playersData);

      setError(null);
    } catch (err) {
      console.error('Error fetching match data:', err);
      setError('Failed to load match data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex justify-center items-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-neutral-400">Loading match summary...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex justify-center items-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error || 'Match data not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const teamA = teams[match.teamA];
  const teamB = teams[match.teamB];
  const innings = match.innings || [];

  const currentInnings = innings[selectedInnings];
  const battingTeamId = selectedInnings === 0 ? match.teamA : match.teamB;
  const bowlingTeamId = selectedInnings === 0 ? match.teamB : match.teamA;
  const battingTeam = teams[battingTeamId];
  const bowlingTeam = teams[bowlingTeamId];

  const getBattingStats = () => {
    if (!currentInnings) return [];
    
    const playerStats = new Map<string, any>();
    
    currentInnings.balls.forEach((ball: any) => {
      if (!playerStats.has(ball.strikerId)) {
        const player = players.find(p => p.id === ball.strikerId);
        playerStats.set(ball.strikerId, {
          id: ball.strikerId,
          name: player?.name || 'Unknown',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
        });
      }
      
      const stats = playerStats.get(ball.strikerId);
      stats.runs += ball.runs;
      stats.balls += 1;
      
      if (ball.runs === 4) stats.fours += 1;
      if (ball.runs === 6) stats.sixes += 1;
    });

    return Array.from(playerStats.values()).map(stat => ({
      ...stat,
      sr: stat.balls > 0 ? (stat.runs / stat.balls * 100).toFixed(1) : '0.0',
    }));
  };

  const getBowlingStats = () => {
    if (!currentInnings) return [];
    
    const bowlerStats = new Map<string, any>();
    
    currentInnings.balls.forEach((ball: any) => {
      if (!bowlerStats.has(ball.bowlerId)) {
        const player = players.find(p => p.id === ball.bowlerId);
        bowlerStats.set(ball.bowlerId, {
          id: ball.bowlerId,
          name: player?.name || 'Unknown',
          overs: 0,
          maidens: 0,
          runs: 0,
          wickets: 0,
        });
      }
      
      const stats = bowlerStats.get(ball.bowlerId);
      stats.runs += ball.runs;
      if (ball.isWicket) stats.wickets += 1;
    });

    return Array.from(bowlerStats.values()).map(stat => {
      const validBalls = currentInnings.balls.filter((b: any) => b.bowlerId === stat.id && (!b.isExtra || b.extraType === 'no-ball'));
      const overs = Math.floor(validBalls.length / 6);
      const balls = validBalls.length % 6;
      return {
        ...stat,
        overs: `${overs}.${balls}`,
        econ: stat.overs > 0 ? (stat.runs / (overs + balls / 6)).toFixed(2) : '0.00',
      };
    });
  };

  const battingStats = getBattingStats();
  const bowlingStats = getBowlingStats();

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col relative bg-neutral-950">
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-3 bg-neutral-950/90 backdrop-blur-lg border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-7 h-7 flex items-center justify-center text-white hover:bg-neutral-800 rounded transition-colors"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 18l-6-6 6-6"></path>
              </svg>
            </button>
            <div className="text-sm font-semibold">Match Summary</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4">
          {/* Match Result */}
          <div className="space-y-2">
            <div className="text-xs text-neutral-500">{match.venue} · {new Date(match.date.seconds ? match.date.seconds * 1000 : match.date).toLocaleDateString()} · {match.overs} overs</div>
            <div className="text-lg font-bold">Match Summary</div>
            <div className="text-sm text-amber-400">Match completed</div>
          </div>

          {/* Innings Tabs */}
          <div className="flex gap-2">
            {innings.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedInnings(idx)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  selectedInnings === idx
                    ? 'bg-amber-500 text-black'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {idx === 0 ? teamA?.name : teamB?.name} inns
              </button>
            ))}
          </div>

          {currentInnings && (
            <>
              {/* Batting Stats */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-semibold">{battingTeam?.name} — {currentInnings.score}/{currentInnings.wickets}</h3>
                  <span className="text-xs text-neutral-500">{currentInnings.overs} overs</span>
                </div>
                <div className="bg-neutral-900 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left px-3 py-2 font-medium text-neutral-400">Batsman</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">R</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">B</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">4s</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">6s</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {battingStats.map((stat, idx) => (
                        <tr key={idx} className="border-b border-neutral-800 last:border-b-0">
                          <td className="px-3 py-2 text-neutral-300">{stat.name}</td>
                          <td className="text-right px-2 py-2">{stat.runs}</td>
                          <td className="text-right px-2 py-2">{stat.balls}</td>
                          <td className="text-right px-2 py-2">{stat.fours}</td>
                          <td className="text-right px-2 py-2">{stat.sixes}</td>
                          <td className="text-right px-2 py-2">{stat.sr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bowling Stats */}
              <div>
                <h3 className="font-semibold mb-3">{bowlingTeam?.name} bowling</h3>
                <div className="bg-neutral-900 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left px-3 py-2 font-medium text-neutral-400">Bowler</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">O</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">R</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">W</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">Econ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bowlingStats.map((stat, idx) => (
                        <tr key={idx} className="border-b border-neutral-800 last:border-b-0">
                          <td className="px-3 py-2 text-neutral-300">{stat.name}</td>
                          <td className="text-right px-2 py-2">{stat.overs}</td>
                          <td className="text-right px-2 py-2">{stat.runs}</td>
                          <td className="text-right px-2 py-2">{stat.wickets}</td>
                          <td className="text-right px-2 py-2">{stat.econ}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchSummaryPage;
