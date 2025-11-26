// src/pages/GamePage.tsx
import React from "react";
import { useParams } from "react-router-dom";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import GameControls from "../components/GameControls";
import { showToast } from "../lib/toast";
import ChessLoadingScreen from "../components/ChessLoadingScreen";
import MobileChatDrawer from "../components/MobileChatDrawer";
import MobileGameControls from "../components/MobileGameControls";

import { useQuery, useMutation, useSubscription } from "@apollo/client/react";
// ---- Sound Imports ----
import moveSelfSfx from "../sounds/standard/move-self.mp3";
import captureSfx from "../sounds/standard/capture.mp3";
import illegalSfx from "../sounds/standard/illegal.mp3";
import checkSfx from "../sounds/standard/move-check.mp3";
import castleSfx from "../sounds/standard/castle.mp3";
import promoteSfx from "../sounds/standard/promote.mp3";
import gameStartSfx from "../sounds/standard/game-start.mp3";
import gameEndSfx from "../sounds/standard/game-end.mp3";

import {
  GET_GAME_QUERY,
  GAME_UPDATED_SUBSCRIPTION,
  MAKE_MOVE_MUTATION,
  GET_MESSAGES_QUERY,
  SEND_MESSAGE_MUTATION,
  MESSAGE_SUBSCRIPTION,
  RESIGN_GAME_MUTATION,
  OFFER_DRAW_MUTATION,
  RESPOND_DRAW_MUTATION,
  ME_QUERY,
  OFFER_REMATCH_MUTATION,
  RESPOND_REMATCH_MUTATION,
} from "../lib/graphql";

import GameChat from "../components/GameChat";
import GameResultModal from "../components/GameResultModal";
import { useNavigate } from "react-router-dom";

// --------- Types ---------
interface Player {
  _id: string;
  username: string;
  stats?: {
    wins: number;
    losses: number;
    draws: number;
  };
}

interface Game {
  _id: string;
  fen: string;
  pgn: string;
  status: string;
  winner: string;
  timeControl?: string | null;

  whitePlayer: Player;
  blackPlayer?: Player | null;

  whiteTimeLeft: number;
  blackTimeLeft: number;
  lastMoveAt: string | null;

  drawOffered: boolean;
  drawOfferedBy?: Player | null;
  whiteDrawOffers: number;
  blackDrawOffers: number;
}

interface MoveRow {
  number: number;
  white?: string;
  black?: string;
}

// --------- Helpers ---------

function buildMoveRowsFromPgn(pgn?: string | null): MoveRow[] {
  if (!pgn) return [];
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

function playSound(file: string) {
  const audio = new Audio(file);
  audio.volume = 0.8;
  audio.play().catch(() => {});
}

function formatClock(seconds?: number) {
  if (typeof seconds !== "number" || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// king in check highlight logic
function getCheckSquare(fen: string | undefined): string | null {
  if (!fen) return null;

  const chess = new Chess(fen);
  if (!chess.inCheck()) return null;

  const turn = chess.turn();
  const board = chess.board();
  const files = "abcdefgh";

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece.type === "k" && piece.color === turn) {
        const square = files[file] + (8 - rank);
        return square;
      }
    }
  }
  return null;
}

