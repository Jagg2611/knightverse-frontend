import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
} from "@apollo/client/core";
import { HttpLink } from "@apollo/client/link/http";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";
import { SetContextLink } from "@apollo/client/link/context";

// 1. Define your backend URLs dynamically
// Vite uses import.meta.env.PROD to detect if we are building for production
const isProduction = import.meta.env.PROD;

const BACKEND_HTTP = isProduction
  ? "https://knightverse-backend.onrender.com/graphql"
  : "http://localhost:4000/graphql"; // Changed 3000 to 4000 to match your backend logs

const BACKEND_WS = isProduction
  ? "wss://knightverse-backend.onrender.com/graphql"
  : "ws://localhost:4000/graphql";

export const createApolloClient = (getToken: (x?: any) => Promise<string | null>) => {

  // 🔥 Always get a fresh Clerk JWT (template ensures refresh)
  const authLink = new SetContextLink(async (_, { headers }) => {
    const token = await getToken({ template: "backend-test" });

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      },
    };
  });

  // 🔥 WebSocket link for subscriptions
  const wsLink = new GraphQLWsLink(
    createClient({
      url: BACKEND_WS, // ✅ Uses the dynamic variable
      webSocketImpl: WebSocket,

      lazy: false,
      retryAttempts: Infinity,
      shouldRetry: () => true,

      retryWait: (retryCount) => {
        console.log("🔁 WS reconnecting...", retryCount);
        return Math.min(1000 * retryCount, 5000);
      },

      connectionAckWaitTimeout: 10000,

      connectionParams: async () => {
        // 🔥 MUST be refreshed JWT here too!!
        const token = await getToken({ template: "backend-test" });

        return {
          Authorization: `Bearer ${token}`,
        };
      },
    })
  );

  // HTTP link
  const httpLink = new HttpLink({
    uri: BACKEND_HTTP, // ✅ Uses the dynamic variable
  });

  const httpAuthLink = authLink.concat(httpLink);

  // Split subscriptions vs HTTP
  const splitLink = ApolloLink.split(
    ({ query }) => {
      const def = getMainDefinition(query);
      return (
        def.kind === "OperationDefinition" &&
        def.operation === "subscription"
      );
    },
    wsLink,
    httpAuthLink
  );

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
  });
};
