import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Player } from '@/types';

const PlayersPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { userProfile, currentUser } = useAuth();
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
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [newPlayerPassword, setNewPlayerPassword] = useState('cricket123');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<{ id: string; name: string } | null>(null);

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
  }, [addToast]);

  const handleAddPlayer = async () => {
    if (newPlayerName.trim() === '') {
      addToast('Player name is required', 'warning');
      return;
    }

    if (!isSuperAdmin) {
      addToast('Only super-admins can add players', 'error');
      return;
    }

    if (!newPlayerEmail.trim() || !newPlayerPassword.trim()) {
      addToast('Email and password are required', 'warning');
      return;
    }

    setIsAddingPlayer(true);
    try {
      // Create the player document
      const newPlayerData = {
        name: newPlayerName.trim(),
        role: newPlayerRole,
        email: newPlayerEmail.trim(),
        active: true,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'players'), newPlayerData);

      // Update local state
      const newPlayerForState: Player = {
        id: docRef.id,
        name: newPlayerName.trim(),
        role: newPlayerRole,
        email: newPlayerEmail.trim(),
        active: true,
        createdAt: new Date(),
      };

      setPlayers([...players, newPlayerForState].sort((a, b) => a.name.localeCompare(b.name)));

      // Call backend to create Firebase Auth account
      try {
        const token = await currentUser?.getIdToken();
        const response = await fetch('http://localhost:3001/api/create-player-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: newPlayerEmail.trim(),
            password: newPlayerPassword,
            playerId: docRef.id,
            playerName: newPlayerName.trim(),
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Update local state with UID
          setPlayers(players.map(p =>
            p.id === docRef.id ? { ...p, uid: result.uid } : p
          ).concat(newPlayerForState).sort((a, b) => a.name.localeCompare(b.name)));

          addToast(`${newPlayerName.trim()} added! Account created successfully.`, 'success');
        } else {
          addToast(result.error || 'Account created but authentication setup failed. Check backend logs.', 'warning');
        }
      } catch (error) {
        console.error('Backend error:', error);
        addToast('Player added but account creation failed. Make sure backend server is running.', 'warning');
      }

      setNewPlayerName('');
      setNewPlayerEmail('');
      setNewPlayerPassword('password');
      setNewPlayerRole('batsman');
      setShowAddForm(false);
    } catch (error: any) {
      console.error("Error adding player:", error);
      addToast(error.message || 'Failed to add player', 'error');
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

  const handleDeleteClick = (id: string, name: string) => {
    setPlayerToDelete({ id, name });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!playerToDelete) return;

    setIsDeletingId(playerToDelete.id);
    setShowDeleteModal(false);

    try {
      await deleteDoc(doc(db, 'players', playerToDelete.id));
      setPlayers(players.filter(p => p.id !== playerToDelete.id));
      addToast(`${playerToDelete.name} deleted successfully!`, 'success');
    } catch (error) {
      console.error("Error deleting player:", error);
      addToast('Failed to delete player', 'error');
    } finally {
      setIsDeletingId(null);
      setPlayerToDelete(null);
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

  const getStatistics = () => {
    return {
      total: players.length,
      batsman: players.filter(p => p.role === 'batsman').length,
      bowler: players.filter(p => p.role === 'bowler').length,
      allRounder: players.filter(p => p.role === 'all-rounder').length,
      wicketKeeper: players.filter(p => p.role === 'wicket-keeper').length,
    };
  };

  const getFilteredPlayers = () => {
    if (!selectedRole) return players;
    return players.filter(p => p.role === selectedRole);
  };

  const stats = getStatistics();
  const filteredPlayers = getFilteredPlayers();
  const isSuperAdmin = userProfile?.role === 'super-admin';

  return (
    <div className="w-full flex flex-col">
      {/* Header */}
      <div className="px-4 md:px-6 py-6 border-b border-neutral-800">
        <div className="text-2xl font-bold">Players</div>
        <div className="text-sm text-neutral-500 mt-1">The Squad</div>
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
          <>
            {/* Statistics Card */}
            <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-lg p-4 border border-neutral-700">
              <div className="text-xs font-semibold text-neutral-400 mb-3">PLAYER STATISTICS</div>
              <div className="grid grid-cols-5 gap-2">
                <button
                  onClick={() => setSelectedRole(null)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${selectedRole === null
                      ? 'bg-amber-500/20 border border-amber-500 text-amber-400'
                      : 'bg-neutral-700/50 border border-neutral-700 text-neutral-400 hover:border-amber-500/50'
                    }`}
                >
                  <div className="text-lg font-bold">{stats.total}</div>
                  <div className="text-xs text-center">All</div>
                </button>
                <button
                  onClick={() => setSelectedRole('batsman')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${selectedRole === 'batsman'
                      ? 'bg-blue-500/20 border border-blue-500 text-blue-400'
                      : 'bg-neutral-700/50 border border-neutral-700 text-neutral-400 hover:border-blue-500/50'
                    }`}
                >
                  <div className="text-lg font-bold">{stats.batsman}</div>
                  <div className="text-xs text-center">Batsman</div>
                </button>
                <button
                  onClick={() => setSelectedRole('bowler')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${selectedRole === 'bowler'
                      ? 'bg-red-500/20 border border-red-500 text-red-400'
                      : 'bg-neutral-700/50 border border-neutral-700 text-neutral-400 hover:border-red-500/50'
                    }`}
                >
                  <div className="text-lg font-bold">{stats.bowler}</div>
                  <div className="text-xs text-center">Bowler</div>
                </button>
                <button
                  onClick={() => setSelectedRole('all-rounder')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${selectedRole === 'all-rounder'
                      ? 'bg-purple-500/20 border border-purple-500 text-purple-400'
                      : 'bg-neutral-700/50 border border-neutral-700 text-neutral-400 hover:border-purple-500/50'
                    }`}
                >
                  <div className="text-lg font-bold">{stats.allRounder}</div>
                  <div className="text-xs text-center">All-rounder</div>
                </button>
                <button
                  onClick={() => setSelectedRole('wicket-keeper')}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${selectedRole === 'wicket-keeper'
                      ? 'bg-green-500/20 border border-green-500 text-green-400'
                      : 'bg-neutral-700/50 border border-neutral-700 text-neutral-400 hover:border-green-500/50'
                    }`}
                >
                  <div className="text-lg font-bold">{stats.wicketKeeper}</div>
                  <div className="text-xs text-center">WK</div>
                </button>
              </div>
            </div>

            {/* Players List */}
            {filteredPlayers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-2xl mb-2">🔍</div>
                <div className="text-neutral-500 text-center">No players found in this category</div>
              </div>
            ) : (
              filteredPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="bg-neutral-900 rounded-lg p-4 animate-in fade-in"
                  style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
                >
                  <div
                    className="flex items-center gap-3 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/players/${player.id}`)}
                  >
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
                  {isSuperAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPlayer({ ...player });
                          setIsModalOpen(true);
                        }}
                        className="flex-1 px-3 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(player.id, player.name);
                        }}
                        disabled={isDeletingId === player.id}
                        className="flex-1 px-3 py-2 text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors disabled:opacity-50"
                      >
                        {isDeletingId === player.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Add Player Form - Only for Super Admin */}
      {isSuperAdmin && (
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
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Player name"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <input
                type="email"
                value={newPlayerEmail}
                onChange={(e) => setNewPlayerEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={newPlayerPassword}
                onChange={(e) => setNewPlayerPassword(e.target.value)}
                placeholder="Default password"
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
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
                  setNewPlayerEmail('');
                  setNewPlayerPassword('cricket123');
                  setNewPlayerRole('batsman');
                }}
                className="w-full px-3 py-2 text-xs text-neutral-400 hover:text-neutral-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && playerToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-xl p-6 max-w-sm mx-4 space-y-4 border border-neutral-800">
            <h3 className="text-lg font-bold text-white">Delete Player</h3>
            <p className="text-neutral-400">
              Are you sure you want to delete <strong className="text-white">{playerToDelete.name}</strong>?
            </p>
            <p className="text-neutral-500 text-sm">
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPlayerToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
};

export default PlayersPage;
