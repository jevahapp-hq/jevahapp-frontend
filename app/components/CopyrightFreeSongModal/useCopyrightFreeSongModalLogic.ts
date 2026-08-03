/**
 * useCopyrightFreeSongModalLogic - View tracking, realtime socket, like, seek pan responder
 */
import { useEffect, useRef } from "react";
import { PanResponder, View } from "react-native";
import copyrightFreeMusicAPI from "../../services/copyrightFreeMusicAPI";
import SocketManager from "../../services/SocketManager";
import { getApiBaseUrl } from "../../utils/api";
import { qualifiesPlaybackView } from "../../utils/contentInteraction/viewQualification";
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
    const { qualifies, finished } = qualifiesPlaybackView({
      family: "copyrightFree",
      isPlaying,
      positionMs,
      progress: audioProgress || 0,
      durationMs,
    });

    if (qualifies) {
      (async () => {
        if (isRecordingViewRef.current) return;
        isRecordingViewRef.current = true;

        try {
          const result = await copyrightFreeMusicAPI.recordView(songId, {
            durationMs: finished ? durationMs : positionMs,
            progressPct: Math.round((audioProgress || 0) * 100),
            isComplete: finished,
          });

          if (result.success && result.data) {
            // Only bump UI when BE counted this view
            if (result.data.counted === true) {
              setViewCount((prev) =>
                Math.max(result.data.viewCount ?? 0, likeCount ?? 0, prev)
              );
            }
            setHasTrackedView(true);
          }
        } catch (error) {
          if (__DEV__) console.warn("Failed to record copyright-free view:", error);
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
  setShareCount,
  setIsInLibrary,
  setSaveCount,
}: {
  visible: boolean;
  songId: string | null;
  setLikeCount: React.Dispatch<React.SetStateAction<number>>;
  setViewCount: React.Dispatch<React.SetStateAction<number>>;
  setIsLiked: React.Dispatch<React.SetStateAction<boolean>>;
  setShareCount?: React.Dispatch<React.SetStateAction<number>>;
  setIsInLibrary?: React.Dispatch<React.SetStateAction<boolean>>;
  setSaveCount?: React.Dispatch<React.SetStateAction<number>>;
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
            if (typeof data.shareCount === "number" && setShareCount) {
              setShareCount(data.shareCount);
            }
            if (typeof data.saveCount === "number" && setSaveCount) {
              setSaveCount(data.saveCount);
            }
            if (typeof data.saved === "boolean" && setIsInLibrary) {
              setIsInLibrary(data.saved);
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
        } catch { }
        manager.disconnect();
        socketManagerRef.current = null;
      }
    };
  }, [
    visible,
    songId,
    setLikeCount,
    setViewCount,
    setIsLiked,
    setShareCount,
    setIsInLibrary,
    setSaveCount,
  ]);
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
  progressBarRef: React.RefObject<View | null>;
  setIsSeeking: (v: boolean) => void;
  setSeekProgress: (v: number) => void;
}) {
  const layoutRef = useRef({ x: 0, width: 0 });

  return useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsSeeking(true);
        if (progressBarRef.current) {
          progressBarRef.current.measure((x, y, width, height, pageX) => {
            layoutRef.current = { x: pageX, width };
            const touchX = evt.nativeEvent.pageX;
            const progress = Math.max(0, Math.min(1, (touchX - pageX) / width));
            setSeekProgress(progress);
          });
        }
      },
      onPanResponderMove: (evt) => {
        const { x, width } = layoutRef.current;
        if (width > 0) {
          const touchX = evt.nativeEvent.pageX;
          const progress = Math.max(0, Math.min(1, (touchX - x) / width));
          setSeekProgress(progress);
        }
      },
      onPanResponderRelease: (evt) => {
        setIsSeeking(false);
        const { x, width } = layoutRef.current;
        if (width > 0 && onSeek) {
          const touchX = evt.nativeEvent.pageX;
          const progress = Math.max(0, Math.min(1, (touchX - x) / width));
          onSeek(progress);
        }
      },
    })
  ).current;
}