// ------------------ COMPONENT ------------------

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: meData, loading: meLoading } = useQuery(ME_QUERY);
  const currentUserId = meData?.me?._id;

  const [game, setGame] = React.useState<Game | null>(null);
  const [fen, setFen] = React.useState<string>("start");

  // Navigation mode state
  const [navigationFen, setNavigationFen] = React.useState<string | null>(null);
  const [navigationIndex, setNavigationIndex] = React.useState<number>(-1);

  const [whiteClock, setWhiteClock] = React.useState<number | undefined>();
  const [blackClock, setBlackClock] = React.useState<number | undefined>();
  const [boardSize, setBoardSize] = React.useState<number>(400);
    const [showResultModal, setShowResultModal] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(false);

  const boardWrapperRef = React.useRef<HTMLDivElement>(null);

  // 2. Add resize logic to make board fit the screen
  // Board sizing effect - handles initial render and window resize
  React.useEffect(() => {
    function handleResize() {
      if (boardWrapperRef.current) {
        setBoardSize(boardWrapperRef.current.offsetWidth);
      }
    }
    
    // Force immediate calculation
    handleResize();
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      handleResize();
    });
    
    // Also add a small delay as backup
    const timeout = setTimeout(handleResize, 100);
    
    // Run whenever window resizes
    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeout);
    };
  }, [isMobile, showResultModal]);

  // ResizeObserver for dynamic container size changes
  React.useEffect(() => {
    if (!boardWrapperRef.current) return;

    const observer = new ResizeObserver(() => {
      if (boardWrapperRef.current) {
        setBoardSize(boardWrapperRef.current.offsetWidth);
      }
    });

    observer.observe(boardWrapperRef.current);

    return () => observer.disconnect();
  }, []);






  const [timeoutHandled, setTimeoutHandled] = React.useState(false);

  const [lastMoveSquares, setLastMoveSquares] = React.useState<{
    from: string;
    to: string;
  } | null>(null);
  const [moveHints, setMoveHints] = React.useState<
    Record<string, React.CSSProperties>
  >({});

  const [chatMessages, setChatMessages] = React.useState<any[]>([]);


  const [resultText, setResultText] = React.useState("");

  const [incomingDrawOffer, setIncomingDrawOffer] = React.useState(false);
  const [drawOfferFrom, setDrawOfferFrom] = React.useState<Player | null>(null);
  const [drawOfferPending, setDrawOfferPending] = React.useState(false);
  const [ghostTrail, setGhostTrail] = React.useState<{
    from: string;
    to: string;
  } | null>(null);
  const [offerDrawError, setOfferDrawError] = React.useState<string | null>(
    null
  );
  const [showResignConfirm, setShowResignConfirm] = React.useState(false);
  const [incomingRematchOffer, setIncomingRematchOffer] = React.useState(false);
  const [rematchFrom, setRematchFrom] = React.useState<Player | null>(null);

  const [rematchPending, setRematchPending] = React.useState(false);
  
  const [chatDrawerOpen, setChatDrawerOpen] = React.useState(false);
  const [boardKey, setBoardKey] = React.useState(0);
  const [forceRemount, setForceRemount] = React.useState(0);

  const ghostClasses: Record<string, any> = {};
  if (ghostTrail) {
    ghostClasses[ghostTrail.from] = { className: "ghost-trail" };
    ghostClasses[ghostTrail.to] = { className: "ghost-trail" };
  }

  // ------------------ APOLLO ------------------

  const { data, loading, error } = useQuery<{ game: Game | null }>(
    GET_GAME_QUERY,
    { variables: { gameId }, skip: !gameId }
  );

  const { data: subData } = useSubscription<{ gameUpdated: Game }>(
    GAME_UPDATED_SUBSCRIPTION,
    { variables: { gameId }, skip: !gameId }
  );

  useSubscription(MESSAGE_SUBSCRIPTION, {
    variables: { gameId },
    onData: ({ data }) => {
      const newMsg = (data as any)?.data?.newMessage;
      if (newMsg) {
        setChatMessages((prev) => [
          ...prev,
          {
            _id: newMsg._id,
            userId: newMsg.user._id,
            username: newMsg.user.username,
            text: newMsg.content,
            createdAt: newMsg.createdAt,
          },
        ]);
      }
    },
  });
const [boardRemountKey, setBoardRemountKey] = React.useState(0);
  const { data: chatData } = useQuery(GET_MESSAGES_QUERY, {
    variables: { gameId },
    skip: !gameId,
  });

  const [makeMove] = useMutation(MAKE_MOVE_MUTATION);
  const [sendMessage] = useMutation(SEND_MESSAGE_MUTATION);
  const [resignGame] = useMutation(RESIGN_GAME_MUTATION);
  const [offerDraw] = useMutation(OFFER_DRAW_MUTATION);
  const [respondDraw] = useMutation(RESPOND_DRAW_MUTATION);
  const [offerRematch] = useMutation(OFFER_REMATCH_MUTATION);
  const [respondRematch] = useMutation(RESPOND_REMATCH_MUTATION);

  const navigate = useNavigate();

  // ------------------ CHAT SEND ------------------

  async function handleSendMessage(text: string) {
    await sendMessage({
      variables: {
        input: {
          gameId,
          content: text,
        },
      },
    });
  }

  function handleLocalTimeout(color: "white" | "black") {
    console.log("Local timeout detected for:", color);

    if (!game) return;

    const amWhite = game.whitePlayer?._id === currentUserId;

    if (color === "white") {
      setResultText(amWhite ? "You Lose on Time" : "You Win on Time!");
    } else {
      setResultText(amWhite ? "You Win on Time!" : "You Lose on Time");
    }

    setTimeoutHandled(true);
    setShowResultModal(true);
  }

  // ------------------ RESIGN ------------------

  async function handleResign() {
    if (!gameId) return;

    try {
      await resignGame({
        variables: { gameId },
      });
      showToast.info("You resigned");
      setShowResignConfirm(false); // ✅ Close the card
      console.log("Resigned successfully!");
    } catch (err) {
      console.error("Failed to resign:", err);
      showToast.error("Failed to resign. Please try again.");
      setShowResignConfirm(false); // ✅ Close even on error
    }
  }

  // ------------------ DRAW OFFER HANDLERS ------------------

  async function handleOfferDrawClick() {
    if (!gameId || !game) return;
    setOfferDrawError(null);

    const amWhite = game.whitePlayer?._id === currentUserId;
    const myOffersUsed = amWhite ? game.whiteDrawOffers : game.blackDrawOffers;

    if (myOffersUsed >= 3) {
      const errorMsg = "You've already used 3 draw offers in this game.";
      setOfferDrawError(errorMsg);
      showToast.warning(errorMsg);
      return;
    }

    try {
      setDrawOfferPending(true);
      await offerDraw({ variables: { gameId } });
      showToast.info("Draw offer sent. Waiting for response...");
      // Subscription will handle the rest - no duplicate toast
    } catch (err: any) {
      setDrawOfferPending(false);
      const errorMsg = err.message ?? "Failed to offer draw";
      setOfferDrawError(errorMsg);
      showToast.error(errorMsg);
    }
  }

  async function handleRespondDraw(accept: boolean) {
    if (!gameId) return;
    try {
      await respondDraw({ variables: { gameId, accept } });
      if (accept) {
        showToast.success("Draw accepted!");
      } else {
        showToast.info("Draw offer declined");
      }
    } catch (err) {
      console.error("Failed to respond to draw:", err);
      showToast.error("Failed to respond to draw offer");
    } finally {
      setIncomingDrawOffer(false);
      setDrawOfferFrom(null);
    }
  }

  async function handleOfferRematch() {
    if (!gameId) return;

    try {
      await offerRematch({ variables: { gameId } });
      showToast.info("Rematch offer sent");
    } catch (err) {
      showToast.error("Failed to send rematch offer");
      console.error(err);
    }
  }

  async function handleRespondRematch(accept: boolean) {
    if (!gameId) return;

    try {
      await respondRematch({ variables: { gameId, accept } });
    } finally {
      // 🔥 Always clear UI
      setIncomingRematchOffer(false);
      setRematchFrom(null);
      setRematchPending(false);
    }
  }

  // ------------------ EFFECTS ------------------

  // Initial chat load
  React.useEffect(() => {
    if (chatData?.messagesForGame) {
      setChatMessages(
        chatData.messagesForGame.map((msg: any) => ({
          _id: msg._id,
          userId: msg.user._id,
          username: msg.user.username,
          text: msg.content,
          createdAt: msg.createdAt,
        }))
      );
    }
  }, [chatData]);

