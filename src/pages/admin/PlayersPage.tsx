import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import type { Player } from '@/types';

const PlayersPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper'>('batsman');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [isUpdatingPlayer, setIsUpdatingPlayer] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchPlayersWithTimeout = async () => {
      setLoading(true);
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const playersCollection = collection(db, 'players');
        const fetchPromise = getDocs(playersCollection);

        const playersSnapshot = await Promise.race([fetchPromise, timeoutPromise]) as any;
        
        if (isMounted) {
          const playersList = playersSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Player));
          setPlayers(playersList.sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (error) {
        console.error("Error fetching players:", error);
        if (isMounted) {
          addToast('Failed to load players. Please check your Firebase configuration.', 'error');
          setPlayers([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPlayersWithTimeout();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddPlayer = async () => {
    if (newPlayerName.trim() === '') {
      addToast('Player name is required', 'warning');
      return;
    }

    setIsAddingPlayer(true);
    const newPlayerData = {
      name: newPlayerName.trim(),
      role: newPlayerRole,
      active: true,
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, 'players'), newPlayerData);
      const newPlayerForState: Player = {
        id: docRef.id,
        name: newPlayerName.trim(),
        role: newPlayerRole,
        active: true,
        createdAt: new Date(),
      };
      setPlayers([...players, newPlayerForState].sort((a, b) => a.name.localeCompare(b.name)));
      setNewPlayerName('');
      setNewPlayerRole('batsman');
      addToast(`${newPlayerName} added successfully!`, 'success');
    } catch (error) {
      console.error("Error adding player:", error);
      addToast('Failed to add player', 'error');
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer || editingPlayer.name.trim() === '') {
      addToast('Player name is required', 'warning');
      return;
    }

    setIsUpdatingPlayer(true);
    try {
      const playerRef = doc(db, 'players', editingPlayer.id);
      await updateDoc(playerRef, { 
        name: editingPlayer.name.trim(),
        role: editingPlayer.role,
      });
      setPlayers(players.map(p => p.id === editingPlayer.id ? editingPlayer : p).sort((a, b) => a.name.localeCompare(b.name)));
      setEditingPlayer(null);
      setIsModalOpen(false);
      addToast('Player updated successfully!', 'success');
    } catch (error) {
      console.error("Error updating player:", error);
      addToast('Failed to update player', 'error');
    } finally {
      setIsUpdatingPlayer(false);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this player?')) return;

    setIsDeletingId(id);
    try {
      await deleteDoc(doc(db, 'players', id));
      const deletedPlayer = players.find(p => p.id === id);
      setPlayers(players.filter(p => p.id !== id));
      addToast(`${deletedPlayer?.name} deleted successfully!`, 'success');
    } catch (error) {
      console.error("Error deleting player:", error);
      addToast('Failed to delete player', 'error');
    } finally {
      setIsDeletingId(null);
    }
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

  const getPlayerInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col relative bg-neutral-950">
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-4 bg-neutral-950/88 backdrop-blur-lg border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <a href="/" className="w-7 h-7 flex items-center justify-center text-white">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 18l-6-6 6-6"></path>
              </svg>
            </a>
            <div className="text-base font-semibold">Players</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-40 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-neutral-500">Loading players...</div>
            </div>
          ) : players.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-2xl mb-2">🏏</div>
              <div className="text-neutral-500 text-center">No players yet. Add your first player below!</div>
            </div>
          ) : (
            players.map((player, index) => (
              <div
                key={player.id}
                className="bg-neutral-900 rounded-lg p-4 animate-in fade-in"
                style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center font-semibold text-sm border border-neutral-700">
                    {getPlayerInitials(player.name)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{player.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getRoleColor(player.role)}`}>
                        {player.role.charAt(0).toUpperCase() + player.role.slice(1)}
                      </span>
                      {player.active && (
                        <span className="text-xs text-green-400">Active</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingPlayer({ ...player });
                      setIsModalOpen(true);
                    }}
                    className="flex-1 px-3 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePlayer(player.id)}
                    disabled={isDeletingId === player.id}
                    className="flex-1 px-3 py-2 text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors disabled:opacity-50"
                  >
                    {isDeletingId === player.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Player Form */}
        <div className="fixed bottom-16 left-0 right-0 flex max-w-md mx-auto px-4 py-4 bg-neutral-950/95 backdrop-blur-lg border-t border-neutral-800 z-30">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
            >
              + Add Player
            </button>
          ) : (
            <div className="w-full space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Player name"
                  className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={newPlayerRole}
                  onChange={(e) => setNewPlayerRole(e.target.value as any)}
                  className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="batsman">Batsman</option>
                  <option value="bowler">Bowler</option>
                  <option value="all-rounder">All-rounder</option>
                  <option value="wicket-keeper">Wicket-keeper</option>
                </select>
                <button
                  onClick={handleAddPlayer}
                  disabled={isAddingPlayer}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded transition-colors disabled:opacity-50"
                >
                  {isAddingPlayer ? '...' : 'Add'}
                </button>
              </div>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewPlayerName('');
                  setNewPlayerRole('batsman');
                }}
                className="w-full px-3 py-2 text-xs text-neutral-400 hover:text-neutral-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {isModalOpen && editingPlayer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 rounded-lg max-w-sm w-full p-6 space-y-4">
              <div className="text-lg font-semibold">Edit Player</div>
              <input
                type="text"
                value={editingPlayer.name}
                onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                placeholder="Player name"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <select
                value={editingPlayer.role}
                onChange={(e) => setEditingPlayer({ ...editingPlayer, role: e.target.value as any })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white focus:outline-none focus:border-amber-500"
              >
                <option value="batsman">Batsman</option>
                <option value="bowler">Bowler</option>
                <option value="all-rounder">All-rounder</option>
                <option value="wicket-keeper">Wicket-keeper</option>
              </select>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPlayer(null);
                  }}
                  className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePlayer}
                  disabled={isUpdatingPlayer}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded font-semibold transition-colors disabled:opacity-50"
                >
                  {isUpdatingPlayer ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 flex max-w-md mx-auto px-2 py-2 bg-neutral-950/90 backdrop-blur-lg border-t border-neutral-800 z-20">
          {[
            { key: 'home', label: 'Home', icon: 'home' },
            { key: 'players', label: 'Players', icon: 'players' },
            { key: 'matches', label: 'Matches', icon: 'matches' },
            { key: 'stats', label: 'Stats', icon: 'stats' },
          ].map(tab => (
            <div
              key={tab.key}
              onClick={() => {
                if (tab.key === 'home') {
                  navigate('/');
                } else if (tab.key === 'matches') {
                  navigate('/admin/matches');
                } else if (tab.key === 'stats') {
                  // Coming soon
                }
              }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 cursor-pointer transition-transform active:scale-94 ${
                tab.key === 'players'
                  ? 'text-amber-400'
                  : 'text-neutral-600'
              }`}
            >
              <div className="w-5 h-5">
                {tab.icon === 'home' && (
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 11l8-7 8 7"></path>
                    <path d="M6 10v10h12V10"></path>
                  </svg>
                )}
                {tab.icon === 'players' && (
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <circle cx="9" cy="8" r="3.2"></circle>
                    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"></path>
                    <circle cx="17.5" cy="9" r="2.6"></circle>
                    <path d="M15.5 14.2c2.8.4 4.9 2.4 5 5.8"></path>
                  </svg>
                )}
                {tab.icon === 'matches' && (
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <rect x="3" y="4.5" width="18" height="16" rx="2.2"></rect>
                    <path d="M3 9.5h18M8 3v3M16 3v3"></path>
                  </svg>
                )}
                {tab.icon === 'stats' && (
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 20V10M12 20V4M20 20v-7"></path>
                  </svg>
                )}
              </div>
              <div className="text-xs font-semibold">{tab.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlayersPage;
