import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Navigation: React.FC = () => {
  const location = useLocation();
  const { currentUser } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home' },
    ...(currentUser ? [
      { path: '/admin', label: 'Dashboard' },
      { path: '/admin/players', label: 'Players' },
      { path: '/admin/matches', label: 'Matches' },
      { path: '/admin/statistics', label: 'Statistics' },
    ] : []),
  ];

  return (
    <nav className="bg-white shadow-md">
      <div className="container-responsive py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-blue-600">
          🏏 Cricket Champions
        </Link>
        <div className="flex items-center gap-6">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`transition-colors ${
                isActive(item.path)
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {currentUser && (
            <div className="text-sm text-gray-600">
              {currentUser.email}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