React.useEffect(() => {
  const checkMobile = () => {
    const nowMobile = window.innerWidth < 768;
    if (nowMobile !== isMobile) {
      setIsMobile(nowMobile);
      // Force board to remount with new key
      setBoardRemountKey(prev => prev + 1);
      // Small delay to ensure old board is fully unmounted
      setTimeout(() => {
        if (boardWrapperRef.current) {
          setBoardSize(boardWrapperRef.current.offsetWidth);
        }
      }, 50);
    }
  };

  checkMobile();
  window.addEventListener("resize", checkMobile);

  return () => window.removeEventListener("resize", checkMobile);
}, [isMobile]);

  // Initial game load
  React.useEffect(() => {
    if (data?.game) {
      if (!game) {
        playSound(gameStartSfx);
      }
      setGame(data.game);
      if (navigationFen === null) setFen(data.game.fen);
      setWhiteClock(data.game.whiteTimeLeft);
      setBlackClock(data.game.blackTimeLeft);
    }
  }, [data, navigationFen]);

  // Subscription updates (moves, draw offers, results)
  React.useEffect(() => {
    if (!subData?.gameUpdated) return;

    const updated = subData.gameUpdated;
    const amWhite = updated.whitePlayer?._id === currentUserId;

    // =============================
    // DRAW OFFER LOGIC
    // =============================

    // 1️⃣ You OFFERED a draw
    if (updated.drawOffered && updated.drawOfferedBy?._id === currentUserId) {
      setDrawOfferPending(true);
    }

    // 2️⃣ Opponent OFFERED a draw to you
    if (
      updated.drawOffered &&
      updated.drawOfferedBy?._id !== currentUserId &&
      !incomingDrawOffer
    ) {
      setIncomingDrawOffer(true);
      setDrawOfferFrom(updated.drawOfferedBy as Player);

      // ✅ FIX: Show "Opponent" if username is missing
      const opponentName =
        updated.drawOfferedBy?.username ||
        (amWhite
          ? updated.blackPlayer?.username
          : updated.whitePlayer?.username) ||
        "Opponent";
      showToast.info(`${opponentName} offered a draw`);
    }

    // 3️⃣ Draw was DECLINED by opponent
    if (
      !updated.drawOffered &&
      game?.drawOffered &&
      updated.status === "IN_PROGRESS"
    ) {
      // ✅ FIX: Show toast if YOU offered and opponent declined
      if (drawOfferPending) {
        showToast.warning("Draw offer declined");
      }

      setIncomingDrawOffer(false);
      setDrawOfferPending(false);
      setDrawOfferFrom(null);
    }

    // =============================
    // GAME END MODAL + SOUND
    // =============================
    if (updated.status === "COMPLETED" && game?.status !== "COMPLETED") {
      playSound(gameEndSfx);

      const winner = updated.winner;

      switch (updated.finishReason) {
        case "CHECKMATE":
          if (winner === "WHITE") {
            setResultText(
              amWhite ? "Checkmate — You Win!" : "Checkmate — You Lost"
            );
          } else {
            setResultText(
              amWhite ? "Checkmate — You Lost" : "Checkmate — You Win!"
            );
          }
          break;

        case "WHITE_TIMEOUT":
          setResultText(amWhite ? "You Lose on Time" : "You Win on Time!");
          break;

        case "BLACK_TIMEOUT":
          setResultText(amWhite ? "You Win on Time!" : "You Lose on Time");
          break;

        case "RESIGNATION":
          // ✅ FIX: Check who actually won to determine who resigned
          if (winner === "WHITE") {
            // White won = Black resigned
            if (amWhite) {
              // I'm white, opponent (black) resigned
              setResultText("Opponent Resigned — You Win!");
              showToast.success("Opponent resigned. You win!");
            } else {
              // I'm black, I resigned
              setResultText("You Resigned — You Lost");
              // NO TOAST - already shown in handleResign()
            }
          } else {
            // Black won = White resigned
            if (!amWhite) {
              // I'm black, opponent (white) resigned
              setResultText("Opponent Resigned — You Win!");
              showToast.success("Opponent resigned. You win!");
            } else {
              // I'm white, I resigned
              setResultText("You Resigned — You Lost");
              // NO TOAST - already shown in handleResign()
            }
          }
          break;

        case "STALEMATE":
          setResultText("Draw by Stalemate");
          break;

        case "THREEFOLD":
          setResultText("Draw by Threefold Repetition");
          break;

        case "DRAW_AGREEMENT":
          setResultText("Draw by Agreement");

          // ✅ FIX: Show toast if YOU offered the draw
          if (drawOfferPending) {
            showToast.success("Draw accepted! Game ends in a draw.");
          }
          // If opponent offered and you accepted, toast already shown in handleRespondDraw()
          break;

        default:
          setResultText("Game Over");
      }

      setShowResultModal(true);
    }

    // =============================
    // OPPONENT MOVE SOUND
    // =============================
    if (game && updated.pgn !== game.pgn) {
      const chessAfter = new Chess(updated.fen);
      const turnNow = chessAfter.turn();
      const myColor = amWhite ? "w" : "b";

      if (turnNow === myColor) {
        const tmp = new Chess();
        tmp.loadPgn(updated.pgn);
        const verboseMoves = tmp.history({ verbose: true });
        const lastMove = verboseMoves[verboseMoves.length - 1];

        if (lastMove) {
          if (lastMove.captured) {
            playSound(captureSfx);
          } else if (lastMove.san.includes("+") || lastMove.san.includes("#")) {
            playSound(checkSfx);
          } else if (lastMove.san === "O-O" || lastMove.san === "O-O-O") {
            playSound(castleSfx);
          } else if (lastMove.san.includes("=")) {
            playSound(promoteSfx);
          } else {
            playSound(moveSelfSfx);
          }
        }
      }
    }

    // =============================
    // REMATCH OFFER LOGIC
    // =============================

    // 1️⃣ Opponent sends rematch offer TO YOU
    if (
      updated.rematchOffered &&
      updated.rematchOfferedBy?._id !== currentUserId &&
      !incomingRematchOffer // prevent re-trigger spam
    ) {
      setIncomingRematchOffer(true);
      setRematchFrom(updated.rematchOfferedBy);

      const rematchSender =
        updated.rematchOfferedBy?.username ||
        (amWhite
          ? updated.blackPlayer?.username
          : updated.whitePlayer?.username) ||
        "Opponent";

      showToast.info(`${rematchSender} wants a rematch`);
    }

    // 2️⃣ YOU sent rematch offer → mark as pending
    if (
      updated.rematchOffered &&
      updated.rematchOfferedBy?._id === currentUserId
    ) {
      setRematchPending(true);
    }

    // 3️⃣ Rematch DECLINED by opponent
    if (
      game?.rematchOffered && // previously offered
      !updated.rematchOffered && // now cleared
      updated.rematchStatus === "declined"
    ) {
      if (rematchPending) {
        showToast.warning("Rematch declined");
      }
      setRematchPending(false);
      setIncomingRematchOffer(false);
      setRematchFrom(null);
    }
    setGame(updated);
    // 4️⃣ Rematch ACCEPTED → backend creates NEW GAME ID → redirect
    // 4️⃣ Rematch ACCEPTED → backend creates NEW GAME ID → redirect
    if (
      updated.rematchStatus === "accepted" &&
      updated.rematchGameId &&
      updated.rematchGameId !== gameId
    ) {
      // prevent duplicate triggers
      if (game?.rematchStatus !== "accepted") {
        showToast.success("Rematch accepted! Starting new game...");
        playSound(gameStartSfx);
      }

      // clear UI
      setIncomingRematchOffer(false);
      setRematchFrom(null);
      setRematchPending(false);

      navigate(`/game/${updated.rematchGameId}`);
      return;
    }

    setGame(updated);
    if (navigationFen === null) {
      setFen(updated.fen);
    }
  }, [
    subData,
    game,
    navigationFen,
    currentUserId,
    incomingDrawOffer,
    drawOfferPending,
    incomingRematchOffer,
    rematchPending,
  ]);

  // Clock timer
  React.useEffect(() => {
    if (!game) return;

    function recomputeClocks() {
      const chess = new Chess(game.fen);
      const turn = chess.turn();
      const now = Date.now();
      const lastMoveAtMs = game.lastMoveAt
        ? new Date(game.lastMoveAt).getTime()
        : null;

      // -------- WHITE CLOCK --------
      setWhiteClock(() => {
        let base = game.whiteTimeLeft;

        if (game.status === "IN_PROGRESS" && lastMoveAtMs && turn === "w") {
          const elapsedSeconds = Math.floor((now - lastMoveAtMs) / 1000);
          base = Math.max(base - elapsedSeconds, 0);

          if (base === 0 && !timeoutHandled) {
            handleLocalTimeout("white");
          }
        }
        return base;
      });

      // -------- BLACK CLOCK --------
      setBlackClock(() => {
        let base = game.blackTimeLeft;

        if (game.status === "IN_PROGRESS" && lastMoveAtMs && turn === "b") {
          const elapsedSeconds = Math.floor((now - lastMoveAtMs) / 1000);
          base = Math.max(base - elapsedSeconds, 0);

          if (base === 0 && !timeoutHandled) {
            handleLocalTimeout("black");
          }
        }
        return base;
      });
    }

    recomputeClocks();
    const interval = setInterval(recomputeClocks, 1000);
    return () => clearInterval(interval);
  }, [game, timeoutHandled]);

  // Keyboard shortcuts (move navigation)
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationIndex, game?.pgn]);

  // ------------------ TURN LOGIC ------------------

  let isWhite = false;
  let boardOrientation: "white" | "black" = "white";
  let isMyTurn = false;

  const chessTurn = game ? new Chess(game.fen).turn() : null;

  if (game && currentUserId) {
    isWhite = game.whitePlayer?._id === currentUserId;
    boardOrientation = isWhite ? "white" : "black";

    if (chessTurn) {
      isMyTurn =
        (chessTurn === "w" && isWhite) || (chessTurn === "b" && !isWhite);
    }
  }

  // ------------------ MOVE HANDLER ------------------

  const onPieceDrop = React.useCallback(
    async (from, to) => {
      if (!isMyTurn) return false;

      const chess = new Chess(fen);
      const move = chess.move({ from, to, promotion: "q" });

      if (!move) {
        playSound(illegalSfx);
        return false;
      }

      // 🔊 Sounds
      if (move.captured) {
        playSound(captureSfx);
      } else if (move.san.includes("+")) {
        playSound(checkSfx);
      } else if (move.san === "O-O" || move.san === "O-O-O") {
        playSound(castleSfx);
      } else if (move.san.includes("=")) {
        playSound(promoteSfx);
      } else {
        playSound(moveSelfSfx);
      }

      // -------------------------------------------
      // ✅ IMMEDIATELY UPDATE BOARD LOCALLY
      // -------------------------------------------
      const newFen = chess.fen();

      // If user is NOT in navigation mode, update board
      if (navigationFen === null) {
        setFen(newFen);
      }

      setLastMoveSquares({ from, to });

      try {
        await makeMove({
          variables: { makeMoveInput: { gameId, move: move.san } },
        });

        setGhostTrail({ from, to });
        setTimeout(() => setGhostTrail(null), 300);

        return true;
      } catch (err) {
        console.error("Make move failed:", err);
        showToast.error("Failed to make move. Please try again.");
        return false;
      }
    },
    [isMyTurn, fen, makeMove, gameId, navigationFen]
  );

  const onDragStart = React.useCallback(
    (piece: string, sourceSquare: string) => {
      if (!isMyTurn) return false;

      const chess = new Chess(fen);
      const moves = chess.moves({
        square: sourceSquare,
        verbose: true,
      }) as any[];

      if (!moves.length) return false;

      const hints: Record<string, React.CSSProperties> = {};
      for (const m of moves) {
        hints[m.to] = {
          boxShadow: "inset 0 0 10px 3px rgba(0, 170, 255, 0.5)",
        };
      }
      setMoveHints(hints);
      return true;
    },
    [fen, isMyTurn]
  );

  const onDragEnd = React.useCallback(() => setMoveHints({}), []);


  // ------------------ PRE-RENDER CHECKS ------------------

  if (!gameId) return <div>No game id</div>;
  if (loading && !game) return <ChessLoadingScreen />;
  if (error) {
    showToast.error("Failed to load game");
    return <div>Error: {error.message}</div>;
  }
  if (!game) return <div>Game not found</div>;

  const rows = buildMoveRowsFromPgn(game.pgn);

  // ------------------ PGN SAN ARRAY ------------------
  const chessNav = new Chess();
  try {
    if (game.pgn) chessNav.loadPgn(game.pgn);
  } catch {}
  const sanMoves = chessNav.history();

  // ------------------ NAVIGATION FUNCTIONS ------------------

  function jumpTo(index: number) {
    const c = new Chess();
    for (let i = 0; i <= index; i++) {
      if (sanMoves[i]) c.move(sanMoves[i]);
    }
    setNavigationFen(c.fen());
    setNavigationIndex(index);
  }

  function goToStart() {
    const startFen = new Chess().fen();
    setNavigationIndex(-1);
    setNavigationFen(startFen);
  }

  function goToEnd() {
    setNavigationIndex(-1);
    setNavigationFen(null);
  }

  function goPrev() {
    if (navigationIndex <= -1) return;
    jumpTo(navigationIndex - 1);
  }

  function goNext() {
    if (navigationIndex + 1 >= sanMoves.length) return;
    jumpTo(navigationIndex + 1);
  }

  // ------------------ CLOCK + LABEL LOGIC ------------------

  const topClock = boardOrientation === "white" ? blackClock : whiteClock;
  const bottomClock = boardOrientation === "white" ? whiteClock : blackClock;

  const topLabel =
    boardOrientation === "white"
      ? game.blackPlayer?.username
      : game.whitePlayer?.username;

  const bottomLabel =
    boardOrientation === "white"
      ? game.whitePlayer?.username
      : game.blackPlayer?.username;

  const isTopActive = chessTurn === (boardOrientation === "white" ? "b" : "w");

  const isBottomActive =
    chessTurn === (boardOrientation === "white" ? "w" : "b");

  // ------------------ HIGHLIGHT STYLES ------------------

  const highlightStyles = lastMoveSquares
    ? {
        [lastMoveSquares.from]: { backgroundColor: "rgba(255,255,0,0.6)" },
        [lastMoveSquares.to]: { backgroundColor: "rgba(255,255,0,0.6)" },
      }
    : {};

  const checkSquare = getCheckSquare(navigationFen ?? fen);

  const checkHighlight = checkSquare
    ? { [checkSquare]: { boxShadow: "inset 0 0 16px 5px red" } }
    : {};

  const squareStyles = {
    ...ghostClasses,
    ...highlightStyles,
    ...moveHints,
    ...checkHighlight,
  };

  // ------------------ DRAW OFFER UI PROPS ------------------

  const amWhite = game.whitePlayer?._id === currentUserId;
  const myOffersUsed = amWhite ? game.whiteDrawOffers : game.blackDrawOffers;

  const drawOfferDisabled =
    game.status !== "IN_PROGRESS" || drawOfferPending || myOffersUsed >= 3;

  const drawOfferLabel = drawOfferPending
    ? "Draw offer pending…"
    : myOffersUsed > 0
    ? `Offer Draw (${myOffersUsed}/3)`
    : "Offer Draw";

  if (meLoading) {
    return <ChessLoadingScreen />;
  }

  const PlayerStatsDisplay: React.FC<{ player: Player | null | undefined }> = ({ player }) => {
  if (!player?.stats) {
    return <span className="text-xs text-[#9ba2be]">No stats yet</span>;
  }

  const { wins, losses, draws } = player.stats;

  return (
    <div className="flex items-center gap-2 text-xs font-medium">
      <span className="text-[#4caf50]">W: {wins}</span>
      <span className="text-[#f44336]">L: {losses}</span>
      <span className="text-[#ffc107]">D: {draws}</span>
    </div>
  );
};

  // ------------------ UI ------------------

  return (
    <div className="landing-main">
      {/* MOBILE LAYOUT */}
      {isMobile ? (
        <div className="w-full flex flex-col gap-2 justify-center h-full">
          {/* Opponent Info */}
          <div className="w-full flex items-center justify-between px-4 py-2 bg-[#151821] rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#f5f7ff]">
                {topLabel}
              </span>
              <PlayerStatsDisplay player={boardOrientation === "white" ? game.blackPlayer : game.whitePlayer} />
            </div>
            <div
              className={`text-lg font-bold px-2 py-1 rounded ${
                isTopActive
                  ? "bg-[#4caf50] text-black"
                  : "bg-[#10131e] text-[#f5f7ff]"
              }`}
            >
              {formatClock(topClock)}
            </div>
          </div>

          {/* Board */}
          <div ref={boardWrapperRef} className="board-container" style={{ touchAction: "none" }}>
            {isMobile && (
            <Chessboard
            key={`mobile-${boardRemountKey}`}
              id="MobileBoard"
              position={navigationFen ?? fen}
              onPieceDrop={onPieceDrop}
              onPieceDragBegin={onDragStart}
              onPieceDragEnd={onDragEnd}
              arePiecesDraggable={isMyTurn}
              boardOrientation={boardOrientation}
              animationDuration={250}
              customBoardStyle={{
                borderRadius: "8px",
                boxShadow: "0 0 15px rgba(0,0,0,0.4)",
              }}
              customSquareStyles={squareStyles}
              boardWidth={boardSize}
            />  )}
          </div>

          {/* My Info */}
          <div className="w-full flex items-center justify-between px-4 py-2 bg-[#151821] rounded-lg">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#f5f7ff]">
                {bottomLabel}
              </span>
              <PlayerStatsDisplay player={boardOrientation === "white" ? game.whitePlayer : game.blackPlayer} />
            </div>
            <div
              className={`text-lg font-bold px-2 py-1 rounded ${
                isBottomActive
                  ? "bg-[#4caf50] text-black"
                  : "bg-[#10131e] text-[#f5f7ff]"
              }`}
            >
              {formatClock(bottomClock)}
            </div>
          </div>

          {/* Incoming Draw Offer - Option C (above icon row) */}
          {incomingDrawOffer && drawOfferFrom && (
            <div className="w-full bg-[#151821] rounded-lg p-3 border border-[#2a3040] animate-slideDown">
              <div className="text-sm mb-2 text-center">
                <span className="font-semibold">
                  {drawOfferFrom.username || "Opponent"}
                </span>{" "}
                offered a draw.
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 py-2 rounded bg-[#2a5bd7] text-white text-sm hover:bg-[#3b6cf0] transition font-medium"
                  onClick={() => handleRespondDraw(true)}
                >
                  Accept
                </button>
                <button
                  className="flex-1 py-2 rounded bg-[#2a2f3b] text-[#f5f7ff] text-sm hover:bg-[#343a48] transition font-medium"
                  onClick={() => handleRespondDraw(false)}
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Incoming Rematch Offer - Option C */}
          {incomingRematchOffer && rematchFrom && (
            <div className="w-full bg-[#151821] rounded-lg p-3 border border-[#2a3040] animate-slideDown">
              <div className="text-sm mb-2 text-center">
                <span className="font-semibold">
                  {rematchFrom.username || "Opponent"}
                </span>{" "}
                wants a rematch.
              </div>
              <div className="flex gap-2">
                <button
                  disabled={rematchPending}
                  className="flex-1 py-2 rounded bg-[#2a5bd7] text-white text-sm hover:bg-[#3b6cf0] transition font-medium disabled:opacity-50"
                  onClick={() => handleRespondRematch(true)}
                >
                  Accept
                </button>
                <button
                  disabled={rematchPending}
                  className="flex-1 py-2 rounded bg-[#2a2f3b] text-[#f5f7ff] text-sm hover:bg-[#343a48] transition font-medium disabled:opacity-50"
                  onClick={() => handleRespondRematch(false)}
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Resign Confirmation */}
          {showResignConfirm && (
            <div className="w-full bg-[#151821] rounded-lg p-3 border border-red-600/50 animate-slideDown">
              <div className="text-sm mb-2 text-center font-semibold">
                Are you sure you want to resign?
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 py-2 rounded bg-[#2a2f3b] text-[#f5f7ff] text-sm hover:bg-[#343a48] transition font-medium"
                  onClick={() => setShowResignConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700 transition font-medium"
                  onClick={handleResign}
                >
                  Resign
                </button>
              </div>
            </div>
          )}

          {/* 5 Icon Controls */}
          <div className="w-full">
            <MobileGameControls
              onPrev={goPrev}
              onNext={goNext}
              onOpenChat={() => setChatDrawerOpen(true)}
              onOfferDraw={
                game.status === "IN_PROGRESS" ? handleOfferDrawClick : undefined
              }
              onResign={
                game.status === "IN_PROGRESS"
                  ? () => setShowResignConfirm(true)
                  : undefined
              }
              drawDisabled={drawOfferDisabled}
              gameEnded={game.status === "COMPLETED"}
              onRematch={handleOfferRematch}
              onReturnToLobby={() => navigate("/play")}
              rematchPending={rematchPending}
            />
          </div>

          {/* Chat Drawer */}
          <MobileChatDrawer
            isOpen={chatDrawerOpen}
            onClose={() => setChatDrawerOpen(false)}
            messages={chatMessages}
            currentUserId={currentUserId}
            onSendMessage={handleSendMessage}
          />
        </div>
      ) : (
        /* DESKTOP LAYOUT (Your existing code) */
        <div className="relative w-full flex">
          {/* LEFT — BOARD */}
          <div className="lg:col-span-2 flex flex-col items-center">
            {/* TOP PLAYER */}
            <div className="w-full max-w-[72vh] flex items-center justify-between px-3 py-2 bg-elevated rounded-t-md">
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-text-primary">
                  {topLabel}
                </span>
                <PlayerStatsDisplay player={boardOrientation === "white" ? game.blackPlayer : game.whitePlayer} />
              </div>

              <div
                className={`clock-display ${isTopActive ? "active-clock" : ""}`}
              >
                {formatClock(topClock)}
              </div>
            </div>

            {/* BOARD */}
            <div className="flex justify-center mt-2 w-full">
                <div  ref={boardWrapperRef} className="board-container">
                {!isMobile && (
                <Chessboard
                   key={`desktop-${boardRemountKey}`}
                  id="MainBoard"
                  position={navigationFen ?? fen}
                  onPieceDrop={onPieceDrop}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  arePiecesDraggable={isMyTurn}
                  boardOrientation={boardOrientation}
                  animationDuration={250}
                  customBoardStyle={{
                    borderRadius: "8px",
                    boxShadow: "0 0 15px rgba(0,0,0,0.4)",
                  }}
                  customSquareStyles={squareStyles}
                  boardWidth={boardSize}
                />)}
        
                </div>
            </div>

            {/* BOTTOM PLAYER */}
            <div className="w-full max-w-[72vh] flex items-center justify-between px-3 py-2 bg-elevated rounded-b-md mt-1">
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-text-primary">
                  {bottomLabel}
                </span>
                <PlayerStatsDisplay player={boardOrientation === "white" ? game.whitePlayer : game.blackPlayer} />
              </div>

              <div
                className={`clock-display ${
                  isBottomActive ? "active-clock" : ""
                }`}
              >
                {formatClock(bottomClock)}
              </div>
            </div>
          </div>

          {/* RIGHT — Controls + Moves + Chat */}
          <div className="flex flex-col w-[380px]">
            {/* Top row: Controls + Moves */}
            <div className="flex gap-4">
              <GameControls
                currentMove={navigationIndex}
                totalMoves={sanMoves.length}
                onGoStart={goToStart}
                onPrev={goPrev}
                onNext={goNext}
                onGoEnd={goToEnd}
                onOfferDraw={
                  game.status === "IN_PROGRESS"
                    ? handleOfferDrawClick
                    : undefined
                }
                drawOfferDisabled={drawOfferDisabled}
                drawOfferLabel={drawOfferLabel}
                onResign={
                  game.status === "IN_PROGRESS"
                    ? () => setShowResignConfirm(true)
                    : undefined
                }
                gameEnded={game.status === "COMPLETED"}
                onRematch={handleOfferRematch}
                rematchPending={rematchPending}
                onReturnToLobby={() => navigate("/play")}
              />

              <div className="bg-elevated rounded-md p-4 h-[200px] flex-1">
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
                    </tbody>
                  </table>
                </div>
                {offerDrawError && (
                  <div className="mt-2 text-xs text-red-400">
                    {offerDrawError}
                  </div>
                )}
              </div>
            </div>

            {/* ✅ Incoming draw offer card */}
            {incomingDrawOffer && drawOfferFrom && (
              <div className="mt-3 bg-elevated rounded-md p-3 border border-border-subtle">
                <div className="text-sm mb-2 text-center">
                  <span className="font-semibold">
                    {drawOfferFrom.username || "Opponent"}
                  </span>{" "}
                  offered a draw.
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded bg-[#2a5bd7] text-white text-sm hover:bg-[#3b6cf0] transition font-medium"
                    onClick={() => handleRespondDraw(true)}
                  >
                    Accept
                  </button>
                  <button
                    className="flex-1 py-2 rounded bg-[#2a2f3b] text-text-primary text-sm hover:bg-[#343a48] transition font-medium"
                    onClick={() => handleRespondDraw(false)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {/* ✅ Incoming rematch offer card */}
            {incomingRematchOffer && rematchFrom && (
              <div className="mt-3 bg-elevated rounded-md p-3 border border-border-subtle">
                <div className="text-sm mb-2 text-center">
                  <span className="font-semibold">
                    {rematchFrom.username || "Opponent"}
                  </span>{" "}
                  wants a rematch.
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={rematchPending}
                    className="flex-1 py-2 rounded bg-[#2a5bd7] text-white text-sm hover:bg-[#3b6cf0] transition font-medium disabled:opacity-50"
                    onClick={() => handleRespondRematch(true)}
                  >
                    Accept
                  </button>

                  <button
                    disabled={rematchPending}
                    className="flex-1 py-2 rounded bg-[#2a2f3b] text-text-primary text-sm hover:bg-[#343a48] transition font-medium disabled:opacity-50"
                    onClick={() => handleRespondRematch(false)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {/* ✅ Resign confirmation card */}
            {showResignConfirm && (
              <div className="mt-3 bg-elevated rounded-md p-3 border border-border-subtle">
                <div className="text-sm mb-2 text-center font-semibold">
                  Are you sure you want to resign?
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 py-2 rounded bg-[#2a2f3b] text-text-primary text-sm hover:bg-[#343a48] transition font-medium"
                    onClick={() => setShowResignConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 py-2 rounded bg-red-600 text-white text-sm hover:bg-red-700 transition font-medium"
                    onClick={handleResign}
                  >
                    Resign
                  </button>
                </div>
              </div>
            )}

            {/* Chat */}
            <div className="w-full h-[275px] mt-2">
              <GameChat
                messages={chatMessages}
                currentUserId={currentUserId}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>
        </div>
      )}

      {/* ✅ Game Result Modal */}
      <GameResultModal
        visible={showResultModal}
        resultText={resultText}
        onClose={() => setShowResultModal(false)}
      />
    </div>
  );
};

export default GamePage;
