import React, { useMemo, useCallback } from 'react';
import { useAuth, ClerkProvider } from '@clerk/clerk-react';
import { ApolloProvider } from '@apollo/client/react';
import { createApolloClient } from '../lib/apollo';
import { useNavigate } from 'react-router-dom';
import App from '../App';

/**
 * Creates the Apollo client using the Clerk token
 * and provides it to the rest of the app.
 */
const ApolloProviderWithAuth = ({ children }: { children: React.ReactNode }) => {
  // 1. Rename Clerk's function on import
  const { getToken: getClerkToken } = useAuth();

  // 2. Create our *own* getToken function that asks for the 10-hour token
  // This ensures it only gets re-created if getClerkToken changes
  const getToken = useCallback(async () => {
    return await getClerkToken({ template: 'backend-test' });
  }, [getClerkToken]);

  const apolloClient = useMemo(() => {
    // 3. Pass our new 10-hour token function to the client
    return createApolloClient(getToken);
  }, [getToken]);

  return (
    <ApolloProvider client={apolloClient}>
      {children}
    </ApolloProvider>
  );
};

/**
 * This component handles routing for Clerk
 * It's now the main wrapper
 */
export const ClerkProviderWithRouter = () => {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      <ApolloProviderWithAuth>
        <App />
      </ApolloProviderWithAuth>
    </ClerkProvider>
  );
};