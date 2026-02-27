/**
 * useAllContentTikTokSocket
 * Socket.IO initialization for real-time likes/comments
 */
import { useEffect, useRef } from "react";
import SocketManager from "../../../../../app/services/SocketManager";
import TokenUtils from "../../../../../app/utils/tokenUtils";

export function useAllContentTikTokSocket(
  setSocketManager: (m: SocketManager | null) => void,
  setRealTimeCounts: React.Dispatch<React.SetStateAction<Record<string, any>>>
) {
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

        const socket = (manager as any).socket;
        if (socket) {
          socket.on("content-reaction", (data: any) => {
            setRealTimeCounts((prev) => ({
              ...prev,
              [data.contentId]: { ...prev[data.contentId], likes: data.totalLikes, liked: data.liked },
            }));
          });
          socket.on("content-comment", (data: any) => {
            setRealTimeCounts((prev) => ({
              ...prev,
              [data.contentId]: { ...prev[data.contentId], comments: data.totalComments },
            }));
          });
        }

        await manager.connect();
        setSocketManager(manager);
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
      setSocketManager(null);
    };
  }, []);
}
