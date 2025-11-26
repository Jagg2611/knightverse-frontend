// frontend/src/pages/AIGamePage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useNavigate } from "react-router-dom";
import { showToast } from "../lib/toast";
import GameResultModal from "../components/GameResultModal";
import ChessLoadingScreen from "../components/ChessLoadingScreen";

// Sound imports
import moveSelfSfx from "../sounds/standard/move-self.mp3";
import captureSfx from "../sounds/standard/capture.mp3";
import illegalSfx from "../sounds/standard/illegal.mp3";
import checkSfx from "../sounds/standard/move-check.mp3";
import castleSfx from "../sounds/standard/castle.mp3";
import promoteSfx from "../sounds/standard/promote.mp3";
import gameStartSfx from "../sounds/standard/game-start.mp3";
import gameEndSfx from "../sounds/standard/game-end.mp3";

// --------- Helpers ---------

// --- Mobile Mode Detection Hook (Safe, UI-Independent) ---
function useMobileMode() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [boardKey, setBoardKey] = React.useState(0);

  React.useEffect(() => {
    const handler = () => {
      const nowMobile = window.innerWidth < 768;

      setIsMobile(prev => {
        if (prev !== nowMobile) {
          setBoardKey(k => k + 1); // 🔥 Remount chessboard for touch/mouse switch
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


function playSound(file: string) {
  const audio = new Audio(file);
  audio.volume = 0.8;
  audio.play().catch(() => {});
}

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

// Skill level to ELO mapping
function getEloForLevel(level: number): number {
  const eloMap: Record<number, number> = {
    1: 800, 2: 900, 3: 1000, 4: 1100, 5: 1200,
    6: 1300, 7: 1400, 8: 1500, 9: 1600, 10: 1700,
    11: 1800, 12: 1900, 13: 2000, 14: 2100, 15: 2200,
    16: 2300, 17: 2400, 18: 2500, 19: 2600, 20: 2700
  };
  return eloMap[level] || 1500;
}

function getLevelDescription(level: number): string {
  if (level <= 3) return "Beginner";
  if (level <= 6) return "Casual";
  if (level <= 10) return "Intermediate";
  if (level <= 14) return "Advanced";
  if (level <= 17) return "Master";
  return "Grandmaster";
}

// ------------------ COMPONENT ------------------

const AIGamePage: React.FC = () => {
  const navigate = useNavigate();

  // Game state
    const { isMobile, boardKey } = useMobileMode();

  const [game, setGame] = useState(new Chess());
  const [isPlayerWhite, setIsPlayerWhite] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState(10);
  const [aiThinking, setAiThinking] = useState(false);
  const [engineReady, setEngineReady] = useState(false);

  // Stockfish Worker Ref
  const engine = useRef<Worker | null>(null);
  const movesEndRef = useRef<HTMLTableRowElement>(null);

  // UI State
  const [lastMoveSquares, setLastMoveSquares] = useState<{ from: string; to: string } | null>(null);
  const [moveHints, setMoveHints] = useState<Record<string, React.CSSProperties>>({});
  const [ghostTrail, setGhostTrail] = useState<{ from: string; to: string } | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultText, setResultText] = useState("");

  const boardOrientation = isPlayerWhite ? "white" : "black";

  // ✅ Prevent double sounds with debouncing
  const soundPlayingRef = useRef(false);
  const playSoundOnce = useCallback((file: string) => {
    if (soundPlayingRef.current) return;
    soundPlayingRef.current = true;
    playSound(file);
    setTimeout(() => {
      soundPlayingRef.current = false;
    }, 200);
  }, []);

  // ------------------ STOCKFISH SETUP ------------------

  useEffect(() => {
    const stockfishUrl = "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.0/stockfish.js";
    
    fetch(stockfishUrl)
      .then((response) => response.text())
      .then((scriptContent) => {
        const blob = new Blob([scriptContent], { type: "application/javascript" });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);
        
        engine.current = worker;
        
        worker.onmessage = (event) => {
          const line = event.data;
          if (line === "uciok") {
            setEngineReady(true);
          }
          
          if (typeof line === "string" && line.startsWith("bestmove")) {
            const moveData = line.split(" ");
            const bestMoveLan = moveData[1]; 
            
            if (bestMoveLan && bestMoveLan !== "(none)") {
              const from = bestMoveLan.substring(0, 2);
              const to = bestMoveLan.substring(2, 4);
              const promotion = bestMoveLan.length > 4 ? bestMoveLan.substring(4, 5) : undefined;
              
              applyEngineMove({ from, to, promotion });
            }
          }
        };

        worker.postMessage("uci");
        worker.postMessage("isready");
      })
      .catch((err) => console.error("Failed to load Stockfish", err));

    return () => {
      if (engine.current) engine.current.terminate();
    };
  }, []);

  useEffect(() => {
    if (engine.current && engineReady) {
      const skillLevel = Math.min(20, Math.max(0, aiDifficulty));
      engine.current.postMessage(`setoption name Skill Level value ${skillLevel}`);
    }
  }, [aiDifficulty, engineReady]);

  // ------------------ GAME HELPERS ------------------

  const safeGameMutate = useCallback((modify: (g: Chess) => any) => {
    setGame((g) => {
      const update = new Chess();
      update.loadPgn(g.pgn());
      const move = modify(update);
      
      if (move) {
        setLastMoveSquares({ from: move.from, to: move.to });
        
        // ✅ Use debounced sound function
        if (move.captured) playSoundOnce(captureSfx);
        else if (move.san.includes("#")) playSoundOnce(gameEndSfx);
        else if (move.san.includes("+")) playSoundOnce(checkSfx);
        else if (move.san === "O-O" || move.san === "O-O-O") playSoundOnce(castleSfx);
        else if (move.san.includes("=")) playSoundOnce(promoteSfx);
        else playSoundOnce(moveSelfSfx);

        setGhostTrail({ from: move.from, to: move.to });
        setTimeout(() => setGhostTrail(null), 300);

        if (update.isGameOver()) {
          setTimeout(() => handleGameOver(update), 500);
        }
      }
      return update;
    });
  }, [playSoundOnce]);

  // ------------------ AI LOGIC ------------------

  const applyEngineMove = (moveObj: { from: string; to: string; promotion?: string }) => {
    setAiThinking(false);
    safeGameMutate((g) => {
      return g.move(moveObj);
    });
  };

  const makeAIMove = useCallback(() => {
    if (!engine.current || !engineReady || game.isGameOver()) return;

    const turn = game.turn();
    const isAiTurn = (isPlayerWhite && turn === 'b') || (!isPlayerWhite && turn === 'w');
    
    if (!isAiTurn) return;

    setAiThinking(true);
    
    const delay = Math.floor(Math.random() * 500) + 500;
    
    setTimeout(() => {
        engine.current?.postMessage(`position fen ${game.fen()}`);
        
        let depth = 10;
        if (aiDifficulty <= 5) depth = 2;
        else if (aiDifficulty <= 10) depth = 5;
        else if (aiDifficulty <= 15) depth = 10;
        else depth = 18;

        engine.current?.postMessage(`go depth ${depth}`);
    }, delay);

  }, [game, engineReady, aiDifficulty, isPlayerWhite]);

  useEffect(() => {
    if (gameStarted && !game.isGameOver()) {
      const turn = game.turn();
      const isAiTurn = (isPlayerWhite && turn === 'b') || (!isPlayerWhite && turn === 'w');
      
      if (isAiTurn && !aiThinking) {
        makeAIMove();
      }
    }
  }, [game, gameStarted, isPlayerWhite, aiThinking, makeAIMove]);

  // ------------------ PLAYER MOVE ------------------

  function onPieceDrop(sourceSquare: string, targetSquare: string) {
    if (!gameStarted || aiThinking || game.isGameOver()) return false;

    const tempGame = new Chess();
    tempGame.loadPgn(game.pgn());
    
    try {
      const move = tempGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });

      if (!move) {
          playSoundOnce(illegalSfx);
          return false;
      }

      safeGameMutate((g) => {
        return g.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });
      });
      
      return true;
    } catch (e) {
      playSoundOnce(illegalSfx);
      return false;
    }
  }

  function onPieceClick(square: string) {
    if (!gameStarted || aiThinking || game.isGameOver()) return;
    
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      const moves = game.moves({ square: square as any, verbose: true });
      if (moves.length > 0) {
        const hints: Record<string, React.CSSProperties> = {};
        for (const m of moves) {
          hints[m.to] = { boxShadow: "inset 0 0 10px 3px rgba(0, 170, 255, 0.5)" };
        }
        setMoveHints(hints);
      }
    }
  }

  // ------------------ SETUP & UTILS ------------------

  function startGame(playAsWhite: boolean) {
    setIsPlayerWhite(playAsWhite);
    setGameStarted(true);
    
    const newGame = new Chess();
    setGame(newGame);
    setLastMoveSquares(null);
    setShowResultModal(false);
    playSoundOnce(gameStartSfx);
    
    engine.current?.postMessage("ucinewgame");
    
    showToast.success(
      `Game started! You play as ${playAsWhite ? "White" : "Black"}`
    );
  }

  function handleGameOver(finalGame: Chess) {
    playSoundOnce(gameEndSfx);
    let result = "";

    if (finalGame.isCheckmate()) {
      const winner = finalGame.turn() === "w" ? "Black" : "White";
      const isPlayerWin = (winner === "White" && isPlayerWhite) || (winner === "Black" && !isPlayerWhite);
      result = isPlayerWin ? "Checkmate — You Win! 🎉" : "Checkmate — AI Wins! 🤖";
    } else if (finalGame.isStalemate()) {
      result = "Stalemate — Draw! 🤝";
    } else if (finalGame.isThreefoldRepetition()) {
      result = "Draw by Threefold Repetition! 🔄";
    } else if (finalGame.isInsufficientMaterial()) {
      result = "Draw by Insufficient Material! ⚖️";
    } else if (finalGame.isDraw()) {
      result = "Game Drawn! 🤝";
    } else {
      result = "Game Over! 🏁";
    }

    setResultText(result);
    setShowResultModal(true);
  }

  function onDragStart(piece: string, sourceSquare: string) {
    if (!gameStarted || aiThinking || game.isGameOver()) return false;
    const moves = game.moves({ square: sourceSquare as any, verbose: true });
    if (!moves.length) return false;

    const hints: Record<string, React.CSSProperties> = {};
    for (const m of moves) {
      hints[m.to] = { boxShadow: "inset 0 0 10px 3px rgba(0, 170, 255, 0.5)" };
    }
    setMoveHints(hints);
    return true;
  }

  function onDragEnd() {
    setMoveHints({});
  }

  // ------------------ RENDER HELPERS ------------------

  const rows = React.useMemo(() => buildMoveRows(game.pgn()), [game]);

  useEffect(() => {
    movesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rows]);

  const displayFen = game.fen();
  const checkSquare = React.useMemo(() => getCheckSquare(new Chess(displayFen)), [displayFen]);
  
  const squareStyles = {
    ...ghostTrail ? { [ghostTrail.from]: { className: "ghost-trail" }, [ghostTrail.to]: { className: "ghost-trail" } } : {},
    ...lastMoveSquares ? { [lastMoveSquares.from]: { backgroundColor: "rgba(255,255,0,0.6)" }, [lastMoveSquares.to]: { backgroundColor: "rgba(255,255,0,0.6)" } } : {},
    ...moveHints,
    ...checkSquare ? { [checkSquare]: { boxShadow: "inset 0 0 16px 5px red" } } : {},
  };

  // ✅ Show loading screen
  if (!engineReady) return <ChessLoadingScreen />;

  return (
    <div className="landing-main !h-screen !overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-xl font-bold mt-10 mb-8 text-center"> Play vs Stockfish</h1>

        {!gameStarted ? (
          <div className="max-w-2xl mx-auto bg-elevated rounded-lg p-8 space-y-6">
            
            {/* Difficulty Slider */}
            <div>
              <label className="block text-lg font-semibold mb-3">
                Engine Strength: Level {aiDifficulty}
              </label>
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={aiDifficulty} 
                onChange={(e) => setAiDifficulty(Number(e.target.value))} 
                className="w-full h-2 bg-[#2a2f3b] rounded-lg cursor-pointer accent-blue-600" 
              />
              
              {/* ✅ Rating Info Display */}
              <div className="mt-4 p-4 bg-[#1a1d26] rounded-lg border border-[#2a2f3b]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-text-muted">Skill Level</div>
                    <div className="text-2xl font-bold text-text-primary">{getLevelDescription(aiDifficulty)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-text-muted">Estimated Rating</div>
                    <div className="text-2xl font-bold text-[#49c85f]">{getEloForLevel(aiDifficulty)}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between text-sm text-text-muted mt-2">
                <span>Beginner</span>
                <span>Intermediate</span>
                <span>Grandmaster</span>
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-lg font-semibold mb-3">Play as:</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => startGame(true)} 
                  className="py-4 px-6 bg-[#2a5bd7] hover:bg-[#3b6cf0] rounded-lg font-medium transition"
                >
                  ⚪ White
                </button>
                <button 
                  onClick={() => startGame(false)} 
                  className="py-4 px-6 bg-[#2a2f3b] hover:bg-[#343a48] rounded-lg font-medium transition"
                >
                  ⚫ Black
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => navigate("/play")} 
              className="w-full py-3 bg-[#2a2f3b] hover:bg-[#343a48] rounded-lg transition"
            >
              ← Back to Lobby
            </button>
          </div>
        ) : (
          <div className="relative w-full flex flex-col lg:flex-row gap-6 justify-center">
            {/* BOARD AREA */}
            <div className="flex flex-col items-center w-full lg:w-auto">
               {/* Top Info (AI) */}
               <div className="w-full max-w-[600px] flex items-center justify-between px-4 py-2 bg-elevated rounded-t-md">
                 <div className="flex flex-col">
                   <span className="text-lg font-bold text-text-primary flex items-center gap-2">
                    Stockfish
                   </span>
                   <span className="text-xs text-text-muted">Rating: {getEloForLevel(aiDifficulty)}</span>
                 </div>
                 {aiThinking && (
                   <div className="text-xs bg-blue-900 text-blue-200 px-3 py-1 rounded-full animate-pulse">
                     Thinking...
                   </div>
                 )}
               </div>
               
               {/* Chessboard */}
               <div className="board-container">
                  <Chessboard 
                  key={`ai-board-${isMobile ? "m" : "d"}-${boardKey}`}
                    position={displayFen} 
                    onPieceDrop={onPieceDrop} 
                    onDragStart={onDragStart} 
                    onDragEnd={onDragEnd} 
                    boardOrientation={boardOrientation}
                    arePiecesDraggable={!aiThinking && !game.isGameOver()}
                    customBoardStyle={{ borderRadius: "4px", boxShadow: "0 5px 15px rgba(0,0,0,0.5)" }}
                    customSquareStyles={squareStyles}
                  />
               </div>

               {/* Bottom Info (Player) */}
               <div className="w-full max-w-[600px] flex items-center justify-between px-4 py-2 bg-elevated rounded-b-md mt-1">
                 <div className="flex flex-col">
                   {/* <span className="text-lg font-bold text-text-primary">👤 You</span> */}
                   <span className="text-xs text-text-muted"></span>
                 </div>
               </div>

               {/* 📱 MOBILE ACTION BUTTONS (Hidden on Desktop) */}
               <div className="w-full max-w-[600px] flex flex-row gap-3 mt-4 lg:hidden">
                  <button 
                    onClick={() => { setGameStarted(false); setGame(new Chess()); }} 
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition text-sm"
                  >
                    🔄 New Game
                  </button>
                  <button 
                    onClick={() => navigate("/play")} 
                    className="flex-1 py-3 bg-[#2a2f3b] hover:bg-[#343a48] rounded-lg transition text-sm"
                  >
                    ← Lobby
                  </button>
               </div>
            </div>

            {/* 🖥️ DESKTOP SIDEBAR (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:w-[350px] flex-col gap-4">
               {/* Actions */}
               <div className="bg-elevated p-4 rounded-lg flex flex-col gap-2">
                  <button onClick={() => { setGameStarted(false); setGame(new Chess()); }} className="py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded">New Game</button>
                  <button onClick={() => navigate("/play")} className="py-2 bg-[#2a2f3b] hover:bg-[#343a48] rounded">Return to Lobby</button>
               </div>

               {/* Moves List */}
               <div className="bg-elevated rounded-md p-4 flex-1">
                 <h2 className="text-xl font-semibold mb-2">Moves</h2>
                 <div className="border-t border-border-subtle pt-2 h-60 overflow-y-auto">
                    <table className="move-table">
                      <thead>
                        <tr>
                          <th style={{ width: "12%" }}>#</th>
                          <th style={{ width: "44%" }}>White</th>
                          <th style={{ width: "44%" }}>Black</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.number} className="move-row">
                            <td>{r.number}.</td>
                            <td>{r.white}</td>
                            <td>{r.black}</td>
                          </tr>
                        ))}
                        <tr ref={movesEndRef}></tr>
                      </tbody>
                    </table>
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>

      <GameResultModal
        visible={showResultModal}
        resultText={resultText}
        onClose={() => {
          setShowResultModal(false);
          setGameStarted(false);
          setGame(new Chess());
        }}
      />
    </div>
  );
};

export default AIGamePage;