import { useCallback } from 'react';
import contentInteractionAPI from '../utils/contentInteractionAPI';
import { useInteractionStore } from '../store/useInteractionStore';

export interface UseSocialActionsOptions {
  contentId: string;
  contentType?: string;
}

export interface LikeState {
  liked: boolean;
  totalLikes: number;
}

/**
 * Custom hook for handling social actions (likes, comments) with 2025 best practices:
 * - Functional state updates to avoid stale closures
 * - Optimistic updates with rollback mechanism
 * - Immutable state changes
 */
export const useSocialActions = ({ contentId, contentType = 'media' }: UseSocialActionsOptions) => {
  const { toggleLike: toggleLikeInStore } = useInteractionStore();

  /**
   * Handle like with optimistic update and rollback
   * Uses functional updates to ensure we always work with the latest state
   */
  const handleLike = useCallback(async (): Promise<LikeState | null> => {
    try {
      // The store already handles optimistic updates, but we ensure proper error handling
      const result = await toggleLikeInStore(contentId, contentType);
      return {
        liked: result.liked,
        totalLikes: result.totalLikes,
      };
    } catch (error) {
      console.error('Error toggling like:', error);
      // Store handles rollback automatically, but we return null to indicate failure
      return null;
    }
  }, [contentId, contentType, toggleLikeInStore]);

  return {
    handleLike,
  };
};

