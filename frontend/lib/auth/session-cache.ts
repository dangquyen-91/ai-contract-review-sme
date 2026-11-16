import type { QueryClient } from "@tanstack/react-query";

export async function clearSessionCache(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
}
