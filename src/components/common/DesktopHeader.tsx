import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const DesktopHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <div className="text-2xl">🏏</div>
              <h1 className="text-xl font-bold text-white">Cricket Champions</h1>
            </div>

            {/* Navigation Links */}
            {currentUser && (
              <nav className="flex items-center gap-6">
                <button
                  onClick={() => navigate('/')}
                  className={`text-sm font-medium transition-colors ${
                    isActive('/') && location.pathname === '/'
                      ? 'text-amber-400'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => navigate('/matches')}
                  className={`text-sm font-medium transition-colors ${
                    isActive('/matches')
                      ? 'text-amber-400'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Matches
                </button>
                <button
                  onClick={() => navigate('/players')}
                  className={`text-sm font-medium transition-colors ${
                    isActive('/players')
                      ? 'text-amber-400'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Players
                </button>
                <button
                  onClick={() => navigate('/leaderboard')}
                  className={`text-sm font-medium transition-colors ${
                    isActive('/leaderboard')
                      ? 'text-amber-400'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Leaderboard
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="text-sm font-medium text-neutral-400 hover:text-red-400 transition-colors"
                >
                  Logout
                </button>
              </nav>
            )}
          </div>
        </div>
      </header>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 rounded-xl p-6 max-w-sm mx-4 space-y-4 border border-neutral-800">
            <h3 className="text-lg font-bold text-white">Confirm Logout</h3>
            <p className="text-neutral-400">Are you sure you want to logout?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DesktopHeader;
