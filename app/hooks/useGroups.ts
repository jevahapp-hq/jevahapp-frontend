// Groups Hooks
import { useState, useEffect, useCallback } from "react";
import { communityAPI, Group } from "../utils/communityAPI";
import { ApiErrorHandler, ApiError } from "../utils/apiErrorHandler";

export function useMyGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<ApiError | null>(null);

  const loadGroups = useCallback(
    async (reset = false) => {
      if (loading || (!hasMore && !reset)) return;

      try {
        setLoading(true);
        setError(null);
        const currentPage = reset ? 1 : page;
        const response = await communityAPI.getMyGroups({
          page: currentPage,
          limit: 20,
        });

        if (response.success && response.data) {
          const { groups: newGroups, pagination } = response.data;
          if (reset) {
            setGroups(newGroups);
          } else {
            setGroups((prev) => [...prev, ...newGroups]);
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
    [page, loading, hasMore]
  );

  const createGroup = useCallback(
    async (groupData: {
      name: string;
      description: string;
      isPublic: boolean;
      profileImage?: any;
    }) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.createGroup(groupData);
        if (response.success && response.data) {
          setGroups((prev) => [response.data!, ...prev]);
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
    loadGroups(true);
  }, [loadGroups]);

  useEffect(() => {
    loadGroups(true);
  }, []);

  return {
    groups,
    loading,
    error,
    hasMore,
    loadMore: () => loadGroups(false),
    refresh,
    createGroup,
  };
}

export function useExploreGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<ApiError | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadGroups = useCallback(
    async (reset = false, search?: string) => {
      if (loading || (!hasMore && !reset && !search)) return;

      try {
        setLoading(true);
        setError(null);
        const currentPage = reset ? 1 : page;
        const response = await communityAPI.exploreGroups({
          page: currentPage,
          limit: 20,
          search: search || searchQuery,
          sortBy: "membersCount",
          sortOrder: "desc",
        });

        if (response.success && response.data) {
          const { groups: newGroups, pagination } = response.data;
          if (reset) {
            setGroups(newGroups);
          } else {
            setGroups((prev) => [...prev, ...newGroups]);
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
    [page, loading, hasMore, searchQuery]
  );

  const search = useCallback(
    (query: string) => {
      setSearchQuery(query);
      setPage(1);
      setHasMore(true);
      loadGroups(true, query);
    },
    [loadGroups]
  );

  const joinGroup = useCallback(
    async (groupId: string) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.joinGroup(groupId);
        if (response.success) {
          // Update group in list
          setGroups((prev) =>
            prev.map((group) =>
              group._id === groupId
                ? { ...group, isMember: true, membersCount: group.membersCount + 1 }
                : group
            )
          );
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

  const leaveGroup = useCallback(
    async (groupId: string) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.leaveGroup(groupId);
        if (response.success) {
          // Update group in list
          setGroups((prev) =>
            prev.map((group) =>
              group._id === groupId
                ? { ...group, isMember: false, membersCount: Math.max(0, group.membersCount - 1) }
                : group
            )
          );
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
    loadGroups(true);
  }, [loadGroups]);

  useEffect(() => {
    loadGroups(true);
  }, []);

  return {
    groups,
    loading,
    error,
    hasMore,
    loadMore: () => loadGroups(false),
    refresh,
    search,
    searchQuery,
    setSearchQuery,
    joinGroup,
    leaveGroup,
  };
}

export function useGroupDetails(groupId: string) {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const loadGroup = useCallback(async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await communityAPI.getGroupDetails(groupId);

      if (response.success && response.data) {
        setGroup(response.data);
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
  }, [groupId]);

  const addMembers = useCallback(
    async (userIds: string[]) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.addGroupMembers(groupId, userIds);
        if (response.success && response.data) {
          // Reload group to get updated member list
          await loadGroup();
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
    [groupId, loadGroup]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.removeGroupMember(groupId, userId);
        if (response.success) {
          // Reload group to get updated member list
          await loadGroup();
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
    [groupId, loadGroup]
  );

  useEffect(() => {
    if (groupId) {
      loadGroup();
    }
  }, [groupId, loadGroup]);

  return {
    group,
    loading,
    error,
    refresh: loadGroup,
    addMembers,
    removeMember,
  };
}

