import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Navigation from '@/components/common/Navigation';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

const HomePage = () => {
  const { currentUser } = useAuth();

  const features = [
    {
      icon: '👥',
      title: 'Player Management',
      description: 'Add, edit, and manage your cricket team players with roles and statistics.',
    },
    {
      icon: '🏟️',
      title: 'Match Management',
      description: 'Create and manage cricket matches with team selection and toss simulation.',
    },
    {
      icon: '📊',
      title: 'Live Scoring',
      description: 'Real-time match scoring with ball-by-ball updates and statistics.',
    },
    {
      icon: '📈',
      title: 'Statistics',
      description: 'Comprehensive player statistics and match analytics.',
    },
  ];

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <div className="container-responsive py-20">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              🏏 Cricket Champions
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Your ultimate platform for managing cricket matches, players, and statistics
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              {currentUser ? (
                <>
                  <Link to="/admin">
                    <Button variant="primary" size="lg">
                      Go to Dashboard
                    </Button>
                  </Link>
                  <Link to="/admin/players">
                    <Button variant="secondary" size="lg">
                      Manage Players
                    </Button>
                  </Link>
                </>
              ) : (
                <Link to="/login">
                  <Button variant="primary" size="lg">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((feature, index) => (
              <Card key={index} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <CardContent className="text-center pt-8">
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Stats */}
          {currentUser && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-4xl font-bold text-blue-600 mb-2">∞</div>
                  <p className="text-gray-600">Players</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-4xl font-bold text-green-600 mb-2">∞</div>
                  <p className="text-gray-600">Matches</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-4xl font-bold text-purple-600 mb-2">∞</div>
                  <p className="text-gray-600">Statistics</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HomePage;
