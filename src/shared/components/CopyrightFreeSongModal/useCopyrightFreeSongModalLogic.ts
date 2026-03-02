/**
 * useCopyrightFreeSongModalLogic - View tracking, realtime socket, like, seek pan responder
 */
import { useEffect, useRef } from "react";
import { PanResponder, View } from "react-native";
import copyrightFreeMusicAPI from "../../services/copyrightFreeMusicAPI";
import SocketManager from "../../services/SocketManager";
import { getApiBaseUrl } from "../../utils/api";
import TokenUtils from "../../utils/tokenUtils";

export function useCopyrightFreeSongViewTracking({
  visible,
  song,
  isPlaying,
  audioProgress,
  audioPosition,
  audioDuration,
  hasTrackedView,
  setHasTrackedView,
  setViewCount,
  likeCount,
}: {
  visible: boolean;
  song: any;
  isPlaying: boolean;
  audioProgress: number;
  audioPosition: number;
  audioDuration: number;
  hasTrackedView: boolean;
  setHasTrackedView: (v: boolean) => void;
  setViewCount: React.Dispatch<React.SetStateAction<number>>;
  likeCount: number;
}) {
  const isRecordingViewRef = useRef(false);

  useEffect(() => {
    const songId = song?._id || song?.id;
    if (!visible || !songId || hasTrackedView || !isPlaying || isRecordingViewRef.current) {
      return;
    }

    const durationMs = audioDuration || (song?.duration ? song.duration * 1000 : 0);
    const positionMs = audioPosition || 0;
    const progressPct = audioProgress ? Math.round(audioProgress * 100) : 0;
    const isComplete = durationMs > 0 && audioProgress >= 0.999;

    const meetsThreshold =
      positionMs >= 3000 || progressPct >= 25 || isComplete;

    if (meetsThreshold) {
      (async () => {
        if (isRecordingViewRef.current) return;
        isRecordingViewRef.current = true;

        try {
          const result = await copyrightFreeMusicAPI.recordView(songId, {
            durationMs: isComplete ? durationMs : positionMs,
            progressPct,
            isComplete,
          });

          if (result.success && result.data) {
            setViewCount((prev) =>
              Math.max(result.data.viewCount ?? 0, likeCount ?? 0, prev)
            );
            setHasTrackedView(true);
          } else {
            setHasTrackedView(true);
          }
        } catch (error) {
          setHasTrackedView(true);
        } finally {
          isRecordingViewRef.current = false;
        }
      })();
    }
  }, [
    visible,
    song?._id,
    song?.id,
    song?.duration,
    isPlaying,
    audioPosition,
    audioProgress,
    audioDuration,
    hasTrackedView,
    setHasTrackedView,
    setViewCount,
    likeCount,
  ]);
}

export function useCopyrightFreeSongRealtime({
  visible,
  songId,
  setLikeCount,
  setViewCount,
  setIsLiked,
}: {
  visible: boolean;
  songId: string | null;
  setLikeCount: React.Dispatch<React.SetStateAction<number>>;
  setViewCount: React.Dispatch<React.SetStateAction<number>>;
  setIsLiked: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const socketManagerRef = useRef<SocketManager | null>(null);

  useEffect(() => {
    if (!visible || !songId) return;

    let isActive = true;
    let socket: any = null;
    let handleRealtimeUpdate: ((data: any) => void) | null = null;

    const initSocket = async () => {
      try {
        const token = await TokenUtils.getAuthToken();
        if (!token || !isActive) return;

        const manager = new SocketManager({
          serverUrl: getApiBaseUrl(),
          authToken: token,
        });

        socketManagerRef.current = manager;
        await manager.connect();
        if (!isActive) {
          manager.disconnect();
          socketManagerRef.current = null;
          return;
        }

        socket = (manager as any).socket;
        if (!socket) return;

        try {
          manager.joinContentRoom(songId, "audio");
        } catch (e) {
          if (__DEV__) console.warn("⚠️ Failed to join real-time room for song:", e);
        }

        handleRealtimeUpdate = (data: any) => {
          try {
            if (!data || data.songId !== songId) return;
            if (typeof data.likeCount === "number") {
              setLikeCount((prev) =>
                Number.isFinite(data.likeCount) ? data.likeCount : prev
              );
            }
            if (typeof data.viewCount === "number") {
              const v = Number.isFinite(data.viewCount) ? data.viewCount : 0;
              const l =
                typeof data.likeCount === "number" && Number.isFinite(data.likeCount)
                  ? data.likeCount
                  : 0;
              setViewCount((prev) => Math.max(v, l, prev));
            }
            if (typeof data.liked === "boolean") {
              setIsLiked(data.liked);
            }
          } catch (e) {
            if (__DEV__) console.warn("⚠️ Error applying real-time song update:", e);
          }
        };

        socket.on("copyright-free-song-interaction-updated", handleRealtimeUpdate);
      } catch (error) {
        if (__DEV__) {
          console.warn("⚠️ Failed to initialize real-time updates for copyright-free song:", error);
        }
      }
    };

    initSocket();

    return () => {
      isActive = false;
      if (socket && handleRealtimeUpdate) {
        socket.off("copyright-free-song-interaction-updated", handleRealtimeUpdate);
      }
      const manager = socketManagerRef.current;
      if (manager) {
        try {
          if (songId) manager.leaveContentRoom(songId, "audio");
        } catch {}
        manager.disconnect();
        socketManagerRef.current = null;
      }
    };
  }, [visible, songId, setLikeCount, setViewCount, setIsLiked]);
}

export function useSeekPanResponder({
  audioProgress,
  onSeek,
  progressBarRef,
  setIsSeeking,
  setSeekProgress,
}: {
  audioProgress: number;
  onSeek?: (progress: number) => void;
  progressBarRef: React.RefObject<View>;
  setIsSeeking: (v: boolean) => void;
  setSeekProgress: (v: number) => void;
}) {
  return useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsSeeking(true);
        setSeekProgress(audioProgress);
      },
      onPanResponderMove: (evt) => {
        if (progressBarRef.current) {
          progressBarRef.current.measure((x, y, width) => {
            const touchX = evt.nativeEvent.locationX;
            const progress = Math.max(0, Math.min(1, touchX / width));
            setSeekProgress(progress);
          });
        }
      },
      onPanResponderRelease: (evt) => {
        setIsSeeking(false);
        if (progressBarRef.current && onSeek) {
          progressBarRef.current.measure((x, y, width) => {
            const touchX = evt.nativeEvent.locationX;
            const progress = Math.max(0, Math.min(1, touchX / width));
            onSeek(progress);
          });
        }
      },
    })
  ).current;
}
