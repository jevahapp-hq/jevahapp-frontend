// Groups Hooks
import { useCallback, useEffect, useState } from "react";
import { ApiError, ApiErrorHandler } from "../utils/apiErrorHandler";
import { communityAPI, Group } from "../utils/communityAPI";

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
        
        console.log("🔄 Loading my groups - page:", currentPage, "reset:", reset);
        
        const response = await communityAPI.getMyGroups({
          page: currentPage,
          limit: 20,
        });

        console.log("📥 My groups API response:", {
          success: response.success,
          hasData: !!response.data,
          groupsCount: response.data?.groups?.length || 0,
          error: response.error,
          code: response.code,
        });

        // Handle successful response - even if groups array is empty
        if (response.success) {
          // Handle different response structures
          const responseData = response.data || {};
          const newGroups = responseData.groups || responseData.items || [];
          const pagination = responseData.pagination || {
            hasMore: false,
            page: currentPage,
            limit: 20,
            total: newGroups.length,
          };

          console.log("✅ Groups loaded:", newGroups.length, "items");
          console.log("📊 Pagination:", pagination);

          if (reset) {
            setGroups(newGroups);
          } else {
            setGroups((prev) => [...prev, ...newGroups]);
          }

          setHasMore(pagination.hasMore !== undefined ? pagination.hasMore : newGroups.length >= 20);
          setPage(currentPage + 1);
          
          // Clear error if we got a successful response (even with empty array)
          setError(null);
        } else {
          // Only set error for actual failures (not 404 which might mean no groups)
          // Check if it's a 404 - might just mean no groups exist
          if (response.code === "HTTP_ERROR" && response.error?.includes("404")) {
            console.log("ℹ️ No groups found (404) - treating as empty result");
            if (reset) {
              setGroups([]);
            }
            setHasMore(false);
            setError(null); // Don't treat 404 as an error - just empty result
          } else {
            console.error("❌ Failed to load groups:", response.error);
            const apiError = ApiErrorHandler.handle(response);
            setError(apiError);
          }
        }
      } catch (err: any) {
        console.error("❌ Exception loading groups:", err);
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
      } finally {
        setLoading(false);
        console.log("✅ Loading complete, loading set to false");
      }
    },
    [page, loading, hasMore]
  );

  const createGroup = useCallback(
    async (groupData: {
      name: string;
      description?: string;
      visibility?: "public" | "private";
      imageUri?: string | null;
      imageBase64?: string | null;
    }) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.createGroup(groupData);
        if (response.success && response.data) {
          const createdGroup = {
            ...response.data,
            _id: response.data._id || response.data.id || Date.now().toString(),
            profileImageUrl:
              response.data.profileImageUrl ||
              response.data.imageUrl ||
              groupData.imageUri ||
              undefined,
            userRole: response.data.userRole || "admin",
          };
          setGroups((prev) => [createdGroup, ...prev]);
          return createdGroup;
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

  const updateGroup = useCallback(
    async (
      groupId: string,
      updateData: {
        name?: string;
        description?: string;
        visibility?: "public" | "private";
        imageBase64?: string | null;
        imageUri?: string | null;
      }
    ) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.updateGroup(groupId, updateData);
        if (response.success && response.data) {
          const updatedGroup = {
            ...response.data,
            _id: response.data._id || response.data.id || groupId,
            profileImageUrl:
              response.data.profileImageUrl ||
              response.data.imageUrl ||
              updateData.imageUri ||
              undefined,
            userRole: response.data.userRole,
          };
          setGroups((prev) =>
            prev.map((group) =>
              group._id === updatedGroup._id
                ? {
                    ...group,
                    ...updatedGroup,
                    userRole: updatedGroup.userRole || group.userRole,
                  }
                : group
            )
          );
          return updatedGroup;
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
    return loadGroups(true);
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
    updateGroup,
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

