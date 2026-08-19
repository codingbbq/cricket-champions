import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import PlayersPage from './pages/PlayersPage';
import MatchesPage from './pages/MatchesPage';
import CreateMatchPage from './pages/CreateMatchPage';
import TeamSelectionPage from './pages/TeamSelectionPage';
import TossPage from './pages/TossPage';
import ScoringPage from './pages/ScoringPage';
import MatchSummaryPage from './pages/MatchSummaryPage';
import StatisticsPage from './pages/StatisticsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './components/common/MainLayout';
import { ToastProvider, ToastContainer } from './contexts/ToastContext';

function App() {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-neutral-950 font-sans antialiased">
        <ToastContainer />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/match/:matchId" element={<MainLayout><MatchSummaryPage /></MainLayout>} />

          {/* Authenticated User Routes */}
          <Route path="/matches" element={<ProtectedRoute requiredRole="user"><MainLayout><MatchesPage /></MainLayout></ProtectedRoute>} />
          <Route path="/matches/new" element={<ProtectedRoute requiredRole="user"><CreateMatchPage /></ProtectedRoute>} />
          <Route path="/matches/:matchId/teams" element={<ProtectedRoute requiredRole="user"><TeamSelectionPage /></ProtectedRoute>} />
          <Route path="/matches/:matchId/toss" element={<ProtectedRoute requiredRole="user"><TossPage /></ProtectedRoute>} />
          <Route path="/scoring/:matchId" element={<ProtectedRoute requiredRole="user"><ScoringPage /></ProtectedRoute>} />

          {/* Super Admin Routes */}
          <Route path="/players" element={<ProtectedRoute requiredRole="super-admin"><MainLayout><PlayersPage /></MainLayout></ProtectedRoute>} />
          <Route path="/statistics" element={<ProtectedRoute requiredRole="super-admin"><StatisticsPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </ToastProvider>
  )
}

export default App
