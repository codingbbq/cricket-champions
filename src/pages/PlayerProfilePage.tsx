import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { Player, Match, Ball } from '@/types';

interface PlayerStats {
  matches: number;
  runs: number;
  average: string;
  highScore: number;
  fours: number;
  sixes: number;
  wickets: number;
  economy: string;
  bestFigures: string;
  catches: number;
  runOuts: number;
  stumpings: number;
  formRuns: number[];
  recentMatches: Array<{
    opponent: string;
    date: string;
    line: string;
  }>;
}

const PlayerProfilePage = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const { addToast } = useToast();
  
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerId) return;
      
      setLoading(true);
      try {
        // Fetch player data
        const playerDoc = await getDoc(doc(db, 'players', playerId));
        if (!playerDoc.exists()) {
          addToast('Player not found', 'error');
          navigate('/players');
          return;
        }
        
        const playerData = { id: playerDoc.id, ...playerDoc.data() } as Player;
        setPlayer(playerData);
        
        // Fetch player statistics from matches
        const matchesQuery = query(collection(db, 'matches'), where('status', '==', 'completed'));
        const matchesSnap = await getDocs(matchesQuery);
        
        let totalRuns = 0;
        let totalBalls = 0;
        let highScore = 0;
        let fours = 0;
        let sixes = 0;
        let wickets = 0;
        let totalRunsConceded = 0;
        let totalBallsBowled = 0;
        let bestWickets = 0;
        let bestRuns = 999;
        let catches = 0;
        let runOuts = 0;
        const formRuns: number[] = [];
        const recentMatches: Array<{ opponent: string; date: string; line: string; timestamp: any }> = [];
        
        matchesSnap.docs.forEach((matchDoc) => {
          const matchData = matchDoc.data() as Match;
          
          // Get innings data
          const inningsQuery = collection(db, `matches/${matchDoc.id}/innings`);
          getDocs(inningsQuery).then((inningsSnap) => {
            inningsSnap.docs.forEach((inningsDoc) => {
              const inningsData = inningsDoc.data();
              const balls = inningsData.balls || [];
              
              let matchRuns = 0;
              let matchBalls = 0;
              let matchWickets = 0;
              let matchRunsConceded = 0;
              let matchBallsBowled = 0;
              
              balls.forEach((ball: Ball) => {
                // Batting stats
                if (ball.strikerId === playerId) {
                  if (!ball.isExtra || ball.extraType !== 'wide') {
                    matchBalls++;
                    totalBalls++;
                  }
                  matchRuns += ball.runs;
                  totalRuns += ball.runs;
                  
                  if (ball.runs === 4) fours++;
                  if (ball.runs === 6) sixes++;
                }
                
                // Bowling stats
                if (ball.bowlerId === playerId) {
                  if (!ball.isExtra || ball.extraType !== 'wide') {
                    matchBallsBowled++;
                    totalBallsBowled++;
                  }
                  matchRunsConceded += ball.runs;
                  if (ball.isExtra && (ball.extraType === 'wide' || ball.extraType === 'no-ball')) {
                    matchRunsConceded += 1;
                  }
                  totalRunsConceded += matchRunsConceded;
                  
                  if (ball.isWicket) {
                    matchWickets++;
                    wickets++;
                  }
                }
                
                // Fielding stats
                if (ball.fielderId === playerId) {
                  if (ball.wicketType === 'caught') catches++;
                  if (ball.wicketType === 'run-out') runOuts++;
                }
              });
              
              if (matchRuns > highScore) highScore = matchRuns;
              if (matchWickets > bestWickets || (matchWickets === bestWickets && matchRunsConceded < bestRuns)) {
                bestWickets = matchWickets;
                bestRuns = matchRunsConceded;
              }
              
              // Track form (last 5 matches)
              if (matchRuns > 0 || matchBalls > 0) {
                formRuns.push(matchRuns);
              }
              
              // Track recent matches
              const opponentTeam = inningsData.teamId === matchData.teamA ? matchData.teams?.teamB?.name : matchData.teams?.teamA?.name;
              const matchLine = matchWickets > 0 ? `${matchWickets}/${matchRunsConceded}` : `${matchRuns}(${matchBalls})`;
              
              recentMatches.push({
                opponent: opponentTeam || 'Unknown',
                date: matchData.date?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'Unknown',
                line: matchLine,
                timestamp: matchData.date
              });
            });
          });
        });
        
        // Calculate stats
        const matchesPlayed = matchesSnap.size;
        const average = totalBalls > 0 ? (totalRuns / (totalBalls / 6)).toFixed(1) : '0.0';
        const economy = totalBallsBowled > 0 ? ((totalRunsConceded / totalBallsBowled) * 6).toFixed(2) : '0.00';
        const bestFigures = bestWickets > 0 ? `${bestWickets}/${bestRuns}` : '0/0';
        
        // Sort and limit
        const sortedForm = formRuns.slice(-5);
        const sortedRecent = recentMatches.sort((a, b) => b.timestamp - a.timestamp).slice(0, 4);
        
        setStats({
          matches: matchesPlayed,
          runs: totalRuns,
          average,
          highScore,
          fours,
          sixes,
          wickets,
          economy,
          bestFigures,
          catches,
          runOuts,
          stumpings: 0,
          formRuns: sortedForm,
          recentMatches: sortedRecent
        });
        
      } catch (error) {
        console.error('Error fetching player data:', error);
        addToast('Failed to load player data', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlayerData();
  }, [playerId, navigate, addToast]);

  const handlePasswordChange = async () => {
    if (!currentUser || !player) return;
    
    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }
    
    if (newPassword.length < 6) {
      addToast('Password must be at least 6 characters', 'error');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, newPassword);
      
      addToast('Password updated successfully!', 'success');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        addToast('Current password is incorrect', 'error');
      } else {
        addToast('Failed to update password', 'error');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getPlayerInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      batsman: 'bg-blue-500/20 text-blue-400',
      bowler: 'bg-red-500/20 text-red-400',
      'all-rounder': 'bg-purple-500/20 text-purple-400',
      'wicket-keeper': 'bg-green-500/20 text-green-400',
    };
    return colors[role] || 'bg-gray-500/20 text-gray-400';
  };

  const isOwnProfile = player?.uid === currentUser?.uid;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-neutral-400">Loading player profile...</div>
      </div>
    );
  }

  if (!player || !stats) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-neutral-400">Player not found</div>
      </div>
    );
  }

  const maxFormRun = Math.max(...stats.formRuns, 1);

  return (
    <div className="w-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 py-4 bg-neutral-950/88 backdrop-blur-lg border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-7 h-7 flex items-center justify-center text-white">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 18l-6-6 6-6"></path>
            </svg>
          </button>
          <div className="text-base font-semibold">Player Profile</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-8">
        {/* Player Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center font-semibold text-xl border border-neutral-700">
            {getPlayerInitials(player.name)}
          </div>
          <div className="flex-1">
            <div className="text-xl font-semibold">{player.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getRoleColor(player.role)}`}>
                {player.role.charAt(0).toUpperCase() + player.role.slice(1)}
              </span>
              <span className="text-xs text-neutral-500">{stats.matches} matches</span>
            </div>
          </div>
          {isOwnProfile && (
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-3 py-2 text-xs font-semibold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded transition-colors"
            >
              Change Password
            </button>
          )}
        </div>

        {/* Batting Stats */}
        <div>
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Batting</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.runs}</div>
              <div className="text-xs text-neutral-500">Runs</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.average}</div>
              <div className="text-xs text-neutral-500">Average</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.fours}</div>
              <div className="text-xs text-neutral-500">Fours</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.sixes}</div>
              <div className="text-xs text-neutral-500">Sixes</div>
            </div>
          </div>
        </div>

        {/* Fielding & Bowling Stats */}
        <div>
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Fielding & Bowling</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.wickets}</div>
              <div className="text-xs text-neutral-500">Wickets</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.economy}</div>
              <div className="text-xs text-neutral-500">Economy</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.catches}</div>
              <div className="text-xs text-neutral-500">Catches</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3">
              <div className="text-2xl font-bold">{stats.runOuts} / {stats.stumpings}</div>
              <div className="text-xs text-neutral-500">Run-outs / Stumpings</div>
            </div>
          </div>
        </div>

        {/* Form Chart */}
        {stats.formRuns.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Runs, last 5 matches</div>
            <div className="flex items-end gap-2 h-24 px-1">
              {stats.formRuns.map((runs, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div className="text-xs text-neutral-500">{runs}</div>
                  <div 
                    className="w-full max-w-7 bg-amber-500 rounded-t"
                    style={{ height: `${Math.max(10, (runs / maxFormRun) * 100)}%` }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Matches */}
        {stats.recentMatches.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Recent Matches</div>
            <div className="space-y-2">
              {stats.recentMatches.map((match, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-neutral-900 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">vs {match.opponent}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{match.date}</div>
                  </div>
                  <div className="text-sm font-semibold text-amber-400">{match.line}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-lg max-w-sm w-full p-6 space-y-4">
            <div className="text-lg font-semibold">Change Password</div>
            
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
            
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
            
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
            
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={isChangingPassword}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded font-semibold transition-colors disabled:opacity-50"
              >
                {isChangingPassword ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerProfilePage;
