import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { GET_GAME_QUERY, ME_QUERY } from "../lib/graphql";
import ChessLoadingScreen from "../components/ChessLoadingScreen";

interface MoveRow {
  number: number;
  white?: string;
  black?: string;
}

function buildMoveRows(pgn: string): MoveRow[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return [];
  }
  const moves = chess.history();
  const rows: MoveRow[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      number: i / 2 + 1,
      white: moves[i],
      black: moves[i + 1] ?? "",
    });
  }
  return rows;
}

function getCheckSquare(gameInstance: Chess): string | null {
  if (!gameInstance.inCheck()) return null;
  const turn = gameInstance.turn();
  const board = gameInstance.board();
  const files = "abcdefgh";
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === "k" && piece.color === turn) {
        return files[file] + (8 - rank);
      }
    }
  }
  return null;
}

// --- Mobile Mode Hook ---
function useMobileMode() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [boardKey, setBoardKey] = React.useState(0);

  React.useEffect(() => {
    const handler = () => {
      const nowMobile = window.innerWidth < 768;
      setIsMobile((prev) => {
        if (prev !== nowMobile) {
          setBoardKey((k) => k + 1);
        }
        return nowMobile;
      });
    };
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return { isMobile, boardKey };
}

const GameViewerPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const movesEndRef = useRef<HTMLTableRowElement>(null);

  const { data: meData } = useQuery(ME_QUERY);
  const { data, loading, error } = useQuery(GET_GAME_QUERY, {
    variables: { gameId },
    skip: !gameId,
  });

  const [navigationIndex, setNavigationIndex] = useState(-1);

  // --- RESIZE LOGIC ---
  const [boardSize, setBoardSize] = useState<number>(400);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const { isMobile, boardKey } = useMobileMode();

  useLayoutEffect(() => {
    if (!boardContainerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.width !== boardSize) {
          setBoardSize(entry.contentRect.width);
        }
      }
    });
    resizeObserver.observe(boardContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [isMobile]);

  const game = data?.game;
  const currentUserId = meData?.me?._id;

  // Build move list from PGN
  const sanMoves = useMemo(() => {
    if (!game?.pgn) return [];
    const chess = new Chess();
    try {
      chess.loadPgn(game.pgn);
      return chess.history();
    } catch {
      return [];
    }
  }, [game?.pgn]);

  const rows = useMemo(() => {
    return game?.pgn ? buildMoveRows(game.pgn) : [];
  }, [game?.pgn]);

  // Calculate FEN for current position
  const displayFen = useMemo(() => {
    if (navigationIndex === -1) {
      return new Chess().fen(); // Start position
    }
    const chess = new Chess();
    for (let i = 0; i <= navigationIndex; i++) {
      if (sanMoves[i]) chess.move(sanMoves[i]);
    }
    return chess.fen();
  }, [navigationIndex, sanMoves]);

  const displayGame = useMemo(() => new Chess(displayFen), [displayFen]);

  // Navigation functions
  const jumpTo = (index: number) => setNavigationIndex(index);
  const goStart = () => setNavigationIndex(-1);
  const goEnd = () => setNavigationIndex(sanMoves.length - 1);
  const goPrev = () => setNavigationIndex(Math.max(-1, navigationIndex - 1));
  const goNext = () => setNavigationIndex(Math.min(sanMoves.length - 1, navigationIndex + 1));

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [navigationIndex, sanMoves.length]);

  // Auto-scroll to current move in list
  useEffect(() => {
    if (movesEndRef.current && navigationIndex === sanMoves.length - 1) {
      movesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [navigationIndex, sanMoves.length]);

  // Board styling
  const checkSquare = getCheckSquare(displayGame);
  const squareStyles = checkSquare
    ? { [checkSquare]: { boxShadow: "inset 0 0 16px 5px red" } }
    : {};

  if (loading) return <ChessLoadingScreen />;
  if (error) return <div className="landing-main flex items-center justify-center text-red-400">Error: {error.message}</div>;
  if (!game) return <div className="landing-main flex items-center justify-center text-text-muted">Game not found</div>;

  const isWhite = game.whitePlayer._id === currentUserId;
  const boardOrientation = isWhite ? "white" : "black";

  const topPlayer = boardOrientation === "white" ? game.blackPlayer : game.whitePlayer;
  const bottomPlayer = boardOrientation === "white" ? game.whitePlayer : game.blackPlayer;

  return (
    // FIX: Removed !pt-24. Using !justify-start for mobile, !justify-center for desktop.
    <div className="landing-main !justify-start md:!justify-center !h-auto !min-h-screen !overflow-y-auto pb-10">
      
      {/* ✅ MOBILE ONLY HEADER:
         - Uses 'md:hidden' (768px) to perfectly match the switch point.
         - 'mt-[80px]' ensures it clears the fixed header.
         - 'mb-4' adds space before the board.
      */}
      <div className="w-full max-w-[600px] mt-[80px] mb-4 md:hidden flex items-center justify-center">
        <button 
          onClick={() => navigate("/history")}
          className="px-4 py-2 bg-[#2a2f3b] hover:bg-[#343a48] rounded text-sm transition flex items-center gap-2 shadow-lg border border-[#3a4256]"
        >
          <span>←</span> Back to History
        </button>
      </div>

      {/* Responsive Container: Stack on mobile, Row on desktop */}
      <div className="relative w-full flex flex-col md:flex-row gap-4 md:gap-8 items-center md:items-start justify-center">
        
        {/* LEFT — BOARD */}
        <div className="w-full md:w-auto flex flex-col items-center flex-shrink-0">
          {/* TOP PLAYER */}
          <div className="w-full max-w-[600px] flex items-center justify-between px-4 py-2 bg-elevated rounded-t-md">
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-text-primary">
                {topPlayer?.username || "Opponent"}
              </span>
              <span className="text-xs text-text-muted">Rating: 1200</span>
            </div>
            
            {game.status === "COMPLETED" && (
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                game.winner === "DRAW" ? "bg-yellow-600 text-black" :
                ((boardOrientation === "white" && game.winner === "BLACK") || (boardOrientation === "black" && game.winner === "WHITE"))
                  ? "bg-green-600 text-white" : "bg-[#2a2f3b] text-text-muted"
              }`}>
                {game.winner === "DRAW" ? "Draw" : 
                 ((boardOrientation === "white" && game.winner === "BLACK") || (boardOrientation === "black" && game.winner === "WHITE"))
                 ? "Winner" : ""}
              </div>
            )}
          </div>
          
          {/* BOARD */}
          <div className="board-container" ref={boardContainerRef} style={{ touchAction: "none" }}>
            {boardSize > 0 && (
              <Chessboard
                key={`replay-board-${boardKey}-${boardSize}`}
                position={displayFen}
                boardOrientation={boardOrientation}
                arePiecesDraggable={false}
                animationDuration={250}
                customBoardStyle={{
                  borderRadius: "8px",
                  boxShadow: "0 0 15px rgba(0,0,0,0.4)",
                }}
                customSquareStyles={squareStyles}
                boardWidth={boardSize}
              />
            )}
          </div>

          {/* BOTTOM PLAYER */}
          <div className="w-full max-w-[600px] flex items-center justify-between px-4 py-2 bg-elevated rounded-b-md mt-1">
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-text-primary">
                {bottomPlayer?.username}
              </span>
              <span className="text-xs text-text-muted">Rating: 1200</span>
            </div>
            
            {game.status === "COMPLETED" && game.winner !== "DRAW" && (
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                ((boardOrientation === "white" && game.winner === "WHITE") || (boardOrientation === "black" && game.winner === "BLACK"))
                  ? "bg-green-600 text-white" : "bg-[#2a2f3b] text-text-muted"
              }`}>
                {((boardOrientation === "white" && game.winner === "WHITE") || (boardOrientation === "black" && game.winner === "BLACK"))
                 ? "Winner" : ""}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — MOVES PANEL */}
        <div className="flex flex-col w-full md:w-[380px] flex-shrink-0 max-w-[600px]">
          <div className="bg-elevated rounded-md p-4 flex flex-col h-[500px] md:h-[680px]">
            
            {/* DESKTOP ONLY: Header */}
            <div className="hidden md:flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Moves</h2>
              <button
                onClick={() => navigate("/history")}
                className="px-3 py-1 bg-[#2a2f3b] hover:bg-[#343a48] rounded text-sm transition"
              >
                ← Back
              </button>
            </div>

            {/* Navigation Controls */}
            <div className="flex gap-2 mb-3 pb-3 border-b border-border-subtle flex-shrink-0">
              <button onClick={goStart} disabled={navigationIndex === -1} className="flex-1 py-3 bg-[#2a2f3b] hover:bg-[#343a48] rounded disabled:opacity-40 transition text-xl">⏮</button>
              <button onClick={goPrev} disabled={navigationIndex <= -1} className="flex-1 py-3 bg-[#2a2f3b] hover:bg-[#343a48] rounded disabled:opacity-40 transition text-xl">←</button>
              <button onClick={goNext} disabled={navigationIndex >= sanMoves.length - 1} className="flex-1 py-3 bg-[#2a2f3b] hover:bg-[#343a48] rounded disabled:opacity-40 transition text-xl">→</button>
              <button onClick={goEnd} disabled={navigationIndex >= sanMoves.length - 1} className="flex-1 py-3 bg-[#2a2f3b] hover:bg-[#343a48] rounded disabled:opacity-40 transition text-xl">⏭</button>
            </div>

            {/* Move counter */}
            <div className="text-center text-sm text-text-muted mb-3 flex-shrink-0">
              Move {navigationIndex === -1 ? 0 : Math.floor(navigationIndex / 2) + 1} / {Math.ceil(sanMoves.length / 2)}
            </div>

            {/* Moves List */}
            <div className="flex-1 overflow-y-auto border-t border-border-subtle pt-2 min-h-0">
              <table className="move-table w-full">
                <thead>
                  <tr>
                    <th style={{ width: "15%" }}>#</th>
                    <th style={{ width: "42.5%" }}>White</th>
                    <th style={{ width: "42.5%" }}>Black</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const whiteIndex = (r.number - 1) * 2;
                    const blackIndex = whiteIndex + 1;
                    const isWhiteActive = navigationIndex === whiteIndex;
                    const isBlackActive = navigationIndex === blackIndex;

                    return (
                      <tr key={r.number} className="move-row">
                        <td className="text-text-muted font-semibold">{r.number}.</td>
                        <td onClick={() => jumpTo(whiteIndex)} className={`cursor-pointer transition px-2 py-1 rounded ${isWhiteActive ? "bg-[#49c85f] text-black font-bold" : "hover:bg-[#2a2f3b]"}`}>{r.white}</td>
                        <td onClick={() => r.black && jumpTo(blackIndex)} className={`cursor-pointer transition px-2 py-1 rounded ${isBlackActive ? "bg-[#49c85f] text-black font-bold" : "hover:bg-[#2a2f3b]"}`}>{r.black}</td>
                        {(isWhiteActive || isBlackActive) && <td ref={movesEndRef} style={{ display: 'none' }} />}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameViewerPage;