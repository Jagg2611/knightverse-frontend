import { useQuery, gql } from "@apollo/client";

const ME_QUERY = gql`
  query {
    me {
      _id
      username
      clerkId
    }
  }
`;

export default function DebugMe() {
  const { data, loading, error } = useQuery(ME_QUERY);

  console.log("ME_QUERY:", { data, loading, error });

  return (
    <div style={{ padding: 20 }}>
      <h3>Check console for ME_QUERY result</h3>
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
    </div>
  );
}
