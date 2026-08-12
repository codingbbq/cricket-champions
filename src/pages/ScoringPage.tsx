import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, writeBatch, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import Navigation from '@/components/common/Navigation';
import { useToast } from '@/contexts/ToastContext';
import type { Match, Team, Player, Innings, Ball } from '@/types';
import { PlayerSelection } from '@/components/scoring/PlayerSelection';
import { ScoringControls } from '@/components/scoring/ScoringControls';
import { LiveScorecard } from '@/components/scoring/LiveScorecard';
import { RecentOver } from '@/components/scoring/RecentOver';
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
    return (
      <>
        <Navigation />
        <MatchSummary winnerName={matchWinner.name} margin={winMargin} />
      </>
    );
  }

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

  if (!match || !battingTeam || !bowlingTeam || !currentInnings) {
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

  return (
    <>
      <Navigation />
      <div className="container-responsive py-10">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-center text-2xl font-bold mb-6">{battingTeam.name} vs {bowlingTeam.name}</h1>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Player Selection */}
            <div className="space-y-4">
              <PlayerSelection 
                label="Striker"
                players={players.filter(p => battingTeam.players.includes(p.id))}
                onSelect={(id) => setStriker(players.find(p => p.id === id) || null)}
                selectedPlayerId={striker?.id}
              />
              <PlayerSelection 
                label="Non-Striker"
                players={players.filter(p => battingTeam.players.includes(p.id))}
                onSelect={(id) => setNonStriker(players.find(p => p.id === id) || null)}
                selectedPlayerId={nonStriker?.id}
              />
              <PlayerSelection 
                label="Bowler"
                players={players.filter(p => bowlingTeam.players.includes(p.id))}
                onSelect={(id) => setBowler(players.find(p => p.id === id) || null)}
                selectedPlayerId={bowler?.id}
              />
            </div>

            {/* Scorecard & Controls */}
            <div className="md:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-bold mb-4">Scorecard</h2>
                <LiveScorecard 
                  innings={currentInnings}
                  battingTeamName={battingTeam.name}
                  striker={striker}
                  nonStriker={nonStriker}
                  bowler={bowler}
                />
                <div className="mt-4">
                  <RecentOver balls={currentInnings.balls} />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4">Scoring</h2>
                {!striker || !bowler ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                    <p className="text-yellow-800">Please select Striker and Bowler to start scoring</p>
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ScoringPage;
