import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";

interface LazyVideoPlayerProps {
    videoUrl: string;
    isMuted: boolean;
    videoVolume: number;
    onStatusUpdate?: (status: any) => void;
    style?: any;
}

/**
 * LazyVideoPlayer - Encapsulates the heavy native player allocation.
 * This component should only be rendered when the video is actually needed
 * (visible or about to play).
 */
export const LazyVideoPlayer: React.FC<LazyVideoPlayerProps> = ({
    videoUrl,
    isMuted,
    videoVolume,
    onStatusUpdate,
    style,
}) => {
    const isMountedRef = useRef(true);

    const player = useVideoPlayer(videoUrl, (p) => {
        p.loop = false;
        p.muted = isMuted;
        p.volume = videoVolume;
        p.timeUpdateEventInterval = 0.25;
    });

    // Share the player instance with the parent if status updates are needed
    useEffect(() => {
        if (onStatusUpdate) {
            onStatusUpdate(player);
        }
    }, [player, onStatusUpdate]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            // Native player cleanup is handled by expo-video on unmount
        };
    }, []);

    return (
        <VideoView
            player={player}
            style={[styles.full, style]}
            contentFit="cover"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
            // VideoCard is rendered inside scrollable feeds where more than
            // one VideoView can be mounted simultaneously. The default
            // Android `surfaceView` can fail to render (or render out of
            // bounds) when views overlap - see the known upstream issue:
            // https://github.com/androidx/media/issues/1107
            surfaceType="textureView"
        />
    );
};

const styles = StyleSheet.create({
    full: {
        width: "100%",
        height: "100%",
        position: "absolute",
    },
});
