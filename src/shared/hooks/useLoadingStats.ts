import { useContentLoading } from "../../../app/store/useInteractionStore";

/**
 * Hook to check if content stats are currently loading
 * @param contentId - The content ID to check loading state for
 * @returns boolean indicating if stats are loading
 */
export function useLoadingStats(contentId?: string): boolean {
  if (!contentId) return false;
  return useContentLoading(contentId);
}

