import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import PlayersPage from './pages/admin/PlayersPage';
import MatchesPage from './pages/admin/MatchesPage';
import CreateMatchPage from './pages/admin/CreateMatchPage';
import TeamSelectionPage from './pages/admin/TeamSelectionPage';
import TossPage from './pages/admin/TossPage';
import ScoringPage from './pages/ScoringPage';
import MatchSummaryPage from './pages/MatchSummaryPage';
import StatisticsPage from './pages/admin/StatisticsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './components/common/MainLayout';
import { ToastProvider, ToastContainer } from './contexts/ToastContext';

function App() {
  return (
    <ToastProvider>
      <main className="min-h-screen bg-neutral-950 font-sans antialiased">
        <ToastContainer />
        <Routes>
        <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/players" element={<ProtectedRoute><MainLayout><PlayersPage /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/matches" element={<ProtectedRoute><MainLayout><MatchesPage /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/matches/new" element={<ProtectedRoute><CreateMatchPage /></ProtectedRoute>} />
        <Route path="/admin/matches/:matchId/teams" element={<ProtectedRoute><TeamSelectionPage /></ProtectedRoute>} />
        <Route path="/admin/matches/:matchId/toss" element={<ProtectedRoute><TossPage /></ProtectedRoute>} />
        <Route path="/scoring/:matchId" element={<ProtectedRoute><ScoringPage /></ProtectedRoute>} />
        <Route path="/match/:matchId" element={<MainLayout><MatchSummaryPage /></MainLayout>} />
        <Route path="/admin/statistics" element={<ProtectedRoute><StatisticsPage /></ProtectedRoute>} />
        </Routes>
      </main>
    </ToastProvider>
  )
}

export default App
