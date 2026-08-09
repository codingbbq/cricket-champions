import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, writeBatch, updateDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { Match, Team, Player, Innings, Ball } from '@/types';
import { PlayerSelection } from '@/components/scoring/PlayerSelection';
import { ScoringControls } from '@/components/scoring/ScoringControls';
import { LiveScorecard } from '@/components/scoring/LiveScorecard';
import { RecentOver } from '@/components/scoring/RecentOver';
import { MatchSummary } from '@/components/scoring/MatchSummary';

const ScoringPage = () => {
  const { matchId } = useParams<{ matchId: string }>();
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

  useEffect(() => {
    const fetchMatchData = async () => {
      if (!matchId) return;

      // Fetch match details
      const matchRef = doc(db, 'matches', matchId);
      const matchSnap = await getDoc(matchRef);
      if (!matchSnap.exists() || !matchSnap.data().toss) {
        // TODO: Handle match or toss data not found
        console.error('Match or toss data not found!');
        return;
      }
      const matchData = { id: matchSnap.id, ...matchSnap.data() } as Match;
      setMatch(matchData);

      // Fetch teams
      const teamsQuery = collection(db, `matches/${matchId}/teams`);
      const teamsSnap = await getDocs(teamsQuery);
      const teamsData = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));

      // Fetch all players in the match
      const allPlayerIds = teamsData.flatMap(team => team.players);
      const playersQuery = collection(db, 'players');
      const playersSnap = await getDocs(playersQuery);
      const allPlayersFromDB = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
      setPlayers(allPlayersFromDB.filter(p => allPlayerIds.includes(p.id)));

      // Determine batting and bowling teams
      const tossWinner = teamsData.find(t => t.id === matchData.toss!.winnerId);
      const otherTeam = teamsData.find(t => t.id !== matchData.toss!.winnerId);
      if (!tossWinner || !otherTeam) return;

      const isBatting = matchData.toss!.choice === 'bat';
      const battingFirstTeam = isBatting ? tossWinner : otherTeam;
      const bowlingFirstTeam = isBatting ? otherTeam : tossWinner;

      setBattingTeam(battingFirstTeam);
      setBowlingTeam(bowlingFirstTeam);

      // Initialize first innings
      // Initialize or load innings
      const inningsQuery = collection(db, `matches/${matchId}/innings`);
      const inningsSnap = await getDocs(inningsQuery);
      if (inningsSnap.empty) {
        const newInnings: Innings = { id: battingFirstTeam.id, teamId: battingFirstTeam.id, score: 0, wickets: 0, overs: 0, balls: [] };
        setCurrentInnings(newInnings);
      } else {
        // For now, just load the first innings. This will be expanded later.
        const inningsData = inningsSnap.docs[0].data() as Innings;
        inningsData.id = inningsSnap.docs[0].id;
        setCurrentInnings(inningsData);
      }
    };

    fetchMatchData();
  }, [matchId]);

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
    if (!currentInnings) return;

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
    const maxWickets = players.filter(p => (isFirstInnings ? battingTeam : bowlingTeam)?.players.includes(p.id)).length - 1;

    // Check for innings end
    if (newWickets === maxWickets || overs === match?.overs) {
      if (isFirstInnings) {
        handleInningsEnd();
      } else {
        // Match over
        const winner = currentInnings.score > firstInnings!.score ? battingTeam : bowlingTeam;
        const margin = `${Math.abs(currentInnings.score - firstInnings!.score)} runs`;
        setMatchWinner(winner);
        setWinMargin(margin);
        updateDoc(doc(db, 'matches', matchId!), { status: 'completed' });
      }
      return;
    }

    // Check if target is chased in second innings
    if (!isFirstInnings && newScore > firstInnings!.score) {
      const winner = battingTeam;
      const margin = `${maxWickets - newWickets} wickets`;
      setMatchWinner(winner);
      setWinMargin(margin);
      updateDoc(doc(db, 'matches', matchId!), { status: 'completed' });
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

  if (!match || !battingTeam || !bowlingTeam || !currentInnings) {
    return <div className="container mx-auto py-10">Loading match data...</div>;
  }

  return (
    <div className="container mx-auto py-10">
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
              <ScoringControls 
                onScore={handleScore}
                onExtra={handleExtra}
                onWicket={handleWicket}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoringPage;
