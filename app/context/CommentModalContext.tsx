import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useContext,
  useRef,
  useState,
} from "react";
import {
  mapCachedComment,
  mapCommentsDeep,
  toCachePayload,
  type CommentCreatorInfo,
  type CommentThreadItem,
} from "../components/comments";
import { useCommentTyping } from "../hooks/comments/useCommentTyping";
import SocketManager from "../services/SocketManager";
import { useInteractionStore } from "../store/useInteractionStore";
import { getApiBaseUrl } from "../utils/api";
import contentInteractionAPI, {
  hydrateCommentsCacheFromDisk,
  invalidateDiskCommentsCache,
  peekCachedComments,
  putCachedComments,
  writeDiskCommentsCache,
} from "../utils/contentInteractionAPI";
import TokenUtils from "../utils/tokenUtils";

type Comment = CommentThreadItem;

export type { CommentCreatorInfo };

export type SubmitCommentInput =
  | string
  | {
      text: string;
      mentions?: { userId: string; displayName: string }[];
      localImage?: { uri: string; type: string; name: string } | null;
    };

export type EditCommentInput = {
  content?: string;
  imageUrl?: string;
  clearImage?: boolean;
  localImage?: { uri: string; type: string; name: string } | null;
};

interface CommentModalContextType {
  isVisible: boolean;
  comments: Comment[];
  isLoadingComments: boolean;
  loadError: string | null;
  composerError: string | null;
  clearComposerError: () => void;
  showCommentModal: (
    comments: Comment[],
    contentId?: string,
    contentType?: "media" | "devotional",
    contentOwnerName?: string,
    creator?: CommentCreatorInfo | null
  ) => void;
  hideCommentModal: () => void;
  addComment: (comment: Comment) => void;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  likeComment: (commentId: string) => void;
  replyToComment: (
    commentId: string,
    replyTextOrPayload: SubmitCommentInput
  ) => Promise<void>;
  submitComment: (textOrPayload: SubmitCommentInput) => Promise<void>;
  editComment: (commentId: string, input: EditCommentInput) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  loadMoreComments: () => Promise<void>;
  retryLoadComments: () => Promise<void>;
  contentOwnerName?: string;
  contentCreator?: CommentCreatorInfo | null;
  /** Other users currently typing in this thread */
  typingUsers: { userId: string; displayName: string }[];
  /** Call from composer while the local user types */
  setLocalTyping: (isTyping: boolean) => void;
}

const CommentModalContext = createContext<CommentModalContextType | undefined>(
  undefined
);

