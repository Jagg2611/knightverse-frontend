// src/components/ChessLoadingScreen.tsx
import React from "react";

const ChessLoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#0b0d12] flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Animated Chess Pieces */}
        <div className="relative w-32 h-32">
          {/* Rotating ring */}
          <div className="absolute inset-0 border-4 border-[#2a2f3b] border-t-[#49c85f] rounded-full animate-spin"></div>
          
          {/* Center chess piece icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl animate-pulse">♔</div>
          </div>
        </div>

        {/* Loading text with dots animation */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold text-text-primary">Loading Game</span>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-[#49c85f] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-[#49c85f] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-[#49c85f] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>

        {/* Optional subtitle */}
        <p className="text-sm text-text-muted">Setting up the board...</p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        .animate-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        .animate-bounce {
          animation: bounce 0.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ChessLoadingScreen;