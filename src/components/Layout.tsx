import React, { useState } from 'react';
import { useClerk, UserButton, useUser } from '@clerk/clerk-react';
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom';

const Layout: React.FC = () => {
  const { openSignIn, openSignUp } = useClerk();
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Check if current page is a game (PvP), AI, or Replay
  const isGamePage = location.pathname.startsWith('/game/') || 
                     location.pathname.startsWith('/game-viewer/') ||
                     location.pathname === '/ai';

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => {
    return isActive ? 'nav-item active' : 'nav-item';
  };

  const closeSidebar = () => setSidebarOpen(false);

  // Handle clicks on protected routes
  const handleNavClick = (e: React.MouseEvent, path: string) => {
    if (!isSignedIn && (path === '/play' || path === '/ai')) {
      e.preventDefault(); // Prevent navigation
      closeSidebar(); // Close sidebar first
      openSignIn({ 
        redirectUrl: path,
        afterSignInUrl: path 
      });
    } else {
      closeSidebar();
    }
  };

  return (
    <div className="landing-root">
      
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      {/* Hamburger Button - Always visible on mobile */}
      <button 
        className="hamburger-btn" 
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* TOP BAR */}
      <header className={`landing-header ${isGamePage ? 'game-page-header' : ''}`}>
        {/* ✅ Mobile Logo - Top Right on Mobile */}
        {!isGamePage && (
          <div 
            className={`mobile-logo xl:hidden transition-opacity duration-200 ${
              sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`} 
            onClick={() => navigate('/')}
          >
            <span className="text-2xl">♟</span>
            <span className="font-bold text-lg tracking-wider ml-2">KNIGHTVERSE</span>
          </div>
        )}
        
        {!isSignedIn ? (
          <div className="header-right">
            <button className="login-btn" onClick={() => openSignIn({ redirectUrl: '/play' })}>Log in</button>
            <button className="signup-btn" onClick={() => openSignUp({ redirectUrl: '/play' })}>Sign Up</button>
          </div>
        ) : (
          <div className="header-right"></div> 
        )}
      </header>

      {/* SIDEBAR */}
      <aside className={`landing-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="logo" onClick={() => { navigate('/'); closeSidebar(); }}>
          <span className="logo-icon">♟</span>
          <span className="logo-text">KNIGHTVERSE</span>
        </div>

        <nav className="sidebar-nav">
          {/* Protected Routes - Show login modal if not signed in */}
          <NavLink 
            to="/play" 
            className={getNavLinkClass} 
            onClick={(e) => handleNavClick(e, '/play')}
          >
            <span className="nav-icon">♟️</span> Play
          </NavLink>
          <NavLink 
            to="/ai" 
            className={getNavLinkClass} 
            onClick={(e) => handleNavClick(e, '/ai')}
          >
            <span className="nav-icon">🧩</span> Play vs AI
          </NavLink>

          {/* Public Routes - Always accessible */}
          <NavLink to="/learn" className={getNavLinkClass} onClick={closeSidebar}>
            <span className="nav-icon">🎓</span> Learn
          </NavLink>
          <NavLink to="/watch" className={getNavLinkClass} onClick={closeSidebar}>
            <span className="nav-icon">📺</span> Watch
          </NavLink>
          <NavLink to="/community" className={getNavLinkClass} onClick={closeSidebar}>
            <span className="nav-icon">👨‍👩‍👧‍👦</span> Social
          </NavLink>
        </nav>

        {/* User Footer */}
        {isSignedIn && (
          <div className="sidebar-footer">
            <div className="user-block">
              <span className="user-name">
                {user?.username || user?.firstName || "Player"}
              </span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className={`landing-main ${isGamePage ? 'game-page-main' : 'mobile-content-fix'}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;