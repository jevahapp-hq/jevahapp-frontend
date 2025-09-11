import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import NotificationService, {
  Notification,
  NotificationBadge,
} from "../services/NotificationService";

interface PersistentNotificationContextType {
  notifications: Notification[];
  unreadNotifications: Notification[];
  badge: NotificationBadge;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  formatTime: (timestamp: Date) => string;
  getIcon: (type: string) => string;
  getColor: (type: string) => string;
}

const PersistentNotificationContext = createContext<
  PersistentNotificationContextType | undefined
>(undefined);

export const useNotifications = () => {
  const context = useContext(PersistentNotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a PersistentNotificationProvider"
    );
  }
  return context;
};

interface PersistentNotificationProviderProps {
  children: ReactNode;
}

export const PersistentNotificationProvider: React.FC<
  PersistentNotificationProviderProps
> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<
    Notification[]
  >([]);
  const [badge, setBadge] = useState<NotificationBadge>({
    count: 0,
    hasUnread: false,
  });

  useEffect(() => {
    const notificationService = NotificationService.getInstance();

    // Load initial data
    setNotifications(notificationService.getNotifications());
    setUnreadNotifications(notificationService.getUnreadNotifications());
    setBadge(notificationService.getBadgeInfo());

    // Subscribe to changes
    const unsubscribeNotifications = notificationService.subscribe(
      (newNotifications) => {
        setNotifications(newNotifications);
        setUnreadNotifications(notificationService.getUnreadNotifications());
      }
    );

    const unsubscribeBadge = notificationService.subscribeToBadge(
      (newBadge) => {
        setBadge(newBadge);
      }
    );

    return () => {
      unsubscribeNotifications();
      unsubscribeBadge();
    };
  }, []);

  const markAsRead = async (id: string) => {
    const notificationService = NotificationService.getInstance();
    await notificationService.markAsRead(id);
  };

  const markAllAsRead = async () => {
    const notificationService = NotificationService.getInstance();
    await notificationService.markAllAsRead();
  };

  const deleteNotification = async (id: string) => {
    const notificationService = NotificationService.getInstance();
    await notificationService.deleteNotification(id);
  };

  const clearAllNotifications = async () => {
    const notificationService = NotificationService.getInstance();
    await notificationService.clearAllNotifications();
  };

  const formatTime = (timestamp: Date) => {
    const notificationService = NotificationService.getInstance();
    return notificationService.formatNotificationTime(timestamp);
  };

  const getIcon = (type: string) => {
    const notificationService = NotificationService.getInstance();
    return notificationService.getNotificationIcon(type);
  };

  const getColor = (type: string) => {
    const notificationService = NotificationService.getInstance();
    return notificationService.getNotificationColor(type);
  };

  return (
    <PersistentNotificationContext.Provider
      value={{
        notifications,
        unreadNotifications,
        badge,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
        formatTime,
        getIcon,
        getColor,
      }}
    >
      {children}
    </PersistentNotificationContext.Provider>
  );
};
