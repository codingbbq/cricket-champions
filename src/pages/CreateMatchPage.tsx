import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

const CreateMatchPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [overs, setOvers] = useState(20);
  const [lastManBatting, setLastManBatting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleCreateMatch = async () => {
    if (!venue.trim()) {
      setError('Please enter a venue');
      return;
    }

    if (!currentUser) {
      setError('You must be logged in to create a match');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newMatchRef = await addDoc(collection(db, 'matches'), {
        venue,
        date: new Date(date),
        overs: Number(overs),
        lastManBatting,
        status: 'pending',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setMatchId(newMatchRef.id);
      setStep(2);
    } catch (err) {
      console.error('Error creating match:', err);
      setError('Failed to create match. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMatch = async () => {
    if (!venue.trim() || !matchId) {
      setError('Please enter a venue');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        venue,
        date: new Date(date),
        overs: Number(overs),
        lastManBatting,
      });
      addToast('Match details updated successfully!', 'success');
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating match:', err);
      setError('Failed to update match. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedToTeams = () => {
    if (matchId) {
      navigate(`/matches/${matchId}/teams`);
    }
  };

  const stepTitles: Record<number, string> = {
    1: 'Create Match',
    2: 'All Set',
  };

  const dots = [1, 2].map(n => ({
    style: {
      width: '26px',
      height: '3px',
      borderRadius: '2px',
      background: n <= step ? '#fbbf24' : '#404040'
    }
  }));

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col relative bg-neutral-950">
        {/* Header */}
        <div className="sticky top-0 z-20 px-4 py-4 bg-neutral-950/88 backdrop-blur-lg border-b border-neutral-800">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => {
                if (step === 1) {
                  navigate('/matches');
                } else {
                  setStep(1);
                }
              }}
              className={`w-8 h-8 flex items-center justify-center ${step === 1 ? 'text-neutral-600 cursor-not-allowed' : 'text-white hover:bg-neutral-800 rounded transition-colors'}`}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 18l-6-6 6-6"></path>
              </svg>
            </button>
            <div className="text-base font-semibold">{stepTitles[step]}</div>
          </div>
          <div className="flex gap-1.5 pl-11">
            {dots.map((dot, idx) => (
              <div key={idx} style={dot.style}></div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-8">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Match venue</label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Riverside Turf, Sec 21"
                  className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Match date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Number of overs</label>
                <input
                  type="number"
                  value={overs}
                  onChange={(e) => setOvers(Number(e.target.value))}
                  min="1"
                  max="50"
                  className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between py-2 px-0">
                <div className="text-sm font-medium">Last man batting</div>
                <button
                  onClick={() => setLastManBatting(!lastManBatting)}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center ${
                    lastManBatting ? 'bg-amber-600' : 'bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      lastManBatting ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  ></div>
                </button>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                onClick={handleCreateMatch}
                disabled={isSubmitting || !venue.trim()}
                className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isSubmitting ? 'Creating...' : 'Select Teams'}
              </button>
            </div>
          )}

          {step === 2 && matchId && (
            <div className="space-y-6 animate-in fade-in">
              {!isEditing ? (
                <>
                  <div className="bg-neutral-900 rounded-lg p-6 text-center space-y-2">
                    <div className="text-4xl">✅</div>
                    <div className="text-lg font-semibold mt-3">Match ready</div>
                    <div className="text-sm text-neutral-400">{venue} · {date} · {overs} overs</div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-neutral-800">
                      <span>Venue</span>
                      <span className="text-neutral-400">{venue}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-800">
                      <span>Date</span>
                      <span className="text-neutral-400">{new Date(date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-800">
                      <span>Overs</span>
                      <span className="text-neutral-400">{overs}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>Last man batting</span>
                      <span className="text-neutral-400">{lastManBatting ? 'Yes' : 'No'}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Edit Details
                    </button>
                    <button
                      onClick={handleProceedToTeams}
                      className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
                    >
                      Select Teams →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-neutral-400 mb-2">Edit match details</div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Match venue</label>
                    <input
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g. Riverside Turf, Sec 21"
                      className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Match date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">Number of overs</label>
                    <input
                      type="number"
                      value={overs}
                      onChange={(e) => setOvers(Number(e.target.value))}
                      min="1"
                      max="50"
                      className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 px-0">
                    <div className="text-sm font-medium">Last man batting</div>
                    <button
                      onClick={() => setLastManBatting(!lastManBatting)}
                      className={`w-10 h-6 rounded-full transition-colors flex items-center ${
                        lastManBatting ? 'bg-amber-600' : 'bg-neutral-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          lastManBatting ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`}
                      ></div>
                    </button>
                  </div>

                  {error && <p className="text-sm text-red-400">{error}</p>}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateMatch}
                      disabled={isSubmitting || !venue.trim()}
                      className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateMatchPage;
