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
    contentType?: "media" | "devotional"
  ) => void;
  hideCommentModal: () => void;
  addComment: (comment: Comment) => void; // local insert (kept for backwards compatibility)
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  likeComment: (commentId: string) => void;
  replyToComment: (commentId: string, replyText: string) => void;
  submitComment: (text: string) => Promise<void>;
  loadMoreComments: () => Promise<void>;
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "top">("newest");
  const isLoadingRef = useRef(false);

  const { addComment: addCommentToStore, toggleCommentLike } =
    useInteractionStore();
  const socketManagerRef = useRef<SocketManager | null>(null);
  const currentUserIdRef = useRef<string>("");

  const showCommentModal = (
    newComments: Comment[],
    contentId?: string,
    contentType: "media" | "devotional" = "media"
  ) => {
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
        }
      } catch {}
    })();
  };

  const hideCommentModal = () => {
    try {
      console.log("📣 hideCommentModal called");
    } catch {}
    setIsVisible(false);
    setComments([]);
    setCurrentContentId("");
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
      // Optimistic local reply
      const tempId = `temp-${Date.now()}`;
      const optimisticReply: Comment = {
        id: tempId,
        userName: "You",
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
    }
  };

  const submitComment = async (text: string) => {
    try {
      if (!currentContentId || !text.trim()) return;
      // Optimistic insert
      const tempId = `temp-${Date.now()}`;
      const optimistic: Comment = {
        id: tempId,
        userName: "You",
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
      // Optionally refresh from server for canonical data
      await loadCommentsFromServer(
        currentContentId,
        currentContentType,
        1,
        sortBy,
        true
      );
    } catch (e) {
      console.error("Error submitting comment:", e);
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
      const res = await contentInteractionAPI.getComments(
        contentId,
        contentType,
        pageNum,
        20
      );
      const myId = currentUserIdRef.current;
      const mapped: Comment[] = (res.comments || []).map((c: any) => ({
        id: c.id,
        // Prefer "You" label for the current user's comments
        userName:
          c.userId && myId && String(c.userId) === String(myId)
            ? "You"
            : c.username || "User",
        avatar: c.userAvatar || "",
        timestamp: c.timestamp,
        comment: c.comment,
        likes: c.likes || 0,
        isLiked: false,
        replies: [],
        // @ts-ignore optional
        userId: c.userId,
      }));
      setComments((prev) => (replace ? mapped : [...prev, ...mapped]));
      setHasMore(Boolean(res.hasMore));
      setPage(pageNum);
    } catch (e) {
      console.warn("Failed loading comments from server:", e);
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
  };

  return (
    <CommentModalContext.Provider value={value}>
      {children}
    </CommentModalContext.Provider>
  );
};
