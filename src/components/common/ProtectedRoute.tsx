import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: UserRole | UserRole[];
}

// Helper function to check role hierarchy
const hasPermission = (userRole: UserRole, requiredRole: UserRole | UserRole[]): boolean => {
  // Define role hierarchy: super-admin > user > public
  const roleHierarchy: Record<UserRole, number> = {
    'public': 0,
    'user': 1,
    'super-admin': 2
  };

  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const userLevel = roleHierarchy[userRole];
  
  // Check if user's role level meets or exceeds any required role level
  return requiredRoles.some(role => userLevel >= roleHierarchy[role]);
};

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { userProfile, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex justify-center items-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-neutral-400">Loading session...</p>
        </div>
      </div>
    );
  }

  // If no role required, just check if authenticated
  if (!requiredRole) {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  }

  // Check if user has required role using hierarchy
  const hasRequiredRole = userProfile && hasPermission(userProfile.role, requiredRole);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRequiredRole) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex justify-center items-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-red-400 mb-4">You don't have permission to access this page</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
