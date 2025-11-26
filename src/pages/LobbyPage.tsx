import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useSubscription } from "@apollo/client/react";
import { Chessboard } from "react-chessboard";
import { useNavigate } from "react-router-dom";
import { showToast } from "../lib/toast";

import {
  CREATE_GAME_MUTATION,
  OPEN_GAMES_QUERY,
  MY_GAMES_QUERY,
  QUICK_MATCH_MUTATION,
  CANCEL_MATCH_MUTATION,
  MATCH_FOUND_SUBSCRIPTION,
  ME_QUERY,
} from "../lib/graphql";

import OpenGamesList from "../components/OpenGamesList";
import MyActiveGamesList from "../components/MyActiveGamesList";

const LobbyPage: React.FC = () => {
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchingMessage, setSearchingMessage] = useState("Finding opponent…");
  const [searchToastId, setSearchToastId] = useState<string | null>(null);

  const navigate = useNavigate();

  // 👤 Get current user (for userId in subscription)
  const { data: meData, loading: meLoading } = useQuery(ME_QUERY);
  const userId = meData?.me?._id;

  useEffect(() => {
    console.log("👤 Current userId:", userId);
    console.log("⏱️ Selected time:", selectedTime);
  }, [userId, selectedTime]);

  // 📡 Subscription: matchFound(userId)
  const { data: matchFoundData } = useSubscription(MATCH_FOUND_SUBSCRIPTION, {
    variables: { userId },
    skip: !userId,
    onError: (error) => {
      console.error("❌ Subscription error:", error);
      showToast.error("Connection error. Please refresh the page.");
    },
    onData: ({ data }) => {
      console.log("📨 Subscription received data:", data);
    },
  });

  // 🔁 When a match is found via subscription
  useEffect(() => {
    if (matchFoundData?.matchFound?._id) {
      console.log(
        "🎉 MATCH FOUND via subscription:",
        matchFoundData.matchFound
      );
      setIsSearching(false);

      // Dismiss searching toast and show success
      if (searchToastId) {
        showToast.dismiss(searchToastId);
      }
      showToast.success("Match found! Loading game...");

      navigate(`/game/${matchFoundData.matchFound._id}`);
    }
  }, [matchFoundData, navigate, searchToastId]);

  const [createGame, { loading: creatingGame }] =
    useMutation(CREATE_GAME_MUTATION);
  const [quickMatch] = useMutation(QUICK_MATCH_MUTATION);
  const [cancelMatch] = useMutation(CANCEL_MATCH_MUTATION);

  const {
    data: openGamesData,
    loading: openGamesLoading,
    refetch: refetchOpenGames,
  } = useQuery(OPEN_GAMES_QUERY, { fetchPolicy: "network-only" });

  const {
    data: myGamesData,
    loading: myGamesLoading,
    refetch: refetchMyGames,
  } = useQuery(MY_GAMES_QUERY, { fetchPolicy: "network-only" });

  const toggle = (key: string) => {
    setOpen(open === key ? null : key);
    setSelected(key);
  };

  // convert UI names → numeric minutes
  const mapTimeToValue = (timeKey: string | null): string | null => {
    if (!timeKey) return null;
    switch (timeKey) {
      case "bullet":
        return "1";
      case "blitz":
        return "5";
      case "rapid":
        return "10";
      default:
        return timeKey;
    }
  };

  // 🎮 Create custom game
  const handleStartGame = async () => {
    if (!selectedTime) {
      showToast.warning("Please select a time control first");
      return;
    }

    if (creatingGame) return;

    const timeControlValue = mapTimeToValue(selectedTime);

    try {
      const { data } = await createGame({
        variables: {
          input: {
            timeControl: timeControlValue,
          },
        },
      });

      const newGame = data?.createGame;
      if (newGame?._id) {
        showToast.success("Game created! Waiting for opponent...");
        navigate(`/game/${newGame._id}`, {
          state: { game: newGame },
        });
      }
    } catch (error) {
      console.error("Create game failed:", error);
      showToast.error("Failed to create game. Please try again.");
    }
  };

  // ⚡ Quick match – queue + maybe immediate match
  async function startQuickMatch() {
    // Better validation with specific error messages
    if (!selectedTime) {
      console.error("❌ Please select a time control first");
      showToast.warning("Please select a time control first");
      return;
    }

    if (!userId) {
      console.error("❌ User not loaded yet, meLoading:", meLoading);
      showToast.info("Loading user data...");
      return;
    }

    console.log("🎮 Starting quick match for userId:", userId);
    console.log("⏱️ Time control:", selectedTime);

    setIsSearching(true);
    setSearchingMessage("Searching for opponent…");

    // Show loading toast and store its ID
    const toastId = showToast.loading("Searching for opponent...");
    setSearchToastId(toastId);

    try {
      const { data } = await quickMatch({
        variables: { timeControl: mapTimeToValue(selectedTime) },
      });

      console.log("📤 quickMatch response:", data);

      // 🟢 If a game comes back immediately
      if (data?.quickMatch?._id) {
        console.log(
          "✅ quickMatch returned game immediately:",
          data.quickMatch._id
        );
        setIsSearching(false);
        showToast.dismiss(toastId);
        showToast.success("Match found! Loading game...");
        navigate(`/game/${data.quickMatch._id}`);
      } else {
        console.log("⏳ quickMatch queued, waiting for subscription…");
      }
    } catch (e) {
      console.error("❌ Match error:", e);
      setIsSearching(false);
      showToast.dismiss(toastId);
      showToast.error("Failed to start match. Please try again.");
    }
  }

  async function stopQuickMatch() {
    setIsSearching(false);

    if (searchToastId) {
      showToast.dismiss(searchToastId);
      setSearchToastId(null);
    }

    try {
      await cancelMatch();
      console.log("🛑 Match cancelled");
      showToast.info("Search cancelled");
    } catch (e) {
      console.error("Cancel match failed:", e);
    }
  }

  // Show loading state while user data is loading
  if (meLoading) {
    return (
      <div className="landing-main flex items-center justify-center">
        <div className="text-text-primary text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="landing-main">
      <div className="grid grid-cols-1 min-[900px]:grid-cols-3 gap-4 items-start h-full">
        {/* LEFT / CENTER — BOARD */}
        <div className="hidden min-[900px]:block min-[900px]:col-span-2">
          <div className="flex justify-between items-center px-2 py-1 bg-elevated rounded-t-md">
            {/* <span className="text-text-primary font-semibold">Opponent</span> */}
          </div>

          <div className="flex justify-center mt-2">
            <div
              style={{
                height: "72vh",
                width: "72vh",
                maxHeight: "680px",
                maxWidth: "680px",
              }}
            >
              <Chessboard
                position="start"
                arePiecesDraggable={false}
                boardOrientation="white"
              />
            </div>
          </div>

          <div className="flex justify-between items-center px-2 py-1 bg-elevated rounded-b-md mt-2">
            {/* <span className="text-text-primary font-semibold">You</span> */}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full min-[900px]:col-span-1 flex flex-col h-full min-h-0 right-panel mx-auto max-w-[500px] min-[900px]:max-w-none justify-center min-[900px]:justify-start">
          <h2 className="text-3xl font-bold mb-4 min-[900px]:sticky min-[900px]:top-0 bg-bg-main z-10 py-2 text-center min-[900px]:text-left">
            Play Chess
          </h2>

          <div className="right-panel-scroll space-y-4">
            {/* PLAY ONLINE */}
            <button
              className={`lobby-menu-btn ${
                selected === "online" ? "active" : ""
              }`}
              onClick={() => toggle("online")}
            >
              <span className="icon">⚡</span>
              <div className="text-content">
                <span className="title">Play Online</span>
                <span className="subtitle">Match with a real player</span>
              </div>
            </button>

            {open === "online" && (
              <div className="lobby-panel-content dropdown-anim">
                {!isSearching ? (
                  <>
                    <div className="list-item">Choose time control:</div>

                    <div
                      className={`list-item cursor-pointer time-option ${
                        selectedTime === "bullet" ? "highlight" : ""
                      }`}
                      onClick={() => setSelectedTime("bullet")}
                    >
                      ⚡ Bullet 1 min
                    </div>

                    <div
                      className={`list-item cursor-pointer time-option ${
                        selectedTime === "blitz" ? "highlight" : ""
                      }`}
                      onClick={() => setSelectedTime("blitz")}
                    >
                      ⚡ Blitz 5 min
                    </div>

                    <div
                      className={`list-item cursor-pointer time-option ${
                        selectedTime === "rapid" ? "highlight" : ""
                      }`}
                      onClick={() => setSelectedTime("rapid")}
                    >
                      ⏱ Rapid 10 min
                    </div>

                    <button
                      className={`start-game-btn ${
                        selectedTime && userId ? "enabled" : "disabled"
                      }`}
                      disabled={!selectedTime || !userId}
                      onClick={startQuickMatch}
                    >
                      {!userId ? "Loading..." : "Play Online"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="list-item">{searchingMessage}</div>

                    <button
                      className="px-3 py-1 mt-2 rounded bg-red-600 text-white"
                      onClick={stopQuickMatch}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}

            {/* CREATE NEW GAME */}
            <button
              className={`lobby-menu-btn ${selected === "new" ? "active" : ""}`}
              onClick={() => toggle("new")}
            >
              <span className="icon">🎮</span>
              <div className="text-content">
                <span className="title">Create New Game</span>
                <span className="subtitle">Start as White vs random</span>
              </div>
            </button>

            {open === "new" && (
              <div className="lobby-panel-content dropdown-anim">
                <div
                  className={`list-item cursor-pointer time-option ${
                    selectedTime === "bullet" ? "highlight" : ""
                  }`}
                  onClick={() => setSelectedTime("bullet")}
                >
                  ⚡ Bullet <strong>1 min</strong>
                </div>

                <div
                  className={`list-item cursor-pointer time-option ${
                    selectedTime === "blitz" ? "highlight" : ""
                  }`}
                  onClick={() => setSelectedTime("blitz")}
                >
                  ⚡ Blitz <strong>5 min</strong>
                </div>

                <div
                  className={`list-item cursor-pointer time-option ${
                    selectedTime === "rapid" ? "highlight" : ""
                  }`}
                  onClick={() => setSelectedTime("rapid")}
                >
                  ⏱ Rapid <strong>10 min</strong>
                </div>

                <button
                  className={`start-game-btn ${
                    selectedTime ? "enabled" : "disabled"
                  }`}
                  disabled={!selectedTime || creatingGame}
                  onClick={handleStartGame}
                >
                  {creatingGame ? "Creating..." : "Start Game"}
                </button>
              </div>
            )}

            {/* ACTIVE GAMES */}
            <button
              className={`lobby-menu-btn ${
                selected === "active" ? "active" : ""
              }`}
              onClick={() => toggle("active")}
            >
              <span className="icon">🕹️</span>
              <div className="text-content">
                <span className="title">My Active Games</span>
                <span className="subtitle">Continue from where you left</span>
              </div>
            </button>

            {open === "active" && (
              <MyActiveGamesList
                games={(myGamesData?.myGames || []).filter(
                  (g) => g.status !== "COMPLETED"
                )}
                loading={myGamesLoading}
              />
            )}

            {/* OPEN GAMES */}
            <button
              className={`lobby-menu-btn ${
                selected === "open" ? "active" : ""
              }`}
              onClick={() => toggle("open")}
            >
              <span className="icon">🌍</span>
              <div className="text-content">
                <span className="title">Open Games</span>
                <span className="subtitle">Join a match as Black</span>
              </div>
            </button>

            {open === "open" && (
              <OpenGamesList
                games={openGamesData?.openGames || []}
                loading={openGamesLoading}
                refetchOpenGames={refetchOpenGames}
              />
            )}
            {/* ✅ NEW: PAST GAMES */}
            <button
              className={`lobby-menu-btn ${
                selected === "history" ? "active" : ""
              }`}
              onClick={() => toggle("history")}
            >
              <span className="icon">📜</span>
              <div className="text-content">
                <span className="title">Past Games</span>
                <span className="subtitle">Review your completed games</span>
              </div>
              <span className={`arrow ${open === "history" ? "rotate" : ""}`}>
                ▼
              </span>
            </button>

            {open === "history" && (
              <div className="lobby-panel-content dropdown-anim">
                <div className="list-item text-center py-4">
                  <button
                    className="start-game-btn enabled w-full"
                    onClick={() => navigate("/history")}
                  >
                    View All Past Games →
                  </button>
                </div>

                <div className="text-xs text-text-muted text-center mt-2">
                  Click to see your game history with move replays
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
