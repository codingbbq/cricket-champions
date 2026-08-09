import { useNavigate } from 'react-router-dom';

interface MatchSummaryProps {
  winnerName: string;
  margin: string;
}

export const MatchSummary = ({ winnerName, margin }: MatchSummaryProps) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="w-full max-w-md text-center bg-white p-8 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold">Match Over</h1>
        <div className="space-y-4 mt-4">
          <p className="text-xl">Congratulations!</p>
          <p className="text-2xl font-bold">{winnerName}</p>
          <p className="text-lg">won by {margin}</p>
          <button onClick={() => navigate('/admin')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Back to Dashboard</button>
        </div>
      </div>
    </div>
  );
};
