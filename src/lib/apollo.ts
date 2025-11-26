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
      url: "ws://localhost:3000/graphql",
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
    uri: "http://localhost:3000/graphql",
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
