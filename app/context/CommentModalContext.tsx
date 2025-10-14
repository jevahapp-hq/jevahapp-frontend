import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    ReactNode,
    useContext,
    useRef,
    useState,
} from "react";
import SocketManager from "../services/SocketManager";
import { useInteractionStore } from "../store/useInteractionStore";
import contentInteractionAPI from "../utils/contentInteractionAPI";
import TokenUtils from "../utils/tokenUtils";

interface Comment {
  id: string;
  userName: string;
  avatar: string;
  timestamp: string;
  comment: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
  parentId?: string; // ID of the parent comment if this is a reply
}

interface CommentModalContextType {
  isVisible: boolean;
  comments: Comment[];
  showCommentModal: (
    comments: Comment[],
    contentId?: string,
    contentType?: "media" | "devotional",
    contentOwnerName?: string
  ) => void;
  hideCommentModal: () => void;
  addComment: (comment: Comment) => void; // local insert (kept for backwards compatibility)
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  likeComment: (commentId: string) => void;
  replyToComment: (commentId: string, replyText: string) => void;
  submitComment: (text: string) => Promise<void>;
  loadMoreComments: () => Promise<void>;
  contentOwnerName?: string;
}

const CommentModalContext = createContext<CommentModalContextType | undefined>(
  undefined
);

export const useCommentModal = () => {
  const context = useContext(CommentModalContext);
  if (!context) {
    throw new Error(
      "useCommentModal must be used within a CommentModalProvider"
    );
  }
  return context;
};

interface CommentModalProviderProps {
  children: ReactNode;
}

