import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ScoringControls } from '@/components/scoring/ScoringControls';
import { BallCommentary } from '@/components/commentary/BallCommentary';
import { MatchSummary } from '@/components/scoring/MatchSummary';
import { useToast } from '@/contexts/ToastContext';
import type { Match, Team, Player, Innings, Ball } from '@/types';

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
  const [showNoBallPopup, setShowNoBallPopup] = useState(false);
  const [noBallRuns, setNoBallRuns] = useState(0);
  const [showStrikerPopup, setShowStrikerPopup] = useState(false);
  const [showNonStrikerPopup, setShowNonStrikerPopup] = useState(false);
  const [showBowlerPopup, setShowBowlerPopup] = useState(false);
  const [overSummaries, setOverSummaries] = useState<Array<{ overNumber: number; runsInOver: number; totalScore: number; nextStriker: Player | null; nextNonStriker: Player | null; bowler?: Player | null; ballsInOver: Ball[] }>>([]);
  const [inningsCompletePending, setInningsCompletePending] = useState(false);
  const [completedFirstInningsData, setCompletedFirstInningsData] = useState<Innings | null>(null);
  const [activeTab, setActiveTab] = useState<'scoring' | 'commentary'>('scoring');
  const [overCompletePending, setOverCompletePending] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState<'bowled' | 'caught' | 'run-out' | null>(null);
  const [selectedFielder, setSelectedFielder] = useState<Player | null>(null);
  const [runOutBatsman, setRunOutBatsman] = useState<'striker' | 'non-striker' | null>(null);
  const [runOutEnd, setRunOutEnd] = useState<'striker' | 'non-striker' | null>(null);

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
            // Load the latest innings (last one added, which is the current one being played)
            const inningsData = inningsSnap.docs[inningsSnap.docs.length - 1].data() as Innings;
            inningsData.id = inningsSnap.docs[inningsSnap.docs.length - 1].id;
            if (isMounted) setCurrentInnings(inningsData);
            
            // If there's a first innings, set it
            if (inningsSnap.docs.length > 1) {
              const firstInningsData = inningsSnap.docs[0].data() as Innings;
              firstInningsData.id = inningsSnap.docs[0].id;
              if (isMounted) setFirstInnings(firstInningsData);
              
              // If we're on the second innings, swap batting and bowling teams
              const currentInningsTeamId = inningsData.teamId;
              const firstInningsTeamId = firstInningsData.teamId;
              
              if (currentInningsTeamId !== firstInningsTeamId) {
                // Second innings is being played, swap teams
                const tempTeam = battingFirstTeam;
                if (isMounted) {
                  setBattingTeam(bowlingFirstTeam);
                  setBowlingTeam(tempTeam);
                  // Mark first innings as complete
                  setInningsCompletePending(true);
                  setCompletedFirstInningsData(firstInningsData);
                }
              }
            }
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
      // Ensure teamId is included in the saved data
      const inningsToSave = {
        ...updatedInnings,
        teamId: updatedInnings.teamId || updatedInnings.id,
      };
      batch.set(inningsRef, inningsToSave);
      batch.commit().catch(err => console.error("Failed to save innings: ", err));
    }
  };

  const handleInningsEnd = (completedInnings?: Innings) => {
    if (!currentInnings || !battingTeam || !bowlingTeam) return;

    const inningsToUse = completedInnings || currentInnings;

    // Save the completed innings to Firestore before starting second innings
    if (matchId) {
      const batch = writeBatch(db);
      const inningsRef = doc(db, `matches/${matchId}/innings`, inningsToUse.id);
      const inningsToSave = {
        ...inningsToUse,
        teamId: inningsToUse.teamId || inningsToUse.id,
      };
      batch.set(inningsRef, inningsToSave);
      batch.commit().catch(err => console.error("Failed to save first innings: ", err));
    }

    setFirstInnings(inningsToUse);
    const newInnings: Innings = { id: bowlingTeam.id, teamId: bowlingTeam.id, score: 0, wickets: 0, overs: 0, balls: [] };
    setCurrentInnings(newInnings);

    // Swap teams
    setBattingTeam(bowlingTeam);
    setBowlingTeam(battingTeam);

    // Reset players
    setStriker(null);
    setNonStriker(null);
    setBowler(null);
    
    // Reset over summaries for new innings
    setOverSummaries([]);
  };

  const handleStartNextInnings = () => {
    if (!completedFirstInningsData || !battingTeam || !bowlingTeam) return;
    
    // Save the completed first innings
    handleInningsEnd(completedFirstInningsData);
    
    // Clear the pending state
    setInningsCompletePending(false);
    setCompletedFirstInningsData(null);
  };

  const processBall = (ball: Omit<Ball, 'ballNumber'>) => {
    if (!currentInnings || !match) return;

    const newBall = { ...ball, ballNumber: currentInnings.balls.length + 1 };

    let newScore = currentInnings.score + newBall.runs;
    let newWickets = currentInnings.wickets;
    let tempStriker = striker;
    let tempNonStriker = nonStriker;
    let runsToAdd = newBall.runs;
    let batsmanRuns = newBall.runs; // Track only batsman runs for strike rotation

    // Add automatic +1 run for wide and no-ball
    if (newBall.isExtra && (newBall.extraType === 'wide' || newBall.extraType === 'no-ball')) {
      runsToAdd += 1;
      newScore = currentInnings.score + runsToAdd;
      // For no-ball, batsmanRuns stays as is (doesn't include the awarded run)
      // For wide, batsmanRuns is 0 (no runs from batsman action)
      if (newBall.extraType === 'wide') {
        batsmanRuns = 0;
      }
    } else {
      newScore = currentInnings.score + runsToAdd;
    }

    if (newBall.isWicket) {
      newWickets++;
      setStriker(null); // Force selection of new batsman
      tempStriker = null;
    }

    const newBalls = [...currentInnings.balls, newBall];
    const validBalls = newBalls.filter(b => !b.isExtra || (b.isExtra && b.extraType !== 'wide' && b.extraType !== 'no-ball'));
    const overs = Math.floor(validBalls.length / 6);
    const ballsInOver = validBalls.length % 6;

    const isFirstInnings = !firstInnings;
    const currentBattingTeam = isFirstInnings ? battingTeam : bowlingTeam;

    // Defensive check: ensure we have valid team data before checking innings end
    if (!currentBattingTeam || !Array.isArray(currentBattingTeam.players)) {
      console.warn('Invalid batting team data:', currentBattingTeam);
      updateInnings({ ...currentInnings, score: newScore, wickets: newWickets, balls: newBalls, overs });
      return;
    }

    const battingTeamPlayerIds = currentBattingTeam.players;
    const battingTeamPlayerCount = battingTeamPlayerIds.length;

    // Max wickets: if lastManBatting is true, allow all players; otherwise, last man can't bat alone
    const maxWickets = match.lastManBatting ? battingTeamPlayerCount : Math.max(1, battingTeamPlayerCount - 1);

    // Check for innings end (all wickets lost OR all overs completed)
    const oversCompleted = match.overs && match.overs > 0 && overs >= match.overs;
    const wicketsLost = newWickets >= maxWickets;
    // Innings ends when: (all wickets lost OR all overs completed) AND at least 1 ball has been bowled
    const inningsEnded = (wicketsLost || oversCompleted) && validBalls.length > 0;

    if (inningsEnded) {
      // Add summary for the last completed over if it exists
      if (ballsInOver === 0 && validBalls.length > 0) {
        const overStartIndex = (overs - 1) * 6;
        let legalBallCounter = 0;
        let overBallStartIndex = -1;
        let overBallEndIndex = -1;
        let foundStart = false;

        for (let i = 0; i < newBalls.length; i++) {
          const ball = newBalls[i];
          const isLegal = !ball.isExtra || (ball.isExtra && ball.extraType !== 'wide' && ball.extraType !== 'no-ball');
          
          // Mark when we've reached the over's starting point
          if (isLegal && legalBallCounter === overStartIndex && !foundStart) {
            foundStart = true;
            // Go back to capture any extras before this legal ball
            overBallStartIndex = i;
            for (let j = i - 1; j >= 0; j--) {
              const prevBall = newBalls[j];
              const prevIsLegal = !prevBall.isExtra || (prevBall.isExtra && prevBall.extraType !== 'wide' && prevBall.extraType !== 'no-ball');
              if (prevIsLegal) {
                break; // Stop when we hit a legal ball from the previous over
              }
              overBallStartIndex = j; // Include this extra
            }
          }
          
          if (isLegal) {
            if (legalBallCounter === overStartIndex + 6) {
              overBallEndIndex = i;
              break;
            }
            legalBallCounter++;
          }
        }

        const ballsInOverFromEnd = overBallStartIndex !== -1 ? newBalls.slice(overBallStartIndex, overBallEndIndex !== -1 ? overBallEndIndex : newBalls.length) : [];
        const runsInLastOver = ballsInOverFromEnd.reduce((sum, b) => sum + b.runs + (b.isExtra && (b.extraType === 'wide' || b.extraType === 'no-ball') ? 1 : 0), 0);

        setOverSummaries(prev => [...prev, {
          overNumber: overs,
          runsInOver: runsInLastOver,
          totalScore: newScore,
          nextStriker: striker || tempStriker,
          nextNonStriker: nonStriker || tempNonStriker,
          bowler: bowler,
          ballsInOver: ballsInOverFromEnd
        }]);
      }
      
      if (isFirstInnings) {
        // Save the completed first innings but don't automatically switch
        const completedFirstInnings = { ...currentInnings, score: newScore, wickets: newWickets, balls: newBalls, overs };
        updateInnings(completedFirstInnings);
        setCompletedFirstInningsData(completedFirstInnings);
        setInningsCompletePending(true);
        // Disable further scoring
        return;
      } else {
        // Only declare winner if we have valid first innings data
        if (firstInnings && firstInnings.score !== undefined) {
          const winner = newScore > firstInnings.score ? battingTeam : bowlingTeam;
          const margin = newScore > firstInnings.score
            ? `${maxWickets - newWickets} wickets`
            : `${firstInnings.score - newScore} runs`;
          setMatchWinner(winner);
          setWinMargin(margin);

          // Save both innings before marking match as completed
          if (matchId) {
            const batch = writeBatch(db);
            const firstInningsRef = doc(db, `matches/${matchId}/innings`, firstInnings.id);
            const secondInningsRef = doc(db, `matches/${matchId}/innings`, currentInnings.id);

            batch.set(firstInningsRef, { ...firstInnings, teamId: firstInnings.teamId || firstInnings.id });
            batch.set(secondInningsRef, { ...currentInnings, score: newScore, wickets: newWickets, balls: newBalls, overs, teamId: currentInnings.teamId || currentInnings.id });
            batch.update(doc(db, 'matches', matchId), { status: 'completed' });

            batch.commit().catch(err => console.error("Failed to save match completion: ", err));
          }
        }
        updateInnings({ ...currentInnings, score: newScore, wickets: newWickets, balls: newBalls, overs });
      }
      return;
    }

    // Check if target is chased in second innings (before all overs are completed)
    // Only end match if at least 1 over has been bowled in second innings
    if (!isFirstInnings && firstInnings && firstInnings.score !== undefined && newScore > firstInnings.score && validBalls.length >= 6) {
      const winner = battingTeam;
      const margin = `${maxWickets - newWickets} wickets`;
      setMatchWinner(winner);
      setWinMargin(margin);

      // Save both innings before marking match as completed
      if (matchId) {
        const batch = writeBatch(db);
        const firstInningsRef = doc(db, `matches/${matchId}/innings`, firstInnings.id);
        const secondInningsRef = doc(db, `matches/${matchId}/innings`, currentInnings.id);

        batch.set(firstInningsRef, { ...firstInnings, teamId: firstInnings.teamId || firstInnings.id });
        batch.set(secondInningsRef, { ...currentInnings, score: newScore, wickets: newWickets, balls: newBalls, overs, teamId: currentInnings.teamId || currentInnings.id });
        batch.update(doc(db, 'matches', matchId), { status: 'completed' });

        batch.commit().catch(err => console.error("Failed to save match completion: ", err));
      }

      updateInnings({ ...currentInnings, score: newScore, wickets: newWickets, balls: newBalls, overs });
      return;
    }

    // Handle strike rotation
    // For wide: no strike change
    // For no-ball: strike changes on odd batsman runs (not including the awarded +1)
    // For normal ball: strike changes on odd runs or at end of over
    const isWide = newBall.isExtra && newBall.extraType === 'wide';
    const isNoBall = newBall.isExtra && newBall.extraType === 'no-ball';
    const overJustCompletedForStrike = !isNoBall && ballsInOver === 0 && validBalls.length > 0;

    if (!isWide) {
      // Check if strike should change due to odd runs
      // For no-ball, use batsmanRuns (excludes the awarded +1 run)
      // For regular balls, use runsToAdd
      const runsForStrikeChange = isNoBall ? batsmanRuns : runsToAdd;
      const oddRunsScored = runsForStrikeChange % 2 !== 0;
      
      // Determine final striker and non-striker positions
      let finalStriker = tempStriker;
      let finalNonStriker = tempNonStriker;
      
      // Apply odd runs swap
      if (oddRunsScored) {
        finalStriker = tempNonStriker;
        finalNonStriker = tempStriker;
      }
      
      // Apply end-of-over swap
      if (overJustCompletedForStrike) {
        const temp = finalStriker;
        finalStriker = finalNonStriker;
        finalNonStriker = temp;
      }
      
      // Update striker and non-striker
      setStriker(finalStriker);
      setNonStriker(finalNonStriker);
      
      // Add over summary to persistent list if over just completed
      if (overJustCompletedForStrike) {
        const overStartIndex = (overs - 1) * 6;
        let legalBallCounter = 0;
        let overBallStartIndex = -1;
        let overBallEndIndex = -1;
        let foundStart = false;

        for (let i = 0; i < newBalls.length; i++) {
          const ball = newBalls[i];
          const isLegal = !ball.isExtra || (ball.isExtra && ball.extraType !== 'wide' && ball.extraType !== 'no-ball');
          
          // Mark when we've reached the over's starting point
          if (isLegal && legalBallCounter === overStartIndex && !foundStart) {
            foundStart = true;
            // Go back to capture any extras before this legal ball
            overBallStartIndex = i;
            for (let j = i - 1; j >= 0; j--) {
              const prevBall = newBalls[j];
              const prevIsLegal = !prevBall.isExtra || (prevBall.isExtra && prevBall.extraType !== 'wide' && prevBall.extraType !== 'no-ball');
              if (prevIsLegal) {
                break; // Stop when we hit a legal ball from the previous over
              }
              overBallStartIndex = j; // Include this extra
            }
          }
          
          if (isLegal) {
            if (legalBallCounter === overStartIndex + 6) {
              overBallEndIndex = i;
              break;
            }
            legalBallCounter++;
          }
        }

        const ballsInOver = overBallStartIndex !== -1 ? newBalls.slice(overBallStartIndex, overBallEndIndex !== -1 ? overBallEndIndex : newBalls.length) : [];
        const runsInThisOver = ballsInOver.reduce((sum, b) => sum + b.runs + (b.isExtra && (b.extraType === 'wide' || b.extraType === 'no-ball') ? 1 : 0), 0);

        setOverSummaries(prev => [...prev, {
          overNumber: overs,
          runsInOver: runsInThisOver,
          totalScore: newScore,
          nextStriker: finalStriker,
          nextNonStriker: finalNonStriker,
          bowler: bowler,
          ballsInOver: ballsInOver
        }]);
        
        // Mark over as pending completion instead of auto-completing
        setOverCompletePending(true);
      }
    }

    updateInnings({ ...currentInnings, score: newScore, wickets: newWickets, balls: newBalls, overs });
  };

  const handleScore = (runs: number) => {
    if (!striker || !bowler) return;
    processBall({ 
      bowlerId: bowler.id, 
      bowlerName: bowler.name,
      strikerId: striker.id, 
      strikerName: striker.name,
      runs, 
      isExtra: false, 
      isWicket: false,
      timestamp: new Date()
    });
  };

  const handleExtra = (extraType: 'wide' | 'no-ball') => {
    if (!striker || !bowler) return;

    if (extraType === 'wide') {
      // Wide ball: automatically adds 1 run, no strike change
      processBall({ 
        bowlerId: bowler.id, 
        bowlerName: bowler.name,
        strikerId: striker.id, 
        strikerName: striker.name,
        runs: 0, 
        isExtra: true, 
        extraType: 'wide', 
        isWicket: false,
        timestamp: new Date()
      });
    } else {
      // No-ball: show popup to select extra runs
      setNoBallRuns(0);
      setShowNoBallPopup(true);
    }
  };

  const handleNoBallSubmit = (extraRuns: number) => {
    if (!striker || !bowler) return;
    processBall({ 
      bowlerId: bowler.id, 
      bowlerName: bowler.name,
      strikerId: striker.id, 
      strikerName: striker.name,
      runs: extraRuns, 
      isExtra: true, 
      extraType: 'no-ball', 
      isWicket: false,
      timestamp: new Date()
    });
    setShowNoBallPopup(false);
    setNoBallRuns(0);
  };

  const handleWicket = () => {
    if (!striker || !bowler) return;
    setShowWicketModal(true);
  };

  const handleWicketConfirm = () => {
    if (!striker || !bowler || !wicketType) return;

    let wicketData: Ball;
    let dismissedEnd: 'striker' | 'non-striker';

    if (wicketType === 'bowled') {
      // Bowled - striker is out, bowler gets credit
      wicketData = {
        bowlerId: bowler.id,
        bowlerName: bowler.name,
        strikerId: striker.id,
        strikerName: striker.name,
        runs: 0,
        isExtra: false,
        isWicket: true,
        wicketType: 'bowled',
        timestamp: new Date(),
        ballNumber: 0
      };
      dismissedEnd = 'striker';
    } else if (wicketType === 'caught') {
      // Caught - striker is out, bowler and fielder get credit
      if (!selectedFielder) {
        addToast('Please select a fielder', 'warning');
        return;
      }
      wicketData = {
        bowlerId: bowler.id,
        bowlerName: bowler.name,
        strikerId: striker.id,
        strikerName: striker.name,
        runs: 0,
        isExtra: false,
        isWicket: true,
        wicketType: 'caught',
        fielderId: selectedFielder.id,
        fielderName: selectedFielder.name,
        timestamp: new Date(),
        ballNumber: 0
      };
      dismissedEnd = 'striker';
    } else if (wicketType === 'run-out') {
      // Run out - need to know which batsman and which end
      if (!selectedFielder || !runOutBatsman || !runOutEnd) {
        addToast('Please complete all run out details', 'warning');
        return;
      }
      
      const outBatsman = runOutBatsman === 'striker' ? striker : nonStriker;
      if (!outBatsman) return;

      wicketData = {
        bowlerId: bowler.id,
        bowlerName: bowler.name,
        strikerId: outBatsman.id,
        strikerName: outBatsman.name,
        runs: 0,
        isExtra: false,
        isWicket: true,
        wicketType: 'run-out',
        fielderId: selectedFielder.id,
        fielderName: selectedFielder.name,
        timestamp: new Date(),
        ballNumber: 0
      };
      dismissedEnd = runOutEnd;
    } else {
      return;
    }

    // Process the ball
    processBall(wicketData);

    // Show popup to select new batsman for the dismissed end
    if (dismissedEnd === 'striker') {
      setShowStrikerPopup(true);
    } else {
      setShowNonStrikerPopup(true);
    }

    // Reset wicket modal state
    setShowWicketModal(false);
    setWicketType(null);
    setSelectedFielder(null);
    setRunOutBatsman(null);
    setRunOutEnd(null);
  };

  const handleCompleteOver = () => {
    // Reset bowler and clear over completion pending state
    setBowler(null);
    setOverCompletePending(false);
  };

  if (matchWinner) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex justify-center items-center">
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-xl p-8 max-w-sm mx-4 space-y-6 text-center">
            <div className="text-5xl">🏆</div>
            <div>
              <h2 className="text-2xl font-bold mb-2">{matchWinner.name}</h2>
              <p className="text-neutral-400">Won by {winMargin}</p>
            </div>
            <button
              onClick={() => navigate(`/match/${matchId}`)}
              className="w-full px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
            >
              View Match Summary
            </button>
          </div>
        </div>
      </div>
    );
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
            onClick={() => navigate('/matches')}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg"
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  const validBalls = currentInnings.balls.filter(b => !b.isExtra || (b.extraType !== 'wide' && b.extraType !== 'no-ball'));
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
                onClick={() => navigate('/matches')}
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
          {/* Innings Complete Button */}
          {inningsCompletePending && (
            <div className="bg-gradient-to-r from-green-900/50 to-green-950/50 rounded-lg p-4 border-2 border-green-600 space-y-3">
              <div className="text-center">
                <div className="text-sm font-semibold text-green-300 mb-2">First Innings Completed</div>
                <div className="text-xs text-neutral-300">
                  {battingTeam?.name}: <span className="font-bold text-green-400">{currentInnings?.score}/{currentInnings?.wickets}</span> in {currentInnings?.overs} overs
                </div>
              </div>
              <button
                onClick={handleStartNextInnings}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-green-500/30"
              >
                Start Next Innings
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-neutral-700">
            <button
              onClick={() => setActiveTab('scoring')}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'scoring' 
                ? 'text-amber-400 border-b-2 border-amber-400' 
                : 'text-neutral-400 hover:text-neutral-300'}`}
            >
              Scoring
            </button>
            <button
              onClick={() => setActiveTab('commentary')}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'commentary' 
                ? 'text-blue-400 border-b-2 border-blue-400' 
                : 'text-neutral-400 hover:text-neutral-300'}`}
            >
              Commentary
            </button>
          </div>

          {/* Scoring Tab Content */}
          {activeTab === 'scoring' && (
            <>
          {/* Score Card */}
          <div className="bg-neutral-900 rounded-lg p-4 text-center space-y-1">
            <div className="text-xs text-neutral-400">{battingTeam.name} batting</div>
            <div className="text-4xl font-bold">{currentInnings.score}-{currentInnings.wickets}</div>
            <div className="text-xs text-neutral-500">{oversLabel} overs · RR {runRate}</div>
          </div>

          {/* Batsmen Info - Professional Card View */}
          <div className="flex gap-3">
            <div className="flex-1">
              <button
                onClick={() => setShowStrikerPopup(true)}
                disabled={matchWinner !== null || inningsCompletePending}
                className={`w-full bg-gradient-to-br from-amber-900/30 to-amber-950/50 rounded-xl p-4 border-2 transition-all transform hover:scale-105 ${striker ? 'border-amber-400 shadow-lg shadow-amber-500/20' : 'border-amber-700/50 hover:border-amber-600'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏏</span>
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Striker</span>
                  </div>
                  <div className="text-lg font-bold text-white">{striker?.name || 'Select Player'}</div>
                  {striker && (
                    <div className="flex gap-4 text-xs">
                      <div className="bg-amber-500/20 rounded px-2 py-1">
                        <span className="text-amber-300 font-semibold">{currentInnings.balls.filter(b => b.strikerId === striker.id).reduce((sum, b) => sum + b.runs, 0)}</span>
                        <span className="text-neutral-400"> runs</span>
                      </div>
                      <div className="bg-neutral-700/50 rounded px-2 py-1">
                        <span className="text-neutral-300">{currentInnings.balls.filter(b => b.strikerId === striker.id && b.extraType !== 'wide').length}</span>
                        <span className="text-neutral-500"> balls</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>
            <div className="flex-1">
              <button
                onClick={() => setShowNonStrikerPopup(true)}
                disabled={matchWinner !== null || inningsCompletePending}
                className={`w-full bg-gradient-to-br from-blue-900/30 to-blue-950/50 rounded-xl p-4 border-2 transition-all transform hover:scale-105 ${nonStriker ? 'border-blue-400 shadow-lg shadow-blue-500/20' : 'border-blue-700/50 hover:border-blue-600'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏃</span>
                    <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Non-Striker</span>
                  </div>
                  <div className="text-lg font-bold text-white">{nonStriker?.name || 'Select Player'}</div>
                  {nonStriker && (
                    <div className="flex gap-4 text-xs">
                      <div className="bg-blue-500/20 rounded px-2 py-1">
                        <span className="text-blue-300 font-semibold">{currentInnings.balls.filter(b => b.strikerId === nonStriker.id).reduce((sum, b) => sum + b.runs, 0)}</span>
                        <span className="text-neutral-400"> runs</span>
                      </div>
                      <div className="bg-neutral-700/50 rounded px-2 py-1">
                        <span className="text-neutral-300">{currentInnings.balls.filter(b => b.strikerId === nonStriker.id && b.extraType !== 'wide').length}</span>
                        <span className="text-neutral-500"> balls</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Bowler Info - Professional Card View */}
          <div>
            <button
              onClick={() => setShowBowlerPopup(true)}
              disabled={matchWinner !== null || inningsCompletePending}
              className={`w-full bg-gradient-to-br from-red-900/30 to-red-950/50 rounded-xl p-4 border-2 transition-all transform hover:scale-105 ${bowler ? 'border-red-400 shadow-lg shadow-red-500/20' : 'border-red-700/50 hover:border-red-600'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <span className="text-xs font-bold text-red-300 uppercase tracking-wider">Bowler</span>
                </div>
                <div className="text-lg font-bold text-white">{bowler?.name || 'Select Player'}</div>
                {bowler && (
                  <div className="flex gap-4 text-xs">
                    <div className="bg-red-500/20 rounded px-2 py-1">
                      <span className="text-red-300 font-semibold">{currentInnings.balls.filter(b => b.bowlerId === bowler.id).reduce((sum, b) => sum + b.runs, 0)}</span>
                      <span className="text-neutral-400"> runs</span>
                    </div>
                    <div className="bg-neutral-700/50 rounded px-2 py-1">
                      <span className="text-neutral-300">{currentInnings.balls.filter(b => b.bowlerId === bowler.id && !b.isExtra).length}</span>
                      <span className="text-neutral-500"> balls</span>
                    </div>
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Recent Over */}
          <div>
            <div className="text-xs text-neutral-400 uppercase mb-2">This over</div>
            <div className="flex gap-1.5 flex-wrap">
              {!overCompletePending && (() => {
                // Show current in-progress over (don't show when over is complete and pending confirmation)
                const currentOverStartLegalBall = Math.floor(validBalls.length / 6) * 6;

                // Find all balls that belong to the current over
                let legalBallCount = 0;
                const ballsInCurrentOver: typeof currentInnings.balls = [];

                for (const ball of currentInnings.balls) {
                  const isLegal = !ball.isExtra || (ball.extraType !== 'wide' && ball.extraType !== 'no-ball');
                  
                  // Add ball to current over if we're in the target over range
                  if (legalBallCount >= currentOverStartLegalBall && legalBallCount < currentOverStartLegalBall + 6) {
                    ballsInCurrentOver.push(ball);
                  }
                  
                  // Count legal balls after checking
                  if (isLegal) {
                    legalBallCount++;
                  }
                  
                  // Also add any extras that come after the 6th legal ball of the target over
                  if (legalBallCount === currentOverStartLegalBall + 6 && !isLegal) {
                    ballsInCurrentOver.push(ball);
                  }
                }

                return ballsInCurrentOver.map((ball, idx) => (
                  <div
                    key={idx}
                    className={`w-7 h-7 rounded flex items-center justify-center text-xs font-semibold ${ball.isExtra && ball.extraType === 'wide'
                        ? 'bg-blue-900 text-blue-300'
                        : ball.isExtra && ball.extraType === 'no-ball'
                          ? 'bg-orange-900 text-orange-300'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    title={ball.isExtra ? `${ball.extraType}` : ''}
                  >
                    {ball.isWicket ? 'W' : ball.isExtra && ball.extraType === 'wide' ? 'Wd' : ball.isExtra && ball.extraType === 'no-ball' ? 'Nb' : ball.runs}
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Scoring Controls */}
          <div>
            {inningsCompletePending ? (
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-center text-xs text-neutral-400">
                Innings Complete - Click "Start Next Innings" to continue
              </div>
            ) : overCompletePending ? (
              <button
                onClick={handleCompleteOver}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-green-500/30"
              >
                Complete This Over
              </button>
            ) : !striker || !bowler ? (
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-center text-xs text-neutral-400">
                Select Striker and Bowler to start scoring
              </div>
            ) : (
              <ScoringControls
                onScore={handleScore}
                onExtra={handleExtra}
                onWicket={handleWicket}
                isEnabled={!!striker && !!bowler && !inningsCompletePending && !overCompletePending}
              />
            )}
          </div>

          {/* Over Summaries */}
          {overSummaries.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-neutral-400 uppercase mb-2">Over Summaries</div>
              {[...overSummaries].reverse().map((summary) => {
                const batsmanStats = new Map<string, { runs: number; balls: number; name: string }>();
                summary.ballsInOver.forEach(ball => {
                  if (!batsmanStats.has(ball.strikerId)) {
                    const player = players.find(p => p.id === ball.strikerId);
                    batsmanStats.set(ball.strikerId, { runs: 0, balls: 0, name: player?.name || 'Unknown' });
                  }
                  const stats = batsmanStats.get(ball.strikerId)!;
                  stats.runs += ball.runs;
                  if (!ball.isExtra || (ball.isExtra && ball.extraType !== 'wide' && ball.extraType !== 'no-ball')) {
                    stats.balls += 1;
                  }
                });

                const wides = summary.ballsInOver.filter(b => b.isExtra && b.extraType === 'wide').length;
                const noBalls = summary.ballsInOver.filter(b => b.isExtra && b.extraType === 'no-ball').length;
                const runsFromExtras = summary.ballsInOver
                  .filter(b => b.isExtra)
                  .reduce((sum, b) => sum + b.runs + (b.extraType === 'wide' || b.extraType === 'no-ball' ? 1 : 0), 0);
                const runsFromBat = summary.runsInOver - runsFromExtras;

                return (
                  <div key={`summary-${summary.overNumber}`} className="bg-neutral-900/60 rounded-lg p-3 border border-neutral-700/50">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-blue-300">Over {summary.overNumber} Summary</div>
                        <div className="text-xs text-green-400 font-bold">{summary.runsInOver} runs ({runsFromBat} bat, {runsFromExtras} extra)</div>
                      </div>

                      <div className="space-y-1.5">
                        {Array.from(batsmanStats.values()).map((stat, idx) => (
                          <div key={idx} className="text-xs text-neutral-300">
                            <span className="text-amber-300 font-semibold">{stat.name}</span> scored <span className="text-green-400 font-semibold">{stat.runs} runs</span> and faced <span className="text-blue-400 font-semibold">{stat.balls} balls</span>
                          </div>
                        ))}
                      </div>

                      {(wides > 0 || noBalls > 0) && (
                        <div className="text-xs text-neutral-400 border-t border-neutral-700/50 pt-2">
                          <span className="text-neutral-300">Extras in this over: </span>
                          {wides > 0 && <span className="text-orange-400">{wides} wide{wides > 1 ? 's' : ''}</span>}
                          {wides > 0 && noBalls > 0 && <span className="text-neutral-500">, </span>}
                          {noBalls > 0 && <span className="text-red-400">{noBalls} no-ball{noBalls > 1 ? 's' : ''}</span>}
                        </div>
                      )}

                      <div className="text-xs text-neutral-500 border-t border-neutral-700/50 pt-2">
                        <span className="text-neutral-400">{summary.nextStriker?.name || 'Unknown'}</span> will take the next strike
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
            </>
          )}

          {/* Commentary Tab Content */}
          {activeTab === 'commentary' && (
            <div>
              <div className="space-y-2">
                {currentInnings.balls.length === 0 ? (
                  <div className="text-sm text-neutral-500">No balls bowled yet</div>
                ) : (
                  (() => {
                    // Display balls in reverse order (newest at top)
                    const displayBalls = [...currentInnings.balls].reverse();
                    
                    // Limit to 50 items for display in commentary tab
                    return displayBalls.slice(0, 50).map((ball, idx) => {
                      // Calculate the actual ball index in the original array
                      const actualIdx = currentInnings.balls.length - 1 - idx;
                      
                      const validBallsUpToThisBall = currentInnings.balls
                        .slice(0, actualIdx + 1)
                        .filter(b => !b.isExtra || (b.isExtra && b.extraType !== 'wide' && b.extraType !== 'no-ball'));
                      const overNumber = Math.floor((validBallsUpToThisBall.length - 1) / 6);
                      const ballInOver = ((validBallsUpToThisBall.length - 1) % 6) + 1;

                      const playersMap = new Map<string, string>();
                      players.forEach(p => playersMap.set(p.id, p.name));

                      return (
                        <BallCommentary
                          key={`ball-${actualIdx}`}
                          ball={ball}
                          overNumber={overNumber}
                          ballInOver={ballInOver}
                          playersMap={playersMap}
                        />
                      );
                    });
                  })()
                )}
              </div>
            </div>
          )}
        </div>

        {/* Wicket Modal */}
        {showWicketModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-2xl p-6 max-w-md w-full mx-4 space-y-4 border-2 border-red-600 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="text-4xl">🎯</div>
                <div>
                  <h3 className="text-xl font-bold text-red-400">Wicket!</h3>
                  <p className="text-sm text-neutral-400">Select wicket type</p>
                </div>
              </div>

              {/* Wicket Type Selection */}
              <div className="space-y-2">
                <button
                  onClick={() => setWicketType('bowled')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all border-2 ${
                    wicketType === 'bowled'
                      ? 'bg-red-600 text-white border-red-400'
                      : 'bg-neutral-800 text-white hover:bg-neutral-700 border-neutral-700'
                  }`}
                >
                  <div className="font-semibold">Bowled</div>
                  <div className="text-xs text-neutral-400">Credit to bowler</div>
                </button>

                <button
                  onClick={() => setWicketType('caught')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all border-2 ${
                    wicketType === 'caught'
                      ? 'bg-red-600 text-white border-red-400'
                      : 'bg-neutral-800 text-white hover:bg-neutral-700 border-neutral-700'
                  }`}
                >
                  <div className="font-semibold">Caught</div>
                  <div className="text-xs text-neutral-400">Select fielder below</div>
                </button>

                <button
                  onClick={() => setWicketType('run-out')}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all border-2 ${
                    wicketType === 'run-out'
                      ? 'bg-red-600 text-white border-red-400'
                      : 'bg-neutral-800 text-white hover:bg-neutral-700 border-neutral-700'
                  }`}
                >
                  <div className="font-semibold">Run Out</div>
                  <div className="text-xs text-neutral-400">Select batsman and fielder</div>
                </button>
              </div>

              {/* Fielder Selection for Caught */}
              {wicketType === 'caught' && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-neutral-300">Select Fielder</div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {players.filter(p => bowlingTeam?.players.includes(p.id) && p.id !== bowler?.id).map(player => (
                      <button
                        key={player.id}
                        onClick={() => setSelectedFielder(player)}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                          selectedFielder?.id === player.id
                            ? 'bg-amber-600 text-white'
                            : 'bg-neutral-800 text-white hover:bg-neutral-700'
                        }`}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Run Out Details */}
              {wicketType === 'run-out' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-neutral-300">Which batsman is out?</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setRunOutBatsman('striker')}
                        className={`px-3 py-2 rounded text-sm transition-all ${
                          runOutBatsman === 'striker'
                            ? 'bg-amber-600 text-white'
                            : 'bg-neutral-800 text-white hover:bg-neutral-700'
                        }`}
                      >
                        {striker?.name || 'Striker'}
                      </button>
                      <button
                        onClick={() => setRunOutBatsman('non-striker')}
                        className={`px-3 py-2 rounded text-sm transition-all ${
                          runOutBatsman === 'non-striker'
                            ? 'bg-amber-600 text-white'
                            : 'bg-neutral-800 text-white hover:bg-neutral-700'
                        }`}
                      >
                        {nonStriker?.name || 'Non-Striker'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-neutral-300">Run out at which end?</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setRunOutEnd('striker')}
                        className={`px-3 py-2 rounded text-sm transition-all ${
                          runOutEnd === 'striker'
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-800 text-white hover:bg-neutral-700'
                        }`}
                      >
                        Striker End
                      </button>
                      <button
                        onClick={() => setRunOutEnd('non-striker')}
                        className={`px-3 py-2 rounded text-sm transition-all ${
                          runOutEnd === 'non-striker'
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-800 text-white hover:bg-neutral-700'
                        }`}
                      >
                        Bowler End
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-neutral-300">Select Fielder</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {players.filter(p => bowlingTeam?.players.includes(p.id)).map(player => (
                        <button
                          key={player.id}
                          onClick={() => setSelectedFielder(player)}
                          className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${
                            selectedFielder?.id === player.id
                              ? 'bg-amber-600 text-white'
                              : 'bg-neutral-800 text-white hover:bg-neutral-700'
                          }`}
                        >
                          {player.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowWicketModal(false);
                    setWicketType(null);
                    setSelectedFielder(null);
                    setRunOutBatsman(null);
                    setRunOutEnd(null);
                  }}
                  className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWicketConfirm}
                  disabled={!wicketType || (wicketType === 'caught' && !selectedFielder) || (wicketType === 'run-out' && (!selectedFielder || !runOutBatsman || !runOutEnd))}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  Confirm Wicket
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Striker Selection Popup */}
        {showStrikerPopup && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-amber-950 to-neutral-900 rounded-2xl p-6 w-100 mx-4 space-y-4 border-2 border-amber-600 shadow-2xl shadow-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="text-5xl">🏏</div>
                <div>
                  <h3 className="text-2xl font-bold text-amber-300">{battingTeam.name}</h3>
                  <p className="text-sm text-amber-200 font-semibold uppercase tracking-wider">Select Striker</p>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-amber-500 to-transparent rounded-full"></div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {players.filter(p => battingTeam.players.includes(p.id) && (battingTeam.players.length === 1 || p.id !== nonStriker?.id)).map(player => (
                  <button
                    key={player.id}
                    onClick={() => {
                      setStriker(player);
                      setShowStrikerPopup(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all transform hover:scale-105 border-2 ${striker?.id === player.id
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold border-amber-300 shadow-lg shadow-amber-500/50'
                        : 'bg-neutral-800 text-white hover:bg-neutral-700 border-neutral-700 hover:border-amber-500'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{player.name}</span>
                      {striker?.id === player.id && <span className="text-lg">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowStrikerPopup(false)}
                className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors border border-neutral-700"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Non-Striker Selection Popup */}
        {showNonStrikerPopup && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-blue-950 to-neutral-900 rounded-2xl p-6 w-100 mx-4 space-y-4 border-2 border-blue-600 shadow-2xl shadow-blue-500/30">
              <div className="flex items-center gap-3">
                <div className="text-5xl">🏏</div>
                <div>
                  <h3 className="text-2xl font-bold text-blue-300">{battingTeam.name}</h3>
                  <p className="text-sm text-blue-200 font-semibold uppercase tracking-wider">Select Non-Striker</p>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-blue-500 to-transparent rounded-full"></div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {players.filter(p => battingTeam.players.includes(p.id) && (battingTeam.players.length === 1 || p.id !== striker?.id)).map(player => (
                  <button
                    key={player.id}
                    onClick={() => {
                      setNonStriker(player);
                      setShowNonStrikerPopup(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all transform hover:scale-105 border-2 ${nonStriker?.id === player.id
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold border-blue-300 shadow-lg shadow-blue-500/50'
                        : 'bg-neutral-800 text-white hover:bg-neutral-700 border-neutral-700 hover:border-blue-500'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{player.name}</span>
                      {nonStriker?.id === player.id && <span className="text-lg">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowNonStrikerPopup(false)}
                className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors border border-neutral-700"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Bowler Selection Popup */}
        {showBowlerPopup && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gradient-to-b from-red-950 to-neutral-900 rounded-2xl p-6 w-100 mx-4 space-y-4 border-2 border-red-600 shadow-2xl shadow-red-500/30">
              <div className="flex items-center gap-3">
                <div className="text-5xl">🎯</div>
                <div>
                  <h3 className="text-2xl font-bold text-red-300">{bowlingTeam.name}</h3>
                  <p className="text-sm text-red-200 font-semibold uppercase tracking-wider">Select Bowler</p>
                </div>
              </div>
              <div className="h-1 bg-gradient-to-r from-red-500 to-transparent rounded-full"></div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {players.filter(p => bowlingTeam.players.includes(p.id)).map(player => (
                  <button
                    key={player.id}
                    onClick={() => {
                      setBowler(player);
                      setShowBowlerPopup(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all transform hover:scale-105 border-2 ${bowler?.id === player.id
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white font-bold border-red-300 shadow-lg shadow-red-500/50'
                        : 'bg-neutral-800 text-white hover:bg-neutral-700 border-neutral-700 hover:border-red-500'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{player.name}</span>
                      {bowler?.id === player.id && <span className="text-lg">✓</span>}
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowBowlerPopup(false)}
                className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors border border-neutral-700"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* No-Ball Popup */}
        {showNoBallPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-neutral-900 rounded-lg p-6 max-w-sm mx-4 space-y-4">
              <h3 className="text-lg font-semibold text-white">No-Ball Extra Runs</h3>
              <p className="text-sm text-neutral-400">Select the runs scored on this no-ball (1 + batsman runs)</p>

              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map(runs => (
                  <button
                    key={runs}
                    onClick={() => setNoBallRuns(runs)}
                    className={`py-2 rounded font-semibold transition-colors ${noBallRuns === runs
                        ? 'bg-amber-500 text-black'
                        : 'bg-neutral-800 text-white hover:bg-neutral-700'
                      }`}
                  >
                    {runs}
                  </button>
                ))}
              </div>

              <div className="text-sm text-neutral-300 bg-neutral-800 rounded p-3">
                Total runs: <span className="font-semibold text-amber-400">{noBallRuns + 1}</span> (1 + {noBallRuns})
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowNoBallPopup(false);
                    setNoBallRuns(0);
                  }}
                  className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleNoBallSubmit(noBallRuns)}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoringPage;
