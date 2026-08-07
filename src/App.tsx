import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import AdminDashboardPage from './pages/AdminDashboard';
import PlayersPage from './pages/admin/PlayersPage';
import MatchesPage from './pages/admin/MatchesPage';
import CreateMatchPage from './pages/admin/CreateMatchPage';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <main className="min-h-screen bg-background font-sans antialiased">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
                <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
                <Route path="/admin/players" element={<ProtectedRoute><PlayersPage /></ProtectedRoute>} />
                <Route path="/admin/matches" element={<ProtectedRoute><MatchesPage /></ProtectedRoute>} />
        <Route path="/admin/matches/new" element={<ProtectedRoute><CreateMatchPage /></ProtectedRoute>} />
        {/* More routes will be added here */}
      </Routes>
    </main>
  )
}

export default App
