import { useCallback, useEffect, useState } from "react";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import {
  Notification,
  notificationAPIService,
  NotificationResponse,
  NotificationStats,
} from "../services/NotificationAPIService";
import { API_BASE_URL } from "../utils/api";
import { TokenUtils } from "../utils/tokenUtils";

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  stats: NotificationStats | null;
  hasMore: boolean;
}

export const useNotifications = (): UseNotificationsReturn => {
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Use React Query for notifications with infinite scroll (0ms cache hits!)
  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    error: notificationsError,
    fetchNextPage,
    hasNextPage,
    refetch: refetchNotifications,
  } = useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: async ({ pageParam = 1 }) => {
      const response: NotificationResponse =
        await notificationAPIService.getNotifications(pageParam, 20);
      return {
        notifications: response.notifications,
        unreadCount: response.unreadCount,
        page: pageParam,
        hasMore: response.notifications.length === 20,
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnMount: false, // Use cache if available - 0ms on revisit!
    refetchOnWindowFocus: false,
  });

  // Use React Query for stats
  const {
    data: stats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["notification-stats"],
    queryFn: async () => {
      return await notificationAPIService.getStats();
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Flatten notifications from all pages
  const notifications = notificationsData?.pages.flatMap((page) => page.notifications) || [];
  const unreadCount = notificationsData?.pages[0]?.unreadCount || 0;
  const loading = notificationsLoading;
  const error = notificationsError
    ? (notificationsError as Error).message || "Failed to load notifications"
    : null;
  const hasMore = hasNextPage || false;

  // Initialize socket connection
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const token = await TokenUtils.getAuthToken();
        if (!token) return;

        const newSocket = io(API_BASE_URL, {
          // Provide token in multiple places to satisfy different backend expectations
          auth: { token, Authorization: `Bearer ${token}` },
          query: { token },
          // Note: extraHeaders only works in Node; harmless on RN
          extraHeaders: { Authorization: `Bearer ${token}` } as any,
          // Allow fallback to polling to avoid TransportError on some networks
          transports: ["websocket", "polling"],
          // Robust reconnection settings
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000,
          timeout: 20000,
          forceNew: true,
        });

        newSocket.on("connect", () => {
          console.log("🔌 Connected to notification socket");
        });

        newSocket.on("disconnect", (reason) => {
          console.log("🔌 Disconnected from notification socket:", reason);
        });

        newSocket.on("connect_error", (err: any) => {
          const msg = (err?.message || err || "").toString();
          const lower = msg.toLowerCase();
          if (
            lower.includes("timeout") ||
            lower.includes("websocket error") ||
            lower.includes("transport error")
          ) {
            // Suppress noisy expected errors; reconnection continues silently
            return;
          }
          console.warn("Socket connect_error:", msg);
        });

        newSocket.on("new_notification", (notification: Notification) => {
          console.log("🔔 New notification received:", notification);
          
          // Update React Query cache optimistically
          queryClient.setQueryData(["notifications"], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              pages: [
                {
                  notifications: [notification, ...(old.pages[0]?.notifications || [])],
                  unreadCount: (old.pages[0]?.unreadCount || 0) + 1,
                  page: 1,
                  hasMore: old.pages[0]?.hasMore || false,
                },
                ...old.pages.slice(1),
              ],
            };
          });

          // Update stats cache
          queryClient.setQueryData(["notification-stats"], (old: NotificationStats | undefined) => {
            if (!old) return old;
            return {
              ...old,
              unread: old.unread + 1,
              total: old.total + 1,
              byType: {
                ...old.byType,
                [notification.type]: (old.byType[notification.type] || 0) + 1,
              },
            };
          });
        });

        newSocket.on("notification_read", (notificationId: string) => {
          console.log("✅ Notification marked as read:", notificationId);
          // Update React Query cache
          queryClient.setQueryData(["notifications"], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                notifications: page.notifications.map((notif: Notification) =>
                  notif._id === notificationId ? { ...notif, isRead: true } : notif
                ),
                unreadCount: page.page === 1 ? Math.max(0, (page.unreadCount || 0) - 1) : page.unreadCount,
              })),
            };
          });
        });

        newSocket.on("notification_deleted", (notificationId: string) => {
          console.log("🗑️ Notification deleted:", notificationId);
          // Update React Query cache
          queryClient.setQueryData(["notifications"], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                notifications: page.notifications.filter((notif: Notification) => notif._id !== notificationId),
              })),
            };
          });
        });

        setSocket(newSocket);
      } catch (error) {
        console.error("Error initializing socket:", error);
      }
    };

    initializeSocket();

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  // React Query handles initial load automatically
  // No need for manual useEffect - React Query will fetch on mount

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationAPIService.markAsRead(notificationId);

        // Update React Query cache optimistically
        queryClient.setQueryData(["notifications"], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              notifications: page.notifications.map((notif: Notification) =>
                notif._id === notificationId ? { ...notif, isRead: true } : notif
              ),
              unreadCount: page.page === 1 ? Math.max(0, (page.unreadCount || 0) - 1) : page.unreadCount,
            })),
          };
        });

        // Update stats cache
        queryClient.setQueryData(["notification-stats"], (old: NotificationStats | undefined) => {
          if (!old) return old;
          return {
            ...old,
            unread: Math.max(0, old.unread - 1),
          };
        });

        // Emit to socket for real-time updates
        if (socket) {
          socket.emit("mark_notification_read", notificationId);
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
        throw error;
      }
    },
    [socket, queryClient]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPIService.markAllAsRead();

      // Update React Query cache optimistically
      queryClient.setQueryData(["notifications"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            notifications: page.notifications.map((notif: Notification) => ({
              ...notif,
              isRead: true,
            })),
            unreadCount: page.page === 1 ? 0 : page.unreadCount,
          })),
        };
      });

      // Update stats cache
      queryClient.setQueryData(["notification-stats"], (old: NotificationStats | undefined) => {
        if (!old) return old;
        return {
          ...old,
          unread: 0,
        };
      });

      // Emit to socket for real-time updates
      if (socket) {
        socket.emit("mark_all_notifications_read");
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }, [socket, queryClient]);

  // Refresh notifications using React Query
  const refreshNotifications = useCallback(async () => {
    await Promise.all([refetchNotifications(), refetchStats()]);
  }, [refetchNotifications, refetchStats]);

  // Load more notifications (pagination) using React Query
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
    markAllAsRead,
    refreshNotifications,
    loadMoreNotifications,
    stats,
    hasMore,
  };
};

// Hook for notification badge only
export const useNotificationBadge = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const stats = await notificationAPIService.getStats();
        setUnreadCount(stats.unread);
      } catch (error) {
        console.error("Error loading notification count:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUnreadCount();

    // Set up socket for real-time updates
    const initializeSocket = async () => {
      try {
        const token = await TokenUtils.getAuthToken();
        if (!token) return;

        const socket = io(API_BASE_URL, {
          auth: { token, Authorization: `Bearer ${token}` },
          query: { token },
          extraHeaders: { Authorization: `Bearer ${token}` } as any,
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000,
          timeout: 20000,
          forceNew: true,
        });

        socket.on("new_notification", () => {
          setUnreadCount((prev) => prev + 1);
        });

        socket.on("notification_read", () => {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        });

        return socket;
      } catch (error) {
        console.error("Error initializing badge socket:", error);
        return null;
      }
    };

    const socket = initializeSocket();

    return () => {
      socket?.then((s) => s?.close());
    };
  }, []);

  return { unreadCount, loading };
};
