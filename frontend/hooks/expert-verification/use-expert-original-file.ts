import { useQuery } from "@tanstack/react-query";
import { expertWorkspaceApi } from "@/lib/api/expert-workspace";
import { expertVerificationKeys } from "@/lib/query-keys/expert-verification";

export function useExpertOriginalFile(reviewId: string, attempt: number) {
  return useQuery({
    queryKey: expertVerificationKeys.originalFile(reviewId, attempt),
    queryFn: ({ signal }) => expertWorkspaceApi.originalFile(reviewId, attempt, signal),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });
}

export function useExpertFullText(reviewId: string, attempt: number) {
  return useQuery({
    queryKey: expertVerificationKeys.fullText(reviewId, attempt),
    queryFn: ({ signal }) => expertWorkspaceApi.fullText(reviewId, attempt, signal),
    gcTime: 0,
    retry: false,
  });
}
