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

// 🔥 Dynamic URLs based on environment
const isProduction = import.meta.env.PROD;

const BACKEND_HTTP = isProduction
  ? "https://knightverse-backend.onrender.com/graphql"
  : "http://localhost:3000/graphql"; // ✅ Fixed to port 3000

const BACKEND_WS = isProduction
  ? "wss://knightverse-backend.onrender.com/graphql"
  : "ws://localhost:3000/graphql"; // ✅ Fixed to port 3000

export const createApolloClient = (getToken: (x?: any) => Promise<string | null>) => {

  const authLink = new SetContextLink(async (_, { headers }) => {
    const token = await getToken({ template: "backend-test" });

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      },
    };
  });

  const wsLink = new GraphQLWsLink(
    createClient({
      url: BACKEND_WS, // ✅ Uses dynamic variable
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
        const token = await getToken({ template: "backend-test" });

        return {
          Authorization: `Bearer ${token}`,
        };
      },
    })
  );

  const httpLink = new HttpLink({
    uri: BACKEND_HTTP, // ✅ Uses dynamic variable
  });

  const httpAuthLink = authLink.concat(httpLink);

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
