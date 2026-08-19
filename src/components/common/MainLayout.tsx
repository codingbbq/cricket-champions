import { useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();

  // Determine current path for navigation highlighting
  const getCurrentPath = () => {
    if (location.pathname === '/') return '/';
    if (location.pathname.startsWith('/admin/players')) return '/admin/players';
    if (location.pathname.startsWith('/admin/matches')) return '/admin/matches';
    return location.pathname;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center">
      <div className="w-full max-w-md min-h-screen flex flex-col relative bg-neutral-950">
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto pb-20">
          {children}
        </div>

        {/* Bottom Navigation - Persistent */}
        <BottomNavigation currentPath={getCurrentPath()} />
      </div>
    </div>
  );
};

export default MainLayout;
