import { useCallback, useRef, useState } from "react";
import type SocketManager from "../../services/SocketManager";

export type TypingUser = { userId: string; displayName: string };

type TypingAccessors = {
  getContentId: () => string;
  getContentType: () => string;
  getSocket: () => SocketManager | null;
  getCurrentUserId: () => string;
  getDisplayName: () => string;
};

/**
 * Local + remote typing indicators for the comments room.
 */
export function useCommentTyping(accessors: TypingAccessors) {
  const accessorsRef = useRef(accessors);
  accessorsRef.current = accessors;

  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingExpiryRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const localTypingStopRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const localTypingActiveRef = useRef(false);

  const clearTyping = useCallback(() => {
    setTypingUsers([]);
    localTypingActiveRef.current = false;
    if (localTypingStopRef.current) {
      clearTimeout(localTypingStopRef.current);
      localTypingStopRef.current = null;
    }
    typingExpiryRef.current.forEach((t) => clearTimeout(t));
    typingExpiryRef.current.clear();
  }, []);

  const applyRemoteTyping = useCallback((data: any) => {
    const a = accessorsRef.current;
    const contentId = a.getContentId();
    const cid = String(data?.contentId || "");
    if (cid && contentId && cid !== contentId) return;
    const uid = String(
      data?.userId || data?.user?._id || data?.user?.id || ""
    );
    if (!uid || uid === a.getCurrentUserId()) return;
    const name = String(
      data?.displayName ||
        data?.userName ||
        data?.username ||
        `${data?.user?.firstName || ""} ${data?.user?.lastName || ""}`.trim() ||
        "Someone"
    );
    const isTyping = data?.isTyping !== false;

    setTypingUsers((prev) => {
      const without = prev.filter((u) => u.userId !== uid);
      if (!isTyping) return without;
      return [...without, { userId: uid, displayName: name }];
    });

    const prevTimer = typingExpiryRef.current.get(uid);
    if (prevTimer) clearTimeout(prevTimer);
    if (isTyping) {
      typingExpiryRef.current.set(
        uid,
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== uid));
          typingExpiryRef.current.delete(uid);
        }, 3500)
      );
    } else {
      typingExpiryRef.current.delete(uid);
    }
  }, []);

  const setLocalTyping = useCallback((isTyping: boolean) => {
    const a = accessorsRef.current;
    const contentId = a.getContentId();
    const socket = a.getSocket();
    if (!contentId || !socket) return;
    const displayName = a.getDisplayName();
    const userId = a.getCurrentUserId();
    const contentType = a.getContentType();

    if (isTyping) {
      if (!localTypingActiveRef.current) {
        localTypingActiveRef.current = true;
        socket.sendCommentTyping(contentId, contentType, true, {
          userId,
          displayName,
        });
      }
      if (localTypingStopRef.current) clearTimeout(localTypingStopRef.current);
      localTypingStopRef.current = setTimeout(() => {
        localTypingActiveRef.current = false;
        socket.sendCommentTyping(contentId, contentType, false, {
          userId,
          displayName,
        });
      }, 1800);
    } else {
      if (localTypingStopRef.current) {
        clearTimeout(localTypingStopRef.current);
        localTypingStopRef.current = null;
      }
      if (localTypingActiveRef.current) {
        localTypingActiveRef.current = false;
        socket.sendCommentTyping(contentId, contentType, false, {
          userId,
          displayName,
        });
      }
    }
  }, []);

  const stopLocalTypingBroadcast = useCallback(() => {
    const a = accessorsRef.current;
    const contentId = a.getContentId();
    const socket = a.getSocket();
    if (!contentId || !socket) return;
    if (localTypingActiveRef.current) {
      localTypingActiveRef.current = false;
      socket.sendCommentTyping(contentId, a.getContentType(), false, {
        userId: a.getCurrentUserId(),
      });
    }
  }, []);

  return {
    typingUsers,
    setLocalTyping,
    applyRemoteTyping,
    clearTyping,
    stopLocalTypingBroadcast,
  };
}
