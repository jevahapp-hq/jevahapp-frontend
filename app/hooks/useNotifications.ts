import { useCallback, useEffect } from "react";
import {
  keepPreviousData,
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Notification,
  notificationAPIService,
  NotificationResponse,
  NotificationStats,
} from "../services/NotificationAPIService";
import { getSharedNotificationSocket } from "../services/notificationSocket";
import {
  applyMarkAllRead,
  applyMarkRead,
  applyMarkUnread,
  alignUnread,
  dedupeNotifications,
  getUnreadCount,
  NOTIFICATION_LIST_QUERY_KEY,
  NOTIFICATION_STATS_QUERY_KEY,
  reconcileFetchedNotifications,
  type NotificationInfiniteData,
  type NotificationStatsLike,
} from "@/shared/notifications/notificationCache";
import {
  cancelNotificationFetches,
  fetchNotificationStats,
  patchNotificationQueries,
  readNotificationSnapshot,
  rememberLocalMarkAll,
  rememberLocalRead,
  rememberLocalUnread,
  subscribeNotificationRealtime,
  writeNotificationSnapshot,
} from "@/shared/notifications/notificationQuerySync";

const NOTIFICATION_STALE_MS = 20 * 1000;
const NOTIFICATION_GC_MS = 30 * 60 * 1000;

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAsUnread: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  stats: NotificationStats | null;
  hasMore: boolean;
}

function useSharedNotificationRealtime() {
  const queryClient = useQueryClient();
  useEffect(() => subscribeNotificationRealtime(queryClient), [queryClient]);
}

function deriveUnreadCount(
  stats: NotificationStatsLike | undefined,
  list: NotificationInfiniteData | undefined
): number {
  return getUnreadCount({ list, stats });
}

export const useNotifications = (): UseNotificationsReturn => {
  const queryClient = useQueryClient();
  useSharedNotificationRealtime();

  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    error: notificationsError,
    fetchNextPage,
    hasNextPage,
    refetch: refetchNotifications,
  } = useInfiniteQuery({
    queryKey: NOTIFICATION_LIST_QUERY_KEY,
    queryFn: async ({ pageParam = 1 }) => {
      const page = Number(pageParam) || 1;
      const response: NotificationResponse =
        await notificationAPIService.getNotifications(page, 20);
      const items = Array.isArray(response.notifications)
        ? response.notifications
        : [];
      const local = queryClient.getQueryData<NotificationInfiniteData>(
        NOTIFICATION_LIST_QUERY_KEY
      );
      const localItems =
        page === 1 ? local?.pages?.[0]?.notifications : undefined;
      const reconciled = reconcileFetchedNotifications(
        items,
        response.unreadCount,
        localItems
      );

      if (page === 1) {
        const stats = queryClient.getQueryData<NotificationStatsLike>(
          NOTIFICATION_STATS_QUERY_KEY
        );
        queryClient.setQueryData(NOTIFICATION_STATS_QUERY_KEY, {
          ...(stats ?? {
            unread: reconciled.unreadCount,
            total: response.total ?? 0,
            byType: {},
          }),
          unread: reconciled.unreadCount,
        });
      }

      return {
        notifications: reconciled.notifications,
        unreadCount: reconciled.unreadCount,
        page,
        hasMore: items.length === 20,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: NOTIFICATION_STALE_MS,
    gcTime: NOTIFICATION_GC_MS,
    retry: 1,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: NOTIFICATION_STATS_QUERY_KEY,
    queryFn: () => fetchNotificationStats(queryClient),
    staleTime: NOTIFICATION_STALE_MS,
    gcTime: NOTIFICATION_GC_MS,
    retry: 1,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  const notifications = dedupeNotifications(
    (notificationsData?.pages ?? []).flatMap((page) =>
      Array.isArray(page?.notifications) ? page.notifications : []
    )
  ) as Notification[];
  const unreadCount = deriveUnreadCount(stats, notificationsData);
  const loading = notificationsLoading;
  const error = notificationsError
    ? (notificationsError as Error).message || "Failed to load notifications"
    : null;
  const hasMore = hasNextPage || false;

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await cancelNotificationFetches(queryClient);
      const changed = patchNotificationQueries(queryClient, (snap) =>
        applyMarkRead(snap, notificationId)
      );
      if (!changed) return;
      rememberLocalRead(notificationId);
      try {
        await notificationAPIService.markAsRead(notificationId);
        getSharedNotificationSocket()?.emit(
          "mark_notification_read",
          notificationId
        );
      } catch (error) {
        patchNotificationQueries(queryClient, (snap) =>
          applyMarkUnread(snap, notificationId)
        );
        if (__DEV__) console.error("Error marking notification as read:", error);
        throw error;
      }
    },
    [queryClient]
  );

  const markAsUnread = useCallback(
    async (notificationId: string) => {
      await cancelNotificationFetches(queryClient);
      const changed = patchNotificationQueries(queryClient, (snap) =>
        applyMarkUnread(snap, notificationId)
      );
      if (!changed) return;
      rememberLocalUnread(notificationId);
      try {
        await notificationAPIService.markAsUnread(notificationId);
        getSharedNotificationSocket()?.emit(
          "mark_notification_unread",
          notificationId
        );
      } catch (error) {
        patchNotificationQueries(queryClient, (snap) =>
          applyMarkRead(snap, notificationId)
        );
        if (__DEV__) {
          console.error("Error marking notification as unread:", error);
        }
        throw error;
      }
    },
    [queryClient]
  );

  const markAllAsRead = useCallback(async () => {
    await cancelNotificationFetches(queryClient);
    const previous = readNotificationSnapshot(queryClient);
    const changed = patchNotificationQueries(queryClient, applyMarkAllRead);
    if (!changed) return;
    rememberLocalMarkAll();
    try {
      await notificationAPIService.markAllAsRead();
      getSharedNotificationSocket()?.emit("mark_all_notifications_read");
    } catch (error) {
      writeNotificationSnapshot(queryClient, previous, { restore: true });
      if (__DEV__) {
        console.error("Error marking all notifications as read:", error);
      }
      throw error;
    }
  }, [queryClient]);

  const refreshNotifications = useCallback(async () => {
    const [listResult, statsResult] = await Promise.all([
      refetchNotifications(),
      refetchStats(),
    ]);
    const listUnread = listResult.data?.pages?.[0]?.unreadCount;
    const statsUnread = statsResult.data?.unread;
    const unread =
      typeof statsUnread === "number"
        ? statsUnread
        : typeof listUnread === "number"
          ? listUnread
          : undefined;
    if (typeof unread !== "number") return;
    patchNotificationQueries(queryClient, (snap) => {
      const next = alignUnread(snap, unread);
      return {
        snapshot: next,
        changed: getUnreadCount(snap) !== unread,
      };
    });
  }, [queryClient, refetchNotifications, refetchStats]);

  const loadMoreNotifications = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchNextPage();
  }, [hasMore, loading, fetchNextPage]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    refreshNotifications,
    loadMoreNotifications,
    stats: stats ?? null,
    hasMore,
  };
};

/** Badge shares the stats query + the same realtime cache patches as the center. */
export const useNotificationBadge = () => {
  const queryClient = useQueryClient();
  useSharedNotificationRealtime();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: NOTIFICATION_STATS_QUERY_KEY,
    queryFn: () => fetchNotificationStats(queryClient),
    staleTime: NOTIFICATION_STALE_MS,
    gcTime: NOTIFICATION_GC_MS,
    retry: 1,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  return {
    unreadCount: Math.max(0, stats?.unread ?? 0),
    loading: statsLoading && stats == null,
  };
};
