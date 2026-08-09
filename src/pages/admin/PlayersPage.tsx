import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Player } from '@/types';

const PlayersPage = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      const playersCollection = collection(db, 'players');
      const playersSnapshot = await getDocs(playersCollection);
      const playersList = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
      setPlayers(playersList);
      setLoading(false);
    };

    fetchPlayers();
  }, []);

  const handleAddPlayer = async () => {
    if (newPlayerName.trim() === '') return;
    const newPlayer = { name: newPlayerName };
    const docRef = await addDoc(collection(db, 'players'), newPlayer);
    setPlayers([...players, { id: docRef.id, ...newPlayer }]);
    setNewPlayerName('');
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer || editingPlayer.name.trim() === '') return;
    const playerRef = doc(db, 'players', editingPlayer.id);
    await updateDoc(playerRef, { name: editingPlayer.name });
    setPlayers(players.map(p => p.id === editingPlayer.id ? editingPlayer : p));
    setEditingPlayer(null);
    setIsModalOpen(false);
  };

  const handleDeletePlayer = async (id: string) => {
    await deleteDoc(doc(db, 'players', id));
    setPlayers(players.filter(p => p.id !== id));
  };

  if (loading) {
    return <div className="container mx-auto py-10">Loading players...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Manage Players</h1>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          placeholder="New player name"
          className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md"
        />
        <button onClick={handleAddPlayer} className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Add Player</button>
      </div>
      <div className="space-y-2">
        {players.map(player => (
          <div key={player.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
            <span>{player.name}</span>
            <div className="flex gap-2">
              <button onClick={() => { setEditingPlayer({ ...player }); setIsModalOpen(true); }} className="px-3 py-1 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600">Edit</button>
              <button onClick={() => handleDeletePlayer(player.id)} className="px-3 py-1 text-sm text-white bg-red-500 rounded-md hover:bg-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4">Edit Player</h2>
            <input
              value={editingPlayer.name}
              onChange={(e) => setEditingPlayer(p => p ? { ...p, name: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button>
              <button onClick={handleUpdatePlayer} className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayersPage;
