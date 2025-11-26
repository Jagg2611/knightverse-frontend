

import React from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { GET_PLATFORM_STATS } from '../lib/graphql';

const HomePage: React.FC = () => {
  const { openSignUp } = useClerk();
  const { isSignedIn } = useUser();
  const navigate = useNavigate();

  // Fetch real platform statistics with error handling
  const { data: statsData, loading } = useQuery(GET_PLATFORM_STATS, {
    pollInterval: 30000, // Update every 30 seconds
    fetchPolicy: 'cache-and-network', // Use cache first, then fetch
  });

  const handleGetStarted = () => {
    if (isSignedIn) {
      navigate('/play');
    } else {
      openSignUp({ redirectUrl: '/play' });
    }
  };

  // Format numbers with commas (e.g., 1234 -> 1,234)
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '...';
    return num.toLocaleString();
  };

  // Get stats with fallback
  const totalUsers = statsData?.platformStats?.totalUsers;
  const totalGames = statsData?.platformStats?.totalGames;

  return (
    <div className="hero-wrapper">
      <section className="hero">
        <div className="hero-art">
          <div className="piece piece-main" />
          <div className="piece piece-back-left" />
          <div className="piece piece-back-right" />
        </div>

        <div className="hero-text">
          <h1>
            Play chess.
            <br />
            Improve your game.
            <br />
            <span className="highlight">Have fun.</span>
          </h1>
          <p className="hero-subtitle">
            Challenge friends or random opponents, track your progress,
            and enjoy real-time games powered by Knightverse.
          </p>
          <div className="hero-actions lg:mr-45">
            <button className="primary-btn" onClick={handleGetStarted}>
              {isSignedIn ? 'Go to Lobby' : 'Get Started'}
            </button>
            <button className="ghost-btn">Watch a demo</button>
          </div>
          <div className="hero-stats lg:mr-38">
            <div className="stat">
              <span className="stat-label">PLAYERS REGISTERED</span>
              <span className="stat-value">
                {loading ? '...' : formatNumber(totalUsers)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">TOTAL GAMES PLAYED</span>
              <span className="stat-value">
                {loading ? '...' : formatNumber(totalGames)}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;