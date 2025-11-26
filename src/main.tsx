import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client/react';

import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { createApolloClient } from "./lib/apollo";
import App from './App';

const ApolloWithAuth = ({ children }: { children: React.ReactNode }) => {
  const { getToken } = useAuth();
  const client = React.useMemo(() => createApolloClient(getToken), [getToken]);
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
        <ApolloWithAuth>
          {/** YOUR APP COMPONENT */}
          <App />
        </ApolloWithAuth>
      </ClerkProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
