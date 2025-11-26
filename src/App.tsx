import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';
import { Toaster } from 'react-hot-toast';
import AiGamePage from './pages/AIGamePage';
import GameHistoryPage from './pages/GameHistoryPage';
import GameViewerPage from './pages/GameViewerPage';
import ProtectedRoute from './components/ProtectedPage';

// --- Placeholder pages ---
const PuzzlesPage = () => <h1 className="text-3xl font-bold">Puzzles Page (Coming Soon)</h1>;
const LearnPage = () => <h1 className="text-3xl font-bold">Learn Page (Coming Soon)</h1>;
const WatchPage = () => <h1 className="text-3xl font-bold">Watch Page (Coming Soon)</h1>;
const CommunityPage = () => <h1 className="text-3xl font-bold">Community Page (Coming Soon)</h1>;

function App() {
  return (
    <>
      {/* Toaster must be at the root level */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#151821',
            color: '#f5f7ff',
            border: '1px solid #2a3040',
          },
          success: {
            iconTheme: {
              primary: '#49c85f',
              secondary: '#151821',
            },
          },
          error: {
            iconTheme: {
              primary: '#ff4444',
              secondary: '#151821',
            },
          },
        }}
      />

      <Routes>
        <Route path="/" element={<Layout />}>
          {/* ==================== PUBLIC ROUTES ==================== */}
          <Route index element={<HomePage />} />
          <Route path="/puzzles" element={<PuzzlesPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/watch" element={<WatchPage />} />
          <Route path="/community" element={<CommunityPage />} />

          {/* ==================== PROTECTED ROUTES ==================== */}
          {/* Play Lobby - Must be logged in */}
          <Route 
            path="/play" 
            element={
              <ProtectedRoute>
                <LobbyPage />
              </ProtectedRoute>
            } 
          />

          {/* PvP Game - Must be logged in */}
          <Route 
            path="/game/:gameId" 
            element={
              <ProtectedRoute>
                <GamePage />
              </ProtectedRoute>
            } 
          />

          {/* AI Game - Must be logged in */}
          <Route 
            path="/ai" 
            element={
              <ProtectedRoute>
                <AiGamePage />
              </ProtectedRoute>
            } 
          />

          {/* Game History - Must be logged in */}
          <Route 
            path="/history" 
            element={
              <ProtectedRoute>
                <GameHistoryPage />
              </ProtectedRoute>
            } 
          />

          {/* Game Viewer - Must be logged in */}
          <Route 
            path="/game-viewer/:gameId" 
            element={
              <ProtectedRoute>
                <GameViewerPage />
              </ProtectedRoute>
            } 
          />

          {/* Profile - Must be logged in */}
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <div className="text-3xl font-bold">Profile (Coming Soon)</div>
              </ProtectedRoute>
            } 
          />
        </Route>
        
        {/* 404 Page */}
        <Route path="*" element={<h1 className="text-3xl font-bold">404 Not Found</h1>} />
      </Routes>
    </>
  );
}

export default App;