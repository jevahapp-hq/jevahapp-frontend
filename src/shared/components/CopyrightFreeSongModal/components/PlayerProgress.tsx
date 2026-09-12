import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { UI_CONFIG } from "@/shared/constants";
import {
  useAudioDurationForTrack,
  useAudioPositionForTrack,
  useAudioProgressForTrack,
} from "@/store/audioPlayer/audioProgressStore";
import { usePlayerSeek } from "../hooks/usePlayerSeek";

const BAR_COUNT = 72;

function waveformHeights(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const envelope = 0.35 + Math.sin((i / BAR_COUNT) * Math.PI) * 0.65;
    const n =
      Math.sin((i + (h % 19)) * 0.9) * 0.28 +
      Math.sin((i + 5) * 2.15) * 0.22 +
      Math.sin((i + 11) * 0.37) * 0.18;
    return Math.max(0.18, Math.min(1, envelope * (0.42 + Math.abs(n))));
  });
}

export interface PlayerProgressProps {
  song: any;
  isSeeking: boolean;
  seekProgress: number;
  formatTime: (ms: number) => string;
  progressBarRef: React.RefObject<View | null>;
  panHandlers: any;
  onBarLayout?: (e: { nativeEvent: { layout: { width: number } } }) => void;
}

export function PlayerProgress({
  song,
  isSeeking,
  seekProgress,
  formatTime,
  progressBarRef,
  panHandlers,
  onBarLayout,
}: PlayerProgressProps) {
  const songId = song?.id || song?._id || null;
  const audioProgress = useAudioProgressForTrack(songId);
  const audioPosition = useAudioPositionForTrack(songId);
  const audioDuration = useAudioDurationForTrack(songId);
  const { durationMs, displayProgress, displayPositionMs } = usePlayerSeek({
    song,
    isSeeking,
    seekProgress,
    audioProgress,
    audioDuration,
    audioPosition,
  });
  const seekEnabled = durationMs > 0;
  const pct = Math.max(0, Math.min(1, displayProgress));
  const heights = useMemo(() => waveformHeights(String(songId || "track")), [songId]);
  const playedThrough = Math.round(pct * (BAR_COUNT - 1));

  return (
    <View>
      <View
        ref={progressBarRef}
        onLayout={onBarLayout}
        collapsable={false}
        style={{
          height: 36,
          justifyContent: "center",
          opacity: seekEnabled ? 1 : 0.45,
        }}
        pointerEvents={seekEnabled ? "auto" : "none"}
        {...(seekEnabled ? panHandlers : {})}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: 28,
            gap: 1.5,
          }}
        >
          {heights.map((h, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: `${Math.round(h * 100)}%`,
                borderRadius: 1,
                backgroundColor:
                  i <= playedThrough ? UI_CONFIG.COLORS.PRIMARY : "rgba(255,255,255,0.22)",
              }}
            />
          ))}
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 2,
          paddingHorizontal: 2,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontFamily: "PlusJakartaSans-Medium",
            color: "rgba(255,255,255,0.55)",
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatTime(displayPositionMs)}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "PlusJakartaSans-Medium",
            color: "rgba(255,255,255,0.4)",
            fontVariant: ["tabular-nums"],
          }}
        >
          {seekEnabled ? formatTime(durationMs) : "0:00"}
        </Text>
      </View>
    </View>
  );
}
