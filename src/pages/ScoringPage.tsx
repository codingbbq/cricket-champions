import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, writeBatch, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import type { Match, Team, Player, Innings, Ball } from '@/types';
import { ScoringControls } from '@/components/scoring/ScoringControls';
import { MatchSummary } from '@/components/scoring/MatchSummary';

const ScoringPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [firstInnings, setFirstInnings] = useState<Innings | null>(null);
  const [battingTeam, setBattingTeam] = useState<Team | null>(null);
  const [bowlingTeam, setBowlingTeam] = useState<Team | null>(null);
  const [striker, setStriker] = useState<Player | null>(null);
  const [nonStriker, setNonStriker] = useState<Player | null>(null);
  const [bowler, setBowler] = useState<Player | null>(null);
  const [matchWinner, setMatchWinner] = useState<Team | null>(null);
  const [winMargin, setWinMargin] = useState('');
  const [currentInnings, setCurrentInnings] = useState<Innings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStrikerDropdown, setShowStrikerDropdown] = useState(false);
  const [showNonStrikerDropdown, setShowNonStrikerDropdown] = useState(false);
  const [showBowlerDropdown, setShowBowlerDropdown] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchMatchData = async () => {
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
          if (!matchData.toss) {
            throw new Error('Match toss data not found. Please complete the toss setup first.');
          }

          if (isMounted) setMatch(matchData);

          // Fetch teams
          const teamsQuery = collection(db, `matches/${matchId}/teams`);
          const teamsSnap = await getDocs(teamsQuery);
          if (teamsSnap.empty) {
            throw new Error('Teams not found. Please select teams first.');
          }

          const teamsData = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));

          // Fetch all players in the match
          const allPlayerIds = teamsData.flatMap(team => team.players);
          const playersQuery = collection(db, 'players');
          const playersSnap = await getDocs(playersQuery);
          const allPlayersFromDB = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
          if (isMounted) setPlayers(allPlayersFromDB.filter(p => allPlayerIds.includes(p.id)));

          // Determine batting and bowling teams
          const tossWinner = teamsData.find(t => t.id === matchData.toss!.winnerId);
          const otherTeam = teamsData.find(t => t.id !== matchData.toss!.winnerId);
          if (!tossWinner || !otherTeam) {
            throw new Error('Could not determine batting and bowling teams');
          }

          const isBatting = matchData.toss!.choice === 'bat';
          const battingFirstTeam = isBatting ? tossWinner : otherTeam;
          const bowlingFirstTeam = isBatting ? otherTeam : tossWinner;

          console.log('Teams loaded:', { battingFirstTeam, bowlingFirstTeam });
          
          if (isMounted) {
            setBattingTeam(battingFirstTeam);
            setBowlingTeam(bowlingFirstTeam);
          }

          // Initialize or load innings
          const inningsQuery = collection(db, `matches/${matchId}/innings`);
          const inningsSnap = await getDocs(inningsQuery);
          if (inningsSnap.empty) {
            const newInnings: Innings = { id: battingFirstTeam.id, teamId: battingFirstTeam.id, score: 0, wickets: 0, overs: 0, balls: [] };
            if (isMounted) setCurrentInnings(newInnings);
          } else {
            const inningsData = inningsSnap.docs[0].data() as Innings;
            inningsData.id = inningsSnap.docs[0].id;
            if (isMounted) setCurrentInnings(inningsData);
          }
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

    fetchMatchData();

    return () => {
      isMounted = false;
    };
  }, [matchId, addToast]);

  const updateInnings = (updatedInnings: Innings) => {
    setCurrentInnings(updatedInnings);
    // Persist to Firestore
    if (matchId) {
      const batch = writeBatch(db);
      const inningsRef = doc(db, `matches/${matchId}/innings`, updatedInnings.id);
      batch.set(inningsRef, updatedInnings);
      batch.commit().catch(err => console.error("Failed to save innings: ", err));
    }
  };

  const handleInningsEnd = () => {
    if (!currentInnings || !battingTeam || !bowlingTeam) return;

    setFirstInnings(currentInnings);
    const newInnings: Innings = { id: bowlingTeam.id, teamId: bowlingTeam.id, score: 0, wickets: 0, overs: 0, balls: [] };
    setCurrentInnings(newInnings);
    
    // Swap teams
    setBattingTeam(bowlingTeam);
    setBowlingTeam(battingTeam);

    // Reset players
    setStriker(null);
    setNonStriker(null);
    setBowler(null);
  };

  const processBall = (ball: Omit<Ball, 'ballNumber'>) => {
    if (!currentInnings || !match) return;

    const newBall = { ...ball, ballNumber: currentInnings.balls.length + 1 };
    
    let newScore = currentInnings.score + newBall.runs;
    let newWickets = currentInnings.wickets;
    let tempStriker = striker;
    let tempNonStriker = nonStriker;

    if (newBall.isExtra && (newBall.extraType === 'wide' || newBall.extraType === 'no-ball')) {
      newScore++;
    }

    if (newBall.isWicket) {
      newWickets++;
      setStriker(null); // Force selection of new batsman
      tempStriker = null;
    }

    const newBalls = [...currentInnings.balls, newBall];
    const validBalls = newBalls.filter(b => !b.isExtra || b.extraType === 'no-ball');
    const overs = Math.floor(validBalls.length / 6);
    const ballsInOver = validBalls.length % 6;

    const isFirstInnings = !firstInnings;
    const currentBattingTeam = isFirstInnings ? battingTeam : bowlingTeam;
    
    // Defensive check: ensure we have valid team data before checking innings end
    if (!currentBattingTeam || !Array.isArray(currentBattingTeam.players)) {
      console.warn('Invalid batting team data:', currentBattingTeam);
      // Just update innings without checking for end condition
      updateInnings({ ...currentInnings, score: newScore, wickets: newWickets, balls: newBalls, overs });
      return;
    }
    
    const battingTeamPlayerIds = currentBattingTeam.players;
    const battingTeamPlayerCount = battingTeamPlayerIds.length;
    // Max wickets is total players - 1 (last man can't bat alone)
    const maxWickets = Math.max(1, battingTeamPlayerCount - 1);

    // Check for innings end (all wickets lost OR all overs completed)
    // Only end innings if we've completed at least one full over or all overs
    const oversCompleted = match.overs && match.overs > 0 && overs >= match.overs;
    const wicketsLost = newWickets >= maxWickets;
    // Require at least 6 valid balls (1 over) before ending innings
    const inningsEnded = (wicketsLost || oversCompleted) && validBalls.length >= 6;
    
    console.log('Innings check:', { 
      battingTeamPlayerCount, 
      maxWickets, 
      newWickets, 
      wicketsLost, 
      oversCompleted, 
      inningsEnded, 
      overs, 
      matchOvers: match.overs,
      validBallsLength: validBalls.length
    });
    
    if (inningsEnded) {
      if (isFirstInnings) {
        // First innings complete, move to second innings
        handleInningsEnd();
      } else {
        // Second innings complete, determine match winner
        const winner = newScore > firstInnings!.score ? battingTeam : bowlingTeam;
        const margin = newScore > firstInnings!.score 
          ? `${maxWickets - newWickets} wickets` 
          : `${firstInnings!.score - newScore} runs`;
        setMatchWinner(winner);
        setWinMargin(margin);
        updateDoc(doc(db, 'matches', matchId!), { status: 'completed' });
      }
      updateInnings({ ...currentInnings, score: newScore, wickets: newWickets, balls: newBalls, overs });
      return;
    }

    // Check if target is chased in second innings (before all overs are completed)
    if (!isFirstInnings && newScore > firstInnings!.score) {
      const winner = battingTeam;
      const margin = `${maxWickets - newWickets} wickets`;
      setMatchWinner(winner);
      setWinMargin(margin);
      updateDoc(doc(db, 'matches', matchId!), { status: 'completed' });
      updateInnings({ ...currentInnings, score: newScore, wickets: newWickets, balls: newBalls, overs });
      return;
    }


    // Handle strike rotation
    if (!newBall.isExtra || newBall.extraType === 'no-ball') {
      if (newBall.runs % 2 !== 0) { // Odd runs
        setStriker(tempNonStriker);
        setNonStriker(tempStriker);
      }
      if (ballsInOver === 0 && validBalls.length > 0) { // End of over
        setStriker(tempNonStriker);
        setNonStriker(tempStriker);
        setBowler(null); // Force new bowler selection
      }
    }

    updateInnings({ ...currentInnings, score: newScore, wickets: newWickets, balls: newBalls, overs });
  };

  const handleScore = (runs: number) => {
    if (!striker || !bowler) return;
    processBall({ bowlerId: bowler.id, strikerId: striker.id, runs, isExtra: false, isWicket: false });
  };

  const handleExtra = (extraType: 'wide' | 'no-ball') => {
    if (!striker || !bowler) return;
    processBall({ bowlerId: bowler.id, strikerId: striker.id, runs: 0, isExtra: true, extraType, isWicket: false });
  };

  const handleWicket = () => {
    if (!striker || !bowler) return;
    // TODO: Implement a modal to select wicket type and new batsman
    processBall({ bowlerId: bowler.id, strikerId: striker.id, runs: 0, isExtra: false, isWicket: true, wicketType: 'bowled' });
  };

  if (matchWinner) {
    return <MatchSummary winnerName={matchWinner.name} margin={winMargin} />;
  }

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

  if (error || !match || !battingTeam || !bowlingTeam || !currentInnings) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex justify-center items-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error || 'Match data is incomplete'}</p>
          <button
            onClick={() => navigate('/admin/matches')}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  const validBalls = currentInnings.balls.filter(b => !b.isExtra || b.extraType === 'no-ball');
  const oversCompleted = Math.floor(validBalls.length / 6);
  const ballsInCurrentOver = validBalls.length % 6;
  const oversLabel = `${oversCompleted}.${ballsInCurrentOver}`;
  const runRate = validBalls.length > 0 ? (currentInnings.score / validBalls.length * 6).toFixed(2) : '0.00';

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col relative bg-neutral-950">
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-3 bg-neutral-950/90 backdrop-blur-lg border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/matches')}
                className="w-7 h-7 flex items-center justify-center text-white hover:bg-neutral-800 rounded transition-colors"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M15 18l-6-6 6-6"></path>
                </svg>
              </button>
              <div>
                <div className="text-sm font-semibold">{battingTeam.name} vs {bowlingTeam.name}</div>
                <div className="text-xs text-neutral-500">{match.venue} · {match.overs} overs</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-orange-500">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              LIVE
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-4">
          {/* Score Card */}
          <div className="bg-neutral-900 rounded-lg p-4 text-center space-y-1">
            <div className="text-xs text-neutral-400">{battingTeam.name} batting</div>
            <div className="text-4xl font-bold">{currentInnings.score}-{currentInnings.wickets}</div>
            <div className="text-xs text-neutral-500">{oversLabel} overs · RR {runRate}</div>
          </div>

          {/* Batsmen Info */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <button
                onClick={() => setShowStrikerDropdown(!showStrikerDropdown)}
                className={`w-full bg-neutral-900 rounded-lg p-3 border text-left transition-colors ${striker ? 'border-amber-500' : 'border-neutral-800 hover:border-neutral-700'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1">
                      {striker?.name || 'Select Striker'}
                      {striker && <span className="text-amber-400">●</span>}
                    </div>
                    {striker && (
                      <div className="text-xs text-neutral-500">
                        {currentInnings.balls.filter(b => b.strikerId === striker.id).reduce((sum, b) => sum + b.runs, 0)} (
                        {currentInnings.balls.filter(b => b.strikerId === striker.id).length})
                      </div>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showStrikerDropdown ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </div>
              </button>
              {showStrikerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg z-10 max-h-48 overflow-y-auto">
                  {players.filter(p => battingTeam.players.includes(p.id)).map(player => (
                    <button
                      key={player.id}
                      onClick={() => {
                        setStriker(player);
                        setShowStrikerDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-neutral-700 text-sm transition-colors border-b border-neutral-700 last:border-b-0"
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 relative">
              <button
                onClick={() => setShowNonStrikerDropdown(!showNonStrikerDropdown)}
                className="w-full bg-neutral-900 rounded-lg p-3 border border-neutral-800 hover:border-neutral-700 text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium mb-1">{nonStriker?.name || 'Select Non-Striker'}</div>
                    {nonStriker && (
                      <div className="text-xs text-neutral-500">
                        {currentInnings.balls.filter(b => b.strikerId === nonStriker.id).reduce((sum, b) => sum + b.runs, 0)} (
                        {currentInnings.balls.filter(b => b.strikerId === nonStriker.id).length})
                      </div>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showNonStrikerDropdown ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </div>
              </button>
              {showNonStrikerDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg z-10 max-h-48 overflow-y-auto">
                  {players.filter(p => battingTeam.players.includes(p.id)).map(player => (
                    <button
                      key={player.id}
                      onClick={() => {
                        setNonStriker(player);
                        setShowNonStrikerDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-neutral-700 text-sm transition-colors border-b border-neutral-700 last:border-b-0"
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bowler Info */}
          <div className="relative">
            <button
              onClick={() => setShowBowlerDropdown(!showBowlerDropdown)}
              className="w-full bg-neutral-900 rounded-lg p-3 flex items-center justify-between border border-neutral-800 hover:border-neutral-700 text-left transition-colors"
            >
              <div>
                <div className="text-sm font-medium">🎯 {bowler?.name || 'Select Bowler'}</div>
                {bowler && (
                  <div className="text-xs text-neutral-500 mt-1">
                    {currentInnings.balls.filter(b => b.bowlerId === bowler.id).reduce((sum, b) => sum + b.runs, 0)}/
                    {currentInnings.balls.filter(b => b.bowlerId === bowler.id && !b.isExtra).length}
                  </div>
                )}
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showBowlerDropdown ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6"></path>
              </svg>
            </button>
            {showBowlerDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg z-10 max-h-48 overflow-y-auto">
                {players.filter(p => bowlingTeam.players.includes(p.id)).map(player => (
                  <button
                    key={player.id}
                    onClick={() => {
                      setBowler(player);
                      setShowBowlerDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-neutral-700 text-sm transition-colors border-b border-neutral-700 last:border-b-0"
                  >
                    {player.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent Over */}
          <div>
            <div className="text-xs text-neutral-400 uppercase mb-2">This over</div>
            <div className="flex gap-1.5 flex-wrap">
              {currentInnings.balls
                .filter(b => !b.isExtra || b.extraType === 'no-ball')
                .slice(-6)
                .map((ball, idx) => (
                  <div
                    key={idx}
                    className="w-7 h-7 rounded bg-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-300"
                  >
                    {ball.isWicket ? 'W' : ball.runs}
                  </div>
                ))}
              {validBalls.length % 6 === 0 && validBalls.length > 0 && (
                <div className="text-xs text-neutral-500 self-center">Over complete</div>
              )}
            </div>
          </div>

          {/* Scoring Controls */}
          <div>
            {!striker || !bowler ? (
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-center text-xs text-neutral-400">
                Select Striker and Bowler to start scoring
              </div>
            ) : (
              <ScoringControls
                onScore={handleScore}
                onExtra={handleExtra}
                onWicket={handleWicket}
                isEnabled={!!striker && !!bowler}
              />
            )}
          </div>

          {/* Commentary */}
          <div>
            <div className="text-xs text-neutral-400 uppercase mb-2">Commentary</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {currentInnings.balls.length === 0 ? (
                <div className="text-xs text-neutral-500">No balls bowled yet</div>
              ) : (
                currentInnings.balls
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((ball, idx) => (
                    <div key={idx} className="text-xs text-neutral-400 pb-1 border-b border-neutral-800">
                      <span className="text-neutral-600">Ball {ball.ballNumber}:</span> {ball.runs} runs
                      {ball.isWicket && ' - WICKET!'}
                      {ball.isExtra && ` (${ball.extraType})`}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoringPage;