export const CommentModalProvider: React.FC<CommentModalProviderProps> = ({
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentContentId, setCurrentContentId] = useState<string>("");
  const [currentContentType, setCurrentContentType] = useState<
    "media" | "devotional"
  >("media");
  const [currentContentOwnerName, setCurrentContentOwnerName] = useState<string>("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "top">("newest");
  const isLoadingRef = useRef(false);
  const [isOpening, setIsOpening] = useState(false);

  const { addComment: addCommentToStore, toggleCommentLike } =
    useInteractionStore();
  const socketManagerRef = useRef<SocketManager | null>(null);
  const currentUserIdRef = useRef<string>("");
  const currentUserFirstNameRef = useRef<string>("");
  const currentUserLastNameRef = useRef<string>("");

  const showCommentModal = (
    newComments: Comment[],
    contentId?: string,
    contentType: "media" | "devotional" = "media",
    contentOwnerName?: string
  ) => {
    // Only prevent if already visible; allow immediate first tap
    if (isVisible) {
      return;
    }
    
    try {
      console.log("📣 showCommentModal called", {
        contentId,
        contentType,
        incomingCount: newComments?.length || 0,
      });
    } catch {}
    
    setComments(newComments);
    if (contentId) {
      setCurrentContentId(contentId);
    }
    setCurrentContentType(contentType || "media");
    if (contentOwnerName) {
      setCurrentContentOwnerName(contentOwnerName);
    }
    setPage(1);
    setHasMore(true);
    setIsVisible(true);
    try {
      console.log("📣 showCommentModal -> setIsVisible(true)");
    } catch {}

    // Load latest comments from backend and join realtime room
    requestAnimationFrame(() => {
      if (contentId) {
        loadCommentsFromServer(contentId, contentType, 1, sortBy);
        joinRealtimeRoom(contentId, contentType);
      }
    });
    // Fetch current user id once
    (async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const u = JSON.parse(userStr);
          currentUserIdRef.current = String(u?._id || u?.id || "");
          currentUserFirstNameRef.current = String(u?.firstName || "");
          currentUserLastNameRef.current = String(u?.lastName || "");
        }
      } catch {}
    })();
    
    // Ensure opening flag is cleared quickly
    setIsOpening(false);
  };

  const hideCommentModal = () => {
    try {
      console.log("📣 hideCommentModal called");
    } catch {}
    setIsVisible(false);
    setIsOpening(false); // Reset opening state
    setComments([]);
    setCurrentContentId("");
    setCurrentContentOwnerName("");
    setHasMore(true);
    // Leave realtime room
    try {
      socketManagerRef.current?.leaveContentRoom(
        currentContentId,
        currentContentType
      );
    } catch {}
  };

  const addComment = (comment: Comment) => {
    setComments((prev) => [comment, ...prev]);
  };

  const updateComment = (commentId: string, updates: Partial<Comment>) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, ...updates } : comment
      )
    );
  };

  const likeComment = async (commentId: string) => {
    try {
      // Update local state immediately for better UX
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: !comment.isLiked,
                likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
              }
            : comment
        )
      );
      // Call backend reaction toggle
      await contentInteractionAPI.toggleCommentLike(commentId);
    } catch (error) {
      console.error("Error liking comment:", error);
      // Revert the local state if the store update failed
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                isLiked: !comment.isLiked,
                likes: comment.isLiked ? comment.likes + 1 : comment.likes - 1,
              }
            : comment
        )
      );
    }
  };

  const replyToComment = async (commentId: string, replyText: string) => {
    try {
      if (!currentContentId) return;
      
      // Check if user is authenticated before allowing reply
      const token = await AsyncStorage.getItem("userToken") || 
                   await AsyncStorage.getItem("token");
      
      if (!token) {
        console.warn("⚠️ User not authenticated. Cannot submit reply.");
        return;
      }

      // Optimistic local reply
      const tempId = `temp-${Date.now()}`;
      const optimisticReply: Comment = {
        id: tempId,
        userName: `${currentUserFirstNameRef.current} ${currentUserLastNameRef.current}`.trim() || "You",
        avatar: "",
        timestamp: new Date().toISOString(),
        comment: replyText,
        likes: 0,
        isLiked: false,
        parentId: commentId,
        // @ts-ignore optional
        userId: currentUserIdRef.current,
      };
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies: [...(c.replies || []), optimisticReply] }
            : c
        )
      );
      // Backend
      await contentInteractionAPI.addComment(
        currentContentId,
        replyText,
        currentContentType,
        commentId
      );
      // Re-fetch replies or top-level if needed
    } catch (error) {
      console.error("Error adding reply:", error);
      // Remove optimistic reply if API call failed
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies: (c.replies || []).filter(reply => !reply.id.startsWith('temp-')) }
            : c
        )
      );
    }
  };

  const submitComment = async (text: string) => {
    try {
      if (!currentContentId || !text.trim()) return;
      
      // Check if user is authenticated before allowing comment submission
      const token = await AsyncStorage.getItem("userToken") || 
                   await AsyncStorage.getItem("token");
      
      if (!token) {
        console.warn("⚠️ User not authenticated. Cannot submit comment.");
        // You could show an alert here to prompt user to login
        return;
      }

      // Optimistic insert
      const tempId = `temp-${Date.now()}`;
      const optimistic: Comment = {
        id: tempId,
        userName: `${currentUserFirstNameRef.current} ${currentUserLastNameRef.current}`.trim() || "You",
        avatar: "",
        timestamp: new Date().toISOString(),
        comment: text.trim(),
        likes: 0,
        isLiked: false,
        replies: [],
        // @ts-ignore optional
        userId: currentUserIdRef.current,
      };
      setComments((prev) => [optimistic, ...prev]);
      // Optimistically bump comment count in the centralized store
      try {
        const store = useInteractionStore.getState();
        store.mutateStats(currentContentId, (s) => ({
          comments: Math.max(0, (s?.comments || 0) + 1),
        }));
      } catch {}
      // API
      await contentInteractionAPI.addComment(
        currentContentId,
        text.trim(),
        currentContentType
      );
      // Refresh from server without overwriting optimistic comment immediately.
      // Merge results to avoid the just-posted comment "disappearing" due to eventual consistency.
      await loadCommentsFromServer(
        currentContentId,
        currentContentType,
        1,
        sortBy,
        false
      );
    } catch (e) {
      console.error("Error submitting comment:", e);
      // Remove optimistic comment if API call failed
      setComments((prev) => prev.filter(comment => !comment.id.startsWith('temp-')));
    }
  };

  const loadCommentsFromServer = async (
    contentId: string,
    contentType: "media" | "devotional",
    pageNum: number,
    sort: "newest" | "oldest" | "top",
    replace: boolean = false
  ) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      // Check if user is authenticated before making API call
      const token = await AsyncStorage.getItem("userToken") || 
                   await AsyncStorage.getItem("token");
      
      if (!token) {
        console.warn("⚠️ No authentication token found. Skipping comment load from server.");
        // Set empty comments instead of throwing error
        if (replace) {
          setComments([]);
        }
        return;
      }

      const res = await contentInteractionAPI.getComments(
        contentId,
        contentType,
        pageNum,
        20
      );
      let mapped: Comment[] = (res.comments || []).map((c: any) => {
        const first = c.firstName || c.userFirstName || c.user?.firstName || "";
        const last = c.lastName || c.userLastName || c.user?.lastName || "";
        const fullName = `${String(first).trim()} ${String(last).trim()}`.trim();
        const name = fullName || c.username || "User";
        return {
          id: c.id,
          userName: name,
          avatar: c.userAvatar || c.avatar || c.user?.avatar || "",
          timestamp: c.timestamp,
          comment: c.comment,
          likes: c.likes || 0,
          isLiked: false,
          replies: [],
          // @ts-ignore optional
          userId: c.userId,
        };
      });
      setComments((prev) => {
        if (replace) return mapped;
        // Merge by id to keep any optimistic items not yet returned by server
        const existingById = new Map(prev.map((p) => [p.id, p] as const));
        const merged: Comment[] = [];
        // Keep current items first to preserve optimistic at the top
        for (const p of prev) {
          merged.push(p);
        }
        for (const m of mapped) {
          if (!existingById.has(m.id)) {
            merged.push(m);
          }
        }
        return merged;
      });
      setHasMore(Boolean(res.hasMore));
      setPage(pageNum);
    } catch (e) {
      console.warn("Failed loading comments from server:", e);
      // Don't throw error, just log it and continue with empty state
      if (replace) {
        setComments([]);
      }
    } finally {
      isLoadingRef.current = false;
    }
  };

  const loadMoreComments = async () => {
    if (!currentContentId || !hasMore) return;
    await loadCommentsFromServer(
      currentContentId,
      currentContentType,
      page + 1,
      sortBy
    );
  };

  const joinRealtimeRoom = async (
    contentId: string,
    contentType: "media" | "devotional"
  ) => {
    try {
      if (!socketManagerRef.current) {
        const token = await TokenUtils.getAuthToken();
        if (!token) return;
        const manager = new SocketManager({
          serverUrl: "https://jevahapp-backend.onrender.com",
          authToken: token,
        });
        await manager.connect();
        manager.setEventHandlers({
          onContentComment: (data: any) => {
            if (data?.contentId === currentContentId) {
              // Refresh comments on any new comment event
              loadCommentsFromServer(
                currentContentId,
                currentContentType,
                1,
                sortBy,
                true
              );
              // Also refresh/store counts to keep badges in sync
              try {
                const store = useInteractionStore.getState();
                store.refreshContentStats(currentContentId);
              } catch {}
            }
          },
        });
        socketManagerRef.current = manager;
      }
      socketManagerRef.current.joinContentRoom(contentId, contentType);
    } catch (e) {
      console.warn("Realtime room join failed:", e);
    }
  };

  const value: CommentModalContextType = {
    isVisible,
    comments,
    showCommentModal,
    hideCommentModal,
    addComment,
    updateComment,
    likeComment,
    replyToComment,
    submitComment,
    loadMoreComments,
    contentOwnerName: currentContentOwnerName,
  };

  return (
    <CommentModalContext.Provider value={value}>
      {children}
    </CommentModalContext.Provider>
  );
};
