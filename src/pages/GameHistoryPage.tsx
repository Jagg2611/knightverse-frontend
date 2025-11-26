// src/pages/GameHistoryPage.tsx
import React, { useState, useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { MY_GAMES_QUERY, ME_QUERY } from "../lib/graphql";
import ChessLoadingScreen from "../components/ChessLoadingScreen";

interface Player {
  _id: string;
  username: string;
}

interface Game {
  _id: string;
  status: string;
  whitePlayer: Player;
  blackPlayer?: Player;
  winner?: string;
  timeControl?: string;
}

const GAMES_PER_PAGE = 10;

const GameHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: meData } = useQuery(ME_QUERY);
  const { data, loading, error } = useQuery(MY_GAMES_QUERY);

  const currentUserId = meData?.me?._id;

  // Filter only completed games
  const completedGames = useMemo(() => {
    const allGames = data?.myGames || [];
    return allGames.filter((game: Game) => game.status === "COMPLETED");
  }, [data]);

  // Pagination logic
  const totalGames = completedGames.length;
  const totalPages = Math.ceil(totalGames / GAMES_PER_PAGE);
  const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
  const endIndex = startIndex + GAMES_PER_PAGE;
  const currentGames = completedGames.slice(startIndex, endIndex);

  if (loading) return <ChessLoadingScreen />;
  
  if (error) {
    return (
      <div className="landing-main flex items-center justify-center">
        <div className="text-red-400">Error loading games: {error.message}</div>
      </div>
    );
  }

  function getOpponent(game: Game): Player | null {
    if (!currentUserId) return null;
    return game.whitePlayer._id === currentUserId 
      ? game.blackPlayer || null
      : game.whitePlayer;
  }

  function getPlayerColor(game: Game): string {
    if (!currentUserId) return "white";
    return game.whitePlayer._id === currentUserId ? "white" : "black";
  }

  // Helper to determine Win/Loss/Draw text and color
  function getGameResult(game: Game, isWhite: boolean) {
    if (game.winner === "DRAW") {
      return { label: "Draw", color: "text-yellow-500" };
    }
    
    const winnerIsWhite = game.winner === "WHITE";
    const isWin = (isWhite && winnerIsWhite) || (!isWhite && !winnerIsWhite);

    return isWin 
      ? { label: "Won", color: "text-green-400" }
      : { label: "Lost", color: "text-red-400" };
  }

  return (
    // FIX 1: Added !justify-start and !pt-20 to override the global centering we added for the Game Board
    <div className="landing-main !justify-start !pt-20 md:!pt-10">
      <div className="max-w-5xl mx-auto px-2 md:px-4 h-full flex flex-col w-full">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          {/* Smaller text on mobile (text-2xl) */}
          <h1 className="text-2xl md:text-4xl font-bold">📜 Past Games</h1>
          <button
            onClick={() => navigate("/play")}
            className="px-3 py-1.5 md:px-4 md:py-2 text-sm md:text-base bg-[#2a2f3b] hover:bg-[#343a48] rounded-lg transition"
          >
            ← <span className="hidden md:inline">Back to</span> Lobby
          </button>
        </div>

        {completedGames.length === 0 ? (
          <div className="bg-elevated rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">♟️</div>
            <h2 className="text-2xl font-semibold mb-2">No completed games yet</h2>
            <p className="text-text-muted mb-6">Start playing to see your game history here!</p>
            <button
              onClick={() => navigate("/play")}
              className="py-3 px-6 bg-[#49c85f] hover:bg-[#3fb556] rounded-lg font-semibold transition"
            >
              Play Your First Game
            </button>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Stats Summary - Compact padding on mobile */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-2 flex-shrink-0">
              <div className="bg-elevated rounded-lg p-2 md:p-4 text-center border border-[#2a2f3b]">
                <div className="text-xl md:text-3xl font-medium text-text-primary">{totalGames}</div>
                <div className="text-xs md:text-sm text-text-muted mt-1">Total</div>
              </div>
              <div className="bg-elevated rounded-lg p-2 md:p-4 text-center border border-[#2a2f3b]">
                <div className="text-xl md:text-3xl font-medium text-green-400">{meData?.me?.stats?.wins || 0}</div>
                <div className="text-xs md:text-sm text-text-muted mt-1">Wins</div>
              </div>
              <div className="bg-elevated rounded-lg p-2 md:p-4 text-center border border-[#2a2f3b]">
                <div className="text-xl md:text-3xl font-medium text-red-400">{meData?.me?.stats?.losses || 0}</div>
                <div className="text-xs md:text-sm text-text-muted mt-1">Losses</div>
              </div>
            </div>

            {/* Scrollable Games List - Compact Cards */}
            <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-2 min-h-0 pb-1">
              {currentGames.map((game: Game) => {
                const opponent = getOpponent(game);
                const playerColor = getPlayerColor(game);
                const isWhite = playerColor === "white";
                
                const { label, color } = getGameResult(game, isWhite);
                
                const timeText = game.timeControl 
                  ? `${game.timeControl} min` 
                  : "No time limit";

                return (
                  <div
                    key={game._id}
                    onClick={() => navigate(`/game-viewer/${game._id}`)}
                    // Reduced padding: p-2.5 on mobile, p-3.5 on desktop
                    className="bg-elevated rounded-lg p-2.5 md:p-3.5 hover:bg-[#1a1d26] transition cursor-pointer border border-[#2a2f3b] hover:border-[#49c85f] group"
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Info Stack */}
                      <div>
                        {/* Top Row: Opponent Name (Smaller text) */}
                        <div className="text-base md:text-lg font-bold text-text-primary mb-0.5 md:mb-1">
                          <span className="text-text-muted font-normal text-sm md:text-base mr-1">vs</span>
                          {opponent?.username || "Unknown"}
                        </div>

                        {/* Bottom Row: Metadata */}
                        <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
                          {/* Result */}
                          <span className={`font-bold uppercase tracking-wide ${color}`}>
                            {label}
                          </span>
                          
                          <span className="text-border-subtle">•</span>

                          {/* Color Played Indicator */}
                          <div className="flex items-center gap-1 text-text-muted">
                            <div 
                              className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full shadow-sm ${isWhite ? 'bg-white' : 'bg-gray-800 border border-gray-600'}`} 
                            />
                            <span className="hidden md:inline">as {isWhite ? 'White' : 'Black'}</span>
                            <span className="md:hidden">{isWhite ? 'W' : 'B'}</span>
                          </div>

                          <span className="text-border-subtle">•</span>

                          {/* Time Control */}
                          <div className="text-text-muted flex items-center gap-1">
                            <span>⏱ {game.timeControl || '∞'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Review Chevron */}
                      <div className="text-blue-400 group-hover:text-blue-300 transition flex items-center gap-1 text-xs md:text-sm font-medium">
                        <span className="hidden md:inline">Review</span>
                        <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer - Smaller Buttons */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-2 md:gap-3 mt-2 pb-1 flex-shrink-0">
                <div className="flex items-center gap-1 md:gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1.5 md:px-4 md:py-2 bg-[#2a2f3b] hover:bg-[#343a48] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-sm"
                  >
                    ← Prev
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 md:w-10 md:h-10 rounded-lg font-semibold text-sm md:text-base transition ${
                            currentPage === pageNum
                              ? "bg-[#49c85f] text-black"
                              : "bg-[#2a2f3b] hover:bg-[#343a48]"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1.5 md:px-4 md:py-2 bg-[#2a2f3b] hover:bg-[#343a48] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-sm"
                  >
                    Next →
                  </button>
                </div>

                <div className="text-xs text-text-muted">
                  Showing {startIndex + 1} - {Math.min(endIndex, totalGames)} of {totalGames} games
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameHistoryPage;