
interface ScoringControlsProps {
  onScore: (runs: number) => void;
  onExtra: (extraType: 'wide' | 'no-ball') => void;
  onWicket: () => void;
}

export const ScoringControls = ({ onScore, onExtra, onWicket }: ScoringControlsProps) => {
  const runs = [0, 1, 2, 3, 4, 6];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Runs</h3>
        <div className="grid grid-cols-3 gap-2">
          {runs.map(run => (
            <button key={run} onClick={() => onScore(run)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">{run}</button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Extras</h3>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onExtra('wide')} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">Wide</button>
          <button onClick={() => onExtra('no-ball')} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300">No Ball</button>
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-2">Wicket</h3>
        <button onClick={onWicket} className="w-full px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600">Wicket</button>
      </div>
    </div>
  );
};
