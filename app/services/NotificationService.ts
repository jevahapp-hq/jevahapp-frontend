import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

export interface Notification {
  id: string;
  type: "like" | "comment" | "share" | "follow" | "live" | "system";
  title: string;
  message: string;
  data: any;
  timestamp: Date;
  read: boolean;
  userId?: string;
  contentId?: string;
  contentType?: string;
  avatar?: string;
  userName?: string;
}

export interface NotificationBadge {
  count: number;
  hasUnread: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];
  private badgeListeners: ((badge: NotificationBadge) => void)[] = [];
  private readonly STORAGE_KEY = "notifications";
  private readonly MAX_NOTIFICATIONS = 100;

  private constructor() {
    this.loadNotifications();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Load notifications from storage
  private async loadNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.notifications = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        this.notifyListeners();
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }

  // Save notifications to storage
  private async saveNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify(this.notifications)
      );
    } catch (error) {
      console.error("Failed to save notifications:", error);
    }
  }

  // Add a new notification
  async addNotification(
    notification: Omit<Notification, "id" | "timestamp" | "read">
  ): Promise<void> {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };

    // Add to beginning of array (most recent first)
    this.notifications.unshift(newNotification);

    // Limit notifications to MAX_NOTIFICATIONS
    if (this.notifications.length > this.MAX_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(0, this.MAX_NOTIFICATIONS);
    }

    // Save to storage
    await this.saveNotifications();

    // Notify listeners
    this.notifyListeners();
    this.notifyBadgeListeners();

    // Show in-app notification if app is active
    this.showInAppNotification(newNotification);
  }

  // Get all notifications
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  // Get unread notifications
  getUnreadNotifications(): Notification[] {
    return this.notifications.filter((n) => !n.read);
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(
      (n) => n.id === notificationId
    );
    if (notification && !notification.read) {
      notification.read = true;
      await this.saveNotifications();
      this.notifyListeners();
      this.notifyBadgeListeners();
    }
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    const hasUnread = this.notifications.some((n) => !n.read);
    if (hasUnread) {
      this.notifications.forEach((n) => (n.read = true));
      await this.saveNotifications();
      this.notifyListeners();
      this.notifyBadgeListeners();
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    const index = this.notifications.findIndex((n) => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      await this.saveNotifications();
      this.notifyListeners();
      this.notifyBadgeListeners();
    }
  }

  // Clear all notifications
  async clearAllNotifications(): Promise<void> {
    this.notifications = [];
    await this.saveNotifications();
    this.notifyListeners();
    this.notifyBadgeListeners();
  }

  // Get notification badge info
  getBadgeInfo(): NotificationBadge {
    const unreadCount = this.notifications.filter((n) => !n.read).length;
    return {
      count: unreadCount,
      hasUnread: unreadCount > 0,
    };
  }

  // Subscribe to notification changes
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Subscribe to badge changes
  subscribeToBadge(listener: (badge: NotificationBadge) => void): () => void {
    this.badgeListeners.push(listener);
    return () => {
      const index = this.badgeListeners.indexOf(listener);
      if (index !== -1) {
        this.badgeListeners.splice(index, 1);
      }
    };
  }

  // Notify listeners
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }

  // Notify badge listeners
  private notifyBadgeListeners(): void {
    const badge = this.getBadgeInfo();
    this.badgeListeners.forEach((listener) => listener(badge));
  }

  // Show in-app notification
  private showInAppNotification(notification: Notification): void {
    // Only show for certain types
    if (["like", "comment", "follow"].includes(notification.type)) {
      Alert.alert(
        notification.title,
        notification.message,
        [{ text: "OK", style: "default" }],
        { cancelable: true }
      );
    }
  }

  // Create notification from Socket.IO data
  createNotificationFromSocketData(
    data: any,
    type: string
  ): Omit<Notification, "id" | "timestamp" | "read"> {
    switch (type) {
      case "like":
        return {
          type: "like",
          title: "New Like",
          message: `${data.userName || "Someone"} liked your content`,
          data,
          userId: data.userId,
          contentId: data.contentId,
          contentType: data.contentType,
          avatar: data.userAvatar,
          userName: data.userName,
        };

      case "comment":
        return {
          type: "comment",
          title: "New Comment",
          message: `${data.userName || "Someone"} commented on your content`,
          data,
          userId: data.userId,
          contentId: data.contentId,
          contentType: data.contentType,
          avatar: data.userAvatar,
          userName: data.userName,
        };

      case "share":
        return {
          type: "share",
          title: "Content Shared",
          message: `${data.userName || "Someone"} shared your content`,
          data,
          userId: data.userId,
          contentId: data.contentId,
          contentType: data.contentType,
          avatar: data.userAvatar,
          userName: data.userName,
        };

      case "follow":
        return {
          type: "follow",
          title: "New Follower",
          message: `${data.userName || "Someone"} started following you`,
          data,
          userId: data.userId,
          avatar: data.userAvatar,
          userName: data.userName,
        };

      case "live":
        return {
          type: "live",
          title: "Live Stream Started",
          message: `${data.userName || "Someone"} is now live`,
          data,
          userId: data.userId,
          contentId: data.contentId,
          contentType: "live",
          avatar: data.userAvatar,
          userName: data.userName,
        };

      default:
        return {
          type: "system",
          title: "Notification",
          message: data.message || "You have a new notification",
          data,
        };
    }
  }

  // Format notification time
  formatNotificationTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return timestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        timestamp.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }

  // Get notification icon
  getNotificationIcon(type: string): string {
    switch (type) {
      case "like":
        return "heart";
      case "comment":
        return "chatbubble";
      case "share":
        return "share";
      case "follow":
        return "person-add";
      case "live":
        return "videocam";
      case "system":
        return "notifications";
      default:
        return "notifications";
    }
  }

  // Get notification color
  getNotificationColor(type: string): string {
    switch (type) {
      case "like":
        return "#e91e63";
      case "comment":
        return "#2196f3";
      case "share":
        return "#4caf50";
      case "follow":
        return "#ff9800";
      case "live":
        return "#f44336";
      case "system":
        return "#9e9e9e";
      default:
        return "#9e9e9e";
    }
  }
}

export default NotificationService;
