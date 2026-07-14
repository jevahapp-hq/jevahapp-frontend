import { MaterialIcons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { MutableRefObject, memo, useEffect, useRef } from "react";
import { TouchableOpacity, View } from "react-native";
import contentInteractionAPI from "../../utils/contentInteractionAPI";
import { handleVideoError } from "../../../src/shared/utils/videoUrlManager";

interface ReelsVideoPlayerProps {
    videoKey: string;
    contentId: string;
    videoUrl: string;
    isActive: boolean;
    isMuted: boolean;
    videoVolume: number;
    isPlaying: boolean;
    videoRefs: MutableRefObject<Record<string, Video>>;
    onToggleVideoPlay: () => void;
    setVideoDuration: (d: number) => void;
    setVideoPosition: (p: number) => void;
    setLocalPosition: (p: number) => void;
    setLocalDuration: (d: number) => void;
    setIsDragging: (v: boolean) => void;
    isDragging: boolean;
    localDuration: number;
    videoPosition: number;
    globalVideoStore: any;
    mediaStore: any;
    userHasManuallyPaused: boolean;
    showPauseOverlay: boolean;
    getResponsiveSize: (s: number, m: number, l: number) => number;
    triggerHapticFeedback: () => void;
    isIOS: boolean;
}

/**
 * ReelsVideoPlayer - Isolated video player component for high-performance Reels feed
 */
const ReelsVideoPlayer = memo(({
    videoKey,
    contentId,
    videoUrl,
    isActive,
    isMuted,
    videoVolume,
    isPlaying,
    videoRefs,
    onToggleVideoPlay,
    setVideoDuration,
    setVideoPosition,
    setLocalPosition,
    setLocalDuration,
    setIsDragging,
    isDragging,
    localDuration,
    videoPosition,
    globalVideoStore,
    mediaStore,
    userHasManuallyPaused,
    showPauseOverlay,
    getResponsiveSize,
    triggerHapticFeedback,
    isIOS
}: ReelsVideoPlayerProps) => {

    const lastUpdateRef = useRef(0);
    const hasTrackedViewRef = useRef(false);

    useEffect(() => {
        hasTrackedViewRef.current = false;
    }, [contentId]);

    return (
        <View style={{ width: "100%", height: "100%", position: "absolute" }}>
            <Video
                ref={(ref) => {
                    if (ref) {
                        videoRefs.current[videoKey] = ref;
                        globalVideoStore.registerVideoPlayer(videoKey, {
                            pause: async () => {
                                try {
                                    await ref.pauseAsync();
                                    globalVideoStore.setOverlayVisible(videoKey, true);
                                } catch (err) { }
                            },
                            showOverlay: () => {
                                globalVideoStore.setOverlayVisible(videoKey, true);
                            },
                            key: videoKey,
                        });
                    } else {
                        delete videoRefs.current[videoKey];
                        globalVideoStore.unregisterVideoPlayer(videoKey);
                    }
                }}
                source={{
                    uri: videoUrl,
                    headers: {
                        "User-Agent": "JevahApp/1.0",
                        Accept: "video/*",
                    },
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                    zIndex: isActive ? 1 : 0,
                }}
                resizeMode={ResizeMode.COVER}
                isMuted={isMuted}
                volume={isMuted ? 0.0 : videoVolume}
                shouldPlay={isActive && isPlaying}
                useNativeControls={false}
                isLooping={true}
                onError={async (error) => {
                    handleVideoError(error as any, videoUrl, videoKey);
                    globalVideoStore.pauseVideo(videoKey);
                }}
                onLoad={(status: any) => {
                    mediaStore.setVideoLoaded(videoKey, true);
                    if (status.durationMillis) {
                        setLocalDuration(status.durationMillis);
                        setVideoDuration(status.durationMillis);
                    }
                    if (isPlaying && !userHasManuallyPaused) {
                        const ref = videoRefs.current[videoKey];
                        if (ref) ref.playAsync().catch(() => { });
                    }
                }}
                onPlaybackStatusUpdate={(status) => {
                    if (!isActive || !status.isLoaded) return;

                    // Rapid local update for slider smoothness
                    if (status.positionMillis !== undefined && !isDragging) {
                        setLocalPosition(status.positionMillis);
                    }

                    // Throttle updates to the parent/global store (every 500ms)
                    const now = Date.now();
                    if (now - lastUpdateRef.current > 500) {
                        lastUpdateRef.current = now;

                        if (status.durationMillis && (localDuration === 0 || localDuration !== status.durationMillis)) {
                            setVideoDuration(status.durationMillis);
                        }

                        if (!isDragging && status.positionMillis !== undefined) {
                            if (Math.abs(status.positionMillis - videoPosition) > 1000) {
                                setVideoPosition(status.positionMillis);
                            }
                        }

                        const pct = status.durationMillis
                            ? (status.positionMillis / status.durationMillis) * 100
                            : 0;
                        globalVideoStore.setVideoProgress(videoKey, pct);
                    }

                    if (
                        isActive &&
                        !hasTrackedViewRef.current &&
                        status.isPlaying &&
                        status.durationMillis
                    ) {
                        const positionMs = status.positionMillis || 0;
                        const progressPct = (positionMs / status.durationMillis) * 100;
                        const qualifies =
                            positionMs >= 3000 || progressPct >= 25 || status.didJustFinish;

                        if (qualifies) {
                            hasTrackedViewRef.current = true;
                            contentInteractionAPI
                                .recordView(contentId, "media", {
                                    durationMs: status.didJustFinish
                                        ? status.durationMillis
                                        : positionMs,
                                    progressPct: Math.round(progressPct),
                                    isComplete: Boolean(status.didJustFinish),
                                    source: "reels",
                                })
                                .then((result) => {
                                    if (result.counted === false) {
                                        hasTrackedViewRef.current = false;
                                    }
                                })
                                .catch(() => {
                                    hasTrackedViewRef.current = false;
                                });
                        }
                    }

                    if (status.didJustFinish) {
                        const ref = videoRefs.current[videoKey];
                        ref?.setPositionAsync(0).catch(() => { });
                        globalVideoStore.pauseVideo(videoKey);
                        triggerHapticFeedback();
                    }
                }}
                progressUpdateIntervalMillis={isIOS ? 100 : 250}
            />

            {/* Overlays */}
            {isActive && !isPlaying && (
                <View className="absolute inset-0 justify-center items-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.1)", zIndex: 10 }}>
                    <TouchableOpacity onPress={onToggleVideoPlay} activeOpacity={0.8}>
                        <MaterialIcons name="play-arrow" size={getResponsiveSize(50, 60, 70)} color="rgba(255, 255, 255, 0.6)" />
                    </TouchableOpacity>
                </View>
            )}

            {isActive && showPauseOverlay && isPlaying && (
                <View className="absolute inset-0 justify-center items-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.1)", zIndex: 30 }} pointerEvents="none">
                    <MaterialIcons name="pause" size={getResponsiveSize(50, 60, 70)} color="rgba(255, 255, 255, 0.6)" />
                </View>
            )}
        </View>
    );
}, (prev, next) => {
    // Only re-render if essential props change
    return (
        prev.videoUrl === next.videoUrl &&
        prev.isActive === next.isActive &&
        prev.isMuted === next.isMuted &&
        prev.isPlaying === next.isPlaying &&
        prev.showPauseOverlay === next.showPauseOverlay &&
        prev.isDragging === next.isDragging
    );
});

export default ReelsVideoPlayer;
