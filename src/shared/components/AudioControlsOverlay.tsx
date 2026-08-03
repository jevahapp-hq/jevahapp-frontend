import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef } from "react";
import { PanResponder, Text, TouchableOpacity, View } from "react-native";

type Props = {
  progress: number; // 0..1
  isMuted?: boolean;
  onToggleMute?: () => void;
  onSeekRelative: (seconds: number) => void; // +/- seconds
  onSeekToPercent: (percent: number) => void; // 0..1
  barColor?: string;
  /** Show ±N second skip buttons (default 10). Set 0 to hide. */
  skipSeconds?: number;
  seekEnabled?: boolean;
};

export default function AudioControlsOverlay({
  progress,
  isMuted = false,
  onToggleMute,
  onSeekRelative,
  onSeekToPercent,
  barColor = "#FEA74E",
  skipSeconds = 10,
  seekEnabled = true,
}: Props) {
  const barWidthRef = useRef(1);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => seekEnabled,
        onMoveShouldSetPanResponder: () => seekEnabled,
        onPanResponderGrant: (evt) => {
          if (!seekEnabled) return;
          const x = Math.max(0, evt.nativeEvent.locationX);
          const pct = Math.max(0, Math.min(x / (barWidthRef.current || 1), 1));
          onSeekToPercent(pct);
        },
        onPanResponderMove: (evt) => {
          if (!seekEnabled) return;
          const x = Math.max(0, evt.nativeEvent.locationX);
          const pct = Math.max(0, Math.min(x / (barWidthRef.current || 1), 1));
          onSeekToPercent(pct);
        },
      }),
    [onSeekToPercent, seekEnabled]
  );

  return (
    <View className="absolute bottom-4 left-3 right-3" pointerEvents="box-none">
      {skipSeconds > 0 && (
        <View className="flex-row justify-center items-center mb-2 gap-6">
          <TouchableOpacity
            onPress={() => seekEnabled && onSeekRelative(-skipSeconds)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={!seekEnabled}
            style={{ opacity: seekEnabled ? 1 : 0.4 }}
          >
            <View className="flex-row items-center">
              <Ionicons name="play-back" size={22} color="#FFFFFF" />
              <Text className="text-white text-[10px] ml-0.5">{skipSeconds}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => seekEnabled && onSeekRelative(skipSeconds)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={!seekEnabled}
            style={{ opacity: seekEnabled ? 1 : 0.4 }}
          >
            <View className="flex-row items-center">
              <Text className="text-white text-[10px] mr-0.5">{skipSeconds}</Text>
              <Ionicons name="play-forward" size={22} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}

      <View className="flex-row items-center">
        {/* Add left spacing to separate play icon from the progress bar */}
        <View style={{ width: 36 }} />

        <View
          className="flex-1 h-1.5 rounded-full"
          style={{
            backgroundColor: barColor,
            opacity: seekEnabled ? 1 : 0.5,
          }}
          onLayout={(e) => (barWidthRef.current = e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(progress, 1)) * 100}%`,
              backgroundColor: "#FFFFFF",
            }}
          />
        </View>

        {onToggleMute && (
          <TouchableOpacity
            onPress={onToggleMute}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="ml-3"
          >
            <Ionicons
              name={
                isMuted
                  ? ("volume-mute" as any)
                  : ("volume-high-outline" as any)
              }
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
