// Socket Integration Helper
// This utility helps integrate SocketManager with your existing components

import SocketManager from "../services/SocketManager";
import { useInteractionStore } from "../store/useInteractionStore";

interface SocketIntegrationConfig {
  serverUrl: string;
  authToken: string;
  contentId?: string;
  contentType?: string;
}

export class SocketIntegration {
  private socketManager: SocketManager | null = null;
  private config: SocketIntegrationConfig;

  constructor(config: SocketIntegrationConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.socketManager = new SocketManager({
        serverUrl: this.config.serverUrl,
        authToken: this.config.authToken,
      });

      // Set up event handlers that automatically update the interaction store
      this.socketManager.setEventHandlers({
        onContentReaction: (data) => {
          console.log("Real-time like received:", data);
          const store = useInteractionStore.getState();
          if (data.contentId) {
            store.refreshContentStats(data.contentId);
          }
        },
        onContentComment: (data) => {
          console.log("Real-time comment received:", data);
          const store = useInteractionStore.getState();
          if (data.contentId) {
            store.loadComments(data.contentId);
            store.refreshContentStats(data.contentId);
          }
        },
        onCountUpdate: (data) => {
          console.log("Real-time count update received:", data);
          const store = useInteractionStore.getState();
          if (data.contentId) {
            store.refreshContentStats(data.contentId);
          }
        },
        onLikeNotification: (data) => {
          console.log("Like notification received:", data);
          // The SocketManager already handles this
        },
        onCommentNotification: (data) => {
          console.log("Comment notification received:", data);
          // The SocketManager already handles this
        },
      });

      await this.socketManager.connect();
      console.log("✅ Socket integration initialized");
    } catch (error) {
      console.error("❌ Failed to initialize socket integration:", error);
    }
  }

  // Join content room for real-time updates
  joinContentRoom(contentId: string, contentType: string): void {
    if (this.socketManager) {
      this.socketManager.joinContentRoom(contentId, contentType);
    }
  }

  // Leave content room
  leaveContentRoom(contentId: string, contentType: string): void {
    if (this.socketManager) {
      this.socketManager.leaveContentRoom(contentId, contentType);
    }
  }

  // Send like interaction
  sendLike(contentId: string, contentType: string): void {
    if (this.socketManager) {
      this.socketManager.sendLike(contentId, contentType);
    }
  }

  // Send comment interaction
  sendComment(
    contentId: string,
    contentType: string,
    comment: string,
    parentCommentId?: string
  ): void {
    if (this.socketManager) {
      this.socketManager.sendComment(
        contentId,
        contentType,
        comment,
        parentCommentId
      );
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socketManager?.isConnected() || false;
  }

  // Disconnect
  disconnect(): void {
    if (this.socketManager) {
      this.socketManager.disconnect();
    }
  }

  // Refresh auth token
  async refreshAuthToken(newToken: string): Promise<void> {
    if (this.socketManager) {
      await this.socketManager.refreshAuthToken(newToken);
    }
  }
}

// Hook for easy integration in React components
export function useSocketIntegration(config: SocketIntegrationConfig) {
  const [socketIntegration, setSocketIntegration] =
    React.useState<SocketIntegration | null>(null);

  React.useEffect(() => {
    const integration = new SocketIntegration(config);
    integration.initialize().then(() => {
      setSocketIntegration(integration);
    });

    return () => {
      integration.disconnect();
    };
  }, [config.serverUrl, config.authToken]);

  return socketIntegration;
}

// Import React for the hook
import React from "react";

