import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Match } from '@/types';

const MatchesPage = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      const matchesCollection = collection(db, 'matches');
      const matchesSnapshot = await getDocs(matchesCollection);
      const matchesList = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      // @ts-ignore
            setMatches(matchesList.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds));
      setLoading(false);
    };

    fetchMatches();
  }, []);

  if (loading) {
    return <div className="container mx-auto py-10">Loading matches...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Matches</h1>
        <Link to="/admin/matches/new" className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
          Create New Match
        </Link>
      </div>
      <div className="space-y-4">
        {matches.map(match => (
          <div key={match.id} className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">{match.venue || 'Match'}</h2>
              <span className="text-sm font-normal capitalize p-2 rounded-md bg-gray-200 text-gray-800">
                {match.status}
              </span>
            </div>
            <div className="mt-4">
              {/* @ts-ignore */}
              <p>Date: {new Date(match.date.seconds * 1000).toLocaleDateString()}</p>
              <p>Overs: {match.overs}</p>
              <div className="mt-4">
                {match.status === 'pending' && (
                  <Link to={`/admin/matches/${match.id}/teams`} className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    Setup Match
                  </Link>
                )}
                                {match.status === 'live' && (
                  <Link to={`/scoring/${match.id}`} className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700">
                    Go to Scoring
                  </Link>
                )}
                {match.status === 'completed' && (
                  <Link to={`/matches/${match.id}/summary`} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
                    View Summary
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MatchesPage;
