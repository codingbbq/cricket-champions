import { useLocation } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import DesktopHeader from './DesktopHeader';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const location = useLocation();

  // Determine current path for navigation highlighting
  const getCurrentPath = () => {
    if (location.pathname === '/') return '/';
    if (location.pathname.startsWith('/players')) return '/players';
    if (location.pathname.startsWith('/matches')) return '/matches';
    if (location.pathname.startsWith('/leaderboard')) return '/leaderboard';
    return location.pathname;
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Desktop Header - Hidden on mobile */}
      <div className="hidden md:block">
        <DesktopHeader />
      </div>

      {/* Main Content Area */}
      <div className="flex justify-center">
        {/* Mobile: max-width container, Desktop: 12-column grid */}
        <div className="w-full md:max-w-7xl">
          <div className="md:grid md:grid-cols-12 md:gap-6 md:px-6 md:py-6">
            {/* Content spans full width on mobile, 12 columns on desktop */}
            <div className="md:col-span-12">
              {/* Mobile: constrained width, Desktop: full width */}
              <div className="max-w-md md:max-w-none mx-auto md:mx-0">
                <div className="flex-1 pb-20 md:pb-0">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile only */}
      <div className="md:hidden">
        <BottomNavigation currentPath={getCurrentPath()} />
      </div>
    </div>
  );
};

export default MainLayout;
