import React from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  games: any[];
  loading: boolean;
}

const MyActiveGamesList: React.FC<Props> = ({ games, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="lobby-panel-content">
        <div className="list-item">Loading your games…</div>
      </div>
    );
  }

  if (!games || games.length === 0) {
    return (
      <div className="lobby-panel-content">
        <div className="list-item">You have no active games.</div>
      </div>
    );
  }

  return (
    <div className="lobby-panel-content space-y-2 dropdown-anim">
      {games.map((g) => (
        <div key={g._id} className="list-item flex justify-between items-center">
          <div>
            <div className="font-semibold">
              {g.whitePlayer.username} vs {g.blackPlayer?.username || "???"}
            </div>
            <div className="text-xs text-text-muted">
              Status: {g.status}
            </div>
          </div>

          <button
            className="px-3 py-1 rounded bg-[#2a5bd7] text-white hover:bg-[#3b6cf0]"
            onClick={() => navigate(`/game/${g._id}`)}
          >
            Resume
          </button>
        </div>
      ))}
    </div>
  );
};

export default MyActiveGamesList;
