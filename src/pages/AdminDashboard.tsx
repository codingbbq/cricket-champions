import { Link } from 'react-router-dom';

const AdminDashboardPage = () => {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/admin/players" className="block p-8 text-center bg-white rounded-lg shadow-md hover:bg-gray-50">
          <h2 className="text-xl font-bold">Manage Players</h2>
        </Link>
        <Link to="/admin/matches" className="block p-8 text-center bg-white rounded-lg shadow-md hover:bg-gray-50">
          <h2 className="text-xl font-bold">Manage Matches</h2>
        </Link>
        <Link to="/admin/statistics" className="block p-8 text-center bg-white rounded-lg shadow-md hover:bg-gray-50">
          <h2 className="text-xl font-bold">View Statistics</h2>
        </Link>
        {/* Other dashboard links will be added here */}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
