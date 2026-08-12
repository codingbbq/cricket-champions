import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import Navigation from '@/components/common/Navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import type { Player } from '@/types';

const PlayersPage = () => {
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

  if (loading) {
    return (
      <div className="container-responsive py-12">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Loading players...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container-responsive py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Manage Players</h1>
          <p className="text-gray-600">Add, edit, and manage your cricket team players</p>
        </div>

        {/* Add Player Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Player</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Player Name"
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Enter player name"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={newPlayerRole}
                  onChange={(e) => setNewPlayerRole(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="batsman">Batsman</option>
                  <option value="bowler">Bowler</option>
                  <option value="all-rounder">All-rounder</option>
                  <option value="wicket-keeper">Wicket-keeper</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleAddPlayer}
                  isLoading={isAddingPlayer}
                  className="w-full"
                >
                  Add Player
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Players ({players.length})
          </h2>

          {players.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500 text-lg">No players yet. Add your first player above!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map(player => (
                <Card key={player.id} className="animate-fade-in">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{player.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{player.role}</p>
                      </div>
                      {player.active && (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingPlayer({ ...player });
                          setIsModalOpen(true);
                        }}
                        className="flex-1"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeletePlayer(player.id)}
                        isLoading={isDeletingId === player.id}
                        className="flex-1"
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPlayer(null);
          }}
          title="Edit Player"
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingPlayer(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdatePlayer}
                isLoading={isUpdatingPlayer}
              >
                Save Changes
              </Button>
            </>
          }
        >
          {editingPlayer && (
            <div className="space-y-4">
              <Input
                label="Player Name"
                type="text"
                value={editingPlayer.name}
                onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                placeholder="Enter player name"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={editingPlayer.role}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, role: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="batsman">Batsman</option>
                  <option value="bowler">Bowler</option>
                  <option value="all-rounder">All-rounder</option>
                  <option value="wicket-keeper">Wicket-keeper</option>
                </select>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
};

export default PlayersPage;
