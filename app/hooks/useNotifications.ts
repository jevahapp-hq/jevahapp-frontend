import { useCallback, useEffect, useState } from "react";
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [socket, setSocket] = useState<Socket | null>(null);

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
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Update stats
          setStats((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              unread: prev.unread + 1,
              total: prev.total + 1,
              byType: {
                ...prev.byType,
                [notification.type]: (prev.byType[notification.type] || 0) + 1,
              },
            };
          });
        });

        newSocket.on("notification_read", (notificationId: string) => {
          console.log("✅ Notification marked as read:", notificationId);
          setNotifications((prev) =>
            prev.map((notif) =>
              notif._id === notificationId ? { ...notif, isRead: true } : notif
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        });

        newSocket.on("notification_deleted", (notificationId: string) => {
          console.log("🗑️ Notification deleted:", notificationId);
          setNotifications((prev) =>
            prev.filter((notif) => notif._id !== notificationId)
          );
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

  // Load initial notifications
  const loadNotifications = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        const response: NotificationResponse =
          await notificationAPIService.getNotifications(page, 20);

        if (append) {
          setNotifications((prev) => [...prev, ...response.notifications]);
        } else {
          setNotifications(response.notifications);
        }

        setUnreadCount(response.unreadCount);
        setHasMore(response.notifications.length === 20);
        setCurrentPage(page);
      } catch (error) {
        if ((error as any)?.name === "AbortError") {
          console.warn(
            "⏱️ Notifications fetch aborted (timeout). Showing what we have."
          );
          setError(null);
        } else {
          console.error("Error loading notifications:", error);
          setError(
            error instanceof Error
              ? error.message
              : "Failed to load notifications"
          );
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load notification stats
  const loadStats = useCallback(async () => {
    try {
      const statsData = await notificationAPIService.getStats();
      setStats(statsData);
    } catch (error) {
      if ((error as any)?.name === "AbortError") {
        console.warn("⏱️ Stats fetch aborted (timeout). Using defaults.");
      } else {
        console.error("Error loading notification stats:", error);
      }
    }
  }, []);

  // Initial load with cache hydration
  useEffect(() => {
    let didHydrate = false;
    (async () => {
      try {
        const cached = await notificationAPIService.getCachedNotifications?.();
        if (cached) {
          setNotifications(cached.notifications || []);
          setUnreadCount(cached.unreadCount || 0);
          setHasMore((cached.notifications || []).length === 20);
          didHydrate = true;
          setLoading(false);
        }
        const cachedStats = await notificationAPIService.getCachedStats?.();
        if (cachedStats) {
          setStats(cachedStats);
        }
      } catch {}
      // Fetch fresh data afterwards
      loadNotifications(1, false);
      loadStats();
    })();
  }, [loadNotifications, loadStats]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationAPIService.markAsRead(notificationId);

        // Update local state immediately for better UX
        setNotifications((prev) =>
          prev.map((notif) =>
            notif._id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Emit to socket for real-time updates
        if (socket) {
          socket.emit("mark_notification_read", notificationId);
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
        throw error;
      }
    },
    [socket]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const count = await notificationAPIService.markAllAsRead();

      // Update local state immediately
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);

      // Emit to socket for real-time updates
      if (socket) {
        socket.emit("mark_all_notifications_read");
      }

      return count;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }, [socket]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await loadNotifications(1, false);
    await loadStats();
  }, [loadNotifications, loadStats]);

  // Load more notifications (pagination)
  const loadMoreNotifications = useCallback(async () => {
    if (!hasMore || loading) return;

    const nextPage = currentPage + 1;
    await loadNotifications(nextPage, true);
  }, [hasMore, loading, currentPage, loadNotifications]);

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
