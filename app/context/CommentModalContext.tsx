import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    ReactNode,
    useContext,
    useRef,
    useState,
} from "react";
import { InteractionManager } from "react-native";
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
    // INSTANT RESPONSE - No blocking conditions
    console.log("📣 showCommentModal called INSTANTLY", {
      contentId,
      contentType,
      incomingCount: newComments?.length || 0,
    });
    
    // Try to load cached comments immediately for instant display
    let cachedComments: Comment[] = [];
    if (contentId) {
      try {
        // Check interaction store for cached comments
        const store = useInteractionStore.getState();
        const storeComments = store.comments[contentId];
        if (storeComments && Array.isArray(storeComments) && storeComments.length > 0) {
          // Transform store comments to Comment format
          cachedComments = storeComments.slice(0, 10).map((c: any) => ({
            id: c.id || c._id,
            userName: c.userName || c.username || "User",
            avatar: c.avatar || c.userAvatar || "",
            timestamp: c.timestamp || c.createdAt || new Date().toISOString(),
            comment: c.comment || c.text || "",
            likes: c.likes || 0,
            isLiked: c.isLiked || false,
            replies: c.replies || [],
            userId: c.userId,
          }));
          console.log("⚡ Using cached comments from store:", cachedComments.length);
        }
      } catch (e) {
        console.warn("Failed to load cached comments:", e);
      }
    }
    
    // Set modal visible IMMEDIATELY - no delays
    setIsVisible(true);
    // Use cached comments if available, otherwise use provided comments
    setComments(cachedComments.length > 0 ? cachedComments : (newComments || []));
    if (contentId) {
      setCurrentContentId(contentId);
    }
    setCurrentContentType(contentType || "media");
    if (contentOwnerName) {
      setCurrentContentOwnerName(contentOwnerName);
    }
    setPage(1);
    setHasMore(true);
    setIsOpening(false);
    
    console.log("📣 showCommentModal -> setIsVisible(true) INSTANT");

    // Load latest comments from backend and join realtime room ASYNC (non-blocking)
    // Defer all async work using InteractionManager to ensure modal opens instantly
    if (contentId) {
      // Defer all async work until after modal animation completes
      // This ensures the modal appears instantly without waiting for API calls
      InteractionManager.runAfterInteractions(() => {
        // Fetch user data and load comments in parallel for faster loading
        Promise.all([
          // Fetch user data (fast, non-blocking)
          AsyncStorage.getItem("user").then((userStr) => {
            if (userStr) {
              try {
                const u = JSON.parse(userStr);
                currentUserIdRef.current = String(u?._id || u?.id || "");
                currentUserFirstNameRef.current = String(u?.firstName || "");
                currentUserLastNameRef.current = String(u?.lastName || "");
              } catch {}
            }
          }).catch(() => {}),
          
          // Load comments from cache first, then refresh from server
          loadCommentsFromServer(contentId, contentType, 1, sortBy, cachedComments.length === 0).catch(() => {}),
        ]);
        
        // Join realtime room (can happen in parallel)
        joinRealtimeRoom(contentId, contentType).catch(() => {});
      });
    }
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
      const token =
        (await AsyncStorage.getItem("userToken")) ||
        (await AsyncStorage.getItem("token"));
      
      if (!token) {
        console.warn("⚠️ User not authenticated. Cannot submit comment.");
        // You could show an alert here to prompt user to login
        return;
      }

      const trimmed = text.trim();

      // Optimistic insert (temporary id)
      const tempId = `temp-${Date.now()}`;
      const optimistic: Comment = {
        id: tempId,
        userName:
          `${currentUserFirstNameRef.current} ${currentUserLastNameRef.current}`.trim() ||
          "You",
        avatar: "",
        timestamp: new Date().toISOString(),
        comment: trimmed,
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

      // Call backend and get the real, canonical comment
      const created = await contentInteractionAPI.addComment(
        currentContentId,
        trimmed,
        currentContentType
      );

      // Replace the temporary optimistic comment with the real one
      const createdComment: Comment = {
        id: created.id,
        userName: created.username,
        avatar: created.userAvatar || "",
        timestamp: created.timestamp,
        comment: created.comment,
        likes: created.likes || 0,
        isLiked: false,
        replies: [],
        // @ts-ignore optional
        userId: created.userId,
      };

      setComments((prev) => {
        // Drop all temp-* entries and insert the real comment at the top
        const withoutTemps = prev.filter((c) => !c.id.startsWith("temp-"));
        return [createdComment, ...withoutTemps];
      });

      // Invalidate cache since we added a new comment
      try {
        const cacheKey = `comments-cache-${currentContentId}-${sortBy}`;
        await AsyncStorage.removeItem(cacheKey);
      } catch {}
      
      // Refresh from server and merge by id; this will not duplicate the new comment
      await loadCommentsFromServer(
        currentContentId,
        currentContentType,
        1,
        sortBy,
        false
      );
    } catch (e) {
      console.error("Error submitting comment:", e);
      // Remove any optimistic comments if API call failed
      setComments((prev) =>
        prev.filter((comment) => !comment.id.startsWith("temp-"))
      );
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
      // Check cache first for instant display (only on first page)
      if (pageNum === 1) {
        try {
          const cacheKey = `comments-cache-${contentId}-${sort}`;
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            const parsedCache = JSON.parse(cached);
            const cacheAge = Date.now() - (parsedCache.timestamp || 0);
            const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache
            
            if (cacheAge < CACHE_TTL && parsedCache.comments && parsedCache.comments.length > 0) {
              console.log("⚡ Loading comments from cache (age:", Math.round(cacheAge / 1000), "s)");
              const cachedComments: Comment[] = parsedCache.comments.map((c: any) => ({
                id: c.id,
                userName: c.userName || "User",
                avatar: c.avatar || "",
                timestamp: c.timestamp,
                comment: c.comment,
                likes: c.likes || 0,
                isLiked: c.isLiked || false,
                replies: c.replies || [],
                userId: c.userId,
              }));
              
              if (replace) {
                setComments(cachedComments);
              } else {
                setComments((prev) => {
                  const existingById = new Map(prev.map((p) => [p.id, p] as const));
                  const merged: Comment[] = [...prev];
                  for (const c of cachedComments) {
                    if (!existingById.has(c.id)) {
                      merged.push(c);
                    }
                  }
                  return merged;
                });
              }
              setHasMore(parsedCache.hasMore || false);
              setPage(parsedCache.page || 1);
              
              // Still fetch fresh data in background, but don't wait
              // This ensures cache is updated for next time
            }
          }
        } catch (cacheError) {
          console.warn("Cache read error:", cacheError);
        }
      }
      
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

      // Use smaller limit for first page (10) for faster loading, larger for pagination (20)
      const limit = pageNum === 1 ? 10 : 20;
      
      const res = await contentInteractionAPI.getComments(
        contentId,
        contentType,
        pageNum,
        limit,
        sort
      );
      
      console.log("📥 Comments loaded from server:", {
        contentId,
        contentType,
        commentCount: res.comments?.length || 0,
        totalComments: res.totalComments,
        hasMore: res.hasMore,
        firstComment: res.comments?.[0],
      });
      
      // Helper function to recursively map comments and their replies
      const mapComment = (c: any): Comment => {
        const first = c.firstName || c.userFirstName || c.user?.firstName || "";
        const last = c.lastName || c.userLastName || c.user?.lastName || "";
        const fullName = `${String(first).trim()} ${String(last).trim()}`.trim();
        const name = fullName || c.username || "User";
        
        const mappedComment: Comment = {
          id: c.id,
          userName: name,
          avatar: c.userAvatar || c.avatar || c.user?.avatar || "",
          timestamp: c.timestamp,
          comment: c.comment,
          likes: c.likes || 0,
          isLiked: c.isLiked || false,
          replies: Array.isArray(c.replies) && c.replies.length > 0
            ? c.replies.map((r: any) => mapComment(r))
            : [],
          // @ts-ignore optional
          userId: c.userId,
        };
        
        return mappedComment;
      };
      
      let mapped: Comment[] = (res.comments || []).map(mapComment);
      
      // Count total comments including replies for debugging
      const totalWithReplies = mapped.reduce((sum, c) => {
        return sum + 1 + (c.replies?.length || 0);
      }, 0);
      
      console.log("📊 Mapped comments:", {
        topLevel: mapped.length,
        totalWithReplies,
        expectedTotal: res.totalComments,
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
      
      // Cache the results for faster subsequent loads (only cache first page)
      if (pageNum === 1) {
        try {
          const cacheKey = `comments-cache-${contentId}-${sort}`;
          await AsyncStorage.setItem(cacheKey, JSON.stringify({
            comments: mapped,
            hasMore: res.hasMore,
            page: pageNum,
            timestamp: Date.now(),
          }));
          console.log("💾 Cached comments for faster next load");
        } catch (cacheError) {
          console.warn("Cache write error:", cacheError);
        }
      }
    } catch (e) {
      console.error("❌ Failed loading comments from server:", {
        contentId,
        contentType,
        error: e,
        pageNum,
      });
      // Don't throw error, just log it and continue with empty state
      if (replace) {
        setComments([]);
      }
      // If we have a comment count but no comments loaded, this might indicate an API issue
      // The UI will show empty, but the count badge will still show the number
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
  ): Promise<void> => {
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
              // Invalidate cache when new comment arrives via socket
              try {
                const cacheKey = `comments-cache-${currentContentId}-${sortBy}`;
                AsyncStorage.removeItem(cacheKey).catch(() => {});
              } catch {}
              
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
