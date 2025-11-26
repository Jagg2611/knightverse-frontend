// src/components/MobileGameControls.tsx
import React from 'react';

interface MobileGameControlsProps {
  // Navigation
  onPrev: () => void;
  onNext: () => void;
  
  // Actions during game
  onOpenChat: () => void;
  onOfferDraw?: () => void;
  onResign?: () => void;
  
  // State
  drawDisabled?: boolean;
  
  // After game ends
  gameEnded: boolean;
  onRematch?: () => void;
  onReturnToLobby?: () => void;
  rematchPending?: boolean;
}

const MobileGameControls: React.FC<MobileGameControlsProps> = ({
  onPrev,
  onNext,
  onOpenChat,
  onOfferDraw,
  onResign,
  drawDisabled = false,
  gameEnded,
  onRematch,
  onReturnToLobby,
  rematchPending = false,
}) => {
  return (
    <div className="flex items-center justify-around gap-2 px-4 py-3 bg-[#151821] rounded-lg border border-[#2a3040]">
      {/* Previous Move */}
      <button
        onClick={onPrev}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2a2f3b] hover:bg-[#343a48] active:scale-95 transition-all"
        aria-label="Previous move"
      >
        <span className="text-2xl">◀</span>
      </button>

      {/* Next Move */}
      <button
        onClick={onNext}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2a2f3b] hover:bg-[#343a48] active:scale-95 transition-all"
        aria-label="Next move"
      >
        <span className="text-2xl">▶</span>
      </button>

      {/* Chat */}
      <button
        onClick={onOpenChat}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2a2f3b] hover:bg-[#343a48] active:scale-95 transition-all"
        aria-label="Chat"
      >
        <span className="text-2xl">💬</span>
      </button>

      {/* Draw OR Rematch (when game ends) */}
      {!gameEnded ? (
        <button
          onClick={onOfferDraw}
          disabled={drawDisabled}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
            drawDisabled
              ? 'bg-[#1a1d26] text-[#6b7183] cursor-not-allowed opacity-50'
              : 'bg-[#2a2f3b] hover:bg-[#343a48] active:scale-95'
          }`}
          aria-label="Offer draw"
        >
          <span className="text-2xl">🤝</span>
        </button>
      ) : (
        <button
          onClick={onRematch}
          disabled={rematchPending}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
            rematchPending
              ? 'bg-[#1a1d26] text-[#6b7183] cursor-not-allowed opacity-50'
              : 'bg-[#2a5bd7] hover:bg-[#3b6cf0] active:scale-95'
          }`}
          aria-label="Offer rematch"
        >
          <span className="text-2xl">🔄</span>
        </button>
      )}

      {/* Resign OR Return to Lobby (when game ends) */}
      {!gameEnded ? (
        <button
          onClick={onResign}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2a2f3b] hover:bg-red-600/20 hover:border-red-600/50 active:scale-95 transition-all border border-transparent"
          aria-label="Resign"
        >
          <span className="text-2xl">🏳️</span>
        </button>
      ) : (
        <button
          onClick={onReturnToLobby}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[#2a2f3b] hover:bg-[#343a48] active:scale-95 transition-all"
          aria-label="Return to lobby"
        >
          <span className="text-2xl">🏠</span>
        </button>
      )}
    </div>
  );
};

export default MobileGameControls;