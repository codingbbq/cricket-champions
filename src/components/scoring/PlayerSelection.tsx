import type { Player } from '@/types';

interface PlayerSelectionProps {
  label: string;
  players: Player[];
  onSelect: (playerId: string) => void;
  selectedPlayerId?: string;
}

export const PlayerSelection = ({ label, players, onSelect, selectedPlayerId }: PlayerSelectionProps) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <select 
        onChange={(e) => onSelect(e.target.value)} 
        value={selectedPlayerId || ''}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      >
        <option value="" disabled>Select {label}</option>
        {players.map(player => (
          <option key={player.id} value={player.id}>
            {player.name}
          </option>
        ))}
      </select>
    </div>
  );
};
