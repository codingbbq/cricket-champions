import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const CreateMatchPage = () => {
  const navigate = useNavigate();
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [overs, setOvers] = useState(20);
  const [lastManBatting, setLastManBatting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const newMatchRef = await addDoc(collection(db, 'matches'), {
        venue,
        date: new Date(date),
        overs,
        lastManBatting,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      navigate(`/admin/matches/${newMatchRef.id}/teams`);
    } catch (err) {
      console.error('Error creating match:', err);
      setError('Failed to create match. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Create New Match</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="venue" className="block mb-2 text-sm font-medium text-gray-700">Match Venue</label>
            <input
              id="venue"
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., National Stadium"
              required
            />
          </div>
          <div>
            <label htmlFor="date" className="block mb-2 text-sm font-medium text-gray-700">Match Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div>
            <label htmlFor="overs" className="block mb-2 text-sm font-medium text-gray-700">Number of Overs</label>
            <input
              id="overs"
              type="number"
              value={overs}
              onChange={(e) => setOvers(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="1"
              max="50"
              required
            />
          </div>
          <div className="flex items-center">
            <input
              id="lastManBatting"
              type="checkbox"
              checked={lastManBatting}
              onChange={(e) => setLastManBatting(e.target.checked)}
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <label htmlFor="lastManBatting" className="ml-2 block text-sm text-gray-900">Last Man Batting</label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {isSubmitting ? 'Creating...' : 'Create Match & Select Teams'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateMatchPage;