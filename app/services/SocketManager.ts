import io, { Socket } from "socket.io-client";
import TokenUtils from "../utils/tokenUtils";
import NotificationService from "./NotificationService";

const sockLog = (...a: any[]) => {
  if (__DEV__) console.log(...a);
};
const sockWarn = (...a: any[]) => {
  if (__DEV__) console.warn(...a);
};

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
      sockWarn("⚠️ SocketManager: Invalid configuration", {
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
        sockWarn(
          "⚠️ SocketManager: No valid auth token, skipping connection"
        );
        return;
      }

      // Validate token format (should be a JWT)
      if (!TokenUtils.isValidJWTFormat(this.authToken)) {
        sockWarn(
          "⚠️ SocketManager: Invalid token format, skipping connection",
          { tokenPreview: TokenUtils.getTokenPreview(this.authToken) }
        );
        return;
      }

      sockLog("🔌 SocketManager: Attempting to connect...", {
        serverUrl: this.serverUrl,
        hasToken: !!this.authToken,
        tokenLength: this.authToken?.length || 0,
        tokenPreview: TokenUtils.getTokenPreview(this.authToken),
      });

      // IG/TikTok style: do NOT preflight /auth/me (that causes false logouts
      // when Mongo is warming). Connect with the JWT; on auth_error keep session
      // and skip realtime — API refresh flow owns hard logout.

      this.socket = io(this.serverUrl, {
        auth: {
          token: this.authToken,
        },
        transports: ["websocket", "polling"], // Try WebSocket first, fallback to polling
        timeout: 20000,
        forceNew: true, // Force new connection
        autoConnect: false, // Don't auto-connect, we'll do it manually
        reconnection: true, // Enable automatic reconnection
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        upgrade: true, // Allow upgrade from polling to websocket
      });

      this.setupEventHandlers();

      // Connect manually after setting up handlers
      this.socket.connect();

      sockLog("✅ SocketManager: Connection initiated");
    } catch (error) {
      console.error("❌ SocketManager: Failed to initiate connection:", error);
      // Don't throw error, just log it and continue without socket
      sockLog("⚠️ Continuing without real-time features...");
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      sockLog("✅ Socket connected");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      // Don't log transport errors as disconnects (they're expected during connection attempts)
      if (reason === "transport error" || reason === "transport close") {
        sockLog("🔄 Transport disconnected, Socket.IO will retry...");
        return; // Socket.IO will handle reconnection automatically
      }
      sockLog("❌ Socket disconnected:", reason);
      this.handleReconnect();
    });

    this.socket.on("connect_error", (error: any) => {
      // Check if it's a transport error (WebSocket failure - Socket.IO will auto-fallback to polling)
      const isTransportError =
        error?.message?.includes("websocket error") ||
        error?.message?.includes("transport error") ||
        error?.type === "TransportError" ||
        (error as any)?.type === "TransportError";

      if (isTransportError) {
        // Transport errors are expected - Socket.IO will automatically fallback to polling
        // Don't log as error, just as debug info
        sockLog(
          "🔄 WebSocket transport failed, Socket.IO will fallback to polling..."
        );
        return; // Let Socket.IO handle the fallback automatically
      }

      // Check if it's an authentication error
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
        sockLog("🔐 Authentication required - please log in to connect");
        sockLog("💡 App will continue without real-time features");
        this.reconnectAttempts = this.maxReconnectAttempts;
        this.socket?.disconnect();
        this.socket = null;
        return;
      }

      // Log other connection errors (non-authentication, non-transport)
      sockWarn("⚠️ Socket connection error:", error?.message || "Unknown error");

      // Don't reconnect on network errors that are likely permanent
      if (
        error?.message?.includes("Network Error") ||
        error?.message?.includes("timeout") ||
        error?.message?.includes("ECONNREFUSED") ||
        (error as any)?.code === "NETWORK_ERROR"
      ) {
        sockLog(
          "🌐 Network error detected, stopping reconnection attempts"
        );
        sockLog("⚠️ App will continue without real-time features");
        this.reconnectAttempts = this.maxReconnectAttempts;
        this.socket?.disconnect();
        this.socket = null;
        return;
      }

      // For other errors, attempt reconnection
      this.handleReconnect();
    });

    // Real-time content events
    this.socket.on("content-reaction", (data) => {
      sockLog("Real-time like received:", data);
      this.handleContentReaction(data);
    });

    this.socket.on("content-comment", (data) => {
      sockLog("Real-time comment received:", data);
      this.handleContentComment(data);
    });

    const onTyping = (data: any) => {
      this.handleCommentTyping(data);
    };
    this.socket.on("comment-typing", onTyping);
    this.socket.on("comment-typing-start", (data: any) =>
      onTyping({ ...data, isTyping: true })
    );
    this.socket.on("comment-typing-stop", (data: any) =>
      onTyping({ ...data, isTyping: false })
    );

    this.socket.on("count-update", (data) => {
      sockLog("Real-time count update:", data);
      this.handleCountUpdate(data);
    });

    this.socket.on("viewer-count-update", (data) => {
      sockLog("Real-time viewer count:", data);
      this.handleViewerCountUpdate(data);
    });

    // New like update events from unified content interactions service
    // - Global broadcast: "content-like-update"
    // - Room-scoped: "like-updated" to room content:<normalizedContentType>:<contentId>
    //
    // Both carry an authoritative likeCount for the content item.
    this.socket.on("content-like-update", (data: any) => {
      try {
        const {
          applyLiveEngagementCounts,
        } = require("../utils/contentInteraction/socketCounts");
        applyLiveEngagementCounts(data);
      } catch (e) {
        console.error("Error applying content-like-update socket event:", e);
      }
    });

    this.socket.on("like-updated", (data: any) => {
      try {
        const {
          applyLiveEngagementCounts,
        } = require("../utils/contentInteraction/socketCounts");
        applyLiveEngagementCounts(data);
      } catch (e) {
        console.error("Error applying like-updated socket event:", e);
      }
    });

    // New production-grade view updates
    this.socket.on("view-updated", (data: any) => {
      try {
        sockLog("Real-time view updated:", data);
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
      sockLog("New like notification:", data);
      this.handleLikeNotification(data);
    });

    this.socket.on("new-comment-notification", (data: any) => {
      sockLog("New comment notification:", data);
      this.handleCommentNotification(data);
    });

    // Error handling - suppress expected errors that are handled by HTTP fallback
    this.socket.on("error", (error: any) => {
      const errorMessage = error?.message || String(error);
      
      // Suppress expected errors that are already handled gracefully:
      // - 404 errors (content not found) are handled by HTTP API fallback
      // - These don't need to be logged as errors since the app handles them
      if (
        errorMessage.includes("Failed to add reaction") ||
        errorMessage.includes("Failed tto add reaction") || // backend typo variant
        errorMessage.includes("404") ||
        errorMessage.includes("Content not found")
      ) {
        // Only log as warning in development, suppress in production
        if (__DEV__) {
          sockWarn("⚠️ Socket reaction error (handled by fallback):", errorMessage);
        }
        return;
      }
      
      // Log unexpected errors
      console.error("Socket error:", errorMessage);
    });
    
    // Handle reaction-specific errors (if backend sends them)
    this.socket.on("reaction-error", (error: any) => {
      const errorMessage = error?.message || String(error);
      
      // Suppress expected errors - HTTP API will handle persistence
      if (
        errorMessage.includes("Failed to add reaction") ||
        errorMessage.includes("Failed tto add reaction") ||
        errorMessage.includes("404") ||
        errorMessage.includes("Content not found") ||
        errorMessage.includes("not found")
      ) {
        if (__DEV__) {
          sockWarn("⚠️ Socket reaction error (handled by HTTP fallback):", errorMessage);
        }
        return;
      }
      
      // Log unexpected reaction errors
      console.error("Reaction error:", errorMessage);
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      setTimeout(() => {
        sockLog(
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
      sockLog(`📺 Joined content room: ${contentType}:${contentId}`);
    }
  }

  leaveContentRoom(contentId: string, contentType: string): void {
    if (this.socket) {
      this.socket.emit("leave-content", { contentId, contentType });
      sockLog(`📺 Left content room: ${contentType}:${contentId}`);
    }
  }

  // Real-time interactions
  // Note: This is a fire-and-forget operation. If it fails, the HTTP API will handle it.
  // Optimistic updates in the UI are not blocked by socket errors.
  sendLike(contentId: string, contentType: string): void {
    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit("content-reaction", {
          contentId,
          contentType,
          actionType: "like",
        });
        if (__DEV__) {
          sockLog(`❤️ Sent like via socket: ${contentType}:${contentId}`);
        }
      } catch (error) {
        // Don't throw - this is a non-blocking real-time update
        // The HTTP API call will handle the like, so we can safely ignore socket errors
        if (__DEV__) {
          sockWarn("⚠️ Socket like send failed (HTTP will handle):", error);
        }
      }
    } else if (__DEV__) {
      sockLog("📡 Socket not connected, skipping real-time like (HTTP will handle)");
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
      sockLog(`💬 Sent comment: ${contentType}:${contentId}`);
    }
  }

  /**
   * Broadcast that the current user is typing in a content comments room.
   * Backend should fan out `comment-typing` to other room members.
   */
  sendCommentTyping(
    contentId: string,
    contentType: string,
    isTyping: boolean,
    meta?: { userId?: string; displayName?: string }
  ): void {
    if (!this.socket?.connected) return;
    try {
      const payload = {
        contentId,
        contentType,
        isTyping,
        userId: meta?.userId,
        displayName: meta?.displayName,
      };
      this.socket.emit("comment-typing", payload);
      // Aliases some backends already use
      this.socket.emit(
        isTyping ? "comment-typing-start" : "comment-typing-stop",
        payload
      );
    } catch {
      // non-blocking
    }
  }

  // Event handlers (to be implemented by components)
  public handleContentReaction(data: any): void {
    // Counts only — never refresh full stats (that can clobber local liked).
    try {
      const {
        applyLiveEngagementCounts,
      } = require("../utils/contentInteraction/socketCounts");
      applyLiveEngagementCounts(data);
    } catch (error) {
      console.error("Error updating store from socket:", error);
    }
  }

  public handleContentComment(data: any): void {
    try {
      const {
        applyLiveEngagementCounts,
      } = require("../utils/contentInteraction/socketCounts");
      applyLiveEngagementCounts({
        contentId: data?.contentId,
        commentCount: data?.totalComments ?? data?.commentCount,
        likeCount: data?.likeCount ?? data?.totalLikes,
      });
      const { useInteractionStore } = require("../store/useInteractionStore");
      if (data?.contentId) {
        useInteractionStore.getState().loadComments(data.contentId);
      }
    } catch (error) {
      console.error("Error updating store from socket comment:", error);
    }
  }

  public handleCommentTyping(_data: any): void {
    // Override via setEventHandlers({ onCommentTyping })
  }

  public handleCountUpdate(data: any): void {
    try {
      const {
        applyLiveEngagementCounts,
      } = require("../utils/contentInteraction/socketCounts");
      applyLiveEngagementCounts(data);
    } catch (error) {
      console.error("Error updating store from socket count update:", error);
    }
  }

  public handleViewerCountUpdate(data: any): void {
    // Override in component
  }

  public handleLikeNotification(data: any): void {
    sockLog("Handling like notification:", data);

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
    sockLog("Handling comment notification:", data);

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
    onCommentTyping?: (data: any) => void;
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
    if (handlers.onCommentTyping) {
      this.handleCommentTyping = handlers.onCommentTyping;
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
      sockLog("🔌 Disconnected from real-time server");
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Method to refresh authentication token
  async refreshAuthToken(newToken: string): Promise<void> {
    if (!newToken || newToken.trim() === "") {
      sockWarn("⚠️ SocketManager: Invalid new token provided");
      return;
    }

    // Validate token format
    if (!TokenUtils.isValidJWTFormat(newToken)) {
      sockWarn("⚠️ SocketManager: Invalid token format");
      return;
    }

    this.authToken = newToken;

    // If socket exists, disconnect and reconnect with new token
    if (this.socket) {
      sockLog("🔄 SocketManager: Refreshing connection with new token");
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
