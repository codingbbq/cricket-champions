import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useState, memo } from 'react';

interface BottomNavigationProps {
  currentPath?: string;
}

const BottomNavigation = memo(({ currentPath = '/' }: BottomNavigationProps) => {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleNavigate = (path: string) => {
    if (currentPath !== path) {
      navigate(path);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-neutral-900 border-t border-neutral-800 px-4 py-3 flex items-center justify-around z-40">
        <button
          onClick={() => handleNavigate('/')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentPath === '/' ? 'text-amber-400' : 'text-neutral-400 hover:text-amber-400'
          }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
          <span className="text-xs">Home</span>
        </button>
        <button
          onClick={() => handleNavigate('/admin/matches')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentPath === '/admin/matches' ? 'text-amber-400' : 'text-neutral-400 hover:text-amber-400'
          }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
          <span className="text-xs">Matches</span>
        </button>
        <button
          onClick={() => handleNavigate('/admin/players')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentPath === '/admin/players' ? 'text-amber-400' : 'text-neutral-400 hover:text-amber-400'
          }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span className="text-xs">Players</span>
        </button>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex flex-col items-center gap-1 text-neutral-400 hover:text-red-400 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span className="text-xs">Logout</span>
        </button>
      </div>

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
});

BottomNavigation.displayName = 'BottomNavigation';

export default BottomNavigation;
