import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { BallCommentary } from '@/components/commentary/BallCommentary';
import type { Match, Team, Player, Innings } from '@/types';

const MatchSummaryPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedInnings, setSelectedInnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [youtubeId, setYoutubeId] = useState('');
  const [embedInput, setEmbedInput] = useState('');
  
  // Check if user is admin (you can customize this based on your auth system)
  const isAdmin = currentUser?.email?.includes('admin') || currentUser?.email === 'admin@example.com';

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
      
      // Fetch match details
      const matchRef = doc(db, 'matches', matchId);
      const matchSnap = await getDoc(matchRef);
      
      if (!matchSnap.exists()) {
        setError('Match not found');
        setLoading(false);
        return;
      }

      const matchData = { id: matchSnap.id, ...matchSnap.data() } as Match;
      setMatch(matchData);
      
      // Load YouTube embed ID if available
      if (matchData.youtubeEmbedId) {
        setYoutubeId(matchData.youtubeEmbedId);
      }

      // Fetch teams from subcollection
      const teamsRef = collection(db, `matches/${matchId}/teams`);
      const teamsSnap = await getDocs(teamsRef);
      const teamsData: Record<string, Team> = {};
      
      teamsSnap.docs.forEach(doc => {
        const teamData = { id: doc.id, ...doc.data() } as Team;
        teamsData[doc.id] = teamData;
      });
      setTeams(teamsData);

      // Fetch all players
      const playersRef = collection(db, 'players');
      const playersSnap = await getDocs(playersRef);
      const playersData = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
      setPlayers(playersData);

      // Fetch innings from subcollection
      const inningsRef = collection(db, `matches/${matchId}/innings`);
      const inningsSnap = await getDocs(inningsRef);
      const inningsData: Innings[] = [];
      
      console.log('Innings found:', inningsSnap.docs.length);
      
      inningsSnap.docs.forEach(doc => {
        const inningsDoc = doc.data();
        console.log('Innings data:', { id: doc.id, ...inningsDoc });
        const innings = { id: doc.id, ...inningsDoc } as Innings;
        inningsData.push(innings);
      });
      
      // Update match with innings data
      if (inningsData.length > 0) {
        matchData.innings = inningsData;
        setMatch(matchData);
        console.log('Match updated with innings:', matchData);
      } else {
        console.warn('No innings found for match');
      }

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

  const innings = match.innings || [];
  const teamIds = Object.keys(teams);
  const teamA = teams[teamIds[0]];
  const teamB = teams[teamIds[1]];

  // Determine which team batted first based on toss
  const getFirstBattingTeamId = () => {
    if (!match.toss) return teamIds[0]; // Default to first team if no toss info
    
    const tossWinnerId = match.toss.winnerId === 'teamA' ? teamIds[0] : teamIds[1];
    
    if (match.toss.choice === 'bat') {
      return tossWinnerId; // Toss winner chose to bat, so they bat first
    } else {
      // Toss winner chose to bowl, so the other team bats first
      return tossWinnerId === teamIds[0] ? teamIds[1] : teamIds[0];
    }
  };

  const firstBattingTeamId = getFirstBattingTeamId();
  
  // Reorder innings based on batting order
  const orderedInnings = innings.length > 0 
    ? innings.sort((a, b) => {
        // Team that batted first should be at index 0
        if (a.teamId === firstBattingTeamId) return -1;
        if (b.teamId === firstBattingTeamId) return 1;
        return 0;
      })
    : [];

  const currentInnings = orderedInnings[selectedInnings];
  
  // Determine batting and bowling teams based on innings
  let battingTeam: Team | undefined;
  let bowlingTeam: Team | undefined;
  
  if (currentInnings && currentInnings.teamId) {
    battingTeam = teams[currentInnings.teamId];
    // Find the other team
    bowlingTeam = Object.values(teams).find(t => t.id !== currentInnings.teamId);
  } else if (selectedInnings === 0) {
    // First innings: use toss winner
    battingTeam = teamA;
    bowlingTeam = teamB;
  } else {
    // Second innings: swap teams
    battingTeam = teamB;
    bowlingTeam = teamA;
  }

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

  const handleSaveYoutubeId = async () => {
    if (!matchId || !embedInput.trim()) return;
    try {
      await updateDoc(doc(db, 'matches', matchId), { youtubeEmbedId: embedInput });
      setYoutubeId(embedInput);
      setEmbedInput('');
      setShowEmbedModal(false);
    } catch (err) {
      console.error('Error saving YouTube ID:', err);
    }
  };

  return (
    <div className="w-full flex flex-col pb-20">
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-3 bg-neutral-950/90 backdrop-blur-lg border-b border-neutral-800 flex items-center gap-3">
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

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Video Section */}
          {youtubeId ? (
            <div className="relative w-full aspect-video bg-neutral-900 rounded-xl overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title="Match Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
              {isAdmin && (
                <button
                  onClick={() => {
                    setEmbedInput(youtubeId);
                    setShowEmbedModal(true);
                  }}
                  className="absolute top-2 right-2 px-2 py-1 bg-black/70 hover:bg-black text-white text-xs rounded transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          ) : isAdmin ? (
            <button
              onClick={() => setShowEmbedModal(true)}
              className="w-full aspect-video bg-neutral-900 rounded-xl border-2 border-dashed border-neutral-700 hover:border-amber-500 flex items-center justify-center transition-colors"
            >
              <div className="text-center">
                <div className="text-3xl mb-2">🎬</div>
                <p className="text-sm text-neutral-400">Add YouTube Video</p>
              </div>
            </button>
          ) : null}

          {/* Match Info */}
          <div>
            <div className="text-lg font-bold text-neutral-500">
              {match.venue} · {new Date(match.date.seconds ? match.date.seconds * 1000 : match.date).toLocaleDateString()} · {match.overs} overs
            </div>
            {/* Toss Information */}
            {match.toss && (
              <div className="text-xs text-neutral-400 mt-1">
                🪙 {match.toss.winnerId === 'teamA' ? teams[Object.keys(teams)[0]]?.name : teams[Object.keys(teams)[1]]?.name} won toss and chose to {match.toss.choice === 'bat' ? 'bat' : 'bowl'}
              </div>
            )}
          </div>
          
          {/* Match Result */}
          {innings.length > 0 && (
            <div className="relative rounded-lg overflow-hidden">
              <div className="absolute inset-0 text-6xl opacity-10 flex items-center justify-center">🏆</div>
              <div className="relative bg-neutral-900/50 backdrop-blur-sm border border-amber-500/20 rounded-lg p-4">
                {innings[1] ? (
                  <div className="text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                      {innings[1].score > innings[0].score 
                        ? `${teams[innings[1].teamId]?.name} Won!`
                        : `${teams[innings[0].teamId]?.name} Won!`
                      }
                    </div>
                    <div className="text-sm text-neutral-400 mt-1">
                      {innings[1].score > innings[0].score 
                        ? `by ${(Object.values(teams).find(t => t.id === innings[1].teamId)?.players.length || 11) - innings[1].wickets} wickets`
                        : `by ${innings[0].score - innings[1].score} runs`
                      }
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-400">
                      {teams[innings[0].teamId]?.name}
                    </div>
                    <div className="text-sm text-neutral-400">
                      {innings[0].score}/{innings[0].wickets}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Innings Tabs */}
          {orderedInnings.length > 0 && (
            <div className="border-b border-neutral-800">
              <div className="flex gap-0">
                {orderedInnings.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedInnings(idx)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      selectedInnings === idx
                        ? 'border-amber-500 text-amber-400 bg-neutral-900/50'
                        : 'border-transparent text-neutral-400 hover:text-neutral-300'
                    }`}
                  >
                    {teams[orderedInnings[idx].teamId]?.name} Innings
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentInnings && (
            <>
              {/* Batting Stats */}
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-semibold text-base">{battingTeam?.name} — {currentInnings.score}/{currentInnings.wickets}</h3>
                  <span className="text-xs text-neutral-500">{currentInnings.overs} overs</span>
                </div>
                <div className="bg-neutral-900 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-800/50">
                        <th className="text-left px-3 py-2 font-medium text-neutral-400">BATSMAN</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">R</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">B</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">4S</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">6S</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">SR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {battingStats.map((stat, idx) => (
                        <tr key={idx} className="border-b border-neutral-800 last:border-b-0 hover:bg-neutral-800/30">
                          <td className="px-3 py-2 text-neutral-300 font-medium">{stat.name}</td>
                          <td className="text-right px-2 py-2 font-semibold">{stat.runs}</td>
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
                <h3 className="font-semibold text-base mb-3">{bowlingTeam?.name} bowling</h3>
                <div className="bg-neutral-900 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-800/50">
                        <th className="text-left px-3 py-2 font-medium text-neutral-400">BOWLER</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">O</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">M</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">R</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">W</th>
                        <th className="text-right px-2 py-2 font-medium text-neutral-400">ECON</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bowlingStats.map((stat, idx) => (
                        <tr key={idx} className="border-b border-neutral-800 last:border-b-0 hover:bg-neutral-800/30">
                          <td className="px-3 py-2 text-neutral-300 font-medium">{stat.name}</td>
                          <td className="text-right px-2 py-2">{stat.overs}</td>
                          <td className="text-right px-2 py-2">0</td>
                          <td className="text-right px-2 py-2 font-semibold">{stat.runs}</td>
                          <td className="text-right px-2 py-2 font-semibold">{stat.wickets}</td>
                          <td className="text-right px-2 py-2">{stat.econ}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Commentary */}
              <div>
                <h3 className="font-semibold text-base mb-3">Commentary</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {currentInnings.balls && currentInnings.balls.length > 0 ? (
                    currentInnings.balls
                      .slice()
                      .reverse()
                      .map((ball, idx) => {
                        // Calculate over and ball number from valid balls count
                        const validBallsUpToThisBall = currentInnings.balls
                          .slice(0, currentInnings.balls.length - idx)
                          .filter(b => !b.isExtra || b.extraType !== 'no-ball');
                        const overNumber = Math.floor((validBallsUpToThisBall.length - 1) / 6);
                        const ballInOver = ((validBallsUpToThisBall.length - 1) % 6) + 1;

                        // Create players map for name lookup
                        const playersMap = new Map<string, string>();
                        players.forEach(p => playersMap.set(p.id, p.name));

                        return (
                          <BallCommentary
                            key={idx}
                            ball={ball}
                            overNumber={overNumber}
                            ballInOver={ballInOver}
                            playersMap={playersMap}
                          />
                        );
                      })
                  ) : (
                    <div className="text-sm text-neutral-500">No balls bowled in this innings</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* YouTube Embed Modal */}
        {showEmbedModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-neutral-900 rounded-xl p-6 max-w-sm mx-4 space-y-4 border border-neutral-800">
              <h3 className="text-lg font-bold">Add YouTube Video</h3>
              <div className="space-y-2">
                <label className="text-sm text-neutral-400">YouTube Embed ID</label>
                <input
                  type="text"
                  value={embedInput}
                  onChange={(e) => setEmbedInput(e.target.value)}
                  placeholder="e.g., dQw4w9WgXcQ"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
                <p className="text-xs text-neutral-500">
                  Get the ID from the YouTube URL: youtube.com/watch?v=<span className="text-amber-400">dQw4w9WgXcQ</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowEmbedModal(false);
                    setEmbedInput('');
                  }}
                  className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveYoutubeId}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default MatchSummaryPage;
