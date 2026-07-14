/**
 * useAllContentTikTokSocket
 * Socket.IO initialization for real-time likes/comments
 */
import { useEffect, useRef } from "react";
import SocketManager from "../../../../../app/services/SocketManager";
import { useInteractionStore } from "../../../../../app/store/useInteractionStore";
import TokenUtils from "../../../../../app/utils/tokenUtils";

export function useAllContentTikTokSocket() {
  const managerRef = useRef<SocketManager | null>(null);

  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const authToken = await TokenUtils.getAuthToken();
        if (!authToken || authToken.trim() === "" || !TokenUtils.isValidJWTFormat(authToken)) return;

        const manager = new SocketManager({
          serverUrl: "https://api.jevahapp.com",
          authToken,
        });
        managerRef.current = manager;

        await manager.connect();
        const socket = (manager as any).socket;
        if (socket) {
          socket.on("content-reaction", (data: any) => {
            const total = Number(data.totalLikes ?? data.likeCount);
            if (data.contentId && Number.isFinite(total)) {
              useInteractionStore
                .getState()
                .mutateStats(String(data.contentId), () => ({
                  likes: Math.max(0, total),
                }));
            }
          });
          socket.on("content-comment", (data: any) => {
            const total = Number(data.totalComments ?? data.commentCount);
            if (data.contentId && Number.isFinite(total)) {
              useInteractionStore
                .getState()
                .mutateStats(String(data.contentId), () => ({
                  comments: Math.max(0, total),
                }));
            }
          });
        }
      } catch {
        managerRef.current = null;
      }
    };

    initializeSocket();
    return () => {
      if (managerRef.current) {
        managerRef.current.disconnect();
        managerRef.current = null;
      }
    };
  }, []);
}
