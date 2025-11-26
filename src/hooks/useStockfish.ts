// src/hooks/useStockfish.ts
import { useEffect, useRef, useState, useCallback } from "react";
import type { DifficultyLevel } from "../lib/difficultyConfig";

export function useStockfish(
  gameFen: string, 
  difficulty: DifficultyLevel, 
  isAiTurn: boolean
) {
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const engineRef = useRef<Worker | null>(null);

  // 1. Initialize Worker
  useEffect(() => {
    // This points to the file you saved in /public/stockfish/stockfish.js
    const worker = new Worker("/stockfish/stockfish.js");
    engineRef.current = worker;

    worker.onmessage = (event) => {
      const msg = event.data;
      
      // Listen for the "bestmove" command from the engine
      if (typeof msg === "string" && msg.startsWith("bestmove")) {
        const move = msg.split(" ")[1];
        setBestMove(move);
      }
      
      if (msg === "readyok") {
        setEngineReady(true);
      }
    };

    // Initialize UCI protocol
    worker.postMessage("uci");
    
    return () => {
      worker.terminate();
    };
  }, []);

  // 2. Configure Engine when Difficulty Changes
  useEffect(() => {
    if (!engineRef.current) return;

    // Stop any current search
    engineRef.current.postMessage("stop");
    console.log(`[Stockfish] Setting Skill Level to ${difficulty.stockfishSkillLevel}`);
    
    // Set the skill level (0-20)
    // We use the mapping from your difficultyConfig.ts
    engineRef.current.postMessage(`setoption name Skill Level value ${difficulty.stockfishSkillLevel}`);
    console.log(`[Stockfish] Thinking... Depth: ${difficulty.stockfishDepth}, Time: ${difficulty.moveTime}ms`);
    // Ensure the engine knows the skill level is set
    engineRef.current.postMessage("isready");
  }, [difficulty]);

  // 3. Trigger AI Move
  useEffect(() => {
    if (!engineRef.current || !isAiTurn || !engineReady) return;

    // Reset best move so we don't repeat the last one
    setBestMove(null);

    // Send current board position
    engineRef.current.postMessage(`position fen ${gameFen}`);

    // Start calculating
    // We use the depth and movetime from your difficultyConfig.ts
    const command = `go depth ${difficulty.stockfishDepth} movetime ${difficulty.moveTime}`;
    engineRef.current.postMessage(command);

  }, [gameFen, isAiTurn, difficulty, engineReady]);

  return { bestMove };
}