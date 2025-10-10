import io, { Socket } from "socket.io-client";
import TokenUtils from "../utils/tokenUtils";
import NotificationService from "./NotificationService";

interface AuthenticatedUser {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface SocketManagerConfig {
  serverUrl: string;
  authToken: string;
}

class SocketManager {
  private socket: Socket | null = null;
  private authToken: string;
  private serverUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: SocketManagerConfig) {
    this.serverUrl = config.serverUrl;
    this.authToken = config.authToken;

    // Validate configuration
    if (!this.serverUrl || !this.authToken) {
      console.warn("⚠️ SocketManager: Invalid configuration", {
        hasServerUrl: !!this.serverUrl,
        hasAuthToken: !!this.authToken,
        serverUrl: this.serverUrl,
        tokenLength: this.authToken?.length || 0,
      });
    }
  }

  async connect(): Promise<void> {
    try {
      // Validate token before attempting connection
      if (!this.authToken || this.authToken.trim() === "") {
        console.warn(
          "⚠️ SocketManager: No valid auth token, skipping connection"
        );
        return;
      }

      // Validate token format (should be a JWT)
      if (!TokenUtils.isValidJWTFormat(this.authToken)) {
        console.warn(
          "⚠️ SocketManager: Invalid token format, skipping connection",
          { tokenPreview: TokenUtils.getTokenPreview(this.authToken) }
        );
        return;
      }

      console.log("🔌 SocketManager: Attempting to connect...", {
        serverUrl: this.serverUrl,
        hasToken: !!this.authToken,
        tokenLength: this.authToken?.length || 0,
        tokenPreview: TokenUtils.getTokenPreview(this.authToken),
      });

      // Test backend connectivity with an authenticated endpoint (soft-fail)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${this.serverUrl}/api/auth/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          console.warn(
            "⚠️ Auth check failed, continuing without real-time features"
          );
          return; // Continue app without socket
        }
      } catch (healthError) {
        console.warn(
          "⚠️ Backend not reachable (socket), continuing without real-time features"
        );
        return; // Continue app without socket
      }

      this.socket = io(this.serverUrl, {
        auth: {
          token: this.authToken,
        },
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true, // Force new connection
        autoConnect: false, // Don't auto-connect, we'll do it manually
        reconnection: false, // Disable automatic reconnection
      });

      this.setupEventHandlers();

      // Connect manually after setting up handlers
      this.socket.connect();

      console.log("✅ SocketManager: Connection initiated");
    } catch (error) {
      console.error("❌ SocketManager: Failed to initiate connection:", error);
      // Don't throw error, just log it and continue without socket
      console.log("⚠️ Continuing without real-time features...");
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log("✅ Socket connected");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      this.handleReconnect();
    });

    this.socket.on("connect_error", (error: any) => {
      // Check if it's an authentication error first
      const isAuthError =
        error.message?.includes("Authentication failed") ||
        error.message?.includes("Unauthorized") ||
        error.message?.includes("Invalid token") ||
        error.message?.includes("Token expired") ||
        error.message?.includes("Forbidden") ||
        error.message?.includes("401") ||
        error.message?.includes("403") ||
        error?.code === "UNAUTHORIZED" ||
        error?.code === "FORBIDDEN";

      if (isAuthError) {
        console.log("🔐 Authentication required - please log in to connect");
        console.log("💡 App will continue without real-time features");

        // Show user-friendly notification (optional)
        // You can integrate with your notification system here
        console.log(
          "📱 User notification: Please log in again to enable real-time features"
        );
        this.reconnectAttempts = this.maxReconnectAttempts;
        this.socket?.disconnect();
        this.socket = null;
        return;
      }

      // Log other connection errors (non-authentication)
      console.error("❌ Socket connection error:", error?.message);
      console.error("❌ Error details:", {
        message: error?.message,
        type: (error as any)?.type,
        description: (error as any)?.description,
        context: (error as any)?.context,
        code: (error as any)?.code,
        data: (error as any)?.data,
      });

      // Don't reconnect on network errors that are likely permanent
      if (
        error?.message?.includes("Network Error") ||
        error?.message?.includes("timeout") ||
        error?.message?.includes("ECONNREFUSED") ||
        (error as any)?.code === "NETWORK_ERROR"
      ) {
        console.log(
          "🌐 Network error detected, stopping reconnection attempts"
        );
        console.log("⚠️ App will continue without real-time features");
        this.reconnectAttempts = this.maxReconnectAttempts;
        this.socket?.disconnect();
        this.socket = null;
        return;
      }

      this.handleReconnect();
    });

    // Real-time content events
    this.socket.on("content-reaction", (data) => {
      console.log("Real-time like received:", data);
      this.handleContentReaction(data);
    });

    this.socket.on("content-comment", (data) => {
      console.log("Real-time comment received:", data);
      this.handleContentComment(data);
    });

    this.socket.on("count-update", (data) => {
      console.log("Real-time count update:", data);
      this.handleCountUpdate(data);
    });

    this.socket.on("viewer-count-update", (data) => {
      console.log("Real-time viewer count:", data);
      this.handleViewerCountUpdate(data);
    });

    // New production-grade view updates
    this.socket.on("view-updated", (data: any) => {
      try {
        console.log("Real-time view updated:", data);
        const { useInteractionStore } = require("../store/useInteractionStore");
        const store = useInteractionStore.getState();
        if (data?.contentId && typeof data?.viewCount === "number") {
          store.mutateStats(data.contentId, (_s: any) => ({
            views: Number(data.viewCount) || 0,
          }));
        }
      } catch (e) {
        console.error("Error applying view-updated socket event:", e);
      }
    });

    // Notifications
    this.socket.on("new-like-notification", (data: any) => {
      console.log("New like notification:", data);
      this.handleLikeNotification(data);
    });

    this.socket.on("new-comment-notification", (data: any) => {
      console.log("New comment notification:", data);
      this.handleCommentNotification(data);
    });

    // Error handling
    this.socket.on("error", (error: any) => {
      console.error("Socket error:", error?.message || error);
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      setTimeout(() => {
        console.log(
          `🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );
        this.connect();
      }, delay);
    }
  }

  // Content room management
  joinContentRoom(contentId: string, contentType: string): void {
    if (this.socket) {
      this.socket.emit("join-content", { contentId, contentType });
      console.log(`📺 Joined content room: ${contentType}:${contentId}`);
    }
  }

  leaveContentRoom(contentId: string, contentType: string): void {
    if (this.socket) {
      this.socket.emit("leave-content", { contentId, contentType });
      console.log(`📺 Left content room: ${contentType}:${contentId}`);
    }
  }

  // Real-time interactions
  sendLike(contentId: string, contentType: string): void {
    if (this.socket) {
      this.socket.emit("content-reaction", {
        contentId,
        contentType,
        actionType: "like",
      });
      console.log(`❤️ Sent like: ${contentType}:${contentId}`);
    }
  }

  sendComment(
    contentId: string,
    contentType: string,
    comment: string,
    parentCommentId?: string
  ): void {
    if (this.socket) {
      this.socket.emit("content-comment", {
        contentId,
        contentType,
        content: comment,
        parentCommentId,
      });
      console.log(`💬 Sent comment: ${contentType}:${contentId}`);
    }
  }

  // Event handlers (to be implemented by components)
  public handleContentReaction(data: any): void {
    // Update interaction store with real-time data
    try {
      const { useInteractionStore } = require("../store/useInteractionStore");
      const store = useInteractionStore.getState();

      if (data.contentId && data.actionType === "like") {
        // Update like count in real-time
        store.refreshContentStats(data.contentId);
      }
    } catch (error) {
      console.error("Error updating store from socket:", error);
    }
  }

  public handleContentComment(data: any): void {
    // Update interaction store with real-time comment data
    try {
      const { useInteractionStore } = require("../store/useInteractionStore");
      const store = useInteractionStore.getState();

      if (data.contentId) {
        // Refresh comments and stats for this content
        store.loadComments(data.contentId);
        store.refreshContentStats(data.contentId);
      }
    } catch (error) {
      console.error("Error updating store from socket comment:", error);
    }
  }

  public handleCountUpdate(data: any): void {
    // Update interaction store with real-time count updates
    try {
      const { useInteractionStore } = require("../store/useInteractionStore");
      const store = useInteractionStore.getState();

      if (data.contentId) {
        // Refresh all stats for this content
        store.refreshContentStats(data.contentId);
      }
    } catch (error) {
      console.error("Error updating store from socket count update:", error);
    }
  }

  public handleViewerCountUpdate(data: any): void {
    // Override in component
  }

  public handleLikeNotification(data: any): void {
    console.log("Handling like notification:", data);

    // Create notification using NotificationService
    const notificationService = NotificationService.getInstance();
    const notification = notificationService.createNotificationFromSocketData(
      data,
      "like"
    );
    notificationService.addNotification(notification);

    // Call custom handler if set
    (this as any).customHandlers?.onLikeNotification?.(data);
  }

  public handleCommentNotification(data: any): void {
    console.log("Handling comment notification:", data);

    // Create notification using NotificationService
    const notificationService = NotificationService.getInstance();
    const notification = notificationService.createNotificationFromSocketData(
      data,
      "comment"
    );
    notificationService.addNotification(notification);

    // Call custom handler if set
    (this as any).customHandlers?.onCommentNotification?.(data);
  }

  // Public methods for components to override
  setEventHandlers(handlers: {
    onContentReaction?: (data: any) => void;
    onContentComment?: (data: any) => void;
    onCountUpdate?: (data: any) => void;
    onViewerCountUpdate?: (data: any) => void;
    onLikeNotification?: (data: any) => void;
    onCommentNotification?: (data: any) => void;
  }): void {
    if (handlers.onContentReaction) {
      this.handleContentReaction = handlers.onContentReaction;
    }
    if (handlers.onContentComment) {
      this.handleContentComment = handlers.onContentComment;
    }
    if (handlers.onCountUpdate) {
      this.handleCountUpdate = handlers.onCountUpdate;
    }
    if (handlers.onViewerCountUpdate) {
      this.handleViewerCountUpdate = handlers.onViewerCountUpdate;
    }
    if (handlers.onLikeNotification) {
      this.handleLikeNotification = handlers.onLikeNotification;
    }
    if (handlers.onCommentNotification) {
      this.handleCommentNotification = handlers.onCommentNotification;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log("🔌 Disconnected from real-time server");
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Method to refresh authentication token
  async refreshAuthToken(newToken: string): Promise<void> {
    if (!newToken || newToken.trim() === "") {
      console.warn("⚠️ SocketManager: Invalid new token provided");
      return;
    }

    // Validate token format
    if (!TokenUtils.isValidJWTFormat(newToken)) {
      console.warn("⚠️ SocketManager: Invalid token format");
      return;
    }

    this.authToken = newToken;

    // If socket exists, disconnect and reconnect with new token
    if (this.socket) {
      console.log("🔄 SocketManager: Refreshing connection with new token");
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
      await this.connect();
    }
  }

  // Method to validate current token
  async validateToken(): Promise<boolean> {
    try {
      if (!this.authToken || this.authToken.trim() === "") {
        return false;
      }

      // Test token with a simple API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.serverUrl}/api/auth/validate`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return response.ok;
    } catch (error) {
      console.error("❌ Token validation failed:", error);
      return false;
    }
  }
}

export default SocketManager;
