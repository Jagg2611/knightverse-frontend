// src/components/GameControls.tsx
import React from "react";

interface Props {
  currentMove: number;
  totalMoves: number;
  drawOfferDisabled?: boolean;
  drawOfferLabel?: string;

  onGoStart: () => void;
  onPrev: () => void;
  onNext: () => void;
  onGoEnd: () => void;

  onOfferDraw?: () => void;
  onResign?: () => void;

  gameEnded?: boolean;

  // 🔥 Rematch props
  onRematch?: () => void;
  rematchPending?: boolean;

  onReturnToLobby?: () => void;
}

const GameControls: React.FC<Props> = ({
  currentMove,
  totalMoves,
  drawOfferDisabled,
  drawOfferLabel,
  onGoStart,
  onPrev,
  onNext,
  onGoEnd,
  onOfferDraw,
  onResign,
  gameEnded,

  // 🔥 Added
  onRematch,
  rematchPending,

  onReturnToLobby,
}) => {
  return (
    <div className="bg-elevated rounded-md p-4 flex flex-col gap-4 h-fit mt-13">
      {/* =============== POST-GAME BUTTONS =============== */}
      {gameEnded ? (
        <>
          {/* REMATCH BUTTON WITH NEW UI */}
          {onRematch && (
            <button
              disabled={rematchPending}
              onClick={!rematchPending ? onRematch : undefined}
              className={`w-full py-2 rounded text-sm font-medium transition ${
                rematchPending
                  ? "bg-[#2a2f3b] text-text-muted cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {rematchPending ? (
                <div className="flex flex-col leading-tight">
                  <span className="block">Rematch</span>
                  <span className="block text-xs text-text-muted mt-0.5">
                    requested
                  </span>
                </div>
              ) : (
                "Request Rematch"
              )}
            </button>
          )}

          {/* Return to lobby */}
          {onReturnToLobby && (
            <button
              className="w-full py-2 rounded bg-[#2a5bd7] text-white hover:bg-[#3b6cf0] transition font-medium"
              onClick={onReturnToLobby}
            >
              Return to Lobby
            </button>
          )}
        </>
      ) : (
        <>
          {/* =============== IN-GAME CONTROLS =============== */}

          {/* Offer Draw */}
          {onOfferDraw && (
            <button
              className="w-full p-2 rounded bg-[#2a2f3b] text-text-primary hover:bg-[#343a48] transition disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={onOfferDraw}
              disabled={drawOfferDisabled}
            >
              <div className="flex flex-col leading-tight">
                <span className="block">
                  {drawOfferLabel?.includes("pending")
                    ? "Offer Draw"
                    : drawOfferLabel ?? "Offer Draw"}
                </span>

                {drawOfferLabel?.includes("pending") && (
                  <span className="block text-xs text-text-muted mt-0.5">
                    (pending…)
                  </span>
                )}
              </div>
            </button>
          )}

          {/* Resign */}
          {onResign && (
            <button
              className="w-full py-2 rounded bg-[#5a1f1f] text-text-primary hover:bg-[#742626] transition"
              onClick={onResign}
            >
              Resign
            </button>
          )}
        </>
      )}

      {/* =============== ALWAYS ON – NAV CONTROLS =============== */}
      <div className="flex flex-col gap-2 mt-1">

        {/* Prev / Next */}
        <div className="flex gap-2">
          <button
            className="flex-1 p-2 px-3 rounded bg-[#1c2029] text-text-muted hover:bg-[#232833] disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onPrev}
            disabled={currentMove <= -1}
          >
            ←
          </button>

          <button
            className="flex-1 p-2 px-3 rounded bg-[#1c2029] text-text-muted hover:bg-[#232833] disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onNext}
            disabled={currentMove + 1 >= totalMoves}
          >
            →
          </button>
        </div>

        {/* Start / End */}
        <div className="flex gap-2">
          <button
            className="flex-1 p-2 px-3 rounded bg-[#1c2029] text-text-muted hover:bg-[#232833] disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onGoStart}
            disabled={currentMove === -1}
          >
            ⏮
          </button>

          <button
            className="flex-1 p-2 px-3 rounded bg-[#1c2029] text-text-muted hover:bg-[#232833] disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onGoEnd}
            disabled={currentMove + 1 >= totalMoves}
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameControls;
