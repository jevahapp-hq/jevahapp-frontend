import { useCallback, useRef } from "react";
import SocketManager from "../../../../services/SocketManager";
import TokenUtils from "../../../../utils/tokenUtils";
import { API_BASE_URL } from "../../constants";
import type { UploadState } from "../../types";
import { mapUploadProgressEvent } from "./mapUploadProgress";
import { useUploadStatusPoll } from "./useUploadStatusPoll";

type ProgressStage = {
  uploadId: string;
  progress: number;
  stage: string;
  message: string;
  timestamp: string;
};

export function useUploadSocketProgress(
  setUploadState: (
    v: UploadState | ((prev: UploadState) => UploadState)
  ) => void,
  stopSimulated: () => void
) {
  const socketManagerRef = useRef<SocketManager | null>(null);
  const currentUploadIdRef = useRef<string | null>(null);
  const isUsingRealTimeProgressRef = useRef(false);

  const { startPoll, stopPoll, markRealtimeEvent } = useUploadStatusPoll(
    setUploadState,
    stopSimulated,
    isUsingRealTimeProgressRef
  );

  const cleanupSocket = useCallback(() => {
    stopPoll();
    if (socketManagerRef.current) {
      const socket = (socketManagerRef.current as { socket?: { off: Function } })
        .socket;
      socket?.off("upload-progress");
      socketManagerRef.current.disconnect();
      socketManagerRef.current = null;
    }
    currentUploadIdRef.current = null;
    isUsingRealTimeProgressRef.current = false;
  }, [stopPoll]);

  const connectSocket = useCallback(
    async (uploadId: string) => {
      currentUploadIdRef.current = uploadId;
      isUsingRealTimeProgressRef.current = false;

      // Always arm poll fallback (no-ops if BE returns 404)
      startPoll(uploadId);

      try {
        const token = await TokenUtils.getAuthToken();
        if (!token || !TokenUtils.isValidJWTFormat(token)) return;

        const socketManager = new SocketManager({
          serverUrl: API_BASE_URL,
          authToken: token,
        });
        await socketManager.connect();

        const socket = (socketManager as { socket?: any }).socket;
        if (!socket) return;

        socketManagerRef.current = socketManager;

        const handleUploadProgress = (progressData: ProgressStage) => {
          if (progressData.uploadId !== uploadId) return;

          markRealtimeEvent();
          const mapped = mapUploadProgressEvent(progressData);
          setUploadState({
            status: mapped.status,
            progress: mapped.progress,
            message: mapped.message,
          });
        };

        socket.on("upload-progress", handleUploadProgress);

        if (!socket.connected) {
          const connectionTimeout = setTimeout(() => {
            if (!socket.connected) {
              console.warn(
                "⚠️ Socket.IO connection timeout — poll/sim progress active"
              );
            }
          }, 3000);
          socket.once("connect", () => {
            clearTimeout(connectionTimeout);
          });
        }
      } catch (socketError) {
        console.warn("⚠️ Failed to initialize Socket.IO:", socketError);
      }
    },
    [markRealtimeEvent, setUploadState, startPoll]
  );

  return {
    connectSocket,
    cleanupSocket,
    isUsingRealTimeProgressRef,
    socketManagerRef,
  };
}
