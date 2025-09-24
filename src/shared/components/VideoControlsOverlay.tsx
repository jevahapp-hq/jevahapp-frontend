import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef } from "react";
import { PanResponder, TouchableOpacity, View } from "react-native";

type Props = {
  progress: number; // 0..1
  isMuted: boolean;
  onToggleMute: () => void;
  onSeekRelative: (seconds: number) => void; // +/- seconds
  onSeekToPercent: (percent: number) => void; // 0..1
  barColor?: string;
};

export default function VideoControlsOverlay({
  progress,
  isMuted,
  onToggleMute,
  onSeekRelative,
  onSeekToPercent,
  barColor = "#FFFFFF",
}: Props) {
  const barWidthRef = useRef(1);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const x = Math.max(0, evt.nativeEvent.locationX);
          const pct = Math.max(0, Math.min(x / (barWidthRef.current || 1), 1));
          onSeekToPercent(pct);
        },
        onPanResponderMove: (evt) => {
          const x = Math.max(0, evt.nativeEvent.locationX);
          const pct = Math.max(0, Math.min(x / (barWidthRef.current || 1), 1));
          onSeekToPercent(pct);
        },
      }),
    [onSeekToPercent]
  );

  return (
    <View className="absolute bottom-4 left-3 right-3">
      <View className="flex-row items-center">
        <View
          className="flex-1 h-1.5 bg-white/30 rounded-full mr-3"
          onLayout={(e) => (barWidthRef.current = e.nativeEvent.layout.width)}
          {...panResponder.panHandlers}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.max(0, Math.min(progress, 1)) * 100}%`,
              backgroundColor: barColor,
            }}
          />
        </View>

        <TouchableOpacity
          onPress={onToggleMute}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={
              isMuted ? ("volume-mute" as any) : ("volume-high-outline" as any)
            }
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* Tap zones for +/- 10s seeking */}
      <View
        className="absolute inset-x-0 -top-6 bottom-6 flex-row"
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={0.6}
          onPress={() => onSeekRelative(-10)}
        >
          <View />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={0.6}
          onPress={() => onSeekRelative(10)}
        >
          <View />
        </TouchableOpacity>
      </View>
    </View>
  );
}
