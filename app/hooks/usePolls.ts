// Polls Hooks
import { useState, useEffect, useCallback } from "react";
import { communityAPI, Poll } from "../utils/communityAPI";
import { ApiErrorHandler, ApiError } from "../utils/apiErrorHandler";

export function usePolls(params?: {
  status?: "active" | "expired" | "all";
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
          status: params?.status || "active",
          sortBy: params?.sortBy || "createdAt",
          sortOrder: params?.sortOrder || "desc",
        });

        if (response.success && response.data) {
          const { polls: newPolls, pagination } = response.data;
          if (reset) {
            setPolls(newPolls);
          } else {
            setPolls((prev) => [...prev, ...newPolls]);
          }

          setHasMore(pagination.hasMore);
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
      title: string;
      description?: string;
      options: string[];
      expiresAt?: string;
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

  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    loadPolls(true);
  }, [loadPolls]);

  useEffect(() => {
    loadPolls(true);
  }, []);

  return {
    polls,
    loading,
    error,
    hasMore,
    loadMore: () => loadPolls(false),
    refresh,
    createPoll,
  };
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

