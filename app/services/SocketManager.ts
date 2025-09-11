import io, { Socket } from "socket.io-client";
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
  }

  async connect(): Promise<void> {
    try {
      this.socket = io(this.serverUrl, {
        auth: {
          token: this.authToken,
        },
        transports: ["websocket", "polling"],
        timeout: 20000,
      });

      this.setupEventHandlers();
      console.log("✅ Connected to real-time server");
    } catch (error) {
      console.error("❌ Failed to connect to real-time server:", error);
      throw error;
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

    this.socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
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

    // Notifications
    this.socket.on("new-like-notification", (data) => {
      console.log("New like notification:", data);
      this.handleLikeNotification(data);
    });

    this.socket.on("new-comment-notification", (data) => {
      console.log("New comment notification:", data);
      this.handleCommentNotification(data);
    });

    // Error handling
    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
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
    // Override in component
  }

  public handleContentComment(data: any): void {
    // Override in component
  }

  public handleCountUpdate(data: any): void {
    // Override in component
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
    this.customHandlers?.onLikeNotification?.(data);
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
    this.customHandlers?.onCommentNotification?.(data);
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
}

export default SocketManager;
