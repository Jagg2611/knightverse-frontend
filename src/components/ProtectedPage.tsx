// src/components/ProtectedRoute.tsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import ChessLoadingScreen from './ChessLoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isSignedIn, isLoaded } = useUser();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // Open the sign-in modal and redirect back to this page after login
      openSignIn({ 
        redirectUrl: location.pathname,
        afterSignInUrl: location.pathname 
      });
      
      // Navigate back to home while modal is open
      navigate('/', { replace: true });
    }
  }, [isLoaded, isSignedIn, openSignIn, navigate, location.pathname]);

  // Show loading screen while checking auth status
  if (!isLoaded) {
    return <ChessLoadingScreen />;
  }

  // If not signed in, show loading (modal will open via useEffect)
  if (!isSignedIn) {
    return <ChessLoadingScreen />;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;