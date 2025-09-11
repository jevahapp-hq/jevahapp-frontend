import React, { createContext, ReactNode, useContext, useState } from "react";
import GlassmorphismNotification from "../components/GlassmorphismNotification";

interface NotificationData {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  icon?: string;
  onAction?: () => void;
  actionText?: string;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (notification: Omit<NotificationData, "id">) => void;
  hideNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    console.warn("useNotification called outside of NotificationProvider");
    // Return a mock implementation to prevent crashes
    return {
      showNotification: () => {
        console.warn("Notification system not available");
      },
      hideNotification: () => {},
      clearAllNotifications: () => {},
    };
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showNotification = (notification: Omit<NotificationData, "id">) => {
    const id = Date.now().toString();
    const newNotification: NotificationData = {
      ...notification,
      id,
    };

    setNotifications((prev) => [...prev, newNotification]);
  };

  const hideNotification = (id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider
      value={{ showNotification, hideNotification, clearAllNotifications }}
    >
      {children}

      {/* Render notifications */}
      {notifications.map((notification) => (
        <GlassmorphismNotification
          key={notification.id}
          visible={true}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          icon={notification.icon}
          onClose={() => hideNotification(notification.id)}
          onAction={notification.onAction}
          actionText={notification.actionText}
          duration={notification.duration}
        />
      ))}
    </NotificationContext.Provider>
  );
};
