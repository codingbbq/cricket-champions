interface ScoringControlsProps {
  onScore: (runs: number) => void;
  onExtra: (extraType: 'wide' | 'no-ball') => void;
  onWicket: () => void;
  isEnabled?: boolean;
}

export const ScoringControls = ({ onScore, onExtra, onWicket, isEnabled = true }: ScoringControlsProps) => {
  const runs = [0, 1, 2, 3, 4, 6];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Runs</h3>
        <div className="grid grid-cols-3 gap-2">
          {runs.map(run => (
            <button 
              key={run} 
              onClick={() => onScore(run)} 
              disabled={!isEnabled}
              className={`px-4 py-2 rounded-md font-semibold transition ${isEnabled ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {run}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Extras</h3>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => onExtra('wide')} 
            disabled={!isEnabled}
            className={`px-4 py-2 rounded-md font-semibold transition ${isEnabled ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            Wide
          </button>
          <button 
            onClick={() => onExtra('no-ball')} 
            disabled={!isEnabled}
            className={`px-4 py-2 rounded-md font-semibold transition ${isEnabled ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            No Ball
          </button>
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Wicket</h3>
        <button 
          onClick={onWicket} 
          disabled={!isEnabled}
          className={`w-full px-4 py-2 rounded-md font-semibold transition ${isEnabled ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-400 cursor-not-allowed'}`}
        >
          Wicket
        </button>
      </div>
    </div>
  );
};
