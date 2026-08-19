import { Link } from 'react-router-dom';
import Navigation from '@/components/common/Navigation';
import { Card, CardContent } from '@/components/ui/Card';

const AdminDashboardPage = () => {
  return (
    <>
      <Navigation />
      <div className="container-responsive py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage players, matches, and view statistics</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/players">
            <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
              <CardContent className="text-center py-12">
                <div className="text-5xl mb-4">👥</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage Players</h2>
                <p className="text-gray-600">Add, edit, and manage team players</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/matches">
            <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
              <CardContent className="text-center py-12">
                <div className="text-5xl mb-4">🏏</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage Matches</h2>
                <p className="text-gray-600">Create and manage cricket matches</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/statistics">
            <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
              <CardContent className="text-center py-12">
                <div className="text-5xl mb-4">📊</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">View Statistics</h2>
                <p className="text-gray-600">Player statistics and analytics</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </>
  );
};

export default AdminDashboardPage;
