export type GraphQLErrorItem = { message?: string };
type GraphQLResponse<T> = { data?: T; errors?: GraphQLErrorItem[] };

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json().catch(() => ({}))) as GraphQLResponse<T>;
  if (!response.ok || payload.errors?.length || !payload.data) {
    throw new Error(payload.errors?.[0]?.message || `GraphQL request failed (${response.status}).`);
  }
  return payload.data;
}
