// Polls Hooks
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { communityAPI, Poll } from "../utils/communityAPI";
import { ApiErrorHandler, ApiError } from "../utils/apiErrorHandler";

export function usePolls(params?: {
  status?: "all" | "open" | "closed" | "active" | "expired";
  sortBy?: "createdAt" | "totalVotes";
  sortOrder?: "asc" | "desc";
}) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<ApiError | null>(null);

  const loadPolls = useCallback(
    async (reset = false) => {
      if (loading || (!hasMore && !reset)) return;

      try {
        setLoading(true);
        setError(null);
        const currentPage = reset ? 1 : page;
        const response = await communityAPI.getPolls({
          page: currentPage,
          limit: 20,
          status: params?.status || "all",
          sortBy: params?.sortBy || "createdAt",
          sortOrder: params?.sortOrder || "desc",
        });

        if (response.success && response.data) {
          const items = response.data.items || response.data.polls || [];
          const pagination = response.data.pagination || {
            hasMore: (response.data.page || 1) * (response.data.pageSize || 20) < (response.data.total || 0),
          };
          
          if (reset) {
            setPolls(items);
          } else {
            setPolls((prev) => [...prev, ...items]);
          }

          setHasMore(pagination.hasMore || false);
          setPage(currentPage + 1);
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
      } finally {
        setLoading(false);
      }
    },
    [page, loading, hasMore, params]
  );

  const createPoll = useCallback(
    async (pollData: {
      question: string;
      options: string[];
      multiSelect?: boolean;
      closesAt?: string;
      description?: string;
    }) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.createPoll(pollData);
        if (response.success && response.data) {
          setPolls((prev) => [response.data!, ...prev]);
          return response.data;
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return null;
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const voteOnPoll = useCallback(
    async (pollId: string, optionIndex: number | number[]) => {
      // Find poll in current list for optimistic update
      const poll = polls.find((p) => p._id === pollId);
      if (!poll) return null;

      // Optimistic update
      const optimisticPoll: Poll = {
        ...poll,
        userVoted: true,
        userVoteOptionId: Array.isArray(optionIndex) 
          ? optionIndex.map(idx => poll.options[idx]?._id || String(idx)).filter(Boolean)
          : poll.options[optionIndex]?._id || String(optionIndex),
        totalVotes: poll.totalVotes + (Array.isArray(optionIndex) ? optionIndex.length : 1),
        options: poll.options.map((option, idx) => {
          const isSelected = Array.isArray(optionIndex) 
            ? optionIndex.includes(idx)
            : optionIndex === idx;
          return isSelected
            ? { ...option, votesCount: option.votesCount + 1 }
            : option;
        }),
      };
      setPolls((prev) => prev.map((p) => (p._id === pollId ? optimisticPoll : p)));

      try {
        const response = await communityAPI.voteOnPoll(pollId, optionIndex);
        if (response.success && response.data) {
          // Update with actual server response (includes percentages)
          setPolls((prev) => prev.map((p) => (p._id === pollId ? response.data! : p)));
          return response.data;
        } else {
          // Revert optimistic update on error
          setPolls((prev) => prev.map((p) => (p._id === pollId ? poll : p)));
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return null;
        }
      } catch (err: any) {
        // Revert optimistic update on error
        setPolls((prev) => prev.map((p) => (p._id === pollId ? poll : p)));
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return null;
      }
    },
    [polls]
  );

  const updatePoll = useCallback(
    async (
      pollId: string,
      updates: {
        question?: string;
        description?: string | null;
        options?: string[];
        multiSelect?: boolean;
        closesAt?: string | null;
      }
    ) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.updatePoll(pollId, updates);
        if (response.success && response.data) {
          setPolls((prev) => prev.map((p) => (p._id === pollId ? response.data! : p)));
          return response.data;
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return null;
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deletePoll = useCallback(
    async (pollId: string) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.deletePoll(pollId);
        if (response.success) {
          setPolls((prev) => prev.filter((p) => p._id !== pollId));
          return true;
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return false;
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    loadPolls(true);
  }, [loadPolls]);

  useEffect(() => {
    loadPolls(true);
  }, [params?.status]);

  return {
    polls,
    loading,
    error,
    hasMore,
    loadMore: () => loadPolls(false),
    refresh,
    createPoll,
    voteOnPoll,
    updatePoll,
    deletePoll,
  };
}

// Helper to check if current user is poll owner
export async function isPollOwner(poll: Poll): Promise<boolean> {
  try {
    const userStr = await AsyncStorage.getItem("user");
    if (!userStr || !poll) {
      return false;
    }

    const user = JSON.parse(userStr);
    const currentUserId = user._id || user.id || user.email;

    if (!currentUserId) {
      return false;
    }

    // Check different fields for creator ID
    const creatorId = 
      poll.createdBy || 
      poll.createdByUser?._id || 
      poll.author?.id;

    return creatorId === currentUserId;
  } catch (error) {
    console.error("Error checking poll ownership:", error);
    return false;
  }
}

export function usePollDetails(pollId: string) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const loadPoll = useCallback(async () => {
    if (!pollId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await communityAPI.getPollDetails(pollId);

      if (response.success && response.data) {
        setPoll(response.data);
      } else {
        const apiError = ApiErrorHandler.handle(response);
        setError(apiError);
      }
    } catch (err: any) {
      const apiError = ApiErrorHandler.handle(err);
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  const voteOnPoll = useCallback(
    async (optionId: string) => {
      if (!poll || poll.userVoted || !poll.isActive) {
        return null;
      }

      // Optimistic update
      const optimisticPoll: Poll = {
        ...poll,
        userVoted: true,
        userVoteOptionId: optionId,
        totalVotes: poll.totalVotes + 1,
        options: poll.options.map((option) =>
          option._id === optionId
            ? { ...option, votesCount: option.votesCount + 1 }
            : option
        ),
      };
      setPoll(optimisticPoll);

      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.voteOnPoll(pollId, optionId);
        if (response.success && response.data) {
          // Update with actual server response (includes percentages)
          setPoll(response.data);
          return response.data;
        } else {
          // Revert optimistic update on error
          setPoll(poll);
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return null;
        }
      } catch (err: any) {
        // Revert optimistic update on error
        setPoll(poll);
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [poll, pollId]
  );

  const updatePoll = useCallback(
    async (updates: {
      title?: string;
      description?: string;
      expiresAt?: string | null;
      isActive?: boolean;
    }) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.updatePoll(pollId, updates);
        if (response.success && response.data) {
          setPoll(response.data);
          return response.data;
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return null;
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [pollId]
  );

  const deletePoll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await communityAPI.deletePoll(pollId);
      if (response.success) {
        setPoll(null);
        return true;
      } else {
        const apiError = ApiErrorHandler.handle(response);
        setError(apiError);
        return false;
      }
    } catch (err: any) {
      const apiError = ApiErrorHandler.handle(err);
      setError(apiError);
      return false;
    } finally {
      setLoading(false);
    }
  }, [pollId]);

  useEffect(() => {
    if (pollId) {
      loadPoll();
    }
  }, [pollId, loadPoll]);

  return {
    poll,
    loading,
    error,
    refresh: loadPoll,
    voteOnPoll,
    updatePoll,
    deletePoll,
  };
}

