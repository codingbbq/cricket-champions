import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowUpDown } from 'lucide-react';
import type { Player, Innings } from '@/types';

interface PlayerStats {
  id: string;
  name: string;
  runs: number;
  wickets: number;
  matchesPlayed: number;
  ballsFaced: number;
  timesOut: number;
}

const StatisticsPage = () => {
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof PlayerStats | 'avg' | 'sr'; direction: 'ascending' | 'descending' } | null>(null);

  useEffect(() => {
    const calculateStats = async () => {
      setLoading(true);
      const playersSnap = await getDocs(collection(db, 'players'));
      const players = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
      const matchesSnap = await getDocs(collection(db, 'matches'));

      const stats: PlayerStats[] = players.map(p => ({ id: p.id, name: p.name, runs: 0, wickets: 0, matchesPlayed: 0, ballsFaced: 0, timesOut: 0 }));

      for (const matchDoc of matchesSnap.docs) {
        const inningsSnap = await getDocs(collection(db, `matches/${matchDoc.id}/innings`));
        const matchPlayers = new Set<string>();

        for (const inningsDoc of inningsSnap.docs) {
          const innings = inningsDoc.data() as Innings;
          innings.balls.forEach(ball => {
            const strikerStat = stats.find(s => s.id === ball.strikerId);
            if (strikerStat) {
              strikerStat.runs += ball.runs;
              if (!ball.isExtra || ball.extraType === 'no-ball') {
                strikerStat.ballsFaced++;
              }
              matchPlayers.add(ball.strikerId);
            }
            if (ball.isWicket) {
              const bowlerStat = stats.find(s => s.id === ball.bowlerId);
              if (bowlerStat) {
                bowlerStat.wickets++;
              }
              const outPlayerStat = stats.find(s => s.id === ball.strikerId);
              if (outPlayerStat) {
                outPlayerStat.timesOut++;
              }
            }
          });
        }
        matchPlayers.forEach(playerId => {
          const statPlayer = stats.find(s => s.id === playerId);
          if (statPlayer) statPlayer.matchesPlayed++;
        });
      }

      setPlayerStats(stats);
      setLoading(false);
    };

    calculateStats();
  }, []);

  const getSortableValue = (player: PlayerStats, key: keyof PlayerStats | 'avg' | 'sr') => {
    switch (key) {
      case 'avg':
        return player.runs / (player.timesOut || 1);
      case 'sr':
        return (player.runs / (player.ballsFaced || 1)) * 100;
      default:
        return player[key as keyof PlayerStats];
    }
  };

  const sortedPlayerStats = React.useMemo(() => {
    let sortableItems = [...playerStats];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = getSortableValue(a, sortConfig.key);
        const bValue = getSortableValue(b, sortConfig.key);
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [playerStats, sortConfig]);

  const requestSort = (key: keyof PlayerStats | 'avg' | 'sr') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  if (loading) {
    return <div className="container mx-auto py-10">Loading statistics...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Player Statistics</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onClick={() => requestSort('name')} className="flex items-center">Player <ArrowUpDown className="ml-2 h-4 w-4" /></button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onClick={() => requestSort('matchesPlayed')} className="flex items-center">Matches <ArrowUpDown className="ml-2 h-4 w-4" /></button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onClick={() => requestSort('runs')} className="flex items-center">Runs <ArrowUpDown className="ml-2 h-4 w-4" /></button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onClick={() => requestSort('wickets')} className="flex items-center">Wickets <ArrowUpDown className="ml-2 h-4 w-4" /></button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onClick={() => requestSort('avg')} className="flex items-center">Avg <ArrowUpDown className="ml-2 h-4 w-4" /></button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onClick={() => requestSort('sr')} className="flex items-center">SR <ArrowUpDown className="ml-2 h-4 w-4" /></button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedPlayerStats.map(player => (
              <tr key={player.id}>
                <td className="px-6 py-4 whitespace-nowrap">{player.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{player.matchesPlayed}</td>
                <td className="px-6 py-4 whitespace-nowrap">{player.runs}</td>
                <td className="px-6 py-4 whitespace-nowrap">{player.wickets}</td>
                <td className="px-6 py-4 whitespace-nowrap">{(player.runs / (player.timesOut || 1)).toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{((player.runs / (player.ballsFaced || 1)) * 100).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StatisticsPage;
