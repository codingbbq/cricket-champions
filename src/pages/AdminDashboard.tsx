import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AdminDashboardPage = () => {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/admin/players">
          <Button variant="outline" className="w-full h-32 text-lg">
            Manage Players
          </Button>
        </Link>
                <Link to="/admin/matches">
          <Button variant="outline" className="w-full h-32 text-lg">
            Manage Matches
          </Button>
        </Link>
        {/* Other dashboard links will be added here */}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
