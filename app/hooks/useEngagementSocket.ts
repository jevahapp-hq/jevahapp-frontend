/**
 * Shared live-engagement socket: count-only updates + focused content rooms.
 * Used by For You feed and Reels so join/leave + listeners stay DRY.
 */
import { useEffect, useRef } from "react";
import SocketManager from "../services/SocketManager";
import { applyLiveEngagementCounts } from "../utils/contentInteraction/socketCounts";
import { mapContentTypeForBackend } from "../utils/engagementHelpers";
import TokenUtils from "../utils/tokenUtils";

export type UseEngagementSocketOptions = {
  focusedContentId?: string | null;
  focusedContentType?: string | null;
  /** Override API origin when needed */
  serverUrl?: string;
};

function bindCountOnlyListeners(socket: any) {
  const onPayload = (data: any) => applyLiveEngagementCounts(data);

  socket.on("content-reaction", onPayload);
  socket.on("count-update", onPayload);
  socket.on("content-like-update", onPayload);
  socket.on("like-updated", onPayload);
  socket.on("content-comment", (data: any) => {
    applyLiveEngagementCounts({
      contentId: data?.contentId,
      commentCount: data?.totalComments ?? data?.commentCount ?? data?.comments,
      likeCount: data?.likeCount ?? data?.totalLikes,
    });
  });

  return () => {
    socket.off("content-reaction", onPayload);
    socket.off("count-update", onPayload);
    socket.off("content-like-update", onPayload);
    socket.off("like-updated", onPayload);
  };
}

export function useEngagementSocket(options: UseEngagementSocketOptions = {}) {
  const managerRef = useRef<SocketManager | null>(null);
  const joinedRef = useRef<{ contentId: string; contentType: string } | null>(
    null
  );
  const focusedRef = useRef<{
    contentId: string | null;
    contentType: string;
  }>({
    contentId: options.focusedContentId ?? null,
    contentType: mapContentTypeForBackend(
      options.focusedContentType || "media"
    ),
  });

  focusedRef.current = {
    contentId: options.focusedContentId?.trim() || null,
    contentType: mapContentTypeForBackend(
      options.focusedContentType || "media"
    ),
  };

  const syncJoinedRoom = () => {
    const manager = managerRef.current;
    const nextId = focusedRef.current.contentId;
    const nextType = focusedRef.current.contentType;
    const prev = joinedRef.current;

    if (
      prev &&
      (!nextId || prev.contentId !== nextId || prev.contentType !== nextType)
    ) {
      manager?.leaveContentRoom(prev.contentId, prev.contentType);
      joinedRef.current = null;
    }

    if (nextId && manager && !joinedRef.current) {
      manager.joinContentRoom(nextId, nextType);
      joinedRef.current = { contentId: nextId, contentType: nextType };
    } else if (
      nextId &&
      manager &&
      joinedRef.current &&
      (joinedRef.current.contentId !== nextId ||
        joinedRef.current.contentType !== nextType)
    ) {
      manager.joinContentRoom(nextId, nextType);
      joinedRef.current = { contentId: nextId, contentType: nextType };
    }
  };

  useEffect(() => {
    let unbind: (() => void) | undefined;
    let cancelled = false;
    const serverUrl = options.serverUrl || "https://api.jevahapp.com";

    const initializeSocket = async () => {
      try {
        const authToken = await TokenUtils.getAuthToken();
        if (
          !authToken ||
          authToken.trim() === "" ||
          !TokenUtils.isValidJWTFormat(authToken)
        ) {
          return;
        }

        const manager = new SocketManager({ serverUrl, authToken });
        if (cancelled) {
          manager.disconnect();
          return;
        }
        managerRef.current = manager;

        await manager.connect();
        if (cancelled) {
          manager.disconnect();
          managerRef.current = null;
          return;
        }

        const socket = (manager as any).socket;
        if (socket) unbind = bindCountOnlyListeners(socket);
        syncJoinedRoom();
      } catch {
        managerRef.current = null;
      }
    };

    void initializeSocket();

    return () => {
      cancelled = true;
      unbind?.();
      if (joinedRef.current && managerRef.current) {
        const { contentId, contentType } = joinedRef.current;
        managerRef.current.leaveContentRoom(contentId, contentType);
        joinedRef.current = null;
      }
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.serverUrl]);

  useEffect(() => {
    syncJoinedRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.focusedContentId, options.focusedContentType]);
}
