import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import AdminDashboardPage from './pages/AdminDashboard';
import PlayersPage from './pages/admin/PlayersPage';
import MatchesPage from './pages/admin/MatchesPage';
import CreateMatchPage from './pages/admin/CreateMatchPage';
import TeamSelectionPage from './pages/admin/TeamSelectionPage';
import TossPage from './pages/admin/TossPage';
import ScoringPage from './pages/ScoringPage';
import MatchSummaryPage from './pages/MatchSummaryPage';
import StatisticsPage from './pages/admin/StatisticsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import { ToastProvider, ToastContainer } from './contexts/ToastContext';

function App() {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-gray-50 font-sans antialiased">
        <ToastContainer />
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
        <Route path="/admin/matches/:matchId/teams" element={<ProtectedRoute><TeamSelectionPage /></ProtectedRoute>} />
        <Route path="/admin/matches/:matchId/toss" element={<ProtectedRoute><TossPage /></ProtectedRoute>} />
        <Route path="/scoring/:matchId" element={<ProtectedRoute><ScoringPage /></ProtectedRoute>} />
        <Route path="/match/:matchId" element={<MatchSummaryPage />} />
        <Route path="/admin/statistics" element={<ProtectedRoute><StatisticsPage /></ProtectedRoute>} />
        {/* More routes will be added here */}
        </Routes>
      </main>
    </ToastProvider>
  )
}

export default App