export const useCommentModal = () => {
  const context = useContext(CommentModalContext);
  if (!context) {
    console.warn(
      "useCommentModal called outside of CommentModalProvider. Returning no-op implementation."
    );
    // Return a safe no-op implementation so the app doesn't crash if the hook
    // is accidentally used without the provider (similar pattern to useNotification).
    return {
      isVisible: false,
      comments: [] as Comment[],
      isLoadingComments: false,
      loadError: null,
      composerError: null,
      clearComposerError: () => {},
      showCommentModal: () => {},
      hideCommentModal: () => {},
      addComment: () => {},
      updateComment: () => {},
      likeComment: () => {},
      replyToComment: async () => {},
      submitComment: async () => {},
      editComment: async () => {},
      deleteComment: async () => {},
      loadMoreComments: async () => {},
      retryLoadComments: async () => {},
      contentOwnerName: undefined as string | undefined,
      contentCreator: null,
      typingUsers: [],
      setLocalTyping: () => {},
    } as CommentModalContextType;
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
  const [contentCreator, setContentCreator] = useState<CommentCreatorInfo | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "top">("newest");
  const loadGenRef = useRef(0);
  const [isOpening, setIsOpening] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);

  const { addComment: addCommentToStore, toggleCommentLike } =
    useInteractionStore();
  const socketManagerRef = useRef<SocketManager | null>(null);
  const currentUserIdRef = useRef<string>("");
  const currentUserFirstNameRef = useRef<string>("");
  const currentUserLastNameRef = useRef<string>("");
  const lastSheetRef = useRef<{ contentId: string; comments: Comment[] } | null>(
    null
  );
  const currentContentIdRef = useRef("");
  const currentContentTypeRef = useRef<"media" | "devotional">("media");

  const typing = useCommentTyping({
    getContentId: () => currentContentIdRef.current,
    getContentType: () => currentContentTypeRef.current,
    getSocket: () => socketManagerRef.current,
    getCurrentUserId: () => currentUserIdRef.current,
    getDisplayName: () =>
      `${currentUserFirstNameRef.current} ${currentUserLastNameRef.current}`.trim() ||
      "You",
  });
  const {
    typingUsers,
    setLocalTyping,
    applyRemoteTyping,
    clearTyping,
    stopLocalTypingBroadcast,
  } = typing;

  const showCommentModal = (
    newComments: Comment[],
    contentId?: string,
    contentType: "media" | "devotional" = "media",
    contentOwnerName?: string,
    creator?: CommentCreatorInfo | null
  ) => {
    const type = contentType || "media";

    // Paint sheet IMMEDIATELY — no awaits on open path
    setIsVisible(true);
    setLoadError(null);
    setComposerError(null);
    setIsOpening(false);
    if (contentId) setCurrentContentId(contentId);
    setCurrentContentType(type);
    if (contentId) currentContentIdRef.current = contentId;
    currentContentTypeRef.current = type;
    if (contentOwnerName) setCurrentContentOwnerName(contentOwnerName);
    if (creator?.displayName) {
      setContentCreator(creator);
      if (!contentOwnerName) setCurrentContentOwnerName(creator.displayName);
    } else if (contentOwnerName) {
      setContentCreator({
        userId: "",
        displayName: contentOwnerName,
      });
    } else {
      setContentCreator(null);
    }
    setPage(1);
    setHasMore(true);

    let instant: Comment[] = [];
    if (contentId) {
      const mem = peekCachedComments(contentId, sortBy);
      if (mem?.comments?.length) {
        instant = mem.comments.map(mapCachedComment).filter((c) => c.id);
      } else if (
        lastSheetRef.current?.contentId === contentId &&
        lastSheetRef.current.comments.length
      ) {
        instant = lastSheetRef.current.comments;
      } else {
        try {
          const storeComments =
            useInteractionStore.getState().comments[contentId];
          if (Array.isArray(storeComments) && storeComments.length > 0) {
            instant = storeComments
              .slice(0, 20)
              .map(mapCachedComment)
              .filter((c) => c.id);
          }
        } catch {
          // no-op
        }
      }
    }
    if (newComments?.length && instant.length === 0) {
      instant = newComments;
    }

    if (instant.length > 0) {
      setComments(instant);
      setIsLoadingComments(false);
    } else {
      // Known-zero from feed stats → show empty CTA immediately (no infinite skeleton)
      let knownEmpty = false;
      if (contentId) {
        try {
          const stats = useInteractionStore.getState().stats[contentId];
          if (
            stats?.commentsConfirmed &&
            Number(stats.comments || 0) === 0
          ) {
            knownEmpty = true;
          }
        } catch {
          // no-op
        }
      }
      setComments([]);
      setIsLoadingComments(!knownEmpty);
    }

    clearTyping();

    if (contentId) {
      const knownEmptyFromStats = (() => {
        try {
          const stats = useInteractionStore.getState().stats[contentId];
          return Boolean(
            stats?.commentsConfirmed && Number(stats.comments || 0) === 0
          );
        } catch {
          return false;
        }
      })();

      // Disk → memory hydrate (survives app kill). Apply if list still empty.
      void hydrateCommentsCacheFromDisk(contentId, sortBy).then((disk) => {
        if (!disk?.comments?.length) return;
        const mapped = disk.comments.map(mapCachedComment).filter((c) => c.id);
        if (!mapped.length) return;
        setComments((prev) => (prev.length > 0 ? prev : mapped));
        setIsLoadingComments(false);
      });

      // Silent when we already have cache OR confirmed zero — avoid skeleton flash
      void loadCommentsFromServer(contentId, type, 1, sortBy, true, {
        silent: instant.length > 0 || knownEmptyFromStats,
      });

      // Never leave skeleton forever if the request hangs (offline / timeout)
      const openedFor = contentId;
      setTimeout(() => {
        if (currentContentIdRef.current !== openedFor) return;
        setIsLoadingComments((still) => (still ? false : still));
      }, 10000);

      void AsyncStorage.getItem("user")
        .then((userStr) => {
          if (!userStr) return;
          try {
            const u = JSON.parse(userStr);
            currentUserIdRef.current = String(u?._id || u?.id || "");
            currentUserFirstNameRef.current = String(u?.firstName || "");
            currentUserLastNameRef.current = String(u?.lastName || "");
          } catch {
            // no-op
          }
        })
        .catch(() => {});
      void joinRealtimeRoom(contentId, type).catch(() => {});
    }
  };

  const hideCommentModal = () => {
    if (currentContentId && comments.length > 0) {
      lastSheetRef.current = {
        contentId: currentContentId,
        comments,
      };
      try {
        putCachedComments(currentContentId, sortBy, {
          comments: toCachePayload(currentContentId, comments) as any,
          totalComments: comments.length,
          hasMore,
        });
        void writeDiskCommentsCache(currentContentId, sortBy, {
          comments,
          hasMore,
          totalComments: comments.length,
        });
      } catch {}
    }
    setIsVisible(false);
    setIsOpening(false);
    setLoadError(null);
    clearTyping();
    stopLocalTypingBroadcast();
    // Do NOT clear comments — keeps reopen instant
    try {
      socketManagerRef.current?.leaveContentRoom(
        currentContentId,
        currentContentType
      );
    } catch {}
  };

  /**
   * Add a comment using functional update to ensure immutability
   * Creates a new array reference so React detects the change
   */
  const addComment = (comment: Comment) => {
    setComments((prev) => [comment, ...prev]);
  };

  /**
   * Update a comment using functional update with immutability
   * Maps over array and creates new object reference for the updated comment
   */
  const updateComment = (commentId: string, updates: Partial<Comment>) => {
    setComments((prev) =>
      mapCommentsDeep(prev, commentId, (c) => ({ ...c, ...updates }))
    );
  };

  /**
   * Like a comment with optimistic update and rollback mechanism
   * Uses functional updates to capture current state before optimistic change
   * Ensures proper rollback even if multiple rapid clicks occur
   */
  const likeComment = async (commentId: string) => {
    // Capture previous state using functional update (best practice for optimistic updates)
    let previousState: { isLiked: boolean; likes: number } | null = null;
    
    // Optimistic update - update UI immediately for better UX
    setComments((prev) => {
      return prev.map((comment) => {
        if (comment.id === commentId) {
          // Store previous state for potential rollback
          previousState = { isLiked: comment.isLiked, likes: comment.likes };
          
          // Create new object with updated values (immutability)
          return {
            ...comment,
            isLiked: !comment.isLiked,
            likes: comment.isLiked ? Math.max(0, comment.likes - 1) : comment.likes + 1,
          };
        }
        return comment;
      });
    });

    try {
      // Call backend reaction toggle
      await contentInteractionAPI.toggleCommentLike(commentId);
    } catch (error) {
      console.error("Error liking comment:", error);
      
      // Rollback to previous state if API call failed
      if (previousState !== null) {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  isLiked: previousState!.isLiked,
                  likes: previousState!.likes,
                }
              : comment
          )
        );
      }
    }
  };

  const normalizeSubmitInput = (
    textOrPayload: SubmitCommentInput
  ): {
    text: string;
    mentions?: { userId: string; displayName: string }[];
    localImage?: { uri: string; type: string; name: string } | null;
  } => {
    if (typeof textOrPayload === "string") {
      return { text: textOrPayload };
    }
    return {
      text: textOrPayload.text || "",
      mentions: textOrPayload.mentions,
      localImage: textOrPayload.localImage,
    };
  };

  const replyToComment = async (
    commentId: string,
    replyTextOrPayload: SubmitCommentInput
  ) => {
    try {
      if (!currentContentId) return;
      const { text, mentions, localImage } =
        normalizeSubmitInput(replyTextOrPayload);
      if (!text.trim() && !localImage) return;

      const token =
        (await AsyncStorage.getItem("userToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token) return;

      const tempId = `temp-${Date.now()}`;
      const optimisticReply: Comment = {
        id: tempId,
        userName:
          `${currentUserFirstNameRef.current} ${currentUserLastNameRef.current}`.trim() ||
          "You",
        avatar: "",
        timestamp: new Date().toISOString(),
        comment: text.trim(),
        likes: 0,
        isLiked: false,
        parentId: commentId,
        userId: currentUserIdRef.current,
        imageUrl: localImage?.uri,
        mentions,
      };
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies: [...(c.replies || []), optimisticReply] }
            : c
        )
      );

      await contentInteractionAPI.addComment(
        currentContentId,
        text.trim(),
        currentContentType,
        {
          parentCommentId: commentId,
          mentions,
          localImage,
        }
      );
    } catch (error) {
      const err = error as Error & { status?: number; statusText?: string; code?: string };

      console.error("Error adding reply:", {
        error: err.message,
        status: err.status,
        statusText: err.statusText,
        commentId,
        contentId: currentContentId,
      });

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: (c.replies || []).filter(
                  (reply) => !reply.id.startsWith("temp-")
                ),
              }
            : c
        )
      );

      if (err.code === "COMMENT_IMAGE_UNSUPPORTED") {
        setComposerError(err.message);
      }
      throw error;
    }
  };

  const submitComment = async (textOrPayload: SubmitCommentInput) => {
    try {
      if (!currentContentId) return;
      const { text, mentions, localImage } =
        normalizeSubmitInput(textOrPayload);
      if (!text.trim() && !localImage) return;

      const token =
        (await AsyncStorage.getItem("userToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token) return;

      const trimmed = text.trim();
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
        userId: currentUserIdRef.current,
        imageUrl: localImage?.uri,
        mentions,
      };
      setComments((prev) => [optimistic, ...prev]);

      try {
        const store = useInteractionStore.getState();
        store.mutateStats(currentContentId, (s) => ({
          comments: Math.max(0, (s?.comments || 0) + 1),
          commentsConfirmed: true,
        }));
      } catch {}

      const created = await contentInteractionAPI.addComment(
        currentContentId,
        trimmed,
        currentContentType,
        {
          mentions,
          localImage,
        }
      );

      const createdComment: Comment = {
        id: created.id,
        userName: created.username,
        avatar: created.userAvatar || "",
        timestamp: created.timestamp,
        comment: created.comment,
        likes: created.likes || 0,
        isLiked: false,
        replies: [],
        userId: created.userId,
        imageUrl: created.imageUrl,
        mentions: created.mentions,
      };

      setComments((prev) => {
        const withoutTemps = prev.filter((c) => !c.id.startsWith("temp-"));
        return [createdComment, ...withoutTemps];
      });

      try {
        const cacheKey = `comments-cache-${currentContentId}-${sortBy}`;
        await AsyncStorage.removeItem(cacheKey);
      } catch {}

      try {
        useInteractionStore.setState((state: any) => {
          const existing = state.comments[currentContentId] || [];
          return {
            comments: {
              ...state.comments,
              [currentContentId]: [
                {
                  id: created.id,
                  userName: created.username,
                  username: created.username,
                  avatar: created.userAvatar || "",
                  timestamp: created.timestamp,
                  comment: created.comment,
                  likes: created.likes || 0,
                  isLiked: false,
                  userId: created.userId,
                  imageUrl: created.imageUrl,
                  mentions: created.mentions,
                },
                ...existing.filter(
                  (c: any) =>
                    c.id !== created.id && !String(c.id).startsWith("temp-")
                ),
              ],
            },
          };
        });
      } catch {
        // no-op
      }
    } catch (e) {
      const error = e as Error & {
        status?: number;
        statusText?: string;
        code?: string;
      };

      console.error("Error submitting comment:", {
        error: error.message,
        status: error.status,
        statusText: error.statusText,
        contentId: currentContentId,
      });

      setComments((prev) =>
        prev.filter((comment) => !comment.id.startsWith("temp-"))
      );

      try {
        const store = useInteractionStore.getState();
        store.mutateStats(currentContentId, (s) => ({
          comments: Math.max(0, (s?.comments || 0) - 1),
        }));
      } catch {
        // Silently fail rollback
      }

      if (error.code === "COMMENT_IMAGE_UNSUPPORTED") {
        setComposerError(error.message);
      }

      throw error;
    }
  };

  const editComment = async (commentId: string, input: EditCommentInput) => {
    if (!commentId) return;

    let snapshot: Comment | null = null;
    const findIn = (
      list: Array<Comment | NonNullable<Comment["replies"]>[number]>
    ): Comment | null => {
      for (const c of list) {
        if (c.id === commentId) return c as Comment;
        const replies = (c as Comment).replies;
        if (replies?.length) {
          const hit = findIn(replies);
          if (hit) return hit;
        }
      }
      return null;
    };

    setComments((prev) => {
      if (!snapshot) snapshot = findIn(prev);
      const base = snapshot;
      const nextContent =
        input.content != null ? input.content : base?.comment || "";
      let nextImage = base?.imageUrl;
      if (input.clearImage) nextImage = undefined;
      else if (input.localImage?.uri) nextImage = input.localImage.uri;
      else if (input.imageUrl) nextImage = input.imageUrl;

      return mapCommentsDeep(prev, commentId, (c) => ({
        ...c,
        comment: nextContent,
        imageUrl: nextImage,
        isEdited: true,
        editedAt: new Date().toISOString(),
      }));
    });

    try {
      const updated = await contentInteractionAPI.editComment(commentId, {
        content: input.content,
        imageUrl: input.imageUrl,
        clearImage: input.clearImage,
        localImage: input.localImage,
      });

      setComments((prev) =>
        mapCommentsDeep(prev, commentId, (c) => ({
          ...c,
          comment: updated.comment,
          imageUrl: updated.imageUrl,
          mentions: updated.mentions ?? c.mentions,
          isEdited: updated.isEdited ?? true,
          editedAt: updated.editedAt || new Date().toISOString(),
          userName: updated.username || c.userName,
          avatar: updated.userAvatar || c.avatar,
        }))
      );

      try {
        const cacheKey = `comments-cache-${currentContentId}-${sortBy}`;
        await AsyncStorage.removeItem(cacheKey);
      } catch {}
    } catch (e) {
      const rollBack = snapshot;
      if (rollBack) {
        setComments((prev) =>
          mapCommentsDeep(prev, commentId, () => rollBack)
        );
      }
      const error = e as Error & { code?: string; message?: string };
      if (
        error.code === "COMMENT_IMAGE_UNSUPPORTED" ||
        error.code === "COMMENT_EDIT_WINDOW_EXPIRED" ||
        error.code === "COMMENT_CONTENT_REQUIRED"
      ) {
        setComposerError(error.message || "Couldn't update comment");
      }
      throw e;
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!commentId) return;

    let snapshot: Comment[] | null = null;
    setComments((prev) => {
      snapshot = prev;
      return mapCommentsDeep(prev, commentId, () => null);
    });

    try {
      const store = useInteractionStore.getState();
      store.mutateStats(currentContentId, (s) => ({
        comments: Math.max(0, (s?.comments || 0) - 1),
        commentsConfirmed: true,
      }));
    } catch {}

    try {
      await contentInteractionAPI.deleteComment(commentId);
      try {
        const cacheKey = `comments-cache-${currentContentId}-${sortBy}`;
        await AsyncStorage.removeItem(cacheKey);
      } catch {}
    } catch (e) {
      if (snapshot) setComments(snapshot);
      try {
        const store = useInteractionStore.getState();
        store.mutateStats(currentContentId, (s) => ({
          comments: Math.max(0, (s?.comments || 0) + 1),
        }));
      } catch {}
      throw e;
    }
  };

  const loadCommentsFromServer = async (
    contentId: string,
    contentType: "media" | "devotional",
    pageNum: number,
    sort: "newest" | "oldest" | "top",
    replace: boolean = false,
    opts?: { silent?: boolean }
  ) => {
    const gen = ++loadGenRef.current;
    if (pageNum === 1 && replace && !opts?.silent) {
      setIsLoadingComments(true);
      setLoadError(null);
    } else if (pageNum === 1 && replace && opts?.silent) {
      setLoadError(null);
    }
    try {
      // First page smaller for faster TTFB
      const limit = pageNum === 1 ? 12 : 20;

      const res = await contentInteractionAPI.getComments(
        contentId,
        contentType,
        pageNum,
        limit,
        sort
      );

      if (gen !== loadGenRef.current) {
        // Stale response — still clear loading if a newer request isn't in flight
        // with a higher gen that will clear it. Safer no-op when superseded.
        return;
      }

      const mapComment = (c: any): Comment => {
        const first =
          c.firstName ||
          c.userFirstName ||
          c.user?.firstName ||
          c.author?.firstName ||
          "";
        const last =
          c.lastName ||
          c.userLastName ||
          c.user?.lastName ||
          c.author?.lastName ||
          "";
        const fullName = `${String(first).trim()} ${String(last).trim()}`.trim();
        const name =
          fullName || c.username || c.userName || c.user?.username || "User";

        return {
          id: c.id || c._id,
          userName: name,
          avatar:
            c.userAvatar ||
            c.avatar ||
            c.user?.avatar ||
            c.user?.avatarUrl ||
            c.author?.avatar ||
            "",
          timestamp: c.timestamp || c.createdAt,
          comment: c.comment || c.content,
          likes: c.likes || c.likesCount || 0,
          isLiked: Boolean(c.isLiked || false),
          imageUrl:
            c.imageUrl ||
            c.image ||
            c.mediaUrl ||
            c.attachmentUrl ||
            undefined,
          mentions: Array.isArray(c.mentions) ? c.mentions : undefined,
          isEdited: Boolean(c.isEdited || c.edited),
          editedAt: c.editedAt ? String(c.editedAt) : undefined,
          replies:
            Array.isArray(c.replies) && c.replies.length > 0
              ? c.replies.map((r: any) => mapComment(r))
              : [],
          userId: c.userId || c.user?._id || c.author?._id,
        };
      };

      const mapped: Comment[] = (res.comments || [])
        .map(mapComment)
        .filter((c) => c.id && String(c.id) !== "undefined");

      const total = Number(res.totalComments || 0);
      // Never treat an empty next page as “couldn't load” when we already have rows.
      // Also don't trust a stale hasMore:true when this page is short.
      const nextHasMore =
        mapped.length >= limit &&
        pageNum * limit < Math.max(total, mapped.length);

      setComments((prev) => {
        if (replace) return mapped;
        if (mapped.length === 0) return prev;
        const existingById = new Map(prev.map((p) => [p.id, p] as const));
        const merged: Comment[] = prev.map((p) => {
          const newer = mapped.find((m) => m.id === p.id);
          // Refresh fields (e.g. imageUrl) if server sent a fuller row
          return newer ? { ...p, ...newer } : p;
        });
        for (const m of mapped) {
          if (!existingById.has(m.id)) merged.push(m);
        }
        return merged;
      });
      setHasMore(nextHasMore);
      setPage(pageNum);
      setIsLoadingComments(false);

      if (pageNum === 1) {
        setLoadError(
          mapped.length === 0 && total === 0
            ? null
            : mapped.length === 0 && total > 0
              ? "Comments couldn't be loaded. Pull to retry."
              : null
        );
      } else if (mapped.length === 0) {
        setHasMore(false);
      }

      if (mapped.length === 0 && total === 0 && replace) {
        setLoadError(null);
      }

      if (typeof res.totalComments === "number") {
        try {
          useInteractionStore.getState().mutateStats(contentId, () => ({
            comments: Math.max(0, res.totalComments),
            commentsConfirmed: true,
          }));
        } catch {
          // no-op
        }
      }

      if (pageNum === 1 && mapped.length > 0) {
        lastSheetRef.current = { contentId, comments: mapped };
        putCachedComments(contentId, sort, {
          comments: toCachePayload(contentId, mapped) as any,
          totalComments: total || mapped.length,
          hasMore: nextHasMore,
        });
        void writeDiskCommentsCache(contentId, sort, {
          comments: mapped,
          hasMore: nextHasMore,
          totalComments: total || mapped.length,
          page: pageNum,
        });
      }
    } catch (e) {
      if (gen !== loadGenRef.current) return;
      if (__DEV__) {
        console.error("❌ Failed loading comments:", e);
      }
      if (!opts?.silent) {
        setLoadError("Couldn't load comments. Tap to retry.");
      }
      setIsLoadingComments(false);
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

  const retryLoadComments = async () => {
    if (!currentContentId) return;
    setLoadError(null);
    await loadCommentsFromServer(
      currentContentId,
      currentContentType,
      1,
      sortBy,
      true
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
          serverUrl: getApiBaseUrl(),
          authToken: token,
        });
        await manager.connect();
        manager.setEventHandlers({
          onContentComment: (data: any) => {
            const activeId = currentContentIdRef.current;
            if (data?.contentId === activeId) {
              try {
                void invalidateDiskCommentsCache(activeId, sortBy);
              } catch {}
              loadCommentsFromServer(
                activeId,
                currentContentTypeRef.current,
                1,
                sortBy,
                true,
                { silent: true }
              );
              try {
                useInteractionStore.getState().refreshContentStats(activeId);
              } catch {}
            }
          },
          onCommentTyping: applyRemoteTyping,
        });
        socketManagerRef.current = manager;
      } else {
        socketManagerRef.current.setEventHandlers({
          onCommentTyping: applyRemoteTyping,
        });
      }
      socketManagerRef.current.joinContentRoom(contentId, contentType);
    } catch (e) {
      // console.warn("Realtime room join failed:", e);
    }
  };

  const value: CommentModalContextType = {
    isVisible,
    comments,
    isLoadingComments,
    loadError,
    composerError,
    clearComposerError: () => setComposerError(null),
    showCommentModal,
    hideCommentModal,
    addComment,
    updateComment,
    likeComment,
    replyToComment,
    submitComment,
    editComment,
    deleteComment,
    loadMoreComments,
    retryLoadComments,
    contentOwnerName: currentContentOwnerName,
    contentCreator,
    typingUsers,
    setLocalTyping,
  };

  return (
    <CommentModalContext.Provider value={value}>
      {children}
    </CommentModalContext.Provider>
  );
};
