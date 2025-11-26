// src/components/OpenGamesList.tsx
import React from "react";
import { useMutation } from "@apollo/client/react";
import { JOIN_GAME_MUTATION } from "../lib/graphql";
import { useNavigate } from "react-router-dom";

interface Props {
  games: any[];
  loading: boolean;
  refetchOpenGames: () => void;
}

const OpenGamesList: React.FC<Props> = ({ games, loading, refetchOpenGames }) => {
  const [joinGame] = useMutation(JOIN_GAME_MUTATION);
  const navigate = useNavigate();

  async function handleJoin(gameId: string) {
    try {
      const { data } = await joinGame({ variables: { gameId } });

      // 🔥 This would crash earlier because refetchOpenGames was undefined
      await refetchOpenGames();

      if (data?.joinGame?._id) {
        navigate(`/game/${data.joinGame._id}`);
      }
    } catch (err) {
      console.error("Join failed:", err);
    }
  }

  if (loading) {
    return (
      <div className="lobby-panel-content">
        <div className="list-item">Loading open games…</div>
      </div>
    );
  }

  if (!games || games.length === 0) {
    return (
      <div className="lobby-panel-content">
        <div className="list-item">No open games currently.</div>
      </div>
    );
  }

  return (
    <div className="lobby-panel-content space-y-2 dropdown-anim">
      {games.map((g) => (
        <div key={g._id} className="list-item flex justify-between items-center">
          <div>
            <div className="font-semibold">{g.whitePlayer.username}</div>
            <div className="text-xs text-text-muted">
              Time control: {g.timeControl} min
            </div>
          </div>

          <button
            className="px-3 py-1 rounded bg-[#2a5bd7] text-white hover:bg-[#3b6cf0] transition"
            onClick={() => handleJoin(g._id)}
          >
            Join
          </button>
        </div>
      ))}
    </div>
  );
};

export default OpenGamesList;
